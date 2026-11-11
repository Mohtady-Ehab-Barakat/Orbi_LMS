"""The Teach area: what instructors, evaluators and moderators see and change.

Every method checks who is asking. Moderators (and System Managers) see everything; an
instructor sees the courses and batches they teach; an evaluator their evaluations. Changes
go through Frappe's documents (or Frappe Learning's own methods) with the caller's permissions,
so Frappe Learning's validations still run.
"""

import json
from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import add_days, cint, cstr, flt, get_datetime, getdate, now_datetime, nowdate, strip_html, today
from frappe.utils.html_utils import sanitize_html

from orbitutor.api import TRACK_IDS, course_rows, lesson_kind, system_timezone, zoned
from orbitutor.learn import ASSIGNMENT_TYPES, MARKING, iso, person, system_iso, text, time_text

TRACKS = {v: k for k, v in TRACK_IDS.items()}
COURSE_EDIT_FIELDS = {
	"title": "Data", "short_introduction": "Data", "description": "Html", "image": "File", "video_link": "Data", "category": "Data",
	"published": "Check", "upcoming": "Check", "featured": "Check", "enable_certification": "Check", "disable_self_learning": "Check",
	"orbitutor_track": "Data", "orbitutor_level": "Data", "orbitutor_length": "Data", "orbitutor_project": "Data",
	"orbitutor_project_url": "Data", "orbitutor_outcomes": "Text", "orbitutor_kit": "Text",
}
BATCH_EDIT_FIELDS = {
	"title": "Data", "description": "Data", "batch_details": "Html", "start_date": "Date", "end_date": "Date", "start_time": "Time",
	"end_time": "Time", "timezone": "Data", "seat_count": "Int", "medium": "Data", "published": "Check", "certification": "Check",
	"evaluation": "Check", "evaluation_end_date": "Date",
}
ROLES = ["LMS Student", "Course Creator", "Batch Evaluator", "Moderator"]
KIND_DOCTYPE = {"quiz": "LMS Quiz", "assignment": "LMS Assignment", "program": "LMS Programming Exercise", "exercise": "LMS Programming Exercise"}


# ---- who is asking ----


def roles() -> dict:
	r = set(frappe.get_roles())
	moderator = bool(r & {"Moderator", "System Manager"}) or frappe.session.user == "Administrator"
	return {"moderator": moderator, "instructor": moderator or "Course Creator" in r, "evaluator": moderator or "Batch Evaluator" in r}


def require(*kinds):
	if frappe.session.user == "Guest":
		raise frappe.PermissionError(_("Sign in to see this."))
	r = roles()
	if not (r["moderator"] or any(r.get(k) for k in kinds)):
		raise frappe.PermissionError(_("This is for staff."))
	return r


def taught_courses() -> list | None:
	"""Courses this person teaches; None means every course (a moderator)."""
	if roles()["moderator"]:
		return None
	return frappe.get_all("Course Instructor", {"instructor": frappe.session.user, "parenttype": "LMS Course"}, pluck="parent")


def taught_batches() -> list | None:
	if roles()["moderator"]:
		return None
	return frappe.get_all("Course Instructor", {"instructor": frappe.session.user, "parenttype": "LMS Batch"}, pluck="parent")


def check_course(course: str):
	from lms.lms.utils import can_modify_course

	if not frappe.db.exists("LMS Course", course):
		raise frappe.DoesNotExistError(_("We can't find that course."))
	if not can_modify_course(course):
		raise frappe.PermissionError(_("You don't teach this course."))


def check_batch(batch: str):
	from lms.lms.utils import can_modify_batch

	if not frappe.db.exists("LMS Batch", batch):
		raise frappe.DoesNotExistError(_("We can't find that batch."))
	if not can_modify_batch(batch):
		raise frappe.PermissionError(_("You don't teach this batch."))


def scope_students(batches: list | None) -> set | None:
	if batches is None:
		return None
	if not batches:
		return set()
	return set(frappe.get_all("LMS Batch Enrollment", {"batch": ["in", batches]}, pluck="member"))


def in_scope(row, courses, students) -> bool:
	if courses is None:
		return True
	return (row.get("course") in courses) or (students is not None and row.get("member") in students)


def ago(value) -> tuple[str, int]:
	if not value:
		return "", 0
	days = (getdate(today()) - getdate(value)).days
	if days <= 0:
		return "Today", 0
	if days == 1:
		return "Yesterday", 1
	return f"{days} days", days


def parse(value, name):
	if isinstance(value, str):
		try:
			value = json.loads(value)
		except ValueError:
			frappe.throw(_("{0} isn't valid.").format(name))
	return value


def clean_values(values, allowed: dict) -> dict:
	values = parse(values, "Values") or {}
	if not isinstance(values, dict):
		frappe.throw(_("Values aren't valid."))
	out = {}
	for k, v in values.items():
		if k not in allowed:
			continue
		kind = allowed[k]
		if kind == "Check":
			out[k] = 1 if cint(v) else 0
		elif kind == "Int":
			out[k] = cint(v)
		elif kind in ("Date", "Time"):
			out[k] = v or None
		else:
			out[k] = v if v is None else cstr(v)
	return out


# ---- the frame and Today ----


@frappe.whitelist()
def context(path: str | None = None):
	"""Who this is in the Teach area, and the counts beside its pages. (`path` only keys the cache.)"""
	r = require("instructor", "evaluator")
	return {"roles": r, "counts": counts()}


def counts() -> dict:
	r = roles()
	n = len(waiting_work()) if r["instructor"] else 0
	requests = frappe.db.count("OrbiTutor Join Request", {"status": "New"}) if r["instructor"] else 0
	return {"marking": n, "requests": requests}


def waiting_work() -> list:
	courses, batches = taught_courses(), taught_batches()
	students = scope_students(batches)
	out = []
	for s in frappe.get_all(
		"LMS Assignment Submission",
		{"status": "Not Graded"},
		["name", "assignment", "assignment_title", "member", "member_name", "course", "lesson", "creation"],
		order_by="creation asc",
	):
		if in_scope(s, courses, students):
			out.append({"id": s.name, "kind": "assignment", "title": s.assignment_title or frappe.db.get_value("LMS Assignment", s.assignment, "title"), "member": s.member, "name": s.member_name, "course": s.course, "at": s.creation})
	open_parents = set(frappe.get_all("LMS Quiz Result", {"question_type": "Open Ended", "parenttype": "LMS Quiz Submission"}, pluck="parent"))
	if open_parents:
		for s in frappe.get_all(
			"LMS Quiz Submission",
			{"name": ["in", list(open_parents)]},
			["name", "quiz", "quiz_title", "member", "member_name", "course", "creation", "orbitutor_reviewed"],
			order_by="creation asc",
		):
			if cint(s.orbitutor_reviewed) or not in_scope(s, courses, students):
				continue
			out.append({"id": s.name, "kind": "quiz", "title": (s.quiz_title or frappe.db.get_value("LMS Quiz", s.quiz, "title")) + ": open answers", "member": s.member, "name": s.member_name, "course": s.course, "at": s.creation})
	out.sort(key=lambda x: get_datetime(x["at"]))
	return out


def batch_titles(names) -> dict:
	return dict(frappe.get_all("LMS Batch", {"name": ["in", list(names)]}, ["name", "title"], as_list=True)) if names else {}


@frappe.whitelist()
def today_page():
	r = require("instructor", "evaluator")
	batches = taught_batches()
	filters = {"date": today()}
	if batches is not None:
		filters["batch_name"] = ["in", batches or ["-"]]
	classes = frappe.get_all("LMS Live Class", filters, ["name", "title", "date", "time", "duration", "join_url", "start_url", "batch_name", "timezone"], order_by="time asc")
	titles = batch_titles({c.batch_name for c in classes})
	work = waiting_work() if r["instructor"] else []
	courses = course_rows(list({w["course"] for w in work if w["course"]}))
	evals = frappe.get_all(
		"LMS Certificate Request",
		{"evaluator": frappe.session.user, "status": "Upcoming", "date": ["between", [today(), add_days(today(), 7)]]},
		["name"],
	) if r["evaluator"] else []
	requests = frappe.get_all("OrbiTutor Join Request", {"status": "New"}, ["name", "full_name", "course", "for_whom", "creation"], order_by="creation desc", limit=5) if r["instructor"] else []
	soon = frappe.get_all(
		"LMS Batch",
		{"start_date": ["between", [today(), add_days(today(), 30)]], **({"name": ["in", batches or ["-"]]} if batches is not None else {})},
		["name", "title", "start_date", "seat_count"],
		order_by="start_date asc",
		limit=4,
	)
	user = frappe.db.get_value("User", frappe.session.user, ["first_name", "full_name"], as_dict=True)
	return {
		"first_name": user.first_name or (user.full_name or "").split(" ")[0],
		"roles": r,
		"stats": {"to_mark": len(work), "classes_today": len(classes), "evaluations": len(evals), "requests": frappe.db.count("OrbiTutor Join Request", {"status": "New"}) if r["instructor"] else 0},
		"next_class": time_text(classes[0].time) if classes else None,
		"oldest": ago(work[0]["at"])[0] if work else None,
		"classes": [
			{"id": c.name, "title": c.title, "time": time_text(c.time), "minutes": cint(c.duration) or 60, "batch": titles.get(c.batch_name), "batch_href": f"/teach/batch/{c.batch_name}",
			 "start_url": c.start_url or c.join_url, "students": frappe.db.count("LMS Batch Enrollment", {"batch": c.batch_name})}
			for c in classes
		],
		"work": [dict(w, waited=ago(w["at"])[0], age=ago(w["at"])[1], course_title=courses[w["course"]].title if w["course"] in courses else None, href=f"/teach/marking/{w['kind']}/{w['id']}") for w in work[:5]],
		"requests": [{"name": q.name, "who": q.full_name, "for_whom": q.for_whom, "course": frappe.db.get_value("LMS Course", q.course, "title"), "asked": ago(q.creation)[0]} for q in requests],
		"starting": [
			{"name": b.name, "title": b.title, "starts": b.start_date, "seats": cint(b.seat_count), "taken": frappe.db.count("LMS Batch Enrollment", {"batch": b.name}), "href": f"/teach/batch/{b.name}"}
			for b in soon
		],
	}


