"""Stage 1 in a browser, against the stand-in Frappe (server.py): sign-in, Home, courses,
lessons, asking to join, search, notifications, passwords, problem pages.

    python3 e2e.py [base] [--shots]
"""

import json
import os
import re
import sys
import time

from playwright.sync_api import expect, sync_playwright

BASE = next((a for a in sys.argv[1:] if a.startswith("http")), "http://127.0.0.1:8765")
SHOTS = "--shots" in sys.argv
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
PASSWORD = "Orbit-Tutor-2026!"

results = []
problems = []


def check(name, fn):
	try:
		fn()
		results.append((name, True, ""))
		print(f"  ok    {name}")
	except Exception as e:
		msg = " / ".join(str(e).split("\n")[:6])[:600]
		results.append((name, False, msg))
		print(f"  FAIL  {name}: {msg}")


def watch(page, label):
	page.on("pageerror", lambda e: problems.append(f"{label}: pageerror {e}"))

	def on_console(m):
		if m.type == "error" and "favicon" not in m.text and "Failed to load resource" not in m.text:
			problems.append(f"{label}: console {m.text[:200]}")

	page.on("console", on_console)


def shot(page, name):
	if SHOTS:
		page.screenshot(path=os.path.join(OUT, name + ".png"), full_page=False)


def sign_in(page, email, password=PASSWORD):
	page.goto(BASE + "/login")
	page.get_by_label("Email").first.fill(email)
	page.locator("input[type=password]").first.fill(password)
	page.get_by_role("button", name=re.compile("^Sign in$", re.I)).click()


