"""A stand-in for the parts of Frappe that orbitutor/api.py uses, over in-memory tables.

It runs OrbiTutor's real API code for the mock server and the API tests. Field names and
filters behave like Frappe's get_all/get_value closely enough to catch wrong names and logic.
"""

import fnmatch
import re
import threading
from datetime import date, datetime, time, timedelta

__version__ = "16.55.2"


class _dict(dict):
	def __getattr__(self, key):
		try:
			return self[key]
		except KeyError:
			return None

	def __setattr__(self, key, value):
		self[key] = value

	def copy(self):
		return _dict(dict.copy(self))


# ---- errors ----
class ValidationError(Exception):
	http_status_code = 417


class PermissionError(Exception):
	http_status_code = 403


class DoesNotExistError(ValidationError):
	http_status_code = 404


class AuthenticationError(Exception):
	http_status_code = 401


class UniqueValidationError(ValidationError):
	pass


class DuplicateEntryError(ValidationError):
	pass


# doc events the tests turn on, as {(doctype, event): [functions]}
HOOKS = {}


class Redirect(Exception):
	http_status_code = 301


class RateLimitExceededError(ValidationError):
	http_status_code = 429


def _(text, *args, **kwargs):
	return text


def throw(msg, exc=ValidationError, title=None):
	raise exc(msg)


# ---- the request ----
local = threading.local()
flags = _dict()
conf = _dict()
whitelisted = set()


class _Session:
	@property
	def user(self):
		return getattr(local, "user", "Guest")


session = _Session()


def set_user(user):
	local.user = user


def init_request(user="Guest"):
	local.user = user
	local.response = _dict()
	local.messages = []


def clear_messages():
	local.messages = []


def whitelist(allow_guest=False, xss_safe=False, methods=None):
	def wrap(fn):
		fn._allow_guest = allow_guest
		fn._methods = methods
		whitelisted.add(fn)
		return fn

	return wrap


def get_roles(user=None):
	user = user or session.user
	if user == "Guest":
		return ["Guest"]
	return [r["role"] for r in DB.rows("Has Role") if r.get("parent") == user] + ["All", "Guest"]


def get_system_settings(key):
	return DB.single("System Settings").get(key)


def get_website_settings(key):
	return DB.single("Website Settings").get(key)


def log_error(title=None, message=None, **kwargs):
	DB.insert("Error Log", {"method": title, "error": message or ""})


def sendmail(recipients=None, subject=None, message=None, template=None, args=None, **kwargs):
	DB.insert("Email Queue", {"recipients": recipients, "subject": subject, "message": message, "template": template, "args": args or {}})


def get_attr(path):
	import importlib

	module, _sep, name = path.rpartition(".")
	return getattr(importlib.import_module(module), name)


# ---- the in-memory database ----
def _value(v):
	return v


def _compare(row_value, cond):
	if isinstance(cond, (list, tuple)) and len(cond) == 2 and isinstance(cond[0], str):
		op, target = cond[0].lower(), cond[1]
		if op == "in":
			return row_value in (target or [])
		if op == "not in":
			return row_value not in (target or [])
		if op == "like":
			pattern = str(target).replace("\\%", "\0").replace("\\_", "\1")
			pattern = re.escape(pattern).replace("%", ".*").replace("_", ".").replace("\0", "%").replace("\1", "_")
			return row_value is not None and re.fullmatch(pattern, str(row_value), re.I | re.S) is not None
		if op == "between":
			lo, hi = target
			return row_value is not None and _norm(lo) <= _norm(row_value) <= _norm(hi)
		if op == "is":
			return (row_value not in (None, "")) if target == "set" else (row_value in (None, ""))
		if op in (">=", "<=", ">", "<", "!="):
			if row_value is None:
				return False
			a, b = _norm(row_value), _norm(target)
			return {">=": a >= b, "<=": a <= b, ">": a > b, "<": a < b, "!=": a != b}[op]
		raise NotImplementedError(op)
	return row_value == cond or (cond in (None, "") and row_value in (None, ""))


def _norm(v):
	if isinstance(v, datetime):
		return v
	if isinstance(v, date):
		return datetime.combine(v, time())
	if isinstance(v, str) and re.match(r"^\d{4}-\d\d-\d\d", v):
		return datetime.fromisoformat(v[:19]) if len(v) > 10 else datetime.fromisoformat(v)
	return v


