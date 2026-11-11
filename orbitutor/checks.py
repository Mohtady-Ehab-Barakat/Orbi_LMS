"""A self-check to run on the server after installing or updating OrbiTutor:

    bench --site <your site> execute orbitutor.checks.run

It changes nothing. It prints one line per check: "ok", "note" (worth a look, nothing is
broken) or "FAIL" (something students would notice), and ends with a count.
"""

import importlib
import inspect
import os

import frappe
from frappe.utils import get_url

from orbitutor.hooks import APP_ROUTES

# Frappe Learning functions OrbiTutor calls, with the arguments it passes. A Frappe Learning
# update that renames one of these shows up here instead of as a broken page.
LMS_FUNCTIONS = {
	"lms.lms.utils.get_lesson": ["course", "chapter", "lesson"],
	"lms.lms.utils.get_course_outline": ["course", "progress"],
	"lms.lms.utils.get_lesson_index": ["lesson_name"],
	"lms.lms.utils.get_lesson_icon": ["body", "content"],
	"lms.lms.utils.get_membership": ["course"],
	"lms.lms.utils.can_view_course": ["course"],
	"lms.lms.utils.get_public_instructors": ["doctype", "docname"],
	"lms.lms.utils.guest_access_allowed": [],
	"lms.lms.utils.can_access_topic": ["doctype", "docname"],
	"lms.lms.utils.get_assessments": ["batch"],
	"lms.lms.permissions.get_lesson_gate": ["course"],
	"lms.lms.permissions.can_author_course": ["course", "user"],
	"lms.lms.api.get_announcements": ["batch"],
	"lms.lms.api.get_notifications": ["filters"],
	"lms.lms.doctype.course_lesson.course_lesson.save_progress": ["lesson", "course"],
	"frappe.desk.doctype.notification_log.notification_log.mark_all_as_read": [],
	"frappe.desk.doctype.notification_log.notification_log.mark_as_read": ["docname"],
	"frappe.core.doctype.user.user.reset_password": ["user"],
	"frappe.core.doctype.user.user.update_password": ["new_password", "key", "old_password"],
	"frappe.www.login.send_login_link": ["email"],
	# the student pages added in build 3
	"lms.lms.utils.get_quiz_with_questions": ["quiz"],
	"lms.lms.utils.get_assignment": ["name"],
	"lms.lms.utils.can_modify_course": ["course"],
	"lms.lms.utils.can_modify_batch": ["batch"],
	"lms.lms.api.get_programming_exercise": ["exercise"],
	"lms.lms.api.evaluate_programming_exercise": ["exercise", "outputs"],
	"lms.lms.doctype.lms_quiz.lms_quiz.submit_quiz": ["quiz", "results", "submission_reason"],
	"lms.lms.doctype.lms_quiz.lms_quiz.check_answer": ["quiz", "question", "question_type", "answers"],
	"lms.lms.doctype.course_evaluator.course_evaluator.get_schedule": ["course", "batch"],
	# the Teach area
	"lms.lms.api.upsert_chapter": ["title", "course", "name"],
	"lms.lms.api.update_chapter_index": ["chapter", "course", "idx"],
	"lms.lms.api.delete_chapter": ["chapter"],
	"lms.lms.api.create_lesson": ["chapter", "title"],
	"lms.lms.api.update_lesson_index": ["lesson", "sourceChapter", "targetChapter", "idx"],
	"lms.lms.api.delete_lesson": ["lesson", "chapter"],
	"lms.lms.api.save_evaluation_details": ["member", "course", "date_value", "start_time", "end_time", "status", "batch_name", "summary"],
	"lms.lms.doctype.lms_batch.lms_batch.create_live_class": ["batch_name", "zoom_account", "title", "duration", "date", "time", "timezone", "auto_recording", "description"],
	"lms.lms.doctype.lms_certificate.lms_certificate.get_default_certificate_template": [],
}

