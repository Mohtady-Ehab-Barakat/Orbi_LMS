"""The student pages' and the Teach area's methods (orbitutor/learn.py, orbitutor/teach.py) over
the stand-in Frappe, without a browser."""
import json
import os
import sys
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
sys.path[:0] = [os.path.join(HERE, "fake"), APP, HERE]
import frappe  # noqa: E402

frappe.APP_PATHS["orbitutor"] = os.path.join(APP, "orbitutor")
import fixtures  # noqa: E402
from orbitutor import learn, teach  # noqa: E402

fixtures.seed()
ok = fail = 0


def t(name, fn):
	global ok, fail
	try:
		fn()
		ok += 1
		print("  ok   ", name)
	except Exception as e:  # noqa: BLE001
		fail += 1
		print("  FAIL ", name, type(e).__name__, e)


def check(cond, what=None):
	if not cond:
		raise AssertionError(what)


def raises(exc, fn, *a, **k):
	try:
		fn(*a, **k)
	except exc:
		return
	raise AssertionError(f"expected {exc.__name__}")


def as_(user):
	frappe.init_request(user)


# ---- a student ----
as_("aisyah@example.com")
t("schedule: classes and assessments", lambda: (lambda s: check(s is not None and isinstance(s, dict), s))(learn.schedule()))
t("batch_page: in it", lambda: (lambda b: check(b["access"] == "in", b.get("access")))(learn.batch_page("nov-2026")))
t("batch_page: not in it", lambda: (lambda b: check(b["access"] == "none", b.get("access")))(learn.batch_page("dec-2026")))
t("evaluation_slots: Suresh's times", lambda: (lambda r: check(r["days"] and r["days"][0]["slots"], r))(learn.evaluation_slots("python", "nov-2026")))
t("evaluation_slots: not in the batch", lambda: raises(frappe.PermissionError, learn.evaluation_slots, "light", "dec-2026"))
t("quiz_page: questions without answers", lambda: (lambda q: check(len(q["questions"]) == 4 and "is_correct_1" not in json.dumps(q) and q["questions"][2]["type"] == "typed" and q["questions"][3]["type"] == "open", [x["type"] for x in q["questions"]]))(learn.quiz_page("snell-quiz")))
t("quiz_review: someone else's attempt refused", lambda: raises(frappe.PermissionError, learn.quiz_review, "QS-0001"))
t("assignment_page: marked", lambda: (lambda a: check(a["status"] in ("passed", "marked", "pass") or a.get("submission"), a.get("status")))(learn.assignment_page("pyramid-photos")))
t("exercise_page: hidden test has no answer", lambda: (lambda e: check(e["tests"][2]["hidden"] and e["tests"][2]["expected"] == "" and e["starter_code"].startswith("n = int"), e["tests"]))(learn.exercise_page("count-stars")))
t("save_exercise_run: scored here, hidden answer not kept", lambda: (lambda r: check(r["status"] == "Passed" and not any(c.get("expected_output") for c in frappe.DB.rows("LMS Test Case Submission") if c.get("input") == "5"), r))(learn.save_exercise_run("count-stars", "print('*' * int(input()))", json.dumps(["***", "*", "*****"]))))
t("save_exercise_run: wrong number of outputs", lambda: raises(frappe.ValidationError, learn.save_exercise_run, "count-stars", "x", ["1"]))
t("certificates: Bridge", lambda: (lambda c: check(c and "CERT-0001" in json.dumps(c, default=str), c))(learn.certificates()))
t("certificate: own", lambda: learn.certificate("CERT-0001"))
t("profile: own", lambda: (lambda p: check(p["name"] if "name" in p else p, p))(learn.profile()))
t("settings", lambda: learn.settings())
t("save_profile: name required", lambda: raises(frappe.ValidationError, learn.save_profile, "  "))
t("save_profile", lambda: (learn.save_profile("Aisyah Rahman", "I like lenses."), check(frappe.db.get_value("User", "aisyah@example.com", "bio") == "I like lenses.")))
t("set_theme: junk refused", lambda: raises(frappe.ValidationError, learn.set_theme, "purple"))
t("set_theme", lambda: learn.set_theme("day"))
t("sign_out_others", lambda: learn.sign_out_others())
t("lesson_activities: a quiz block", lambda: (lambda a: check(a and "snell-quiz" in json.dumps(a, default=str), a))(learn.lesson_activities("light-2-3")))
t("students can't use Teach", lambda: raises(frappe.PermissionError, teach.context))
t("students can't mark", lambda: raises(frappe.PermissionError, teach.mark_assignment, "ASG-0002", "passed"))