# ---- marking ----


@frappe.whitelist()
def marking(tab: str = "waiting"):
	require("instructor")
	if tab == "marked":
		courses, batches = taught_courses(), taught_batches()
		students = scope_students(batches)
		rows = frappe.get_all(
			"LMS Assignment Submission",
			{"status": ["in", ["Pass", "Fail"]], "modified": [">=", add_days(today(), -7)]},
			["name", "assignment_title", "member_name", "member", "course", "status", "modified", "evaluator"],
			order_by="modified desc",
			limit=200,
		)
		items = [
			{"id": s.name, "kind": "assignment", "title": s.assignment_title, "name": s.member_name, "course": s.course, "result": "Passed" if s.status == "Pass" else "Not passed",
			 "when": ago(s.modified)[0], "href": f"/teach/marking/assignment/{s.name}"}
			for s in rows if in_scope(s, courses, students)
		]
		return {"items": items, "counts": counts()}
	work = waiting_work()
	crow = course_rows(list({w["course"] for w in work if w["course"]}))
	batch_of = {}
	members = list({w["member"] for w in work})
	if members:
		for e in frappe.get_all("LMS Batch Enrollment", {"member": ["in", members]}, ["member", "batch"], order_by="creation desc"):
			batch_of.setdefault(e.member, e.batch)
	titles = batch_titles(set(batch_of.values()))
	items = []
	for w in work:
		waited, age = ago(w["at"])
		items.append(
			{
				"id": w["id"], "kind": w["kind"], "title": w["title"], "name": w["name"], "course": crow[w["course"]].title if w["course"] in crow else None,
				"batch": titles.get(batch_of.get(w["member"])), "waited": waited, "age": age, "href": f"/teach/marking/{w['kind']}/{w['id']}",
			}
		)
	return {"items": items, "counts": counts()}


def queue_neighbours(kind: str, name: str):
	ids = [(w["kind"], w["id"]) for w in waiting_work()]
	if (kind, name) not in ids:
		return {"index": None, "total": len(ids), "next": f"/teach/marking/{ids[0][0]}/{ids[0][1]}" if ids else None, "prev": None}
	i = ids.index((kind, name))
	nxt = ids[i + 1] if i + 1 < len(ids) else None
	prv = ids[i - 1] if i > 0 else None
	return {"index": i + 1, "total": len(ids), "next": f"/teach/marking/{nxt[0]}/{nxt[1]}" if nxt else None, "prev": f"/teach/marking/{prv[0]}/{prv[1]}" if prv else None}


def check_submission_scope(row):
	courses, batches = taught_courses(), taught_batches()
	if not in_scope(row, courses, scope_students(batches)):
		raise frappe.PermissionError(_("This isn't from a course or batch you teach."))


@frappe.whitelist()
def assignment_review(submission: str):
	require("instructor")
	s = frappe.db.get_value(
		"LMS Assignment Submission",
		text(submission, "Submission"),
		["name", "assignment", "assignment_title", "member", "member_name", "course", "lesson", "status", "comments", "assignment_attachment", "answer", "type", "creation", "evaluator"],
		as_dict=True,
	)
	if not s:
		raise frappe.DoesNotExistError(_("We can't find that work."))
	check_submission_scope(s)
	a = frappe.db.get_value("LMS Assignment", s.assignment, ["title", "question", "answer", "type"], as_dict=True) or frappe._dict()
	kind = ASSIGNMENT_TYPES.get(a.type or s.type, "document")
	url = s.assignment_attachment
	view = "image" if kind == "image" else "pdf" if kind == "pdf" else "url" if kind == "link" else "text" if kind == "text" else "document"
	from orbitutor.learn import lesson_href

	lesson = lesson_href(s.lesson)
	return {
		"name": s.name,
		"title": s.assignment_title or a.title,
		"student": person(s.member) or {"name": s.member_name},
		"student_first": (s.member_name or "").split(" ")[0],
		"meta": " · ".join(x for x in [frappe.db.get_value("LMS Course", s.course, "title") if s.course else None, lesson["title"] if lesson else None] if x),
		"submitted": "handed in " + ago(s.creation)[0].lower() + (" ago" if ago(s.creation)[1] > 1 else ""),
		"view": view,
		"url": url,
		"link": strip_html(s.answer or "").strip() if view == "url" else None,
		"text": s.answer if view == "text" else None,
		"question": a.question,
		"answer_key": a.answer,
		"status": {"Pass": "passed", "Fail": "failed"}.get(s.status),
		"comment": s.comments or "",
		"position": queue_neighbours("assignment", s.name),
	}


@frappe.whitelist(methods=["POST"])
def mark_assignment(submission: str, status: str, comment: str | None = None):
	require("instructor")
	if status not in ("passed", "failed"):
		frappe.throw(_("Choose Passed or Not passed."))
	doc = frappe.get_doc("LMS Assignment Submission", text(submission, "Submission"))
	check_submission_scope(doc.as_dict())
	doc.status = "Pass" if status == "passed" else "Fail"
	# the feedback box is rich text; Frappe cleans Text Editor fields on save too
	doc.comments = sanitize_html(cstr(comment)) if strip_html(cstr(comment)).strip() else ""
	doc.evaluator = frappe.session.user
	doc.save()
	return {"saved": True, "position": queue_neighbours("assignment", doc.name), "counts": counts()}


@frappe.whitelist()
def quiz_submission(submission: str):
	require("instructor")
	s = frappe.db.get_value("LMS Quiz Submission", text(submission, "Submission"), ["name", "quiz", "quiz_title", "member", "member_name", "course", "creation", "passing_percentage", "score", "score_out_of"], as_dict=True)
	if not s:
		raise frappe.DoesNotExistError(_("We can't find that quiz."))
	check_submission_scope(s)
	rows = frappe.get_all("LMS Quiz Result", {"parent": s.name, "parenttype": "LMS Quiz Submission"}, ["name", "question", "question_name", "answer", "is_correct", "marks", "marks_out_of", "question_type"], order_by="idx asc")
	types = {"Choices": "single", "User Input": "typed", "Open Ended": "open"}
	tries = frappe.db.count("LMS Quiz Submission", {"quiz": s.quiz, "member": s.member, "creation": ["<=", s.creation]})
	results = []
	for r in rows:
		open_q = r.question_type == "Open Ended"
		results.append(
			{
				"id": r.name, "type": types.get(r.question_type, "single"), "question": r.question, "answer": strip_html(r.answer or "") if open_q else r.answer,
				"correct": bool(cint(r.is_correct)), "marks": (cint(r.marks) if cint(r.marks) or cint(frappe.db.get_value("LMS Quiz Submission", s.name, "orbitutor_reviewed")) else None) if open_q else cint(r.marks),
				"outOf": cint(r.marks_out_of),
			}
		)
	return {
		"name": s.name, "title": s.quiz_title, "student": person(s.member) or {"name": s.member_name}, "student_first": (s.member_name or "").split(" ")[0],
		"meta": frappe.db.get_value("LMS Course", s.course, "title") if s.course else "", "submitted": f"taken {ago(s.creation)[0].lower()}, try {tries}",
		"pass_percent": cint(s.passing_percentage), "results": results, "position": queue_neighbours("quiz", s.name),
	}


@frappe.whitelist(methods=["POST"])
def mark_quiz(submission: str, marks):
	require("instructor")
	marks = parse(marks, "Marks") or {}
	doc = frappe.get_doc("LMS Quiz Submission", text(submission, "Submission"))
	check_submission_scope(doc.as_dict())
	for i, row in enumerate(doc.result, start=1):
		if row.question_type == "Open Ended" and row.name in marks and marks[row.name] is not None:
			m = cint(marks[row.name])
			if m < 0 or m > cint(row.marks_out_of):
				frappe.throw(_("Question {0} is out of {1} marks.").format(i, cint(row.marks_out_of)))
			row.marks = m
			row.is_correct = 1 if m else 0
	doc.orbitutor_reviewed = 1
	doc.save()
	return {"saved": True, "position": queue_neighbours("quiz", doc.name), "counts": counts()}


# ---- courses ----


def course_list_row(c, students: dict) -> dict:
	return {
		"name": c.name, "title": c.title, "track": TRACK_IDS.get(c.orbitutor_track or ""), "status": "Published" if c.published else "Coming soon" if c.upcoming else "Draft",
		"lessons": cint(c.lessons), "students": students.get(c.name, 0), "changed": ago(c.modified)[0], "changed_sort": ago(c.modified)[1], "href": f"/teach/course/{c.name}",
	}


@frappe.whitelist()
def courses():
	require("instructor")
	mine = taught_courses()
	filters = {} if mine is None else {"name": ["in", mine or ["-"]]}
	rows = frappe.get_all("LMS Course", filters, ["name", "title", "published", "upcoming", "lessons", "modified", "orbitutor_track"], order_by="modified desc")
	students = {}
	for e in frappe.get_all("LMS Enrollment", {"course": ["in", [r.name for r in rows] or ["-"]]}, ["course"]):
		students[e.course] = students.get(e.course, 0) + 1
	return {"courses": [course_list_row(r, students) for r in rows], "can_create": roles()["instructor"]}


