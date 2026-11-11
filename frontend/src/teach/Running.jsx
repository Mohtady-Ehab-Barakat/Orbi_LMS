// Running OrbiTutor: join requests, evaluations, certificates, people, statistics and settings.
import { call } from "../lib/api.js";
import { plural } from "../lib/format.js";
import { forget, useCall } from "../lib/load.js";
import { Loading, Problem } from "../pages/Problem.jsx";
import { since, useLeaveGuard } from "./Courses.jsx";
import { Who, options, useFilter } from "./Marking.jsx";

const O = window.OrbiTutor;
const { useEffect, useState } = React;

const TODAY = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function Facts({ rows }) {
	return (
		<dl className="teach-facts">
			{rows.filter((r) => r[1]).map((r) => (
				<React.Fragment key={r[0]}>
					<dt>{r[0]}</dt>
					<dd>{r[1]}</dd>
				</React.Fragment>
			))}
		</dl>
	);
}

// ---- join requests ----

const STATUS_WORDS = { New: "New", Contacted: "Called", Enrolled: "Enrolled", Closed: "Not now" };
const STATUS_TONE = { New: "warning", Contacted: "neutral", Enrolled: "success", Closed: "neutral" };

function whatsappHref(phone, name) {
	let digits = String(phone || "").replace(/\D/g, "");
	if (!digits) return undefined;
	if (digits.startsWith("0")) digits = "6" + digits;
	return `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${name || ""}, this is OrbiTutor about your request to join.`)}`;
}

function EnrolFromRequest({ request, onClose, onDone }) {
	const b = useCall("orbitutor.teach.batches", null, { skip: !request });
	const [batch, setBatch] = useState("");
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState(null);
	useEffect(() => {
		if (request) (setBatch(request.batch_name || ""), setErr(null));
	}, [request]);
	const choices = ((b.data && b.data.batches) || []).filter((x) => x.state !== "Finished").map((x) => ({ value: x.name, label: `${x.title} (${x.seats} ${x.seats.includes("of") ? "seats taken" : "students"})` }));
	async function go() {
		if (!batch) return setErr("Pick a batch.");
		setBusy(true);
		setErr(null);
		try {
			await call("orbitutor.teach.enrol", { batch, members: [request.user], request: request.id });
			forget("orbitutor.teach.");
			onDone();
		} catch (e) {
			setErr(e.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<O.Dialog
			open={!!request}
			title={request ? `Enrol ${request.name} in a batch` : ""}
			onClose={onClose}
			actions={[
				<O.Button key="c" variant="secondary" onClick={onClose}>Cancel</O.Button>,
				<O.Button key="e" icon="user-plus" loading={busy} onClick={go} disabled={!request || !request.user}>Enrol</O.Button>,
			]}
		>
			{request && !request.user ? (
				<O.Alert tone="warning" title="They don't have an account yet">Ask them to make one with Create an account, then enrol them here.</O.Alert>
			) : (
				<div className="teach-stack">
					{err ? <O.Alert tone="danger" title="Not enrolled">{err}</O.Alert> : null}
					<O.Select label="Batch" value={batch} placeholder={b.data ? "Choose a batch" : "Loading the batches"} onChange={(e) => setBatch(e.target.value)} options={choices} hint="They're added to the batch's courses and get an email. The request is marked Enrolled." />
				</div>
			)}
		</O.Dialog>
	);
}

export function Requests() {
	const r = useCall("orbitutor.teach.requests");
	const items = (r.data && r.data.items) || [];
	const f = useFilter(items, ["name", "phone", "course", "email"]);
	const [open, setOpen] = useState(null);
	const [enrolling, setEnrolling] = useState(null);
	const [err, setErr] = useState(null);
	const current = open ? items.find((x) => x.id === open) : null;
	async function status(req, s) {
		setErr(null);
		try {
			r.set(await call("orbitutor.teach.set_request", { request: req.id, status: s }));
			forget("orbitutor.teach.context");
		} catch (e) {
			setErr(e.message);
		}
	}
	const rowsWithWords = f.shown.map((x) => ({ ...x, status_word: STATUS_WORDS[x.status] || x.status }));
	return (
		<>
			<O.PageHeader title="Join requests" meta="From Ask to join on the course pages. Payment is in cash, so call them first." />
			{err ? <O.Alert tone="danger" title="Not changed">{err}</O.Alert> : null}
			<O.FilterBar
				search={{ value: f.q, onChange: f.setQ, placeholder: "Name, phone or course" }}
				filters={[{ id: "status", label: "Status", value: f.f.status || "", onChange: (v) => f.set("status", v), options: Object.entries(STATUS_WORDS).map(([value, label]) => ({ value, label })) }]}
				count={r.data ? plural(f.shown.length, "request") : null}
				onClear={f.clear}
			/>
			<O.DataTable
				label="Join requests"
				rows={rowsWithWords}
				loading={!r.data && !r.error}
				error={r.error ? { title: "The requests didn't load", onRetry: r.reload } : null}
				empty={{ icon: "inbox", title: "No requests", text: "When someone asks to join a course, it shows here." }}
				onRowClick={(row) => setOpen(row.id)}
				columns={[
					{ key: "name", label: "Who asked", primary: true, sortable: true },
					{ key: "for_whom", label: "For" },
					{ key: "course", label: "Course", sortable: true },
					{ key: "batch", label: "Batch", hideOnTablet: true },
					{ key: "asked", label: "Asked", sortable: true, sortValue: (x) => x.age, render: (x) => since(x.asked) },
					{ key: "status", label: "Status", render: (x) => <O.Badge tone={STATUS_TONE[x.status]}>{x.status_word}</O.Badge> },
				]}
				rowActions={(x) => [
					{ label: "Enrol in a batch", icon: "user-plus", onSelect: () => setEnrolling(x) },
					x.status !== "Contacted" ? { label: "Mark as called", icon: "phone", onSelect: () => status(x, "Contacted") } : null,
					{ divider: true },
					x.status !== "Closed" ? { label: "Not now", icon: "close", onSelect: () => status(x, "Closed") } : { label: "Back to New", icon: "undo", onSelect: () => status(x, "New") },
				].filter(Boolean)}
			/>
			<O.Dialog
				open={!!current}
				title={current ? current.name + (current.for_whom && current.for_whom !== "Themselves" ? ", for " + current.for_whom.toLowerCase() : "") : ""}
				onClose={() => setOpen(null)}
				actions={
					current
						? [
								<O.Button key="n" variant="secondary" onClick={() => (status(current, "Closed"), setOpen(null))}>Not now</O.Button>,
								<O.Button key="e" icon="user-plus" onClick={() => (setEnrolling(current), setOpen(null))}>Enrol in a batch</O.Button>,
						  ]
						: null
				}
			>
				{current ? (
					<div className="teach-stack">
						<Facts rows={[["Course", current.course], ["Batch", current.batch], ["For", current.for_whom], ["Phone", current.phone], ["Email", current.email], ["Asked", since(current.asked)]]} />
						{current.message ? <p className="teach-quote">{"“" + current.message + "”"}</p> : null}
						<div className="teach-row">
							{current.phone ? <O.Button variant="secondary" size="sm" icon="phone" href={`tel:${current.phone.replace(/[^\d+]/g, "")}`}>Call</O.Button> : null}
							{current.phone ? <O.Button variant="secondary" size="sm" icon="discussion" href={whatsappHref(current.phone, current.name)} target="_blank">WhatsApp</O.Button> : null}
							{current.email ? <O.Button variant="secondary" size="sm" icon="mail" href={`mailto:${current.email}`}>Email</O.Button> : null}
						</div>
						<O.Select label="Status" value={current.status} onChange={(e) => status(current, e.target.value)} options={Object.entries(STATUS_WORDS).map(([value, label]) => ({ value, label }))} />
					</div>
				) : null}
			</O.Dialog>
			<EnrolFromRequest request={enrolling} onClose={() => setEnrolling(null)} onDone={() => (setEnrolling(null), r.reload())} />
		</>
	);
}

// ---- evaluations ----

function RecordDialog({ item, onClose, onSaved }) {
	const [status, setStatus] = useState(null);
	const [summary, setSummary] = useState("");
	const [save, setSave] = useState(null);
	const [err, setErr] = useState(null);
	useEffect(() => {
		if (item) (setStatus(null), setSummary(""), setErr(null), setSave(null));
	}, [item]);
	const first = item ? String(item.name || "").split(" ")[0] : "";
	async function go() {
		if (!status) return setErr("Choose Passed or Not passed first.");
		setSave("saving");
		setErr(null);
		try {
			onSaved(await call("orbitutor.teach.record_evaluation", { request: item.id, status, summary }));
		} catch (e) {
			setErr(e.message);
			setSave(null);
		}
	}
	return (
		<O.Dialog open={!!item} title={item ? `How did ${first}'s evaluation go?` : ""} onClose={onClose}>
			{item ? (
				<O.MarkPanel
					status={status}
					onStatusChange={setStatus}
					comment={summary}
					onCommentChange={setSummary}
					commentLabel="Summary"
					commentHint={`${first} sees this. A pass gives them their certificate for ${item.course}.`}
					error={err}
					saveState={save}
					onSave={go}
					saveLabel="Save result"
				/>
			) : null}
		</O.Dialog>
	);
}

