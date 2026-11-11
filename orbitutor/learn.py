"""The student screens past Home, courses and lessons: the schedule, a batch, quizzes,
assignments, coding exercises, evaluations, certificates, profiles and settings.

Each method puts together what one screen shows, in the shape its design system component
takes. Writes go through Frappe's documents with the student's own permissions, so Frappe
Learning's checks (who may submit what, duplicate submissions, booking rules) still apply.
"""

import json
from datetime import datetime, timedelta
from urllib.parse import quote
from zoneinfo import ZoneInfo

import frappe
from frappe import _
from frappe.utils import add_days, cint, cstr, flt, get_datetime, getdate, now_datetime, strip_html, today

from orbitutor.api import TRACK_IDS, course_rows, system_timezone, zoned

ASSIGNMENT_TYPES = {"Document": "document", "PDF": "pdf", "URL": "link", "Image": "image", "Text": "text"}
MARKING = {"Not Graded": "submitted", "Pass": "passed", "Fail": "failed", "Not Applicable": "submitted"}
QUESTION_TYPES = {"User Input": "typed", "Open Ended": "open"}
STAFF_ROLES = {"Moderator", "Course Creator", "Batch Evaluator", "System Manager"}


def signed_in() -> str:
	if frappe.session.user == "Guest":
		raise frappe.PermissionError(_("Sign in to see this."))
	return frappe.session.user


def is_staff(user: str | None = None) -> bool:
	return bool(STAFF_ROLES & set(frappe.get_roles(user or frappe.session.user)))


def text(value, name: str):
	if not isinstance(value, str) or not value.strip() or len(value) > 140:
		frappe.throw(_("{0} must be text.").format(name))
	return value.strip()


def track_of(course: str | None):
	if not course:
		return None
	return TRACK_IDS.get(frappe.db.get_value("LMS Course", course, "orbitutor_track") or "")


def person(user: str | None, role: str | None = None):
	if not user:
		return None
	row = frappe.db.get_value("User", user, ["full_name", "user_image", "username"], as_dict=True)
	if not row:
		return None
	out = {"name": row.full_name or user, "src": row.user_image or None, "username": row.username}
	if role:
		out["role"] = role
	return out


def my_batches(user: str) -> list:
	return frappe.get_all("LMS Batch Enrollment", {"member": user}, pluck="batch")


def iso(dt) -> str | None:
	return dt.isoformat() if dt else None


def system_iso(value) -> str | None:
	"""A system-time Datetime (Frappe keeps them in the site's time zone) as ISO with its offset."""
	if not value:
		return None
	return get_datetime(value).replace(tzinfo=ZoneInfo(system_timezone())).isoformat()


def time_text(t) -> str:
	if not t:
		return ""
	t = str(t)[:5]
	hh, mm = int(t[:2]), t[3:5]
	return f"{hh % 12 or 12}:{mm} {'pm' if hh >= 12 else 'am'}"


def lesson_href(lesson: str | None):
	"""The OrbiTutor address of a lesson, and its title and course."""
	if not lesson:
		return None
	from lms.lms.utils import get_lesson_index

	row = frappe.db.get_value("Course Lesson", lesson, ["name", "title", "course"], as_dict=True)
	if not row:
		return None
	number = get_lesson_index(row.name)
	return {"title": row.title, "course": row.course, "href": f"/course/{row.course}/learn/{number}" if number else f"/course/{row.course}"}


def course_title(course: str | None):
	return frappe.db.get_value("LMS Course", course, "title") if course else None


# ---- the schedule ----


def live_class_events(batches: list, since=None, until=None) -> list:
	if not batches:
		return []
	filters = {"batch_name": ["in", batches], "date": [">=", since or add_days(today(), -14)]}
	if until:
		filters["date"] = ["between", [since or add_days(today(), -14), until]]
	rows = frappe.get_all(
		"LMS Live Class",
		filters=filters,
		fields=["name", "title", "description", "date", "time", "duration", "join_url", "timezone", "batch_name"],
		order_by="date asc, time asc",
	)
	zones = dict(frappe.get_all("LMS Batch", {"name": ["in", batches]}, ["name", "timezone"], as_list=True))
	titles = dict(frappe.get_all("LMS Batch", {"name": ["in", batches]}, ["name", "title"], as_list=True))
	out = []
	for r in rows:
		starts = zoned(r.date, r.time, r.timezone or zones.get(r.batch_name))
		out.append(
			{
				"id": r.name,
				"title": r.title,
				"description": strip_html(r.description or "")[:400] or None,
				"start": starts.isoformat(),
				"minutes": cint(r.duration) or 60,
				"joinHref": r.join_url or None,
				"batch": titles.get(r.batch_name),
				"batch_name": r.batch_name,
			}
		)
	return out


