// Loading a screen's data: the last answer for the same call shows at once (going back is
// instant), and a fresh one replaces it when it arrives.
import { call } from "./api.js";

const { useEffect, useRef, useState, useCallback } = React;

const cache = new Map();
const MAX = 40;

function remember(key, data) {
	cache.delete(key);
	cache.set(key, data);
	if (cache.size > MAX) cache.delete(cache.keys().next().value);
}

export function forget(prefix) {
	for (const key of [...cache.keys()]) if (!prefix || key.startsWith(prefix)) cache.delete(key);
}

/**
 * useCall("orbitutor.api.home") or useCall(method, args, { skip }).
 * Gives { data, error, loading, reload, set }.
 */
export function useCall(method, args, { skip = false, fetcher } = {}) {
	const key = method + ":" + JSON.stringify(args || {});
	const [state, setState] = useState(() => ({ key, data: cache.get(key), error: null, loading: !skip }));
	const [tick, setTick] = useState(0);
	const live = useRef(true);

	useEffect(() => () => void (live.current = false), []);

	useEffect(() => {
		if (skip) return undefined;
		const ctl = new AbortController();
		setState((s) => (s.key === key ? { ...s, loading: true } : { key, data: cache.get(key), error: null, loading: true }));
		const run = fetcher ? fetcher(ctl.signal) : call(method, args || {}, { signal: ctl.signal });
		run.then(
			(data) => {
				if (ctl.signal.aborted) return;
				remember(key, data);
				setState({ key, data, error: null, loading: false });
			},
			(error) => {
				if (ctl.signal.aborted || (error && error.name === "AbortError")) return;
				setState((s) => ({ key, data: s.key === key ? s.data : undefined, error, loading: false }));
			}
		);
		return () => ctl.abort();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, tick, skip]);

	const reload = useCallback(() => setTick((t) => t + 1), []);
	const set = useCallback(
		(update) =>
			setState((s) => {
				const data = typeof update === "function" ? update(s.data) : update;
				remember(s.key, data);
				return { ...s, data };
			}),
		[]
	);
	const current = state.key === key ? state : { key, data: cache.get(key), error: null, loading: !skip };
	return { data: current.data, error: current.error, loading: current.loading, reload, set };
}