function Times({ data, setData }) {
	const [slots, setSlots] = useState(() => data.slots);
	const [away, setAway] = useState(() => data.away);
	const [state, setState] = useState("clean");
	const [errors, setErrors] = useState({});
	useLeaveGuard(state === "dirty");
	async function save() {
		const e = {};
		slots.forEach((s, i) => {
			if (!s.start || !s.end || s.end <= s.start) e[i] = "The end must be after the start.";
		});
		const awayError = away.from && away.to && away.to < away.from ? "The last day is before the first." : null;
		setErrors({ slots: e, away: awayError });
		if (Object.keys(e).length || awayError) return setState("error");
		setState("saving");
		try {
			const res = await call("orbitutor.teach.save_availability", { slots, away });
			setData(res);
			setState("saved");
		} catch (x) {
			setErrors({ server: x.message });
			setState("error");
		}
	}
	return (
		<>
			{errors.server ? <O.Alert tone="danger" title="Not saved">{errors.server}</O.Alert> : null}
			{!slots.length ? <O.Alert tone="info" title="No times yet">Students can only book you at the times you add here.</O.Alert> : null}
			<O.AvailabilityEditor
				slots={slots}
				onChange={(x) => (setSlots(x), setState("dirty"))}
				errors={errors.slots}
				away={away}
				onAwayChange={(x) => (setAway(x), setState("dirty"))}
				awayError={errors.away}
			/>
			<O.SaveBar state={state} onSave={save} onDiscard={() => (setSlots(data.slots), setAway(data.away), setErrors({}), setState("clean"))} />
		</>
	);
}