# Called from the browser, so they must stay whitelisted.
WHITELISTED = [
	"lms.lms.utils.get_lesson",
	"lms.lms.utils.get_course_outline",
	"lms.lms.api.get_notifications",
	"lms.lms.doctype.course_lesson.course_lesson.save_progress",
	"frappe.desk.doctype.notification_log.notification_log.mark_all_as_read",
	"frappe.desk.doctype.notification_log.notification_log.mark_as_read",
	"frappe.core.doctype.user.user.reset_password",
	"frappe.core.doctype.user.user.update_password",
	"frappe.www.login.send_login_link",
	"lms.lms.doctype.lms_quiz.lms_quiz.submit_quiz",
	"lms.lms.doctype.lms_quiz.lms_quiz.check_answer",
]

UI_FILES = [
	"app.js",
	"app.css",
	"bundle.js",
	"bundle.css",
	"tokens.css",
	"react.production.min.js",
	"react-dom.production.min.js",
	"manifest.json",
	"icon-192.png",
	"fonts/AtkinsonHyperlegible-Regular.woff2",
	"fonts/Fredoka-SemiBold.woff2",
]


class Report:
	def __init__(self):
		self.counts = {"ok": 0, "note": 0, "FAIL": 0}

	def line(self, kind, text):
		self.counts[kind] += 1
		print(f"  {kind:<4}  {text}")

	def ok(self, text):
		self.line("ok", text)

	def note(self, text):
		self.line("note", text)

	def fail(self, text):
		self.line("FAIL", text)

	def check(self, passed, text, problem, kind="FAIL"):
		if passed:
			self.ok(text)
		else:
			self.line(kind, problem)


def run():
	r = Report()
	print(f"OrbiTutor self-check on {frappe.local.site}\n")

	section("Apps")
	apps(r)
	section("Frappe Learning functions OrbiTutor uses")
	functions(r)
	section("Addresses")
	routes(r)
	section("The app's files")
	files(r)
	section("Settings")
	settings(r)
	section("Emails")
	emails(r)

	c = r.counts
	print(f"\n{c['ok']} ok, {c['note']} to look at, {c['FAIL']} failed.")
	if c["FAIL"]:
		print("Fix the FAIL lines first: students would notice those.")
	frappe.db.rollback()


def section(title):
	print(f"\n{title}")


def apps(r):
	installed = frappe.get_installed_apps()
	version = frappe.__version__
	r.check(
		version.split(".")[0] in {"16", "17"},
		f"Frappe {version}",
		f"Frappe {version}: OrbiTutor is built for Frappe 16",
	)
	for app in ("lms", "payments", "orbitutor"):
		r.check(app in installed, f"{app} is installed", f"{app} isn't installed on this site", kind="FAIL" if app != "payments" else "note")
	if "lms" in installed:
		lms_version = getattr(importlib.import_module("lms"), "__version__", "?")
		r.check(
			str(lms_version).split(".")[0] in {"2", "16", "17"} or str(lms_version).startswith("16"),
			f"Frappe Learning {lms_version}",
			f"Frappe Learning {lms_version}: OrbiTutor was tested with the version-16 branch",
			kind="note",
		)
	if "orbitutor" in installed and "lms" in installed:
		r.check(
			installed.index("orbitutor") > installed.index("lms"),
			"OrbiTutor is installed after Frappe Learning, so its emails and sign-in redirect win",
			"OrbiTutor was installed before Frappe Learning: its email layout and sign-in redirect won't take effect",
		)


def functions(r):
	for path, args in LMS_FUNCTIONS.items():
		try:
			fn = frappe.get_attr(path)
		except Exception as e:
			r.fail(f"{path} is missing ({e.__class__.__name__})")
			continue
		params = inspect.signature(inspect.unwrap(fn)).parameters
		missing = [a for a in args if a not in params]
		if missing:
			r.fail(f"{path} no longer takes {', '.join(missing)}")
		elif path in WHITELISTED and fn not in frappe.whitelisted:
			r.fail(f"{path} is no longer callable from the browser")
		else:
			r.ok(path)