def outline_for_editor(course: str) -> list:
	chapters = frappe.get_all("Chapter Reference", {"parent": course}, ["chapter", "idx"], order_by="idx asc")
	out = []
	from lms.lms.utils import get_lesson_index

	for ch in chapters:
		title = frappe.db.get_value("Course Chapter", ch.chapter, "title")
		lessons = []
		for ref in frappe.get_all("Lesson Reference", {"parent": ch.chapter}, ["lesson", "idx"], order_by="idx asc"):
			l = frappe.db.get_value("Course Lesson", ref.lesson, ["name", "title", "body", "content", "include_in_preview"], as_dict=True)
			if not l:
				continue
			kind = lesson_kind(l)
			empty = not (l.content and json.loads(l.content or "{}").get("blocks")) and not l.body
			lessons.append({"id": l.name, "title": l.title, "kind": kind, "preview": bool(l.include_in_preview), "draft": empty, "href": f"/teach/lesson/{l.name}",
			                "meta": {"reading": "Reading", "video": "Video", "quiz": "Quiz", "assignment": "Assignment", "code": "Coding exercise"}.get(kind, "Reading") + (" · empty, not written yet" if empty else "")})
		out.append({"id": ch.chapter, "title": title, "lessons": lessons})
	return out


@frappe.whitelist()
def course_detail(course: str):
	require("instructor")
	course = text(course, "Course")
	check_course(course)
	c = frappe.get_doc("LMS Course", course)
	values = {k: c.get(k) for k in COURSE_EDIT_FIELDS}
	values["orbitutor_track"] = TRACK_IDS.get(c.orbitutor_track or "") or c.orbitutor_track
	return {
		"name": c.name,
		"values": values,
		"instructors": [person(i.instructor) | {"value": i.instructor} for i in c.instructors if person(i.instructor)],
		"outline": outline_for_editor(course),
		"categories": frappe.get_all("LMS Category", pluck="category") if frappe.db.table_exists("LMS Category") else [],
		"students": frappe.db.count("LMS Enrollment", {"course": course}),
		"changed": ago(c.modified)[0],
	}


@frappe.whitelist(methods=["POST"])
def save_course(values, course: str | None = None, instructors=None):
	require("instructor")
	data = clean_values(values, COURSE_EDIT_FIELDS)
	if "orbitutor_track" in data and data["orbitutor_track"] in TRACKS:
		data["orbitutor_track"] = TRACKS[data["orbitutor_track"]]
	if course:
		check_course(text(course, "Course"))
		doc = frappe.get_doc("LMS Course", course)
		doc.update(data)
	else:
		if not data.get("title"):
			frappe.throw(_("Give the course a title."))
		doc = frappe.get_doc({"doctype": "LMS Course", **data})
		doc.append("instructors", {"instructor": frappe.session.user})
	people = parse(instructors, "Instructors")
	if isinstance(people, list) and people:
		doc.set("instructors", [{"instructor": p} for p in people if isinstance(p, str) and frappe.db.exists("User", p)])
	if not doc.get("short_introduction"):
		doc.short_introduction = doc.title
	if not doc.get("description"):
		doc.description = f"<p>{frappe.utils.escape_html(doc.short_introduction or doc.title)}</p>"
	doc.save() if course else doc.insert()
	return course_detail(doc.name)


@frappe.whitelist(methods=["POST"])
def outline_change(course: str, action: str, args=None):
	"""One change to a course's outline, through Frappe Learning's own methods."""
	require("instructor")
	course = text(course, "Course")
	check_course(course)
	a = parse(args, "Changes") or {}
	from lms.lms import api as lms_api

	if action == "add_chapter":
		lms_api.upsert_chapter(title=text(a.get("title"), "Title"), course=course)
	elif action == "rename_chapter":
		lms_api.upsert_chapter(title=text(a.get("title"), "Title"), course=course, name=text(a.get("chapter"), "Chapter"))
	elif action == "move_chapter":
		lms_api.update_chapter_index(chapter=text(a.get("chapter"), "Chapter"), course=course, idx=cint(a.get("idx")))
	elif action == "delete_chapter":
		lms_api.delete_chapter(chapter=text(a.get("chapter"), "Chapter"))
	elif action == "add_lesson":
		lms_api.create_lesson(chapter=text(a.get("chapter"), "Chapter"), title=text(a.get("title"), "Title"))
	elif action == "move_lesson":
		lms_api.update_lesson_index(lesson=text(a.get("lesson"), "Lesson"), sourceChapter=text(a.get("from"), "Chapter"), targetChapter=text(a.get("to"), "Chapter"), idx=cint(a.get("idx")))
	elif action == "delete_lesson":
		lms_api.delete_lesson(lesson=text(a.get("lesson"), "Lesson"), chapter=text(a.get("chapter"), "Chapter"))
	elif action == "preview":
		lesson = text(a.get("lesson"), "Lesson")
		if frappe.db.get_value("Course Lesson", lesson, "course") != course:
			raise frappe.PermissionError(_("That lesson isn't in this course."))
		frappe.db.set_value("Course Lesson", lesson, "include_in_preview", 1 if cint(a.get("on")) else 0)
	else:
		frappe.throw(_("Unknown change."))
	return {"outline": outline_for_editor(course)}


@frappe.whitelist()
def course_students(course: str):
	require("instructor")
	course = text(course, "Course")
	check_course(course)
	rows = frappe.get_all("LMS Enrollment", {"course": course}, ["member", "member_name", "progress", "modified", "enrollment_from_batch"], order_by="progress desc")
	titles = batch_titles({r.enrollment_from_batch for r in rows if r.enrollment_from_batch})
	return {
		"students": [
			{"id": r.member, "name": r.member_name or frappe.db.get_value("User", r.member, "full_name"), "progress": round(flt(r.progress)), "last": ago(r.modified)[0], "last_sort": ago(r.modified)[1], "batch": titles.get(r.enrollment_from_batch)}
			for r in rows
		]
	}


def spread(values: list) -> list:
	b = [0, 0, 0, 0, 0]
	for v in values:
		v = flt(v)
		b[0 if v <= 0 else 4 if v >= 100 else 1 if v < 40 else 2 if v < 75 else 3] += 1
	return [{"label": l, "value": n} for l, n in zip(["Not started", "Started", "Halfway", "Nearly there", "Finished"], b)]


@frappe.whitelist()
def course_dashboard(course: str):
	require("instructor")
	course = text(course, "Course")
	check_course(course)
	rows = frappe.get_all("LMS Enrollment", {"course": course}, ["member", "progress", "modified", "current_lesson"])
	stopped = {}
	for r in rows:
		if flt(r.progress) < 100 and r.current_lesson and getdate(r.modified) < getdate(add_days(today(), -14)):
			stopped[r.current_lesson] = stopped.get(r.current_lesson, 0) + 1
	from lms.lms.utils import get_lesson_index

	stops = sorted(stopped.items(), key=lambda x: -x[1])[:6]
	quizzes = frappe.get_all("LMS Quiz", {"course": course}, ["name", "title"])
	qavg = []
	for q in quizzes:
		ps = frappe.get_all("LMS Quiz Submission", {"quiz": q.name}, pluck="percentage")
		if ps:
			qavg.append({"label": q.title, "value": round(sum(flt(p) for p in ps) / len(ps))})
	return {
		"students": len(rows),
		"finished": sum(1 for r in rows if flt(r.progress) >= 100),
		"average": round(sum(flt(r.progress) for r in rows) / len(rows)) if rows else 0,
		"active_week": sum(1 for r in rows if getdate(r.modified) >= getdate(add_days(today(), -7))),
		"spread": spread([r.progress for r in rows]),
		"stops": [{"label": f"{(get_lesson_index(l) or '').replace('-', '.')} {frappe.db.get_value('Course Lesson', l, 'title') or l}", "value": n} for l, n in stops],
		"quizzes": qavg,
	}


# ---- lessons ----


@frappe.whitelist()
def lesson_editor(lesson: str):
	require("instructor")
	l = frappe.db.get_value("Course Lesson", text(lesson, "Lesson"), ["name", "title", "content", "body", "include_in_preview", "instructor_notes", "chapter", "course", "is_scorm_package"], as_dict=True)
	if not l:
		raise frappe.DoesNotExistError(_("We can't find that lesson."))
	check_course(l.course)
	from lms.lms.utils import get_lesson_index

	outline = outline_for_editor(l.course)
	flat = [(ci, ch, x) for ci, ch in enumerate(outline) for x in ch["lessons"]]
	i = next((k for k, f in enumerate(flat) if f[2]["id"] == l.name), 0)
	number = get_lesson_index(l.name) or ""
	content = None
	try:
		content = json.loads(l.content) if l.content else None
	except ValueError:
		content = None
	if not content and l.body:
		content = {"blocks": [{"id": "md", "type": "markdown", "data": {"text": l.body}}]}
	return {
		"name": l.name, "title": l.title, "content": content or {"blocks": []}, "preview": bool(l.include_in_preview), "notes": l.instructor_notes or "",
		"course": l.course, "course_title": frappe.db.get_value("LMS Course", l.course, "title"),
		"eyebrow": (f"Chapter {number.split('-')[0]} · Lesson {number.split('-')[1]}" if "-" in number else None),
		"scorm": bool(l.is_scorm_package), "student_href": f"/course/{l.course}/learn/{number}" if number else None,
		"prev": {"title": flat[i - 1][2]["title"], "href": flat[i - 1][2]["href"]} if i > 0 else None,
		"next": {"title": flat[i + 1][2]["title"], "href": flat[i + 1][2]["href"]} if i + 1 < len(flat) else None,
		"activities": activity_titles(content),
	}