export function Evaluations() {
	const e = useCall("orbitutor.teach.evaluations");
	const [tab, setTab] = useState("booked");
	const [recording, setRecording] = useState(null);
	if (e.error) return <Problem error={e.error} onRetry={e.reload} />;
	if (!e.data) return <Loading lines={3} blocks={2} />;
	const d = e.data;
	const upcoming = d.items.filter((x) => x.state !== "Done").length;
	return (
		<>
			<O.PageHeader
				title="Evaluations"
				meta="Students who finish a course book a short call with an evaluator, then get their certificate."
				tabs={<O.Tabs label="Evaluations" value={tab} onChange={setTab} tabs={[{ id: "booked", label: "Booked with you", count: upcoming }, { id: "times", label: "Your times" }]} />}
			/>
			{tab === "booked" ? (
				<O.DataTable
					label="Evaluations"
					rows={d.items}
					empty={{ icon: "due", title: "Nothing booked", text: d.slots.length ? "Students book you at the times you've set." : "Add your times so students can book you." }}
					columns={[
						{ key: "name", label: "Student", primary: true, render: (r) => <Who name={r.name} /> },
						{ key: "course", label: "Course" },
						{ key: "when", label: "When", render: (r) => <span className="teach-when">{r.when}</span> },
						{
							key: "state",
							label: "",
							align: "end",
							render: (r) =>
								r.state === "To record" ? (
									<O.Button size="sm" onClick={() => setRecording(r)}>Record the result</O.Button>
								) : r.state === "Done" ? (
									<O.Badge tone="success" icon="done">Recorded</O.Badge>
								) : r.join ? (
									<O.Button size="sm" variant="secondary" icon="live" href={r.join} target="_blank">Join call</O.Button>
								) : (
									<O.Badge>Upcoming</O.Badge>
								),
						},
					]}
				/>
			) : (
				<Times key={JSON.stringify(d.slots) + JSON.stringify(d.away)} data={d} setData={e.set} />
			)}
			<RecordDialog item={recording} onClose={() => setRecording(null)} onSaved={(res) => (e.set(res), setRecording(null))} />
		</>
	);
}

