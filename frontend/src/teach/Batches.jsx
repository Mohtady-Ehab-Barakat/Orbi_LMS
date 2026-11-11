// Batches in Teach: the list, and a batch's six tabs.
import { call } from "../lib/api.js";
import { dateRange, plural, time, toDate, toDay } from "../lib/format.js";
import { forget, useCall } from "../lib/load.js";
import { navigate } from "../lib/router.js";
import { Loading, Problem } from "../pages/Problem.jsx";
import { newsItems } from "../pages/Learn.jsx";
import { useLeaveGuard } from "./Courses.jsx";
import { Who, useFilter } from "./Marking.jsx";

const O = window.OrbiTutor;
const { useEffect, useState } = React;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STATE_TONE = { Running: "live", "Coming up": "gold", Finished: "neutral" };

function longDate(d) {
	d = d instanceof Date ? d : toDay(d);
	return d ? `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` : "";
}
function minutesText(m) {
	m = Number(m) || 0;
	const h = Math.floor(m / 60), r = m % 60;
	return [h ? plural(h, "hour") : "", r ? plural(r, "minute") : ""].filter(Boolean).join(" ");
}
const peopleSearch = (batch) => (q) => call("orbitutor.teach.find_people", { query: q, batch });

// ---- the list ----

function NewBatch({ open, onClose }) {
	const blank = { title: "", start_date: "", end_date: "", start_time: "16:00", end_time: "17:00" };
	const [v, setV] = useState(blank);
	const [errors, setErrors] = useState({});
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		if (open) (setV(blank), setErrors({}));
	}, [open]);
	const set = (k) => (e) => setV((o) => ({ ...o, [k]: e.target.value }));
	async function go(e) {
		if (e) e.preventDefault();
		const x = {};
		if (!v.title.trim()) x.title = "Give the batch a name.";
		if (!v.start_date) x.start_date = "Pick the first day.";
		if (!v.end_date) x.end_date = "Pick the last day.";
		else if (v.start_date && v.end_date < v.start_date) x.end_date = "It ends before it starts.";
		if (!v.start_time) x.start_time = "Pick a time.";
		if (!v.end_time) x.end_time = "Pick a time.";
		else if (v.start_time && v.end_time <= v.start_time) x.end_time = "Classes end after they start.";
		setErrors(x);
		if (Object.keys(x).length) return;
		setBusy(true);
		try {
			const res = await call("orbitutor.teach.save_batch", { values: { ...v, title: v.title.trim(), medium: "Online", published: 0 } });
			forget("orbitutor.teach.");
			navigate(`/teach/batch/${res.name}/settings`);
		} catch (err) {
			setErrors({ server: err.message });
		} finally {
			setBusy(false);
		}
	}
	return (
		<O.Dialog
			open={open}
			title="New batch"
			onClose={onClose}
			actions={[
				<O.Button key="c" variant="secondary" onClick={onClose}>Cancel</O.Button>,
				<O.Button key="o" icon="plus" loading={busy} onClick={go}>Make the batch</O.Button>,
			]}
		>
			<form className="teach-stack" onSubmit={go}>
				{errors.server ? <O.Alert tone="danger" title="Not made">{errors.server}</O.Alert> : null}
				<O.TextField label="Name" value={v.title} onChange={set("title")} error={errors.title} placeholder="November 2026 batch" maxLength={140} />
				<div className="teach-pair">
					<O.TextField label="Starts" type="date" value={v.start_date} onChange={set("start_date")} error={errors.start_date} />
					<O.TextField label="Ends" type="date" value={v.end_date} onChange={set("end_date")} error={errors.end_date} />
					<O.TextField label="Classes start at" type="time" value={v.start_time} onChange={set("start_time")} error={errors.start_time} />
					<O.TextField label="Classes end at" type="time" value={v.end_time} onChange={set("end_time")} error={errors.end_time} />
				</div>
				<p className="teach-note">You add its courses, seats and students next. It stays hidden until you publish it.</p>
			</form>
		</O.Dialog>
	);
}

