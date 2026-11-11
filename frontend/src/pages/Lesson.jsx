// A lesson: Frappe Learning's own get_lesson and course outline, drawn in OrbiTutor's lesson
// frame, with Mark as done (save_progress), the way on, and questions under the lesson.
import { boot, call, signInHref } from "../lib/api.js";
import { lessonNumber, lessonsText, plural, when } from "../lib/format.js";
import { activityHref } from "../lib/links.js";
import { forget, useCall } from "../lib/load.js";
import { sanitize } from "../lib/safe.js";
import { NotificationsBell } from "../shell/Notifications.jsx";
import { Loading, Problem } from "./Problem.jsx";

const O = window.OrbiTutor;
const { useEffect, useMemo, useState } = React;

const KINDS = { "icon-youtube": "video", "icon-quiz": "quiz", "icon-assignment": "assignment", "icon-code": "code" };

// The lesson extras (highlighting, maths, Markdown) start loading as soon as a lesson is opened.
let extrasPromise = null;
function loadExtras() {
	if (!extrasPromise) extrasPromise = import("../lib/lessonExtras.js");
	return extrasPromise;
}
function useExtras() {
	const [extras, setExtras] = useState(null);
	const [failed, setFailed] = useState(null);
	useEffect(() => {
		let live = true;
		loadExtras().then(
			(m) => live && setExtras(m),
			(e) => {
				extrasPromise = null;
				if (live) setFailed(e);
			}
		);
		return () => void (live = false);
	}, []);
	return { extras, failed };
}

function parseContent(content) {
	if (!content) return null;
	if (typeof content === "object") return content;
	try {
		const data = JSON.parse(content);
		return data && Array.isArray(data.blocks) ? data : null;
	} catch (e) {
		return null;
	}
}

function flatten(outline) {
	const list = [];
	(outline || []).forEach((c, ci) =>
		(c.lessons || []).forEach((l) => list.push({ ...l, chapterIndex: ci, chapterTitle: c.title, chapterId: "chapter-" + (ci + 1) }))
	);
	return list;
}

function Shell({ course, page, progress, outline, children }) {
	return (
		<O.LessonLayout
			course={{ title: page.course_title || "Course", href: `/course/${course}` }}
			progress={progress}
			outline={outline}
			actions={boot.user ? <NotificationsBell path={window.location.pathname} /> : null}
			mainId="main"
		>
			{children}
		</O.LessonLayout>
	);
}

function Questions({ lesson }) {
	const q = useCall("orbitutor.api.lesson_questions", { lesson });
	const [openId, setOpenId] = useState(null);
	const [error, setError] = useState(null);
	const me = boot.user ? { name: boot.user.full_name, src: boot.user.image || undefined } : undefined;
	if (!q.data) return q.error ? null : <O.Skeleton lines={3} />;

	const html = (body) => <O.Prose html={sanitize(body)} />;
	const post = (p) => ({ id: p.id, author: p.author.name, src: p.author.src || undefined, time: when(p.at), text: html(p.body), instructor: !!p.instructor });
	const open = openId && q.data.find((t) => t.id === openId);

	async function send(method, args) {
		setError(null);
		try {
			await call(method, args);
			q.reload();
		} catch (e) {
			setError(e.status === 429 ? "That's a lot of posts in an hour. Try again a little later." : e.message);
		}
	}

	return (
		<div className="app-stack">
			{error ? (
				<O.Alert tone="danger" title="That didn't post">
					{error}
				</O.Alert>
			) : null}
			<O.Discussion
				me={me}
				topics={q.data.map((t) => ({
					id: t.id,
					title: t.title,
					author: t.author.name,
					src: t.author.src || undefined,
					time: when(t.at),
					replyCount: t.replies.length,
					instructorReplied: t.replies.some((r) => r.instructor),
				}))}
				topic={open ? { ...post(open), title: open.title, replies: open.replies.map(post) } : undefined}
				onOpen={(topic, e) => {
					if (e && e.preventDefault) e.preventDefault();
					setOpenId(topic.id);
				}}
				onBack={() => setOpenId(null)}
				onAsk={({ title, text }) => send("orbitutor.api.ask_question", { lesson, title, body: text || "" })}
				onReply={(text) => open && send("orbitutor.api.reply", { topic: open.id, body: text })}
			/>
		</div>
	);
}