# a student hands in work
as_("hafiz@example.com")
frappe.DB.insert("File", {"name": "F-1", "file_url": "/files/mine.jpg", "owner": "hafiz@example.com"})
frappe.DB.insert("File", {"name": "F-2", "file_url": "/files/theirs.jpg", "owner": "aisyah@example.com"})
t("submit_assignment: someone else's file refused", lambda: raises((frappe.PermissionError, frappe.ValidationError), learn.submit_assignment, "pyramid-photos", "light-3-1", file_url="/files/theirs.jpg"))
t("submit_assignment: own file", lambda: learn.submit_assignment("pyramid-photos", "light-3-1", file_url="/files/mine.jpg"))
t("quiz_review: own attempt", lambda: learn.quiz_review("QS-0001"))

# ---- an instructor (Mei Lin teaches the November batch, no courses of her own) ----
as_("mei@orbit-core.com")
t("context: instructor", lambda: (lambda c: check(c["roles"]["instructor"] and not c["roles"]["moderator"], c))(teach.context("/teach")))
t("today_page", lambda: (lambda d: check("classes" in d and "work" in d, list(d)))(teach.today_page()))
t("marking: her batch's students only", lambda: (lambda m: check(m["items"] and all(i["name"] == "Hafiz Ismail" for i in m["items"]), m["items"]))(teach.marking()))
t("courses: none of her own", lambda: (lambda c: check(c["courses"] == [], c["courses"]))(teach.courses()))
t("course_detail: not hers", lambda: raises(frappe.PermissionError, teach.course_detail, "light"))
t("batches: hers", lambda: (lambda b: check([x["name"] for x in b["batches"]] == ["nov-2026"], b))(teach.batches()))
t("batch_detail: not hers", lambda: raises(frappe.PermissionError, teach.batch_detail, "dec-2026"))
t("people: moderators only", lambda: raises(frappe.PermissionError, teach.people))

# ---- a moderator ----
as_("farid@orbit-core.com")
t("context: moderator", lambda: (lambda c: check(c["roles"]["moderator"] and c["counts"]["marking"] >= 2, c))(teach.context("/teach")))
t("today_page", lambda: teach.today_page())
t("marking: waiting, oldest first", lambda: (lambda m: check([i["kind"] for i in m["items"]][:2] == ["assignment", "quiz"] or len(m["items"]) >= 2, m["items"]))(teach.marking()))
t("marking: marked this week", lambda: teach.marking("marked"))
t("assignment_review", lambda: (lambda r: check(r["student"] and r["position"]["total"] >= 1, r))(teach.assignment_review("ASG-0002")))
t("mark_assignment: bad status", lambda: raises(frappe.ValidationError, teach.mark_assignment, "ASG-0002", "maybe"))
t("mark_assignment", lambda: (teach.mark_assignment("ASG-0002", "passed", "<p>Neat.</p><script>x</script>"), check(frappe.db.get_value("LMS Assignment Submission", "ASG-0002", "status") == "Pass"), check("<script>" not in (frappe.db.get_value("LMS Assignment Submission", "ASG-0002", "comments") or ""))))
t("quiz_submission", lambda: (lambda q: check(any(r["type"] == "open" for r in q["results"]), q["results"]))(teach.quiz_submission("QS-0001")))
OPEN = lambda: [r for r in teach.quiz_submission("QS-0001")["results"] if r["type"] == "open"][0]["id"]
t("mark_quiz: too many marks refused", lambda: raises(frappe.ValidationError, teach.mark_quiz, "QS-0001", json.dumps({OPEN(): 9})))
t("mark_quiz", lambda: (teach.mark_quiz("QS-0001", json.dumps({OPEN(): 2})), check(frappe.db.get_value("LMS Quiz Submission", "QS-0001", "orbitutor_reviewed") == 1), check(frappe.db.get_value("LMS Quiz Submission", "QS-0001", "score") == 5, frappe.db.get_value("LMS Quiz Submission", "QS-0001", "score"))))
t("marking: nothing left", lambda: (lambda m: check(not [i for i in m["items"] if i["id"] in ("ASG-0002", "QS-0001")], m["items"]))(teach.marking()))