def activity_titles(content) -> dict:
	out = {}
	for b in (content or {}).get("blocks") or []:
		d = b.get("data") or {}
		for kind, field in (("quiz", "quiz"), ("assignment", "assignment"), ("program", "exercise")):
			if b.get("type") == kind and d.get(field):
				out[f"{kind}:{d[field]}"] = frappe.db.get_value(KIND_DOCTYPE[kind], d[field], "title")
	return out


@frappe.whitelist(methods=["POST"])
def save_lesson(lesson: str, title: str | None = None, content=None, preview=None, notes: str | None = None):
	require("instructor")
	doc = frappe.get_doc("Course Lesson", text(lesson, "Lesson"))
	check_course(doc.course)
	if title is not None:
		doc.title = text(title, "Title")
	if content is not None:
		data = parse(content, "Content")
		if not isinstance(data, dict) or not isinstance(data.get("blocks"), list):
			frappe.throw(_("The lesson's content isn't valid."))
		check_activities(data["blocks"])
		doc.content = json.dumps(data, ensure_ascii=False)
		if doc.body and data.get("blocks"):
			doc.body = None
	if preview is not None:
		doc.include_in_preview = 1 if cint(preview) else 0
	if notes is not None:
		doc.instructor_notes = cstr(notes)[:20000]
	doc.save()
	return {"saved": True, "modified": iso(get_datetime(doc.modified))}


ACTIVITY_BLOCKS = {"quiz": ("quiz", "LMS Quiz", "quiz"), "assignment": ("assignment", "LMS Assignment", "assignment"), "program": ("exercise", "LMS Programming Exercise", "coding exercise")}


def check_activities(blocks: list):
	"""A quiz, assignment or exercise block must point at one that exists (Frappe Learning
	refuses the lesson otherwise, with a less helpful message)."""
	for b in blocks:
		spec = ACTIVITY_BLOCKS.get(b.get("type")) if isinstance(b, dict) else None
		if not spec:
			continue
		key, doctype, word = spec
		name = (b.get("data") or {}).get(key)
		if not name or not frappe.db.exists(doctype, name):
			frappe.throw(_("A {0} in this lesson doesn't exist any more. Pick another, or take the block out.").format(word))


@frappe.whitelist()
def search_activities(kind: str, query: str = ""):
	require("instructor")
	doctype = KIND_DOCTYPE.get(kind)
	if not doctype:
		frappe.throw(_("Unknown kind."))
	filters = {"title": ["like", f"%{cstr(query)[:60]}%"]} if query else {}
	rows = frappe.get_list(doctype, filters=filters, fields=["name", "title"], order_by="modified desc", limit=20)
	icon = {"quiz": "quiz", "assignment": "assignment"}.get(kind, "code")
	return [{"value": r.name, "label": r.title, "icon": icon} for r in rows]


@frappe.whitelist(methods=["POST"])
def create_activity(kind: str, title: str | None = None, course: str | None = None):
	require("instructor")
	doctype = KIND_DOCTYPE.get(kind)
	if not doctype:
		frappe.throw(_("Unknown kind."))
	t = text(title, "Title") if title else {"quiz": "New quiz", "assignment": "New assignment"}.get(kind, "New coding exercise")
	values = {"doctype": doctype, "title": t}
	if kind == "assignment":
		values.update({"type": "Image", "question": "<p>What to hand in.</p>", "grade_assignment": 1})
	if kind in ("program", "exercise"):
		values.update({"language": "Python", "problem_statement": "<p>The problem.</p>"})
	if kind == "quiz":
		values.update({"passing_percentage": 60, "max_attempts": 0})
	if course and doctype in ("LMS Quiz", "LMS Assignment"):
		values["course"] = course
	doc = frappe.get_doc(values)
	doc.insert()
	return {"value": doc.name, "label": doc.title, "href": f"/teach/{'exercise' if kind == 'program' else kind}/{doc.name}"}


# ---- quizzes, assignments and exercises ----


@frappe.whitelist()
def library(kind: str = "quiz"):
	require("instructor")
	doctype = KIND_DOCTYPE.get(kind)
	if not doctype:
		frappe.throw(_("Unknown kind."))
	rows = frappe.get_list(doctype, fields=["name", "title", "modified"], order_by="modified desc", limit=500)
	sub = {"LMS Quiz": ("LMS Quiz Submission", "quiz"), "LMS Assignment": ("LMS Assignment Submission", "assignment"), "LMS Programming Exercise": ("LMS Programming Exercise Submission", "exercise")}[doctype]
	out = []
	for r in rows:
		extra = {}
		if doctype == "LMS Quiz":
			extra["questions"] = frappe.db.count("LMS Quiz Question", {"parent": r.name})
		out.append({"name": r.name, "title": r.title, "taken": frappe.db.count(sub[0], {sub[1]: r.name}), "changed": ago(r.modified)[0], "changed_sort": ago(r.modified)[1],
		            "href": f"/teach/{'exercise' if kind in ('program', 'exercise') else kind}/{r.name}", **extra})
	return {"items": out}


QUIZ_FIELDS = {"title": "Data", "passing_percentage": "Int", "max_attempts": "Int", "duration": "Data", "limit_questions_to": "Int", "shuffle_questions": "Check",
               "show_answers": "Check", "show_submission_history": "Check", "enable_negative_marking": "Check", "marks_to_cut": "Int", "course": "Data"}


def question_value(name: str) -> dict:
	q = frappe.get_doc("LMS Question", name)
	kind = {"User Input": "typed", "Open Ended": "open"}.get(q.type) or ("multiple" if q.multiple else "single")
	return {
		"type": kind,
		"question": q.question,
		"options": [{"text": q.get(f"option_{i}"), "correct": bool(q.get(f"is_correct_{i}")), "explanation": q.get(f"explanation_{i}") or ""} for i in range(1, 11) if q.get(f"option_{i}")],
		"answers": [q.get(f"possibility_{i}") for i in range(1, 11) if q.get(f"possibility_{i}")],
	}


@frappe.whitelist()
def quiz_detail(quiz: str):
	require("instructor")
	doc = frappe.get_doc("LMS Quiz", text(quiz, "Quiz"))
	doc.check_permission("read")
	questions = []
	for row in doc.questions:
		if not row.question:
			continue
		v = question_value(row.question)
		problem = None
		if v["type"] in ("single", "multiple") and not any(o["correct"] for o in v["options"]):
			problem = "No right answer"
		shared = frappe.get_all("LMS Quiz Question", {"question": row.question, "parent": ["!=", doc.name]}, pluck="parent", limit=1)
		questions.append({"id": row.question, "row": row.name, "text": v["question"], "type": v["type"], "marks": cint(row.marks), "problem": problem,
		                  "shared": frappe.db.get_value("LMS Quiz", shared[0], "title") if shared else None, "value": dict(v, marks=cint(row.marks))})
	used = frappe.get_all("Course Lesson", {"content": ["like", f'%"quiz": "{doc.name}"%']}, ["name", "title", "course"], limit=5)
	return {
		"name": doc.name,
		"values": {k: doc.get(k) for k in QUIZ_FIELDS},
		"questions": questions,
		"used_in": [l.title for l in used],
		"taken": frappe.db.count("LMS Quiz Submission", {"quiz": doc.name}),
		"results": [
			{"id": s.name, "name": s.member_name, "score": f"{cint(s.score)} of {cint(s.score_out_of)}", "percentage": cint(s.percentage), "passed": cint(s.percentage) >= cint(doc.passing_percentage),
			 "when": ago(s.creation)[0], "href": f"/teach/marking/quiz/{s.name}"}
			for s in frappe.get_all("LMS Quiz Submission", {"quiz": doc.name}, ["name", "member_name", "score", "score_out_of", "percentage", "creation"], order_by="creation desc", limit=200)
		],
	}


@frappe.whitelist(methods=["POST"])
def save_quiz(values, quiz: str | None = None):
	require("instructor")
	data = clean_values(values, QUIZ_FIELDS)
	if "title" in data and not cstr(data["title"]).strip():
		frappe.throw(_("Give the quiz a title."))
	if "passing_percentage" in data and not 0 <= data["passing_percentage"] <= 100:
		frappe.throw(_("The pass mark is a percentage, from 0 to 100."))
	for k in ("max_attempts", "limit_questions_to", "marks_to_cut"):
		if data.get(k, 0) < 0:
			frappe.throw(_("Use 0 or more."))
	if data.get("duration") and not cstr(data["duration"]).strip().isdigit():
		frappe.throw(_("The time limit is in minutes, as a number."))
	if "course" in data and not data["course"]:
		data["course"] = None
	if quiz:
		doc = frappe.get_doc("LMS Quiz", text(quiz, "Quiz"))
		doc.update(data)
		doc.save()
	else:
		doc = frappe.get_doc({"doctype": "LMS Quiz", **data})
		doc.insert()
	return quiz_detail(doc.name)


