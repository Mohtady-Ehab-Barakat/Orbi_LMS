import frappe


def create_live_class(batch_name, zoom_account, title, duration, date, time, timezone, auto_recording, description=None):
	return frappe.get_doc({"doctype": "LMS Live Class", "batch_name": batch_name, "zoom_account": zoom_account, "title": title, "duration": duration, "date": date, "time": time, "timezone": timezone,
	                       "description": description, "host": frappe.session.user, "join_url": "https://zoom.us/j/123456789", "start_url": "https://zoom.us/s/123456789"}).insert()
