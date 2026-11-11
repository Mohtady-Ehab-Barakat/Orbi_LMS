"""Seed data for the stand-in Frappe: OrbitCore's courses, a few students, a batch, live
classes, announcements, notifications and questions, shaped like Frappe Learning v16's tables."""

import json
from datetime import date, datetime, timedelta

import frappe
from frappe.utils.data import sha256_hash

D = frappe.DB

COURSES = [
	("light", "Light & Holograms", "Physics and space", "Make a video float in mid-air with a clear plastic pyramid and the physics of light.", "Hologram Pyramid"),
	("telescope", "DIY Telescope", "Physics and space", "Build a working refracting telescope from two lenses and a tube.", "DIY Telescope"),
	("generator", "Hand Generator", "Physics and space", "Light an LED with electricity you make yourself, just by turning a handle.", "Hand Generator"),
	("astronomy", "Basics of Astronomy", "Physics and space", "Learn to read the night sky, then find real objects through a telescope.", "Telescope Night"),
	("python", "Python Programming", "Code and AI", "Learn Python by fixing a broken program, then write your own from scratch.", "Grade Calculator"),
	("algorithms", "Algorithms", "Code and AI", "Find one name among a million in about 20 steps, and learn why that's possible.", "Search and Sort"),
	("ml", "Intro to Machine Learning", "Code and AI", "Train a decision tree to tell flower species apart, then see if it beats you.", "Flower Classifier"),
	("vision", "Computer Vision", "Code and AI", "Teach an AI to recognise three things of your choice, from photos you collect.", "Custom Vision Model"),
	("lm", "Language Models", "Code and AI", "Fine-tune a language model to write in a style you choose.", "Custom Language Model"),
	("cad", "3D Design & Printing", "Engineering and making", "Design an object in CAD, slice it, and watch it print layer by layer.", "Your 3D-Printed Design"),
	("radar", "Radar System", "Engineering and making", "Build a sweeping radar with an Arduino Nano and watch it map the room.", "Ultrasonic Radar"),
	("bridge", "Bridge Engineering", "Engineering and making", "Design a truss bridge, load it until it breaks, and beat your own first attempt.", "Truss Bridge"),
	("maths", "Maths Competition", "Competitions", "Kangaroo-level problems, then every answer explained.", "Maths Competition"),
	("physicscomp", "Physics Competition", "Competitions", "Put your physics to the test, then go through every answer.", "Physics Competition"),
]


def blocks(*items):
	return json.dumps({"time": 1730000000000, "version": "2.29.0", "blocks": [{"id": f"b{i}", "type": t, "data": d} for i, (t, d) in enumerate(items)]})