def run(browser, width, height, label):
	ctx = browser.new_context(viewport={"width": width, "height": height}, color_scheme="dark")
	page = ctx.new_page()
	page.set_default_timeout(8000)
	watch(page, label)
	phone = width < 720
	print(f"\n{label} ({width}x{height})")
	page.request.post(BASE + "/api/method/__reset", data="{}", headers={"Content-Type": "application/json"})

	# ---- signed out ----
	def guest_root():
		page.goto(BASE + "/")
		page.wait_for_url(re.compile(r"/login$"))
		expect(page.get_by_role("heading", name=re.compile("Sign in", re.I)).first).to_be_visible()
		expect(page.get_by_text(re.compile("OrbitCore account", re.I)).first).to_be_visible()
		shot(page, f"{label}-01-signin")

	check("signed out, / goes to sign-in", guest_root)

	def guest_course():
		page.goto(BASE + "/course/light")
		expect(page.get_by_role("heading", name="Light & Holograms")).to_be_visible()
		expect(page.get_by_text("Fill in a short form")).to_be_visible()
		assert page.evaluate("window.__xss") is None, "script in a description ran"
		assert page.locator("script:not([src])").filter(has_text="__xss").count() == 0
		shot(page, f"{label}-02-guest-course")

	check("visitor sees a course page with Ask to join", guest_course)

	def guest_locked_lesson():
		page.goto(BASE + "/course/light/learn/1-2")
		expect(page.get_by_role("link", name=re.compile("Sign in", re.I)).first).to_be_visible()
		page.goto(BASE + "/course/light/learn/1-1")
		expect(page.get_by_role("heading", name="How light travels")).to_be_visible()

	check("visitor: preview lesson opens, others ask to sign in", guest_locked_lesson)

	def guest_private():
		page.goto(BASE + "/my-courses")
		page.wait_for_url(re.compile(r"/login\?redirect-to=%2Fmy-courses"))

	check("visitor sent from My courses to sign in, with the way back", guest_private)

	def wrong_password():
		sign_in(page, "aisyah@example.com", "nope-nope")
		expect(page.get_by_text(re.compile("(doesn't|don't) match|wrong|isn't right", re.I)).first).to_be_visible()
		shot(page, f"{label}-03-wrong")

	check("wrong password says so", wrong_password)

	def locked():
		sign_in(page, "locked@example.com")
		expect(page.locator("text=Too many tries >> visible=true").first).to_be_visible()
		expect(page.get_by_text(re.compile("signing in is paused")).first).to_be_visible()

	check("locked account says so", locked)

	def good_sign_in():
		page.goto(BASE + "/login?redirect-to=%2Fmy-courses")
		page.get_by_label("Email").first.fill("aisyah@example.com")
		page.locator("input[type=password]").first.fill(PASSWORD)
		page.get_by_role("button", name=re.compile("^Sign in$", re.I)).click()
		page.wait_for_url(re.compile(r"/my-courses$"))
		expect(page.get_by_role("heading", name="My courses")).to_be_visible()
		expect(page.get_by_text("Light & Holograms").first).to_be_visible()
		shot(page, f"{label}-04-my-courses")

	check("sign in comes back to where they were going", good_sign_in)

	# ---- Home ----
	def home():
		page.goto(BASE + "/")
		expect(page.get_by_text(re.compile(r"Good (morning|afternoon|evening), Aisyah")).first).to_be_visible()
		expect(page.get_by_text("Bending light, part 2").first).to_be_visible()
		expect(page.get_by_text("Photos of your pyramid build").first).to_be_visible()
		expect(page.get_by_text("Intro quiz")).to_have_count(0)
		expect(page.get_by_text("Refraction in water").first).to_be_visible()
		expect(page.get_by_text("Bring your acrylic sheets on Thursday").first).to_be_visible()
		expect(page.get_by_text("Bridge Engineering").first).to_be_visible()
		shot(page, f"{label}-05-home")

	check("Home: live class, due, continue, courses, announcements, certificate", home)

	def bell():
		if phone:
			return
		page.get_by_role("button", name=re.compile("Notifications", re.I)).first.click()
		expect(page.get_by_text("Your pyramid photos were marked").first).to_be_visible()
		shot(page, f"{label}-06-bell")
		page.keyboard.press("Escape")

	check("the bell lists notifications", bell)

	# ---- a lesson ----
	def continue_lesson():
		page.goto(BASE + "/")
		page.get_by_role("link", name=re.compile("Resume lesson|Refraction in water", re.I)).first.click()
		page.wait_for_url(re.compile(r"/course/light/learn/2-2$"))
		expect(page.get_by_role("heading", name="Refraction in water", level=1)).to_be_visible()
		expect(page.get_by_text(re.compile(r"Chapter 2 . Lesson 5 of 9"))).to_be_visible()
		page.wait_for_selector(".ot-code .hljs-keyword")
		assert page.locator("math").count() >= 1, "no MathML"
		expect(page.locator("strong", has_text="Tip:")).to_be_visible()
		page.wait_for_timeout(300)
		assert page.evaluate("window.__xss") is None, "onerror ran"
		expect(page.get_by_text("Why does the drop need to be round?")).to_be_visible()
		ext = page.locator("a[href^='https://en.wikipedia.org']")
		assert ext.get_attribute("target") == "_blank" and "noopener" in (ext.get_attribute("rel") or "")
		shot(page, f"{label}-07-lesson")

	check("Continue opens the lesson, drawn from Frappe Learning's blocks", continue_lesson)

	def mark_done():
		page.get_by_role("button", name=re.compile("Mark as done", re.I)).click()
		expect(page.get_by_role("link", name=re.compile("Next lesson", re.I)).first).to_be_visible()
		log = server_log(page)
		assert any(m == "lms.lms.doctype.course_lesson.course_lesson.save_progress" and s == 200 for m, _a, _u, s in log), "no save_progress"
		shot(page, f"{label}-08-done")

	check("Mark as done saves progress", mark_done)

	def held():
		page.goto(BASE + "/course/light/learn/2-3")
		expect(page.get_by_role("heading", name="Snell's law quiz", level=1)).to_be_visible()
		expect(page.get_by_role("link", name=re.compile("Start the quiz", re.I))).to_have_attribute("href", "/quiz/snell-quiz?lesson=light-2-3")
		page.get_by_role("button", name=re.compile("Mark as done", re.I)).click()
		expect(page.get_by_text("Finish the activity first")).to_be_visible()

	check("a lesson with a quiz isn't done until the quiz is", held)

	def locked_lesson():
		page.goto(BASE + "/course/light/learn/3-2")
		expect(page.get_by_role("link", name=re.compile("Go to the lesson you're on", re.I))).to_be_visible()
		page.get_by_role("link", name=re.compile("Go to the lesson you're on", re.I)).click()
		page.wait_for_url(re.compile(r"/learn/2-3$"))
		page.goto(BASE + "/course/light/learn/9-9")
		expect(page.get_by_role("link", name=re.compile("Go to your lesson", re.I))).to_be_visible()

	check("locked and missing lessons point to the one they're on", locked_lesson)

	def ask_question():
		page.goto(BASE + "/course/light/learn/2-2")
		page.get_by_role("button", name=re.compile("Ask a question", re.I)).first.click()
		page.get_by_label("Your question").fill("Can I use a glass of water instead?")
		page.get_by_role("button", name="Post question").click()
		expect(page.get_by_text("Can I use a glass of water instead?")).to_be_visible()

	check("asking a question under a lesson", ask_question)

	# ---- courses ----
	def catalogue():
		page.goto(BASE + "/catalogue")
		expect(page.get_by_role("heading", name="All courses")).to_be_visible()
		expect(page.get_by_text("Radar System").first).to_be_visible()
		expect(page.get_by_text("Basics of Astronomy")).to_have_count(0)
		shot(page, f"{label}-09-catalogue")

	check("catalogue lists published courses", catalogue)

	def ask_to_join():
		page.goto(BASE + "/course/radar")
		page.get_by_role("button", name="Fill in a short form").click()
		page.get_by_label("Your name").fill("Aisyah Rahman")
		page.get_by_label("WhatsApp number").fill("012 345 6789")
		page.get_by_label("My child").check()
		page.get_by_label("Batch", exact=True).select_option(index=1)
		page.get_by_label(re.compile("Anything we should know")).fill("Weekends only, please.")
		page.get_by_role("button", name="Send my request").click()
		expect(page.get_by_text("We've got your request")).to_be_visible()
		log = [a for m, a, _u, s in server_log(page) if m == "orbitutor.api.ask_to_join" and s == 200]
		assert log and log[-1].get("who") == "child" and log[-1].get("note") == "Weekends only, please." and log[-1].get("batch") == "dec-2026", log[-1:]
		page.wait_for_timeout(500)  # the confirmation scrolls into view on phones
		shot(page, f"{label}-10-asked")

	check("Ask to join sends the form to the server", ask_to_join)

	def course_enrolled():
		page.goto(BASE + "/course/light")
		expect(page.get_by_text("Your progress").first).to_be_visible()
		expect(page.get_by_role("link", name=re.compile("Continue: ", re.I))).to_be_visible()
		shot(page, f"{label}-11-course-enrolled")

	check("an enrolled course shows progress and Continue", course_enrolled)

	# ---- search, notifications, other screens ----
	def search():
		if phone:
			page.goto(BASE + "/search")
			box = page.get_by_role("searchbox").first
		else:
			page.goto(BASE + "/catalogue")
			page.locator("body").click(position={"x": 5, "y": 300})
			page.keyboard.press("/")
			box = page.locator(".app-search-box input[type=search]")
		box.fill("refr")
		page.get_by_role("link", name=re.compile("Refraction in water")).first.click()
		page.wait_for_url(re.compile(r"/course/light/learn/2-2$"))

	check("search finds a lesson and opens it", search)

	def notifications():
		page.goto(BASE + "/notifications")
		expect(page.get_by_text("Your pyramid photos were marked")).to_be_visible()
		link = page.get_by_role("link", name=re.compile("New lesson"))
		assert link.get_attribute("href") == "/course/light/learn/2-2", link.get_attribute("href")
		page.get_by_role("button", name="Mark all as read").click()
		expect(page.get_by_role("button", name="Mark all as read")).to_have_count(0)
		shot(page, f"{label}-12-notifications")

	check("notifications page: LMS links become OrbiTutor's, mark all read", notifications)

	def quiz():
		page.goto(BASE + "/course/light/learn/2-3")
		page.get_by_role("link", name=re.compile("Start the quiz", re.I)).click()
		page.wait_for_url(re.compile(r"/quiz/snell-quiz"))
		page.get_by_role("button", name=re.compile("Start", re.I)).first.click()
		page.get_by_label("It bends towards the normal").check()
		shot(page, f"{label}-14-quiz")
		page.get_by_role("button", name=re.compile("Check", re.I)).first.click()
		expect(page.get_by_text(re.compile("Correct|Right|That's it", re.I)).first).to_be_visible()
		log = server_log(page)
		assert any(m.endswith("check_answer") and st == 200 for m, _a, _u, st in log), "no check_answer"

	check("a quiz opens from its lesson, and practice answers are checked", quiz)

	def student_pages():
		page.goto(BASE + "/schedule")
		expect(page.get_by_role("heading", name=re.compile("Schedule", re.I)).first).to_be_visible()
		expect(page.get_by_text("Bending light, part 2").first).to_be_visible()
		shot(page, f"{label}-15-schedule")
		page.goto(BASE + "/batch/nov-2026")
		expect(page.get_by_role("heading", name="November 2026 batch").first).to_be_visible()
		shot(page, f"{label}-16-batch")
		page.goto(BASE + "/certificates")
		expect(page.get_by_text("Bridge Engineering").first).to_be_visible()
		page.goto(BASE + "/certificate/CERT-0001")
		expect(page.get_by_text("Aisyah Rahman").first).to_be_visible()
		shot(page, f"{label}-17-certificate")
		page.goto(BASE + "/profile")
		page.wait_for_url(re.compile(r"/my-profile$"))
		expect(page.get_by_text("Aisyah Rahman").first).to_be_visible()
		page.goto(BASE + "/settings")
		expect(page.get_by_role("heading", name=re.compile("Settings", re.I)).first).to_be_visible()
		shot(page, f"{label}-18-settings")
		page.goto(BASE + "/lms/courses/light/learn/2.2")
		page.wait_for_url(re.compile(r"/course/light/learn/2-2$"))
		page.goto(BASE + "/teach")
		expect(page.get_by_role("heading", name=re.compile("for instructors", re.I)).first).to_be_visible()
		shot(page, f"{label}-20-teach-refused")

	check("schedule, batch, certificates, profile and settings open here; /lms and Teach don't", student_pages)

	def assignment():
		page.goto(BASE + "/assignment/pyramid-photos?lesson=light-3-1")
		expect(page.get_by_text("Photos of your pyramid build").first).to_be_visible()
		shot(page, f"{label}-19-assignment")

	check("an assignment page shows its marking", assignment)

	def not_found():
		page.goto(BASE + "/course/nope")
		expect(page.get_by_text(re.compile("can't find|couldn't find|not found", re.I)).first).to_be_visible()
		page.goto(BASE + "/course/light/oops")
		expect(page.get_by_text(re.compile("Page not found", re.I)).first).to_be_visible()
		shot(page, f"{label}-13-notfound")

	check("missing course and page show not found", not_found)

	def sign_out():
		if phone:
			page.goto(BASE + "/")
			page.get_by_role("navigation").last.get_by_role("button").last.click()
		else:
			page.goto(BASE + "/")
			page.locator(".ot-topbar__menu button").first.click()
		page.get_by_role("button", name=re.compile("Sign out", re.I)).click()
		page.wait_for_url(re.compile(r"/login\?signed-out=1"))
		expect(page.get_by_text(re.compile("signed out", re.I)).first).to_be_visible()

	check("signing out lands on sign-in with a note", sign_out)

	def session_ends():
		sign_in(page, "aisyah@example.com")
		page.wait_for_url(re.compile(r"/$"))
		expect(page.get_by_text("Light & Holograms").first).to_be_visible()
		page.request.post(BASE + "/api/method/__drop", data="{}", headers={"Content-Type": "application/json"})
		page.locator("a[href='/my-courses']:visible").first.click()
		page.wait_for_url(re.compile(r"/login\?redirect-to=.*expired=1"))
		expect(page.get_by_text("Please sign in again").first).to_be_visible()

	check("a session that ended mid-use goes to sign-in, then back", session_ends)

	# ---- passwords ----
	def invite():
		page.goto(BASE + "/update-password?key=invitekey12345")
		expect(page.get_by_text(re.compile("Danial")).first).to_be_visible()
		assert "key=" not in page.url, "the key stayed in the address"
		page.locator("input[type=password]").first.fill("password123")
		page.get_by_role("button", name=re.compile("Set|Save|Start|Create", re.I)).first.click()
		page.wait_for_timeout(300)
		page.locator("input[type=password]").first.fill("Hologram-Pyramid-77")
		page.get_by_role("button", name=re.compile("Set|Save|Start|Create", re.I)).first.click()
		page.wait_for_url(re.compile(r"/$"))
		expect(page.get_by_text(re.compile("Welcome to OrbiTutor, Danial")).first).to_be_visible()
		shot(page, f"{label}-14-welcome")
		page.context.clear_cookies()

	check("a welcome link sets a password and opens Home", invite) if label == "laptop" else None

	def reset_links():
		page.goto(BASE + "/update-password?key=oldkey123456")
		expect(page.get_by_text(re.compile("expired", re.I)).first).to_be_visible()
		page.goto(BASE + "/update-password?key=bogus-key-123")
		expect(page.get_by_text(re.compile("doesn't work|no longer works|used|isn't valid", re.I)).first).to_be_visible()
		page.goto(BASE + "/update-password?email=reset%40example.com")
		page.get_by_role("button", name=re.compile("Send|Email me", re.I)).first.click()
		expect(page.get_by_text("Check your email").first).to_be_visible()

	check("expired and used links, and asking for a new one", reset_links)

	def reset():
		page.goto(BASE + "/update-password?key=resetkey12345")
		expect(page.get_by_text("Set a new password").first).to_be_visible()
		page.locator("input[type=password]").first.fill("Telescope-Night-2026")
		page.get_by_role("button", name=re.compile("Save|Set", re.I)).first.click()
		expect(page.get_by_text(re.compile("saved|changed|all set", re.I)).first).to_be_visible()
		page.context.clear_cookies()

	check("a reset link sets a new password", reset) if label == "laptop" else None

	# ---- signing up: make an account, set the password from the email, look around ----
	page.context.clear_cookies()

	def sign_up_link():
		page.goto(BASE + "/login")
		page.get_by_role("link", name="Create an account").click()
		page.wait_for_url(re.compile(r"/signup$"))
		expect(page.get_by_role("heading", name="Create your account")).to_be_visible()
		shot(page, f"{label}-15-signup")

	check("sign-in links to Create an account", sign_up_link)

	email = f"zara.{label}@example.com"

	def sign_up():
		page.get_by_label("Your name").fill("Zara Ismail")
		page.get_by_label("Email").fill(email)
		page.get_by_role("button", name="Create my account").click()
		expect(page.get_by_role("heading", name="Check your email")).to_be_visible()
		shot(page, f"{label}-16-signup-sent")

	check("signing up says to check your email", sign_up)

	def set_password():
		mail = [m for m in server_mail(page) if m["to"] == [email]]
		assert mail and mail[-1]["template"] == "new_user" and mail[-1]["args"].get("signed_up"), mail
		link = mail[-1]["args"]["link"].replace("http://localhost:8000", BASE)
		page.goto(link)
		expect(page.get_by_text(re.compile("almost there", re.I)).first).to_be_visible()
		expect(page.get_by_text(re.compile("Welcome to OrbiTutor, Zara")).first).to_be_visible()
		shot(page, f"{label}-17-almost-there")
		page.locator("input[type=password]").first.fill("Rocket-Garden-Lamp-42")
		page.get_by_role("button", name=re.compile("Set password", re.I)).click()
		page.wait_for_url(re.compile(r"/$"))
		expect(page.get_by_text(re.compile("Welcome to OrbiTutor, Zara")).first).to_be_visible()
		shot(page, f"{label}-18-new-home")

	check("the emailed link sets the password and opens Home for someone new", set_password)

	def look_around():
		page.goto(BASE + "/course/light")
		expect(page.get_by_role("heading", name="Light & Holograms")).to_be_visible()
		expect(page.get_by_role("button", name="Fill in a short form")).to_be_visible()
		page.goto(BASE + "/course/light/learn/1-2")
		expect(page.get_by_role("link", name=re.compile("See how to join", re.I))).to_be_visible()
		page.goto(BASE + "/my-courses")
		expect(page.get_by_role("heading", name="My courses")).to_be_visible()

	check("a new account can look around but not open lessons", look_around)

	def signed_in_signup():
		page.goto(BASE + "/signup")
		page.wait_for_url(re.compile(r"/$"))

	check("signed in, /signup goes to Home", signed_in_signup)
	page.context.clear_cookies()

	ctx.close()


