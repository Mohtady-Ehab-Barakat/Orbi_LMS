import frappe

STAFF_ROLES = {"Moderator", "Course Creator", "Batch Evaluator"}


def on_login(login_manager):
	"""Where people land after signing in: students on OrbiTutor's Home, staff in Teach.

	Runs after Frappe Learning's own on_login (apps run in install order), so this has the
	last word over its "/lms". Site administrators without a Frappe Learning role keep what
	Frappe chose for them (the desk).
	"""
	user = getattr(login_manager, "user", None) or frappe.session.user
	if frappe.db.get_value("User", user, "user_type") == "Website User":
		frappe.local.response["home_page"] = "/"
	elif STAFF_ROLES & set(frappe.get_roles(user)):
		frappe.local.response["home_page"] = "/teach"