def assessment_rows(batch: str, user: str) -> list:
	"""The quizzes, assignments and exercises that count in a batch, with whether this student has done them."""
	rows = frappe.get_all("LMS Assessment", {"parent": batch, "parenttype": "LMS Batch"}, ["name", "assessment_type", "assessment_name"], order_by="idx asc")
	out = []
	for a in rows:
		kind, href, title, due, done, status = None, None, None, None, False, None
		if a.assessment_type == "LMS Quiz":
			q = frappe.db.get_value("LMS Quiz", a.assessment_name, ["title", "enable_scheduling", "schedule_end", "passing_percentage"], as_dict=True)
			if not q:
				continue
			kind, href, title = "quiz", f"/quiz/{a.assessment_name}", q.title
			due = system_iso(q.schedule_end) if q.enable_scheduling else None
			best = frappe.get_all("LMS Quiz Submission", {"quiz": a.assessment_name, "member": user}, ["percentage"], order_by="percentage desc", limit=1)
			done = bool(best)
			status = ("passed" if flt(best[0].percentage) >= flt(q.passing_percentage) else "failed") if best else None
		elif a.assessment_type == "LMS Assignment":
			q = frappe.db.get_value("LMS Assignment", a.assessment_name, ["title", "enable_scheduling", "schedule_end"], as_dict=True)
			if not q:
				continue
			kind, href, title = "assignment", f"/assignment/{a.assessment_name}", q.title
			due = system_iso(q.schedule_end) if q.enable_scheduling else None
			sub = frappe.db.get_value("LMS Assignment Submission", {"assignment": a.assessment_name, "member": user}, "status")
			done = bool(sub)
			status = MARKING.get(sub) if sub else None
		elif a.assessment_type == "LMS Programming Exercise":
			q = frappe.db.get_value("LMS Programming Exercise", a.assessment_name, ["title"], as_dict=True)
			if not q:
				continue
			kind, href, title = "code", f"/exercise/{a.assessment_name}", q.title
			sub = frappe.db.get_value("LMS Programming Exercise Submission", {"exercise": a.assessment_name, "member": user}, "status")
			done = sub == "Passed"
			status = "passed" if sub == "Passed" else "failed" if sub else None
		else:
			continue
		out.append({"id": a.name, "kind": kind, "title": title, "href": href, "due": due, "done": done, "status": status})
	return out


def evaluation_events(user: str) -> list:
	rows = frappe.get_all(
		"LMS Certificate Request",
		{"member": user, "status": "Upcoming"},
		["name", "course", "course_title", "date", "start_time", "end_time", "google_meet_link", "evaluator", "evaluator_name", "batch_name"],
		order_by="date asc",
	)
	out = []
	for r in rows:
		start = zoned(r.date, r.start_time, None)
		end = zoned(r.date, r.end_time, None) if r.end_time else start + timedelta(minutes=30)
		out.append(
			{
				"id": r.name,
				"kind": "evaluation",
				"title": "Evaluation: " + (r.course_title or course_title(r.course) or ""),
				"course": r.course_title,
				"track": track_of(r.course),
				"start": start.isoformat(),
				"end": end.isoformat(),
				"joinHref": r.google_meet_link or None,
				"href": f"/batch/{r.batch_name}#evaluation" if r.batch_name else None,
			}
		)
	return out


@frappe.whitelist()
def schedule():
	user = signed_in()
	batches = my_batches(user)
	events = []
	for c in live_class_events(batches):
		events.append({"id": c["id"], "kind": "live", "title": c["title"], "start": c["start"], "minutes": c["minutes"], "joinHref": c["joinHref"], "where": c["batch"], "href": f"/batch/{c['batch_name']}"})
	for b in batches:
		for a in assessment_rows(b, user):
			if a["due"]:
				events.append({"id": a["id"], "kind": "due", "title": a["title"], "start": a["due"], "href": a["href"], "status": "submitted" if a["done"] else None, "icon": a["kind"] if a["kind"] != "code" else "code"})
	events += evaluation_events(user)
	return {"events": events, "timezone": system_timezone(), "batches": batch_cards(batches)}


def batch_cards(batches: list) -> list:
	if not batches:
		return []
	rows = frappe.get_all("LMS Batch", {"name": ["in", batches]}, ["name", "title", "start_date", "end_date", "medium"], order_by="start_date desc")
	return [{"name": r.name, "title": r.title, "starts": r.start_date, "ends": r.end_date, "online": r.medium != "Offline", "href": f"/batch/{r.name}"} for r in rows]


# ---- a batch ----


def batch_access(batch: str) -> str:
	"""in: a student in it. staff: may look. none: neither."""
	from lms.lms.utils import can_modify_batch

	user = frappe.session.user
	if frappe.db.exists("LMS Batch Enrollment", {"member": user, "batch": batch}):
		return "in"
	if is_staff() and (can_modify_batch(batch) or "Moderator" in frappe.get_roles() or "Batch Evaluator" in frappe.get_roles()):
		return "staff"
	return "none"