export default function Lesson({ course, number }) {
	const num = lessonNumber(number);
	const signedIn = !!boot.user;
	const page = useCall("lms.lms.utils.get_lesson", num ? { course, chapter: num.chapter, lesson: num.lesson } : null, { skip: !num });
	const outlineCall = useCall("lms.lms.utils.get_course_outline", { course, progress: signedIn });
	const { extras, failed } = useExtras();
	const [saving, setSaving] = useState(false);
	const [held, setHeld] = useState(null);
	const [celebrate, setCelebrate] = useState(null);

	useEffect(() => {
		setHeld(null);
		setCelebrate(null);
	}, [number, course]);

	const L = page.data;
	const lessons = useMemo(() => flatten(outlineCall.data), [outlineCall.data]);
	const acts = useCall("orbitutor.learn.lesson_activities", { lesson: L && L.name }, { skip: !L || !L.name || !signedIn });

	useEffect(() => {
		if (L && L.title) document.title = `${L.title} · ${L.course_title || boot.app_name || "OrbiTutor"}`;
	}, [L]);

	if (!num) return <Problem error={{ status: 404 }} />;
	if (page.error || outlineCall.error) return <Problem error={page.error || outlineCall.error} onRetry={() => (page.reload(), outlineCall.reload())} />;
	if (failed) return <Problem error={{ status: 0 }} onRetry={() => window.location.reload()} />;
	if (!L || !outlineCall.data || !extras) return <Loading blocks={1} lines={8} />;

	// Frappe Learning answers {} for a course this person can't see, and for a lesson number that doesn't exist.
	if (!Object.keys(L).length) {
		if (!signedIn) return <Problem error={{ status: 403 }} />;
		return <Problem error={{ status: 404 }} what="page" />;
	}

	const here = lessons.findIndex((l) => l.number === num.id);
	const lesson = here >= 0 ? lessons[here] : null;
	const enrolled = !!L.membership;
	const done = lessons.filter((l) => l.is_complete).length;
	const total = lessons.length;
	const progress = enrolled ? { value: Math.round(L.membership.progress || 0), text: lessonsText(done, total) } : undefined;
	const chapters = (outlineCall.data || []).map((c, ci) => ({
		id: "chapter-" + (ci + 1),
		title: c.title,
		lessons: (c.lessons || []).map((l) => ({
			id: l.number,
			title: l.title,
			kind: KINDS[l.icon] || "reading",
			status: l.is_complete ? "done" : l.locked ? "locked" : l.number === num.id ? "current" : "todo",
			href: !l.locked && (enrolled || l.include_in_preview) ? `/course/${course}/learn/${l.number}` : undefined,
		})),
	}));
	const outline = <O.CourseOutline chapters={chapters} label="Lessons in this course" />;
	const frame = (children) => (
		<Shell course={course} page={L} progress={progress} outline={outline}>
			{children}
		</Shell>
	);

	if (L.locked) {
		const target = `/course/${course}/learn/${L.redirect_to}`;
		return frame(
			<O.LockedLesson
				reason={L.not_found ? "missing" : "order"}
				title={L.not_found ? undefined : L.title}
				action={
					<O.Button href={target} iconAfter="arrow-right">
						{L.not_found ? "Go to your lesson" : "Go to the lesson you're on"}
					</O.Button>
				}
			/>
		);
	}
	if (L.no_preview) {
		return frame(
			<O.LockedLesson
				reason="enrol"
				title={L.title}
				action={
					signedIn ? (
						<O.Button href={`/course/${course}`} iconAfter="arrow-right">
							See how to join
						</O.Button>
					) : (
						<O.Button href={signInHref()} icon="key">
							Sign in
						</O.Button>
					)
				}
			/>
		);
	}
	if (L.is_scorm_package) {
		return frame(
			<O.StatusPage art={false} eyebrow="Interactive lesson" title="This lesson can't open here yet">
				<p>It's an interactive package that OrbiTutor can't show yet. Ask your instructor, and they'll mark it done for you.</p>
			</O.StatusPage>
		);
	}

	const data = parseContent(L.content);
	const isDone = !!L.progress || (lesson && lesson.is_complete);
	const prevNo = L.prev ? String(L.prev).replace(".", "-") : null;
	const nextNo = L.next ? String(L.next).replace(".", "-") : null;
	const prev = prevNo && lessons.find((l) => l.number === prevNo);
	const next = nextNo && lessons.find((l) => l.number === nextNo);
	const nextHref = next ? `/course/${course}/learn/${next.number}` : undefined;
	const chapterEnds = lesson && next && next.chapterIndex !== lesson.chapterIndex;

	async function markDone() {
		setSaving(true);
		setHeld(null);
		try {
			const courseProgress = await call("lms.lms.doctype.course_lesson.course_lesson.save_progress", { lesson: L.name, course });
			const fresh = await call("lms.lms.utils.get_course_outline", { course, progress: true });
			outlineCall.set(fresh);
			forget("orbitutor.api.");
			const now = flatten(fresh).find((l) => l.number === num.id);
			if (now && now.is_complete) {
				page.set({ ...L, progress: 1, membership: { ...L.membership, progress: courseProgress } });
				if (courseProgress >= 100) setCelebrate("course");
				else if (chapterEnds) setCelebrate("chapter");
			} else {
				setHeld("activity");
			}
		} catch (e) {
			setHeld(e.status === 0 ? "offline" : e.message || "error");
		} finally {
			setSaving(false);
		}
	}

	const activity = (b) => {
		const kind = b.type === "program" ? "code" : b.type === "assignment" ? "assignment" : "quiz";
		const word = { quiz: "quiz", assignment: "assignment", code: "coding exercise" }[kind];
		const d = b.data || {};
		const info = (acts.data && acts.data[b.type + ":" + (d.quiz || d.assignment || d.exercise)]) || {};
		const href = activityHref(b, L.name);
		return (
			<O.ActivityCard
				kind={kind}
				title={info.title || { quiz: "Quiz", assignment: "Assignment", code: "Coding exercise" }[kind]}
				facts={info.facts || []}
				status={info.status ? <O.Badge tone={info.tone || "neutral"} icon={info.icon}>{info.status}</O.Badge> : null}
				action={
					href && signedIn && (enrolled || (boot.user && boot.user.staff)) ? (
						<O.Button size="sm" href={href} iconAfter="arrow-right">
							{info.done ? "Open the " + word : kind === "quiz" ? "Start the quiz" : "Open the " + word}
						</O.Button>
					) : null
				}
			/>
		);
	};

	const content = data ? (
		<O.LessonBlocks
			data={data}
			sanitize={sanitize}
			highlight={extras.highlight}
			renderMath={extras.renderMath}
			renderActivity={activity}
			render={{
				markdown: (b) => <O.Prose html={sanitize(extras.markdown((b.data && (b.data.text || b.data.markdown)) || ""))} />,
				stub: () => null,
			}}
			videoTitle={L.title}
		/>
	) : L.body ? (
		<O.Prose html={sanitize(extras.markdown(L.body))} />
	) : (
		<O.EmptyState icon="reading" title="Nothing in this lesson yet">
			Your instructor is still writing it. Check back soon.
		</O.EmptyState>
	);

	if (celebrate === "course") {
		return frame(
			<O.CourseComplete
				title={L.course_title || "Course finished"}
				eyebrow="Course finished"
				actions={
					<div className="app-row">
						<O.Button href={`/course/${course}`} icon="certificate">
							See your course page
						</O.Button>
						<O.Button variant="secondary" href="/">
							Go to Home
						</O.Button>
					</div>
				}
			>
				You finished all {plural(total, "lesson")}. Well done{boot.user && boot.user.first_name ? ", " + boot.user.first_name : ""}.
			</O.CourseComplete>
		);
	}

	return frame(
		<>
			<O.LessonHeader
				eyebrow={lesson ? `Chapter ${lesson.chapterIndex + 1} · Lesson ${here + 1} of ${total}` : L.chapter_title}
				title={L.title}
				kind={KINDS[L.icon] || "reading"}
				done={!!isDone}
			/>
			<div className="app-lesson-body">{content}</div>
			{held ? (
				<O.Alert tone={held === "activity" ? "info" : "danger"} title={held === "activity" ? "Finish the activity first" : "That didn't save"}>
					{held === "activity"
						? "This lesson has a quiz, assignment or coding exercise to finish before it counts as done."
						: held === "offline"
							? "You're offline. Try again when you're connected."
							: held}
				</O.Alert>
			) : null}
			{enrolled ? (
				<O.LessonEnd
					state={isDone ? "done" : "ready"}
					loading={saving}
					onMarkDone={markDone}
					next={nextHref ? { label: "Next lesson", href: nextHref } : { label: "Back to the course", href: `/course/${course}` }}
				/>
			) : null}
			{celebrate === "chapter" && lesson && next ? (
				<O.ChapterComplete
					eyebrow={`Chapter ${lesson.chapterIndex + 1} done`}
					title={lesson.chapterTitle}
					stats={[{ value: lessons.filter((l) => l.chapterIndex === lesson.chapterIndex).length, label: "lessons" }]}
					next={{ title: next.title, href: nextHref, label: `Start chapter ${next.chapterIndex + 1}` }}
				/>
			) : null}
			<O.LessonNav
				previous={prev ? { title: prev.title, href: `/course/${course}/learn/${prev.number}` } : undefined}
				next={next ? { title: next.title, href: nextHref, locked: !!next.locked && !isDone } : undefined}
			/>
			{enrolled || (boot.user && boot.user.staff) ? <Questions lesson={L.name} /> : null}
		</>
	);
}