@frappe.whitelist(methods=["POST"])
def save_question(quiz: str, value, question: str | None = None):
	require("instructor")
	v = parse(value, "Question")
	quiz_doc = frappe.get_doc("LMS Quiz", text(quiz, "Quiz"))
	quiz_doc.check_permission("write")
	kind = v.get("type")
	if kind not in ("single", "multiple", "typed", "open"):
		frappe.throw(_("Pick a kind of question."))
	if not strip_html(cstr(v.get("question"))).strip():
		frappe.throw(_("Write the question."))
	fields = {"question": v.get("question"), "type": {"typed": "User Input", "open": "Open Ended"}.get(kind, "Choices"), "multiple": 1 if kind == "multiple" else 0}
	for i in range(1, 11):
		fields[f"option_{i}"] = None
		fields[f"is_correct_{i}"] = 0
		fields[f"explanation_{i}"] = None
		fields[f"possibility_{i}"] = None
	if kind in ("single", "multiple"):
		opts = [o for o in (v.get("options") or []) if cstr(o.get("text")).strip()][:10]
		if len(opts) < 2:
			frappe.throw(_("Give at least two answers."))
		if not any(o.get("correct") for o in opts):
			frappe.throw(_("Mark the right answer."))
		for i, o in enumerate(opts, 1):
			fields[f"option_{i}"] = cstr(o.get("text")).strip()
			fields[f"is_correct_{i}"] = 1 if o.get("correct") else 0
			fields[f"explanation_{i}"] = cstr(o.get("explanation")).strip() or None
	if kind == "typed":
		answers = [cstr(a).strip() for a in (v.get("answers") or []) if cstr(a).strip()][:10]
		if not answers:
			frappe.throw(_("Give at least one answer you accept."))
		for i, a in enumerate(answers, 1):
			fields[f"possibility_{i}"] = a
	if question:
		qdoc = frappe.get_doc("LMS Question", text(question, "Question"))
		qdoc.update(fields)
		qdoc.save()
	else:
		qdoc = frappe.get_doc({"doctype": "LMS Question", **fields})
		qdoc.insert()
	marks = max(1, cint(v.get("marks") or 1))
	row = next((r for r in quiz_doc.questions if r.question == qdoc.name), None)
	if row:
		row.marks = marks
	else:
		quiz_doc.append("questions", {"question": qdoc.name, "marks": marks})
	quiz_doc.save()
	return quiz_detail(quiz_doc.name)


@frappe.whitelist(methods=["POST"])
def quiz_questions_change(quiz: str, action: str, question: str | None = None, idx: int | None = None, questions=None):
	require("instructor")
	doc = frappe.get_doc("LMS Quiz", text(quiz, "Quiz"))
	doc.check_permission("write")
	rows = list(doc.questions)
	if action == "remove":
		rows = [r for r in rows if r.question != question]
	elif action == "move":
		cur = next((r for r in rows if r.question == question), None)
		if cur:
			rows.remove(cur)
			rows.insert(max(0, min(cint(idx), len(rows))), cur)
	elif action == "add":
		names = parse(questions, "Questions") or []
		have = {r.question for r in rows}
		for n in names:
			if isinstance(n, str) and n not in have and frappe.db.exists("LMS Question", n):
				rows.append(frappe._dict({"question": n, "marks": 1}))
	doc.set("questions", [{"question": r.question, "marks": r.marks} for r in rows])
	doc.save()
	return quiz_detail(doc.name)


@frappe.whitelist()
def question_bank(quiz: str, query: str = ""):
	require("instructor")
	have = set(frappe.get_all("LMS Quiz Question", {"parent": text(quiz, "Quiz")}, pluck="question"))
	filters = {"question": ["like", f"%{cstr(query)[:60]}%"]} if query else {}
	rows = frappe.get_list("LMS Question", filters=filters, fields=["name", "question", "type", "multiple"], order_by="modified desc", limit=100)
	out = []
	for r in rows:
		if r.name in have:
			continue
		used = frappe.get_all("LMS Quiz Question", {"question": r.name}, pluck="parent", limit=1)
		out.append({"id": r.name, "text": strip_html(r.question or "")[:200], "type": {"User Input": "Typed answer", "Open Ended": "Open answer"}.get(r.type) or ("Several answers" if r.multiple else "One answer"),
		            "used": frappe.db.get_value("LMS Quiz", used[0], "title") if used else "Not used yet"})
	return {"items": out}


ASSIGNMENT_FIELDS = {"title": "Data", "question": "Html", "type": "Data", "grade_assignment": "Check", "answer": "Html", "show_answer": "Check", "course": "Data"}
EXERCISE_FIELDS = {"title": "Data", "problem_statement": "Html", "starter_code": "Text", "language": "Data"}


@frappe.whitelist()
def assignment_detail(assignment: str):
	require("instructor")
	doc = frappe.get_doc("LMS Assignment", text(assignment, "Assignment"))
	doc.check_permission("read")
	used = frappe.get_all("Course Lesson", {"content": ["like", f'%"assignment": "{doc.name}"%']}, ["title"], limit=5)
	return {"name": doc.name, "values": {k: doc.get(k) for k in ASSIGNMENT_FIELDS}, "used_in": [u.title for u in used],
	        "submissions": frappe.db.count("LMS Assignment Submission", {"assignment": doc.name})}


@frappe.whitelist(methods=["POST"])
def save_assignment(values, assignment: str | None = None):
	require("instructor")
	data = clean_values(values, ASSIGNMENT_FIELDS)
	if data.get("type") and data["type"] not in ASSIGNMENT_TYPES:
		frappe.throw(_("Pick what students hand in."))
	if assignment:
		doc = frappe.get_doc("LMS Assignment", text(assignment, "Assignment"))
		doc.update(data)
		doc.save()
	else:
		doc = frappe.get_doc({"doctype": "LMS Assignment", **data})
		doc.insert()
	return assignment_detail(doc.name)


@frappe.whitelist()
def exercise_detail(exercise: str):
	require("instructor")
	doc = frappe.get_doc("LMS Programming Exercise", text(exercise, "Exercise"))
	doc.check_permission("read")
	return {"name": doc.name, "values": {k: doc.get(k) for k in EXERCISE_FIELDS},
	        "tests": [{"input": t.input or "", "expected_output": t.expected_output or "", "hidden": bool(t.hidden)} for t in doc.test_cases],
	        "submissions": frappe.db.count("LMS Programming Exercise Submission", {"exercise": doc.name})}


@frappe.whitelist(methods=["POST"])
def save_exercise(values, tests=None, exercise: str | None = None):
	require("instructor")
	data = clean_values(values, EXERCISE_FIELDS)
	cases = [c for c in (parse(tests, "Tests") or []) if isinstance(c, dict)]
	if not cases:
		frappe.throw(_("Add at least one test."))
	for i, c in enumerate(cases, start=1):
		if not cstr(c.get("expected_output")).strip():
			frappe.throw(_("Test {0}: say what the program should print.").format(i))
	if exercise:
		doc = frappe.get_doc("LMS Programming Exercise", text(exercise, "Exercise"))
		doc.update(data)
	else:
		doc = frappe.get_doc({"doctype": "LMS Programming Exercise", **data})
	doc.set("test_cases", [{"input": cstr(c.get("input")), "expected_output": cstr(c.get("expected_output")), "hidden": 1 if c.get("hidden") else 0} for c in cases if isinstance(c, dict)])
	doc.save() if exercise else doc.insert()
	return exercise_detail(doc.name)


# ---- batches ----


def batch_state(b) -> str:
	t = getdate(today())
	if b.end_date and getdate(b.end_date) < t:
		return "Finished"
	if b.start_date and getdate(b.start_date) > t:
		return "Coming up"
	return "Running"


@frappe.whitelist()
def batches():
	require("instructor")
	mine = taught_batches()
	rows = frappe.get_all("LMS Batch", {} if mine is None else {"name": ["in", mine or ["-"]]}, ["name", "title", "start_date", "end_date", "seat_count", "published", "medium"], order_by="start_date desc")
	out = []
	for b in rows:
		taken = frappe.db.count("LMS Batch Enrollment", {"batch": b.name})
		out.append({"name": b.name, "title": b.title, "state": batch_state(b), "starts": b.start_date, "ends": b.end_date, "seats": f"{taken} of {cint(b.seat_count)}" if cint(b.seat_count) else str(taken),
		            "published": bool(b.published), "href": f"/teach/batch/{b.name}", "start_sort": str(b.start_date or "")})
	return {"batches": out}