class _DB:
	def __init__(self):
		self.tables = {}
		self.singles = {}
		self.counters = {}

	def rows(self, doctype):
		return self.tables.setdefault(doctype, [])

	def single(self, doctype):
		return self.singles.setdefault(doctype, _dict())

	def insert(self, doctype, row):
		row = _dict(row)
		if not row.get("name"):
			self.counters[doctype] = self.counters.get(doctype, 0) + 1
			row["name"] = f"{doctype.replace(' ', '-').upper()}-{self.counters[doctype]:05d}"
		row.setdefault("creation", datetime.now())
		row.setdefault("modified", row["creation"])
		row.setdefault("owner", session.user)
		self.rows(doctype).append(row)
		return row

	def match(self, doctype, filters):
		rows = self.rows(doctype)
		if filters is None:
			return list(rows)
		if isinstance(filters, str):
			return [r for r in rows if r.get("name") == filters]
		if isinstance(filters, (list, tuple)):
			conds = [(f[0], [f[1], f[2]]) if len(f) == 3 else (f[1], [f[2], f[3]]) for f in filters]
		else:
			conds = list(filters.items())
		return [r for r in rows if all(_compare(r.get(k), c) for k, c in conds)]


DB = _DB()


def _pick(row, fields, as_list=False):
	if fields in (None, "*", ["*"]):
		return _dict(row)
	if isinstance(fields, str):
		fields = [f.strip() for f in fields.split(",")]
	out = _dict()
	for f in fields:
		name, _sep, alias = f.partition(" as ")
		out[(alias or name).strip()] = row.get(name.strip())
	return tuple(out.values()) if as_list else out


def _order(rows, order_by):
	if not order_by:
		return rows
	for part in reversed([p.strip() for p in order_by.split(",") if p.strip()]):
		bits = part.split()
		key, desc = bits[0].split(".")[-1].strip("`"), len(bits) > 1 and bits[1].lower() == "desc"
		rows = sorted(rows, key=lambda r: (r.get(key) is None, _norm(r.get(key)) if r.get(key) is not None else 0), reverse=desc)
	return rows


def get_all(doctype, filters=None, fields=None, order_by=None, limit=None, limit_page_length=None, pluck=None, as_list=False, group_by=None, **kwargs):
	if isinstance(filters, str) or (isinstance(filters, dict) and not filters):
		filters = filters or None
	rows = _order(DB.match(doctype, filters), order_by)
	n = limit or limit_page_length
	if n:
		rows = rows[:n]
	if pluck:
		return [r.get(pluck) for r in rows]
	if fields is None:
		fields = ["name"]
	return [_pick(r, fields, as_list) for r in rows]


get_list = get_all


class _DBApi:
	def get_value(self, doctype, filters=None, fieldname="name", as_dict=False, cache=False, **kwargs):
		rows = DB.match(doctype, filters)
		if not rows:
			return None
		row = rows[0]
		if isinstance(fieldname, (list, tuple)):
			picked = _pick(row, fieldname)
			return picked if as_dict else tuple(picked.values())
		return row.get(fieldname)

	def get_single_value(self, doctype, field, cache=False):
		return DB.single(doctype).get(field)

	def set_single_value(self, doctype, field, value):
		DB.single(doctype)[field] = value

	def exists(self, doctype, filters=None, fieldname=None, cache=False):
		rows = DB.match(doctype, filters)
		return rows[0]["name"] if rows else None

	def set_value(self, doctype, name, field, value=None, update_modified=True):
		if name is None or (isinstance(name, str) and name == doctype):
			DB.single(doctype).update(field if isinstance(field, dict) else {field: value})
			return
		rows = DB.match(doctype, name)
		changes = field if isinstance(field, dict) else {field: value}
		for r in rows:
			r.update(changes)

	def count(self, doctype, filters=None):
		return len(DB.match(doctype, filters))

	def delete(self, doctype, filters=None):
		gone = DB.match(doctype, filters)
		ids = {id(r) for r in gone}
		DB.tables[doctype] = [r for r in DB.rows(doctype) if id(r) not in ids]

	def table_exists(self, doctype):
		return True

	def get_all(self, doctype, filters=None, **kwargs):
		return get_all(doctype, filters, **kwargs)

	def rollback(self):
		pass


db = _DBApi()


