// The student's other screens: the schedule, a batch, certificates (and a certificate's own
// page), profiles and settings. Each asks orbitutor.learn for what it shows.
import { boot, call, signOut } from "../lib/api.js";
import { when } from "../lib/format.js";
import { forget, useCall } from "../lib/load.js";
import { navigate } from "../lib/router.js";
import { sanitize } from "../lib/safe.js";
import { uploadFile } from "../lib/upload.js";
import { PageHead } from "./Courses.jsx";
import { Loading, Problem, helpHref } from "./Problem.jsx";

const O = window.OrbiTutor;
const { useEffect, useState } = React;

export function newsItems(list, now = new Date()) {
	return (list || []).map((a) => ({
		id: a.id,
		author: { name: a.from && a.from.name ? a.from.name : "OrbitCore", src: (a.from && a.from.src) || undefined, brand: !(a.from && a.from.name) },
		batch: a.batch || undefined,
		time: when(a.at, now),
		title: a.title || "Announcement",
		text: a.text,
	}));
}

// ---- the schedule ----

export function SchedulePage() {
	const s = useCall("orbitutor.learn.schedule");
	if (s.error) return <Problem error={s.error} onRetry={s.reload} />;
	if (!s.data) return <Loading lines={4} blocks={2} />;
	const d = s.data;
	return (
		<>
			<PageHead title="Schedule" lead="Live classes, due dates and evaluations in your batches." />
			<O.Schedule events={d.events} timezone={d.timezone} emptyText="Nothing on your schedule yet. When you're in a batch, its classes show here." />
			{d.batches && d.batches.length ? (
				<O.PageSection title="Your batches" className="app-gap">
					<div className="app-list">
						{d.batches.map((b) => (
							<O.ListRow key={b.name} href={b.href} icon="schedule" title={b.title} meta={(b.online ? "Online" : "In person") + (b.starts ? " · from " + when(b.starts) : "")} />
						))}
					</div>
				</O.PageSection>
			) : null}
		</>
	);
}

// ---- a batch ----

function Evaluation({ batch, info }) {
	const [course, setCourse] = useState(info.courses[0] && info.courses[0].id);
	const slots = useCall("orbitutor.learn.evaluation_slots", { course, batch }, { skip: !course || info.state !== "book" });
	const days = ((slots.data && slots.data.days) || []).map((d) => ({ date: d.date, slots: d.slots.map((x) => ({ start: x.start, end: x.end, _raw: x })) }));
	async function onBook(choice) {
		const all = (slots.data && slots.data.days) || [];
		let raw = null;
		for (const d of all) for (const x of d.slots) if (new Date(x.start).getTime() === new Date(choice.start).getTime()) raw = x;
		if (!raw) throw new Error("That time has just been taken. Pick another.");
		await call("orbitutor.learn.book_evaluation", { course: choice.course, batch, date: raw.date, start_time: raw.start_time, end_time: raw.end_time });
		forget("orbitutor.learn.");
		window.location.reload();
	}
	async function onCancel() {
		await call("orbitutor.learn.cancel_evaluation", { request: info.booking.name });
		forget("orbitutor.learn.");
		window.location.reload();
	}
	return (
		<O.EvaluationBooking
			courses={info.courses}
			course={course}
			onCourseChange={setCourse}
			days={days}
			lastDay={info.lastDay || undefined}
			timezone={slots.data && slots.data.timezone}
			booking={info.booking || undefined}
			state={info.state}
			onBook={onBook}
			onCancel={info.booking ? onCancel : undefined}
			contactHref={helpHref()}
			headingAs="h2"
		/>
	);
}

