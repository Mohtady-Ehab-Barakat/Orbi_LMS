// Signing in, setting a password from a welcome link, and resetting a forgotten one, on Frappe's
// own methods: login, send_login_link, reset_password and update_password.
import { boot, call } from "../lib/api.js";
import { whatsapp } from "../lib/format.js";
import { navigate, useQuery } from "../lib/router.js";
import { Loading } from "./Problem.jsx";

const O = window.OrbiTutor;
const { useEffect, useState } = React;

const login = boot.login || {};
const help = () => whatsapp("Hi OrbiTutor, I can't sign in.");
const frameProps = () => ({ homeHref: "/", helpHref: help() });

// Where to go after signing in. Frappe's home page for students is OrbiTutor's own page.
function landing(target) {
	const safe = O.safeRedirect(target, "/");
	return /^\/(_orbitutor|login|update-password)(\/|\?|$)/.test(safe) ? "/" : safe;
}

function loginProblem(e) {
	const msg = String((e && e.message) || "");
	if (!e || e.status === 0) return { kind: "offline" };
	if (e.status === 429) return { kind: "rate" };
	if (/locked/i.test(msg)) {
		const m = msg.match(/(\d+)\s*seconds?/i);
		return { kind: "locked", seconds: m ? +m[1] : undefined };
	}
	if (/disabled or missing/i.test(msg)) return { kind: "disabled" };
	if (/not allowed/i.test(msg)) return { kind: "server", message: msg };
	if (e.status === 401 || e.status === 403 || e.exc_type === "AuthenticationError") return { kind: "wrong" };
	return { kind: "server", message: msg || undefined };
}

function ssoFor(redirectTo, onFail) {
	const p = (login.providers || [])[0];
	if (!p) return null;
	const ours = /orbit|authentik/i.test(p.name + " " + p.label);
	return {
		label: ours ? undefined : "Continue with " + p.label,
		href: "#",
		onClick: async (e) => {
			e.preventDefault();
			try {
				const url = await call("orbitutor.api.sso_url", { provider: p.name, redirect_to: landing(redirectTo) });
				window.location.assign(url);
			} catch (err) {
				onFail(err.status === 0 ? { kind: "offline" } : err.status === 429 ? { kind: "rate" } : { kind: "sso-failed" });
			}
		},
	};
}

export function SignIn() {
	const q = useQuery();
	const redirectTo = q.get("redirect-to");
	const [error, setError] = useState(null);

	useEffect(() => {
		if (boot.user) navigate(landing(redirectTo), { replace: true });
		document.title = "Sign in · " + (boot.app_name || "OrbiTutor");
	}, [redirectTo]);
	if (boot.user) return null;

	const notice = q.has("signed-out") ? "signed-out" : q.has("expired") ? "expired" : q.has("everywhere") ? "everywhere" : q.has("password-saved") ? "password-saved" : undefined;

	async function onSignIn({ email, password }) {
		try {
			const res = await call("login", { usr: email, pwd: password }, { raw: true });
			if (res && (res.verification || res.tmp_id)) {
				// two-step sign-in: Frappe's own page does it
				window.location.assign("/staff-login" + (redirectTo ? "?redirect-to=" + encodeURIComponent(landing(redirectTo)) : ""));
				return new Promise(() => {});
			}
			window.location.assign(landing(redirectTo || (res && res.home_page)));
			return new Promise(() => {});
		} catch (e) {
			return { error: loginProblem(e) };
		}
	}

	async function onEmailLink(email) {
		try {
			await call("frappe.www.login.send_login_link", { email });
			return undefined;
		} catch (e) {
			// the same answer whether or not the email has an account
			if (e.status === 404 || e.exc_type === "DoesNotExistError") return undefined;
			return { error: e.status === 429 ? { kind: "rate" } : e.status === 0 ? { kind: "offline" } : { kind: "server", message: e.message } };
		}
	}

	return (
		<O.SignIn
			{...frameProps()}
			sso={ssoFor(redirectTo, setError)}
			password={login.password !== false}
			emailLink={!!login.email_link}
			linkMinutes={login.email_link_minutes || 10}
			email={q.get("email") || undefined}
			onSignIn={onSignIn}
			onEmailLink={onEmailLink}
			onForgot={(email) => navigate("/update-password" + (email ? "?email=" + encodeURIComponent(email) : ""))}
			notice={notice}
			error={error || undefined}
			joinHref={boot.guest_access ? "/catalogue" : undefined}
			signUpHref={login.signup ? "/signup" : undefined}
		/>
	);
}

