// A course page: the hero with what to do next (ask to join, continue, or the certificate), then
// what it's about, what they'll build and learn, the kit, the lessons, instructors and batches.
import { boot, call } from "../lib/api.js";
import { cover } from "../lib/covers.js";
import { date, dateRange, lessonsText, timeRange, toDay, whatsapp } from "../lib/format.js";
import { forget, useCall } from "../lib/load.js";
import { sanitize } from "../lib/safe.js";
import { Loading, Problem } from "./Problem.jsx";

const O = window.OrbiTutor;
const { useEffect, useRef, useState } = React;

export function outlineChapters(outline, { current, enrolled }) {
	return (outline || []).map((c, ci) => ({
		id: "chapter-" + (ci + 1),
		title: c.title,
		lessons: (c.lessons || []).map((l) => ({
			id: l.number,
			title: l.title,
			kind: l.kind,
			status: l.done ? "done" : l.locked ? "locked" : l.number === current ? "current" : "todo",
			href: (enrolled || l.preview) && !l.locked ? l.href : undefined,
		})),
	}));
}

function JoinPanel({ page }) {
	const [state, setState] = useState(page.join_request ? "asked" : "start");
	const [error, setError] = useState(null);
	const box = useRef(null);
	const open = (page.batches || []).filter((b) => !b.mine);

	// the form is long on phones: once it's sent, bring the confirmation back into view
	useEffect(() => {
		if (state === "asked" && box.current && box.current.getBoundingClientRect().top < 0) {
			box.current.scrollIntoView({ block: "start", behavior: "smooth" });
		}
	}, [state]);
	const today = new Date(new Date().toDateString());
	const next = open.find((b) => toDay(b.starts) >= today);
	const batches = open.map((b) => ({ value: b.name, label: `${b.title}, ${dateRange(b.starts, b.ends)}` }));

	async function submit(req) {
		setError(null);
		try {
			await call("orbitutor.api.ask_to_join", {
				course: page.name,
				full_name: req.name,
				phone: req.phone,
				batch: req.batch || null,
				who: req.who,
				note: req.note || null,
			});
			forget("orbitutor.api.home");
			setState("asked");
		} catch (e) {
			setError(e.status === 429 ? "You've sent a few requests already. Message us on WhatsApp instead." : e.status === 0 ? "You're offline. Try again when you're connected." : e.message);
		}
	}

	return (
		<div className="app-stack app-join" ref={box}>
			{error ? (
				<O.Alert tone="danger" title="Your request didn't send">
					{error}
				</O.Alert>
			) : null}
			<O.AskToJoin
				course={page.title}
				state={state}
				onStateChange={(s) => s !== "asked" && setState(s)}
				onSubmit={submit}
				onCancel={
					boot.user
						? () => {
								call("orbitutor.api.cancel_join_request", { course: page.name }).catch(() => {});
								forget("orbitutor.api.home");
							}
						: undefined
				}
				whatsappHref={whatsapp(`Hi OrbiTutor, I'd like to join ${page.title}.`)}
				batches={batches.length ? batches : undefined}
				nextBatch={next && next.starts ? `Next batch starts ${date(toDay(next.starts))}` : undefined}
				title={page.upcoming ? "Coming soon" : undefined}
				text={page.upcoming ? "The first batch hasn't been set yet. Ask to join and we'll tell you when it opens." : undefined}
			/>
		</div>
	);
}

function ProgressPanel({ page }) {
	if (page.completed) {
		return (
			<div className="app-panel">
				<O.Badge tone="success" icon="check">
					Finished
				</O.Badge>
				<div className="app-row">
					{page.certificate_href ? (
						<O.Button icon="certificate" href={page.certificate_href}>
							See your certificate
						</O.Button>
					) : null}
					<O.Button variant="secondary" href="#lessons">
						Look back at the lessons
					</O.Button>
				</div>
			</div>
		);
	}
	const started = (page.progress || 0) > 0;
	return (
		<div className="app-panel">
			<O.ProgressBar value={page.progress || 0} label="Your progress" showLabel valueText={lessonsText(page.done, page.lessons)} tone={page.track || "gold"} />
			{page.resume ? (
				<O.Button icon="play" full href={page.resume.href}>
					{(started ? "Continue: " : "Start: ") + page.resume.title}
				</O.Button>
			) : null}
		</div>
	);
}