t("courses", lambda: (lambda c: check(len(c["courses"]) == 14 and c["can_create"], len(c["courses"])))(teach.courses()))
t("course_detail", lambda: (lambda c: check(c["outline"] and c["values"]["title"] == "Light & Holograms", c["values"]))(teach.course_detail("light")))
t("save_course: new", lambda: (lambda r: check(r["name"] and frappe.DB.match("Course Instructor", {"parent": r["name"], "instructor": "farid@orbit-core.com"}), r))(teach.save_course(json.dumps({"title": "Rockets", "published": 0}))))
t("save_course: title required", lambda: raises(frappe.ValidationError, teach.save_course, json.dumps({"title": " "})))
t("save_course: change", lambda: (lambda r: check(r["values"]["orbitutor_level"] == "Some coding", r["values"]))(teach.save_course(json.dumps({"title": "Light & Holograms", "orbitutor_level": "Some coding", "orbitutor_track": "physics"}), "light", json.dumps(["farid@orbit-core.com", "mei@orbit-core.com"]))))
OUT = {}
t("outline: add chapter", lambda: (lambda r: (OUT.update(ch=r["outline"][-1]["id"]), check(r["outline"][-1]["title"] == "Extras")))(teach.outline_change("light", "add_chapter", json.dumps({"title": "Extras"}))))
t("outline: add lesson", lambda: (lambda r: check(r["outline"][-1]["lessons"][0]["title"] == "Bonus build", r["outline"][-1]))(teach.outline_change("light", "add_lesson", json.dumps({"chapter": OUT["ch"], "title": "Bonus build"}))))
t("outline: move chapter to the top", lambda: (lambda r: check(r["outline"][0]["id"] == OUT["ch"], [c["id"] for c in r["outline"]]))(teach.outline_change("light", "move_chapter", json.dumps({"chapter": OUT["ch"], "idx": 0}))))
t("outline: move a lesson between chapters", lambda: (lambda r: check(r["outline"][0]["lessons"][0]["id"] == "light-1-1" and len(r["outline"][1]["lessons"]) == 2, [[l["id"] for l in c["lessons"]] for c in r["outline"]]))(teach.outline_change("light", "move_lesson", json.dumps({"lesson": "light-1-1", "from": "light-ch1", "to": OUT["ch"], "idx": 0}))))
t("outline: rename", lambda: (lambda r: check(r["outline"][0]["title"] == "Bonus", r["outline"][0]))(teach.outline_change("light", "rename_chapter", json.dumps({"chapter": OUT["ch"], "title": "Bonus"}))))
t("outline: preview on", lambda: (teach.outline_change("light", "preview", json.dumps({"lesson": "light-1-2", "on": 1})), check(frappe.db.get_value("Course Lesson", "light-1-2", "include_in_preview") == 1)))
t("outline: preview of another course's lesson refused", lambda: raises(frappe.PermissionError, teach.outline_change, "light", "preview", json.dumps({"lesson": "python-1-1", "on": 1})))
t("outline: delete chapter", lambda: (lambda r: check(all(c["id"] != OUT["ch"] for c in r["outline"])))(teach.outline_change("light", "delete_chapter", json.dumps({"chapter": OUT["ch"]}))))
t("outline: unknown change", lambda: raises(frappe.ValidationError, teach.outline_change, "light", "explode", "{}"))
t("course_students", lambda: (lambda s: check(len(s["students"]) == 2, s))(teach.course_students("light")))
t("course_dashboard", lambda: (lambda d: check(d["students"] == 2 and len(d["spread"]) == 5, d))(teach.course_dashboard("light")))
t("lesson_editor", lambda: (lambda l: check(l["content"]["blocks"] and l["course"] == "light", l))(teach.lesson_editor("light-2-2")))
t("save_lesson: content and title", lambda: (teach.save_lesson("light-2-2", "Refraction in water!", json.dumps({"blocks": [{"type": "paragraph", "data": {"text": "Hi <script>x</script>"}}]})), check(frappe.db.get_value("Course Lesson", "light-2-2", "title") == "Refraction in water!")))
t("save_lesson: unknown quiz refused", lambda: raises(frappe.ValidationError, teach.save_lesson, "light-2-2", None, json.dumps({"blocks": [{"type": "quiz", "data": {"quiz": "ghost"}}]})))
t("search_activities", lambda: (lambda r: check(r and r[0]["value"] == "snell-quiz", r))(teach.search_activities("quiz", "snell")))
t("create_activity: quiz", lambda: (lambda r: check(r["value"] and r["href"].startswith("/teach/quiz/"), r))(teach.create_activity("quiz", "Lens quiz", "light")))
t("create_activity: unknown kind", lambda: raises(frappe.ValidationError, teach.create_activity, "poem"))
t("library: quizzes", lambda: (lambda l: check(len(l["items"]) >= 3, l))(teach.library("quiz")))
t("library: assignments", lambda: teach.library("assignment"))
t("library: exercises", lambda: (lambda l: check(l["items"][0]["title"] == "Count the stars", l))(teach.library("program")))
t("quiz_detail", lambda: (lambda q: check(len(q["questions"]) == 4 and q["questions"][0]["value"]["options"][0]["correct"], q["questions"][0]))(teach.quiz_detail("snell-quiz")))
t("save_quiz: pass mark out of range", lambda: raises(frappe.ValidationError, teach.save_quiz, json.dumps({"title": "Snell", "passing_percentage": 140}), "snell-quiz"))
t("save_quiz", lambda: (lambda q: check(q["values"]["max_attempts"] == 5, q["values"]))(teach.save_quiz(json.dumps({"title": "Snell's law quiz", "passing_percentage": 60, "max_attempts": 5}), "snell-quiz")))
t("save_question: new single answer", lambda: (lambda q: check(len(q["questions"]) == 5 and frappe.db.get_value("LMS Quiz", "snell-quiz", "total_marks") == 8, (len(q["questions"]), frappe.db.get_value("LMS Quiz", "snell-quiz", "total_marks"))))(teach.save_question("snell-quiz", json.dumps({"type": "single", "question": "<p>Fastest in?</p>", "marks": 2, "options": [{"text": "Air", "correct": True}, {"text": "Glass", "correct": False}]}))))
t("save_question: needs a right answer", lambda: raises(frappe.ValidationError, teach.save_question, "snell-quiz", json.dumps({"type": "single", "question": "<p>?</p>", "marks": 1, "options": [{"text": "A"}, {"text": "B"}]})))
t("save_question: typed", lambda: teach.save_question("snell-quiz", json.dumps({"type": "typed", "question": "<p>Index of glass?</p>", "marks": 1, "answers": ["1.5", "1.50"]})))
t("quiz_questions_change: move", lambda: (lambda q: check(q["questions"][0]["id"] == "Q-0002", [x["id"] for x in q["questions"]]))(teach.quiz_questions_change("snell-quiz", "move", "Q-0002", 0)))
t("quiz_questions_change: remove", lambda: (lambda q: check(all(x["id"] != "Q-0003" for x in q["questions"])))(teach.quiz_questions_change("snell-quiz", "remove", "Q-0003")))
t("question_bank: the removed one is there", lambda: (lambda b: check(any(x["id"] == "Q-0003" for x in b["items"]), b))(teach.question_bank("snell-quiz")))
t("quiz_questions_change: add from bank", lambda: (lambda q: check(any(x["id"] == "Q-0003" for x in q["questions"])))(teach.quiz_questions_change("snell-quiz", "add", questions=json.dumps(["Q-0003"]))))
t("assignment_detail", lambda: teach.assignment_detail("pyramid-photos"))
t("save_assignment: bad type", lambda: raises(frappe.ValidationError, teach.save_assignment, json.dumps({"title": "x", "type": "Audio", "question": "<p>x</p>"}), "pyramid-photos"))
t("save_assignment", lambda: (lambda a: check(a["values"]["type"] == "PDF", a["values"]))(teach.save_assignment(json.dumps({"title": "Pyramid write-up", "type": "PDF", "question": "<p>Write it up.</p>", "grade_assignment": 1, "course": "light"}), "pyramid-photos")))
t("exercise_detail: hidden answers shown to staff", lambda: (lambda e: check(e["tests"][2]["expected_output"] == "*****", e["tests"]))(teach.exercise_detail("count-stars")))
t("save_exercise: a test without output refused", lambda: raises(frappe.ValidationError, teach.save_exercise, json.dumps({"title": "Count", "language": "Python", "problem_statement": "<p>x</p>"}), json.dumps([{"input": "1", "expected_output": ""}]), "count-stars"))
t("save_exercise", lambda: (lambda e: check(len(e["tests"]) == 2, e["tests"]))(teach.save_exercise(json.dumps({"title": "Count the stars", "language": "Python", "problem_statement": "<p>Stars.</p>", "starter_code": ""}), json.dumps([{"input": "2", "expected_output": "**"}, {"input": "4", "expected_output": "****", "hidden": True}]), "count-stars")))