# child tables: parent doctype -> {field: child doctype}
CHILD = {
	"LMS Course": {"instructors": "Course Instructor", "chapters": "Chapter Reference"},
	"Course Chapter": {"lessons": "Lesson Reference"},
	"LMS Batch": {"courses": "Batch Course", "instructors": "Course Instructor", "assessment": "LMS Assessment"},
	"LMS Quiz": {"questions": "LMS Quiz Question"},
	"LMS Quiz Submission": {"result": "LMS Quiz Result"},
	"LMS Programming Exercise": {"test_cases": "LMS Test Case"},
	"LMS Programming Exercise Submission": {"test_cases": "LMS Test Case Submission"},
	"Course Evaluator": {"schedule": "Evaluator Schedule"},
	"User": {"roles": "Has Role"},
}
# fields a doctype must have, as Frappe's mandatory check
REQUIRED = {
	"LMS Course": ["title"],
	"LMS Batch": ["title", "start_date", "end_date", "start_time", "end_time"],
	"LMS Quiz": ["title"],
	"LMS Question": ["question", "type"],
	"LMS Assignment": ["title", "type"],
	"LMS Programming Exercise": ["title", "language", "problem_statement"],
	"LMS Live Class": ["title", "date", "time", "duration", "timezone", "host"],
	"LMS Certificate": ["member", "issue_date"],
	"Course Lesson": ["title", "chapter"],
	"Course Chapter": ["title", "course"],
}


# fetch_from fields, filled on save as Frappe does: doctype -> {field: (link doctype, link field, source field)}
FETCH = {
	"LMS Certificate": {"member_name": ("User", "member", "full_name"), "course_title": ("LMS Course", "course", "title"), "batch_title": ("LMS Batch", "batch_name", "title")},
	"LMS Certificate Request": {"member_name": ("User", "member", "full_name"), "course_title": ("LMS Course", "course", "title"), "batch_title": ("LMS Batch", "batch_name", "title")},
	"LMS Quiz Submission": {"member_name": ("User", "member", "full_name"), "quiz_title": ("LMS Quiz", "quiz", "title")},
	"LMS Assignment Submission": {"member_name": ("User", "member", "full_name"), "assignment_title": ("LMS Assignment", "assignment", "title")},
	"LMS Programming Exercise Submission": {"member_name": ("User", "member", "full_name"), "exercise_title": ("LMS Programming Exercise", "exercise", "title")},
	"LMS Enrollment": {"member_name": ("User", "member", "full_name")},
	"LMS Batch Enrollment": {"member_name": ("User", "member", "full_name")},
	"Course Evaluator": {"full_name": ("User", "evaluator", "full_name")},
}


def _fetch(doc):
	for field, (dt, link, source) in FETCH.get(doc.get("doctype"), {}).items():
		if doc.get(link):
			rows = DB.match(dt, doc.get(link))
			dict.__setitem__(doc, field, rows[0].get(source) if rows else None)


# what Frappe Learning's controllers check and work out on save
def _v_quiz(doc, new):
	doc["total_marks"] = sum(int(q.get("marks") or 0) for q in doc.get("questions") or [])


def _v_quiz_submission(doc, new):
	score = 0
	for i, r in enumerate(doc.get("result") or [], start=1):
		if int(r.get("marks") or 0) > int(r.get("marks_out_of") or 0):
			raise ValidationError(f"Marks for question number {i} cannot be greater than the marks allotted for that question.")
		score += int(r.get("marks") or 0)
	doc["score"] = max(0, score)
	if doc.get("score_out_of"):
		doc["percentage"] = max(0, doc["score"] / doc["score_out_of"] * 100)


def _v_batch(doc, new):
	from frappe.utils import getdate

	if doc.get("start_date") and doc.get("end_date") and getdate(doc["end_date"]) < getdate(doc["start_date"]):
		raise ValidationError("Batch end date cannot be before the batch start date")


def _v_batch_enrollment(doc, new):
	if not new:
		return
	seats = int(DB.match("LMS Batch", doc["batch"])[0].get("seat_count") or 0)
	if seats and len(DB.match("LMS Batch Enrollment", {"batch": doc["batch"]})) >= seats:
		raise ValidationError("There are no seats available in this batch.")
	for c in DB.match("Batch Course", {"parent": doc["batch"]}):
		if not DB.match("LMS Enrollment", {"course": c["course"], "member": doc["member"]}):
			DB.insert("LMS Enrollment", {"course": c["course"], "member": doc["member"], "member_name": (DB.match("User", doc["member"]) or [{}])[0].get("full_name"), "enrollment_from_batch": doc["batch"], "progress": 0})
	sendmail(recipients=[doc["member"]], subject="Enrollment Confirmation for the Next Training Batch", template="batch_confirmation")


def _v_lesson(doc, new):
	import json as _json

	try:
		blocks = _json.loads(doc.get("content") or "{}").get("blocks") or []
	except ValueError:
		return
	for b in blocks:
		if b.get("type") == "quiz" and not DB.match("LMS Quiz", (b.get("data") or {}).get("quiz")):
			raise ValidationError("Invalid Quiz ID in content")