LIGHT = [
	("How light travels", [
		("header", {"text": "Light goes in straight lines", "level": 2}),
		("paragraph", {"text": "Shine a torch across a dark room and you'll see a straight beam. Light only bends when it <b>changes what it's travelling through</b>."}),
		("embed", {"service": "youtube", "source": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "embed": "https://www.youtube.com/embed/dQw4w9WgXcQ", "caption": "Watch: light in a fish tank"}),
	]),
	("Reflection", [
		("paragraph", {"text": "A mirror sends light back at the same angle it arrived. That's the <i>law of reflection</i>."}),
		("paragraph", {"text": "$$\\theta_i = \\theta_r$$"}),
		("list", {"style": "ordered", "items": ["Hold a mirror at the edge of a table.", "Shine the torch at it from one side.", "Mark where the beam lands."]}),
	]),
	("Mirrors at home", [("paragraph", {"text": "Find three shiny things at home and test which ones reflect a clear image."})]),
	("Bending light", [
		("paragraph", {"text": "Light slows down in water and glass. When it slows down at an angle, it bends. We call that <b>refraction</b>."}),
		("table", {"withHeadings": True, "content": [["Material", "How much it bends light"], ["Air", "1.00"], ["Water", "1.33"], ["Glass", "1.50"]]}),
	]),
	("Refraction in water", [
		("header", {"text": "Make a water lens", "level": 2}),
		("paragraph", {"text": "A drop of water on clear plastic bends light just like a glass lens. Read about it on <a href=\"https://en.wikipedia.org/wiki/Refraction\">Wikipedia</a>."}),
		("paragraph", {"text": "Snell's law says how much it bends:"}),
		("paragraph", {"text": "$$n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2$$"}),
		("codeBox", {"language": "python", "code": "import math\n\ndef bend(angle, n1=1.0, n2=1.33):\n    return math.degrees(math.asin(n1 * math.sin(math.radians(angle)) / n2))\n\nprint(bend(30))  # 22.1"}),
		("markdown", {"text": "**Tip:** a smaller, rounder drop makes things look *bigger*.\n\n- Try one drop\n- Then two"}),
		("paragraph", {"text": "<img src=x onerror=\"window.__xss=1\">This line has a broken picture that tries to run code; it must not."}),
	]),
	("Snell's law quiz", [("paragraph", {"text": "Check what you know before the build."}), ("quiz", {"quiz": "snell-quiz"})]),
	("Build the pyramid", [("paragraph", {"text": "Cut four trapezoids from the acrylic sheet and tape them into a pyramid."}), ("assignment", {"assignment": "pyramid-photos"})]),
	("Make your video", [("paragraph", {"text": "Make a video with four copies of the same clip, one on each side of the screen."})]),
	("Show it off", [("paragraph", {"text": "Put the pyramid on your phone and turn off the lights."})]),
]