@frappe.whitelist()
def batch_page(batch: str):
	user = signed_in()
	batch = text(batch, "Batch")
	row = frappe.db.get_value(
		"LMS Batch",
		batch,
		["name", "title", "description", "batch_details", "start_date", "end_date", "start_time", "end_time", "medium", "timezone", "evaluation", "evaluation_end_date", "certification", "published"],
		as_dict=True,
	)
	if not row:
		raise frappe.DoesNotExistError(_("We can't find that batch."))
	courses = frappe.get_all("Batch Course", {"parent": batch, "parenttype": "LMS Batch"}, ["course"], order_by="idx asc", pluck="course")
	crow = course_rows(courses)
	course_list = [{"name": c, "title": crow[c].title, "track": TRACK_IDS.get(crow[c].orbitutor_track or ""), "href": f"/course/{c}"} for c in courses if c in crow]
	access = batch_access(batch)
	if access == "none":
		return {"access": "none", "title": row.title, "courses": course_list, "published": bool(row.published)}

	instructors = [person(i, "Instructor") for i in frappe.get_all("Course Instructor", {"parent": batch, "parenttype": "LMS Batch"}, pluck="instructor")]
	students = frappe.get_all("LMS Batch Enrollment", {"batch": batch}, pluck="member")
	when = f"{time_text(row.start_time)} to {time_text(row.end_time)}" if row.start_time and row.end_time else None
	page = {
		"access": access,
		"name": row.name,
		"title": row.title,
		"description": row.batch_details or row.description,
		"courses": course_list,
		"starts": row.start_date,
		"ends": row.end_date,
		"when": when,
		"online": row.medium != "Offline",
		"where": "Online" if row.medium != "Offline" else "In person",
		"instructors": [i for i in instructors if i],
		"student_count": len(students),
		"classes": live_class_events([batch], since=row.start_date or add_days(today(), -60)),
		"timetable": timetable(batch, row),
		"assessments": assessment_rows(batch, user) if access == "in" else [],
		"announcements": batch_announcements(batch),
		"evaluation": evaluation_info(batch, row, courses, crow, user) if access == "in" and row.evaluation else None,
		"timezone": row.timezone or system_timezone(),
	}
	return page


def timetable(batch: str, row) -> list:
	rows = frappe.get_all(
		"LMS Batch Timetable",
		{"parent": batch, "parenttype": "LMS Batch"},
		["name", "reference_doctype", "reference_docname", "date", "start_time", "end_time", "milestone"],
		order_by="date asc, start_time asc",
	)
	kinds = {"Course Lesson": "lesson", "LMS Quiz": "quiz", "LMS Assignment": "assignment", "LMS Live Class": "live", "LMS Programming Exercise": "assignment"}
	out = []
	for r in rows:
		title, href = r.reference_docname, None
		if r.reference_doctype == "Course Lesson":
			info = lesson_href(r.reference_docname)
			if info:
				title, href = info["title"], info["href"]
		elif r.reference_doctype == "LMS Quiz":
			title, href = frappe.db.get_value("LMS Quiz", r.reference_docname, "title") or title, f"/quiz/{r.reference_docname}"
		elif r.reference_doctype == "LMS Assignment":
			title, href = frappe.db.get_value("LMS Assignment", r.reference_docname, "title") or title, f"/assignment/{r.reference_docname}"
		elif r.reference_doctype == "LMS Live Class":
			title = frappe.db.get_value("LMS Live Class", r.reference_docname, "title") or title
		start = zoned(r.date, r.start_time or "00:00:00", row.timezone)
		end = zoned(r.date, r.end_time, row.timezone) if r.end_time else None
		out.append({"id": r.name, "date": start.isoformat(), "end": iso(end), "kind": kinds.get(r.reference_doctype, "class"), "title": title, "href": href, "milestone": bool(r.milestone)})
	return out


def batch_announcements(batch: str) -> list:
	from orbitutor.api import announcements

	return announcements([batch], limit=20)


def evaluation_info(batch: str, row, courses: list, crow: dict, user: str):
	enabled = [c for c in courses if c in crow]
	booking = frappe.get_all(
		"LMS Certificate Request",
		{"member": user, "batch_name": batch, "status": "Upcoming"},
		["name", "course", "course_title", "date", "start_time", "end_time", "google_meet_link", "evaluator"],
		limit=1,
	)
	done = frappe.db.exists("LMS Certificate Evaluation", {"member": user, "batch_name": batch, "status": ["in", ["Pass", "Fail"]]})
	closed = bool(row.evaluation_end_date) and getdate(row.evaluation_end_date) < getdate(today())
	b = None
	if booking:
		k = booking[0]
		b = {
			"name": k.name,
			"start": zoned(k.date, k.start_time, None).isoformat(),
			"end": zoned(k.date, k.end_time, None).isoformat(),
			"courseTitle": k.course_title or course_title(k.course),
			"evaluator": person(k.evaluator),
			"joinHref": k.google_meet_link or None,
		}
	return {
		"courses": [{"id": c, "title": crow[c].title, "track": TRACK_IDS.get(crow[c].orbitutor_track or "")} for c in enabled],
		"booking": b,
		"state": "booked" if b else "done" if done else "closed" if closed else "book",
		"lastDay": row.evaluation_end_date,
	}


