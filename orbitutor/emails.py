import frappe
from frappe import _


def send_assignment_marked(doc, method=None):
	"""Email the student when their assignment is set to Pass or Fail.

	Frappe Learning only makes an in-app notification for this (an "Alert"), and Frappe never
	emails alerts, so without this nothing reaches their inbox.
	"""
	before = doc.get_doc_before_save()
	if doc.status not in ("Pass", "Fail") or (before and before.status == doc.status):
		return
	passed = doc.status == "Pass"
	frappe.sendmail(
		recipients=doc.member,
		subject=_("{0}: passed").format(doc.assignment_title)
		if passed
		else _("{0} needs another go").format(doc.assignment_title),
		template="assignment_marked",
		args={
			"student_name": doc.member_name,
			"assignment_title": doc.assignment_title,
			"course_title": frappe.db.get_value("LMS Course", doc.course, "title") or "",
			"status": doc.status,
			"comments": doc.comments,
			"link": f"/assignment/{doc.assignment}",
		},
	)
