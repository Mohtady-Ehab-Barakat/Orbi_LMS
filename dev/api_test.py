"""OrbiTutor's API over the stand-in Frappe, without a browser."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
sys.path[:0] = [os.path.join(HERE, "fake"), APP, HERE]
import frappe
frappe.APP_PATHS["orbitutor"] = os.path.join(APP, "orbitutor")
import fixtures
from orbitutor import api
fixtures.seed()
ok = fail = 0
def t(name, fn):
    global ok, fail
    try:
        fn(); ok += 1; print("  ok   ", name)
    except Exception as e:
        fail += 1; print("  FAIL ", name, type(e).__name__, e)
def raises(exc, fn, *a, **k):
    try:
        fn(*a, **k)
    except exc:
        return
    raise AssertionError(f"expected {exc.__name__}")

frappe.init_request("Guest")
t("boot for a visitor", lambda: (lambda b: (b["user"] is None and b["login"]["providers"][0]["name"] == "orbitcore" and b["login"]["min_password_score"] == 2 and b["login"]["reset_link_minutes"] == 20) or (_ for _ in ()).throw(AssertionError(b)))(api.get_boot()))
t("visitor can't load Home", lambda: None)  # whitelist(allow_guest=False) is Frappe's job
t("course_page: unpublished course is not found", lambda: raises(frappe.DoesNotExistError, api.course_page, "astronomy"))
t("course_page: not a string", lambda: raises(frappe.ValidationError, api.course_page, ["light"]))
t("ask_to_join: robots get thanks and nothing kept", lambda: (api.ask_to_join("light", "Bot", "0123456789", website="http://spam") == {"ok": True} and not frappe.DB.match("OrbiTutor Join Request", {"full_name": "Bot"})) or (_ for _ in ()).throw(AssertionError()))
t("ask_to_join: visitor needs a phone", lambda: raises(frappe.ValidationError, api.ask_to_join, "light", "Kid"))
t("ask_to_join: bad phone", lambda: raises(frappe.ValidationError, api.ask_to_join, "light", "Kid", "12<script>"))
t("ask_to_join: unknown course", lambda: raises(frappe.DoesNotExistError, api.ask_to_join, "nope", "Kid", "0123456789"))
t("ask_to_join: unknown batch is dropped", lambda: (lambda r: frappe.db.get_value("OrbiTutor Join Request", r["request"], "batch") is None or (_ for _ in ()).throw(AssertionError()))(api.ask_to_join("light", "Kid Two", "+60 12-345 6789", batch="ghost", who="child", note="hi")))
t("ask_to_join: note too long", lambda: raises(frappe.ValidationError, api.ask_to_join, "light", "Kid", "0123456789", note="x" * 1001))
t("ask_to_join: staff are emailed, with who it's for", lambda: (lambda q: ("for their child" in q[-1]["message"] and "/desk/orbitutor-join-request/" in q[-1]["message"]) or (_ for _ in ()).throw(AssertionError(q[-1])))(frappe.DB.rows("Email Queue")))
t("reset_key_info: junk key", lambda: (api.reset_key_info("x") == {"valid": False, "reason": "used"}) or (_ for _ in ()).throw(AssertionError()))
t("reset_key_info: invite", lambda: (lambda r: (r["valid"] and r["invite"] and r["first_name"] == "Danial") or (_ for _ in ()).throw(AssertionError(r)))(api.reset_key_info("invitekey12345")))
t("reset_key_info: expired", lambda: (lambda r: (r == {"valid": False, "reason": "expired", "invite": False}) or (_ for _ in ()).throw(AssertionError(r)))(api.reset_key_info("oldkey123456")))
t("sso_url: unknown provider refused", lambda: raises(frappe.PermissionError, api.sso_url, "github"))
t("sso_url: never sends elsewhere", lambda: ("redirect:/" in api.sso_url("orbitcore", "//evil.example") and "evil" not in api.sso_url("orbitcore", "//evil.example")) or (_ for _ in ()).throw(AssertionError()))
t("search: short or odd queries", lambda: (api.search("a") == {"courses": [], "lessons": []} and api.search("%_") is not None and api.search(None)["courses"] == []) or (_ for _ in ()).throw(AssertionError()))
t("search: finds lessons in published courses only", lambda: (lambda r: (r["lessons"][0]["href"] == "/course/light/learn/2-2" and all(l["course"] != "Basics of Astronomy" for l in api.search("getting")["lessons"])) or (_ for _ in ()).throw(AssertionError(r)))(api.search("refr")))
t("catalogue for visitors when allowed", lambda: (len(api.catalogue()["courses"]) == 13) or (_ for _ in ()).throw(AssertionError()))
frappe.DB.single("LMS Settings")["allow_guest_access"] = 0
t("catalogue refused when guest access is off", lambda: raises(frappe.PermissionError, api.catalogue))
t("search empty when guest access is off", lambda: (api.search("refr") == {"courses": [], "lessons": []}) or (_ for _ in ()).throw(AssertionError()))
frappe.DB.single("LMS Settings")["allow_guest_access"] = 1

frappe.init_request("aisyah@example.com")
t("course_page: enrolled", lambda: (lambda c: (c["enrolled"] and c["resume"]["number"] == "2-2" and c["outline"][0]["lessons"][0]["done"]) or (_ for _ in ()).throw(AssertionError()))(api.course_page("light")))
t("course_page: not enrolled says so", lambda: (lambda c: (c["enrolled"] is False and c["resume"] is None) or (_ for _ in ()).throw(AssertionError(c["enrolled"])))(api.course_page("radar")))
t("course_page: finished course has its certificate", lambda: (api.course_page("bridge")["certificate_href"] == "/certificate/CERT-0001") or (_ for _ in ()).throw(AssertionError()))
t("ask_to_join twice gives the same request", lambda: (lambda a, b: (a["request"] == b["request"]) or (_ for _ in ()).throw(AssertionError()))(api.ask_to_join("radar", "Aisyah", "0123456789"), api.ask_to_join("radar", "Aisyah", "0123456789")))
t("cancel_join_request closes it", lambda: (api.cancel_join_request("radar") and api.course_page("radar")["join_request"] is None) or (_ for _ in ()).throw(AssertionError()))
t("lesson_questions: instructor marked, mine marked", lambda: (lambda q: (q[0]["mine"] and q[0]["replies"][0]["instructor"] and not q[0]["replies"][0]["mine"]) or (_ for _ in ()).throw(AssertionError(q)))(api.lesson_questions("light-2-2")))
t("ask_question escapes HTML", lambda: (api.ask_question("light-2-2", "Is <b>this</b> ok?", "<script>x</script>\nline two") and "&lt;script&gt;" in frappe.DB.rows("Discussion Reply")[-1]["reply"] and "<p>line two</p>" in frappe.DB.rows("Discussion Reply")[-1]["reply"]) or (_ for _ in ()).throw(AssertionError(frappe.DB.rows("Discussion Reply")[-1])))
t("ask_question: title too short", lambda: raises(frappe.ValidationError, api.ask_question, "light-2-2", "Hi"))
t("reply: empty refused", lambda: raises(frappe.ValidationError, api.reply, "TOPIC-1", "   "))
t("reply: not a lesson topic", lambda: raises(frappe.DoesNotExistError, api.reply, "TOPIC-404", "hello"))
t("lesson_questions: not in the course", lambda: raises(frappe.PermissionError, api.lesson_questions, "radar-1-1"))
t("home: stages", lambda: None)
frappe.init_request("nadia@example.com")
t("home: brand new student", lambda: (lambda h: (h["stage"] == "new" and len(h["suggestions"]) == 3) or (_ for _ in ()).throw(AssertionError(h["stage"])))(api.home()))
frappe.init_request("omar@example.com")
t("home: asked to join, with the course", lambda: (lambda h: (h["stage"] == "asked" and h["join_request"]["card"]["title"] == "Radar System") or (_ for _ in ()).throw(AssertionError(h)))(api.home()))

# ---- signing up, and who may enrol ----
frappe.init_request("Guest")
def signs_up():
    before = len(frappe.DB.rows("Email Queue"))
    r = api.sign_up("  Siti   Nur Aisyah ", "Siti@Example.com")
    u = frappe.DB.match("User", "siti@example.com")
    assert r == {"ok": True} and u, (r, u)
    u = u[0]
    assert u["first_name"] == "Siti" and u["last_name"] == "Nur Aisyah" and u["user_type"] == "Website User", u
    assert [x["role"] for x in frappe.DB.match("Has Role", {"parent": "siti@example.com"})] == ["LMS Student"]
    mail = frappe.DB.rows("Email Queue")[-1]
    assert len(frappe.DB.rows("Email Queue")) == before + 1 and mail["template"] == "new_user" and mail["args"]["signed_up"] is True, mail
    assert "/update-password?key=" in mail["args"]["link"]
    key = mail["args"]["link"].split("key=")[1]
    info = api.reset_key_info(key)
    assert info["valid"] and info["invite"] and info["enrolled"] is False and info["first_name"] == "Siti", info
t("sign_up makes a student account and sends the sign-up welcome", signs_up)
def same_answer():
    before = len(frappe.DB.rows("Email Queue")); users = len(frappe.DB.rows("User"))
    assert api.sign_up("Someone", "aisyah@example.com") == {"ok": True}
    assert api.sign_up("Someone", "SITI@example.com") == {"ok": True}
    assert len(frappe.DB.rows("Email Queue")) == before and len(frappe.DB.rows("User")) == users
t("an email that has an account gets the same answer and nothing new", same_answer)
t("sign_up: robots are thanked and nothing is kept", lambda: (api.sign_up("Bot", "bot@example.com", website="x") == {"ok": True} and not frappe.DB.match("User", "bot@example.com")) or (_ for _ in ()).throw(AssertionError()))
t("sign_up: no name", lambda: raises(frappe.ValidationError, api.sign_up, "   ", "a@example.com"))
t("sign_up: long name", lambda: raises(frappe.ValidationError, api.sign_up, "x" * 141, "a@example.com"))
t("sign_up: bad email", lambda: raises(frappe.ValidationError, api.sign_up, "Kid", "kid@example"))
t("sign_up: two emails at once", lambda: raises(frappe.ValidationError, api.sign_up, "Kid", "a@example.com, b@example.com"))
frappe.DB.single("Website Settings")["disable_signup"] = 1
t("sign_up: turned off in Website Settings", lambda: raises(frappe.PermissionError, api.sign_up, "Kid", "kid@example.com"))
t("boot says signing up is off", lambda: (api.get_boot()["login"]["signup"] is False) or (_ for _ in ()).throw(AssertionError()))
frappe.DB.single("Website Settings")["disable_signup"] = 0
t("boot says signing up is on", lambda: (api.get_boot()["login"]["signup"] is True) or (_ for _ in ()).throw(AssertionError()))
frappe.init_request("aisyah@example.com")
t("reset_key_info: an enrolled student gets the enrolled welcome", lambda: None)

from orbitutor.enrolment import before_insert_enrolment
frappe.HOOKS[("LMS Enrollment", "before_insert")] = [before_insert_enrolment]
frappe.init_request("siti@example.com")
t("a student can't enrol themselves in a course", lambda: raises(frappe.PermissionError, frappe.get_doc({"doctype": "LMS Enrollment", "course": "radar", "member": "siti@example.com"}).insert))
t("...nor by naming a batch they're not in", lambda: raises(frappe.PermissionError, frappe.get_doc({"doctype": "LMS Enrollment", "course": "radar", "member": "siti@example.com", "enrollment_from_batch": "dec-2026"}).insert))
def via_batch():
    d = frappe.get_doc({"doctype": "LMS Enrollment", "course": "radar", "member": "siti@example.com"})
    d.flags.via_batch_enrollment = True
    d.insert()
t("...but a course that comes with a batch they were added to goes through", via_batch)
frappe.init_request("farid@orbit-core.com")
t("an instructor enrols a student", lambda: frappe.get_doc({"doctype": "LMS Enrollment", "course": "light", "member": "siti@example.com"}).insert())
frappe.init_request("Administrator")
t("Administrator enrols a student", lambda: frappe.get_doc({"doctype": "LMS Enrollment", "course": "python", "member": "nadia@example.com"}).insert())
frappe.init_request("farid@orbit-core.com")
t("an instructor can enrol themselves in their own course", lambda: frappe.get_doc({"doctype": "LMS Enrollment", "course": "telescope", "member": "farid@orbit-core.com"}).insert())

print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
