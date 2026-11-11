// The frame around every signed-in screen: the top bar (links, search, notifications, the
// orbit menu), the tab bar on phones, and the banner when the connection drops.
import { boot, signInHref, signOut } from "../lib/api.js";
import { TRACK_TITLES, lessonsText } from "../lib/format.js";
import { useCall } from "../lib/load.js";
import { navigate, useLocation } from "../lib/router.js";
import { NotificationsBell } from "./Notifications.jsx";
import { SearchOverlay } from "./Search.jsx";

const O = window.OrbiTutor;
const { useEffect, useState } = React;

const TABS = [
	{ id: "home", label: "Home", icon: "home", href: "/", match: (p) => p === "/" },
	{ id: "courses", label: "Courses", icon: "courses", href: "/my-courses", match: (p) => /^\/(my-courses|catalogue|course\/)/.test(p) },
	{ id: "schedule", label: "Schedule", icon: "schedule", href: "/schedule", match: (p) => /^\/(schedule|batch\/)/.test(p) },
];

function useConnection() {
	const [state, setState] = useState(navigator.onLine === false ? "offline" : null);
	useEffect(() => {
		let timer = 0;
		const off = () => {
			clearTimeout(timer);
			setState("offline");
		};
		const on = () => {
			setState("online");
			timer = setTimeout(() => setState(null), 4000);
		};
		window.addEventListener("offline", off);
		window.addEventListener("online", on);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("offline", off);
			window.removeEventListener("online", on);
		};
	}, []);
	return state;
}

function menuItems(path, courses) {
	const mine = (courses || []).slice(0, 6).map((c) => ({
		label: c.title,
		href: c.href,
		current: path === c.href || path.startsWith(c.href + "/"),
		description: [TRACK_TITLES[c.track], c.completed ? "Finished" : lessonsText(c.done, c.lessons)].filter(Boolean).join(" · "),
	}));
	const inProgress = (courses || []).filter((c) => !c.completed).length;
	const done = (courses || []).length - inProgress;
	const items = [
		{ label: "Home", href: "/", description: "What to do next", current: path === "/" },
		{
			label: "My courses",
			href: "/my-courses",
			current: path === "/my-courses",
			description: courses
				? courses.length
					? [inProgress && `${inProgress} in progress`, done && `${done} finished`].filter(Boolean).join(", ")
					: "Find your first course"
				: "Your courses",
			children: mine.length ? mine : undefined,
		},
		{ label: "All courses", href: "/catalogue", description: "Everything OrbitCore teaches", current: path === "/catalogue" },
		{ label: "Schedule", href: "/schedule", description: "Live classes and batches", current: path === "/schedule" },
		{ label: "Certificates", href: "/certificates", description: "What you've earned", current: path.startsWith("/certificate") },
		{ label: "Profile", href: "/my-profile", description: "Your photo, name and projects", current: path === "/my-profile" },
		{ label: "Settings", href: "/settings", description: "Notifications and theme", current: path.startsWith("/settings") },
	];
	if (boot.user && boot.user.staff) items.push({ label: "Teach", href: "/teach", description: "Marking, courses and batches" });
	return items;
}

function onNavigate(item, event) {
	if (!item.href) return;
	if (event && event.preventDefault) event.preventDefault();
	navigate(item.href);
}

export function Shell({ children, width, backdrop }) {
	const { path } = useLocation();
	const user = boot.user;
	const connection = useConnection();
	const [searching, setSearching] = useState(false);
	const courses = useCall("orbitutor.api.my_courses", null, { skip: !user });
	const list = courses.data && courses.data.courses;

	useEffect(() => setSearching(false), [path]);
	useEffect(() => {
		// "/" opens search, as the button's shortcut says
		const onKey = (e) => {
			if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
			const t = e.target;
			if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
			e.preventDefault();
			setSearching(true);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	const banner = connection ? (
		<O.ConnectionBanner state={connection} onRetry={() => window.location.reload()} />
	) : null;

	if (!user) {
		const topBar = (
			<O.TopBar
				homeHref="/"
				links={[{ label: "Courses", href: "/catalogue", current: path === "/catalogue" || path.startsWith("/course/") }]}
				search={boot.guest_access ? <O.SearchButton shortcut="/" onClick={() => setSearching(true)} expanded={searching} /> : null}
				actions={
					<O.Button size="sm" href={signInHref()} icon="profile">
						Sign in
					</O.Button>
				}
			/>
		);
		return (
			<O.AppShell topBar={topBar} banner={banner} width={width} backdrop={backdrop} mainId="main">
				{children}
				{searching ? <SearchOverlay onClose={() => setSearching(false)} /> : null}
			</O.AppShell>
		);
	}

	const items = menuItems(path, list);
	const menuUser = { name: user.full_name || user.first_name || "You", src: user.image || undefined };
	const topBar = (
		<O.TopBar
			homeHref="/"
			links={TABS.map((t) => ({ label: t.label, href: t.href, current: t.match(path) }))}
			search={<O.SearchButton shortcut="/" onClick={() => setSearching(true)} expanded={searching} />}
			actions={<NotificationsBell path={path} />}
			menu={<O.OrbitMenu items={items} user={menuUser} onSignOut={signOut} onNavigate={onNavigate} />}
		/>
	);
	const tabBar = (
		<O.TabBar
			tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, href: t.href, current: t.match(path) }))}
			menu={<O.OrbitMenu trigger="tab" items={items} user={menuUser} onSignOut={signOut} onNavigate={onNavigate} />}
		/>
	);
	return (
		<O.AppShell topBar={topBar} tabBar={tabBar} banner={banner} width={width} backdrop={backdrop} mainId="main">
			{children}
			{searching ? <SearchOverlay onClose={() => setSearching(false)} /> : null}
		</O.AppShell>
	);
}
