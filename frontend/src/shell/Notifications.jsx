// Notifications: Frappe Learning's own list (Notification Log), shared by the bell and the
// Notifications page, fetched when the app opens, every two minutes and when the tab comes back.
import { boot, call } from "../lib/api.js";
import { dayGroup, when } from "../lib/format.js";
import { fromLmsLink, notificationKind } from "../lib/links.js";
import { plainText } from "../lib/safe.js";

const O = window.OrbiTutor;
const { useEffect, useState, useSyncExternalStore } = React;

let state = { items: null, error: null };
const listeners = new Set();
let started = false;
let inflight = null;

function set(next) {
	state = { ...state, ...next };
	listeners.forEach((fn) => fn());
}

export function refreshNotifications() {
	if (!boot.user) return Promise.resolve();
	if (!inflight) {
		inflight = call("lms.lms.api.get_notifications")
			.then((items) => set({ items: Array.isArray(items) ? items : [], error: null }))
			.catch((error) => set({ error }))
			.finally(() => (inflight = null));
	}
	return inflight;
}

function start() {
	if (started || !boot.user) return;
	started = true;
	refreshNotifications();
	setInterval(() => {
		if (document.visibilityState === "visible") refreshNotifications();
	}, 120000);
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") refreshNotifications();
	});
}

export function useNotifications() {
	useEffect(start, []);
	return useSyncExternalStore(
		(fn) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		() => state
	);
}

export function markAllRead() {
	if (state.items) set({ items: state.items.map((n) => ({ ...n, read: 1 })) });
	return call("frappe.desk.doctype.notification_log.notification_log.mark_all_as_read").catch(() => refreshNotifications());
}

function markRead(name) {
	if (state.items) set({ items: state.items.map((n) => (n.name === name ? { ...n, read: 1 } : n)) });
	call("frappe.desk.doctype.notification_log.notification_log.mark_as_read", { docname: name }).catch(() => {});
}

export function toItems(items, now = new Date()) {
	return (items || []).map((n) => ({
		id: n.name,
		kind: notificationKind(n),
		title: plainText(n.subject, 160) || "A notification",
		body: n.from_user_details && n.from_user_details.full_name ? "From " + n.from_user_details.full_name : undefined,
		time: when(n.creation, now),
		group: dayGroup(n.creation, now),
		unread: !n.read,
		href: fromLmsLink(n.link),
		onClick: n.read ? undefined : () => markRead(n.name),
	}));
}

export function NotificationsBell({ path }) {
	const { items } = useNotifications();
	const [open, setOpen] = useState(false);
	useEffect(() => setOpen(false), [path]);
	const unread = (items || []).filter((n) => !n.read).length;
	return (
		<O.NotificationBell
			count={unread}
			open={open}
			onOpenChange={setOpen}
			onMarkAllRead={unread ? markAllRead : undefined}
			seeAllHref="/notifications"
		>
			{items ? (
				<O.NotificationList items={toItems(items.slice(0, 8))} />
			) : (
				<div className="app-pad">
					<O.Skeleton lines={3} />
				</div>
			)}
		</O.NotificationBell>
	);
}
