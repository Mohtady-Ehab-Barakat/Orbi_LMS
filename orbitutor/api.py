"""What the OrbiTutor app asks the server for.

The app calls Frappe Learning's own methods where they already answer what a screen needs
(a lesson, saving progress, notifications). The methods here put together what a screen needs in
one answer (Home, a course page, the catalogue), and add what Frappe Learning doesn't do:
reading a reset link before using it, searching lessons, questions under a lesson with
instructors marked, and asking to join a course (payment is in cash).
"""

import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import (
	add_days,
	cint,
	escape_html,
	flt,
	get_time,
	get_url,
	getdate,
	now_datetime,
	random_string,
	strip_html,
	today,
	validate_email_address,
)
from frappe.utils.data import sha256_hash
from frappe.website.utils import is_signup_disabled

from orbitutor import __version__

TRACK_IDS = {
	"Physics and space": "physics",
	"Code and AI": "code",
	"Engineering and making": "making",
	"Competitions": "competitions",
}
LESSON_KINDS = {"icon-youtube": "video", "icon-quiz": "quiz", "icon-assignment": "assignment", "icon-code": "code"}
COURSE_FIELDS = [
	"name",
	"title",
	"image",
	"short_introduction",
	"lessons",
	"published",
	"upcoming",
	"featured",
	"enrollments",
	"orbitutor_track",
	"orbitutor_level",
	"orbitutor_length",
	"orbitutor_project",
	"orbitutor_project_url",
]
DEFAULT_WHATSAPP = "https://wa.me/60102345601"


# ---- boot: what the page starts with ----


@frappe.whitelist(allow_guest=True)
def boot():
	return get_boot()