@frappe.whitelist()
def evaluation_slots(course: str, batch: str):
	signed_in()
	from lms.lms.doctype.course_evaluator.course_evaluator import get_schedule

	if batch_access(text(batch, "Batch")) != "in":
		raise frappe.PermissionError(_("You aren't in this batch."))
	groups = get_schedule(text(course, "Course"), batch) or []
	days = []
	for g in groups:
		slots = []
		for s in g.get("slots") or []:
			slots.append({"start": zoned(s.get("date"), s.get("start_time"), None).isoformat(), "end": zoned(s.get("date"), s.get("end_time"), None).isoformat(), "date": str(s.get("date")), "start_time": str(s.get("start_time")), "end_time": str(s.get("end_time"))})
		if slots:
			days.append({"date": g.get("display_date"), "slots": slots})
	return {"days": days, "timezone": (groups[0].get("display_timezone") if groups else None) or system_timezone()}


@frappe.whitelist(methods=["POST"])
def book_evaluation(course: str, batch: str, date: str, start_time: str, end_time: str):
	user = signed_in()
	if batch_access(text(batch, "Batch")) != "in":
		raise frappe.PermissionError(_("You aren't in this batch."))
	day = getdate(date).strftime("%A")
	doc = frappe.get_doc(
		{
			"doctype": "LMS Certificate Request",
			"course": text(course, "Course"),
			"member": user,
			"batch_name": batch,
			"date": str(getdate(date)),
			"day": day,
			"start_time": text(start_time, "Start time"),
			"end_time": text(end_time, "End time"),
		}
	)
	doc.insert()
	return doc.name


@frappe.whitelist(methods=["POST"])
def cancel_evaluation(request: str):
	user = signed_in()
	row = frappe.db.get_value("LMS Certificate Request", text(request, "Booking"), ["member", "status"], as_dict=True)
	if not row or row.member != user:
		raise frappe.PermissionError(_("That isn't your booking."))
	if row.status == "Upcoming":
		frappe.db.set_value("LMS Certificate Request", request, "status", "Cancelled")
	return True


# ---- quizzes ----


def back_link(lesson: str | None, course: str | None):
	info = lesson_href(lesson) if lesson else None
	if info:
		return {"href": info["href"], "label": info["title"]}
	if course:
		return {"href": f"/course/{course}", "label": course_title(course) or "The course"}
	return {"href": "/", "label": "Home"}


@frappe.whitelist()
def quiz_page(quiz: str, lesson: str | None = None):
	user = signed_in()
	from lms.lms.utils import get_quiz_with_questions

	quiz = text(quiz, "Quiz")
	data = get_quiz_with_questions(quiz)
	q, details = data["quiz"], data["questions_by_name"]
	questions = []
	for row in q.get("questions") or []:
		d = details.get(row.get("question"))
		if not d:
			continue
		kind = QUESTION_TYPES.get(d.get("type")) or ("multiple" if cint(d.get("multiple")) else "single")
		options = []
		if kind in ("single", "multiple"):
			for i in range(1, 11):
				value = d.get(f"option_{i}")
				if value:
					options.append({"id": str(i), "value": value, "text": value, "explanation": d.get(f"explanation_{i}") or None})
		questions.append({"id": row.get("question"), "type": kind, "lms_type": d.get("type"), "html": d.get("question"), "options": options, "marks": cint(row.get("marks")) or 1})
	attempts = frappe.get_all(
		"LMS Quiz Submission",
		{"quiz": quiz, "member": user},
		["name", "creation", "percentage", "score", "score_out_of"],
		order_by="creation desc",
	)
	max_attempts = cint(q.get("max_attempts"))
	lesson = lesson or q.get("lesson")
	course = q.get("course") or (frappe.db.get_value("Course Lesson", lesson, "course") if lesson else None)
	pass_mark = cint(q.get("passing_percentage"))
	reason = q.get("schedule_block_reason")
	return {
		"name": quiz,
		"title": q.get("title"),
		"course": course_title(course),
		"track": track_of(course),
		"questions": questions,
		"question_count": cint(q.get("limit_questions_to")) or len(questions),
		"limit": cint(q.get("limit_questions_to")) or None,
		"shuffle": bool(q.get("shuffle_questions")),
		"mode": "practice" if q.get("show_answers") else "exam",
		"show_answers": bool(q.get("show_answers")),
		"time_limit": cint(q.get("duration")) or None,
		"pass_mark": pass_mark or None,
		"attempts_total": max_attempts or None,
		"attempts_left": max(max_attempts - len(attempts), 0) if max_attempts else None,
		"attempts": [{"date": system_iso(a.creation), "percentage": cint(a.percentage), "passed": cint(a.percentage) >= pass_mark if pass_mark else None, "submission": a.name} for a in attempts],
		"negative_marks": cint(q.get("marks_to_cut")) if q.get("enable_negative_marking") else None,
		"opens_at": system_iso(q.get("schedule_start")) if q.get("enable_scheduling") else None,
		"closes_at": system_iso(q.get("schedule_end")) if q.get("enable_scheduling") else None,
		"blocked": reason or None,
		"has_written": any(x["type"] == "open" for x in questions),
		"back": back_link(lesson, course),
	}


