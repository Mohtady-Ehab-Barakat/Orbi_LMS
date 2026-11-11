"""submit_quiz and check_answer, as Frappe Learning v16 answers them."""
import json

import frappe


def _question(name):
	return frappe.DB.match("LMS Question", name)[0]


def _correct(q, answer):
	if q.get("type") == "Choices":
		right = {q.get(f"option_{i}") for i in range(1, 11) if q.get(f"is_correct_{i}")}
		return set(answer or []) == right
	if q.get("type") == "User Input":
		said = str((answer or [""])[0] or "").strip().lower()
		return any(said == str(q.get(f"possibility_{i}") or "").strip().lower() for i in range(1, 11) if q.get(f"possibility_{i}"))
	return False


@frappe.whitelist()
def submit_quiz(quiz, results=None, violation_count=0, submission_reason="manual", violation_events=None):
	results = json.loads(results) if isinstance(results, str) else (results or [])
	qdoc = frappe.get_doc("LMS Quiz", quiz)
	marks = {r.question: int(r.marks or 1) for r in qdoc.questions}
	rows, score, out_of, open_ended, correct = [], 0, 0, False, 0
	for r in results:
		q = _question(r["question_name"])
		m = marks.get(r["question_name"], 1)
		out_of += m
		if q.get("type") == "Open Ended":
			open_ended = True
			rows.append({"question": q.get("question"), "question_name": q["name"], "question_type": "Open Ended", "answer": (r.get("answer") or [""])[0], "is_correct": 0, "marks": 0, "marks_out_of": m})
			continue
		ok = _correct(q, r.get("answer"))
		correct += 1 if ok else 0
		score += m if ok else 0
		rows.append({"question": q.get("question"), "question_name": q["name"], "question_type": q.get("type"), "answer": ", ".join(r.get("answer") or []), "is_correct": 1 if ok else 0, "marks": m if ok else 0, "marks_out_of": m})
	pct = round(score * 100 / out_of) if out_of else 0
	member = frappe.session.user
	sub = frappe.get_doc({
		"doctype": "LMS Quiz Submission", "quiz": quiz, "quiz_title": qdoc.title, "member": member, "member_name": frappe.db.get_value("User", member, "full_name"),
		"course": qdoc.course, "score": score, "score_out_of": out_of, "percentage": pct, "passing_percentage": qdoc.passing_percentage, "submission_reason": submission_reason, "result": rows,
	}).insert(ignore_permissions=True)
	answered = [r for r in results if any(a for a in (r.get("answer") or []))]
	return {"score": score, "score_out_of": out_of, "submission": sub.name, "pass": pct >= int(qdoc.passing_percentage or 0), "percentage": pct, "is_open_ended": open_ended,
	        "correct": correct, "wrong": len(answered) - correct, "unanswered": max(len(qdoc.questions) - len(answered), 0)}


@frappe.whitelist()
def check_answer(quiz, question, question_type, answers):
	admin = bool({"System Manager", "Moderator", "Course Creator", "Batch Evaluator"} & set(frappe.get_roles()))
	if not frappe.DB.match("LMS Quiz Question", {"parent": quiz, "question": question}):
		raise frappe.PermissionError("Question not found in this quiz.")
	if not admin and not frappe.db.get_value("LMS Quiz", quiz, "show_answers"):
		raise frappe.PermissionError("Live answer checking is not enabled for this quiz.")
	answers = json.loads(answers) if isinstance(answers, str) else (answers or [])
	q = _question(question)
	if question_type == "Choices":
		out = []
		for i in range(1, 11):
			if q.get(f"option_{i}") in answers:
				out.append(q.get(f"is_correct_{i}") or 0)
			elif q.get(f"is_correct_{i}"):
				out.append(2)
			else:
				out.append(0)
		return out
	return 1 if _correct(q, answers[:1]) else 0
