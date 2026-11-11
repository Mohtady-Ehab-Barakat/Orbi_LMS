"""The one page that serves the OrbiTutor app, at every address in hooks.APP_ROUTES and at "/".

It sends the app's files and a boot object (who's signed in, the CSRF token, how they can sign
in), and the app draws the page in the browser.
"""

import json
import os

import frappe

from orbitutor.api import get_boot

no_cache = 1

_manifest = {}


def get_context(context):
	boot = get_boot()
	context.no_cache = 1
	context.title = boot.get("app_name") or "OrbiTutor"
	context.boot_json = script_json(boot)
	context.v = asset_versions()
	context.theme = (boot.get("user") or {}).get("theme") or "night"
	return context


def script_json(value) -> str:
	"""JSON that's safe inside a <script> element."""
	text = json.dumps(value, default=str, separators=(",", ":"))
	for raw, escaped in (("<", "\\u003c"), (">", "\\u003e"), ("&", "\\u0026"), (" ", "\\u2028"), (" ", "\\u2029")):
		text = text.replace(raw, escaped)
	return text


def asset_versions() -> dict:
	"""A short hash of each built file, so browsers fetch a file again only when it changes."""
	path = frappe.get_app_path("orbitutor", "public", "ui", "manifest.json")
	try:
		mtime = os.path.getmtime(path)
	except OSError:
		return {}
	if _manifest.get("mtime") != mtime:
		with open(path) as f:
			_manifest.update(mtime=mtime, files=json.load(f))
	return _manifest.get("files") or {}
