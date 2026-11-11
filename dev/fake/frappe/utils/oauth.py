def get_oauth_keys(provider):
	return {"client_id": "x", "client_secret": "y"}


def get_oauth2_authorize_url(provider, redirect_to):
	return f"https://auth.orbit-core.com/application/o/authorize/?client_id=orbitutor&state=redirect:{redirect_to}"