// ---- certificates ----

function GiveDialog({ open, courses, onClose, onDone }) {
	const [who, setWho] = useState(null);
	const [course, setCourse] = useState("");
	const [date, setDate] = useState(TODAY());
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState({});
	useEffect(() => {
		if (open) (setWho(null), setCourse(""), setDate(TODAY()), setErrors({}));
	}, [open]);
	async function go() {
		const e = {};
		if (!who) e.who = "Pick the student.";
		if (!course) e.course = "Pick the course.";
		if (!date) e.date = "Pick the date.";
		setErrors(e);
		if (Object.keys(e).length) return;
		setBusy(true);
		try {
			onDone(await call("orbitutor.teach.give_certificate", { member: who.value, course, date }));
		} catch (x) {
			setErrors({ server: x.message });
		} finally {
			setBusy(false);
		}
	}
	const first = who ? String(who.label).split(" ")[0] : "They";
	return (
		<O.Dialog
			open={open}
			title="Give a certificate"
			onClose={onClose}
			actions={[
				<O.Button key="c" variant="secondary" onClick={onClose}>Cancel</O.Button>,
				<O.Button key="g" icon="certificate" loading={busy} onClick={go}>Give it</O.Button>,
			]}
		>
			<div className="teach-stack">
				{errors.server ? <O.Alert tone="danger" title="Not given">{errors.server}</O.Alert> : null}
				<O.Combobox label="Student" value={who} onChange={setWho} onSearch={(q) => call("orbitutor.teach.find_people", { query: q })} minChars={2} placeholder="Name or email" error={errors.who} />
				<O.Select label="Course" value={course} placeholder="Choose a course" onChange={(e) => setCourse(e.target.value)} options={courses} error={errors.course} hint={courses.length ? undefined : "Turn on Certificate in a course's details first."} />
				<O.TextField label="Date on it" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
				<O.Alert tone="info">{`${first} gets an email with a link to it, and it shows on their profile.`}</O.Alert>
			</div>
		</O.Dialog>
	);
}

function BatchDialog({ open, onClose, onDone }) {
	const b = useCall("orbitutor.teach.batches", null, { skip: !open });
	const [batch, setBatch] = useState("");
	const preview = useCall("orbitutor.teach.batch_certificates_preview", { batch }, { skip: !open || !batch });
	useEffect(() => {
		if (open) setBatch("");
	}, [open]);
	const p = batch && preview.data;
	const confirmable = !!(p && p.ready);
	return (
		<O.ConfirmDialog
			open={open}
			onClose={onClose}
			tone="neutral"
			icon="certificate"
			title={p ? `Give certificates to ${p.title}?` : "Give certificates to a batch"}
			confirmLabel={confirmable ? `Give ${plural(p.ready, "certificate")}` : "Give certificates"}
			onConfirm={async () => {
				if (!confirmable) return { error: batch ? "Nobody in this batch is ready for one yet." : "Pick a batch first." };
				try {
					const res = await call("orbitutor.teach.give_batch_certificates", { batch });
					onDone(res.list);
					return undefined;
				} catch (e) {
					return { error: e.message };
				}
			}}
		>
			<div className="teach-stack">
				<O.Select label="Batch" value={batch} placeholder={b.data ? "Choose a batch" : "Loading the batches"} onChange={(e) => setBatch(e.target.value)} options={((b.data && b.data.batches) || []).map((x) => ({ value: x.name, label: x.title }))} />
				{batch && !p ? <p className="teach-note">Counting who has finished…</p> : null}
				{p ? (
					<p>
						{p.ready
							? `${plural(p.ready, "student has", "students have")} finished every course in the batch and get one${p.not_yet ? `. The other ${p.not_yet} don't get one yet` : ""}. Each gets an email.`
							: "Nobody in this batch has finished every course and still needs a certificate."}
					</p>
				) : null}
			</div>
		</O.ConfirmDialog>
	);
}

