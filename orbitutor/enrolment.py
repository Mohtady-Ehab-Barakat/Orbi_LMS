"""Students don't put themselves in a course: an instructor does.

Anyone can make an account and look around, but a course enrolment has to come from staff:
a site administrator, a Moderator, or one of the course's instructors (Frappe Learning's own
test, can_author_course), or through a batch the student was added to. Frappe Learning already
keeps batches to staff unless a batch allows self-enrolment; this does the same for courses,
whatever each course's "Disable Self Learning" says.
"""

import frappe
from frappe import _


def before_insert_enrolment(doc, method=None):
	if frappe.flags.in_install or frappe.flags.in_migrate or frappe.flags.in_patch or frappe.flags.in_import:
		return
	user = frappe.session.user
	if user == "Administrator" or doc.member != user:
		# staff enrolling someone; Frappe Learning checks they're allowed to
		return
	if doc.flags.via_batch_enrollment:
		# the course comes with a batch they were added to
		return
	if doc.get("enrollment_from_batch") and frappe.db.exists(
		"LMS Batch Enrollment", {"batch": doc.enrollment_from_batch, "member": doc.member}
	):
		return

	from lms.lms.permissions import can_author_course

	if can_author_course(doc.course, user=user):
		return
	frappe.throw(
		_("Your instructor adds you to a course. Ask to join it from the course page and we'll be in touch."),
		frappe.PermissionError,
		title=_("Ask to join"),
	)