@frappe.whitelist()
def quiz_review(submission: str):
	"""One attempt, question by question, for the results screen."""
	user = signed_in()
	sub = frappe.db.get_value("LMS Quiz Submission", text(submission, "Attempt"), ["name", "quiz", "member", "score", "score_out_of", "percentage", "passing_percentage"], as_dict=True)
	if not sub or (sub.member != user and not is_staff()):
		raise frappe.PermissionError(_("That isn't your quiz."))
	show = cint(frappe.db.get_value("LMS Quiz", sub.quiz, "show_answers"))
	rows = frappe.get_all("LMS Quiz Result", {"parent": sub.name, "parenttype": "LMS Quiz Submission"}, ["question", "question_name", "answer", "is_correct", "marks", "marks_out_of", "question_type"], order_by="idx asc")
	items = []
	for i, r in enumerate(rows):
		open_q = r.question_type == "Open Ended"
		answer = strip_html(r.answer or "") if open_q else r.answer
		item = {
			"number": i + 1,
			"html": r.question,
			"state": "skipped" if not cstr(r.answer).strip() else ("pending" if open_q and not cint(r.marks) else "right" if cint(r.is_correct) or (open_q and cint(r.marks)) else "wrong"),
			"marks": cint(r.marks),
			"outOf": cint(r.marks_out_of),
			"yourAnswer": answer or None,
		}
		if show and not open_q and r.question_name:
			q = frappe.db.get_value("LMS Question", r.question_name, ["type"] + [f"option_{n}" for n in range(1, 11)] + [f"is_correct_{n}" for n in range(1, 11)] + [f"possibility_{n}" for n in range(1, 11)], as_dict=True)
			if q:
				if q.type == "User Input":
					item["correctAnswer"] = ", ".join(x for x in (q.get(f"possibility_{n}") for n in range(1, 11)) if x)
				else:
					item["correctAnswer"] = ", ".join(q.get(f"option_{n}") for n in range(1, 11) if q.get(f"option_{n}") and cint(q.get(f"is_correct_{n}")))
		items.append(item)
	return {"review": items, "show_answers": bool(show)}


# ---- assignments ----


def assignment_status(sub) -> str:
	if not sub:
		return "todo"
	return MARKING.get(sub.status, "submitted")


@frappe.whitelist()
def assignment_page(assignment: str, lesson: str | None = None):
	user = signed_in()
	from lms.lms.utils import get_assignment

	assignment = text(assignment, "Assignment")
	a = get_assignment(assignment)
	sub = frappe.get_all(
		"LMS Assignment Submission",
		{"assignment": assignment, "member": user},
		["name", "status", "comments", "evaluator", "assignment_attachment", "answer", "creation", "modified", "lesson", "type"],
		limit=1,
	)
	sub = sub[0] if sub else None
	lesson = lesson or (sub.lesson if sub else None) or frappe.db.get_value("Course Lesson", {"content": ["like", f'%"assignment": "{assignment}"%']}, "name")
	course = a.get("course") or (frappe.db.get_value("Course Lesson", lesson, "course") if lesson else None)
	submission = None
	if sub:
		kind = ASSIGNMENT_TYPES.get(a.get("type"), "document")
		if sub.assignment_attachment:
			submission = {"fileName": sub.assignment_attachment.rsplit("/", 1)[-1], "href": sub.assignment_attachment}
		elif kind == "link":
			submission = {"link": strip_html(sub.answer or "").strip()}
		else:
			submission = {"text": sub.answer or ""}
	marked = sub and sub.status in ("Pass", "Fail")
	return {
		"name": assignment,
		"title": a.get("title"),
		"course": course_title(course),
		"track": track_of(course),
		"html": a.get("question"),
		"type": ASSIGNMENT_TYPES.get(a.get("type"), "document"),
		"due": system_iso(a.get("schedule_end")) if a.get("enable_scheduling") else None,
		"opens_at": system_iso(a.get("schedule_start")) if a.get("enable_scheduling") else None,
		"blocked": a.get("schedule_block_reason") or None,
		"status": assignment_status(sub),
		"submission_name": sub.name if sub else None,
		"submission": submission,
		"submitted_at": system_iso(sub.creation) if sub else None,
		"marked_at": system_iso(sub.modified) if marked else None,
		"evaluator": person(sub.evaluator) if sub and sub.evaluator else None,
		"feedback": sub.comments if marked else None,
		"lesson": lesson,
		"back": back_link(lesson, course),
	}