export function BatchList() {
	const b = useCall("orbitutor.teach.batches");
	const f = useFilter(b.data && b.data.batches, ["title"]);
	const [making, setMaking] = useState(false);
	return (
		<>
			<O.PageHeader title="Batches" meta="A batch is a group of students taking courses together, with live classes." actions={<O.Button icon="plus" onClick={() => setMaking(true)}>New batch</O.Button>} />
			<O.FilterBar
				search={{ value: f.q, onChange: f.setQ, placeholder: "Search batches" }}
				filters={[{ id: "state", label: "When", value: f.f.state || "", onChange: (v) => f.set("state", v), options: ["Running", "Coming up", "Finished"] }]}
				count={b.data ? plural(f.shown.length, "batch", "batches") : null}
				onClear={f.clear}
			/>
			<O.DataTable
				label="Batches"
				rows={f.shown}
				rowKey="name"
				loading={!b.data && !b.error}
				error={b.error ? { title: "The batches didn't load", onRetry: b.reload } : null}
				empty={{ icon: "schedule", title: "No batches yet", text: "Make one with New batch." }}
				rowHref={(r) => r.href}
				defaultSort={{ key: "starts", dir: "desc" }}
				columns={[
					{ key: "title", label: "Batch", primary: true, sortable: true },
					{ key: "state", label: "Status", render: (r) => <O.Badge tone={STATE_TONE[r.state]}>{r.state}</O.Badge> },
					{ key: "starts", label: "Dates", sortable: true, sortValue: (r) => r.start_sort, render: (r) => dateRange(r.starts, r.ends) },
					{ key: "seats", label: "Students", align: "end" },
					{ key: "published", label: "Published", hideOnTablet: true, render: (r) => (r.published ? "Yes" : <O.Badge>Hidden</O.Badge>) },
				]}
			/>
			<NewBatch open={making} onClose={() => setMaking(false)} />
		</>
	);
}

// ---- a batch ----

function Overview({ d }) {
	const s = d.stats;
	const next = s.next_class;
	const nd = next ? toDate(next.start) : null;
	return (
		<div className="teach-stack">
			<O.StatGrid label="This batch">
				<O.StatTile label="Students" icon="users" value={s.students} meta={d.seats ? `${d.seats} seats` : "No seat limit"} />
				<O.StatTile label="Average progress" icon="chart" value={s.average} unit="%" />
				<O.StatTile label="To mark" icon="assignment" value={s.to_mark} tone={s.to_mark ? "gold" : undefined} href="/teach/marking" />
				<O.StatTile label="Next class" icon="live" value={nd ? DAYS[nd.getDay()].slice(0, 3) : "None"} meta={nd ? `${time(nd)}, ${next.title}` : "Schedule one in Classes"} />
			</O.StatGrid>
			<div className="teach-two">
				<div className="teach-col">
					{d.spreads.length ? (
						d.spreads.map((sp) => (
							<div className="teach-panel" key={sp.title}>
								<O.SpreadBar title={sp.title} note={plural(s.students, "student")} segments={sp.segments} />
							</div>
						))
					) : (
						<div className="teach-panel"><p className="teach-block__empty">Add a course in Settings to see how far students have got.</p></div>
					)}
				</div>
				<div className="teach-panel">
					{d.assessments.length ? (
						<O.BarChart orientation="horizontal" title="Assessments" note="Passed so far" format={(v) => `${v} of ${s.students}`} max={Math.max(s.students, 1)} data={d.assessments.map((a) => ({ label: a.title, value: a.passed }))} />
					) : (
						<p className="teach-block__empty">No assessments yet. Add the quizzes and assignments that count in Assessments.</p>
					)}
				</div>
			</div>
		</div>
	);
}