def get_boot() -> dict:
	from lms.lms.utils import guest_access_allowed

	user = None
	if frappe.session.user != "Guest":
		row = frappe.db.get_value(
			"User",
			frappe.session.user,
			["full_name", "first_name", "user_image", "username", "user_type", "desk_theme"],
			as_dict=True,
		)
		roles = set(frappe.get_roles())
		user = {
			"full_name": row.full_name,
			"first_name": row.first_name or (row.full_name or "").split(" ")[0],
			"image": row.user_image,
			"username": row.username,
			"staff": row.user_type == "System User" or bool(roles & {"Course Creator", "Moderator", "Batch Evaluator"}),
			"theme": {"Dark": "night", "Light": "day", "Automatic": "system"}.get(row.desk_theme or "", "night"),
		}
	return {
		"user": user,
		"csrf_token": frappe.sessions.get_csrf_token(),
		"app_name": frappe.get_website_settings("app_name") or "OrbiTutor",
		"guest_access": guest_access_allowed(),
		"login": {
			"password": not cint(frappe.get_system_settings("disable_user_pass_login")),
			"email_link": bool(cint(frappe.get_system_settings("login_with_email_link"))),
			"email_link_minutes": cint(frappe.get_system_settings("login_with_email_link_expiry")) or 10,
			"reset_link_minutes": (cint(frappe.get_system_settings("reset_password_link_expiry_duration")) // 60) or None,
			# Frappe's password policy: 0 when it's off, else the score (1 to 4) a new password needs.
			"min_password_score": cint(frappe.get_system_settings("minimum_password_score"))
			if cint(frappe.get_system_settings("enable_password_policy"))
			else 0,
			"providers": [{"name": p["name"], "label": p["label"]} for p in login_providers()],
			# Website Settings' "Disable Signup" turns off OrbiTutor's sign-up page too.
			"signup": not is_signup_disabled(),
		},
		"contact": {
			"whatsapp": frappe.conf.get("orbitutor_whatsapp") or DEFAULT_WHATSAPP,
			"email": frappe.conf.get("orbitutor_email") or "orbitutor@orbit-core.com",
		},
		"server_time": now_datetime().isoformat(),
		"timezone": system_timezone(),
		"read_only": bool(frappe.flags.read_only),
		"desk": "/desk",
		"version": __version__,
	}


def system_timezone() -> str:
	from frappe.utils import get_system_timezone

	return get_system_timezone()


def login_providers() -> list:
	"""Single sign-on providers that are switched on and fully set up (the same test Frappe's login page uses)."""
	from frappe.utils.oauth import get_oauth_keys
	from frappe.utils.password import get_decrypted_password

	out = []
	for p in frappe.get_all(
		"Social Login Key",
		filters={"enable_social_login": 1},
		fields=["name", "client_id", "base_url", "provider_name"],
		order_by="name",
	):
		if not (p.client_id and p.base_url):
			continue
		if not get_decrypted_password("Social Login Key", p.name, "client_secret", raise_exception=False):
			continue
		if not get_oauth_keys(p.name):
			continue
		out.append({"name": p.name, "label": p.provider_name if p.provider_name != "Custom" else p.name})
	return out


# ---- signing in ----


def safe_path(path) -> str:
	"""A path on this site, or "/": never another site."""
	if not isinstance(path, str) or not path.startswith("/") or path.startswith("//") or "\\" in path:
		return "/"
	return path[:500]


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=30, seconds=60 * 60)
def sso_url(provider: str, redirect_to: str = "/"):
	"""Where "Continue with OrbitCore" goes, coming back to `redirect_to` afterwards."""
	from frappe.utils.oauth import get_oauth2_authorize_url

	if provider not in {p["name"] for p in login_providers()}:
		frappe.throw(_("That way of signing in isn't set up."), frappe.PermissionError)
	return get_oauth2_authorize_url(provider, safe_path(redirect_to))


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=60 * 60)
def reset_key_info(key: str):
	"""Whether a welcome or reset link still works, and whose it is, before they choose a password.

	Frappe's update_password checks the password's strength before the link, so a used link
	would otherwise only show up after they'd typed a password. A brand-new account (one that
	has never signed in) gets the welcome version of the page.
	"""
	if not isinstance(key, str) or not 8 <= len(key) <= 128:
		return {"valid": False, "reason": "used"}
	user = frappe.db.get_value(
		"User",
		{"reset_password_key": sha256_hash(key)},
		["name", "first_name", "enabled", "last_login", "last_reset_password_key_generated_on"],
		as_dict=True,
	)
	if not user or not user.enabled:
		return {"valid": False, "reason": "used"}
	invite = not user.last_login
	# someone who made their own account and isn't in a class yet gets "Almost there", not "You're enrolled"
	enrolled = bool(
		frappe.db.exists("LMS Enrollment", {"member": user.name})
		or frappe.db.exists("LMS Batch Enrollment", {"member": user.name})
	)
	expiry = cint(frappe.get_system_settings("reset_password_link_expiry_duration"))
	made = user.last_reset_password_key_generated_on
	if expiry and made and now_datetime() > made + timedelta(seconds=expiry):
		return {"valid": False, "reason": "expired", "invite": invite}
	return {
		"valid": True,
		"invite": invite,
		"enrolled": enrolled,
		"first_name": user.first_name,
		"email": user.name,
		"expires_in_minutes": (expiry // 60) if expiry else None,
	}


# ---- Signing up ----

EMAIL_RE = re.compile(r"[^@\s,;<>()\[\]\\\"]+@[^@\s,;<>()\[\]\\\"]+\.[^@\s,;<>()\[\]\\\"]+")


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=5, seconds=60 * 60)
def sign_up(full_name: str, email: str, website: str | None = None):
	"""Make a student account: a Website User with the LMS Student role, and a welcome email
	whose link sets the password. It only makes the account; staff put students in classes.

	The answer is the same whether or not the email already has an account, so the page can't be
	used to find out who's a student. An existing account gets nothing new: its owner can sign in
	or reset the password.
	"""
	if website:
		# the hidden field only robots fill in: thank them and keep nothing
		return {"ok": True}
	if is_signup_disabled():
		frappe.throw(_("Signing up is turned off."), frappe.PermissionError, title=_("Signing up is closed"))
	if frappe.session.user != "Guest":
		return {"ok": True}

	full_name = " ".join(str(full_name or "").split())
	if not full_name:
		frappe.throw(_("Type your name."))
	if len(full_name) > 140:
		frappe.throw(_("Keep your name under 140 characters."))
	email = str(email or "").strip().lower()
	# one plain address: validate_email_address also accepts a list, or a name with an address
	if len(email) > 254 or not EMAIL_RE.fullmatch(email) or validate_email_address(email) != email:
		frappe.throw(_("That doesn't look like an email address."))

	if frappe.db.exists("User", email) or frappe.db.exists("User", {"email": email}):
		return {"ok": True}

	first_name, _sep, last_name = full_name.partition(" ")
	user = frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": first_name,
			"last_name": last_name or None,
			"user_type": "Website User",
			"enabled": 1,
			# OrbiTutor sends its own welcome below, worded for someone who signed up
			"send_welcome_email": 0,
			"new_password": random_string(24),
		}
	)
	user.flags.ignore_permissions = True
	user.flags.ignore_password_policy = True
	roles = [r for r in (frappe.db.get_single_value("Portal Settings", "default_role"), "LMS Student") if r]
	user.append_roles(*[r for r in dict.fromkeys(roles) if frappe.db.exists("Role", r)])
	try:
		user.insert()
	except frappe.DuplicateEntryError:
		# someone signed up with the same email a moment ago
		frappe.db.rollback()
		return {"ok": True}

	try:
		send_signup_welcome(user)
	except Exception:
		# the account is made; they can still get in with Forgot password
		frappe.log_error(title="OrbiTutor: sign-up welcome email didn't send")
	return {"ok": True}


