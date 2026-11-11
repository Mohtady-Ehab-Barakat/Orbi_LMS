import frappe


def get_announcements(batch):
	return [frappe._dict(r) for r in frappe.DB.match("Communication", {"reference_name": batch})]


@frappe.whitelist()
def get_notifications(filters=None):
	rows = frappe.get_all(
		"Notification Log",
		{"for_user": frappe.session.user},
		["name", "subject", "from_user", "link", "read", "creation", "type"],
		order_by="creation desc",
		limit=50,
	)
	for n in rows:
		u = frappe.db.get_value("User", n.from_user, ["full_name", "user_image", "username"], as_dict=True) if n.from_user else None
		n["from_user_details"] = u or {}
		n.pop("from_user", None)
	return rows


# ---- exercises ----
def _staff():
	return bool({"Moderator", "Course Creator", "Batch Evaluator"} & set(frappe.get_roles()))


def get_programming_exercise(exercise):
	doc = frappe.get_doc("LMS Programming Exercise", exercise)
	return {
		"name": doc.name, "title": doc.title, "language": doc.language, "problem_statement": doc.problem_statement, "starter_code": doc.starter_code,
		"test_cases": [{"idx": c.idx, "input": c.input, "hidden": c.hidden, "expected_output": "" if (c.hidden and not _staff()) else c.expected_output} for c in doc.test_cases],
	}


def evaluate_programming_exercise(exercise, outputs):
	doc = frappe.get_doc("LMS Programming Exercise", exercise)
	if len(outputs) != len(doc.test_cases):
		frappe.throw(f"Expected {len(doc.test_cases)} outputs, got {len(outputs)}")
	return [
		{"idx": c.idx, "status": "Passed" if str(o or "").strip() == str(c.expected_output or "").strip() else "Failed", "hidden": c.hidden, "output": str(o or "").strip(),
		 "expected_output": "" if (c.hidden and not _staff()) else c.expected_output}
		for c, o in zip(doc.test_cases, outputs)
	]


# ---- the outline, as Frappe Learning changes it ----
def _can(course):
	from lms.lms.utils import can_modify_course

	if not can_modify_course(course):
		frappe.throw("You do not have permission to modify this chapter.", frappe.PermissionError)


def _reindex(doctype, parent, names, key):
	for i, n in enumerate(names, start=1):
		for r in frappe.DB.match(doctype, {"parent": parent, key: n}):
			r["idx"] = i


def upsert_chapter(title, course, is_scorm_package=False, scorm_package=None, name=None):
	_can(course)
	if name:
		frappe.db.set_value("Course Chapter", name, "title", title)
		return frappe.get_doc("Course Chapter", name)
	n = len(frappe.DB.match("Chapter Reference", {"parent": course}))
	ch = frappe.DB.insert("Course Chapter", {"title": title, "course": course})
	frappe.DB.insert("Chapter Reference", {"parent": course, "parenttype": "LMS Course", "parentfield": "chapters", "chapter": ch["name"], "idx": n + 1})
	return ch


def update_chapter_index(chapter, course, idx):
	_can(course)
	names = frappe.get_all("Chapter Reference", {"parent": course}, pluck="chapter", order_by="idx")
	if chapter in names:
		names.remove(chapter)
	names.insert(idx, chapter)
	_reindex("Chapter Reference", course, names, "chapter")


def delete_chapter(chapter):
	course = frappe.db.get_value("Course Chapter", chapter, "course")
	_can(course)
	for l in frappe.get_all("Course Lesson", {"chapter": chapter}, pluck="name"):
		frappe.db.delete("Course Lesson", l)
	frappe.db.delete("Lesson Reference", {"parent": chapter})
	frappe.db.delete("Chapter Reference", {"chapter": chapter})
	frappe.db.delete("Course Chapter", chapter)


def create_lesson(chapter, title=None, content=None):
	course = frappe.db.get_value("Course Chapter", chapter, "course")
	if not course:
		frappe.throw("Invalid chapter.")
	_can(course)
	n = len(frappe.DB.match("Lesson Reference", {"parent": chapter}))
	l = frappe.DB.insert("Course Lesson", {"title": title or "Untitled lesson", "chapter": chapter, "course": course, "content": None, "include_in_preview": 0})
	frappe.DB.insert("Lesson Reference", {"parent": chapter, "parenttype": "Course Chapter", "parentfield": "lessons", "lesson": l["name"], "idx": n + 1})
	return l["name"]


def update_lesson_index(lesson, sourceChapter, targetChapter, idx):
	_can(frappe.db.get_value("Course Chapter", sourceChapter, "course"))
	src = frappe.get_all("Lesson Reference", {"parent": sourceChapter}, pluck="lesson", order_by="idx")
	src.remove(lesson)
	if sourceChapter == targetChapter:
		src.insert(idx, lesson)
		_reindex("Lesson Reference", sourceChapter, src, "lesson")
		return
	frappe.db.delete("Lesson Reference", {"parent": sourceChapter, "lesson": lesson})
	_reindex("Lesson Reference", sourceChapter, src, "lesson")
	dst = frappe.get_all("Lesson Reference", {"parent": targetChapter}, pluck="lesson", order_by="idx")
	dst.insert(idx, lesson)
	frappe.DB.insert("Lesson Reference", {"parent": targetChapter, "parenttype": "Course Chapter", "parentfield": "lessons", "lesson": lesson})
	_reindex("Lesson Reference", targetChapter, dst, "lesson")
	frappe.db.set_value("Course Lesson", lesson, {"chapter": targetChapter, "course": frappe.db.get_value("Course Chapter", targetChapter, "course")})


def delete_lesson(lesson, chapter):
	_can(frappe.db.get_value("Course Chapter", chapter, "course"))
	names = frappe.get_all("Lesson Reference", {"parent": chapter}, pluck="lesson", order_by="idx")
	if lesson not in names:
		frappe.throw("This lesson is not in that chapter.")
	names.remove(lesson)
	frappe.db.delete("Lesson Reference", {"parent": chapter, "lesson": lesson})
	_reindex("Lesson Reference", chapter, names, "lesson")
	frappe.db.delete("LMS Course Progress", {"lesson": lesson})
	frappe.db.delete("Course Lesson", lesson)


def save_evaluation_details(member, course, date_value, start_time, end_time, status, batch_name=None, rating=0, summary=None):
	frappe.only_for(["Batch Evaluator", "Moderator"])
	name = frappe.db.get_value("LMS Certificate Evaluation", {"member": member, "course": course}, "name")
	values = {"member": member, "course": course, "date": date_value, "start_time": start_time, "end_time": end_time, "status": status, "batch_name": batch_name, "summary": summary, "evaluator": frappe.session.user}
	if name:
		frappe.db.set_value("LMS Certificate Evaluation", name, values)
	else:
		frappe.DB.insert("LMS Certificate Evaluation", values)
