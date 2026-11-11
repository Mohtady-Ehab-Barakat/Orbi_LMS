// Search: courses and lesson titles, from orbitutor.api.search. Under the top bar on laptops,
// the whole screen on phones.
import { call } from "../lib/api.js";
import { TRACK_TITLES, plural } from "../lib/format.js";

const O = window.OrbiTutor;
const { useEffect, useRef, useState } = React;

const SUGGESTIONS = ["light", "Python", "Arduino", "bridges"];

function usePhone() {
	const query = "(max-width: 719px)";
	const [phone, setPhone] = useState(() => window.matchMedia(query).matches);
	useEffect(() => {
		const mq = window.matchMedia(query);
		const on = () => setPhone(mq.matches);
		mq.addEventListener("change", on);
		return () => mq.removeEventListener("change", on);
	}, []);
	return phone;
}

export function useSearch(initial = "") {
	const [query, setQuery] = useState(initial);
	const [result, setResult] = useState({ courses: [], lessons: [], loading: false, error: null });
	const seq = useRef(0);
	useEffect(() => {
		const q = query.trim();
		const n = ++seq.current;
		if (q.length < 2) {
			setResult({ courses: [], lessons: [], loading: false, error: null });
			return undefined;
		}
		setResult((r) => ({ ...r, loading: true }));
		const timer = setTimeout(() => {
			call("orbitutor.api.search", { query: q }).then(
				(data) => {
					if (n !== seq.current) return;
					setResult({
						loading: false,
						error: null,
						courses: (data.courses || []).slice(0, 5).map((c) => ({
							id: c.name,
							title: c.title,
							track: c.track || undefined,
							href: c.href,
							meta: [TRACK_TITLES[c.track], c.lessons ? plural(c.lessons, "lesson") : null].filter(Boolean).join(" · "),
						})),
						lessons: (data.lessons || []).slice(0, 8).map((l) => ({
							id: l.href,
							title: l.title,
							href: l.href,
							icon: "reading",
							track: l.track || undefined,
							meta: l.course,
						})),
					});
				},
				(error) => n === seq.current && setResult({ courses: [], lessons: [], loading: false, error })
			);
		}, 250);
		return () => clearTimeout(timer);
	}, [query]);
	return { query, setQuery, ...result };
}

function noResults() {
	return (
		<O.Button variant="secondary" size="sm" icon="courses" href="/catalogue">
			Browse all courses
		</O.Button>
	);
}

export function SearchOverlay({ onClose }) {
	const phone = usePhone();
	const s = useSearch();
	const box = useRef(null);

	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && onClose();
		const onDown = (e) => box.current && !box.current.contains(e.target) && onClose();
		document.addEventListener("keydown", onKey);
		document.addEventListener("mousedown", onDown);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("mousedown", onDown);
		};
	}, [onClose]);

	const panel = (
		<O.SearchPanel
			variant={phone ? "screen" : "dropdown"}
			query={s.query}
			onQueryChange={s.setQuery}
			courses={s.courses}
			lessons={s.lessons}
			loading={s.loading}
			suggestions={SUGGESTIONS}
			noResultsText={s.error ? "Search isn't working right now. Try again in a moment." : undefined}
			noResultsAction={noResults()}
			onClose={onClose}
			autoFocus
		/>
	);
	if (phone) return <div ref={box}>{panel}</div>;
	return (
		<div className="app-search-layer" role="presentation">
			<div className="app-search-box" ref={box}>
				{panel}
			</div>
		</div>
	);
}