t("batches", lambda: (lambda b: check(len(b["batches"]) == 2, b))(teach.batches()))
t("batch_detail", lambda: (lambda b: check(len(b["roster"]) == 2 and b["courses"] and b["classes"] and b["assessments"][0]["href"], b["assessments"]))(teach.batch_detail("nov-2026")))
t("save_batch: new", lambda: (lambda b: (OUT.update(batch=b["name"]), check(b["values"]["published"] == 0 and b["instructors"], b)))(teach.save_batch(json.dumps({"title": "January 2027", "start_date": "2027-01-04", "end_date": "2027-03-01", "start_time": "10:00", "end_time": "12:00", "medium": "Online", "published": 0}))))
t("save_batch: ends before it starts", lambda: raises(frappe.ValidationError, teach.save_batch, json.dumps({"title": "Bad", "start_date": "2027-02-01", "end_date": "2027-01-01", "start_time": "10:00", "end_time": "12:00"})))
t("save_batch: courses", lambda: (lambda b: check([c["value"] for c in b["courses"]] == ["light", "python"], b["courses"]))(teach.save_batch(json.dumps({"title": "January 2027", "start_date": "2027-01-04", "end_date": "2027-03-01", "start_time": "10:00", "end_time": "12:00"}), OUT["batch"], json.dumps(["light", "python"]), json.dumps(["farid@orbit-core.com"]))))
t("find_people", lambda: (lambda r: check(r and r[0]["value"] == "nadia@example.com", r))(teach.find_people("nadia", OUT["batch"])))
t("enrol: Nadia, into the courses too, and emailed", lambda: (teach.enrol(OUT["batch"], json.dumps(["nadia@example.com"])), check(frappe.DB.match("LMS Batch Enrollment", {"batch": OUT["batch"], "member": "nadia@example.com"})), check(frappe.DB.match("LMS Enrollment", {"course": "python", "member": "nadia@example.com"}))))
t("enrol: from a join request marks it Enrolled", lambda: (teach.enrol(OUT["batch"], json.dumps(["omar@example.com"]), "JOIN-00001"), check(frappe.db.get_value("OrbiTutor Join Request", "JOIN-00001", "status") == "Enrolled")))
t("remove_student", lambda: (lambda b: check(all(r["id"] != "nadia@example.com" for r in b["roster"])))(teach.remove_student(OUT["batch"], "nadia@example.com")))
t("schedule_class: link must be https", lambda: raises(frappe.ValidationError, teach.schedule_class, OUT["batch"], "Lenses", "2027-01-05", "10:00", 60, "http://x"))
t("schedule_class", lambda: (lambda b: check(b["classes"] and b["classes"][0]["title"] == "Lenses", b["classes"]))(teach.schedule_class(OUT["batch"], "Lenses", "2027-01-05", "10:00", 60, "https://meet.google.com/a")))
t("schedule_class: change it", lambda: (lambda b: check(b["classes"][0]["title"] == "Lenses, again", b["classes"]))(teach.schedule_class(OUT["batch"], "Lenses, again", "2027-01-05", "11:00", 45, None, None, frappe.DB.rows("LMS Live Class")[-1]["name"])))
t("cancel_class", lambda: (lambda b: check(not b["classes"]))(teach.cancel_class(frappe.DB.rows("LMS Live Class")[-1]["name"])))
t("assessment_change: add", lambda: (lambda b: check(b["assessments"] and b["assessments"][0]["name"] == "snell-quiz", b["assessments"]))(teach.assessment_change(OUT["batch"], "add", "quiz", "snell-quiz")))
t("assessment_change: remove", lambda: (lambda b: check(not b["assessments"]))(teach.assessment_change(OUT["batch"], "remove", row=teach.batch_detail(OUT["batch"])["assessments"][0]["id"])))
t("announce: emailed by bcc", lambda: (teach.announce(OUT["batch"], "Welcome", "<p>Hi all</p>", True), check(frappe.DB.match("Communication", {"reference_name": OUT["batch"]}))))
t("announce: title required", lambda: raises(frappe.ValidationError, teach.announce, OUT["batch"], " ", "<p>x</p>"))