def send_signup_welcome(user):
	app_name = frappe.get_website_settings("app_name") or "OrbiTutor"
	expiry = cint(frappe.get_system_settings("reset_password_link_expiry_duration"))
	frappe.sendmail(
		recipients=[user.email],
		subject=_("Welcome to {0}").format(app_name),
		template="new_user",
		args={
			"first_name": user.first_name or "there",
			"user": user.name,
			"title": _("Welcome to {0}").format(app_name),
			"link": user._reset_password(),
			"login_url": get_url(),
			"site_url": get_url(),
			"app_name": app_name,
			"created_by": "Administrator",
			"signed_up": True,
			"expiry_minutes": (expiry // 60) if expiry else None,
		},
		with_container=True,
		wrapper="templates/emails/auth_email.html",
		delayed=False,
		retry=3,
		redact_message_after_send=True,
	)


# ---- Home ----


@frappe.whitelist()
def home():
	user = frappe.session.user
	enrolments = frappe.get_all(
		"LMS Enrollment",
		filters={"member": user},
		fields=["course", "progress", "current_lesson", "modified"],
		order_by="modified desc",
	)
	courses = course_rows([e.course for e in enrolments])
	cards = [course_card(courses[e.course], e) for e in enrolments if e.course in courses]

	resume = None
	for e in enrolments:
		if e.course in courses and flt(e.progress) < 100:
			resume = {"course": course_card(courses[e.course], e), "lesson": resume_lesson(e.course, e.current_lesson)}
			break

	batches = frappe.get_all("LMS Batch Enrollment", {"member": user}, pluck="batch")
	join = open_join_request(user)
	if join:
		row = course_rows([join.course]).get(join.course)
		join["card"] = course_card(row) if row else None
	stage = (
		"returning"
		if any(flt(e.progress) > 0 for e in enrolments)
		else "enrolled"
		if enrolments
		else "asked"
		if join
		else "new"
	)
	certificate = frappe.get_all(
		"LMS Certificate",
		filters={"member": user, "issue_date": [">=", add_days(today(), -21)]},
		fields=["name", "course", "course_title", "issue_date"],
		order_by="issue_date desc",
		limit=1,
	)
	return {
		"stage": stage,
		"resume": resume,
		"courses": cards,
		"classes": upcoming_classes(batches, limit=3),
		"to_do": to_do(batches),
		"announcements": announcements(batches, limit=6),
		"certificate": certificate_card(certificate[0], courses) if certificate else None,
		"join_request": join,
		"suggestions": [] if enrolments else suggested_courses(),
	}


def course_rows(names: list) -> dict:
	if not names:
		return {}
	return {r.name: r for r in frappe.get_all("LMS Course", filters={"name": ["in", names]}, fields=COURSE_FIELDS)}


def course_card(row, membership=None) -> dict:
	total = cint(row.lessons)
	progress = round(flt(membership.progress)) if membership else None
	return {
		"name": row.name,
		"title": row.title,
		"track": TRACK_IDS.get(row.orbitutor_track or ""),
		"cover": row.image,
		"tagline": row.short_introduction,
		"lessons": total,
		"project": row.orbitutor_project,
		"level": row.orbitutor_level,
		"length": row.orbitutor_length,
		"upcoming": bool(row.upcoming),
		"href": f"/course/{row.name}",
		"enrolled": membership is not None,
		"progress": progress,
		"done": round((progress or 0) * total / 100) if membership else None,
		"completed": bool(membership) and (progress or 0) >= 100,
	}


def first_lesson(course: str):
	chapter = frappe.db.get_value("Chapter Reference", {"parent": course, "idx": 1}, "chapter")
	if not chapter:
		return None
	return frappe.db.get_value("Lesson Reference", {"parent": chapter, "idx": 1}, "lesson")


def lesson_kind(row) -> str:
	from lms.lms.utils import get_lesson_icon

	return LESSON_KINDS.get(get_lesson_icon(row.body, row.content), "reading")


def resume_lesson(course: str, current: str | None):
	"""The lesson "Continue" opens: their place, or the lesson they may open if that one is locked."""
	from lms.lms.permissions import get_lesson_gate
	from lms.lms.utils import get_lesson_index

	_locked, resume = get_lesson_gate(course)
	name = resume or current or first_lesson(course)
	if not name:
		return None
	row = frappe.db.get_value("Course Lesson", name, ["name", "title", "body", "content"], as_dict=True)
	if not row:
		return None
	number = get_lesson_index(name)
	position, total = lesson_position(course, number)
	return {
		"title": row.title,
		"number": number,
		"position": position,
		"total": total,
		"kind": lesson_kind(row),
		"href": f"/course/{course}/learn/{number}",
	}


def lesson_position(course: str, number: str) -> tuple[int, int]:
	"""Where lesson "2-3" falls in the whole course (1-based), and how many lessons there are."""
	try:
		chapter_no, lesson_no = (int(x) for x in number.split("-"))
	except ValueError:
		return 1, 0
	chapters = frappe.get_all("Chapter Reference", {"parent": course}, ["chapter", "idx"], order_by="idx asc")
	counts = {}
	if chapters:
		for parent in frappe.get_all("Lesson Reference", {"parent": ["in", [c.chapter for c in chapters]]}, pluck="parent"):
			counts[parent] = counts.get(parent, 0) + 1
	before = sum(counts.get(c.chapter, 0) for c in chapters if c.idx < chapter_no)
	return before + lesson_no, sum(counts.values())


def zoned(date, time, tzname: str | None) -> datetime:
	try:
		tz = ZoneInfo(tzname or system_timezone())
	except Exception:
		tz = ZoneInfo(system_timezone())
	return datetime.combine(getdate(date), get_time(time or "00:00:00")).replace(tzinfo=tz)


def upcoming_classes(batches: list, limit: int = 3) -> list:
	if not batches:
		return []
	rows = frappe.get_all(
		"LMS Live Class",
		filters={"batch_name": ["in", batches], "date": [">=", add_days(today(), -1)]},
		fields=["name", "title", "date", "time", "duration", "join_url", "timezone", "batch_name", "host"],
		order_by="date asc, time asc",
		limit=limit + 4,
	)
	titles = dict(frappe.get_all("LMS Batch", {"name": ["in", batches]}, ["name", "title"], as_list=True))
	zones = dict(frappe.get_all("LMS Batch", {"name": ["in", batches]}, ["name", "timezone"], as_list=True))
	now = datetime.now(ZoneInfo(system_timezone()))
	out = []
	for r in rows:
		starts = zoned(r.date, r.time, r.timezone or zones.get(r.batch_name))
		minutes = cint(r.duration) or 60
		if starts + timedelta(minutes=minutes) < now:
			continue
		host = frappe.db.get_value("User", r.host, ["full_name", "user_image"], as_dict=True) if r.host else None
		out.append(
			{
				"id": r.name,
				"title": r.title,
				"batch": titles.get(r.batch_name),
				"batch_href": f"/batch/{r.batch_name}",
				"starts_at": starts.isoformat(),
				"minutes": minutes,
				"join_url": r.join_url,
				"instructor": {"name": host.full_name, "src": host.user_image} if host else None,
			}
		)
		if len(out) >= limit:
			break
	return out


def to_do(batches: list) -> list:
	"""Assignments, quizzes and exercises set in their batches that they haven't done yet."""
	from lms.lms.utils import get_assessments

	kinds = {"LMS Assignment": ("assignment", "/assignment/"), "LMS Quiz": ("quiz", "/quiz/"), "LMS Programming Exercise": ("code", "/assignment/")}
	out = []
	for batch in batches:
		try:
			rows = get_assessments(batch)
		except Exception:
			frappe.clear_messages()
			continue
		for a in rows:
			if a.get("completed") or a.get("assessment_type") not in kinds:
				continue
			kind, prefix = kinds[a.assessment_type]
			out.append({"id": a.name, "title": a.get("title") or a.assessment_name, "kind": kind, "href": prefix + a.assessment_name})
	return out[:8]


def announcements(batches: list, limit: int = 6) -> list:
	from lms.lms.api import get_announcements

	items = []
	titles = dict(frappe.get_all("LMS Batch", {"name": ["in", batches]}, ["name", "title"], as_list=True)) if batches else {}
	for batch in batches:
		try:
			rows = get_announcements(batch)
		except Exception:
			frappe.clear_messages()
			continue
		for r in rows:
			items.append(
				{
					"id": f"{batch}:{r.get('communication_date')}:{r.get('subject')}",
					"title": r.get("subject"),
					"text": (strip_html(r.get("content") or "") or "").strip()[:600],
					"at": r.get("communication_date"),
					"from": {"name": r.get("sender_full_name"), "src": r.get("image")},
					"batch": titles.get(batch),
					"batch_href": f"/batch/{batch}",
				}
			)
	items.sort(key=lambda i: str(i["at"] or ""), reverse=True)
	return items[:limit]


def certificate_card(cert, courses: dict) -> dict:
	row = courses.get(cert.course)
	return {
		"name": cert.name,
		"course": cert.course_title,
		"track": TRACK_IDS.get(row.orbitutor_track or "") if row else None,
		"issued": cert.issue_date,
		"href": f"/certificate/{cert.name}",
	}


def suggested_courses(limit: int = 3) -> list:
	rows = frappe.get_all(
		"LMS Course",
		filters={"published": 1, "upcoming": 0},
		fields=COURSE_FIELDS,
		order_by="featured desc, enrollments desc",
		limit=limit,
	)
	return [course_card(r) for r in rows]


# ---- courses ----


def require_guest_access():
	from lms.lms.utils import guest_access_allowed

	if not guest_access_allowed():
		frappe.throw(_("Sign in to see this."), frappe.PermissionError)


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=600, seconds=60 * 60)
def catalogue():
	"""Every published course, with the student's progress on the ones they're in."""
	require_guest_access()
	rows = frappe.get_all(
		"LMS Course", filters={"published": 1}, fields=COURSE_FIELDS, order_by="featured desc, enrollments desc"
	)
	mine = {}
	if frappe.session.user != "Guest":
		mine = {
			e.course: e
			for e in frappe.get_all(
				"LMS Enrollment", {"member": frappe.session.user}, ["course", "progress", "current_lesson"]
			)
		}
	return {"courses": [course_card(r, mine.get(r.name)) for r in rows]}


