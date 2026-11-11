import frappe


@frappe.whitelist()
def mark_all_as_read():
	for r in frappe.DB.match("Notification Log", {"for_user": frappe.session.user, "read": 0}):
		r["read"] = 1


@frappe.whitelist()
def mark_as_read(docname):
	for r in frappe.DB.match("Notification Log", {"for_user": frappe.session.user, "name": docname}):
		r["read"] = 1