t("requests", lambda: (lambda r: check(r["items"] and r["items"][0]["email"] == "omar@example.com", r["items"]))(teach.requests()))
t("set_request: unknown status", lambda: raises(frappe.ValidationError, teach.set_request, "JOIN-00001", "Maybe"))
t("set_request", lambda: (teach.set_request("JOIN-00001", "Contacted"), check(frappe.db.get_value("OrbiTutor Join Request", "JOIN-00001", "status") == "Contacted")))

as_("suresh@orbit-core.com")
t("context: evaluator", lambda: (lambda c: check(c["roles"]["evaluator"] and not c["roles"]["instructor"], c))(teach.context()))
t("evaluations", lambda: (lambda e: check(len(e["items"]) == 2 and e["slots"], e))(teach.evaluations()))
t("save_availability: end before start", lambda: raises(frappe.ValidationError, teach.save_availability, json.dumps([{"day": "Monday", "start": "10:00", "end": "09:00"}])))
t("save_availability", lambda: (lambda e: check(len(e["slots"]) == 1 and e["away"]["from"] == "2026-12-20", e))(teach.save_availability(json.dumps([{"day": "Monday", "start": "10:00", "end": "11:00"}]), json.dumps({"from": "2026-12-20", "to": "2026-12-31"}))))
t("record_evaluation: passed gives the certificate", lambda: (teach.record_evaluation([r for r in frappe.DB.rows("LMS Certificate Request") if r["member"] == "hafiz@example.com"][0]["name"], "passed", "Good."), check(frappe.DB.match("LMS Certificate", {"member": "hafiz@example.com", "course": "light"}))))
t("certificates_list: evaluator", lambda: (lambda c: check(c["items"] and not c["can_batch"], c["can_batch"]))(teach.certificates_list()))
t("evaluator can't open courses", lambda: raises(frappe.PermissionError, teach.courses))
t("find_people: evaluators can, to give certificates", lambda: teach.find_people("aisyah"))