@frappe.whitelist()
def batch_detail(batch: str):
	require("instructor")
	batch = text(batch, "Batch")
	check_batch(batch)
	b = frappe.get_doc("LMS Batch", batch)
	courses = [c.course for c in b.courses]
	crow = course_rows(courses)
	members = frappe.get_all("LMS Batch Enrollment", {"batch": batch}, ["member", "member_name"], order_by="creation asc")
	prog = {}
	for e in frappe.get_all("LMS Enrollment", {"member": ["in", [m.member for m in members] or ["-"]], "course": ["in", courses or ["-"]]}, ["member", "course", "progress", "modified"]):
		prog.setdefault(e.member, {})[e.course] = (round(flt(e.progress)), e.modified)
	roster = []
	for m in members:
		p = prog.get(m.member, {})
		last = max((v[1] for v in p.values()), default=None)
		roster.append({"id": m.member, "name": m.member_name or frappe.db.get_value("User", m.member, "full_name"), "progress": {c: p.get(c, (0, None))[0] for c in courses},
		               "last": ago(last)[0] if last else "Not yet", "last_sort": ago(last)[1] if last else 9999})
	classes = []
	for c in frappe.get_all("LMS Live Class", {"batch_name": batch}, ["name", "title", "date", "time", "duration", "join_url", "start_url", "attendees", "timezone"], order_by="date asc, time asc"):
		start = zoned(c.date, c.time, c.timezone or b.timezone)
		classes.append({"id": c.name, "title": c.title, "start": start.isoformat(), "date": str(c.date), "time": str(c.time), "minutes": cint(c.duration) or 60,
		                "join_url": c.join_url, "start_url": c.start_url or c.join_url, "came": cint(c.attendees), "past": getdate(c.date) < getdate(today())})
	assessments = []
	for a in b.assessment:
		dt = a.assessment_type
		title = frappe.db.get_value(dt, a.assessment_name, "title") if dt in ("LMS Quiz", "LMS Assignment", "LMS Programming Exercise") else a.assessment_name
		due = None
		if dt in ("LMS Quiz", "LMS Assignment"):
			s = frappe.db.get_value(dt, a.assessment_name, ["enable_scheduling", "schedule_end"], as_dict=True)
			due = system_iso(s.schedule_end) if s and s.enable_scheduling else None
		passed = 0
		if dt == "LMS Quiz":
			pm = cint(frappe.db.get_value("LMS Quiz", a.assessment_name, "passing_percentage"))
			passed = len({s.member for s in frappe.get_all("LMS Quiz Submission", {"quiz": a.assessment_name, "member": ["in", [m.member for m in members] or ["-"]]}, ["member", "percentage"]) if cint(s.percentage) >= pm})
		elif dt == "LMS Assignment":
			passed = frappe.db.count("LMS Assignment Submission", {"assignment": a.assessment_name, "status": "Pass", "member": ["in", [m.member for m in members] or ["-"]]})
		slug = {"LMS Quiz": "quiz", "LMS Assignment": "assignment", "LMS Programming Exercise": "exercise"}.get(dt)
		assessments.append({"id": a.name, "name": a.assessment_name, "kind": {"LMS Quiz": "Quiz", "LMS Assignment": "Assignment", "LMS Programming Exercise": "Coding exercise"}.get(dt, dt), "title": title, "due": due, "passed": passed,
		                    "href": f"/teach/{slug}/{a.assessment_name}" if slug else None})
	from orbitutor.api import announcements

	values = {k: b.get(k) for k in BATCH_EDIT_FIELDS}
	for k in ("start_time", "end_time"):
		if values.get(k):
			values[k] = str(values[k])[:5]
	upcoming = [c for c in classes if not c["past"]]
	avg = round(sum(sum(r["progress"].values()) / max(len(courses), 1) for r in roster) / len(roster)) if roster else 0
	return {
		"name": b.name, "title": b.title, "state": batch_state(b), "values": values,
		"meta": " · ".join(x for x in [f"{frappe.utils.formatdate(b.start_date, 'EEEE d MMMM')} to {frappe.utils.formatdate(b.end_date, 'EEEE d MMMM')}" if b.start_date and b.end_date else None,
		                                    f"{time_text(b.start_time)} to {time_text(b.end_time)}" if b.start_time and b.end_time else None, "Online" if b.medium != "Offline" else "In person"] if x),
		"courses": [{"value": c, "label": crow[c].title, "track": TRACK_IDS.get(crow[c].orbitutor_track or "")} for c in courses if c in crow],
		"instructors": [dict(person(i.instructor), value=i.instructor) for i in b.instructors if person(i.instructor)],
		"roster": roster, "seats": cint(b.seat_count), "classes": classes, "assessments": assessments,
		"announcements": announcements([batch], limit=30),
		"stats": {"students": len(roster), "average": avg, "next_class": upcoming[0] if upcoming else None,
		          "to_mark": sum(1 for w in waiting_work() if w["member"] in {m.member for m in members})},
		"spreads": [{"title": crow[c].title, "segments": spread([r["progress"].get(c, 0) for r in roster])} for c in courses if c in crow],
		"zoom": bool(b.get("zoom_account")),
		"student_href": f"/batch/{b.name}",
	}


@frappe.whitelist(methods=["POST"])
def save_batch(values, batch: str | None = None, courses=None, instructors=None):
	require("instructor")
	data = clean_values(values, BATCH_EDIT_FIELDS)
	if batch:
		check_batch(text(batch, "Batch"))
		doc = frappe.get_doc("LMS Batch", batch)
		doc.update(data)
	else:
		if not roles()["moderator"] and not frappe.has_permission("LMS Batch", "create"):
			raise frappe.PermissionError(_("You can't make batches."))
		if not data.get("title"):
			frappe.throw(_("Give the batch a name."))
		doc = frappe.get_doc({"doctype": "LMS Batch", "timezone": system_timezone(), "description": data.get("title"), **data})
		doc.append("instructors", {"instructor": frappe.session.user})
	cl = parse(courses, "Courses")
	if isinstance(cl, list):
		doc.set("courses", [{"course": c} for c in cl if isinstance(c, str) and frappe.db.exists("LMS Course", c)])
	il = parse(instructors, "Instructors")
	if isinstance(il, list) and il:
		doc.set("instructors", [{"instructor": i} for i in il if isinstance(i, str) and frappe.db.exists("User", i)])
	if not cstr(doc.title).strip():
		frappe.throw(_("Give the batch a name."))
	if doc.start_date and doc.end_date and getdate(doc.end_date) < getdate(doc.start_date):
		frappe.throw(_("The batch ends before it starts."))
	if doc.start_time and doc.end_time and cstr(doc.end_time)[:5].zfill(5) <= cstr(doc.start_time)[:5].zfill(5):
		frappe.throw(_("Classes should end after they start."))
	if cint(doc.seat_count) < 0:
		frappe.throw(_("Seats can't be fewer than 0."))
	if not doc.get("batch_details"):
		doc.batch_details = f"<p>{frappe.utils.escape_html(doc.description or doc.title)}</p>"
	doc.save() if batch else doc.insert()
	return batch_detail(doc.name)


@frappe.whitelist()
def find_people(query: str, batch: str | None = None):
	"""People to enrol or make staff: by name or email, enabled accounts only."""
	require("instructor", "evaluator")
	q = cstr(query).strip()[:80]
	if len(q) < 2:
		return []
	rows = frappe.get_all("User", {"enabled": 1, "name": ["not in", ["Administrator", "Guest"]], "full_name": ["like", f"%{q}%"]}, ["name", "full_name", "user_image"], limit=10)
	rows += [r for r in frappe.get_all("User", {"enabled": 1, "name": ["like", f"%{q}%"]}, ["name", "full_name", "user_image"], limit=10) if r.name not in {x.name for x in rows} and r.name not in ("Administrator", "Guest")]
	inside = set(frappe.get_all("LMS Batch Enrollment", {"batch": batch}, pluck="member")) if batch else set()
	return [{"value": r.name, "label": r.full_name or r.name, "description": r.name, "person": True, "avatar": r.user_image, "disabled": r.name in inside, "note": "In this batch" if r.name in inside else None} for r in rows[:12]]


@frappe.whitelist(methods=["POST"])
def enrol(batch: str, members, request: str | None = None):
	require("instructor")
	batch = text(batch, "Batch")
	check_batch(batch)
	people = parse(members, "Students") or []
	seats = cint(frappe.db.get_value("LMS Batch", batch, "seat_count"))
	added = []
	for m in people:
		if not isinstance(m, str) or not frappe.db.exists("User", m) or frappe.db.exists("LMS Batch Enrollment", {"batch": batch, "member": m}):
			continue
		if seats and frappe.db.count("LMS Batch Enrollment", {"batch": batch}) >= seats:
			frappe.throw(_("The batch is full: {0} seats.").format(seats))
		frappe.get_doc({"doctype": "LMS Batch Enrollment", "batch": batch, "member": m}).insert()
		added.append(m)
	if request and frappe.db.exists("OrbiTutor Join Request", request):
		frappe.db.set_value("OrbiTutor Join Request", request, {"status": "Enrolled", "batch": batch})
	return {"added": len(added), "batch": batch_detail(batch)}


@frappe.whitelist(methods=["POST"])
def remove_student(batch: str, member: str):
	require("instructor")
	batch = text(batch, "Batch")
	check_batch(batch)
	name = frappe.db.get_value("LMS Batch Enrollment", {"batch": batch, "member": text(member, "Student")}, "name")
	if name:
		frappe.delete_doc("LMS Batch Enrollment", name)
	return batch_detail(batch)


@frappe.whitelist(methods=["POST"])
def schedule_class(batch: str, title: str, date: str, time: str, duration: int = 60, join_url: str | None = None, description: str | None = None, live_class: str | None = None):
	require("instructor")
	batch = text(batch, "Batch")
	check_batch(batch)
	b = frappe.db.get_value("LMS Batch", batch, ["timezone", "zoom_account", "conferencing_provider"], as_dict=True)
	url = cstr(join_url).strip()
	if url and not url.lower().startswith("https://"):
		frappe.throw(_("The meeting link should start with https://"))
	values = {"title": text(title, "Title"), "date": str(getdate(date)), "time": text(time, "Time")[:5] + ":00", "duration": max(15, cint(duration) or 60), "description": cstr(description)[:2000] or None}
	if live_class:
		doc = frappe.get_doc("LMS Live Class", text(live_class, "Class"))
		if doc.batch_name != batch:
			raise frappe.PermissionError(_("That class isn't in this batch."))
		doc.update(values)
		if url:
			doc.join_url = url
		doc.save()
	elif not url and b.zoom_account and b.conferencing_provider == "Zoom":
		from lms.lms.doctype.lms_batch.lms_batch import create_live_class

		create_live_class(batch_name=batch, zoom_account=b.zoom_account, title=values["title"], duration=values["duration"], date=values["date"], time=values["time"], timezone=b.timezone or system_timezone(), auto_recording="No Recording", description=values["description"])
	else:
		if not url:
			frappe.throw(_("Add the meeting link."))
		insert_live_class({"doctype": "LMS Live Class", "batch_name": batch, "join_url": url, "start_url": url, "timezone": b.timezone or system_timezone(), "host": frappe.session.user, **values})
	return batch_detail(batch)