@frappe.whitelist()
def my_courses():
	enrolments = frappe.get_all(
		"LMS Enrollment",
		filters={"member": frappe.session.user},
		fields=["course", "progress", "current_lesson", "modified", "certificate"],
		order_by="modified desc",
	)
	courses = course_rows([e.course for e in enrolments])
	out = []
	for e in enrolments:
		if e.course not in courses:
			continue
		card = course_card(courses[e.course], e)
		card["last_opened"] = e.modified
		card["certificate_href"] = f"/certificate/{e.certificate}" if e.certificate else None
		if not card["completed"]:
			card["resume"] = resume_lesson(e.course, e.current_lesson)
		out.append(card)
	return {"courses": out}


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=600, seconds=60 * 60)
def course_page(course: str):
	"""Everything the course page shows: the course, its outline (with their progress), instructors,
	the batches running it, and whether they've asked to join."""
	from lms.lms.utils import can_view_course, get_course_outline, get_membership, get_public_instructors

	if not isinstance(course, str):
		frappe.throw(_("Course must be text."))
	require_guest_access()
	if not frappe.db.exists("LMS Course", course) or not can_view_course(course):
		raise frappe.DoesNotExistError(_("We can't find that course."))

	row = frappe.db.get_value(
		"LMS Course",
		course,
		[*COURSE_FIELDS, "description", "video_link", "enable_certification", "disable_self_learning", "orbitutor_outcomes", "orbitutor_kit"],
		as_dict=True,
	)
	signed_in = frappe.session.user != "Guest"
	# get_membership answers False, not None, when they aren't enrolled.
	membership = (get_membership(course) or None) if signed_in else None
	page = course_card(row, membership)
	page.update(
		{
			"description": row.description,
			"video": row.video_link,
			"certificate": bool(row.enable_certification),
			"project_href": row.orbitutor_project_url,
			"outcomes": lines(row.orbitutor_outcomes),
			"kit": [split_note(x) for x in lines(row.orbitutor_kit)],
			"instructors": [
				{"name": i.full_name, "src": i.user_image, "bio": i.bio, "username": i.username}
				for i in get_public_instructors("LMS Course", course)
			],
			"outline": outline(course, get_course_outline(course, progress=bool(membership))),
			"batches": running_batches(course),
			"join_request": open_join_request(frappe.session.user, course) if signed_in else None,
			"resume": resume_lesson(course, membership.current_lesson) if membership and page["progress"] < 100 else None,
			"certificate_href": f"/certificate/{membership.certificate}" if membership and membership.certificate else None,
		}
	)
	return page


