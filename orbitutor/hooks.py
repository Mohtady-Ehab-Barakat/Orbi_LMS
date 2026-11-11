from . import __version__ as app_version  # noqa: F401

app_name = "orbitutor"
app_title = "OrbiTutor"
app_publisher = "OrbitCore Sdn. Bhd."
app_description = "OrbiTutor: OrbitCore's classes, for students and staff"
app_email = "orbitutor@orbit-core.com"
app_license = "Proprietary"

required_apps = ["frappe/lms"]

# ---- The student app ----
# Every OrbiTutor address is served by one page, www/_orbitutor.html, and the app draws the
# rest in the browser. Frappe Learning's own screens at /lms are closed: every /lms address is
# sent to the matching OrbiTutor page (below). Frappe Learning still redirects /courses and
# /batches to /lms before any app can step in, so OrbiTutor's addresses are
# singular: /course/<name>, /batch/<name>. Frappe's own rule sends /profile to its account page,
# and the first rule for an address wins, so a student's own profile is /my-profile.
APP_ROUTES = [
	"/login",
	"/signup",
	"/update-password",
	"/welcome",
	"/catalogue",
	"/my-courses",
	"/course/<course>",
	"/course/<course>/<path:rest>",
	"/schedule",
	"/batch/<batch>",
	"/batch/<batch>/<path:rest>",
	"/certificates",
	"/certificate/<certificate>",
	"/my-profile",
	"/profile/<username>",
	"/settings",
	"/settings/<section>",
	"/notifications",
	"/search",
	"/assignment/<assignment>",
	"/quiz/<quiz>",
	"/exercise/<exercise>",
	# the Teach area, for instructors, evaluators and moderators
	"/teach",
	"/teach/<path:rest>",
]
website_route_rules = [{"from_route": route, "to_route": "_orbitutor"} for route in APP_ROUTES] + [
	# OrbiTutor's sign-in page takes /login. Frappe's own stays reachable here for staff who use
	# two-step sign-in, which OrbiTutor's page doesn't do yet.
	{"from_route": "/staff-login", "to_route": "login"},
]
website_redirects = [
	{"source": "_orbitutor", "target": "/"},
	{"source": "/profile", "target": "/my-profile"},
]

# Frappe Learning's own screens are closed: each /lms address (in its emails, notifications and
# old bookmarks) goes to the OrbiTutor page for the same thing. 302, so browsers don't keep it.
LMS_REDIRECTS = [
	(r"lms/courses/([^/]+)/learn/(\d+)[.-](\d+)", r"/course/\1/learn/\2-\3"),
	(r"lms/courses/new(/.*)?", "/teach/courses"),
	(r"lms/courses/([^/]+)(/.*)?", r"/course/\1"),
	(r"lms/courses/?", "/catalogue"),
	(r"lms/batches/new(/.*)?", "/teach/batches"),
	(r"lms/batches/details/([^/]+)(/.*)?", r"/batch/\1"),
	(r"lms/batches/([^/]+)(/.*)?", r"/batch/\1"),
	(r"lms/batches/?", "/schedule"),
	(r"lms/user/[^/]+/certificates/?", "/certificates"),
	(r"lms/user/[^/]+/(slots|schedule)/?", "/teach/evaluations"),
	(r"lms/user/([^/]+)(/.*)?", r"/profile/\1"),
	(r"lms/you/?", "/my-profile"),
	(r"lms/quiz/([^/]+)/?", r"/quiz/\1"),
	(r"lms/quiz-submission/([^/]+)/?", r"/teach/marking/quiz/\1"),
	(r"lms/quizzes/edit/([^/]+)/?", r"/teach/quiz/\1"),
	(r"lms/quizzes/(new|submissions|questions)/?", "/teach/library"),
	(r"lms/quizzes/([^/]+)(/.*)?", r"/teach/quiz/\1"),
	(r"lms/(quizzes|quiz-submissions)(/.*)?", "/teach/library"),
	(r"lms/assignment-submission/([^/]+)/([^/]+)/?", r"/assignment/\1?submission=\2"),
	(r"lms/assignment-submissions/?", "/teach/marking"),
	(r"lms/assignments/(new|submissions)/?", "/teach/library?kind=assignment"),
	(r"lms/assignments/edit/([^/]+)/?", r"/teach/assignment/\1"),
	(r"lms/assignments/([^/]+)/?", r"/teach/assignment/\1"),
	(r"lms/assignments/?", "/teach/library?kind=assignment"),
	(r"lms/programming-exercises/([^/]+)/submission/.*", r"/exercise/\1"),
	(r"lms/programming-exercise-submission/([^/]+)/.*", r"/exercise/\1"),
	(r"lms/programming-exercises(/.*)?", "/teach/library?kind=program"),
	(r"lms/statistics/?", "/teach/statistics"),
	(r"lms/certified-participants/?", "/teach/certificates"),
	(r"lms/settings(/.*)?", "/teach/settings"),
	(r"lms/data-import(/.*)?", "/desk/data-import"),
	(r"lms(/.*)?", "/"),
]
website_redirects += [{"source": source, "target": target, "redirect_http_status": 302} for source, target in LMS_REDIRECTS]

# "/" is the app's Home. (Portal Settings' home page would win over this, so install clears
# Frappe Learning's old "/courses" there.)
home_page = "_orbitutor"

# After signing in, students go to Home and staff to Teach, never to Frappe Learning's /lms.
on_login = "orbitutor.auth.on_login"

# Custom fields on LMS Course, and taking over the home page: on install and every migrate.
after_install = "orbitutor.install.after_migrate"
after_migrate = "orbitutor.install.after_migrate"

# ---- Emails ----
# templates/emails/ here replaces Frappe's and Frappe Learning's layout and wording, because
# Frappe looks for templates in the most recently installed app first.
doc_events = {
	"LMS Assignment Submission": {
		"on_update": "orbitutor.emails.send_assignment_marked",
	},
	# students can sign up, but only staff put them in a course
	"LMS Enrollment": {
		"before_insert": "orbitutor.enrolment.before_insert_enrolment",
	},
}