export function Certificates() {
	const c = useCall("orbitutor.teach.certificates_list");
	const items = (c.data && c.data.items) || [];
	const f = useFilter(items, ["name", "course"]);
	const [giving, setGiving] = useState(false);
	const [bulk, setBulk] = useState(false);
	const [revoking, setRevoking] = useState(null);
	const [note, setNote] = useState(null);
	const thisMonth = items.filter((x) => String(x.date_sort).slice(0, 7) === TODAY().slice(0, 7)).length;
	function copy(r) {
		const url = window.location.origin + r.href;
		(navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
			() => setNote({ tone: "success", text: "Link copied." }),
			() => setNote({ tone: "info", text: url })
		);
	}
	return (
		<>
			<O.PageHeader
				title="Certificates"
				meta={c.data ? `${thisMonth} given this month. Each has a page anyone can check.` : "Each has a page anyone can check."}
				actions={
					<>
						{c.data && c.data.can_batch ? <O.Button variant="secondary" icon="users" onClick={() => setBulk(true)}>Give to a batch</O.Button> : null}
						<O.Button icon="certificate" onClick={() => setGiving(true)}>Give a certificate</O.Button>
					</>
				}
			/>
			{note ? <O.Alert tone={note.tone}>{note.text}</O.Alert> : null}
			<O.FilterBar
				search={{ value: f.q, onChange: f.setQ, placeholder: "Student or course" }}
				filters={[{ id: "course", label: "Course", value: f.f.course || "", onChange: (v) => f.set("course", v), options: options(items, "course") }]}
				count={c.data ? plural(f.shown.length, "certificate") : null}
				onClear={f.clear}
			/>
			<O.DataTable
				label="Certificates"
				rows={f.shown}
				loading={!c.data && !c.error}
				error={c.error ? { title: "The certificates didn't load", onRetry: c.reload } : null}
				empty={{ icon: "certificate", title: "No certificates yet" }}
				rowHref={(r) => r.href}
				defaultSort={{ key: "date", dir: "desc" }}
				columns={[
					{ key: "name", label: "Student", primary: true, sortable: true, render: (r) => <Who name={r.name} /> },
					{ key: "course", label: "Course", sortable: true },
					{ key: "batch", label: "Batch", hideOnTablet: true },
					{ key: "date", label: "Given", sortable: true, sortValue: (r) => r.date_sort },
				]}
				rowActions={(r) => [
					{ label: "Open the certificate", icon: "external", href: r.href },
					{ label: "Copy its link", icon: "copy", onSelect: () => copy(r) },
					{ divider: true },
					{ label: "Take it back", icon: "trash", danger: true, onSelect: () => setRevoking(r) },
				]}
			/>
			<GiveDialog open={giving} courses={(c.data && c.data.courses) || []} onClose={() => setGiving(false)} onDone={(res) => (c.set(res), setGiving(false), setNote({ tone: "success", text: "Certificate given." }))} />
			<BatchDialog open={bulk} onClose={() => setBulk(false)} onDone={(res) => (c.set(res), setBulk(false), setNote({ tone: "success", text: "Certificates given." }))} />
			<O.ConfirmDialog
				open={!!revoking}
				onClose={() => setRevoking(null)}
				title={revoking ? `Take back ${revoking.name}'s certificate?` : ""}
				confirmLabel="Take it back"
				onConfirm={async () => {
					try {
						c.set(await call("orbitutor.teach.revoke_certificate", { certificate: revoking.id }));
						setRevoking(null);
						return undefined;
					} catch (e) {
						return { error: e.message };
					}
				}}
			>
				<p>{revoking ? `Its page stops working, and it comes off their profile. ${revoking.course}.` : null}</p>
			</O.ConfirmDialog>
		</>
	);
}

// ---- people ----

const ROLE_CHOICES = [
	["LMS Student", "Student", "Takes courses and joins batches."],
	["Course Creator", "Instructor", "Writes courses, runs batches, marks work."],
	["Batch Evaluator", "Evaluator", "Runs final evaluations and gives certificates."],
	["Moderator", "Moderator", "Everything, including people and settings."],
];
const ROLE_FILTER = [
	{ value: "LMS Student", label: "Students" },
	{ value: "Course Creator", label: "Instructors" },
	{ value: "Batch Evaluator", label: "Evaluators" },
	{ value: "Moderator", label: "Moderators" },
];