function Students({ d, update }) {
	const f = useFilter(d.roster, ["name", "id"]);
	const [enrol, setEnrol] = useState(false);
	const [who, setWho] = useState([]);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState(null);
	const [removing, setRemoving] = useState(null);
	const full = d.seats && d.roster.length >= d.seats;
	async function doEnrol() {
		setBusy(true);
		setErr(null);
		try {
			const res = await call("orbitutor.teach.enrol", { batch: d.name, members: who.map((p) => p.value) });
			update(res.batch);
			setEnrol(false);
			setWho([]);
		} catch (e) {
			setErr(e.message);
		} finally {
			setBusy(false);
		}
	}
	const courseCols = d.courses.map((c) => ({
		key: "c:" + c.value,
		label: c.label,
		sortable: true,
		phoneWide: true,
		sortValue: (r) => r.progress[c.value] || 0,
		render: (r) => (
			<span className="teach-prog">
				<O.ProgressBar value={r.progress[c.value] || 0} size="thin" tone={c.track || undefined} label={`${r.name}, ${c.label}`} />
				<span>{(r.progress[c.value] || 0) + "%"}</span>
			</span>
		),
	}));
	return (
		<>
			<O.FilterBar
				search={{ value: f.q, onChange: f.setQ, placeholder: "Search students" }}
				count={d.seats ? `${d.roster.length} of ${d.seats} seats` : plural(d.roster.length, "student")}
				onClear={f.clear}
				actions={<O.Button icon="user-plus" onClick={() => (setErr(null), setEnrol(true))} disabled={!!full}>Enrol students</O.Button>}
			/>
			{full ? <O.Alert tone="info" title="The batch is full">Add seats in Settings to enrol more students.</O.Alert> : null}
			<O.DataTable
				label="Students"
				rows={f.shown}
				empty={{ icon: "users", title: "No students yet", text: "Enrol them here, or from a join request." }}
				columns={[
					{ key: "name", label: "Student", primary: true, sortable: true, render: (r) => <Who name={r.name} /> },
					...courseCols,
					{ key: "last", label: "Last active", sortable: true, sortValue: (r) => r.last_sort, hideOnTablet: true },
				]}
				rowActions={(r) => [
					{ label: "Email", icon: "mail", href: `mailto:${r.id}` },
					{ divider: true },
					{ label: "Remove from batch", icon: "trash", danger: true, onSelect: () => setRemoving(r) },
				]}
			/>
			<O.Dialog
				open={enrol}
				title={`Enrol students in ${d.title}`}
				onClose={() => setEnrol(false)}
				actions={[
					<O.Button key="c" variant="secondary" onClick={() => setEnrol(false)}>Cancel</O.Button>,
					<O.Button key="e" icon="user-plus" disabled={!who.length} loading={busy} onClick={doEnrol}>{who.length ? `Enrol ${who.length}` : "Enrol"}</O.Button>,
				]}
			>
				{err ? <O.Alert tone="danger" title="Not enrolled">{err}</O.Alert> : null}
				<O.Combobox
					label="Students"
					multiple
					value={who}
					onChange={setWho}
					onSearch={peopleSearch(d.name)}
					minChars={2}
					placeholder="Name or email"
					hint={d.courses.length ? `They're added to ${d.courses.map((c) => c.label).join(" and ")} too, and get an email.` : "They get an email."}
					noResults="Nobody with that name or email. They need an account first: ask them to sign up."
				/>
			</O.Dialog>
			<O.ConfirmDialog
				open={!!removing}
				onClose={() => setRemoving(null)}
				title={removing ? `Remove ${removing.name} from the batch?` : ""}
				confirmLabel="Remove"
				onConfirm={async () => {
					try {
						update(await call("orbitutor.teach.remove_student", { batch: d.name, member: removing.id }));
						setRemoving(null);
						return undefined;
					} catch (e) {
						return { error: e.message };
					}
				}}
			>
				<p>They lose the batch's live classes and announcements. Their progress in its courses stays.</p>
			</O.ConfirmDialog>
		</>
	);
}

