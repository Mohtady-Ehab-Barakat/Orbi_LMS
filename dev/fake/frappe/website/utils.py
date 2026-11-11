import frappe


def is_signup_disabled():
	return frappe.get_website_settings("disable_signup")
