"""Frappe Learning v16's helpers, as OrbiTutor relies on them, over the stand-in database."""
import json

import frappe
from frappe import _


def guest_access_allowed():
	if frappe.session.user != "Guest":
		return True
	return bool(frappe.DB.single("LMS Settings").get("allow_guest_access"))


def _chapters(course):
	return sorted(frappe.DB.match("Chapter Reference", {"parent": course}), key=lambda r: r["idx"])


def _lesson_refs(chapter):
	return sorted(frappe.DB.match("Lesson Reference", {"parent": chapter}), key=lambda r: r["idx"])


def ordered_lessons(course):
	out = []
	for c in _chapters(course):
		for l in _lesson_refs(c["chapter"]):
			out.append((c, l))
	return out


def get_lesson_index(lesson_name):
	ref = frappe.db.get_value("Lesson Reference", {"lesson": lesson_name}, ["idx", "parent"], as_dict=True)
	if not ref:
		return "1-1"
	chapter = frappe.db.get_value("Chapter Reference", {"chapter": ref.parent}, ["idx"], as_dict=True)
	if not chapter:
		return "1-1"
	return f"{chapter.idx}-{ref.idx}"


def get_lesson_icon(body, content):
	try:
		blocks = json.loads(content or "{}").get("blocks", [])
	except ValueError:
		blocks = []
	types = [b.get("type") for b in blocks]
	for b in blocks:
		if b.get("type") == "embed" and "youtube" in json.dumps(b.get("data", {})):
			return "icon-youtube"
		if b.get("type") == "upload" and str(b.get("data", {}).get("file_type", "")).lower() in ("mp4", "webm", "video"):
			return "icon-youtube"
	if "quiz" in types:
		return "icon-quiz"
	if "assignment" in types:
		return "icon-assignment"
	if "program" in types:
		return "icon-code"
	return "icon-list"


def is_instructor(course, user=None):
	user = user or frappe.session.user
	return bool(frappe.DB.match("Course Instructor", {"parent": course, "instructor": user}))


def can_view_course(course):
	published = frappe.db.get_value("LMS Course", course, "published")
	return bool(published) or is_instructor(course) or "Moderator" in frappe.get_roles()


def get_membership(course, member=None):
	member = member or frappe.session.user
	row = frappe.db.get_value(
		"LMS Enrollment",
		{"member": member, "course": course},
		["name", "current_lesson", "progress", "member", "course", "purchased_certificate", "certificate"],
		as_dict=True,
	)
	return row or False


def get_public_instructors(doctype, docname):
	users = [r["instructor"] for r in frappe.DB.match("Course Instructor", {"parent": docname})]
	return frappe.get_all("User", {"name": ["in", users]}, ["username", "full_name", "user_image", "first_name", "bio"])


def can_access_topic(doctype, docname):
	course = frappe.db.get_value("Course Lesson", docname, "course")
	return bool(get_membership(course)) or is_instructor(course) or "Moderator" in frappe.get_roles()


def get_assessments(batch):
	out = []
	for a in frappe.DB.match("LMS Assessment", {"parent": batch}):
		done = frappe.DB.match("LMS Assessment Done", {"member": frappe.session.user, "assessment": a["assessment_name"]})
		out.append(
			frappe._dict(
				name=a["name"],
				assessment_type=a["assessment_type"],
				assessment_name=a["assessment_name"],
				title=a["title"],
				completed=bool(done),
			)
		)
	return out


def completed_lessons(course, member=None):
	member = member or frappe.session.user
	return {r["lesson"] for r in frappe.DB.match("LMS Course Progress", {"member": member, "course": course, "status": "Complete"})}


def get_course_outline(course, progress=False):
	if not isinstance(course, str):
		frappe.throw(_("Course must be a string."))
	if not guest_access_allowed() or not can_view_course(course):
		return []
	from lms.lms.permissions import _locked

	done = completed_lessons(course) if progress else set()
	locked = _locked(course) if progress else set()
	out = []
	for c in _chapters(course):
		ch = frappe.db.get_value("Course Chapter", c["chapter"], ["name", "title"], as_dict=True)
		lessons = []
		for l in _lesson_refs(c["chapter"]):
			row = frappe.db.get_value("Course Lesson", l["lesson"], ["name", "title", "include_in_preview", "body", "content", "course"], as_dict=True)
			lesson = frappe._dict(
				name=row.name,
				title=row.title,
				include_in_preview=row.include_in_preview or 0,
				icon=get_lesson_icon(row.body, row.content),
				number=f"{c['idx']}-{l['idx']}",
			)
			if progress:
				lesson.is_complete = row.name in done
				if frappe.DB.single("LMS Settings").get("enforce_course_order"):
					lesson.locked = 1 if row.name in locked else 0
			lessons.append(lesson)
		out.append(frappe._dict(name=ch.name, title=ch.title, idx=c["idx"], is_scorm_package=0, lessons=lessons))
	return out


