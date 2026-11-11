import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

# What OrbiTutor shows on a course page that Frappe Learning doesn't keep. Staff fill these in
# on the course in the desk (/desk/lms-course/<name>), in the "OrbiTutor app" section.
TRACKS = "\nPhysics and space\nCode and AI\nEngineering and making\nCompetitions"
COURSE_FIELDS = {
	"LMS Course": [
		{
			"fieldname": "orbitutor_section",
			"fieldtype": "Section Break",
			"label": "OrbiTutor app",
			"insert_after": "notification_sent",
			"collapsible": 1,
		},
		{
			"fieldname": "orbitutor_track",
			"fieldtype": "Select",
			"label": "Track",
			"options": TRACKS,
			"insert_after": "orbitutor_section",
			"description": "Which of the four tracks the course is listed under.",
		},
		{
			"fieldname": "orbitutor_level",
			"fieldtype": "Data",
			"label": "Level",
			"insert_after": "orbitutor_track",
			"description": 'For example "No experience needed".',
		},
		{
			"fieldname": "orbitutor_length",
			"fieldtype": "Data",
			"label": "Length",
			"insert_after": "orbitutor_level",
			"description": 'For example "10 weeks, one class a week".',
		},
		{
			"fieldname": "orbitutor_project",
			"fieldtype": "Data",
			"label": "What they build",
			"insert_after": "orbitutor_length",
			"description": 'The project at the end, for example "Ultrasonic Radar".',
		},
		{
			"fieldname": "orbitutor_project_url",
			"fieldtype": "Data",
			"options": "URL",
			"label": "Project page on the website",
			"insert_after": "orbitutor_project",
		},
		{
			"fieldname": "orbitutor_column",
			"fieldtype": "Column Break",
			"insert_after": "orbitutor_project_url",
		},
		{
			"fieldname": "orbitutor_outcomes",
			"fieldtype": "Small Text",
			"label": "What they'll learn",
			"insert_after": "orbitutor_column",
			"description": "One per line.",
		},
		{
			"fieldname": "orbitutor_kit",
			"fieldtype": "Small Text",
			"label": "Kit needed",
			"insert_after": "orbitutor_outcomes",
			"description": "One per line. Add a note after a dash: Arduino Nano - we lend you one.",
		},
	],
	# Marking open quiz answers in Teach: a quiz attempt stays in Marking until this is ticked.
	"LMS Quiz Submission": [
		{
			"fieldname": "orbitutor_reviewed",
			"fieldtype": "Check",
			"label": "Marked in OrbiTutor",
			"insert_after": "percentage",
			"read_only": 1,
		},
	],
}

# Old Frappe Learning sites send "/" to these through Portal Settings, which beats an app's home_page.
LMS_HOME_PAGES = {"courses", "users", "lms", "lms/courses"}


def after_migrate():
	create_custom_fields(COURSE_FIELDS, update=True)
	take_home_page()


def take_home_page():
	home = (frappe.db.get_single_value("Portal Settings", "default_portal_home") or "").strip("/")
	if home in LMS_HOME_PAGES:
		frappe.db.set_single_value("Portal Settings", "default_portal_home", "")
		print(f"OrbiTutor: cleared Portal Settings' home page ({home}), so / opens OrbiTutor's Home.")
	if frappe.db.get_single_value("System Settings", "default_app") == "lms":
		print(
			"OrbiTutor: System Settings' default app is Frappe Learning. Everyone goes to OrbiTutor after "
			"signing in, and /lms opens the matching OrbiTutor page."
		)