def insert_live_class(values: dict):
	"""A class with its own meeting link. Frappe Learning puts every new class on the host's
	Google Calendar to send invites, and refuses one when there's no calendar connected: the
	class itself is already saved by then, so without a calendar it's kept, just with no invite."""
	doc = frappe.get_doc(values)
	try:
		doc.insert()
	except frappe.ValidationError as e:
		calendar_missing = type(e).__name__ == "GoogleCalendarMissingError" or "Google Calendar" in cstr(e)
		if not (calendar_missing and doc.name and frappe.db.exists("LMS Live Class", doc.name)):
			raise
		frappe.clear_messages()
	return doc


@frappe.whitelist(methods=["POST"])
def cancel_class(live_class: str):
	require("instructor")
	doc = frappe.get_doc("LMS Live Class", text(live_class, "Class"))
	check_batch(doc.batch_name)
	frappe.delete_doc("LMS Live Class", doc.name)
	return batch_detail(doc.batch_name)


@frappe.whitelist(methods=["POST"])
def assessment_change(batch: str, action: str, kind: str | None = None, name: str | None = None, row: str | None = None):
	require("instructor")
	batch = text(batch, "Batch")
	check_batch(batch)
	doc = frappe.get_doc("LMS Batch", batch)
	if action == "add":
		dt = KIND_DOCTYPE.get(kind)
		if not dt or not frappe.db.exists(dt, name):
			frappe.throw(_("Pick a quiz or assignment."))
		if not any(a.assessment_name == name for a in doc.assessment):
			doc.append("assessment", {"assessment_type": dt, "assessment_name": name})
	elif action == "remove":
		doc.set("assessment", [a for a in doc.assessment if a.name != row])
	doc.save()
	return batch_detail(batch)


@frappe.whitelist(methods=["POST"])
def announce(batch: str, subject: str, body: str, email: bool = True):
	require("instructor")
	batch = text(batch, "Batch")
	check_batch(batch)
	if not strip_html(cstr(body)).strip():
		frappe.throw(_("Write the announcement."))
	students = frappe.get_all("LMS Batch Enrollment", {"batch": batch}, pluck="member")
	frappe.get_doc(
		{
			"doctype": "Communication", "communication_type": "Communication", "communication_medium": "Email", "sent_or_received": "Sent",
			"subject": text(subject, "Title"), "content": body, "reference_doctype": "LMS Batch", "reference_name": batch,
			"sender": frappe.session.user, "sender_full_name": frappe.db.get_value("User", frappe.session.user, "full_name"), "recipients": ", ".join(students) if cint(email) else "",
		}
	).insert(ignore_permissions=True)
	if cint(email) and students:
		frappe.sendmail(bcc=students, subject=subject, message=body, reference_doctype="LMS Batch", reference_name=batch)
	return batch_detail(batch)


# ---- join requests ----


@frappe.whitelist()
def requests(status: str | None = None):
	require("instructor")
	filters = {"status": status} if status else {}
	rows = frappe.get_all("OrbiTutor Join Request", filters, ["name", "full_name", "phone", "user", "course", "batch", "for_whom", "message", "status", "creation"], order_by="creation desc", limit=300)
	titles = dict(frappe.get_all("LMS Course", {"name": ["in", list({r.course for r in rows}) or ["-"]]}, ["name", "title"], as_list=True))
	bt = batch_titles({r.batch for r in rows if r.batch})
	return {
		"items": [
			{"id": r.name, "name": r.full_name, "phone": r.phone, "email": r.user, "user": r.user, "course": titles.get(r.course, r.course), "course_name": r.course, "batch": bt.get(r.batch, "Any"),
			 "batch_name": r.batch, "for_whom": r.for_whom or "Themselves", "message": r.message, "status": r.status, "asked": ago(r.creation)[0], "age": ago(r.creation)[1], "at": system_iso(r.creation)}
			for r in rows
		],
		"statuses": ["New", "Contacted", "Enrolled", "Closed"],
	}


@frappe.whitelist(methods=["POST"])
def set_request(request: str, status: str):
	require("instructor")
	if status not in ("New", "Contacted", "Enrolled", "Closed"):
		frappe.throw(_("Unknown status."))
	doc = frappe.get_doc("OrbiTutor Join Request", text(request, "Request"))
	doc.status = status
	doc.save(ignore_permissions=True)
	return requests()


# ---- evaluations ----


@frappe.whitelist()
def evaluations():
	require("evaluator")
	me = frappe.session.user
	rows = frappe.get_all("LMS Certificate Request", {"evaluator": me, "status": ["in", ["Upcoming", "Completed"]], "date": [">=", add_days(today(), -30)]},
	                      ["name", "member", "member_name", "course", "course_title", "date", "start_time", "end_time", "google_meet_link", "batch_name", "status"], order_by="date asc, start_time asc")
	out = []
	for r in rows:
		start = zoned(r.date, r.start_time, None)
		done = frappe.db.exists("LMS Certificate Evaluation", {"member": r.member, "course": r.course, "date": r.date})
		past = start < now_datetime().replace(tzinfo=start.tzinfo)
		out.append({"id": r.name, "name": r.member_name, "member": r.member, "course": r.course_title or frappe.db.get_value("LMS Course", r.course, "title"), "course_name": r.course,
		            "when": f"{frappe.utils.formatdate(r.date, 'EEEE d MMMM')}, {time_text(r.start_time)}", "join": r.google_meet_link, "state": "Done" if done else "To record" if past else "Upcoming",
		            "date": str(r.date), "start_time": str(r.start_time), "end_time": str(r.end_time), "batch": r.batch_name})
	ev = frappe.db.get_value("Course Evaluator", {"evaluator": me}, "name")
	slots, away = [], {"from": "", "to": ""}
	if ev:
		doc = frappe.get_doc("Course Evaluator", ev)
		slots = [{"day": s.day, "start": str(s.start_time)[:5], "end": str(s.end_time)[:5]} for s in doc.schedule]
		away = {"from": str(doc.unavailable_from or ""), "to": str(doc.unavailable_to or "")}
	return {"items": out, "slots": slots, "away": away}


@frappe.whitelist(methods=["POST"])
def save_availability(slots, away=None):
	require("evaluator")
	me = frappe.session.user
	rows = parse(slots, "Times") or []
	clean = []
	for s in rows:
		if s.get("day") not in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"):
			continue
		if not s.get("start") or not s.get("end") or str(s["end"]) <= str(s["start"]):
			frappe.throw(_("{0}: the end must be after the start.").format(s.get("day")))
		clean.append({"day": s["day"], "start_time": str(s["start"])[:5] + ":00", "end_time": str(s["end"])[:5] + ":00"})
	a = parse(away, "Away") or {}
	name = frappe.db.get_value("Course Evaluator", {"evaluator": me}, "name")
	doc = frappe.get_doc("Course Evaluator", name) if name else frappe.get_doc({"doctype": "Course Evaluator", "evaluator": me})
	doc.set("schedule", clean)
	doc.unavailable_from = a.get("from") or None
	doc.unavailable_to = a.get("to") or None
	doc.save(ignore_permissions=True) if name else doc.insert(ignore_permissions=True)
	return evaluations()


@frappe.whitelist(methods=["POST"])
def record_evaluation(request: str, status: str, summary: str | None = None):
	require("evaluator")
	r = frappe.get_doc("LMS Certificate Request", text(request, "Evaluation"))
	if r.evaluator != frappe.session.user and not roles()["moderator"]:
		raise frappe.PermissionError(_("This evaluation is booked with someone else."))
	if status not in ("passed", "failed"):
		frappe.throw(_("Choose Passed or Not passed."))
	from lms.lms.api import save_evaluation_details

	save_evaluation_details(member=r.member, course=r.course, date_value=str(r.date), start_time=str(r.start_time), end_time=str(r.end_time),
	                        status="Pass" if status == "passed" else "Fail", batch_name=r.batch_name, summary=strip_html(cstr(summary))[:2000])
	frappe.db.set_value("LMS Certificate Request", r.name, "status", "Completed")
	if status == "passed" and not frappe.db.exists("LMS Certificate", {"member": r.member, "course": r.course}):
		give(r.member, r.course, today(), r.batch_name)
	return evaluations()


# ---- certificates ----


def give(member: str, course: str, date: str, batch: str | None = None):
	from lms.lms.doctype.lms_certificate.lms_certificate import get_default_certificate_template

	doc = frappe.get_doc({"doctype": "LMS Certificate", "member": member, "course": course, "issue_date": str(getdate(date)), "batch_name": batch or None, "published": 1, "template": get_default_certificate_template()})
	doc.insert()
	return doc.name


@frappe.whitelist()
def certificates_list():
	require("instructor", "evaluator")
	mine = taught_courses()
	filters = {} if mine is None or roles()["evaluator"] else {"course": ["in", mine or ["-"]]}
	rows = frappe.get_all("LMS Certificate", filters, ["name", "member", "member_name", "course", "course_title", "batch_title", "issue_date"], order_by="issue_date desc", limit=500)
	return {"items": [{"id": r.name, "name": r.member_name, "course": r.course_title, "batch": r.batch_title, "date": frappe.utils.formatdate(r.issue_date, "EEEE d MMMM yyyy"), "date_sort": str(r.issue_date),
	                   "href": f"/certificate/{r.name}"} for r in rows],
	        "can_batch": roles()["instructor"],
	        "courses": [{"value": c.name, "label": c.title} for c in frappe.get_all("LMS Course", {"enable_certification": 1, **({} if mine is None else {"name": ["in", mine or ["-"]]})}, ["name", "title"], order_by="title asc")]}


@frappe.whitelist(methods=["POST"])
def give_certificate(member: str, course: str, date: str | None = None):
	require("instructor", "evaluator")
	if frappe.db.exists("LMS Certificate", {"member": text(member, "Student"), "course": text(course, "Course")}):
		frappe.throw(_("They already have a certificate for this course."))
	give(member, course, date or today())
	return certificates_list()