as_("farid@orbit-core.com")
t("give_certificate", lambda: (lambda c: check(any(i["name"] == "Aisyah Rahman" and i["course"] == "Light & Holograms" for i in c["items"]), c["items"]))(teach.give_certificate("aisyah@example.com", "light", date.today().isoformat())))
t("give_certificate: twice refused", lambda: raises(frappe.ValidationError, teach.give_certificate, "aisyah@example.com", "light", date.today().isoformat()))
t("batch_certificates_preview", lambda: (lambda p: check("ready" in p, p))(teach.batch_certificates_preview("nov-2026")))
t("revoke_certificate", lambda: (lambda c: check(not frappe.DB.match("LMS Certificate", {"member": "aisyah@example.com", "course": "light"})))(teach.revoke_certificate(frappe.DB.match("LMS Certificate", {"member": "aisyah@example.com", "course": "light"})[0]["name"])))
t("people", lambda: (lambda p: check(p["staff"] >= 3 and p["students"] >= 5, (p["staff"], p["students"])))(teach.people()))
t("set_roles: makes Hafiz an evaluator", lambda: (teach.set_roles("hafiz@example.com", json.dumps(["LMS Student", "Batch Evaluator"])), check("Batch Evaluator" in frappe.get_roles("hafiz@example.com"))))
t("set_roles: can't take away your own Moderator", lambda: raises((frappe.ValidationError, frappe.PermissionError), teach.set_roles, "farid@orbit-core.com", json.dumps(["Course Creator"])))
t("add_staff: bad email", lambda: raises(frappe.ValidationError, teach.add_staff, "Zara", "zara@", json.dumps(["Course Creator"])))
t("add_staff", lambda: (teach.add_staff("Zara Ali", "zara@orbit-core.com", json.dumps(["Course Creator"])), check("Course Creator" in frappe.get_roles("zara@orbit-core.com"))))
t("person_action: reset", lambda: teach.person_action("zara@orbit-core.com", "reset"))
t("person_action: can't turn yourself off", lambda: raises((frappe.ValidationError, frappe.PermissionError), teach.person_action, "farid@orbit-core.com", "disable"))
t("person_action: disable", lambda: (teach.person_action("zara@orbit-core.com", "disable"), check(frappe.db.get_value("User", "zara@orbit-core.com", "enabled") == 0)))
t("statistics", lambda: (lambda s: check(len(s["signups"]) == 12, s))(teach.statistics()))
t("settings_page", lambda: (lambda s: check(s["categories"] == ["Robotics", "Space"], s))(teach.settings_page()))
t("save_settings", lambda: (lambda s: check(s["app_name"] == "OrbiTutor Academy" and "Electronics" in s["categories"], s))(teach.save_settings(json.dumps({"app_name": "OrbiTutor Academy", "signup": True, "guest_access": True, "certified_members": False, "categories": ["Robotics", "Space", "Electronics"]}))))

print(f"{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