export default function Course({ course }) {
	const { data: page, error, reload } = useCall("orbitutor.api.course_page", { course });
	if (!page) return error ? <Problem error={error} what="course" onRetry={reload} /> : <Loading blocks={2} />;

	const facts = [
		page.project ? { label: page.track === "competitions" ? "What it is" : "You'll build", value: page.project } : null,
		page.level ? { label: "Level", value: page.level } : null,
		page.length ? { label: "Length", value: page.length } : page.lessons ? { label: "Lessons", value: String(page.lessons) } : null,
	].filter(Boolean);
	const chapters = outlineChapters(page.outline, { current: page.resume && page.resume.number, enrolled: page.enrolled });
	const lessonCount = chapters.reduce((n, c) => n + c.lessons.length, 0);

	return (
		<div className="app-course">
			<O.CourseHero
				track={page.track || undefined}
				title={page.title}
				tagline={page.tagline || undefined}
				cover={cover(page)}
				facts={facts}
				back={page.enrolled ? { href: "/my-courses", label: "My courses" } : { href: "/catalogue", label: "All courses" }}
			>
				{page.enrolled ? <ProgressPanel page={page} /> : <JoinPanel page={page} />}
			</O.CourseHero>

			{page.description ? (
				<O.PageSection title="About this course">
					<O.Prose html={sanitize(page.description)} />
				</O.PageSection>
			) : null}

			{page.project && page.track !== "competitions" ? (
				<O.ProjectFeature
					eyebrow="What you'll build"
					title={page.project}
					text={page.tagline || undefined}
					href={page.project_href || undefined}
					linkLabel="See the project on our website"
				/>
			) : null}

			{page.outcomes && page.outcomes.length ? (
				<O.PageSection title="What you'll learn">
					<O.OutcomeList items={page.outcomes} />
				</O.PageSection>
			) : null}

			{page.kit && page.kit.length ? (
				<O.PageSection title="What you'll need">
					<O.KitList items={page.kit.map((k) => ({ name: k.name, note: k.note || undefined }))} />
				</O.PageSection>
			) : null}

			{lessonCount ? (
				<section id="lessons">
					<O.PageSection
						title="Lessons"
						count={lessonCount}
						description={page.enrolled ? undefined : "Lessons marked as previews open for everyone. The rest open when you join."}
					>
						<O.CourseOutline chapters={chapters} />
					</O.PageSection>
				</section>
			) : null}

			{page.instructors && page.instructors.length ? (
				<O.PageSection title={page.instructors.length === 1 ? "Your instructor" : "Your instructors"}>
					<div className="app-grid2">
						{page.instructors.map((i) => (
							<O.InstructorCard key={i.username || i.name} name={i.name} photo={i.src || undefined} bio={i.bio || undefined} role="Instructor" />
						))}
					</div>
				</O.PageSection>
			) : null}

			{page.batches && page.batches.length ? (
				<O.PageSection title="Batches" description={page.enrolled ? undefined : "Classes are at OrbitCore in Cyberjaya unless a batch says it's online."}>
					<div className="app-grid2">
						{page.batches.map((b) => (
							<O.BatchCard
								key={b.name}
								name={b.title}
								when={timeRange(b.start_time, b.end_time) || undefined}
								dates={dateRange(b.starts, b.ends) || undefined}
								online={b.medium === "Online"}
								where={b.medium === "Online" ? undefined : "OrbitCore, Cyberjaya"}
								status={b.mine ? "yours" : "open"}
								action={
									b.mine ? (
										<O.Button size="sm" variant="secondary" href={b.href}>
											Open your batch
										</O.Button>
									) : undefined
								}
							/>
						))}
					</div>
				</O.PageSection>
			) : null}
		</div>
	);
}
