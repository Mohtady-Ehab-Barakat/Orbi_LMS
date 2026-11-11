def get_csrf_token():
	return "csrf-test-token"


def clear_sessions(user=None, keep_current=False, force=False):
	"""The server keeps its own table of sessions; this one only notes the call."""
	import frappe

	frappe.DB.insert("Session Clear", {"user": user, "keep_current": keep_current})