@frappe.whitelist(methods=["POST"])
def submit_assignment(assignment: str, lesson: str | None = None, file_url: str | None = None, link: str | None = None, answer: str | None = None):
	user = signed_in()
	assignment = text(assignment, "Assignment")
	kind = frappe.db.get_value("LMS Assignment", assignment, "type")
	if not kind:
		raise frappe.DoesNotExistError(_("We can't find that assignment."))
	values = {}
	if kind in ("Document", "PDF", "Image"):
		if not isinstance(file_url, str) or not file_url.startswith(("/private/files/", "/files/")):
			frappe.throw(_("Choose a file to hand in."))
		if not frappe.db.exists("File", {"file_url": file_url, "owner": user}):
			raise frappe.PermissionError(_("That file isn't yours."))
		values["assignment_attachment"] = file_url
	elif kind == "URL":
		link = (link or "").strip()
		if not link.lower().startswith(("http://", "https://")) or len(link) > 2000:
			frappe.throw(_("Paste a link that starts with https://"))
		values["answer"] = link
	else:
		if not isinstance(answer, str) or not strip_html(answer).strip():
			frappe.throw(_("Write your answer first."))
		if len(answer) > 100000:
			frappe.throw(_("Your answer is too long."))
		values["answer"] = answer
	name = frappe.db.get_value("LMS Assignment Submission", {"assignment": assignment, "member": user}, "name")
	if name:
		doc = frappe.get_doc("LMS Assignment Submission", name)
		if doc.status in ("Pass", "Fail"):
			frappe.throw(_("This has been marked. Ask your instructor if you'd like to hand it in again."))
		doc.update(values)
		doc.save()
	else:
		doc = frappe.get_doc({"doctype": "LMS Assignment Submission", "assignment": assignment, "member": user, "lesson": lesson or None, **values})
		doc.insert()
	if values.get("assignment_attachment"):
		file = frappe.db.get_value("File", {"file_url": file_url, "owner": user}, "name")
		if file:
			frappe.db.set_value("File", file, {"attached_to_doctype": "LMS Assignment Submission", "attached_to_name": doc.name, "attached_to_field": "assignment_attachment"})
	return assignment_page(assignment, lesson)


# ---- coding exercises ----


@frappe.whitelist()
def exercise_page(exercise: str, lesson: str | None = None):
	user = signed_in()
	from lms.lms.api import get_programming_exercise

	exercise = text(exercise, "Exercise")
	e = get_programming_exercise(exercise)
	last = frappe.get_all(
		"LMS Programming Exercise Submission",
		{"exercise": exercise, "member": user},
		["name", "code", "status", "modified"],
		order_by="modified desc",
		limit=1,
	)
	results = None
	if last:
		cases = frappe.get_all("LMS Test Case Submission", {"parent": last[0].name}, ["status", "output"], order_by="idx asc")
		results = [{"passed": c.status == "Passed", "output": c.output} for c in cases] or None
	runner = frappe.db.get_single_value("LMS Settings", "livecode_url") or None
	return {
		"name": exercise,
		"title": e.get("title"),
		"html": e.get("problem_statement"),
		"language": (e.get("language") or "Python").lower(),
		"starter_code": e.get("starter_code") or "",
		"code": last[0].code if last else None,
		"tests": [{"input": cstr(t.get("input")), "expected": cstr(t.get("expected_output")), "hidden": bool(t.get("hidden"))} for t in e.get("test_cases") or []],
		"results": results,
		"runner": runner,
		"back": back_link(lesson, None),
	}


@frappe.whitelist(methods=["POST"])
def save_exercise_run(exercise: str, code: str, outputs):
	"""Score a run on the server (the browser ran the code) and keep it as their submission."""
	user = signed_in()
	from lms.lms.api import evaluate_programming_exercise

	exercise = text(exercise, "Exercise")
	if isinstance(outputs, str):
		outputs = json.loads(outputs)
	if not isinstance(code, str) or len(code) > 100000:
		frappe.throw(_("Your code is too long."))
	scored = evaluate_programming_exercise(exercise, outputs)
	inputs = frappe.get_all("LMS Test Case", {"parent": exercise}, ["input"], order_by="idx asc")
	cases = [
		# expected_output as Frappe Learning gives it to this person: blank for hidden tests
		{"input": inputs[i].input if i < len(inputs) else "", "output": s.get("output"), "expected_output": s.get("expected_output") or "", "status": s.get("status")}
		for i, s in enumerate(scored)
	]
	status = "Passed" if cases and all(c["status"] == "Passed" for c in cases) else "Failed"
	name = frappe.db.get_value("LMS Programming Exercise Submission", {"exercise": exercise, "member": user}, "name")
	if name:
		doc = frappe.get_doc("LMS Programming Exercise Submission", name)
		doc.code, doc.status = code, status
		doc.set("test_cases", cases)
	else:
		doc = frappe.get_doc({"doctype": "LMS Programming Exercise Submission", "exercise": exercise, "member": user, "code": code, "status": status, "test_cases": cases})
	doc.flags.graded_on_server = True
	# students may not write this doctype themselves in Frappe Learning; the scoring above is the server's
	doc.save(ignore_permissions=True) if name else doc.insert(ignore_permissions=True)
	return {"results": [{"passed": s.get("status") == "Passed", "output": s.get("output")} for s in scored], "status": status}


# ---- certificates ----


@frappe.whitelist()
def certificates():
	user = signed_in()
	rows = frappe.get_all("LMS Certificate", {"member": user}, ["name", "course", "course_title", "issue_date", "expiry_date", "batch_name", "batch_title", "published"], order_by="issue_date desc")
	name = frappe.db.get_value("User", user, "full_name")
	items = [
		{
			"id": r.name,
			"course": r.course_title or course_title(r.course),
			"track": track_of(r.course),
			"name": name,
			"issued": r.issue_date,
			"expires": r.expiry_date,
			"batch": r.batch_title,
			"viewHref": f"/certificate/{r.name}",
			"pdfHref": pdf_href(r.name),
			"shareUrl": frappe.utils.get_url(f"/certificate/{r.name}"),
			"public": bool(r.published),
		}
		for r in rows
	]
	certified = {r.course for r in rows}
	going = []
	for e in frappe.get_all("LMS Enrollment", {"member": user}, ["course", "progress"]):
		if e.course in certified:
			continue
		c = frappe.db.get_value("LMS Course", e.course, ["title", "enable_certification", "orbitutor_track", "lessons"], as_dict=True)
		if not c or not c.enable_certification:
			continue
		left = round(cint(c.lessons) * (100 - flt(e.progress)) / 100)
		going.append({"title": c.title, "track": TRACK_IDS.get(c.orbitutor_track or ""), "progress": round(flt(e.progress)), "left": left, "href": f"/course/{e.course}"})
	return {"items": items, "in_progress": going}