export function BatchPage({ batch }) {
	const b = useCall("orbitutor.learn.batch_page", { batch });
	useEffect(() => {
		if (b.data && b.data.title) document.title = b.data.title + " · " + (boot.app_name || "OrbiTutor");
	}, [b.data]);
	if (b.error) return <Problem error={b.error} what="batch" onRetry={b.reload} />;
	if (!b.data) return <Loading lines={4} blocks={2} />;
	const d = b.data;
	if (d.access === "none") {
		return (
			<O.NoAccessPage
				reason="batch"
				batch={{ title: d.title, course: d.courses[0] && d.courses[0].title }}
				coursesHref="/catalogue"
				helpHref={helpHref()}
				text={d.courses[0] ? "Ask to join from the course page, and we'll call you about a place in this batch." : undefined}
			/>
		);
	}
	const now = new Date();
	return (
		<>
			{d.access === "staff" ? (
				<O.Alert tone="info" className="app-gap-bottom" action={<O.Button size="sm" variant="secondary" href={`/teach/batch/${d.name}`}>Open it in Teach</O.Button>}>
					You're seeing this batch as its students do.
				</O.Alert>
			) : null}
			<O.BatchHero
				name={d.title}
				courses={d.courses}
				startDate={d.starts}
				endDate={d.ends}
				when={d.when || undefined}
				where={d.where}
				online={d.online}
				instructors={d.instructors}
				studentCount={d.student_count}
				headingAs="h1"
			/>
			{d.description ? <O.Prose className="app-gap" html={sanitize(d.description)} /> : null}
			<O.PageSection title="Live classes" className="app-gap">
				<O.ClassList classes={d.classes.map((c) => ({ id: c.id, title: c.title, start: c.start, minutes: c.minutes, joinHref: c.joinHref || undefined, description: c.description || undefined }))} headingAs="h3" emptyText="No live classes yet." />
			</O.PageSection>
			{d.assessments.length ? (
				<O.PageSection title="What counts in this batch" className="app-gap">
					<div className="app-list">
						{d.assessments.map((a) => (
							<O.ListRow
								key={a.id}
								href={a.href}
								icon={a.kind}
								title={a.title}
								meta={a.due ? "Due " + when(a.due, now) : { quiz: "Quiz", assignment: "Assignment", code: "Coding exercise" }[a.kind]}
								trailing={
									a.status === "passed" ? <O.Badge tone="success" icon="done">Passed</O.Badge>
									: a.status === "failed" ? <O.Badge tone="danger">Not passed</O.Badge>
									: a.status === "submitted" ? <O.Badge icon="due">Being marked</O.Badge>
									: a.done ? <O.Badge icon="done">Done</O.Badge>
									: <O.Badge tone="gold">To do</O.Badge>
								}
							/>
						))}
					</div>
				</O.PageSection>
			) : null}
			{d.timetable.length ? <O.Timetable className="app-gap" items={d.timetable} startDate={d.starts} endDate={d.ends} title="Timetable" headingAs="h2" /> : null}
			{d.evaluation ? (
				<section id="evaluation" className="app-gap">
					<Evaluation batch={d.name} info={d.evaluation} />
				</section>
			) : null}
			{d.announcements.length ? <O.Announcements className="app-gap" title="Announcements" items={newsItems(d.announcements, now)} /> : null}
		</>
	);
}

// ---- certificates ----

export function CertificatesPage() {
	const c = useCall("orbitutor.learn.certificates");
	if (c.error) return <Problem error={c.error} onRetry={c.reload} />;
	if (!c.data) return <Loading lines={3} blocks={2} />;
	return (
		<>
			<PageHead title="Certificates" lead="What you've earned. Each one has its own page you can share." />
			<O.CertificateList items={c.data.items} inProgress={c.data.in_progress} emptyTitle="No certificates yet" emptyText="Finish a course and pass its evaluation, and your certificate shows here." />
		</>
	);
}

export function CertificatePage({ certificate }) {
	const c = useCall("orbitutor.learn.certificate", { name: certificate });
	if (c.error) return <Problem error={c.error} what="certificate" onRetry={c.reload} />;
	if (!c.data) return <Loading lines={4} blocks={1} />;
	const d = c.data;
	if (d.status === "notfound") return <O.CertificateCheck status="notfound" code={certificate} issuer="OrbitCore" homeHref="/" />;
	const x = d.certificate;
	return (
		<div className="app-cert">
			<O.CertificateDoc name={x.name} course={x.course} date={x.issued} batch={x.batch || undefined} id={x.id} instructor={x.instructor || undefined} evaluator={x.evaluator ? { name: x.evaluator, role: "Evaluator" } : null} checkUrl={x.checkUrl} />
			<O.CertificateCheck
				status={d.status}
				certificate={{ id: x.id, name: x.name, course: x.course, issued: x.issued, expires: x.expires || undefined, batch: x.batch || undefined, evaluator: x.evaluator || undefined, instructor: x.instructor || undefined, checkUrl: x.checkUrl, pdfHref: x.pdfHref || undefined }}
				issuer="OrbitCore"
				homeHref="/"
			/>
		</div>
	);
}

// ---- profiles ----