VALIDATE = {"LMS Quiz": _v_quiz, "LMS Quiz Submission": _v_quiz_submission, "LMS Batch": _v_batch, "LMS Batch Enrollment": _v_batch_enrollment, "Course Lesson": _v_lesson}


def _child_rows(parent_doctype, name, field):
	child = CHILD[parent_doctype][field]
	rows = [r for r in DB.rows(child) if r.get("parent") == name and r.get("parenttype") in (None, parent_doctype) and r.get("parentfield") in (None, field)]
	return sorted(rows, key=lambda r: r.get("idx") or 0)


def _row(doctype, data, parent=None, field=None, idx=None):
	r = _Doc(data if isinstance(data, dict) else dict(data))
	dict.__setitem__(r, "doctype", doctype)
	if parent is not None:
		r.update(parent=parent, parentfield=field, idx=idx)
	return r


class _Doc(_dict):
	@property
	def flags(self):
		if "_flags" not in self:
			dict.__setitem__(self, "_flags", _dict())
		return dict.__getitem__(self, "_flags")

	# ---- child tables ----
	def _children(self):
		return CHILD.get(self.get("doctype"), {})

	def append(self, field, value=None):
		rows = self.get(field)
		if rows is None:
			rows = []
			self[field] = rows
		row = _row(self._children().get(field, field), value or {})
		rows.append(row)
		return row

	def set(self, field, value):
		if field in self._children():
			self[field] = []
			for v in value or []:
				self.append(field, dict(v))
		else:
			self[field] = value

	def update(self, *args, **kwargs):
		for k, v in dict(*args, **kwargs).items():
			self.set(k, v) if k in self._children() else dict.__setitem__(self, k, v)
		return self

	def as_dict(self):
		return _dict({k: v for k, v in self.items() if k != "_flags"})

	def check_permission(self, ptype="read"):
		return True

	def has_permission(self, ptype="read"):
		return True

	def is_new(self):
		return not self.get("name") or not DB.match(self["doctype"], self["name"])

	def reload(self):
		fresh = get_doc(self["doctype"], self["name"])
		self.clear()
		dict.update(self, fresh)
		return self

	def delete(self, ignore_permissions=False):
		delete_doc(self["doctype"], self["name"])

	def get_password(self, field="password", raise_exception=True):
		return self.get(field)

	# ---- users ----
	def append_roles(self, *roles):
		self.setdefault("_roles", []).extend(roles)

	def add_roles(self, *roles):
		for role in roles:
			if not DB.match("Has Role", {"parent": self["name"], "role": role}):
				DB.insert("Has Role", {"parent": self["name"], "parenttype": "User", "role": role})

	def remove_roles(self, *roles):
		DB.tables["Has Role"] = [r for r in DB.rows("Has Role") if not (r.get("parent") == self["name"] and r.get("role") in roles)]

	def _reset_password(self, send_email=False, password_expired=False):
		from frappe.utils import get_url, random_string
		from frappe.utils.data import sha256_hash

		key = random_string(32)
		changes = {"reset_password_key": sha256_hash(key), "last_reset_password_key_generated_on": __import__("datetime").datetime.now()}
		self.update(changes)
		for r in DB.match("User", self["name"]):
			r.update(changes)
		return get_url("/update-password?key=" + key)

	def reset_password(self, send_email=False, password_expired=False):
		link = self._reset_password(send_email, password_expired)
		if send_email:
			sendmail(recipients=[self["name"]], subject="Password Reset", template="password_reset", args={"link": link})
		return link

	# ---- saving ----
	def _check_required(self):
		for f in REQUIRED.get(self.get("doctype"), []):
			if self.get(f) in (None, "") or (isinstance(self.get(f), str) and not self.get(f).strip()):
				raise ValidationError(f"Error: Value missing for {self['doctype']}: {f}")

	def _write(self):
		doctype = self["doctype"]
		_fetch(self)
		if doctype in VALIDATE:
			VALIDATE[doctype](self, not self.get("name") or not DB.match(doctype, self["name"]))
		children = self._children()
		plain = {k: v for k, v in self.items() if k not in ("_flags", "_roles", "new_password") and k not in children}
		existing = DB.match(doctype, self.get("name")) if self.get("name") else []
		if existing:
			plain["modified"] = datetime.now()
			existing[0].update(plain)
			row = existing[0]
		else:
			row = DB.insert(doctype, plain)
		dict.update(self, row)
		for field, child in children.items():
			if field not in self:
				continue
			DB.tables[child] = [r for r in DB.rows(child) if not (r.get("parent") == self["name"] and r.get("parenttype") in (None, doctype) and r.get("parentfield") in (None, field))]
			for i, r in enumerate(self.get(field) or [], start=1):
				data = {k: v for k, v in dict(r).items() if k not in ("_flags", "doctype")}
				data.update(parent=self["name"], parenttype=doctype, parentfield=field, idx=i)
				if not data.get("name"):
					data.pop("name", None)
				saved = DB.insert(child, data)
				dict.update(r, saved)
		return self

	def insert(self, ignore_permissions=False, **kwargs):
		doctype = self["doctype"]
		if doctype == "User":
			if DB.match("User", {"name": self["email"]}):
				raise DuplicateEntryError(self["email"])
			row = {k: v for k, v in self.items() if k not in ("doctype", "_flags", "_roles", "new_password", "roles")}
			full = " ".join(x for x in (self.get("first_name"), self.get("last_name")) if x)
			row.update(name=self["email"], full_name=full or self.get("full_name") or self["email"], username=self["email"].split("@")[0], last_login=None, user_image=None, desk_theme="Dark", enabled=1)
			dict.update(self, DB.insert("User", row))
			self.add_roles(*self.get("_roles", []), *[r.get("role") for r in (self.get("roles") or []) if isinstance(r, dict)])
			return self
		if doctype in ("LMS Enrollment",):
			for hook in HOOKS.get((doctype, "before_insert"), []):
				hook(self, "before_insert")
		if doctype == "OrbiTutor Join Request":
			if not self.get("full_name") or not self.get("course"):
				raise ValidationError("Missing required fields")
		self._check_required()
		return self._write()

	def save(self, ignore_permissions=False, **kwargs):
		if self.get("doctype") == "User" and self.get("name") and DB.match("User", self["name"]):
			plain = {k: v for k, v in self.items() if k not in ("_flags", "_roles", "new_password", "roles", "doctype")}
			DB.match("User", self["name"])[0].update(plain)
			return self
		if self.is_new():
			return self.insert(ignore_permissions)
		self._check_required()
		return self._write()

	def db_set(self, field, value=None, update_modified=True):
		changes = field if isinstance(field, dict) else {field: value}
		dict.update(self, changes)
		for r in DB.match(self["doctype"], self["name"]):
			r.update(changes)


