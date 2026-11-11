import frappe
from frappe import _


@frappe.whitelist()
def save_progress(lesson, course=None, scorm_details=None):
	from lms.lms.permissions import _locked
	from lms.lms.utils import completed_lessons, ordered_lessons

	lesson_course = frappe.db.get_value("Course Lesson", lesson, "course")
	if not lesson_course:
		frappe.throw(_("Invalid lesson."))
	if course and course != lesson_course:
		frappe.throw(_("This lesson does not belong to the course."))
	course = lesson_course
	member = frappe.session.user
	enrolment = frappe.DB.match("LMS Enrollment", {"course": course, "member": member})
	if not enrolment:
		return 0
	if lesson in _locked(course):
		frappe.throw(_("Complete the previous lesson before marking this one as done."), frappe.PermissionError)
	content = frappe.db.get_value("Course Lesson", lesson, "content") or ""
	needs_quiz = '"type": "quiz"' in content or '"type":"quiz"' in content
	passed = frappe.DB.match("LMS Quiz Passed", {"member": member, "lesson": lesson})
	if not frappe.DB.match("LMS Course Progress", {"lesson": lesson, "member": member}) and (not needs_quiz or passed):
		frappe.DB.insert("LMS Course Progress", {"lesson": lesson, "member": member, "course": course, "status": "Complete"})
	names = [l["lesson"] for _c, l in ordered_lessons(course)]
	done = completed_lessons(course)
	progress = round(len([n for n in names if n in done]) * 100 / len(names), 2) if names else 0
	nxt = next((n for n in names if n not in done), lesson)
	enrolment[0].update(progress=progress, current_lesson=nxt)
	return progress
