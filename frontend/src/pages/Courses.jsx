// The catalogue (every published course, by track) and My courses (in progress and finished).
import { cover } from "../lib/covers.js";
import { lessonsText } from "../lib/format.js";
import { useCall } from "../lib/load.js";
import { useQuery } from "../lib/router.js";
import { Loading, Problem } from "./Problem.jsx";

const O = window.OrbiTutor;

export function PageHead({ title, children }) {
	return (
		<header className="app-head">
			<h1 className="app-head__title">{title}</h1>
			{children ? <p className="app-head__lead">{children}</p> : null}
		</header>
	);
}

export function cardProps(c) {
	const base = {
		id: c.name,
		title: c.title,
		track: c.track || undefined,
		tagline: c.tagline || undefined,
		cover: cover(c),
		href: c.href,
	};
	if (c.completed) return { ...base, state: "done", finishedText: c.certificate_href ? "Certificate ready" : "Finished" };
	if (c.enrolled)
		return {
			...base,
			state: "progress",
			progress: c.progress || 0,
			progressText: lessonsText(c.done, c.lessons),
			next: c.resume ? c.resume.title : undefined,
		};
	return { ...base, state: "browse", facts: [c.project, c.level].filter(Boolean) };
}

export function Catalogue() {
	const { data, error, reload } = useCall("orbitutor.api.catalogue");
	const query = useQuery();
	if (!data) return error ? <Problem error={error} onRetry={reload} /> : <Loading blocks={2} />;
	const track = query.get("track");
	return (
		<>
			<PageHead title="All courses">Every course ends with something you've built, or a competition you've sat.</PageHead>
			<O.CourseCatalogue
				courses={(data.courses || []).map((c) => ({ ...cardProps(c), project: c.project || undefined }))}
				defaultTrack={["physics", "code", "making", "competitions"].includes(track) ? track : "all"}
				defaultQuery={query.get("q") || ""}
			/>
		</>
	);
}

export function MyCourses() {
	const { data, error, reload } = useCall("orbitutor.api.my_courses");
	if (!data) return error ? <Problem error={error} onRetry={reload} /> : <Loading blocks={2} />;
	const courses = data.courses || [];
	return (
		<>
			<PageHead title="My courses" />
			<O.MyCourses
				inProgress={courses.filter((c) => !c.completed).map(cardProps)}
				completed={courses.filter((c) => c.completed).map((c) => ({ ...cardProps(c), href: c.certificate_href || c.href }))}
				browseHref="/catalogue"
			/>
		</>
	);
}
