def rate_limit(limit=None, seconds=None, **kwargs):
	def wrap(fn):
		return fn

	return wrap
