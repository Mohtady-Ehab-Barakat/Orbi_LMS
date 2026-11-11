import frappe


def _locked(course):
	from lms.lms.utils import completed_lessons, ordered_lessons

	if not frappe.DB.single("LMS Settings").get("enforce_course_order") or frappe.session.user == "Guest":
		return set()
	names = [l["lesson"] for _c, l in ordered_lessons(course)]
	done = completed_lessons(course)
	locked, open_one = set(), False
	for n in names:
		if n in done:
			continue
		if open_one:
			locked.add(n)
		open_one = True
	return locked


def get_lesson_gate(course):
	from lms.lms.utils import completed_lessons, get_membership, ordered_lessons

	if frappe.session.user == "Guest" or not get_membership(course):
		return set(), None
	names = [l["lesson"] for _c, l in ordered_lessons(course)]
	if not names:
		return set(), None
	done = completed_lessons(course)
	locked = _locked(course)
	resume = next((n for n in names if n not in done), names[0])
	pointer = frappe.db.get_value("LMS Enrollment", {"course": course, "member": frappe.session.user}, "current_lesson")
	if pointer and pointer not in locked:
		resume = pointer
	return locked, resume


def can_author_course(course, *, user=None):
	user = user or frappe.session.user
	if user == "Administrator" or "Moderator" in frappe.get_roles(user) or "System Manager" in frappe.get_roles(user):
		return True
	return bool(frappe.DB.match("Course Instructor", {"parent": course, "instructor": user}))