def lines(text) -> list:
	return [x.strip() for x in (text or "").splitlines() if x.strip()]


def split_note(line: str) -> dict:
	name, _sep, note = line.partition(" - ")
	return {"name": name.strip(), "note": note.strip() or None}


def outline(course: str, chapters: list) -> list:
	out = []
	for c in chapters:
		out.append(
			{
				"title": c.title,
				"lessons": [
					{
						"title": l.title,
						"number": l.number,
						"kind": LESSON_KINDS.get(l.icon, "reading"),
						"href": f"/course/{course}/learn/{l.number}",
						"done": bool(l.get("is_complete")),
						"locked": bool(l.get("locked")),
						"preview": bool(l.include_in_preview),
					}
					for l in c.lessons
				],
			}
		)
	return out


def running_batches(course: str) -> list:
	names = frappe.get_all("Batch Course", {"course": course, "parenttype": "LMS Batch"}, pluck="parent")
	if not names:
		return []
	rows = frappe.get_all(
		"LMS Batch",
		filters={"name": ["in", names], "published": 1, "end_date": [">=", today()]},
		fields=["name", "title", "start_date", "end_date", "start_time", "end_time", "medium", "timezone", "seat_count"],
		order_by="start_date asc",
	)
	mine = set()
	if frappe.session.user != "Guest":
		mine = set(frappe.get_all("LMS Batch Enrollment", {"member": frappe.session.user, "batch": ["in", names]}, pluck="batch"))
	return [
		{
			"name": r.name,
			"title": r.title,
			"starts": r.start_date,
			"ends": r.end_date,
			"start_time": str(r.start_time) if r.start_time else None,
			"end_time": str(r.end_time) if r.end_time else None,
			"medium": r.medium,
			"mine": r.name in mine,
			"href": f"/batch/{r.name}",
		}
		for r in rows
	]