def get_lesson(course, chapter, lesson):
	from lms.lms.permissions import get_lesson_gate

	if not guest_access_allowed() or not can_view_course(course):
		return {}
	refs = [c for c in _chapters(course) if c["idx"] == int(chapter)]
	ls = [l for l in _lesson_refs(refs[0]["chapter"]) if l["idx"] == int(lesson)] if refs else []
	if not ls:
		_locked_set, resume = get_lesson_gate(course)
		if not resume:
			return {}
		return {"locked": 1, "not_found": 1, "title": "Lesson not found", "course_title": frappe.db.get_value("LMS Course", course, "title"), "redirect_to": get_lesson_index(resume)}
	name = ls[0]["lesson"]
	d = frappe._dict(frappe.DB.match("Course Lesson", name)[0])
	locked, resume = get_lesson_gate(course)
	if name in locked:
		return {"locked": 1, "title": d.title, "course_title": frappe.db.get_value("LMS Course", course, "title"), "redirect_to": get_lesson_index(resume) if resume else "1-1"}
	if d.is_scorm_package:
		return {"is_scorm_package": True, "chapter_name": refs[0]["chapter"]}
	membership = get_membership(course)
	course_title = frappe.db.get_value("LMS Course", course, "title")
	if not (membership or d.include_in_preview or is_instructor(course) or "Moderator" in frappe.get_roles()):
		return {"no_preview": 1, "title": d.title, "course_title": course_title, "disable_self_learning": 0}
	order = [f"{c['idx']}.{l['idx']}" for c, l in ordered_lessons(course)]
	here = order.index(f"{int(chapter)}.{int(lesson)}")
	out = frappe._dict(
		name=d.name,
		title=d.title,
		include_in_preview=d.include_in_preview,
		body=d.body,
		content=d.content,
		course=course,
		chapter_title=frappe.db.get_value("Course Chapter", refs[0]["chapter"], "title"),
		next=order[here + 1] if here + 1 < len(order) else None,
		prev=order[here - 1] if here > 0 else None,
		progress=frappe.db.exists("LMS Course Progress", {"course": course, "member": frappe.session.user, "lesson": name, "status": "Complete"}) if frappe.session.user != "Guest" else 0,
		membership=membership,
		icon=get_lesson_icon(d.body, d.content),
		instructors=get_public_instructors("LMS Course", course),
		course_title=course_title,
		paid_certificate=0,
		disable_self_learning=0,
		videos=[],
	)
	return out


# ---- staff ----
def can_modify_course(course):
	roles = frappe.get_roles()
	return "Moderator" in roles or ("Course Creator" in roles and is_instructor(course))


def can_modify_batch(batch):
	roles = frappe.get_roles()
	if "Moderator" in roles:
		return True
	return "Course Creator" in roles and bool(frappe.DB.match("Course Instructor", {"parent": batch, "parenttype": "LMS Batch", "instructor": frappe.session.user}))


OPTION_FIELDS = [f"option_{i}" for i in range(1, 11)]


def get_quiz_with_questions(quiz):
	doc = frappe.get_doc("LMS Quiz", quiz)
	q = doc.as_dict()
	q["questions"] = [dict(r) for r in doc.questions]
	names = [r["question"] for r in q["questions"]]
	fields = ["name", "question", "type", "multiple", *OPTION_FIELDS]
	if q.get("show_answers") or {"Moderator", "Course Creator"} & set(frappe.get_roles()):
		fields += [f"explanation_{i}" for i in range(1, 11)]
	rows = frappe.get_all("LMS Question", [["name", "in", names]], fields)
	return {"quiz": q, "questions_by_name": {r["name"]: r for r in rows}}


def get_assignment(name):
	return frappe.get_doc("LMS Assignment", name).as_dict()