function signUpProblem(e) {
	if (!e || e.status === 0) return { kind: "offline" };
	if (e.status === 429) return { kind: "rate" };
	if (e.status === 403) return { kind: "closed" };
	return { kind: "server", message: e.status === 417 ? e.message : undefined };
}

export function SignUp() {
	const q = useQuery();
	useEffect(() => {
		if (boot.user) navigate("/", { replace: true });
	}, []);
	if (boot.user) return null;

	async function onSignUp({ name, email, website }) {
		try {
			await call("orbitutor.api.sign_up", { full_name: name, email, website: website || null });
			return undefined;
		} catch (e) {
			return { error: signUpProblem(e) };
		}
	}

	return (
		<O.SignUp
			{...frameProps()}
			closed={!login.signup}
			email={q.get("email") || undefined}
			linkMinutes={login.reset_link_minutes || undefined}
			signInHref="/login"
			onSignUp={onSignUp}
		/>
	);
}

function passwordProblem(e) {
	const msg = String((e && e.message) || "");
	if (!e || e.status === 0) return { kind: "offline" };
	if (e.status === 410) return { kind: /expired/i.test(msg) ? "expired" : "used" };
	if (e.status === 429) return { kind: "rate" };
	if (e.status === 417 || e.exc_type === "ValidationError") return { kind: "weak", message: msg || undefined };
	return { kind: "server", message: msg || undefined };
}

async function requestReset(email) {
	try {
		await call("frappe.core.doctype.user.user.reset_password", { user: email });
		return undefined;
	} catch (e) {
		if (e.status === 404 || e.exc_type === "DoesNotExistError") return undefined;
		return { error: e.status === 429 ? { kind: "rate" } : e.status === 0 ? { kind: "offline" } : { kind: "server", message: e.message } };
	}
}

export function UpdatePassword() {
	const q = useQuery();
	// the key is read once and taken out of the address bar and history
	const [key] = useState(() => O.takeUrlKey("key"));
	const [info, setInfo] = useState(key ? null : { valid: false, reason: "none" });
	const [target, setTarget] = useState("/");

	useEffect(() => {
		document.title = "Your password · " + (boot.app_name || "OrbiTutor");
		if (!key) return;
		call("orbitutor.api.reset_key_info", { key }).then(setInfo, (e) =>
			setInfo({ valid: false, reason: e.status === 429 ? "rate" : e.status === 0 ? "offline" : "used" })
		);
	}, [key]);

	if (!info) return <Loading lines={3} />;

	const minScore = login.min_password_score || undefined;
	const linkMinutes = login.reset_link_minutes || undefined;

	async function save(password, signOutOthers) {
		try {
			const next = await call("frappe.core.doctype.user.user.update_password", {
				new_password: password,
				key,
				logout_all_sessions: signOutOthers ? 1 : 0,
			});
			setTarget(landing(typeof next === "string" ? next : "/"));
			return undefined;
		} catch (e) {
			return { error: passwordProblem(e) };
		}
	}

	if (info.invite) {
		return (
			<O.AcceptInvite
				{...frameProps()}
				status={info.valid ? "ready" : info.reason === "expired" ? "expired" : "used"}
				kind={info.enrolled === false ? "signup" : "invite"}
				student={{ name: info.first_name || undefined, email: info.email || undefined }}
				minScore={minScore}
				onSetPassword={async ({ password }) => {
					const res = await save(password, false);
					if (!res) {
						window.location.assign("/");
						return new Promise(() => {});
					}
					return res;
				}}
				onResend={info.email ? requestReset : undefined}
				signInHref="/login"
				forgotHref="/update-password"
			/>
		);
	}

	const step = !key ? "request" : info.valid ? "reset" : info.reason === "expired" ? "expired" : "invalid";
	return (
		<O.PasswordReset
			{...frameProps()}
			step={step}
			email={info.email || q.get("email") || undefined}
			name={info.first_name || undefined}
			linkMinutes={linkMinutes}
			minScore={minScore}
			onRequest={requestReset}
			onReset={({ password, signOutOthers }) => save(password, signOutOthers)}
			signInHref="/login"
			onDone={(e) => {
				if (e && e.preventDefault) e.preventDefault();
				window.location.assign(target);
			}}
		/>
	);
}