def new_doc(doctype):
	return _Doc({"doctype": doctype})


def get_doc(arg, name=None, **kwargs):
	if isinstance(arg, dict):
		data = dict(arg)
		doc = _Doc({"doctype": data["doctype"]})
		doc.update({k: v for k, v in data.items() if k != "doctype"})
		return doc
	if isinstance(arg, str) and name is None and arg in DB.singles:
		return _Doc(DB.single(arg), doctype=arg)
	rows = DB.match(arg, name)
	if not rows:
		raise DoesNotExistError(f"{arg} {name} not found")
	doc = _Doc(rows[0])
	dict.__setitem__(doc, "doctype", arg)
	for field in CHILD.get(arg, {}):
		dict.__setitem__(doc, field, [_row(CHILD[arg][field], dict(r)) for r in _child_rows(arg, doc["name"], field)])
	return doc


get_cached_doc = get_doc


def delete_doc(doctype, name=None, force=False, ignore_permissions=False, **kwargs):
	rows = DB.match(doctype, name)
	if not rows:
		raise DoesNotExistError(f"{doctype} {name} not found")
	for field, child in CHILD.get(doctype, {}).items():
		DB.tables[child] = [r for r in DB.rows(child) if r.get("parent") != name]
	DB.tables[doctype] = [r for r in DB.rows(doctype) if r.get("name") != name]


def has_permission(doctype=None, ptype="read", doc=None, user=None, **kwargs):
	return True


def only_for(roles, message=False):
	roles = [roles] if isinstance(roles, str) else roles
	if not set(roles) & set(get_roles()):
		raise PermissionError("Not permitted")


def clear_cache(**kwargs):
	cache.data.clear()


def get_single(doctype):
	return get_doc(doctype)


class _Cache:
	def __init__(self):
		self.data = {}

	def get_value(self, key, generator=None):
		if key not in self.data and generator:
			self.data[key] = generator()
		return self.data.get(key)

	def delete_value(self, key):
		self.data.pop(key, None)

	def delete_key(self, key):
		self.data.pop(key, None)


cache = _Cache()

from frappe import sessions, utils  # noqa: E402


APP_PATHS = {}


def get_app_path(app, *parts):
	import os

	return os.path.join(APP_PATHS[app], *parts)