export function ProfilePage({ username }) {
	const p = useCall("orbitutor.learn.profile", username ? { username } : {});
	if (p.error) return <Problem error={p.error} what="profile" onRetry={p.reload} />;
	if (!p.data) return <Loading lines={3} blocks={2} />;
	const d = p.data;
	return (
		<O.ProfilePage
			user={d.user}
			own={d.own}
			projects={d.projects}
			certificates={d.certificates}
			finished={d.finished}
			inProgress={d.own ? d.in_progress : undefined}
			editHref={d.own ? "/settings/profile" : undefined}
			settingsHref={d.own ? "/settings" : undefined}
			certificatesHref={d.own ? "/certificates" : undefined}
		/>
	);
}

// ---- settings ----

function applyTheme(theme) {
	const t = theme === "system" ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "day" : "night") : theme;
	document.documentElement.setAttribute("data-theme", t);
	try {
		localStorage.setItem("orbitutor.theme", theme);
	} catch (e) {
		/* private window */
	}
}

export function SettingsPage({ section }) {
	const s = useCall("orbitutor.learn.settings");
	const [theme, setTheme] = useState(null);
	const [lite, setLite] = useState(() => {
		try {
			const v = localStorage.getItem("orbitutor.performance");
			return v === "lite" ? "on" : v === "full" ? "off" : "auto";
		} catch (e) {
			return "auto";
		}
	});
	if (s.error) return <Problem error={s.error} onRetry={s.reload} />;
	if (!s.data) return <Loading lines={4} blocks={1} />;
	const d = s.data;
	const login = boot.login || {};

	async function saveProfile(c) {
		try {
			let image;
			if (c.photo) image = (await uploadFile(c.photo, { private: false })).file_url;
			const fresh = await call("orbitutor.learn.save_profile", { full_name: c.name, bio: c.bio, image: image || null, remove_photo: c.removePhoto ? 1 : 0 });
			s.set(fresh);
			forget("orbitutor.learn.profile");
			return undefined;
		} catch (e) {
			return { error: { message: e.message } };
		}
	}
	async function changePassword(c) {
		try {
			await call("frappe.core.doctype.user.user.update_password", { new_password: c.password, old_password: c.current, logout_all_sessions: c.signOutOthers ? 1 : 0 });
			return undefined;
		} catch (e) {
			const msg = String(e.message || "");
			if (e.status === 429) return { error: { kind: "rate" } };
			if (/incorrect|wrong|old password/i.test(msg) || e.status === 401) return { error: { kind: "wrong" } };
			if (/password/i.test(msg) && e.status === 417) return { error: { kind: "weak", message: msg } };
			return { error: { kind: "other", message: msg } };
		}
	}

	const sections = [
		{ id: "profile", label: "Profile", icon: "profile", summary: "Your name, photo and a line about you", content: <O.ProfileSettings user={d.user} onSave={saveProfile} /> },
		{
			id: "appearance",
			label: "Appearance",
			icon: "moon",
			summary: "Night or day, and lighter effects",
			content: (
				<O.AppearanceSettings
					theme={theme || d.theme}
					onTheme={(t) => {
						setTheme(t);
						applyTheme(t);
						call("orbitutor.learn.set_theme", { theme: t }).catch(() => {});
					}}
					lite={lite}
					onLite={(v) => {
						setLite(v);
						try {
							if (v === "auto") localStorage.removeItem("orbitutor.performance");
							else localStorage.setItem("orbitutor.performance", v === "on" ? "lite" : "full");
						} catch (e) {
							/* private window */
						}
						O.applyPerformanceMode(v === "auto" ? undefined : v === "on" ? "lite" : "full");
					}}
					liteDetected={O.performanceMode() === "lite"}
				/>
			),
		},
		{
			id: "security",
			label: "Signing in",
			icon: "key",
			summary: "Password and other devices",
			content: (
				<O.SecuritySettings
					method={d.method}
					email={d.user.email}
					name={d.user.name}
					passwordChangedAt={d.password_changed_at || undefined}
					minScore={login.min_password_score || undefined}
					onChangePassword={changePassword}
					onSignOutOthers={async () => {
						try {
							await call("orbitutor.learn.sign_out_others");
							return undefined;
						} catch (e) {
							return { error: { message: e.message } };
						}
					}}
				/>
			),
		},
	];
	const active = sections.some((x) => x.id === section) ? section : undefined;
	return (
		<O.SettingsLayout
			title="Settings"
			sections={sections}
			active={active}
			defaultSection={active}
			onSelect={(id) => navigate("/settings/" + id, { replace: !!active, scroll: false })}
			onSignOut={signOut}
		/>
	);
}
