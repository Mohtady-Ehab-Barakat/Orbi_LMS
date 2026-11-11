from datetime import date, timedelta

import frappe

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def get_schedule(course, batch=None):
	"""The next two weeks of the course's evaluators' free times, grouped by day."""
	evaluators = [r["evaluator"] for r in frappe.DB.match("Course Evaluator", None)]
	out = []
	for n in range(1, 15):
		d = date.today() + timedelta(days=n)
		slots = []
		for e in frappe.DB.match("Course Evaluator", None):
			for s in frappe.DB.match("Evaluator Schedule", {"parent": e["name"]}):
				if s["day"] == DAYS[d.weekday()] and not frappe.DB.match("LMS Certificate Request", {"date": d.isoformat(), "start_time": s["start_time"], "status": "Upcoming"}):
					slots.append({"date": d.isoformat(), "day": s["day"], "start_time": s["start_time"], "end_time": s["end_time"], "evaluator": e["evaluator"]})
		if slots:
			out.append({"display_date": d.strftime("%A %d %B"), "display_timezone": "Asia/Kuala_Lumpur", "slots": slots})
	return out if evaluators else []
