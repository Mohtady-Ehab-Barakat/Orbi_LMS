// What a screen shows when its data didn't come: not found, no access, offline, busy, down for
// maintenance, or broken. Signed-out students are sent to sign in and brought back.
import { boot, call, signInHref, stillSignedIn } from "../lib/api.js";
import { whatsapp } from "../lib/format.js";
import { navigate, useLocation } from "../lib/router.js";

const O = window.OrbiTutor;
const { useEffect, useState } = React;

export const helpHref = () => whatsapp("Hi OrbiTutor, I need a hand with the app.");

function withFlag(href, flag) {
	return href + (href.includes("?") ? "&" : "?") + flag;
}

/** Send a signed-out student to sign in, coming back here afterwards. */
export function SignInRedirect({ expired = false }) {
	useEffect(() => {
		const href = signInHref();
		navigate(expired ? withFlag(href, "expired=1") : href, { replace: true });
	}, [expired]);
	return null;
}

export function Problem({ error, what = "page", onRetry, course }) {
	const { path, search } = useLocation();
	const signedIn = !!boot.user;
	const kind = O.problemKind(error, { signedIn });
	const [ended, setEnded] = useState(false);
	const help = helpHref();

	useEffect(() => {
		// a refused call from someone who was signed in may just be a session that ended
		if (signedIn && (kind === "noAccess" || kind === "signedOut" || (error && error.exc_type === "CSRFTokenError"))) {
			stillSignedIn().then((ok) => !ok && setEnded(true));
		}
	}, [error, kind, signedIn]);

	if (ended) return <SignInRedirect expired />;
	if (kind === "signedOut" && !signedIn) return <SignInRedirect />;

	switch (kind) {
		case "offline":
			return <O.OfflinePage onRetry={onRetry} helpHref={help} />;
		case "notFound":
			return (
				<O.NotFoundPage
					what={what}
					path={path + search}
					signedIn={signedIn}
					signInHref={signInHref()}
					coursesHref={boot.guest_access || signedIn ? "/catalogue" : undefined}
					onBack={window.history.length > 1 ? () => window.history.back() : undefined}
					helpHref={help}
				/>
			);
		case "noAccess":
		case "signedOut":
			return (
				<O.NoAccessPage
					reason={course ? "course" : "staff"}
					course={course}
					path={path}
					coursesHref="/catalogue"
					signInHref={signInHref()}
					helpHref={help}
				/>
			);
		case "maintenance":
			return (
				<O.MaintenancePage
					onCheck={() =>
						call("orbitutor.api.boot").then(
							() => true,
							() => false
						)
					}
					onBack={onRetry || (() => window.location.reload())}
					helpHref={help}
				/>
			);
		case "readOnly":
			return (
				<O.StatusPage
					art="maintenance"
					eyebrow="Read-only for a moment"
					title="You can look, but not save, for a few minutes"
					actions={
						onRetry ? (
							<O.Button icon="retry" onClick={onRetry}>
								Try again
							</O.Button>
						) : null
					}
					helpHref={help}
				>
					<p>OrbiTutor is being updated. Everything is still here; saving works again in a few minutes.</p>
				</O.StatusPage>
			);
		case "busy":
			return <O.ErrorPage kind="busy" onRetry={onRetry} retryAfter={30} helpHref={help} path={path} />;
		default:
			return (
				<O.ErrorPage
					kind="server"
					onRetry={onRetry}
					code={error && error.status ? String(error.status) : undefined}
					path={path}
					helpHref={help}
				/>
			);
	}
}

/** A screen's loading state: grey shapes where the content will be. */
export function Loading({ lines = 4, blocks = 1 }) {
	return (
		<div className="app-loading" aria-busy="true" aria-label="Loading">
			<O.Skeleton width="40%" height={36} />
			{Array.from({ length: blocks }, (_, i) => (
				<O.Skeleton key={i} shape="block" height={160} />
			))}
			<O.Skeleton lines={lines} />
		</div>
	);
}
