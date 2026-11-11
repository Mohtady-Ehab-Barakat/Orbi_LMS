"""The frappe.utils functions orbitutor uses."""
import html
import re
from datetime import date, datetime, time, timedelta

import frappe


def cint(v, default=0):
	try:
		return int(float(v))
	except (TypeError, ValueError):
		return default


def flt(v, precision=None):
	try:
		f = float(v)
	except (TypeError, ValueError):
		return 0.0
	return round(f, precision) if precision is not None else f


def getdate(v=None):
	if v is None:
		return date.today()
	if isinstance(v, datetime):
		return v.date()
	if isinstance(v, date):
		return v
	return date.fromisoformat(str(v)[:10])


def get_time(v):
	if isinstance(v, time):
		return v
	if isinstance(v, timedelta):
		s = int(v.total_seconds())
		return time(s // 3600, (s % 3600) // 60, s % 60)
	parts = [int(float(x)) for x in str(v).split(":")]
	while len(parts) < 3:
		parts.append(0)
	return time(*parts[:3])


def today():
	return date.today().isoformat()


def add_days(d, n):
	return (getdate(d) + timedelta(days=n)).isoformat()


def now_datetime():
	return datetime.now()


def strip_html(text):
	return re.sub(r"<[^>]*>", "", text or "")


def escape_html(text):
	return html.escape(text or "", quote=True)


def get_url(path=""):
	return "http://localhost:8000" + (path or "")


def get_system_timezone():
	return frappe.DB.single("System Settings").get("time_zone") or "Asia/Kuala_Lumpur"


def random_string(length):
	import secrets
	import string

	return "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(length))


def validate_email_address(email_str, throw=False):
	from email.utils import getaddresses

	out = [addr for _name, addr in getaddresses([(email_str or "").replace("\n", ",")]) if addr and re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", addr)]
	if throw and (email_str or "").strip() and not out:
		raise frappe.ValidationError(f"{email_str} is not a valid Email Address")
	return ", ".join(out)


def cstr(v, encoding="utf-8"):
	if v is None:
		return ""
	if isinstance(v, bytes):
		return v.decode(encoding)
	return str(v)


def nowdate():
	return today()


def get_datetime(v=None):
	if v is None:
		return datetime.now()
	if isinstance(v, datetime):
		return v
	if isinstance(v, date):
		return datetime.combine(v, time())
	s = str(v).strip()
	return datetime.fromisoformat(s[:26]) if len(s) > 10 else datetime.fromisoformat(s)


def formatdate(v=None, format_string=None):
	"""Babel's patterns, the few OrbiTutor uses."""
	d = getdate(v)
	f = format_string or "dd-MM-yyyy"
	out = []
	for token in re.findall(r"E+|d+|M+|y+|[^EdMy]+", f):
		if token.startswith("E"):
			out.append(d.strftime("%A") if len(token) >= 4 else d.strftime("%a"))
		elif token.startswith("d"):
			out.append(f"{d.day:02d}" if len(token) == 2 else str(d.day))
		elif token.startswith("M"):
			out.append(d.strftime("%B") if len(token) >= 4 else d.strftime("%b") if len(token) == 3 else f"{d.month:02d}" if len(token) == 2 else str(d.month))
		elif token.startswith("y"):
			out.append(str(d.year))
		else:
			out.append(token)
	return "".join(out)