# ---- asking to join (payment is in cash, so staff follow up) ----


def open_join_request(user: str, course: str | None = None):
	if user == "Guest":
		return None
	filters = {"user": user, "status": ["in", ["New", "Contacted"]]}
	if course:
		filters["course"] = course
	rows = frappe.get_all("OrbiTutor Join Request", filters, ["name", "course", "batch", "creation"], order_by="creation desc", limit=1)
	return rows[0] if rows else None


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=5, seconds=60 * 60)
def ask_to_join(
	course: str,
	full_name: str | None = None,
	phone: str | None = None,
	batch: str | None = None,
	who: str | None = None,
	note: str | None = None,
	website: str | None = None,
):
	# The hidden "website" field is only ever filled in by robots: say thanks and keep nothing.
	if website:
		return {"ok": True}
	if not isinstance(course, str) or not frappe.db.get_value("LMS Course", course, "published"):
		raise frappe.DoesNotExistError(_("We can't find that course."))
	user = None if frappe.session.user == "Guest" else frappe.session.user
	if user:
		existing = open_join_request(user, course)
		if existing:
			return {"ok": True, "request": existing.name}
		full_name = full_name or frappe.db.get_value("User", user, "full_name")
	full_name = (full_name or "").strip()
	phone = (phone or "").strip()
	if not 2 <= len(full_name) <= 140:
		frappe.throw(_("Type your name."))
	digits = "".join(ch for ch in phone if ch.isdigit())
	if phone and (not 8 <= len(digits) <= 15 or any(ch not in "0123456789+ -()" for ch in phone)):
		frappe.throw(_("Check the phone number."))
	if not user and not phone:
		frappe.throw(_("Add a phone number so we can reach you."))
	if batch and batch not in {b["name"] for b in running_batches(course)}:
		batch = None
	note = (note or "").strip() if isinstance(note, str) else ""
	if len(note) > 1000:
		frappe.throw(_("Keep the note under 1000 characters."))
	doc = frappe.get_doc(
		{
			"doctype": "OrbiTutor Join Request",
			"course": course,
			"batch": batch,
			"full_name": full_name,
			"phone": phone,
			"user": user,
			"for_whom": "Their child" if who == "child" else "Themselves",
			"message": note,
			"status": "New",
		}
	).insert(ignore_permissions=True)
	notify_staff(doc)
	return {"ok": True, "request": doc.name}


