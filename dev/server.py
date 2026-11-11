"""A stand-in Frappe server for testing the OrbiTutor app in a browser.

It serves the real page (orbitutor/www/_orbitutor.html with get_context), the built files, and
answers /api/method/ calls: OrbiTutor's own methods run the real orbitutor/api.py over the
stand-in database; Frappe's and Frappe Learning's are imitated as v16 answers them.

    python3 server.py [port]
"""

import json
import mimetypes
import os
import re
import secrets
import sys
import threading
import traceback
from datetime import datetime, timedelta
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
APP_ROOT = os.path.dirname(HERE)
sys.path[:0] = [os.path.join(HERE, "fake"), APP_ROOT, HERE]

import frappe  # noqa: E402
import jinja2  # noqa: E402
from frappe.utils.data import sha256_hash  # noqa: E402

frappe.APP_PATHS["orbitutor"] = os.path.join(APP_ROOT, "orbitutor")

import fixtures  # noqa: E402
import orbitutor.api  # noqa: E402
import orbitutor.learn  # noqa: E402
import orbitutor.teach  # noqa: E402
import orbitutor.hooks as hooks  # noqa: E402
from orbitutor.www import _orbitutor as page  # noqa: E402

UI = os.path.join(APP_ROOT, "orbitutor", "public", "ui")
LOCK = threading.Lock()
SESSIONS = {}  # sid -> {"user", "csrf"}
LOG = []  # (method, args, user, status) for the tests
UPLOADS = {}  # file_url -> (bytes, content type)
# what a sample photo shows: a pyramid on a phone
SAMPLE_PICTURE = (
	b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#0b1433"/>'
	b'<rect x="250" y="380" width="300" height="160" rx="18" fill="#1d2a55"/><polygon points="400,140 300,380 500,380" fill="#7fd3ff" opacity="0.55"/>'
	b'<polygon points="400,140 500,380 540,360" fill="#bfe9ff" opacity="0.4"/></svg>'
)


def multipart(raw, ctype):
	"""The fields of a multipart/form-data body; a file field becomes {filename, type, content}."""
	boundary = ctype.split("boundary=", 1)[1].strip().strip('"').encode()
	out = {}
	for part in raw.split(b"--" + boundary):
		part = part.strip(b"\r\n")
		if not part or part == b"--":
			continue
		head, _sep, body = part.partition(b"\r\n\r\n")
		headers = head.decode("utf-8", "replace")
		name = re.search(r'name="([^"]*)"', headers)
		if not name:
			continue
		filename = re.search(r'filename="([^"]*)"', headers)
		if filename:
			kind = re.search(r"Content-Type:\s*(\S+)", headers, re.I)
			out[name.group(1)] = {"filename": filename.group(1), "type": kind.group(1) if kind else None, "content": body}
		else:
			out[name.group(1)] = body.decode("utf-8", "replace")
	return out
# Frappe's and Frappe Learning's methods the app calls straight, with who may call them.
OTHER = {
	"lms.lms.utils.get_lesson": True,
	"lms.lms.utils.get_course_outline": True,
	"lms.lms.api.get_notifications": False,
	"lms.lms.doctype.course_lesson.course_lesson.save_progress": False,
	"frappe.desk.doctype.notification_log.notification_log.mark_all_as_read": False,
	"frappe.desk.doctype.notification_log.notification_log.mark_as_read": False,
	"lms.lms.doctype.lms_quiz.lms_quiz.submit_quiz": False,
	"lms.lms.doctype.lms_quiz.lms_quiz.check_answer": False,
}
MODULES = {"orbitutor.api.": orbitutor.api, "orbitutor.learn.": orbitutor.learn, "orbitutor.teach.": orbitutor.teach}
fixtures.seed()

ROUTE_RULES = [re.compile("^" + re.sub(r"<(?:path:)?\w+>", lambda m: ".+" if "path:" in m.group(0) else "[^/]+", r) + "/?$") for r in hooks.APP_ROUTES]
env = jinja2.Environment(loader=jinja2.FileSystemLoader(os.path.join(APP_ROOT, "orbitutor", "www")), autoescape=False)