function ClassDialog({ d, editing, onClose, update }) {
	const [v, setV] = useState({});
	const [errors, setErrors] = useState({});
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		if (!editing) return;
		setErrors({});
		if (editing.id) setV({ title: editing.title, date: editing.date, time: String(editing.time).slice(0, 5), duration: String(editing.minutes), join_url: editing.join_url || "" });
		else setV({ title: "", date: "", time: (d.values.start_time || "16:00").slice(0, 5), duration: "60", join_url: "" });
	}, [editing]);
	const set = (k) => (e) => setV((o) => ({ ...o, [k]: e.target.value }));
	async function go(e) {
		if (e) e.preventDefault();
		const x = {};
		if (!String(v.title || "").trim()) x.title = "Give the class a title.";
		if (!v.date) x.date = "Pick a day.";
		if (!v.time) x.time = "Pick a time.";
		if (v.join_url && !/^https:\/\//i.test(v.join_url.trim())) x.join_url = "The link should start with https://";
		if (!v.join_url && !d.zoom && !(editing && editing.id)) x.join_url = "Add the meeting link.";
		setErrors(x);
		if (Object.keys(x).length) return;
		setBusy(true);
		try {
			const res = await call("orbitutor.teach.schedule_class", { batch: d.name, title: v.title.trim(), date: v.date, time: v.time, duration: Number(v.duration) || 60, join_url: v.join_url.trim() || undefined, live_class: (editing && editing.id) || undefined });
			update(res);
			onClose();
		} catch (err) {
			setErrors({ server: err.message });
		} finally {
			setBusy(false);
		}
	}
	return (
		<O.Dialog
			open={!!editing}
			title={editing && editing.id ? "Change the class" : "Schedule a class"}
			onClose={onClose}
			actions={[
				<O.Button key="c" variant="secondary" onClick={onClose}>Cancel</O.Button>,
				<O.Button key="s" icon="schedule" loading={busy} onClick={go}>{editing && editing.id ? "Save" : "Schedule it"}</O.Button>,
			]}
		>
			<form className="teach-stack" onSubmit={go}>
				{errors.server ? <O.Alert tone="danger" title="Not saved">{errors.server}</O.Alert> : null}
				<O.TextField label="Title" value={v.title || ""} onChange={set("title")} error={errors.title} maxLength={140} placeholder="Cutting the pyramid" />
				<div className="teach-pair">
					<O.TextField label="Date" type="date" value={v.date || ""} onChange={set("date")} error={errors.date} />
					<O.TextField label="Starts at" type="time" value={v.time || ""} onChange={set("time")} error={errors.time} />
				</div>
				<O.Select
					label="Length"
					value={v.duration || "60"}
					onChange={set("duration")}
					options={[
						{ value: "30", label: "30 minutes" },
						{ value: "45", label: "45 minutes" },
						{ value: "60", label: "1 hour" },
						{ value: "90", label: "1 hour 30 minutes" },
						{ value: "120", label: "2 hours" },
						{ value: "180", label: "3 hours" },
					]}
				/>
				<O.TextField
					label="Meeting link"
					optional={d.zoom || !!(editing && editing.id)}
					type="url"
					autoCapitalize="none"
					placeholder="https://meet.google.com/..."
					value={v.join_url || ""}
					onChange={set("join_url")}
					error={errors.join_url}
					hint={d.zoom ? "Or leave it empty and Zoom makes one." : "Google Meet, Zoom or Teams. Students see Join on their Home when it starts."}
				/>
			</form>
		</O.Dialog>
	);
}

function Classes({ d, update }) {
	const [editing, setEditing] = useState(null);
	const [cancelling, setCancelling] = useState(null);
	const coming = d.classes.filter((c) => !c.past);
	const nextId = coming.length ? coming[0].id : null;
	const rows = [...coming, ...d.classes.filter((c) => c.past).reverse()];
	return (
		<>
			<O.FilterBar count={`${plural(d.classes.length, "class", "classes")}, ${coming.length} to come`} actions={<O.Button icon="plus" onClick={() => setEditing({})}>Schedule a class</O.Button>} />
			<O.DataTable
				label="Live classes"
				rows={rows}
				empty={{ icon: "live", title: "No classes yet", text: "Schedule the first one." }}
				columns={[
					{ key: "title", label: "Class", primary: true },
					{ key: "start", label: "When", render: (r) => <span className="teach-when">{`${longDate(r.date)}, ${time(toDate(r.start))}`}</span> },
					{ key: "minutes", label: "Length", hideOnTablet: true, render: (r) => minutesText(r.minutes) },
					{ key: "came", label: "Came", render: (r) => (r.id === nextId ? <O.Badge tone="gold">Next</O.Badge> : r.past ? (r.came ? `${r.came} of ${d.roster.length}` : "—") : <O.Badge>Later</O.Badge>) },
				]}
				rowActions={(r) =>
					r.past
						? []
						: [
								r.start_url ? { label: "Start the class", icon: "live", href: r.start_url } : null,
								{ label: "Change", icon: "edit", onSelect: () => setEditing(r) },
								{ divider: true },
								{ label: "Cancel the class", icon: "trash", danger: true, onSelect: () => setCancelling(r) },
						  ].filter(Boolean)
				}
			/>
			<ClassDialog d={d} editing={editing} onClose={() => setEditing(null)} update={update} />
			<O.ConfirmDialog
				open={!!cancelling}
				onClose={() => setCancelling(null)}
				title={cancelling ? `Cancel “${cancelling.title}”?` : ""}
				confirmLabel="Cancel the class"
				cancelLabel="Keep it"
				onConfirm={async () => {
					try {
						update(await call("orbitutor.teach.cancel_class", { live_class: cancelling.id }));
						setCancelling(null);
						return undefined;
					} catch (e) {
						return { error: e.message };
					}
				}}
			>
				<p>It comes off the batch's timetable. Tell students in an announcement.</p>
			</O.ConfirmDialog>
		</>
	);
}