def batch_finishers(batch: str) -> tuple[list, list]:
	courses = frappe.get_all("Batch Course", {"parent": batch, "parenttype": "LMS Batch"}, pluck="course")
	members = frappe.get_all("LMS Batch Enrollment", {"batch": batch}, pluck="member")
	ready, not_yet = [], []
	for m in members:
		done = all(flt(frappe.db.get_value("LMS Enrollment", {"member": m, "course": c}, "progress")) >= 100 for c in courses) if courses else False
		missing = [c for c in courses if not frappe.db.exists("LMS Certificate", {"member": m, "course": c})]
		(ready if done and missing else not_yet).append(m)
	return ready, not_yet


@frappe.whitelist()
def batch_certificates_preview(batch: str):
	require("instructor", "evaluator")
	check_batch(text(batch, "Batch"))
	ready, not_yet = batch_finishers(batch)
	return {"ready": len(ready), "not_yet": len(not_yet), "title": frappe.db.get_value("LMS Batch", batch, "title")}


@frappe.whitelist(methods=["POST"])
def give_batch_certificates(batch: str):
	require("instructor", "evaluator")
	check_batch(text(batch, "Batch"))
	ready, _not_yet = batch_finishers(batch)
	courses = frappe.get_all("Batch Course", {"parent": batch, "parenttype": "LMS Batch"}, pluck="course")
	n = 0
	for m in ready:
		for c in courses:
			if not frappe.db.exists("LMS Certificate", {"member": m, "course": c}):
				give(m, c, today(), batch)
				n += 1
	return {"given": n, "list": certificates_list()}


@frappe.whitelist(methods=["POST"])
def revoke_certificate(certificate: str):
	require("instructor", "evaluator")
	frappe.delete_doc("LMS Certificate", text(certificate, "Certificate"))
	return certificates_list()


# ---- people (moderators) ----


@frappe.whitelist()
def people(role: str | None = None, query: str = ""):
	require()  # moderators only
	if not roles()["moderator"]:
		raise frappe.PermissionError(_("Only moderators manage people."))
	filters = {"enabled": 1, "name": ["not in", ["Administrator", "Guest"]]}
	if query:
		filters["full_name"] = ["like", f"%{cstr(query)[:60]}%"]
	users = frappe.get_all("User", filters, ["name", "full_name", "user_image", "creation", "user_type"], order_by="creation desc", limit=500)
	have = {}
	for r in frappe.get_all("Has Role", {"parent": ["in", [u.name for u in users] or ["-"]], "role": ["in", ROLES + ["System Manager"]]}, ["parent", "role"]):
		have.setdefault(r.parent, []).append(r.role)
	out = []
	for u in users:
		rs = have.get(u.name, [])
		if role and role not in rs:
			continue
		out.append({"id": u.name, "name": u.full_name or u.name, "email": u.name, "roles": rs, "since": frappe.utils.formatdate(u.creation, "MMMM yyyy"), "since_sort": str(u.creation), "avatar": u.user_image})
	staff = sum(1 for p in out if set(p["roles"]) & {"Course Creator", "Batch Evaluator", "Moderator", "System Manager"})
	return {"items": out, "staff": staff, "students": len(out) - staff}


@frappe.whitelist(methods=["POST"])
def set_roles(user: str, roles_list):
	require()
	if not roles()["moderator"]:
		raise frappe.PermissionError(_("Only moderators manage people."))
	user = text(user, "Person")
	wanted = set(r for r in (parse(roles_list, "Roles") or []) if r in ROLES)
	if user == frappe.session.user and "Moderator" not in wanted and "Moderator" in frappe.get_roles(user):
		frappe.throw(_("You can't take away your own moderator role."))
	doc = frappe.get_doc("User", user)
	current = {r.role for r in doc.roles}
	doc.remove_roles(*[r for r in ROLES if r in current and r not in wanted])
	doc.add_roles(*[r for r in wanted if r not in current])
	return people()


@frappe.whitelist(methods=["POST"])
def add_staff(full_name: str, email: str, roles_list):
	require()
	if not roles()["moderator"]:
		raise frappe.PermissionError(_("Only moderators manage people."))
	from frappe.utils import validate_email_address

	email = validate_email_address(cstr(email).strip().lower(), throw=True)
	if not email or "," in email:
		frappe.throw(_("Type one email address, like name@orbit-core.com."))
	wanted = [r for r in (parse(roles_list, "Roles") or []) if r in ROLES and r != "LMS Student"]
	if not wanted:
		frappe.throw(_("Pick what they can do."))
	if frappe.db.exists("User", email):
		doc = frappe.get_doc("User", email)
		doc.add_roles(*wanted)
	else:
		name = text(full_name, "Name")
		parts = name.split(" ", 1)
		doc = frappe.get_doc({"doctype": "User", "email": email, "first_name": parts[0], "last_name": parts[1] if len(parts) > 1 else "", "send_welcome_email": 1, "user_type": "System User"})
		doc.insert(ignore_permissions=True)
		doc.add_roles(*wanted)
	return people()


@frappe.whitelist(methods=["POST"])
def person_action(user: str, action: str):
	require()
	if not roles()["moderator"]:
		raise frappe.PermissionError(_("Only moderators manage people."))
	user = text(user, "Person")
	if action == "reset":
		frappe.get_doc("User", user).reset_password(send_email=True)
	elif action == "disable":
		if user == frappe.session.user:
			frappe.throw(_("You can't turn off your own account."))
		frappe.db.set_value("User", user, "enabled", 0)
	else:
		frappe.throw(_("Unknown action."))
	return people()


# ---- statistics ----


@frappe.whitelist()
def statistics():
	require("instructor")
	firsts = []
	d = getdate(today()).replace(day=1)
	for _i in range(12):
		firsts.insert(0, d)
		d = (d - timedelta(days=1)).replace(day=1)
	students = frappe.get_all("Has Role", {"role": "LMS Student", "parenttype": "User"}, pluck="parent")
	created = frappe.get_all("User", {"name": ["in", students or ["-"]]}, ["creation"])
	signups = []
	for i, f in enumerate(firsts):
		end = firsts[i + 1] if i + 1 < len(firsts) else add_days(today(), 1)
		signups.append({"label": f.strftime("%b"), "value": sum(1 for u in created if f <= getdate(u.creation) < getdate(end))})
	month_start = firsts[-1]
	prev_start = firsts[-2]
	enrol_now = frappe.db.count("LMS Enrollment", {"creation": [">=", str(month_start)]})
	enrol_prev = frappe.db.count("LMS Enrollment", {"creation": ["between", [str(prev_start), str(add_days(month_start, -1))]]})
	lessons_now = frappe.db.count("LMS Course Progress", {"creation": [">=", str(month_start)]})
	top = {}
	for e in frappe.get_all("LMS Enrollment", fields=["course"]):
		top[e.course] = top.get(e.course, 0) + 1
	titles = dict(frappe.get_all("LMS Course", {"name": ["in", list(top) or ["-"]]}, ["name", "title"], as_list=True))
	return {
		"students": len(students), "new_students": signups[-1]["value"], "enrolments": enrol_now, "enrolments_diff": enrol_now - enrol_prev,
		"lessons": lessons_now, "certificates": frappe.db.count("LMS Certificate", {"issue_date": [">=", str(month_start)]}),
		"signups": signups, "courses": [{"label": titles.get(c, c), "value": n} for c, n in sorted(top.items(), key=lambda x: -x[1])[:8]],
	}


# ---- settings (moderators) ----


@frappe.whitelist()
def settings_page():
	require()
	if not roles()["moderator"]:
		raise frappe.PermissionError(_("Only moderators change settings."))
	from frappe.website.utils import is_signup_disabled

	return {
		"guest_access": bool(cint(frappe.db.get_single_value("LMS Settings", "allow_guest_access"))),
		"signup": not is_signup_disabled(),
		"certified_members": bool(cint(frappe.db.get_single_value("LMS Settings", "certified_members"))),
		"app_name": frappe.db.get_single_value("Website Settings", "app_name") or "OrbiTutor",
		"categories": frappe.get_all("LMS Category", pluck="category", order_by="category asc") if frappe.db.table_exists("LMS Category") else [],
		"join_email": frappe.conf.get("orbitutor_email") or "orbitutor@orbit-core.com",
		"whatsapp": frappe.conf.get("orbitutor_whatsapp") or "https://wa.me/60102345601",
	}


@frappe.whitelist(methods=["POST"])
def save_settings(values):
	require()
	if not roles()["moderator"]:
		raise frappe.PermissionError(_("Only moderators change settings."))
	v = parse(values, "Settings") or {}
	if "guest_access" in v:
		frappe.db.set_single_value("LMS Settings", "allow_guest_access", 1 if v["guest_access"] else 0)
	if "certified_members" in v:
		frappe.db.set_single_value("LMS Settings", "certified_members", 1 if v["certified_members"] else 0)
	if "signup" in v:
		frappe.db.set_single_value("Website Settings", "disable_signup", 0 if v["signup"] else 1)
	if v.get("app_name"):
		frappe.db.set_single_value("Website Settings", "app_name", text(v["app_name"], "Name"))
	if isinstance(v.get("categories"), list):
		have = set(frappe.get_all("LMS Category", pluck="category"))
		want = [cstr(c).strip() for c in v["categories"] if cstr(c).strip()]
		for c in want:
			if c not in have:
				frappe.get_doc({"doctype": "LMS Category", "category": c}).insert()
	frappe.clear_cache()
	return settings_page()