def website_redirect(path):
	"""Frappe's resolve_redirect: the first website_redirects rule matching the whole path."""
	p = path.strip("/ ")
	for rule in getattr(hooks, "website_redirects", []):
		source = rule["source"].strip("/ ")
		if re.match(source + "$", p):
			return re.sub(source, rule["target"], p)
	return None


def csrf_for(sid):
	return SESSIONS.get(sid, {}).get("csrf") or "guest-csrf"


class Handler(BaseHTTPRequestHandler):
	protocol_version = "HTTP/1.1"

	def log_message(self, *args):
		pass

	# ---- helpers ----
	def sid(self):
		c = SimpleCookie(self.headers.get("Cookie") or "")
		return c["sid"].value if "sid" in c else None

	def user(self):
		s = SESSIONS.get(self.sid())
		return s["user"] if s else "Guest"

	def send(self, status, body=b"", ctype="text/html; charset=utf-8", headers=None):
		if isinstance(body, str):
			body = body.encode()
		self.send_response(status)
		self.send_header("Content-Type", ctype)
		self.send_header("Content-Length", str(len(body)))
		for k, v in (headers or {}).items():
			self.send_header(k, v)
		self.end_headers()
		if self.command != "HEAD":
			self.wfile.write(body)

	def json(self, status, obj, headers=None):
		self.send(status, json.dumps(obj, default=str), "application/json", headers)

	def redirect(self, to):
		self.send(302, b"", headers={"Location": to})

	# ---- pages ----
	def do_GET(self):
		url = urlparse(self.path)
		path = url.path
		if path.startswith("/assets/orbitutor/ui/"):
			return self.asset(path[len("/assets/orbitutor/ui/") :])
		if path == "/_orbitutor":
			return self.redirect("/")
		if path in ("/profile", "/profile/"):
			return self.redirect("/my-profile")
		if path.startswith("/api/method/"):
			return self.api(path[len("/api/method/") :], {k: v[0] for k, v in parse_qs(url.query).items()})
		to = website_redirect(path)
		if to:
			return self.redirect(to)
		if path.startswith("/lms") or path in ("/staff-login", "/desk", "/me") or path.startswith("/desk/"):
			return self.send(200, f"<!doctype html><title>Classic</title><h1>Classic view: {path}</h1>")
		if path.startswith("/files/") or path.startswith("/private/files/"):
			if path in UPLOADS:
				return self.send(200, UPLOADS[path][0], UPLOADS[path][1])
			if path.endswith((".jpg", ".png")):
				return self.send(200, SAMPLE_PICTURE, "image/svg+xml")
			return self.send(404, "not found", "text/plain")
		if path == "/" or any(r.match(path) for r in ROUTE_RULES):
			return self.app_page()
		return self.send(404, "<!doctype html><title>Not found</title><h1>Frappe's 404</h1>")

	do_HEAD = do_GET

	def asset(self, rel):
		full = os.path.normpath(os.path.join(UI, rel))
		if not full.startswith(UI) or not os.path.isfile(full):
			return self.send(404, "not found", "text/plain")
		with open(full, "rb") as f:
			data = f.read()
		ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
		if ctype.startswith("text/") or ctype in ("application/javascript",):
			ctype += "; charset=utf-8"
		self.send(200, data, ctype, {"Cache-Control": "no-cache"})

	def app_page(self):
		with LOCK:
			frappe.init_request(self.user())
			sid = self.sid()
			frappe.sessions.get_csrf_token = lambda: csrf_for(sid)
			ctx = frappe._dict()
			page.get_context(ctx)
			html = env.get_template("_orbitutor.html").render(**ctx)
		self.send(200, html)

	# ---- API ----
	def do_POST(self):
		url = urlparse(self.path)
		if not url.path.startswith("/api/method/"):
			return self.send(405, "no")
		length = int(self.headers.get("Content-Length") or 0)
		raw = self.rfile.read(length) if length else b""
		ctype = self.headers.get("Content-Type") or ""
		if ctype.startswith("multipart/form-data"):
			args = multipart(raw, ctype)
		else:
			try:
				args = json.loads(raw or b"{}")
			except ValueError:
				args = {k: v[0] for k, v in parse_qs(raw.decode()).items()}
		self.api(url.path[len("/api/method/") :], args, post=True)

	def fail(self, status, exc_type, message, extra=None):
		body = {"exc_type": exc_type, "_server_messages": json.dumps([json.dumps({"message": message})])}
		body.update(extra or {})
		self.json(status, body)

	def api(self, method, args, post=False):
		user = self.user()
		sid = self.sid()
		if os.environ.get("MOCK_DOWN") == "1":
			return self.fail(503, "SessionStopped", "Down for maintenance")
		if post and user != "Guest" and not method.startswith("__") and self.headers.get("X-Frappe-CSRF-Token") != csrf_for(sid):
			LOG.append((method, args, user, 400))
			return self.fail(400, "CSRFTokenError", "Invalid Request")
		with LOCK:
			frappe.init_request(user)
			try:
				status, result, headers = self.dispatch(method, args, user, post)
			except frappe.ValidationError as e:
				status = getattr(e, "http_status_code", 417)
				LOG.append((method, args, user, status))
				return self.fail(status, type(e).__name__, str(e))
			except frappe.PermissionError as e:
				LOG.append((method, args, user, 403))
				return self.fail(403, "PermissionError", str(e) or "Not permitted")
			except frappe.AuthenticationError as e:
				LOG.append((method, args, user, 401))
				return self.json(401, {"message": str(e), "exc_type": "AuthenticationError"})
			except Exception as e:  # a bug in orbitutor/api.py: what Frappe would log
				traceback.print_exc()
				LOG.append((method, args, user, 500))
				return self.fail(500, type(e).__name__, "Server error", {"exception": f"{type(e).__name__}: {e}"})
		LOG.append((method, args, user, status))
		self.json(status, result, headers)

	def dispatch(self, method, args, user, post):
		if method == "login":
			return self.login(args)
		if method == "logout":
			SESSIONS.pop(self.sid(), None)
			return 200, {"message": None}, {"Set-Cookie": "sid=; Path=/; Max-Age=0"}
		if method == "frappe.auth.get_logged_user":
			if user == "Guest":
				raise frappe.PermissionError("Not permitted")
			return 200, {"message": user}, None
		if method == "frappe.www.login.send_login_link":
			return 200, {"message": None}, None
		if method == "frappe.core.doctype.user.user.reset_password":
			if not frappe.db.exists("User", args.get("user")):
				return 404, {"message": "not found"}, None
			return 200, {"message": None}, None
		if method == "frappe.core.doctype.user.user.update_password":
			return self.update_password(args)
		if method == "__log":
			return 200, {"message": LOG[-200:]}, None
		if method == "__mail":
			return 200, {"message": [{"to": r.get("recipients"), "subject": r.get("subject"), "template": r.get("template"), "args": r.get("args")} for r in frappe.DB.rows("Email Queue")[-10:]]}, None
		if method == "__drop":
			SESSIONS.clear()
			return 200, {"message": "ok"}, None
		if method == "__reset":
			frappe.DB.tables.clear()
			frappe.DB.singles.clear()
			UPLOADS.clear()
			SESSIONS.clear()
			LOG.clear()
			fixtures.seed()
			frappe.set_user("Guest")
			return 200, {"message": "ok"}, None
		if method == "upload_file":
			return self.upload(args, user)
		module = next((m for prefix, m in MODULES.items() if method.startswith(prefix)), None)
		if module is not None:
			fn = getattr(module, method.rsplit(".", 1)[1], None)
			if fn is None or fn not in frappe.whitelisted:
				raise frappe.PermissionError("Not whitelisted")
			if user == "Guest" and not fn._allow_guest:
				raise frappe.PermissionError("Not permitted")
			if fn._methods and ("POST" if post else "GET") not in fn._methods:
				raise frappe.PermissionError("Not allowed")
			return 200, {"message": fn(**args)}, None
		if method in OTHER:
			if user == "Guest" and not OTHER[method]:
				raise frappe.PermissionError("Not permitted")
			if method == "lms.lms.utils.get_lesson":
				# Frappe validates argument types: chapter and lesson are ints
				for k in ("chapter", "lesson"):
					if not isinstance(args.get(k), int):
						raise frappe.ValidationError(f"Argument '{k}' should be of type 'int'")
			return 200, {"message": frappe.get_attr(method)(**args)}, None
		raise frappe.PermissionError(f"{method} is not whitelisted")

	def upload(self, args, user):
		"""Frappe's upload_file: keeps the file in memory and answers with its File row."""
		if user == "Guest":
			raise frappe.PermissionError("Not permitted")
		f = args.get("file")
		if not isinstance(f, dict) or not f.get("content"):
			raise frappe.ValidationError("No file attached")
		private = str(args.get("is_private") or "0") == "1"
		url = ("/private/files/" if private else "/files/") + f["filename"]
		UPLOADS[url] = (f["content"], f.get("type") or "application/octet-stream")
		row = frappe.DB.insert("File", {"file_name": f["filename"], "file_url": url, "is_private": 1 if private else 0, "owner": user,
		                                "attached_to_doctype": args.get("doctype"), "attached_to_name": args.get("docname"), "file_size": len(f["content"])})
		return 200, {"message": {"name": row["name"], "file_name": row["file_name"], "file_url": url, "is_private": row["is_private"]}}, None

	def login(self, args):
		usr, pwd = args.get("usr"), args.get("pwd")
		row = frappe.db.get_value("User", usr, ["name", "password", "full_name", "user_type"], as_dict=True)
		if usr == "locked@example.com":
			raise frappe.AuthenticationError("Your account has been locked and will resume after 300 seconds")
		if not row or row.password != pwd:
			raise frappe.AuthenticationError("Invalid login credentials")
		# as orbitutor.auth.on_login decides, after Frappe's own choice
		home = "/" if row.user_type == "Website User" else "/teach" if {"Moderator", "Course Creator", "Batch Evaluator"} & set(frappe.get_roles(row.name)) else "/desk"
		return 200, {"message": "Logged In", "home_page": home, "full_name": row.full_name}, self.start_session(row.name)

	def start_session(self, user):
		sid = secrets.token_hex(12)
		SESSIONS[sid] = {"user": user, "csrf": secrets.token_hex(8)}
		return {"Set-Cookie": f"sid={sid}; Path=/; HttpOnly; SameSite=Lax"}

	def update_password(self, args):
		pw, key = args.get("new_password") or "", args.get("key")
		if args.get("old_password") is not None and not key:
			user = self.user()
			if user == "Guest":
				raise frappe.PermissionError("Not permitted")
			if frappe.db.get_value("User", user, "password") != args.get("old_password"):
				raise frappe.AuthenticationError("Incorrect User or Password")
			if len(pw) < 10:
				raise frappe.ValidationError("Invalid Password: Better add a few more letters or another word")
			frappe.db.set_value("User", user, "password", pw)
			return 200, {"message": "/"}, None
		if len(pw) < 10 or pw.lower() in ("password123",):
			raise frappe.ValidationError("Invalid Password: Better add a few more letters or another word")
		row = frappe.db.get_value("User", {"reset_password_key": sha256_hash(key or "")}, ["name", "last_reset_password_key_generated_on"], as_dict=True)
		if not row:
			return 410, {"message": "The reset password link has either been used before or is invalid"}, None
		if row.last_reset_password_key_generated_on < datetime.now() - timedelta(minutes=20):
			return 410, {"message": "The reset password link has been expired"}, None
		frappe.db.set_value("User", row.name, {"password": pw, "reset_password_key": "", "last_login": datetime.now()})
		return 200, {"message": "/"}, self.start_session(row.name)


def main():
	port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
	server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
	print(f"Stand-in Frappe on http://127.0.0.1:{port}", flush=True)
	server.serve_forever()


if __name__ == "__main__":
	main()
