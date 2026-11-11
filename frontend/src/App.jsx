// Which screen each address shows, who may see it, and the frame around it.
import { boot } from "./lib/api.js";
import { match, navigate, useLocation } from "./lib/router.js";
import { SignIn, SignUp, UpdatePassword } from "./pages/Auth.jsx";
import Course from "./pages/Course.jsx";
import { Catalogue, MyCourses } from "./pages/Courses.jsx";
import Home from "./pages/Home.jsx";
import Lesson from "./pages/Lesson.jsx";
import { AssignmentPage, ExercisePage, QuizPage } from "./pages/Activities.jsx";
import { BatchPage, CertificatePage, CertificatesPage, ProfilePage, SchedulePage, SettingsPage } from "./pages/Learn.jsx";
import { NotificationsPage, SearchPage } from "./pages/Other.jsx";
import { Problem, SignInRedirect, helpHref } from "./pages/Problem.jsx";
import { Shell } from "./shell/Shell.jsx";
import Teach from "./teach/Teach.jsx";

const O = window.OrbiTutor;
const { useEffect, useRef } = React;

const signedIn = !!boot.user;
const open = signedIn || !!boot.guest_access;

// [pattern, title, render(params), { shell, who }] — who: "user" (signed in), "open" (signed in,
// or anyone when guest access is on), "guest" (the sign-in pages).
const SCREENS = [
	["/", "Home", () => <Home />, { who: "user" }],
	["/login", "Sign in", () => <SignIn />, { shell: false, who: "guest" }],
	["/signup", "Create your account", () => <SignUp />, { shell: false, who: "guest" }],
	["/update-password", "Your password", () => <UpdatePassword />, { shell: false, who: "guest" }],
	["/catalogue", "All courses", () => <Catalogue />, { who: "open" }],
	["/my-courses", "My courses", () => <MyCourses />, { who: "user" }],
	["/course/:course", null, (p) => <Course key={p.course} course={p.course} />, { who: "open" }],
	[
		"/course/:course/*",
		null,
		(p) => {
			const m = p.rest.match(/^learn\/(\d+[-.]\d+)$/);
			return m ? <Lesson course={p.course} number={m[1].replace(".", "-")} /> : <Problem error={{ status: 404 }} />;
		},
		{ shell: (p) => !/^learn\//.test(p.rest), who: "open" },
	],
	["/notifications", "Notifications", () => <NotificationsPage />, { who: "user" }],
	["/search", "Search", () => <SearchPage />, { who: "open" }],
	["/schedule", "Schedule", () => <SchedulePage />, { who: "user" }],
	["/batch/:batch", "Batch", (p) => <BatchPage key={p.batch} batch={p.batch} />, { who: "user" }],
	["/batch/:batch/*", "Batch", (p) => <BatchPage key={p.batch} batch={p.batch} />, { who: "user" }],
	["/certificates", "Certificates", () => <CertificatesPage />, { who: "user" }],
	["/certificate/:certificate", "Certificate", (p) => <CertificatePage key={p.certificate} certificate={p.certificate} />, { who: "any" }],
	["/my-profile", "Your profile", () => <ProfilePage />, { who: "user" }],
	["/profile/:username", "Profile", (p) => <ProfilePage key={p.username} username={p.username} />, { who: "user" }],
	["/settings", "Settings", () => <SettingsPage />, { who: "user" }],
	["/settings/:section", "Settings", (p) => <SettingsPage key={p.section} section={p.section} />, { who: "user" }],
	["/assignment/:assignment", "Assignment", (p) => <AssignmentPage key={p.assignment} assignment={p.assignment} />, { who: "user" }],
	["/quiz/:quiz", "Quiz", (p) => <QuizPage key={p.quiz} quiz={p.quiz} />, { who: "user" }],
	["/exercise/:exercise", "Coding exercise", (p) => <ExercisePage key={p.exercise} exercise={p.exercise} />, { who: "user" }],
	// the Teach area draws its own frame and sets its own titles
	["/teach", null, () => <Teach />, { shell: false, who: "user" }],
	["/teach/*", null, () => <Teach />, { shell: false, who: "user" }],
	["/welcome", null, () => <Redirect to="/" />, { who: "any" }],
];

function Redirect({ to }) {
	useEffect(() => navigate(to, { replace: true }), [to]);
	return null;
}

function find(path) {
	for (const [pattern, title, render, opts] of SCREENS) {
		const params = match(pattern, path);
		if (params) return { title, render, params, opts: opts || {} };
	}
	return null;
}

function reportError(error, info) {
	// Never shown to the student; the console keeps it for whoever looks.
	console.error("OrbiTutor screen error", error, info && info.componentStack);
}

export default function App() {
	const { path } = useLocation();
	const first = useRef(true);
	const screen = find(path);

	useEffect(() => {
		if (screen && screen.title) document.title = screen.title + " · " + (boot.app_name || "OrbiTutor");
		if (first.current) {
			first.current = false;
			return;
		}
		// after moving to another screen, start reading from its content
		requestAnimationFrame(() => {
			const main = document.getElementById("main");
			if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
		});
	}, [path]);

	let body;
	let shell = true;
	if (!screen) {
		body = <Problem error={{ status: 404 }} />;
	} else {
		const { who } = screen.opts;
		shell = typeof screen.opts.shell === "function" ? screen.opts.shell(screen.params) : screen.opts.shell !== false;
		if (who === "user" && !signedIn) {
			body = path === "/" ? <Redirect to="/login" /> : <SignInRedirect />;
			shell = false;
		} else if (who === "open" && !open) {
			body = <SignInRedirect />;
			shell = false;
		} else {
			body = screen.render(screen.params);
		}
	}

	const guarded = (
		<O.ErrorBoundary resetKey={path} onError={reportError} homeHref="/" helpHref={helpHref()} path={path} standalone={!shell}>
			{body}
		</O.ErrorBoundary>
	);
	return shell ? <Shell>{guarded}</Shell> : guarded;
}