def routes(r):
	from werkzeug.test import EnvironBuilder
	from werkzeug.wrappers import Request

	from frappe.website.page_renderers.redirect_page import RedirectPage
	from frappe.website.path_resolver import PathResolver

	def resolve(path, user="Guest"):
		frappe.set_user(user)
		frappe.local.request = Request(EnvironBuilder(path=path, base_url=get_url()).get_environ())
		frappe.local.form_dict = frappe._dict()
		frappe.flags.redirect_location = None
		frappe.local.flags.home_page = None
		try:
			endpoint, renderer = PathResolver(path).resolve()
		finally:
			frappe.local.request = None
		return endpoint, renderer

	frappe.cache.delete_value("website_route_rules")
	frappe.cache.delete_key("website_redirects")
	frappe.cache.delete_key("website_404")
	frappe.cache.delete_key("home_page")

	samples = []
	for route in APP_ROUTES:
		samples.append(
			route.replace("<course>", "a-course")
			.replace("<batch>", "a-batch")
			.replace("<path:rest>", "learn/1-1")
			.replace("<certificate>", "a-certificate")
			.replace("<username>", "someone")
			.replace("<section>", "account")
			.replace("<assignment>", "an-assignment")
			.replace("<quiz>", "a-quiz")
			.replace("<exercise>", "an-exercise")
		)
	wrong = []
	for path in samples:
		endpoint, renderer = resolve(path)
		if endpoint != "_orbitutor" or isinstance(renderer, RedirectPage):
			wrong.append(f"{path} -> {endpoint} ({renderer.__class__.__name__})")
	r.check(not wrong, f"All {len(samples)} app addresses open OrbiTutor", "These addresses don't open OrbiTutor: " + "; ".join(wrong))

	endpoint, renderer = resolve("/")
	r.check(endpoint == "_orbitutor", "/ opens OrbiTutor for someone signed out", f"/ opens {endpoint} for someone signed out")

	student = frappe.db.get_value("User", {"user_type": "Website User", "enabled": 1}, "name")
	if student:
		endpoint, renderer = resolve("/", student)
		r.check(
			endpoint == "_orbitutor",
			"/ opens OrbiTutor for a signed-in student",
			f"/ opens {endpoint} for a signed-in student: check the student roles' Home Page and Portal Settings",
		)
	else:
		r.note("No student accounts yet, so / for a signed-in student wasn't tried")
	frappe.set_user("Administrator")

	for path, target in (("/profile", "/my-profile"), ("/_orbitutor", "/")):
		endpoint, renderer = resolve(path)
		r.check(
			isinstance(renderer, RedirectPage) and (frappe.flags.redirect_location or "").rstrip("/") == target.rstrip("/"),
			f"{path} goes to {target}",
			f"{path} doesn't go to {target} (it goes to {frappe.flags.redirect_location or endpoint})",
			kind="note",
		)
	# Frappe Learning's own screens are closed: its addresses go to OrbiTutor's
	for path, target in (("/lms", "/"), ("/lms/courses/a-course/learn/1.2", "/course/a-course/learn/1-2"), ("/lms/batches/a-batch", "/batch/a-batch"), ("/lms/quizzes", "/teach/library")):
		endpoint, renderer = resolve(path)
		went = frappe.flags.redirect_location or endpoint
		r.check(
			isinstance(renderer, RedirectPage) and (went or "").split("?")[0].rstrip("/") == target.rstrip("/"),
			f"{path} goes to {target}",
			f"{path} still opens Frappe Learning's own page (it goes to {went})",
		)
	endpoint, renderer = resolve("/staff-login")
	r.check(endpoint == "login", "Frappe's own sign-in page is at /staff-login", f"/staff-login opens {endpoint}", kind="note")


def files(r):
	ui = frappe.get_app_path("orbitutor", "public", "ui")
	missing = [f for f in UI_FILES if not os.path.exists(os.path.join(ui, f))]
	r.check(not missing, "The built app is in orbitutor/public/ui", "Missing from orbitutor/public/ui: " + ", ".join(missing))
	linked = os.path.join(frappe.local.sites_path, "assets", "orbitutor", "ui", "app.js")
	r.check(
		os.path.exists(linked),
		"The browser can reach them at /assets/orbitutor/ui/",
		"The browser can't reach /assets/orbitutor/ui/app.js: run bench build --app orbitutor",
	)
	r.check(
		os.path.exists(frappe.get_app_path("orbitutor", "www", "_orbitutor.html")),
		"The app's page is there",
		"orbitutor/www/_orbitutor.html is missing",
	)