function RoleChecks({ value, onChange, staffOnly, error }) {
	const list = staffOnly ? ROLE_CHOICES.slice(1) : ROLE_CHOICES;
	return (
		<fieldset className="teach-roles">
			<legend className="ot-field__label">What they can do</legend>
			{list.map(([role, label, hint]) => (
				<O.Checkbox key={role} label={label} hint={hint} checked={value.includes(role)} onChange={(e) => onChange(e.target.checked ? [...value, role] : value.filter((r) => r !== role))} />
			))}
			{error ? <p className="ot-field__error" role="alert">{error}</p> : null}
		</fieldset>
	);
}

function AddStaff({ open, onClose, onDone }) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [rs, setRs] = useState(["Course Creator"]);
	const [errors, setErrors] = useState({});
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		if (open) (setName(""), setEmail(""), setRs(["Course Creator"]), setErrors({}));
	}, [open]);
	async function go() {
		const e = {};
		if (!name.trim()) e.name = "Type their name.";
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = "Type their email, like name@orbit-core.com.";
		if (!rs.length) e.roles = "Pick what they can do.";
		setErrors(e);
		if (Object.keys(e).length) return;
		setBusy(true);
		try {
			onDone(await call("orbitutor.teach.add_staff", { full_name: name.trim(), email: email.trim(), roles_list: rs }));
		} catch (x) {
			setErrors({ server: x.message });
		} finally {
			setBusy(false);
		}
	}
	return (
		<O.Dialog
			open={open}
			title="Add a member of staff"
			onClose={onClose}
			actions={[
				<O.Button key="c" variant="secondary" onClick={onClose}>Cancel</O.Button>,
				<O.Button key="a" icon="user-plus" loading={busy} onClick={go}>Add and send welcome</O.Button>,
			]}
		>
			<div className="teach-stack">
				{errors.server ? <O.Alert tone="danger" title="Not added">{errors.server}</O.Alert> : null}
				<O.TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" maxLength={140} />
				<O.TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoCapitalize="none" hint="If they already have an account, they get the new roles on it." />
				<RoleChecks value={rs} onChange={setRs} staffOnly error={errors.roles} />
			</div>
		</O.Dialog>
	);
}