def notify_staff(doc):
	to = frappe.conf.get("orbitutor_email") or "orbitutor@orbit-core.com"
	course = frappe.db.get_value("LMS Course", doc.course, "title")
	try:
		frappe.sendmail(
			recipients=[to],
			subject=_("{0} asked to join {1}").format(doc.full_name, course),
			message="<p>{}</p><p>{}</p>{}<p><a href='{}'>Open the request</a></p>".format(
				escape_html(
					f"{doc.full_name} asked to join {course}"
					+ (" for their child." if doc.for_whom == "Their child" else ".")
				),
				escape_html(f"Phone: {doc.phone or 'none given'}. Account: {doc.user or 'not signed in'}."),
				f"<p>{escape_html(doc.message)}</p>" if doc.message else "",
				get_url(f"/desk/orbitutor-join-request/{doc.name}"),
			),
		)
	except Exception:
		frappe.log_error(title="OrbiTutor: join request email not sent")


@frappe.whitelist(methods=["POST"])
def cancel_join_request(course: str):
	for name in frappe.get_all(
		"OrbiTutor Join Request",
		{"user": frappe.session.user, "course": course, "status": ["in", ["New", "Contacted"]]},
		pluck="name",
	):
		frappe.db.set_value("OrbiTutor Join Request", name, "status", "Closed")
	return {"ok": True}


# ---- search ----


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=600, seconds=60 * 60)
def search(query: str):
	"""Published courses and their lessons whose titles match. (Lesson titles are public: every
	course's outline shows them.)"""
	from lms.lms.utils import get_lesson_index, guest_access_allowed

	q = (query or "").strip()[:80] if isinstance(query, str) else ""
	if len(q) < 2 or not guest_access_allowed():
		return {"courses": [], "lessons": []}
	like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
	published = frappe.get_all("LMS Course", {"published": 1}, ["name", "title", "orbitutor_track"])
	by_name = {c.name: c for c in published}
	courses = frappe.get_all("LMS Course", {"published": 1, "title": ["like", like]}, COURSE_FIELDS, limit=6)
	lessons = []
	if by_name:
		for l in frappe.get_all(
			"Course Lesson", {"course": ["in", list(by_name)], "title": ["like", like]}, ["name", "title", "course"], limit=8
		):
			number = get_lesson_index(l.name)
			c = by_name[l.course]
			lessons.append(
				{"title": l.title, "course": c.title, "track": TRACK_IDS.get(c.orbitutor_track or ""), "href": f"/course/{l.course}/learn/{number}", "number": number}
			)
	return {"courses": [course_card(r) for r in courses], "lessons": lessons}


