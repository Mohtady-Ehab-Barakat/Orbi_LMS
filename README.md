# OrbiTutor

OrbitCore's classes, in OrbiTutor's own design, on Frappe Learning (LMS) v16: the student side and
the staff side (Teach).

OrbiTutor is a Frappe app. It takes the addresses (`/`, `/login`, `/course/...`, `/teach/...`) and
draws them with the OrbiTutor design system, using Frappe Learning's own data and methods. Frappe
Learning stays installed underneath, but its own screens at `/lms` are closed: every `/lms` address
(in its emails, notifications and old bookmarks) goes to OrbiTutor's page for the same thing.
What Teach doesn't do (payments, coupons, jobs, programs, data import, Zoom and Google set-up,
system settings) stays in the desk at `/desk`.

## Students

| Address | Screen |
| --- | --- |
| `/` | Home: live class, what's due, where they left off, their courses, announcements, a new certificate; or a welcome for someone new |
| `/login` | Sign in: OrbitCore account (Authentik), email and password, or an emailed link |
| `/signup` | Make an account: a name and an email, then an emailed link to choose a password. They can look around and ask to join; staff put them in a class |
| `/update-password?key=...` | A welcome link (set a password) or a reset link; without a key, asks for a reset email |
| `/catalogue` | Every published course, by track, with search |
| `/my-courses` | In progress and finished |
| `/course/<name>` | A course: what they'll build and learn, kit, lessons, instructors, batches, and Ask to join (payment is in cash, so staff follow up) |
| `/course/<name>/learn/<chapter>-<lesson>` | A lesson, with Mark as done, the way on, and questions under the lesson |
| `/notifications`, `/search` | Notifications and search |
| `/quiz/<name>` | A quiz: practice (answers checked as they go, when the quiz shows answers) or a test, then the result and, if allowed, the right answers |
| `/assignment/<name>` | An assignment: hand in a picture, PDF, document, link or written answer, then the mark and feedback |
| `/exercise/<name>` | A coding exercise, run in the browser against its tests (needs LMS Settings → LiveCode URL) |
| `/schedule` | Live classes and what's due, by day |
| `/batch/<name>` | A batch: its timetable, courses, instructors, announcements and the final evaluation booking |
| `/certificates`, `/certificate/<name>` | Their certificates; a certificate's own page, which anyone with the link can check |
| `/my-profile`, `/profile/<username>` | Profiles |
| `/settings` | Their name, photo and bio, day or night look, password, signing out of other devices |

SCORM lessons show a note that they can't open here yet.

## Staff: Teach

Instructors (Course Creator), evaluators (Batch Evaluator) and moderators sign in to `/teach`.
Each sees what their role allows; instructors see the courses and batches they teach.

| Address | Screen |
| --- | --- |
| `/teach` | Today: classes today, work waiting to be marked, new join requests, batches starting soon |
| `/teach/marking` | Assignments and open quiz answers waiting, oldest first; marking beside the work, then on to the next |
| `/teach/courses`, `/teach/course/<name>` | A course's outline (add, rename, move and delete chapters and lessons, free previews), details, students and dashboard |
| `/teach/lesson/<name>` | Writing a lesson, saved as you go, with a student's-eye preview |
| `/teach/library` | Quizzes (questions, question bank, settings, results), assignments and coding exercises (tests) |
| `/teach/batches`, `/teach/batch/<name>` | A batch: overview, students (enrol, remove), live classes, assessments, announcements, settings |
| `/teach/requests` | Join requests from the course pages: call, WhatsApp, enrol in a batch |
| `/teach/evaluations` | Evaluators: their free times, and recording an evaluation's result (a pass gives the certificate) |
| `/teach/certificates` | Give one, give a batch's at once, take one back |
| `/teach/people` | Moderators: everyone, their roles, adding staff, password resets, turning an account off |
| `/teach/statistics`, `/teach/settings` | Numbers for the month; sign-up, guest access, categories and the app's name |

A live class with its own link (Google Meet, Zoom, Teams) is kept even when the instructor has no
Google Calendar connected; Frappe Learning then sends no calendar invite. With a Zoom account on the
batch and no link, Frappe Learning makes the Zoom meeting, and needs Google Calendar as before.

Very old links to `/courses/...` and `/batches/...` are redirected by Frappe Learning itself before
OrbiTutor can see which course or batch they meant, so they end on the catalogue and the schedule.
OrbiTutor's emails and notifications use its own addresses.

Addresses are singular (`/course/`, `/batch/`) because Frappe Learning redirects `/courses/` and
`/batches/` to its own app before any other app can answer. A student's own profile is
`/my-profile` because Frappe keeps `/profile` for its account page (OrbiTutor redirects it).
Frappe's own sign-in page stays at `/staff-login`, for staff with two-step sign-in.

## Installing

See [deploy/README.md](deploy/README.md): it builds a frappe_docker image with Frappe 16,
payments, Frappe Learning 16 and this app, then installs it on the site.