def pdf_href(name: str) -> str:
	template = frappe.db.get_value("LMS Certificate", name, "template")
	q = f"doctype=LMS%20Certificate&name={quote(name)}&no_letterhead=1"
	if template:
		q += "&format=" + quote(template)
	return "/api/method/frappe.utils.print_format.download_pdf?" + q


@frappe.whitelist(allow_guest=True)
def certificate(name: str):
	"""The certificate's own page. Anyone with the link sees a published one; its owner and staff always."""
	if not isinstance(name, str) or len(name) > 140:
		return {"status": "notfound"}
	row = frappe.db.get_value(
		"LMS Certificate",
		name,
		["name", "member", "member_name", "course", "course_title", "issue_date", "expiry_date", "batch_name", "batch_title", "evaluator", "evaluator_name", "published"],
		as_dict=True,
	)
	user = frappe.session.user
	own = row and row.member == user
	if not row or not (row.published or own or (user != "Guest" and is_staff())):
		return {"status": "notfound"}
	expired = bool(row.expiry_date) and getdate(row.expiry_date) < getdate(today())
	instructor = frappe.get_all("Course Instructor", {"parent": row.course, "parenttype": "LMS Course"}, pluck="instructor", limit=1)
	ins = person(instructor[0], "Instructor") if instructor else None
	return {
		"status": "expired" if expired else "valid",
		"own": bool(own),
		"certificate": {
			"id": row.name,
			"name": row.member_name or frappe.db.get_value("User", row.member, "full_name"),
			"course": row.course_title or course_title(row.course),
			"track": track_of(row.course),
			"issued": row.issue_date,
			"expires": row.expiry_date,
			"batch": row.batch_title,
			"evaluator": row.evaluator_name,
			"instructor": {"name": ins["name"], "role": "Instructor"} if ins else None,
			"checkUrl": frappe.utils.get_url(f"/certificate/{row.name}"),
			"pdfHref": pdf_href(row.name) if own or is_staff() else None,
		},
	}


# ---- profiles ----


@frappe.whitelist()
def profile(username: str | None = None):
	me = signed_in()
	user = me if not username else frappe.db.get_value("User", {"username": text(username, "Username"), "enabled": 1}, "name")
	if not user:
		raise frappe.DoesNotExistError(_("We can't find that person."))
	row = frappe.db.get_value("User", user, ["full_name", "user_image", "bio", "creation", "email", "username"], as_dict=True)
	own = user == me
	certs = frappe.get_all("LMS Certificate", {"member": user, **({} if own else {"published": 1})}, ["name", "course", "course_title", "issue_date"], order_by="issue_date desc")
	enrol = frappe.get_all("LMS Enrollment", {"member": user}, ["course", "progress", "modified"], order_by="modified desc")
	crow = course_rows([e.course for e in enrol])
	finished, going, projects = [], [], []
	for e in enrol:
		c = crow.get(e.course)
		if not c:
			continue
		track = TRACK_IDS.get(c.orbitutor_track or "")
		if flt(e.progress) >= 100:
			finished.append({"title": c.title, "track": track, "finishedAt": system_iso(e.modified), "href": f"/course/{c.name}"})
			if c.orbitutor_project:
				projects.append({"id": c.name, "title": c.orbitutor_project, "course": c.title, "track": track, "finishedAt": system_iso(e.modified), "image": c.image, "href": c.orbitutor_project_url or f"/course/{c.name}"})
		elif own:
			going.append({"title": c.title, "track": track, "progress": round(flt(e.progress)), "href": f"/course/{c.name}"})
	batch = frappe.get_all("LMS Batch Enrollment", {"member": user}, ["batch"], order_by="creation desc", limit=1)
	return {
		"own": own,
		"user": {
			"name": row.full_name,
			"image": row.user_image,
			"bio": row.bio,
			"joinedAt": system_iso(row.creation),
			"batch": frappe.db.get_value("LMS Batch", batch[0].batch, "title") if batch else None,
			"email": row.email if own else None,
			"username": row.username,
		},
		"certificates": [{"id": c.name, "course": c.course_title or course_title(c.course), "issuedAt": c.issue_date, "href": f"/certificate/{c.name}"} for c in certs],
		"finished": finished,
		"in_progress": going,
		"projects": projects,
	}


