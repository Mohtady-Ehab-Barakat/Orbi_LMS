# Trying the app without a Frappe server

`server.py` serves OrbiTutor's real page and built files, and answers the app's calls with sample
data: OrbitCore's 14 courses, a student part-way through two of them, a batch with live classes,
announcements, notifications and questions. OrbiTutor's own methods run the real
`orbitutor/api.py`, over a small stand-in for Frappe (`fake/`) that keeps the tables in memory.
Frappe's and Frappe Learning's methods are imitated as version 16 answers them.

```bash
python3 dev/server.py 8765          # then open http://127.0.0.1:8765
```

Sign in as `aisyah@example.com` (a student part-way through), `nadia@example.com` (brand new),
`omar@example.com` (asked to join) or `hafiz@example.com` (work waiting to be marked); for Teach,
`farid@orbit-core.com` (moderator), `mei@orbit-core.com` (instructor of one batch) or
`suresh@orbit-core.com` (evaluator). All use the password `Orbit-Tutor-2026!`. Or make a new
account at `/signup`: the emails the server would send are listed by `POST /api/method/__mail`,
link included. A welcome link:
`/update-password?key=invitekey12345`; a reset link: `/update-password?key=resetkey12345`.

Checks:

```bash
python3 dev/api_test.py             # the API, no browser
python3 dev/staff_test.py           # the student pages' and Teach's methods, no browser
python3 dev/e2e.py --shots          # students and staff in a browser (needs: pip install playwright; playwright install chromium)
```

Nothing here is installed on the server; it's only for working on the screens.
