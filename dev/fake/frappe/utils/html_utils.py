import re


def sanitize_html(html, linkify=False, always_sanitize=False, disallowed_tags=None):
	"""Frappe's bleach-based cleaner, roughly: no scripts, styles or event handlers."""
	html = re.sub(r"(?is)<(script|style|iframe|object|embed)\b.*?</\1\s*>", "", html or "")
	html = re.sub(r"(?is)<(script|style|iframe|object|embed)\b[^>]*>", "", html)
	html = re.sub(r"(?i)\s+on[a-z]+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", html)
	return re.sub(r"(?i)javascript:", "", html)
