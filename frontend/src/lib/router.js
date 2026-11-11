// A small router on the History API. Links inside the app are ordinary <a href>s: a click on one
// whose address the app draws is caught and turned into a navigation; any other link (the desk,
// /lms, a file, another site) loads normally.

const { useSyncExternalStore } = React;

// The same addresses as APP_ROUTES in hooks.py, plus Home.
export const ROUTES = [
	"/",
	"/login",
	"/signup",
	"/update-password",
	"/welcome",
	"/catalogue",
	"/my-courses",
	"/course/:course",
	"/course/:course/*",
	"/schedule",
	"/batch/:batch",
	"/batch/:batch/*",
	"/certificates",
	"/certificate/:certificate",
	"/my-profile",
	"/profile/:username",
	"/settings",
	"/settings/:section",
	"/notifications",
	"/search",
	"/assignment/:assignment",
	"/quiz/:quiz",
	"/exercise/:exercise",
	"/teach",
	"/teach/*",
];

/** { ...params } when `path` fits `pattern` ("/course/:course/*" puts the rest in params.rest), else null. */
export function match(pattern, path) {
	const p = pattern.split("/").filter(Boolean);
	const s = path.split("/").filter(Boolean);
	const params = {};
	for (let i = 0; i < p.length; i++) {
		if (p[i] === "*") {
			if (i >= s.length) return null;
			params.rest = s.slice(i).map(decode).join("/");
			return params;
		}
		if (i >= s.length) return null;
		if (p[i][0] === ":") params[p[i].slice(1)] = decode(s[i]);
		else if (p[i] !== s[i]) return null;
	}
	return s.length === p.length ? params : null;
}

function decode(part) {
	try {
		return decodeURIComponent(part);
	} catch (e) {
		return part;
	}
}

export function isAppPath(pathname) {
	const path = pathname.replace(/\/+$/, "") || "/";
	return ROUTES.some((r) => match(r, path));
}

const listeners = new Set();
let snapshot = read();

function read() {
	return {
		path: window.location.pathname.replace(/\/+$/, "") || "/",
		search: window.location.search,
		hash: window.location.hash,
		key: (window.history.state && window.history.state.key) || "start",
	};
}

function notify() {
	snapshot = read();
	listeners.forEach((fn) => fn());
}

window.addEventListener("popstate", notify);

let counter = 0;
export function navigate(to, { replace = false, scroll = true } = {}) {
	const url = new URL(to, window.location.origin);
	if (url.origin !== window.location.origin || !isAppPath(url.pathname)) {
		if (replace) window.location.replace(url.href);
		else window.location.assign(url.href);
		return;
	}
	const state = { key: "k" + Date.now().toString(36) + (counter++).toString(36) };
	window.history[replace ? "replaceState" : "pushState"](state, "", url.pathname + url.search + url.hash);
	notify();
	if (scroll && !url.hash) window.scrollTo(0, 0);
}

function subscribe(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function useLocation() {
	return useSyncExternalStore(subscribe, () => snapshot);
}

export function useQuery() {
	const { search } = useLocation();
	return React.useMemo(() => new URLSearchParams(search), [search]);
}

/** Catch clicks on links the app draws itself. */
export function interceptLinks() {
	document.addEventListener("click", (e) => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const a = e.target.closest && e.target.closest("a[href]");
		if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.getAttribute("rel") === "external") return;
		if (a.origin !== window.location.origin || !isAppPath(a.pathname)) return;
		// a link to the same page with only a #hash: let the browser scroll
		if (a.pathname === window.location.pathname && a.search === window.location.search && a.hash) return;
		e.preventDefault();
		navigate(a.pathname + a.search + a.hash);
	});
}