def run_staff(browser, width, height, label):
	ctx = browser.new_context(viewport={"width": width, "height": height}, color_scheme="dark")
	page = ctx.new_page()
	page.set_default_timeout(8000)
	watch(page, label)
	phone = width < 720
	print(f"\n{label} ({width}x{height})")
	page.request.post(BASE + "/api/method/__reset", data="{}", headers={"Content-Type": "application/json"})

	def lands_in_teach():
		sign_in(page, "farid@orbit-core.com")
		page.wait_for_url(re.compile(r"/teach$"))
		expect(page.get_by_role("heading", name=re.compile(r"^Good (morning|afternoon|evening), Farid"))).to_be_visible()
		expect(page.get_by_text("Photos of your pyramid build").first).to_be_visible()
		shot(page, f"{label}-01-today")

	check("staff land on Today in Teach", lands_in_teach)

	def marking():
		page.goto(BASE + "/teach/marking")
		expect(page.get_by_text("Hafiz Ismail").first).to_be_visible()
		shot(page, f"{label}-02-marking")
		page.goto(BASE + "/teach/marking/assignment/ASG-0002")
		expect(page.get_by_text("Photos of your pyramid build").first).to_be_visible()
		shot(page, f"{label}-03-review")
		page.get_by_role("button", name=re.compile("Save and next", re.I)).click()
		expect(page.get_by_text("Choose Passed or Not passed first.")).to_be_visible()
		page.get_by_text("Passed", exact=True).first.click()
		page.get_by_role("textbox", name="Feedback").fill("Clean edges. Try a darker room.")
		page.get_by_role("button", name=re.compile("Save and next", re.I)).click()
		page.wait_for_url(re.compile(r"/teach/marking/quiz/QS-0001$"))
		expect(page.get_by_text(re.compile("straw", re.I)).first).to_be_visible()
		shot(page, f"{label}-04-quiz-review")
		assert frappe_value(page, "mark_assignment"), "mark_assignment not saved"

	check("marking an assignment, then on to the next piece", marking)

	def courses():
		page.goto(BASE + "/teach/courses")
		page.get_by_role("link", name="Light & Holograms").first.click()
		page.wait_for_url(re.compile(r"/teach/course/light"))
		expect(page.get_by_text("Light and how it moves").first).to_be_visible()
		page.get_by_role("button", name="Add a chapter").click()
		page.get_by_label("New chapter's title").fill("Extra builds")
		page.get_by_role("button", name="Add chapter").click()
		expect(page.get_by_text("Extra builds").first).to_be_visible()
		shot(page, f"{label}-05-outline")
		page.get_by_role("tab", name="Details").click()
		page.get_by_label("Level").fill("Some making experience")
		page.get_by_role("button", name="Save changes").click()
		expect(page.get_by_text(re.compile("changes saved", re.I)).first).to_be_visible()
		shot(page, f"{label}-06-details")
		page.get_by_role("tab", name="Dashboard").click()
		expect(page.get_by_text("How far students have got").first).to_be_visible()
		shot(page, f"{label}-07-dashboard")

	check("a course: add a chapter, change its details, see its dashboard", courses)

	def lesson():
		page.goto(BASE + "/teach/lesson/light-2-2")
		expect(page.get_by_text("Make a water lens").first).to_be_visible()
		shot(page, f"{label}-08-lesson")
		title = page.get_by_label(re.compile("Lesson title|Title", re.I)).first
		title.fill("Refraction in a water drop")
		page.wait_for_timeout(1800)
		assert frappe_value(page, "save_lesson"), "save_lesson not called"

	check("writing a lesson saves by itself", lesson)

	def library():
		page.goto(BASE + "/teach/library")
		expect(page.get_by_text("Snell's law quiz").first).to_be_visible()
		page.goto(BASE + "/teach/quiz/snell-quiz")
		expect(page.get_by_text(re.compile("straw", re.I)).first).to_be_visible()
		shot(page, f"{label}-09-quiz")
		page.goto(BASE + "/teach/exercise/count-stars")
		expect(page.get_by_text("Count the stars").first).to_be_visible()
		shot(page, f"{label}-10-exercise")
		page.goto(BASE + "/teach/assignment/pyramid-photos")
		expect(page.get_by_text("Photos of your pyramid build").first).to_be_visible()
		shot(page, f"{label}-11-assignment")

	check("quizzes, exercises and assignments open", library)

	def batch():
		page.goto(BASE + "/teach/batch/nov-2026")
		expect(page.get_by_role("heading", name="November 2026 batch")).to_be_visible()
		shot(page, f"{label}-12-batch")
		page.get_by_role("tab", name=re.compile("Students")).click()
		expect(page.get_by_text("Hafiz Ismail").first).to_be_visible()
		shot(page, f"{label}-13-batch-students")
		page.get_by_role("tab", name="Classes").click()
		page.get_by_role("button", name="Schedule a class").click()
		dlg = page.get_by_role("dialog")
		dlg.get_by_label("Title").fill("Pyramid show and tell")
		dlg.get_by_label("Date").fill("2027-01-09")
		dlg.get_by_label(re.compile("Meeting link")).fill("https://meet.google.com/abc-defg-hij")
		dlg.get_by_role("button", name="Schedule it").click()
		expect(page.get_by_text("Pyramid show and tell").first).to_be_visible()
		shot(page, f"{label}-14-batch-classes")

	check("a batch: students and a new class", batch)

	def running():
		for path, text, n in (("/teach/requests", "Omar Hakim", 15), ("/teach/certificates", "Aisyah Rahman", 16), ("/teach/people", "Suresh Kumar", 17), ("/teach/statistics", "New students", 18), ("/teach/settings", "Course categories", 19), ("/teach/batches", "December 2026 batch", 20)):
			page.goto(BASE + path)
			expect(page.get_by_text(text).first).to_be_visible()
			shot(page, f"{label}-{n}-{path.rsplit('/', 1)[1]}")

	check("requests, certificates, people, statistics, settings and batches open", running)

	def evaluator():
		ctx.clear_cookies()
		sign_in(page, "suresh@orbit-core.com")
		page.wait_for_url(re.compile(r"/teach$"))
		page.goto(BASE + "/teach/evaluations")
		expect(page.get_by_text("Hafiz Ismail").first).to_be_visible()
		shot(page, f"{label}-21-evaluations")
		page.get_by_role("button", name="Record the result").click()
		dlg = page.get_by_role("dialog")
		dlg.get_by_text("Passed", exact=True).first.click()
		dlg.get_by_role("button", name=re.compile("Save result")).click()
		expect(page.get_by_text("Recorded").first).to_be_visible()

	check("an evaluator records a result", evaluator)
	ctx.close()


def frappe_value(page, method):
	return any(m.endswith("." + method) and st == 200 for m, _a, _u, st in server_log(page))


def server_mail(page):
	r = page.request.post(BASE + "/api/method/__mail", data="{}", headers={"Content-Type": "application/json"})
	return r.json()["message"]


def server_log(page):
	r = page.request.post(BASE + "/api/method/__log", data="{}", headers={"Content-Type": "application/json"})
	return [tuple(x) for x in r.json()["message"]]


with sync_playwright() as p:
	browser = p.chromium.launch()
	run(browser, 1280, 860, "laptop")
	run(browser, 390, 844, "phone")
	run_staff(browser, 1280, 860, "teach-laptop")
	run_staff(browser, 390, 844, "teach-phone")
	browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed")
if problems:
	print("Browser errors:")
	for p_ in problems[:30]:
		print("  " + p_)
sys.exit(1 if failed or problems else 0)
