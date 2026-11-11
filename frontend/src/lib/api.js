// Talking to Frappe: every call is a POST to /api/method/<method> with a JSON body and the
// session's CSRF token, and every failure comes back as an ApiError the problem pages understand.

export const boot = window.orbitutorBoot || {};

export class ApiError extends Error {
	constructor(message, { status = 0, exc_type = "", body = null } = {}) {
		super(message || "Something went wrong.");
		this.name = "ApiError";
		this.status = status;
		this.exc_type = exc_type || (body && body.exc_type) || "";
		this.body = body;
	}
}

function stripTags(text) {
	const div = document.createElement("div");
	div.innerHTML = String(text || "");
	return (div.textContent || "").trim();
}

// Frappe puts what it said in _server_messages (a JSON list of JSON objects), in `message`, or
// in `exception` ("frappe.exceptions.ValidationError: Type your name.").
export function serverMessage(body) {
	if (!body || typeof body !== "object") return "";
	if (body._server_messages) {
		try {
			const list = JSON.parse(body._server_messages);
			for (const raw of list) {
				const m = typeof raw === "string" ? JSON.parse(raw) : raw;
				const text = stripTags(m && (m.message || m));
				if (text) return text;
			}
		} catch (e) {
			// not JSON: fall through
		}
	}
	if (typeof body.message === "string" && body.exc_type) return stripTags(body.message);
	if (typeof body.message === "string" && !body.exc && !body.exception) return stripTags(body.message);
	if (body.exception) return stripTags(String(body.exception).replace(/^[\w.]+:\s*/, ""));
	return "";
}

/**
 * Call a whitelisted method. Resolves to Frappe's `message`, or the whole answer with { raw: true }.
 * Rejects with an ApiError (status 0 when the server couldn't be reached).
 */
export async function call(method, args = {}, { raw = false, signal } = {}) {
	let res;
	try {
		res = await fetch("/api/method/" + method, {
			method: "POST",
			credentials: "same-origin",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"X-Frappe-CSRF-Token": boot.csrf_token || "",
				"X-Requested-With": "XMLHttpRequest",
			},
			body: JSON.stringify(args || {}),
			signal,
		});
	} catch (e) {
		if (e && e.name === "AbortError") throw e;
		throw new ApiError("We couldn't reach OrbiTutor.", { status: 0, exc_type: "NetworkError" });
	}
	let body = null;
	try {
		body = await res.json();
	} catch (e) {
		body = null;
	}
	if (!res.ok || (body && body.exc_type)) {
		const error = new ApiError(serverMessage(body) || res.statusText || "Something went wrong.", {
			status: res.status,
			exc_type: body && body.exc_type,
			body,
		});
		if (boot.user && method !== "frappe.auth.get_logged_user" && (res.status === 401 || res.status === 403 || error.exc_type === "CSRFTokenError")) {
			sessionEnded();
		}
		throw error;
	}
	return raw ? body : body ? body.message : undefined;
}

// The session can end while the app is open (signed out elsewhere, or it timed out). A refused
// call then looks like "no access"; this tells the two apart.
let sessionCheck = null;
export function stillSignedIn() {
	if (!boot.user) return Promise.resolve(false);
	if (!sessionCheck) {
		sessionCheck = call("frappe.auth.get_logged_user")
			.then((user) => !!user && user !== "Guest")
			.catch((e) => (e.status === 0 ? true : false))
			.finally(() => setTimeout(() => (sessionCheck = null), 5000));
	}
	return sessionCheck;
}

// Any refused call from someone who was signed in: if their session has ended, go to sign-in
// (and come back here afterwards) rather than showing old data or "no access".
let leaving = false;
function sessionEnded() {
	stillSignedIn().then((ok) => {
		if (ok || leaving) return;
		leaving = true;
		const href = signInHref();
		window.location.assign(href + (href.includes("?") ? "&" : "?") + "expired=1");
	});
}

export function signInHref(path) {
	const here = path || window.location.pathname + window.location.search;
	return here && here !== "/" ? "/login?redirect-to=" + encodeURIComponent(here) : "/login";
}

export async function signOut() {
	try {
		await call("logout");
	} catch (e) {
		// signed out already, or offline: the next page load decides
	}
	try {
		localStorage.removeItem("orbitutor.cache");
	} catch (e) {
		// storage off
	}
	window.location.assign("/login?signed-out=1");
}