Then run the self-check on the server. It changes nothing and prints what to fix:

```bash
bench --site classes.orbit-core.com execute orbitutor.checks.run
```

## Setting it up

In the desk, after installing:

1. **LMS Settings**: tick *Allow Guest Access* so visitors can browse the catalogue and course
   pages (and ask to join) before they have an account.
2. **Website Settings**: *App Name* `OrbiTutor`. It's the tab title and the name in emails.
3. **System Settings**: tick *Disable Standard Email Footer*; OrbiTutor's emails have their own.
4. **Each course** (`/desk/lms-course/<name>`), in the *OrbiTutor app* section: Track, Level,
   Length, What they build, the project's page on the website, What they'll learn (one per line)
   and Kit needed (one per line, "Arduino Nano - we lend you one").
5. **Sign-in with the OrbitCore account**: a Social Login Key for Authentik (enabled, with client
   ID, secret and base URL). OrbiTutor shows "Continue with OrbitCore account" when one is set up.
6. Optional, in the site's config: `bench --site <site> set-config orbitutor_whatsapp "https://wa.me/60102345601"`
   and `orbitutor_email` (where join requests are emailed; default orbitutor@orbit-core.com).

Join requests from the course pages arrive in **Teach → Join requests** and by email. Call them,
take payment, then **Enrol in a batch** from the request: that enrols them and marks it Enrolled.

## Accounts and enrolment

- **Anyone can make an account** at `/signup` (or "Create an account" on the sign-in page). It's a
  Website User with the LMS Student role. They get a welcome email to choose a password, then they
  can see Home, browse every course and its page, open preview lessons, and ask to join.
  *Website Settings → Disable Signup* turns this off; the page then says to message OrbitCore.
- **Only staff put a student in a class.** In Teach, open the batch, then **Students → Enrol
  students** (or enrol them from their join request); the batch's courses come with it, and Frappe
  Learning sends the enrolment email. Frappe Learning keeps batches to staff
  unless a batch has *Allow Self Enrollment* ticked, so leave that off. OrbiTutor also stops a
  student enrolling themselves in a course directly (from Frappe Learning's own pages), whatever the
  course's *Disable Self Learning* says. Staff can still enrol anyone: a site administrator, a
  Moderator, or one of the course's instructors.
- Moderators add staff in **Teach → People**. Staff can also make a student's account in the desk
  (`/desk/user/new` with *Send Welcome Email*); that welcome says "You're enrolled" instead of
  "Almost there".
- Welcome links use *System Settings → Reset Password Link Expiry Duration* (20 minutes by default).
  That suits a sign-up; for accounts staff make, a day or two is kinder, and reset links get the same.

## How it's put together

- `orbitutor/www/_orbitutor.html` is the one page behind every OrbiTutor address. It sends the
  boot object (who's signed in, the CSRF token, how they can sign in) and loads the app from
  `/assets/orbitutor/ui/`.
- `orbitutor/api.py` puts together what a screen needs in one call (Home, a course page, the
  catalogue), and adds what Frappe Learning doesn't do: checking a welcome or reset link before
  it's used, searching lesson titles, questions under a lesson with instructors marked, and asking
  to join. Lessons, outlines, progress and notifications come from Frappe Learning's own methods.
- `orbitutor/learn.py` does the same for the other student pages (quizzes, assignments, exercises,
  schedule, batch, certificates, profile, settings), and `orbitutor/teach.py` for Teach. Changes
  go through Frappe Learning's own documents and methods, so its rules (seats, permissions, who may
  mark what) still apply; Teach checks first, to say what's wrong in plain words.
- `orbitutor/hooks.py` maps the addresses, makes `/` the app's Home, closes `/lms` (each address
  goes to OrbiTutor's page for it), sends students to Home and staff to Teach after signing in,
  adds the course fields and the quiz attempt's "reviewed" tick, and emails a student when an
  assignment is marked.
- `orbitutor/templates/emails/` replaces Frappe's and Frappe Learning's email layout and wording.
- `orbitutor/checks.py` is the self-check above.

## Changing the app's screens

The screens are in `frontend/src` (React 18, plain JavaScript with JSX). The built files are
committed in `orbitutor/public/ui`, so the server never needs Node to build them.

```bash
cd frontend
npm install
npm run build      # or: npm run watch
```

`frontend/vendor` holds the OrbiTutor design system (`bundle.js`, `bundle.css`, `tokens.css`,
fonts) and React 18. To take a newer design system, replace those files and build again.

To try the screens without a Frappe server, run `python3 dev/server.py` (sample data, real
`api.py`); `dev/README.md` has the accounts and the tests.

Everything the app shows from Frappe as HTML (course descriptions, lesson text, replies) is cleaned
with DOMPurify first. Calls send Frappe's CSRF token; welcome and reset keys are taken out of the
address bar as soon as they're read; the sign-in redirect only ever goes to a page on this site;
Ask to join is rate-limited and has a hidden field that catches robots.