function Assessments({ d, update }) {
	const [adding, setAdding] = useState(false);
	const [kind, setKind] = useState("quiz");
	const [pick, setPick] = useState(null);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState(null);
	const [removing, setRemoving] = useState(null);
	async function add() {
		setBusy(true);
		setErr(null);
		try {
			update(await call("orbitutor.teach.assessment_change", { batch: d.name, action: "add", kind, name: pick.value }));
			setAdding(false);
		} catch (e) {
			setErr(e.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<>
			<O.FilterBar count="What counts towards finishing this batch" actions={<O.Button icon="plus" onClick={() => (setPick(null), setErr(null), setAdding(true))}>Add a quiz or assignment</O.Button>} />
			<O.DataTable
				label="Assessments"
				rows={d.assessments}
				empty={{ icon: "quiz", title: "Nothing counts yet", text: "Add the quizzes and assignments students must pass." }}
				rowHref={(r) => r.href}
				columns={[
					{ key: "title", label: "Quiz or assignment", primary: true },
					{ key: "kind", label: "Kind" },
					{ key: "due", label: "Due", render: (r) => (r.due ? longDate(toDate(r.due)) : "No date") },
					{ key: "passed", label: "Passed", align: "end", render: (r) => `${r.passed} of ${d.roster.length}` },
				]}
				rowActions={(r) => [{ label: "Stop counting it", icon: "minus", danger: true, onSelect: () => setRemoving(r) }]}
			/>
			<O.Dialog
				open={adding}
				title="Add a quiz or assignment"
				onClose={() => setAdding(false)}
				actions={[
					<O.Button key="c" variant="secondary" onClick={() => setAdding(false)}>Cancel</O.Button>,
					<O.Button key="a" icon="plus" disabled={!pick} loading={busy} onClick={add}>Add it</O.Button>,
				]}
			>
				<div className="teach-stack">
					{err ? <O.Alert tone="danger" title="Not added">{err}</O.Alert> : null}
					<O.SegmentedControl
						label="Kind"
						full
						value={kind}
						onChange={(k) => (setKind(k), setPick(null))}
						options={[
							{ value: "quiz", label: "Quiz", icon: "quiz" },
							{ value: "assignment", label: "Assignment", icon: "assignment" },
							{ value: "program", label: "Coding", icon: "code" },
						]}
					/>
					<O.Combobox
						key={kind}
						label={kind === "quiz" ? "Quiz" : kind === "assignment" ? "Assignment" : "Coding exercise"}
						value={pick}
						onChange={setPick}
						onSearch={(q) => call("orbitutor.teach.search_activities", { kind, query: q })}
						minChars={0}
						placeholder="Search by title"
						hint="Its due date, if it has one, is set on its own page."
					/>
				</div>
			</O.Dialog>
			<O.ConfirmDialog
				open={!!removing}
				onClose={() => setRemoving(null)}
				title={removing ? `Stop counting “${removing.title}”?` : ""}
				confirmLabel="Stop counting it"
				icon="minus"
				onConfirm={async () => {
					try {
						update(await call("orbitutor.teach.assessment_change", { batch: d.name, action: "remove", row: removing.id }));
						setRemoving(null);
						return undefined;
					} catch (e) {
						return { error: e.message };
					}
				}}
			>
				<p>It stays in its lessons, and students keep their results.</p>
			</O.ConfirmDialog>
		</>
	);
}

function Announce({ d, update }) {
	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [email, setEmail] = useState(true);
	const [errors, setErrors] = useState({});
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	async function post() {
		const x = {};
		if (!subject.trim()) x.subject = "Give it a title.";
		if (!body.replace(/<[^>]*>/g, "").trim()) x.body = "Write the announcement.";
		setErrors(x);
		if (Object.keys(x).length) return;
		setBusy(true);
		setSent(false);
		try {
			update(await call("orbitutor.teach.announce", { batch: d.name, subject: subject.trim(), body, email: email ? 1 : 0 }));
			setSubject("");
			setBody("");
			setSent(true);
		} catch (e) {
			setErrors({ server: e.message });
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="teach-two">
			<div className="teach-stack">
				{errors.server ? <O.Alert tone="danger" title="Not posted">{errors.server}</O.Alert> : null}
				{sent ? <O.Alert tone="success" title="Posted">{email ? "It's on the batch page, and on its way by email." : "It's on the batch page."}</O.Alert> : null}
				<O.TextField label="Title" value={subject} onChange={(e) => (setSubject(e.target.value), setSent(false))} error={errors.subject} maxLength={140} placeholder="Thursday's class moves to 5:00 pm" />
				<O.RichTextField label="Announcement" value={body} onChange={(h) => (setBody(h), setSent(false))} rows={5} error={errors.body} />
				<O.Switch label="Also email it" hint={`To the ${plural(d.roster.length, "student")} in this batch.`} checked={email} onChange={setEmail} />
				<div>
					<O.Button icon="send" loading={busy} onClick={post}>Post announcement</O.Button>
				</div>
			</div>
			<O.Announcements title="Posted" limit={30} items={newsItems(d.announcements)} emptyText="Nothing posted yet." />
		</div>
	);
}

function Settings({ d, update }) {
	const courses = useCall("orbitutor.teach.courses");
	const fresh = () => ({ ...d.values, seat_count: d.values.seat_count ? String(d.values.seat_count) : "" });
	const [v, setV] = useState(fresh);
	const [cs, setCs] = useState(() => d.courses.map((c) => ({ value: c.value, label: c.label })));
	const [who, setWho] = useState(() => d.instructors.map((p) => ({ value: p.value, label: p.name, person: true, avatar: p.src || null })));
	const [state, setState] = useState("clean");
	const [errors, setErrors] = useState({});
	useLeaveGuard(state === "dirty");
	const set = (k, x) => (setV((o) => ({ ...o, [k]: x })), setState("dirty"));
	const ev = (k) => (e) => set(k, e.target.value);
	async function save() {
		const x = {};
		if (!String(v.title || "").trim()) x.title = "Give the batch a name.";
		if (!v.start_date) x.start_date = "Pick the first day.";
		if (!v.end_date) x.end_date = "Pick the last day.";
		else if (v.start_date && v.end_date < v.start_date) x.end_date = "It ends before it starts.";
		if (v.start_time && v.end_time && v.end_time <= v.start_time) x.end_time = "Classes end after they start.";
		if (!who.length) x.instructors = "A batch needs at least one instructor.";
		setErrors(x);
		if (Object.keys(x).length) return setState("error");
		setState("saving");
		try {
			const res = await call("orbitutor.teach.save_batch", { batch: d.name, values: { ...v, seat_count: Number(v.seat_count) || 0 }, courses: cs.map((c) => c.value), instructors: who.map((p) => p.value) });
			update(res);
			forget("orbitutor.teach.batches");
			setState("saved");
		} catch (e) {
			setErrors({ server: e.message });
			setState("error");
		}
	}
	const n = Object.keys(errors).filter((k) => k !== "server").length;
	const courseOptions = ((courses.data && courses.data.courses) || []).map((c) => ({ value: c.name, label: c.title, description: c.status !== "Published" ? c.status : undefined }));
	return (
		<>
			{errors.server ? <O.Alert tone="danger" title="Not saved">{errors.server}</O.Alert> : null}
			<O.FormSection title="The batch" description="Students see these on the batch page and its card.">
				<O.TextField label="Name" value={v.title || ""} onChange={ev("title")} error={errors.title} maxLength={140} />
				<O.TextField label="Short description" value={v.description || ""} onChange={ev("description")} maxLength={280} hint="One line on the batch card." />
				<O.RichTextField label="About the batch" value={v.batch_details || ""} onChange={(h) => set("batch_details", h)} rows={4} hint="What students do in it, on the batch page." />
			</O.FormSection>
			<O.FormSection title="Dates and times" description="Classes repeat at this time unless you schedule them differently." columns={2}>
				<O.TextField label="Starts" type="date" value={v.start_date || ""} onChange={ev("start_date")} error={errors.start_date} />
				<O.TextField label="Ends" type="date" value={v.end_date || ""} onChange={ev("end_date")} error={errors.end_date} />
				<O.TextField label="Classes start at" type="time" value={v.start_time || ""} onChange={ev("start_time")} />
				<O.TextField label="Classes end at" type="time" value={v.end_time || ""} onChange={ev("end_time")} error={errors.end_time} />
				<O.TextField label="Seats" optional type="number" value={v.seat_count} onChange={ev("seat_count")} hint="Leave it empty for no limit." />
				<O.Select label="Where" value={v.medium === "Offline" ? "Offline" : "Online"} onChange={ev("medium")} options={[{ value: "Online", label: "Online" }, { value: "Offline", label: "In person" }]} />
			</O.FormSection>
			<O.FormSection title="Courses and staff">
				<O.Combobox label="Courses" multiple value={cs} onChange={(x) => (setCs(x), setState("dirty"))} options={courseOptions} placeholder="Add a course" hint="Students in the batch are enrolled in these." />
				<O.Combobox label="Instructors" multiple value={who} onChange={(x) => (setWho(x), setState("dirty"))} onSearch={peopleSearch()} minChars={2} placeholder="Find a member of staff" error={errors.instructors} />
			</O.FormSection>
			<O.FormSection title="Who can see it">
				<O.Switch label="Published" hint="Shows on the course pages, so students can ask to join." checked={!!v.published} onChange={(x) => set("published", x ? 1 : 0)} />
				<O.Switch label="Certificates" hint="Students who finish get a certificate." checked={!!v.certification} onChange={(x) => set("certification", x ? 1 : 0)} />
				<O.Switch label="Final evaluation" hint="Students book a session with an evaluator before their certificate." checked={!!v.evaluation} onChange={(x) => set("evaluation", x ? 1 : 0)} />
				{v.evaluation ? <O.TextField label="Last day to book an evaluation" type="date" value={v.evaluation_end_date || ""} onChange={ev("evaluation_end_date")} /> : null}
			</O.FormSection>
			<O.SaveBar
				state={state}
				onSave={save}
				onDiscard={() => (setV(fresh()), setCs(d.courses.map((c) => ({ value: c.value, label: c.label }))), setWho(d.instructors.map((p) => ({ value: p.value, label: p.name, person: true, avatar: p.src || null }))), setErrors({}), setState("clean"))}
				message={state === "error" && n ? `Not saved. ${n === 1 ? "1 field needs" : n + " fields need"} fixing.` : undefined}
			/>
		</>
	);
}

const TABS = ["overview", "students", "classes", "assessments", "announcements", "settings"];

export function BatchPage({ batch, tab = "overview" }) {
	const b = useCall("orbitutor.teach.batch_detail", { batch });
	if (b.error) return <Problem error={b.error} what="batch" onRetry={b.reload} />;
	if (!b.data) return <Loading lines={4} blocks={2} />;
	const d = b.data;
	const current = TABS.includes(tab) ? tab : "overview";
	const update = (res) => (b.set(res), forget("orbitutor.teach.batches"), forget("orbitutor.teach.context"));
	return (
		<>
			<O.PageHeader
				back={{ href: "/teach/batches", label: "Batches" }}
				title={d.title}
				status={
					<>
						<O.Badge tone={STATE_TONE[d.state]}>{d.state}</O.Badge>
						{!d.values.published ? <O.Badge>Hidden</O.Badge> : null}
					</>
				}
				meta={d.meta}
				actions={<O.Button variant="secondary" icon="eye" href={d.student_href}>See it as a student</O.Button>}
				tabs={
					<O.Tabs
						label="Batch"
						value={current}
						onChange={(id) => navigate(`/teach/batch/${d.name}/${id}`, { replace: true, scroll: false })}
						tabs={[
							{ id: "overview", label: "Overview" },
							{ id: "students", label: "Students", count: d.roster.length },
							{ id: "classes", label: "Classes" },
							{ id: "assessments", label: "Assessments" },
							{ id: "announcements", label: "Announcements" },
							{ id: "settings", label: "Settings" },
						]}
					/>
				}
			/>
			{current === "overview" ? <Overview d={d} /> : null}
			{current === "students" ? <Students d={d} update={update} /> : null}
			{current === "classes" ? <Classes d={d} update={update} /> : null}
			{current === "assessments" ? <Assessments d={d} update={update} /> : null}
			{current === "announcements" ? <Announce d={d} update={update} /> : null}
			{current === "settings" ? <Settings key={d.name} d={d} update={update} /> : null}
		</>
	);
}