def settings(r):
	home = (frappe.db.get_single_value("Portal Settings", "default_portal_home") or "").strip("/")
	r.check(not home, "Portal Settings has no home page of its own", f"Portal Settings sends signed-in users to /{home}: clear it so / opens OrbiTutor")

	role_homes = frappe.get_all("Role", {"home_page": ["is", "set"], "desk_access": 0}, ["name", "home_page"])
	r.check(
		not role_homes,
		"No student role has a home page of its own",
		"These roles send people elsewhere after signing in: "
		+ ", ".join(f"{x.name} ({x.home_page})" for x in role_homes),
		kind="note",
	)

	from lms.lms.utils import guest_access_allowed

	r.check(
		guest_access_allowed(),
		"Visitors can see the course catalogue (LMS Settings: Allow guest access)",
		"Visitors can't see courses until they sign in (LMS Settings: Allow guest access is off)",
		kind="note",
	)
	from frappe.website.utils import is_signup_disabled

	r.check(
		not is_signup_disabled(),
		"Students can make their own account at /signup (staff still put them in classes)",
		"Signing up is off (Website Settings: Disable Signup), so only staff can make accounts",
		kind="note",
	)
	has_student_role = frappe.db.exists("Role", "LMS Student")
	r.check(has_student_role, "The LMS Student role exists for new accounts", "The LMS Student role is missing: new accounts get no student role")
	app_name = frappe.get_website_settings("app_name")
	r.check(
		app_name == "OrbiTutor",
		"Website Settings: App Name is OrbiTutor",
		f"Website Settings: App Name is {app_name or 'not set'}; OrbiTutor shows in tabs and emails when it's set",
		kind="note",
	)
	if frappe.db.get_single_value("System Settings", "default_app") == "lms":
		r.note("System Settings: Default App is Frappe Learning, whose pages now go to OrbiTutor. Set it to OrbiTutor, or leave it empty")
	r.check(
		frappe.db.exists("DocType", "OrbiTutor Join Request"),
		"Join requests can be kept",
		"The OrbiTutor Join Request DocType is missing: run bench --site <site> migrate",
	)
	fields = set(frappe.get_all("Custom Field", {"dt": "LMS Course", "fieldname": ["like", "orbitutor_%"]}, pluck="fieldname"))
	r.check(
		{"orbitutor_track", "orbitutor_project", "orbitutor_outcomes", "orbitutor_kit"} <= fields,
		"Courses have OrbiTutor's fields (track, project, what they'll learn, kit)",
		"OrbiTutor's course fields are missing: run bench --site <site> migrate",
	)
	r.check(
		frappe.db.exists("Custom Field", {"dt": "LMS Quiz Submission", "fieldname": "orbitutor_reviewed"}),
		"Quiz attempts can be marked as reviewed (for open answers in Marking)",
		"LMS Quiz Submission has no orbitutor_reviewed field: run bench --site <site> migrate",
	)
	untracked = frappe.db.count("LMS Course", {"published": 1, "orbitutor_track": ["in", ["", None]]}) if fields else 0
	r.check(
		not untracked,
		"Every published course has a track",
		f"{untracked} published course(s) have no track: set one under OrbiTutor app on the course",
		kind="note",
	)


def emails(r):
	from frappe.utils.jinja import get_jenv

	try:
		template = get_jenv().get_template("templates/emails/auth_email.html")
		r.check(
			"orbitutor" in (template.filename or ""),
			"Sign-in emails use OrbiTutor's layout",
			f"Sign-in emails use {template.filename}, not OrbiTutor's layout",
		)
	except Exception as e:
		r.fail(f"Couldn't load the email layout: {e}")
	for name in ("password_reset", "new_user", "login_with_email_link", "batch_confirmation"):
		try:
			t = get_jenv().get_template(f"templates/emails/{name}.html")
			r.check("orbitutor" in (t.filename or ""), f"{name} uses OrbiTutor's wording", f"{name} comes from {t.filename}", kind="note")
		except Exception as e:
			r.fail(f"{name}: {e}")
	r.check(
		frappe.db.get_single_value("System Settings", "disable_standard_email_footer"),
		"Frappe's own email footer is off (OrbiTutor's emails have their own)",
		"System Settings: tick Disable Standard Email Footer, or emails end with two footers",
		kind="note",
	)
	outgoing = frappe.db.exists("Email Account", {"enable_outgoing": 1, "default_outgoing": 1})
	r.check(outgoing, "There's an outgoing email account", "No default outgoing email account: no sign-in or reset emails will go out")
