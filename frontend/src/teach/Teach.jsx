// The Teach area: its frame (StaffShell) and which screen each /teach address shows.
import { boot, signOut } from "../lib/api.js";
import { useCall } from "../lib/load.js";
import { match, navigate, useLocation } from "../lib/router.js";
import { NotificationsBell } from "../shell/Notifications.jsx";
import { Problem, helpHref } from "../pages/Problem.jsx";
import { BatchList, BatchPage } from "./Batches.jsx";
import { CourseList, CoursePage, LessonEdit } from "./Courses.jsx";
import { AssignmentEdit, ExerciseEdit, Library, QuizEdit } from "./Library.jsx";
import { AssignmentReview, MarkingPage, QuizReviewPage } from "./Marking.jsx";
import { Certificates, Evaluations, People, Requests, Statistics, TeachSettings } from "./Running.jsx";
import { Today } from "./Today.jsx";

const O = window.OrbiTutor;
const { useEffect } = React;

// [pattern, title, render(params), page id in the navigation]
const PAGES = [
	["/teach", "Today", () => <Today />, "today"],
	["/teach/marking", "Marking", () => <MarkingPage />, "marking"],
	["/teach/marking/assignment/:name", "Marking", (p) => <AssignmentReview key={p.name} name={p.name} />, "marking"],
	["/teach/marking/quiz/:name", "Marking", (p) => <QuizReviewPage key={p.name} name={p.name} />, "marking"],
	["/teach/courses", "Courses", () => <CourseList />, "courses"],
	["/teach/course/:course", "Course", (p) => <CoursePage key={p.course} course={p.course} />, "courses"],
	["/teach/course/:course/:tab", "Course", (p) => <CoursePage key={p.course} course={p.course} tab={p.tab} />, "courses"],
	["/teach/lesson/:lesson", "Lesson", (p) => <LessonEdit key={p.lesson} lesson={p.lesson} />, "courses"],
	["/teach/batches", "Batches", () => <BatchList />, "batches"],
	["/teach/batch/:batch", "Batch", (p) => <BatchPage key={p.batch} batch={p.batch} />, "batches"],
	["/teach/batch/:batch/:tab", "Batch", (p) => <BatchPage key={p.batch} batch={p.batch} tab={p.tab} />, "batches"],
	["/teach/library", "Quizzes and assignments", () => <Library />, "library"],
	["/teach/quiz/:quiz", "Quiz", (p) => <QuizEdit key={p.quiz} quiz={p.quiz} />, "library"],
	["/teach/assignment/:assignment", "Assignment", (p) => <AssignmentEdit key={p.assignment} assignment={p.assignment} />, "library"],
	["/teach/exercise/:exercise", "Coding exercise", (p) => <ExerciseEdit key={p.exercise} exercise={p.exercise} />, "library"],
	["/teach/requests", "Join requests", () => <Requests />, "requests"],
	["/teach/evaluations", "Evaluations", () => <Evaluations />, "evaluations"],
	["/teach/certificates", "Certificates", () => <Certificates />, "certificates"],
	["/teach/people", "People", () => <People />, "people"],
	["/teach/statistics", "Statistics", () => <Statistics />, "stats"],
	["/teach/settings", "Settings", () => <TeachSettings />, "settings"],
];

function navItems(roles, counts, current) {
	const r = roles || {};
	const c = counts || {};
	const items = [{ id: "today", label: "Today", icon: "home", href: "/teach" }];
	if (r.instructor) {
		items.push(
			{ id: "marking", label: "Marking", icon: "assignment", href: "/teach/marking", count: c.marking, countLabel: "to mark" },
			{ id: "courses", label: "Courses", icon: "courses", href: "/teach/courses" },
			{ id: "batches", label: "Batches", icon: "schedule", href: "/teach/batches" },
			{ id: "library", label: "Quizzes and assignments", icon: "quiz", href: "/teach/library" }
		);
	}
	if (r.evaluator) items.push({ id: "evaluations", label: "Evaluations", icon: "due", href: "/teach/evaluations" });
	items.push({ id: "certificates", label: "Certificates", icon: "certificate", href: "/teach/certificates" });
	if (r.instructor) items.push({ id: "requests", label: "Join requests", icon: "inbox", href: "/teach/requests", count: c.requests, countLabel: "new" });
	if (r.moderator) {
		items.push({ divider: true, label: "Running OrbiTutor" }, { id: "people", label: "People", icon: "users", href: "/teach/people" });
	}
	if (r.instructor) items.push(...(r.moderator ? [] : [{ divider: true }]), { id: "stats", label: "Statistics", icon: "chart", href: "/teach/statistics" });
	if (r.moderator) items.push({ id: "settings", label: "Settings", icon: "settings", href: "/teach/settings" });
	return items.map((it) => (it.id ? { ...it, current: it.id === current } : it));
}

let lastContext = null;
export function useTeachContext() {
	const { path } = useLocation();
	const ctx = useCall("orbitutor.teach.context", { path: path.split("/").slice(0, 3).join("/") }, { skip: !(boot.user && boot.user.staff) });
	if (ctx.data) lastContext = ctx.data;
	return ctx.data || lastContext;
}

export default function Teach() {
	const { path } = useLocation();
	const ctx = useTeachContext();
	let page = null;
	for (const [pattern, title, render, id] of PAGES) {
		const params = match(pattern, path);
		if (params) {
			page = { title, render: () => render(params), id };
			break;
		}
	}
	useEffect(() => {
		if (page && page.title) document.title = page.title + " · Teach · " + (boot.app_name || "OrbiTutor");
	}, [path]);

	if (!boot.user || !boot.user.staff) {
		return <O.NoAccessPage reason="staff" coursesHref="/" helpHref={helpHref()} path={path} />;
	}
	const user = boot.user;
	const roleName = ctx && ctx.roles ? (ctx.roles.moderator ? "Moderator" : ctx.roles.instructor ? "Instructor" : "Evaluator") : undefined;
	return (
		<O.StaffShell
			nav={navItems(ctx && ctx.roles, ctx && ctx.counts, page && page.id)}
			phoneTabs={["today", "marking", "courses", "batches"]}
			onNavigate={(it, e) => {
				if (!it.href) return;
				if (e && e.preventDefault) e.preventDefault();
				navigate(it.href);
			}}
			homeHref="/teach"
			learnHref="/"
			profileHref="/my-profile"
			user={{ name: user.full_name, role: roleName }}
			onSignOut={signOut}
			actions={<NotificationsBell path={path} />}
		>
			<O.ErrorBoundary resetKey={path} homeHref="/teach" helpHref={helpHref()} path={path}>
				{page ? page.render() : <Problem error={{ status: 404 }} />}
			</O.ErrorBoundary>
		</O.StaffShell>
	);
}