@frappe.whitelist()
def settings():
	user = signed_in()
	row = frappe.db.get_value("User", user, ["full_name", "user_image", "bio", "email", "desk_theme", "last_password_reset_date"], as_dict=True)
	from orbitutor.api import login_providers

	sso = bool(frappe.get_all("User Social Login", {"parent": user}, limit=1)) if login_providers() else False
	return {
		"user": {"name": row.full_name, "image": row.user_image, "bio": row.bio, "email": row.email},
		"theme": {"Dark": "night", "Light": "day", "Automatic": "system"}.get(row.desk_theme or "", "night"),
		"method": "both" if sso else "password",
		"password_changed_at": row.last_password_reset_date,
	}


@frappe.whitelist(methods=["POST"])
def save_profile(full_name: str, bio: str | None = None, image: str | None = None, remove_photo: bool = False):
	user = signed_in()
	name = text(full_name, "Your name")
	if bio is not None and (not isinstance(bio, str) or len(bio) > 280):
		frappe.throw(_("Keep it to 280 characters."))
	doc = frappe.get_doc("User", user)
	parts = name.split(" ", 1)
	doc.first_name, doc.last_name = parts[0], parts[1] if len(parts) > 1 else ""
	doc.bio = (bio or "").strip()
	if cint(remove_photo):
		doc.user_image = None
	elif image:
		if not isinstance(image, str) or not image.startswith("/files/") or not frappe.db.exists("File", {"file_url": image, "owner": user}):
			frappe.throw(_("Upload the photo again."))
		doc.user_image = image
	doc.save(ignore_permissions=True)
	return settings()


@frappe.whitelist(methods=["POST"])
def set_theme(theme: str):
	user = signed_in()
	value = {"night": "Dark", "day": "Light", "system": "Automatic"}.get(theme)
	if not value:
		frappe.throw(_("Pick night, day or system."))
	frappe.db.set_value("User", user, "desk_theme", value)
	return theme


@frappe.whitelist(methods=["POST"])
def sign_out_others():
	user = signed_in()
	from frappe.sessions import clear_sessions

	clear_sessions(user, keep_current=True)
	return True


# ---- what's inside a lesson ----


@frappe.whitelist()
def lesson_activities(lesson: str):
	"""Titles and how the student is doing on the quizzes, assignments and exercises in a lesson."""
	user = signed_in()
	content = frappe.db.get_value("Course Lesson", text(lesson, "Lesson"), "content")
	try:
		blocks = (json.loads(content) if content else {}).get("blocks") or []
	except ValueError:
		blocks = []
	out = {}
	for b in blocks:
		d, t = b.get("data") or {}, b.get("type")
		if t == "quiz" and d.get("quiz"):
			q = frappe.db.get_value("LMS Quiz", d["quiz"], ["title", "passing_percentage", "duration", "max_attempts"], as_dict=True)
			if not q:
				continue
			best = frappe.get_all("LMS Quiz Submission", {"quiz": d["quiz"], "member": user}, ["percentage"], order_by="percentage desc", limit=1)
			n = frappe.db.count("LMS Quiz Question", {"parent": d["quiz"]})
			facts = [f"{n} question{'s' if n != 1 else ''}"] + ([f"Pass mark {cint(q.passing_percentage)}%"] if cint(q.passing_percentage) else []) + ([f"{cint(q.duration)} minutes"] if cint(q.duration) else [])
			passed = best and cint(best[0].percentage) >= cint(q.passing_percentage)
			out[f"quiz:{d['quiz']}"] = {"title": q.title, "facts": facts, "done": bool(best), "status": (f"Best {cint(best[0].percentage)}%" if best else None), "tone": "success" if passed else "warning" if best else None, "icon": "done" if passed else None}
		elif t == "assignment" and d.get("assignment"):
			a = frappe.db.get_value("LMS Assignment", d["assignment"], ["title", "type"], as_dict=True)
			if not a:
				continue
			sub = frappe.db.get_value("LMS Assignment Submission", {"assignment": d["assignment"], "member": user}, "status")
			words = {"submitted": ("Waiting to be marked", "neutral", "due"), "passed": ("Passed", "success", "done"), "failed": ("Not passed", "danger", None)}
			w = words.get(MARKING.get(sub)) if sub else None
			kinds = {"Document": "A document", "PDF": "A PDF", "URL": "A link", "Image": "A picture", "Text": "Written text"}
			out[f"assignment:{d['assignment']}"] = {"title": a.title, "facts": [f"Hand in: {kinds.get(a.type, 'a file').lower()}"], "done": bool(sub), "status": w[0] if w else None, "tone": w[1] if w else None, "icon": w[2] if w else None}
		elif t == "program" and d.get("exercise"):
			e = frappe.db.get_value("LMS Programming Exercise", d["exercise"], ["title", "language"], as_dict=True)
			if not e:
				continue
			sub = frappe.db.get_value("LMS Programming Exercise Submission", {"exercise": d["exercise"], "member": user}, "status")
			out[f"program:{d['exercise']}"] = {"title": e.title, "facts": [e.language or "Python"], "done": bool(sub), "status": ("All tests pass" if sub == "Passed" else "Some tests fail" if sub else None), "tone": "success" if sub == "Passed" else "warning" if sub else None}
	return out
