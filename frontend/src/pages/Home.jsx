// Home: what to do next. A returning student sees their live class, what's due, where they
// left off, their courses and announcements; someone new sees how to get started.
import { boot } from "../lib/api.js";
import { cover } from "../lib/covers.js";
import { lessonsText, time, toDate, when, whatsapp } from "../lib/format.js";
import { useCall } from "../lib/load.js";
import { Loading, Problem } from "./Problem.jsx";

const O = window.OrbiTutor;
const { useState } = React;

const DISMISSED = "orbitutor.certificate.dismissed";

function dismissed(name) {
	try {
		return (localStorage.getItem(DISMISSED) || "").split(",").includes(name);
	} catch (e) {
		return false;
	}
}

function dismiss(name) {
	try {
		const list = (localStorage.getItem(DISMISSED) || "").split(",").filter(Boolean);
		localStorage.setItem(DISMISSED, [...list, name].slice(-20).join(","));
	} catch (e) {
		// storage off: it shows again next time
	}
}

function liveCard(c) {
	return (
		<O.LiveClassCard
			key={c.id}
			title={c.title}
			course={c.batch}
			startsAt={c.starts_at}
			minutes={c.minutes}
			joinHref={c.join_url || undefined}
			instructor={c.instructor || undefined}
		/>
	);
}

function summary(data, now) {
	const next = data.classes && data.classes[0];
	const parts = [];
	if (next) {
		const starts = toDate(next.starts_at);
		const today = starts && starts.toDateString() === now.toDateString();
		if (starts && starts <= now) parts.push("Your live class is on now.");
		else if (today) parts.push(`Your live class starts at ${time(starts)}.`);
	}
	const todo = (data.to_do || []).length;
	if (todo) parts.push(todo === 1 ? "You have one thing to hand in." : `You have ${todo} things to hand in.`);
	if (!parts.length && data.resume) parts.push(`Next up: ${data.resume.lesson ? data.resume.lesson.title : data.resume.course.title}.`);
	return parts.join(" ");
}

function lessonFor(resume) {
	const l = resume && resume.lesson;
	return l ? { title: l.title, kind: l.kind, number: l.position, total: l.total } : undefined;
}

export default function Home() {
	const { data, error, reload } = useCall("orbitutor.api.home");
	const [, refresh] = useState(0);
	const user = boot.user || {};
	const now = new Date();

	if (!data) return error ? <Problem error={error} onRetry={reload} /> : <Loading blocks={2} />;

	if (data.stage === "new" || data.stage === "asked") {
		const join = data.join_request;
		const card = join && join.card;
		return (
			<O.HomeLayout header={<O.HomeGreeting title={`Welcome to OrbiTutor, ${user.first_name || ""}`.trim()} now={now} />}>
				<O.WelcomePanel
					stage={data.stage}
					course={card ? { title: card.title, track: card.track || undefined, cover: cover(card), href: card.href } : undefined}
					browseHref="/catalogue"
					whatsappHref={whatsapp(card ? `Hi OrbiTutor, I asked to join ${card.title}.` : "Hi OrbiTutor, I'd like to join a course.")}
				/>
				{data.suggestions && data.suggestions.length ? (
					<O.PageSection
						title="Good places to start"
						description="Each one ends with something you've built yourself."
						action={
							<O.Button variant="text" href="/catalogue" iconAfter="arrow-right">
								All courses
							</O.Button>
						}
					>
						<div className="app-grid3">
							{data.suggestions.map((c) => (
								<O.CourseCard
									key={c.name}
									compact
									title={c.title}
									track={c.track || undefined}
									cover={cover(c)}
									href={c.href}
									facts={[c.project, c.level].filter(Boolean)}
								/>
							))}
						</div>
					</O.PageSection>
				) : null}
			</O.HomeLayout>
		);
	}

	const classes = data.classes || [];
	const first = classes[0];
	const firstStarts = first && toDate(first.starts_at);
	const urgent = first && firstStarts && firstStarts - now < 60 * 60000;
	const due = (data.to_do || []).map((t) => ({
		id: t.id,
		kind: t.kind === "quiz" ? "quiz" : "assignment",
		title: t.title,
		href: t.href,
		// Frappe Learning's batch assessments have no due date
		statusText: "To do",
	}));

	if (data.stage === "enrolled" && data.resume) {
		const c = data.resume.course;
		return (
			<O.HomeLayout
				header={<O.HomeGreeting title={`Welcome to OrbiTutor, ${user.first_name || ""}`.trim()} now={now} />}
				side={[
					first ? liveCard(first) : null,
					<O.DueList key="due" items={due} />,
				]}
			>
				<O.WelcomePanel
					stage="enrolled"
					course={{ title: c.title, track: c.track || undefined, cover: cover(c), href: data.resume.lesson ? data.resume.lesson.href : c.href, lesson: lessonFor(data.resume) }}
				/>
			</O.HomeLayout>
		);
	}

	const cert = data.certificate && !dismissed(data.certificate.name) ? data.certificate : null;
	const strip = (data.courses || []).map((c) => ({
		id: c.name,
		title: c.title,
		track: c.track || undefined,
		progress: c.progress || 0,
		progressText: lessonsText(c.done, c.lessons),
		status: c.completed ? "done" : "progress",
		finishedText: c.completed ? "Finished" : undefined,
		href: c.href,
	}));
	const news = (data.announcements || []).map((a) => ({
		id: a.id,
		author: { name: a.from && a.from.name ? a.from.name : "OrbitCore", src: (a.from && a.from.src) || undefined, brand: !(a.from && a.from.name) },
		batch: a.batch || undefined,
		time: when(a.at, now),
		title: a.title || "Announcement",
		text: a.text,
		href: a.batch_href,
	}));

	return (
		<O.HomeLayout
			header={
				<O.HomeGreeting name={user.first_name} now={now}>
					{summary(data, now) || undefined}
				</O.HomeGreeting>
			}
			urgent={urgent ? liveCard(first) : undefined}
			side={[
				first && !urgent ? liveCard(first) : null,
				<O.DueList key="due" items={due} seeAllHref={due.length > 5 ? "/schedule" : undefined} />,
			]}
		>
			{cert ? (
				<O.CertificateCard
					course={cert.course}
					track={cert.track || undefined}
					href={cert.href}
					shareUrl={window.location.origin + cert.href}
					onDismiss={() => {
						dismiss(cert.name);
						refresh((n) => n + 1);
					}}
				/>
			) : null}
			{data.resume ? (
				<O.ContinueCard
					course={data.resume.course.title}
					track={data.resume.course.track || undefined}
					cover={cover(data.resume.course)}
					href={data.resume.lesson ? data.resume.lesson.href : data.resume.course.href}
					lesson={lessonFor(data.resume) || { title: data.resume.course.title }}
					progress={data.resume.course.progress || 0}
					progressText={lessonsText(data.resume.course.done, data.resume.course.lessons)}
				/>
			) : null}
			{strip.length ? <O.CourseStrip courses={strip} seeAllHref="/my-courses" browseHref="/catalogue" /> : null}
			{news.length ? <O.Announcements items={news} /> : null}
		</O.HomeLayout>
	);
}