def course_rows():
	for i, (cid, title, track, tagline, project) in enumerate(COURSES):
		D.insert(
			"LMS Course",
			{
				"name": cid,
				"title": title,
				"image": None,
				"short_introduction": tagline,
				"description": f"<p>{tagline}</p><p>Every class is hands-on: you'll build <b>{project}</b> by the end.</p><script>window.__xss=2</script>",
				"published": 0 if cid == "astronomy" else 1,
				"upcoming": 1 if cid == "lm" else 0,
				"featured": 1 if cid in ("light", "python", "cad") else 0,
				"enrollments": 100 - i,
				"orbitutor_track": track,
				"orbitutor_level": "No experience needed",
				"orbitutor_length": "10 weeks, one class a week",
				"orbitutor_project": project,
				"orbitutor_project_url": f"https://orbit-core.com/projects/{cid}",
				"orbitutor_outcomes": "How light bends\nWhy a pyramid makes a hologram\nHow to film for a hologram" if cid == "light" else "The basics\nYour own project",
				"orbitutor_kit": "Clear acrylic sheet - we give you one\nA phone or tablet\nScissors and tape" if cid == "light" else "",
				"video_link": None,
				"enable_certification": 1,
				"disable_self_learning": 0,
			},
		)
		D.insert("Course Instructor", {"parent": cid, "parenttype": "LMS Course", "parentfield": "instructors", "instructor": "farid@orbit-core.com"})
		if cid == "light":
			lessons = LIGHT
			per = 3
		elif cid == "python":
			lessons = [(t, [("paragraph", {"text": f"{t}: a short reading."})]) for t in ["Your first program", "Variables", "If and else", "Loops", "Functions", "Your grade calculator"]]
			lessons[3] = ("Loops", [("paragraph", {"text": "A loop runs the same lines again and again."}), ("program", {"exercise": "count-stars"})])
			per = 3
		else:
			lessons = [(f"{title}: getting started", [("paragraph", {"text": "Welcome. Here's what we'll build."})]), ("Your first build", [("paragraph", {"text": "Let's start."})])]
			per = 2
		total = 0
		for ci in range((len(lessons) + per - 1) // per):
			ch = f"{cid}-ch{ci + 1}"
			D.insert("Course Chapter", {"name": ch, "title": ["Light and how it moves", "Bending light", "The hologram build"][ci] if cid == "light" else f"Part {ci + 1}", "course": cid})
			D.insert("Chapter Reference", {"parent": cid, "parenttype": "LMS Course", "parentfield": "chapters", "chapter": ch, "idx": ci + 1})
			for li, (lt, content) in enumerate(lessons[ci * per : (ci + 1) * per]):
				ln = f"{cid}-{ci + 1}-{li + 1}"
				D.insert(
					"Course Lesson",
					{
						"name": ln,
						"title": lt,
						"course": cid,
						"chapter": ch,
						"body": None,
						"content": blocks(*content),
						"include_in_preview": 1 if (ci == 0 and li == 0) else 0,
						"is_scorm_package": 0,
					},
				)
				D.insert("Lesson Reference", {"parent": ch, "parenttype": "Course Chapter", "parentfield": "lessons", "lesson": ln, "idx": li + 1})
				total += 1
		D.rows("LMS Course")[-1]["lessons"] = total


def users():
	def user(email, full, username, kind="Website User", roles=(), **extra):
		D.insert(
			"User",
			{
				"name": email,
				"email": email,
				"full_name": full,
				"first_name": full.split(" ")[0],
				"username": username,
				"user_type": kind,
				"user_image": None,
				"desk_theme": "Dark",
				"enabled": 1,
				"last_login": "2026-11-01 10:00:00",
				"bio": None,
				**extra,
			},
		)
		for r in roles:
			D.insert("Has Role", {"parent": email, "parenttype": "User", "role": r})

	user("aisyah@example.com", "Aisyah Rahman", "aisyah", roles=["LMS Student"], password="Orbit-Tutor-2026!")
	user("nadia@example.com", "Nadia Salleh", "nadia", roles=["LMS Student"], password="Orbit-Tutor-2026!")
	user("omar@example.com", "Omar Hakim", "omar", roles=["LMS Student"], password="Orbit-Tutor-2026!")
	user("farid@orbit-core.com", "Farid Hakim", "farid", kind="System User", roles=["Moderator", "Course Creator"], password="Orbit-Tutor-2026!", bio="Physics teacher. Builds telescopes on weekends.")
	user("suresh@orbit-core.com", "Suresh Kumar", "suresh", kind="System User", roles=["Batch Evaluator"], password="Orbit-Tutor-2026!")
	user("mei@orbit-core.com", "Mei Lin Tan", "meitan", kind="System User", roles=["Course Creator"], password="Orbit-Tutor-2026!")
	user("hafiz@example.com", "Hafiz Ismail", "hafiz", roles=["LMS Student"], password="Orbit-Tutor-2026!")
	user("locked@example.com", "Lina Locked", "lina", roles=["LMS Student"], password="Orbit-Tutor-2026!")
	now = datetime.now()
	user("newkid@example.com", "Danial Iskandar", "danial", roles=["LMS Student"], last_login=None, reset_password_key=sha256_hash("invitekey12345"), last_reset_password_key_generated_on=now)
	user("reset@example.com", "Mei Lin Ong", "meilin", roles=["LMS Student"], reset_password_key=sha256_hash("resetkey12345"), last_reset_password_key_generated_on=now)
	user("old@example.com", "Old Link", "oldlink", roles=["LMS Student"], reset_password_key=sha256_hash("oldkey123456"), last_reset_password_key_generated_on=now - timedelta(days=3))


def learning():
	# the server's wall clock is Kuala Lumpur's, as on OrbitCore's site
	from zoneinfo import ZoneInfo

	now = datetime.now(ZoneInfo("Asia/Kuala_Lumpur")).replace(tzinfo=None)
	# Aisyah: Light & Holograms 4 of 9 done, Python 5 of 6, Bridge finished
	for course, done in (("light", 4), ("python", 5), ("bridge", 2)):
		from lms.lms.utils import ordered_lessons

		names = [l["lesson"] for _c, l in ordered_lessons(course)]
		for n in names[:done]:
			D.insert("LMS Course Progress", {"member": "aisyah@example.com", "course": course, "lesson": n, "status": "Complete"})
		cert = None
		if done == len(names):
			cert = D.insert("LMS Certificate", {"name": "CERT-0001", "member": "aisyah@example.com", "course": course, "course_title": "Bridge Engineering", "issue_date": (date.today() - timedelta(days=3)).isoformat()})["name"]
		D.insert(
			"LMS Enrollment",
			{
				"member": "aisyah@example.com",
				"course": course,
				"progress": round(done * 100 / len(names), 2),
				"current_lesson": names[done] if done < len(names) else names[0],
				"certificate": cert,
				"modified": now - timedelta(hours={"light": 1, "python": 30, "bridge": 200}[course]),
			},
		)
	# Omar asked to join and is waiting
	D.insert("OrbiTutor Join Request", {"name": "JOIN-00001", "full_name": "Omar Hakim", "phone": "012 345 6789", "user": "omar@example.com", "course": "radar", "status": "New", "for_whom": "Themselves"})

	# a batch with live classes, assessments and announcements
	start = date.today() - timedelta(days=20)
	D.insert("LMS Batch", {"name": "nov-2026", "title": "November 2026 batch", "start_date": start.isoformat(), "end_date": (start + timedelta(days=70)).isoformat(), "start_time": "10:00:00", "end_time": "12:00:00", "medium": "Offline", "timezone": "Asia/Kuala_Lumpur", "seat_count": 20, "published": 1})
	D.insert("LMS Batch", {"name": "dec-2026", "title": "December 2026 batch", "start_date": (date.today() + timedelta(days=28)).isoformat(), "end_date": (date.today() + timedelta(days=98)).isoformat(), "start_time": "14:00:00", "end_time": "16:00:00", "medium": "Online", "timezone": "Asia/Kuala_Lumpur", "seat_count": 20, "published": 1})
	for b, courses in (("nov-2026", ["light", "python"]), ("dec-2026", ["light", "radar", "python"])):
		for c in courses:
			D.insert("Batch Course", {"parent": b, "parenttype": "LMS Batch", "parentfield": "courses", "course": c})
	D.insert("LMS Batch Enrollment", {"member": "aisyah@example.com", "batch": "nov-2026"})
	soon = now + timedelta(minutes=30)
	later = now + timedelta(days=7)
	for title, at in (("Bending light, part 2", soon), ("Build day: pyramids", later)):
		D.insert("LMS Live Class", {"title": title, "date": at.date().isoformat(), "time": at.strftime("%H:%M:00"), "duration": 45, "join_url": "https://meet.google.com/abc-defg-hij", "timezone": "Asia/Kuala_Lumpur", "batch_name": "nov-2026", "host": "farid@orbit-core.com"})
	D.insert("LMS Assessment", {"parent": "nov-2026", "parenttype": "LMS Batch", "parentfield": "assessment", "assessment_type": "LMS Assignment", "assessment_name": "pyramid-photos", "title": "Photos of your pyramid build"})
	D.insert("LMS Assessment", {"parent": "nov-2026", "parenttype": "LMS Batch", "parentfield": "assessment", "assessment_type": "LMS Quiz", "assessment_name": "snell-quiz", "title": "Snell's law quiz"})
	D.insert("LMS Assessment", {"parent": "nov-2026", "parenttype": "LMS Batch", "parentfield": "assessment", "assessment_type": "LMS Quiz", "assessment_name": "intro-quiz", "title": "Intro quiz"})
	D.insert("LMS Assessment Done", {"member": "aisyah@example.com", "assessment": "intro-quiz"})
	D.insert("Communication", {"reference_name": "nov-2026", "subject": "Bring your acrylic sheets on Thursday", "content": "<p>We're building the hologram pyramids in Thursday's class, so please bring the four acrylic sheets from your kit.</p>", "communication_date": (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"), "sender_full_name": "Farid Hakim", "image": None})
	D.insert("Communication", {"reference_name": "nov-2026", "subject": "Python help hour moves to 5:00 pm", "content": "<p>This week's help hour starts at 5:00 pm instead of 4:30 pm.</p>", "communication_date": (now - timedelta(days=4)).strftime("%Y-%m-%d %H:%M:%S"), "sender_full_name": "Mei Lin Ong", "image": None})

	# notifications, with Frappe Learning's own links
	for subject, link, ago, read in (
		("Your pyramid photos were marked", "/lms/assignment-submission/pyramid-photos/ASG-0001", 1, 0),
		("New lesson: <b>Refraction in water</b>", "/lms/courses/light/learn/2-2", 3, 0),
		("Bending light, part 2 starts soon", "/lms/batches/nov-2026", 5, 1),
		("Your certificate is ready", "/lms/courses/bridge/CERT-0001", 60, 1),
	):
		D.insert("Notification Log", {"subject": subject, "link": link, "for_user": "aisyah@example.com", "from_user": "farid@orbit-core.com", "read": read, "type": "Alert", "creation": now - timedelta(hours=ago)})

	# questions under "Refraction in water"
	t = D.insert("Discussion Topic", {"name": "TOPIC-1", "title": "Why does the drop need to be round?", "reference_doctype": "Course Lesson", "reference_docname": "light-2-2", "owner": "aisyah@example.com", "creation": now - timedelta(days=2)})
	D.insert("Discussion Reply", {"topic": t["name"], "owner": "aisyah@example.com", "reply": "<p>Mine was flat and nothing got bigger.</p>", "creation": now - timedelta(days=2)})
	D.insert("Discussion Reply", {"topic": t["name"], "owner": "farid@orbit-core.com", "reply": "<p>A round drop curves the light more. Try a smaller drop!</p>", "creation": now - timedelta(days=1)})


def activities():
	"""Quizzes, an assignment and a coding exercise, with work waiting to be marked."""
	from zoneinfo import ZoneInfo

	now = datetime.now(ZoneInfo("Asia/Kuala_Lumpur")).replace(tzinfo=None)

	def question(name, text, kind="Choices", options=(), possibilities=(), multiple=0, explanations=()):
		row = {"name": name, "question": text, "type": kind, "multiple": multiple}
		for i, (o, right) in enumerate(options, start=1):
			row[f"option_{i}"] = o
			row[f"is_correct_{i}"] = 1 if right else 0
		for i, e in enumerate(explanations, start=1):
			row[f"explanation_{i}"] = e
		for i, p in enumerate(possibilities, start=1):
			row[f"possibility_{i}"] = p
		D.insert("LMS Question", row)

	question("Q-0001", "<p>What happens to light when it goes from air into water at an angle?</p>", options=[("It bends towards the normal", True), ("It bends away from the normal", False), ("It goes straight on", False)],
	         explanations=["Water is optically denser, so light slows and bends towards the normal.", "That's what happens going from water into air.", "Only light hitting the surface straight on goes straight."])
	question("Q-0002", "<p>Which of these bend light? Pick all that do.</p>", options=[("A glass lens", True), ("A drop of water", True), ("A flat mirror", False)], multiple=1)
	question("Q-0003", "<p>Water's refractive index, to two decimal places?</p>", kind="User Input", possibilities=["1.33"])
	question("Q-0004", "<p>In your own words: why does a straw look bent in a glass of water?</p>", kind="Open Ended")
	question("Q-0005", "<p>What does a pyramid hologram need to work?</p>", options=[("A dark room", True), ("Sunlight", False)])
	D.insert("LMS Quiz", {"name": "snell-quiz", "title": "Snell's law quiz", "course": "light", "passing_percentage": 70, "max_attempts": 3, "show_answers": 1, "show_submission_history": 1, "total_marks": 6})
	for i, (q, m) in enumerate((("Q-0001", 1), ("Q-0002", 2), ("Q-0003", 1), ("Q-0004", 2)), start=1):
		D.insert("LMS Quiz Question", {"parent": "snell-quiz", "parenttype": "LMS Quiz", "parentfield": "questions", "question": q, "marks": m, "idx": i})
	D.insert("LMS Quiz", {"name": "intro-quiz", "title": "Intro quiz", "course": "light", "passing_percentage": 50, "max_attempts": 0, "show_answers": 0, "total_marks": 1})
	D.insert("LMS Quiz Question", {"parent": "intro-quiz", "parenttype": "LMS Quiz", "parentfield": "questions", "question": "Q-0005", "marks": 1, "idx": 1})

	D.insert("LMS Assignment", {"name": "pyramid-photos", "title": "Photos of your pyramid build", "type": "Image", "grade_assignment": 1, "course": "light",
	                            "question": "<p>Take two photos: the finished pyramid, and the pyramid on your phone with a video playing.</p>", "answer": "<p>Four equal trapezoids, taped edge to edge, with the small end down on the screen.</p>"})
	D.insert("LMS Assignment Submission", {"name": "ASG-0001", "assignment": "pyramid-photos", "assignment_title": "Photos of your pyramid build", "member": "aisyah@example.com", "member_name": "Aisyah Rahman",
	                                       "course": "light", "lesson": "light-3-1", "type": "Image", "status": "Pass", "assignment_attachment": "/files/pyramid-aisyah.jpg", "comments": "<p>Lovely clean edges. Try a darker room for the video.</p>",
	                                       "evaluator": "farid@orbit-core.com", "creation": now - timedelta(days=3)})
	D.insert("LMS Assignment Submission", {"name": "ASG-0002", "assignment": "pyramid-photos", "assignment_title": "Photos of your pyramid build", "member": "hafiz@example.com", "member_name": "Hafiz Ismail",
	                                       "course": "light", "lesson": "light-3-1", "type": "Image", "status": "Not Graded", "assignment_attachment": "/files/pyramid-hafiz.jpg", "creation": now - timedelta(days=4)})
	sub = D.insert("LMS Quiz Submission", {"name": "QS-0001", "quiz": "snell-quiz", "quiz_title": "Snell's law quiz", "member": "hafiz@example.com", "member_name": "Hafiz Ismail", "course": "light",
	                                       "score": 3, "score_out_of": 6, "percentage": 50, "passing_percentage": 70, "orbitutor_reviewed": 0, "creation": now - timedelta(days=1)})
	for i, (q, qt, ans, ok, m, out) in enumerate((
		("Q-0001", "Choices", "It bends towards the normal", 1, 1, 1),
		("Q-0002", "Choices", "A glass lens, A drop of water", 1, 2, 2),
		("Q-0003", "User Input", "1.3", 0, 0, 1),
		("Q-0004", "Open Ended", "Light from the straw bends when it leaves the water, so the bottom part looks like it's somewhere else.", 0, 0, 2),
	), start=1):
		qtext = D.match("LMS Question", q)[0]["question"]
		D.insert("LMS Quiz Result", {"parent": sub["name"], "parenttype": "LMS Quiz Submission", "parentfield": "result", "idx": i, "question": qtext, "question_name": q, "question_type": qt, "answer": ans, "is_correct": ok, "marks": m, "marks_out_of": out})

	D.insert("LMS Programming Exercise", {"name": "count-stars", "title": "Count the stars", "language": "Python", "problem_statement": "<p>Read a number <b>n</b>, then print a line of <b>n</b> stars.</p>", "starter_code": "n = int(input())\n# print n stars\n"})
	for i, (inp, out, hidden) in enumerate((("3", "***", 0), ("1", "*", 0), ("5", "*****", 1)), start=1):
		D.insert("LMS Test Case", {"parent": "count-stars", "parenttype": "LMS Programming Exercise", "parentfield": "test_cases", "idx": i, "input": inp, "expected_output": out, "hidden": hidden})

	# Hafiz is in the November batch too; Mei Lin teaches it with Farid
	D.insert("LMS Batch Enrollment", {"member": "hafiz@example.com", "member_name": "Hafiz Ismail", "batch": "nov-2026"})
	D.insert("LMS Enrollment", {"member": "hafiz@example.com", "member_name": "Hafiz Ismail", "course": "light", "progress": 66.67, "current_lesson": "light-3-1", "modified": now - timedelta(days=16)})
	for b in ("nov-2026", "dec-2026"):
		D.insert("Course Instructor", {"parent": b, "parenttype": "LMS Batch", "parentfield": "instructors", "instructor": "farid@orbit-core.com"})
	D.insert("Course Instructor", {"parent": "nov-2026", "parenttype": "LMS Batch", "parentfield": "instructors", "instructor": "mei@orbit-core.com"})
	D.match("LMS Batch", "nov-2026")[0].update(certification=1, evaluation=1, evaluation_end_date=(date.today() + timedelta(days=60)).isoformat(), description="Light & Holograms and Python, Saturday mornings in Cyberjaya.", batch_details="<p>Ten Saturdays of building, with a live class each week.</p>")
	D.match("LMS Batch", "dec-2026")[0].update(description="Three courses over the school holidays.")
	# Suresh evaluates, Tuesdays and Thursdays
	ev = D.insert("Course Evaluator", {"name": "suresh@orbit-core.com", "evaluator": "suresh@orbit-core.com", "full_name": "Suresh Kumar"})
	for i, day in enumerate(("Tuesday", "Thursday"), start=1):
		D.insert("Evaluator Schedule", {"parent": ev["name"], "parenttype": "Course Evaluator", "parentfield": "schedule", "idx": i, "day": day, "start_time": "15:00:00", "end_time": "15:30:00"})
	when = date.today() + timedelta(days=2)
	D.insert("LMS Certificate Request", {"course": "python", "course_title": "Python Programming", "member": "aisyah@example.com", "member_name": "Aisyah Rahman", "evaluator": "suresh@orbit-core.com", "date": when.isoformat(),
	                                     "day": when.strftime("%A"), "start_time": "15:00:00", "end_time": "15:30:00", "batch_name": "nov-2026", "batch_title": "November 2026 batch", "status": "Upcoming", "google_meet_link": "https://meet.google.com/xyz-abcd-efg"})
	D.insert("LMS Certificate Request", {"course": "light", "course_title": "Light & Holograms", "member": "hafiz@example.com", "member_name": "Hafiz Ismail", "evaluator": "suresh@orbit-core.com", "date": (date.today() - timedelta(days=1)).isoformat(),
	                                     "day": "", "start_time": "15:00:00", "end_time": "15:30:00", "batch_name": "nov-2026", "batch_title": "November 2026 batch", "status": "Upcoming"})
	D.match("LMS Certificate", "CERT-0001")[0].update(member_name="Aisyah Rahman", published=1, template="Certificate")


def settings():
	for role in ("LMS Student", "Moderator", "Course Creator", "Batch Evaluator", "System Manager"):
		D.insert("Role", {"name": role, "desk_access": 0 if role == "LMS Student" else 1})
	D.single("System Settings").update(time_zone="Asia/Kuala_Lumpur", login_with_email_link=1, login_with_email_link_expiry=10, reset_password_link_expiry_duration=1200, enable_password_policy=1, minimum_password_score=2, disable_user_pass_login=0)
	D.single("Website Settings").update(app_name="OrbiTutor")
	D.single("LMS Settings").update(allow_guest_access=1, enforce_course_order=1, allow_certified_members=0)
	for c in ("Robotics", "Space"):
		D.insert("LMS Category", {"name": c, "category": c})
	D.single("Portal Settings").update(default_portal_home="")
	D.insert("Social Login Key", {"name": "orbitcore", "enable_social_login": 1, "client_id": "orbitutor", "base_url": "https://auth.orbit-core.com", "provider_name": "OrbitCore"})


def seed():
	frappe.set_user("Administrator")
	settings()
	users()
	course_rows()
	learning()
	activities()
	frappe.set_user("Guest")