function RolesDialog({ person, onClose, onDone }) {
	const [rs, setRs] = useState([]);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState(null);
	useEffect(() => {
		if (person) (setRs(person.roles.filter((r) => r !== "System Manager")), setErr(null));
	}, [person]);
	async function go() {
		setBusy(true);
		setErr(null);
		try {
			onDone(await call("orbitutor.teach.set_roles", { user: person.id, roles_list: rs }));
		} catch (x) {
			setErr(x.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<O.Dialog
			open={!!person}
			title={person ? `What ${person.name} can do` : ""}
			onClose={onClose}
			actions={[
				<O.Button key="c" variant="secondary" onClick={onClose}>Cancel</O.Button>,
				<O.Button key="s" icon="check" loading={busy} onClick={go}>Save</O.Button>,
			]}
		>
			<div className="teach-stack">
				{err ? <O.Alert tone="danger" title="Not changed">{err}</O.Alert> : null}
				{person && person.roles.includes("System Manager") ? <O.Alert tone="info">They also manage the site in the desk. That's changed there.</O.Alert> : null}
				<RoleChecks value={rs} onChange={setRs} />
			</div>
		</O.Dialog>
	);
}

export function People() {
	const p = useCall("orbitutor.teach.people");
	const items = (p.data && p.data.items) || [];
	const [q, setQ] = useState("");
	const [role, setRole] = useState("");
	const [adding, setAdding] = useState(false);
	const [roles, setRoles] = useState(null);
	const [confirm, setConfirm] = useState(null);
	const [note, setNote] = useState(null);
	const shown = items.filter((x) => (!q || (x.name + " " + x.email).toLowerCase().includes(q.toLowerCase())) && (!role || x.roles.includes(role) || (role === "Moderator" && x.roles.includes("System Manager"))));
	return (
		<>
			<O.PageHeader
				title="People"
				meta={p.data ? `${plural(p.data.students, "student")} and ${p.data.staff} staff.` : "Everyone with an account, and what they can do."}
				actions={<O.Button icon="user-plus" onClick={() => setAdding(true)}>Add a member of staff</O.Button>}
			/>
			{note ? <O.Alert tone="success">{note}</O.Alert> : null}
			<O.FilterBar
				search={{ value: q, onChange: setQ, placeholder: "Name or email" }}
				filters={[{ id: "role", label: "Role", value: role, onChange: setRole, options: ROLE_FILTER }]}
				count={p.data ? plural(shown.length, "person", "people") : null}
				onClear={() => (setQ(""), setRole(""))}
			/>
			<O.DataTable
				label="People"
				rows={shown}
				loading={!p.data && !p.error}
				error={p.error ? { title: "People didn't load", onRetry: p.reload } : null}
				empty={{ icon: "users", title: "Nobody matches" }}
				columns={[
					{ key: "name", label: "Name", primary: true, sortable: true, render: (x) => <Who name={x.name} src={x.avatar} /> },
					{ key: "email", label: "Email", hideOnTablet: true },
					{ key: "roles", label: "Can", phoneWide: true, render: (x) => <O.RoleList roles={x.roles} none="No roles" /> },
					{ key: "since", label: "Joined", sortable: true, sortValue: (x) => x.since_sort, hideOnTablet: true },
				]}
				rowActions={(x) => [
					{ label: "Change what they can do", icon: "key", onSelect: () => setRoles(x) },
					{ label: "Send a password reset", icon: "mail", onSelect: () => setConfirm({ action: "reset", person: x }) },
					{ divider: true },
					{ label: "Turn off their account", icon: "lock", danger: true, onSelect: () => setConfirm({ action: "disable", person: x }) },
				]}
			/>
			<AddStaff open={adding} onClose={() => setAdding(false)} onDone={(res) => (p.set(res), setAdding(false), setNote("Added. They'll get an email to choose a password."))} />
			<RolesDialog person={roles} onClose={() => setRoles(null)} onDone={(res) => (p.set(res), setRoles(null), setNote("Saved."))} />
			<O.ConfirmDialog
				open={!!confirm}
				onClose={() => setConfirm(null)}
				tone={confirm && confirm.action === "reset" ? "neutral" : "danger"}
				icon={confirm && confirm.action === "reset" ? "mail" : "lock"}
				title={confirm ? (confirm.action === "reset" ? `Send ${confirm.person.name} a password reset?` : `Turn off ${confirm.person.name}'s account?`) : ""}
				confirmLabel={confirm && confirm.action === "reset" ? "Send it" : "Turn it off"}
				onConfirm={async () => {
					try {
						p.set(await call("orbitutor.teach.person_action", { user: confirm.person.id, action: confirm.action }));
						setNote(confirm.action === "reset" ? "Reset email sent." : "Account turned off.");
						setConfirm(null);
						return undefined;
					} catch (e) {
						return { error: e.message };
					}
				}}
			>
				<p>{confirm && confirm.action === "reset" ? "They get an email with a link to choose a new password." : "They can't sign in any more. Their work and certificates stay. Turn it back on in the desk."}</p>
			</O.ConfirmDialog>
		</>
	);
}

// ---- statistics ----

export function Statistics() {
	const s = useCall("orbitutor.teach.statistics");
	if (s.error) return <Problem error={s.error} onRetry={s.reload} />;
	if (!s.data) return <Loading lines={3} blocks={3} />;
	const d = s.data;
	const diff = d.enrolments_diff;
	return (
		<>
			<O.PageHeader title="Statistics" meta="This month, across OrbiTutor." />
			<div className="teach-stack">
				<O.StatGrid label="This month">
					<O.StatTile label="Students" icon="users" value={d.students} meta={`${d.new_students} new this month`} />
					<O.StatTile label="Course enrolments" icon="courses" value={d.enrolments} trend={diff ? { direction: diff > 0 ? "up" : "down", good: diff > 0, text: `${Math.abs(diff)} ${diff > 0 ? "more" : "fewer"} than last month` } : { direction: "flat", text: "Same as last month" }} />
					<O.StatTile label="Lessons finished" icon="done" value={d.lessons} />
					<O.StatTile label="Certificates" icon="certificate" value={d.certificates} href="/teach/certificates" />
				</O.StatGrid>
				<div className="teach-two">
					<div className="teach-panel">
						<O.BarChart title="New students" note="The last 12 months" data={d.signups} format={(v) => plural(v, "student")} />
					</div>
					<div className="teach-panel">
						{d.courses.length ? <O.BarChart orientation="horizontal" title="Most taken courses" note="Students, all time" data={d.courses} format={(v) => plural(v, "student")} /> : <p className="teach-block__empty">Nobody has joined a course yet.</p>}
					</div>
				</div>
			</div>
		</>
	);
}

// ---- settings ----

export function TeachSettings() {
	const s = useCall("orbitutor.teach.settings_page");
	const [v, setV] = useState(null);
	const [section, setSection] = useState(undefined);
	const [state, setState] = useState("clean");
	const [errors, setErrors] = useState({});
	useLeaveGuard(state === "dirty");
	useEffect(() => {
		if (s.data && v === null) setV({ ...s.data });
	}, [s.data]);
	if (s.error) return <Problem error={s.error} onRetry={s.reload} />;
	if (!s.data || !v) return <Loading lines={4} blocks={1} />;
	const set = (k, x) => (setV((o) => ({ ...o, [k]: x })), setState("dirty"));
	async function save() {
		const e = {};
		if (!String(v.app_name || "").trim()) e.app_name = "Give the app a name.";
		setErrors(e);
		if (Object.keys(e).length) return (setSection("brand"), setState("error"));
		setState("saving");
		try {
			const res = await call("orbitutor.teach.save_settings", { values: { guest_access: v.guest_access, signup: v.signup, certified_members: v.certified_members, app_name: v.app_name.trim(), categories: v.categories } });
			s.set(res);
			setV({ ...res });
			setState("saved");
		} catch (x) {
			setErrors({ server: x.message });
			setState("error");
		}
	}
	const sections = [
		{
			id: "access",
			label: "Signing up and visitors",
			icon: "key",
			summary: "Who can make an account and look around",
			content: (
				<div className="teach-stack">
					<O.Switch label="Anyone can make an account" hint="From Create an account on the sign-in page. Staff still put students in batches." checked={!!v.signup} onChange={(x) => set("signup", x)} />
					<O.Switch label="Visitors can look around" hint="The catalogue, course pages and free previews, without signing in." checked={!!v.guest_access} onChange={(x) => set("guest_access", x)} />
					<Facts rows={[["Join requests are emailed to", v.join_email], ["WhatsApp link", v.whatsapp]]} />
					<p className="teach-note">These two are set in the site's configuration. Ask whoever runs the server to change them.</p>
				</div>
			),
		},
		{
			id: "certs",
			label: "Certificates",
			icon: "certificate",
			summary: "Whether certified students are listed",
			content: <O.Switch label="Show everyone who's certified" hint="A public page listing certified students." checked={!!v.certified_members} onChange={(x) => set("certified_members", x)} />,
		},
		{
			id: "cats",
			label: "Course categories",
			icon: "courses",
			summary: "For grouping courses",
			content: (
				<O.ListEditor
					label="Categories"
					items={v.categories.length ? v.categories : [""]}
					onChange={(items) => set("categories", items)}
					placeholder="Robotics"
					addLabel="Add a category"
					hint="New ones are added. To remove one, take it off every course in the desk first."
				/>
			),
		},
		{
			id: "brand",
			label: "Name",
			icon: "image",
			summary: "What the app is called in tabs and emails",
			content: <O.TextField label="Name" value={v.app_name || ""} onChange={(e) => set("app_name", e.target.value)} error={errors.app_name} maxLength={140} />,
		},
	];
	return (
		<>
			{errors.server ? <O.Alert tone="danger" title="Not saved">{errors.server}</O.Alert> : null}
			<O.SettingsLayout title="Settings" sections={sections} active={section} onSelect={setSection} />
			<O.SaveBar state={state} onSave={save} onDiscard={() => (setV({ ...s.data }), setErrors({}), setState("clean"))} message={state === "error" && errors.app_name ? "Not saved. The name is missing." : undefined} />
		</>
	);
}