# ---- questions under a lesson ----


def lesson_people(lesson: str):
	course = frappe.db.get_value("Course Lesson", lesson, "course")
	teachers = set(frappe.get_all("Course Instructor", {"parent": course, "parenttype": "LMS Course"}, pluck="instructor"))
	return course, teachers


def check_topic_access(lesson: str):
	from lms.lms.utils import can_access_topic

	if not isinstance(lesson, str) or not frappe.db.exists("Course Lesson", lesson) or not can_access_topic("Course Lesson", lesson):
		frappe.throw(_("You can't see the questions on this lesson."), frappe.PermissionError)


@frappe.whitelist()
def lesson_questions(lesson: str):
	check_topic_access(lesson)
	_course, teachers = lesson_people(lesson)
	topics = frappe.get_all(
		"Discussion Topic",
		{"reference_doctype": "Course Lesson", "reference_docname": lesson},
		["name", "title", "owner", "creation"],
		order_by="creation desc",
		limit=50,
	)
	if not topics:
		return []
	replies = frappe.get_all(
		"Discussion Reply", {"topic": ["in", [t.name for t in topics]]}, ["name", "topic", "owner", "creation", "reply"], order_by="creation asc"
	)
	owners = {t.owner for t in topics} | {r.owner for r in replies}
	people = {u.name: u for u in frappe.get_all("User", {"name": ["in", list(owners)]}, ["name", "full_name", "user_image"])}
	moderators = set(frappe.get_all("Has Role", {"parent": ["in", list(owners)], "role": "Moderator", "parenttype": "User"}, pluck="parent"))

	def person(owner):
		u = people.get(owner) or frappe._dict()
		return {"name": u.full_name or _("A student"), "src": u.user_image}

	def entry(name, owner, at, body):
		return {
			"id": name,
			"body": body,
			"author": person(owner),
			"at": at,
			"mine": owner == frappe.session.user,
			"instructor": owner in teachers or owner in moderators,
		}

	by_topic = {}
	for r in replies:
		by_topic.setdefault(r.topic, []).append(r)
	out = []
	for t in topics:
		rs = by_topic.get(t.name, [])
		# The question itself is the topic's first reply, by its author.
		first = rs[0] if rs and rs[0].owner == t.owner else None
		question = entry(t.name, t.owner, t.creation, first.reply if first else "")
		question["title"] = t.title
		question["replies"] = [entry(r.name, r.owner, r.creation, r.reply) for r in (rs[1:] if first else rs)]
		out.append(question)
	return out


def as_html(text: str, limit: int) -> str:
	text = (text or "").strip()
	if not text:
		frappe.throw(_("Write something first."))
	if len(text) > limit:
		frappe.throw(_("That's too long: keep it under {0} characters.").format(limit))
	return "".join(f"<p>{escape_html(p)}</p>" for p in text.split("\n") if p.strip())


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=30, seconds=60 * 60)
def ask_question(lesson: str, title: str, body: str = ""):
	check_topic_access(lesson)
	title = (title or "").strip()
	if not 3 <= len(title) <= 140:
		frappe.throw(_("Give your question a short title."))
	topic = frappe.get_doc(
		{"doctype": "Discussion Topic", "title": title, "reference_doctype": "Course Lesson", "reference_docname": lesson}
	).insert()
	frappe.get_doc({"doctype": "Discussion Reply", "topic": topic.name, "reply": as_html(body or title, 5000)}).insert()
	return {"ok": True, "id": topic.name}


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=60, seconds=60 * 60)
def reply(topic: str, body: str):
	ref = frappe.db.get_value("Discussion Topic", topic, ["reference_doctype", "reference_docname"], as_dict=True)
	if not ref or ref.reference_doctype != "Course Lesson":
		raise frappe.DoesNotExistError(_("We can't find that question."))
	check_topic_access(ref.reference_docname)
	doc = frappe.get_doc({"doctype": "Discussion Reply", "topic": topic, "reply": as_html(body, 5000)}).insert()
	return {"ok": True, "id": doc.name}
