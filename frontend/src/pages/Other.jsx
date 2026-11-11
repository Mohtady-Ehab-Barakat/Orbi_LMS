// The Notifications and Search screens.
import { useQuery } from "../lib/router.js";
import { markAllRead, toItems, useNotifications } from "../shell/Notifications.jsx";
import { useSearch } from "../shell/Search.jsx";
import { PageHead } from "./Courses.jsx";
import { Loading, Problem } from "./Problem.jsx";

const O = window.OrbiTutor;

export function NotificationsPage() {
	const { items, error } = useNotifications();
	if (!items) return error ? <Problem error={error} onRetry={() => window.location.reload()} /> : <Loading lines={6} blocks={0} />;
	const unread = items.filter((n) => !n.read).length;
	return (
		<>
			<PageHead title="Notifications" />
			{unread ? (
				<div className="app-row app-row--end">
					<O.Button variant="text" size="sm" icon="check" onClick={markAllRead}>
						Mark all as read
					</O.Button>
				</div>
			) : null}
			<O.NotificationList items={toItems(items)} headingAs="h2" />
		</>
	);
}

export function SearchPage() {
	const q = useQuery();
	const s = useSearch(q.get("q") || "");
	return (
		<>
			<PageHead title="Search" />
			<O.SearchPanel
				variant="dropdown"
				className="app-search-page"
				query={s.query}
				onQueryChange={s.setQuery}
				courses={s.courses}
				lessons={s.lessons}
				loading={s.loading}
				noResultsAction={
					<O.Button variant="secondary" size="sm" icon="courses" href="/catalogue">
						Browse all courses
					</O.Button>
				}
				autoFocus
			/>
		</>
	);
}
