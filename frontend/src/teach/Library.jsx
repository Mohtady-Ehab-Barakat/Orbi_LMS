// Quizzes, assignments and coding exercises: the library, and a page for each.
import { call } from "../lib/api.js";
import { forget, useCall } from "../lib/load.js";
import { navigate, useQuery } from "../lib/router.js";
import { Loading, Problem } from "../pages/Problem.jsx";
import { NewDialog, since, useLeaveGuard } from "./Courses.jsx";
import { Who, useFilter } from "./Marking.jsx";

const O = window.OrbiTutor;
const { useEffect, useState } = React;

const KINDS = [
	{ id: "quiz", label: "Quizzes", one: "quiz", icon: "quiz", href: "quiz" },
	{ id: "assignment", label: "Assignments", one: "assignment", icon: "assignment", href: "assignment" },
	{ id: "program", label: "Coding exercises", one: "coding exercise", icon: "code", href: "exercise" },
];

export function Library() {
	const query = useQuery();
	const kind = KINDS.some((k) => k.id === query.get("kind")) ? query.get("kind") : "quiz";
	const K = KINDS.find((k) => k.id === kind);
	const l = useCall("orbitutor.teach.library", { kind });
	const f = useFilter(l.data && l.data.items, ["title"]);
	const [making, setMaking] = useState(false);
	const columns = [
		{ key: "title", label: K.label.replace(/s$/, ""), primary: true, sortable: true, render: (r) => <span className="teach-what"><O.Icon name={K.icon} size={20} />{r.title}</span> },
		kind === "quiz" ? { key: "questions", label: "Questions", sortable: true, align: "end" } : null,
		{ key: "taken", label: kind === "quiz" ? "Attempts" : "Handed in", sortable: true, align: "end" },
		{ key: "changed", label: "Changed", sortable: true, sortValue: (r) => r.changed_sort, hideOnTablet: true, render: (r) => since(r.changed) },
	].filter(Boolean);
	return (
		<>
			<O.PageHeader
				title="Quizzes and assignments"
				meta="Make one here, then add it to a lesson. The same quiz can sit in several lessons."
				actions={<O.Button icon="plus" onClick={() => setMaking(true)}>{`New ${K.one}`}</O.Button>}
				tabs={<O.Tabs label="Kind" value={kind} onChange={(id) => navigate(`/teach/library?kind=${id}`, { replace: true, scroll: false })} tabs={KINDS.map((k) => ({ id: k.id, label: k.label }))} />}
			/>
			<O.FilterBar search={{ value: f.q, onChange: f.setQ, placeholder: `Search ${K.label.toLowerCase()}` }} count={l.data ? `${f.shown.length} ${K.label.toLowerCase()}` : null} onClear={f.clear} />
			<O.DataTable
				label={K.label}
				rows={f.shown}
				rowKey="name"
				loading={!l.data && !l.error}
				error={l.error ? { title: "The list didn't load", onRetry: l.reload } : null}
				empty={{ icon: K.icon, title: `No ${K.label.toLowerCase()} yet`, text: `Make one with New ${K.one}.` }}
				rowHref={(r) => r.href}
				columns={columns}
			/>
			<NewDialog
				open={making}
				title={`New ${K.one}`}
				label="Title"
				placeholder={kind === "quiz" ? "Refraction check" : kind === "assignment" ? "Pyramid photos" : "Count the stars"}
				onClose={() => setMaking(false)}
				createLabel={`Make the ${K.one}`}
				onCreate={async (title) => {
					const res = await call("orbitutor.teach.create_activity", { kind, title });
					forget("orbitutor.teach.library");
					navigate(res.href);
				}}
			/>
		</>
	);
}

function usedMeta(used, count, word) {
	const parts = [];
	if (used && used.length) parts.push(`Used in ${used.length === 1 ? "lesson" : "lessons"} ${used.slice(0, 3).map((t) => "“" + t + "”").join(", ")}${used.length > 3 ? " and more" : ""}`);
	else parts.push("Not in a lesson yet");
	parts.push(count === 1 ? `1 student has ${word}` : `${count} students have ${word}`);
	return parts.join(" · ");
}

function numberOr(v) {
	return v === "" || v == null ? "" : String(v);
}

// ---- a quiz ----

const EMPTY_QUESTION = { type: "single", question: "", marks: 1, options: [{ text: "", correct: true }, { text: "", correct: false }], answers: [""] };

function checkQuestion(v) {
	const e = {};
	const plain = String(v.question || "").replace(/<[^>]*>/g, "").trim();
	if (!plain) e.question = "Write the question.";
	if (v.marks === "" || Number(v.marks) < 1) e.marks = "At least 1 mark.";
	if (v.type === "single" || v.type === "multiple") {
		const opts = (v.options || []).filter((o) => String(o.text || "").trim());
		if (opts.length < 2) e.options = "Give at least two answers.";
		else if (!opts.some((o) => o.correct)) e.options = "Mark the right answer.";
	}
	if (v.type === "typed" && !(v.answers || []).some((a) => String(a || "").trim())) e.answers = "Give at least one answer you accept.";
	return Object.keys(e).length ? e : null;
}

function QuestionDialog({ quiz, editing, onClose, onSaved }) {
	const [v, setV] = useState(EMPTY_QUESTION);
	const [errors, setErrors] = useState(null);
	const [busy, setBusy] = useState(false);
	const [server, setServer] = useState(null);
	useEffect(() => {
		if (editing) {
			setV(editing.value ? { ...editing.value, marks: editing.marks } : EMPTY_QUESTION);
			setErrors(null);
			setServer(null);
		}
	}, [editing]);
	async function save() {
		const e = checkQuestion(v);
		setErrors(e);
		if (e) return;
		setBusy(true);
		setServer(null);
		try {
			const res = await call("orbitutor.teach.save_question", { quiz, value: v, question: editing.id || undefined });
			onSaved(res);
		} catch (x) {
			setServer(x.message);
		} finally {
			setBusy(false);
		}
	}
	return (
		<O.Dialog
			open={!!editing}
			size="lg"
			title={editing && editing.id ? "Change the question" : "New question"}
			onClose={onClose}
			actions={[
				<O.Button key="c" variant="secondary" onClick={onClose}>Cancel</O.Button>,
				<O.Button key="s" icon="check" loading={busy} onClick={save}>Save question</O.Button>,
			]}
		>
			{editing && editing.shared ? <O.Alert tone="warning" title="This question is in another quiz too">{`Changing it here changes it in “${editing.shared}” as well.`}</O.Alert> : null}
			{server ? <O.Alert tone="danger" title="Not saved">{server}</O.Alert> : null}
			<O.QuestionEditor value={v} onChange={(x) => (setV(x), errors && setErrors(checkQuestion(x)))} errors={errors} />
		</O.Dialog>
	);
}

function BankDialog({ quiz, open, onClose, onAdded }) {
	const [q, setQ] = useState("");
	const [shown, setShown] = useState("");
	const [pick, setPick] = useState([]);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState(null);
	const bank = useCall("orbitutor.teach.question_bank", { quiz, query: shown }, { skip: !open });
	useEffect(() => {
		const t = setTimeout(() => setShown(q.trim()), 300);
		return () => clearTimeout(t);
	}, [q]);
	useEffect(() => {
		if (open) (setPick([]), setErr(null));
	}, [open]);
	async function add() {
		setBusy(true);
		setErr(null);
		try {
			const res = await call("orbitutor.teach.quiz_questions_change", { quiz, action: "add", questions: pick });
			onAdded(res);
		} catch (e) {
			setErr(e.message);
		} finally {
			setBusy(false);
		}
	}
	const n = pick.length;
	return (
		<O.Dialog
			open={open}
			size="lg"
			title="Add from the question bank"
			onClose={onClose}
			actions={[
				<O.Button key="c" variant="secondary" onClick={onClose}>Cancel</O.Button>,
				<O.Button key="a" icon="plus" disabled={!n} loading={busy} onClick={add}>{n ? `Add ${n} ${n === 1 ? "question" : "questions"}` : "Add questions"}</O.Button>,
			]}
		>
			{err ? <O.Alert tone="danger" title="Not added">{err}</O.Alert> : null}
			<O.FilterBar search={{ value: q, onChange: setQ, placeholder: "Search questions" }} count={bank.data ? `${bank.data.items.length} questions` : null} />
			<O.DataTable
				label="Question bank"
				rows={(bank.data && bank.data.items) || []}
				loading={!bank.data && !bank.error}
				error={bank.error ? { title: "The questions didn't load", onRetry: bank.reload } : null}
				empty={{ icon: "quiz", title: shown ? "No questions match" : "No other questions yet" }}
				selectable
				selected={pick}
				onSelectionChange={(ids) => setPick(ids)}
				density="compact"
				columns={[
					{ key: "text", label: "Question", primary: true },
					{ key: "type", label: "Kind" },
					{ key: "used", label: "Used in", hideOnTablet: true },
				]}
			/>
		</O.Dialog>
	);
}

function QuizSettings({ data, setData }) {
	const courses = useCall("orbitutor.teach.courses");
	const [v, setV] = useState(() => ({ ...data.values }));
	const [state, setState] = useState("clean");
	const [errors, setErrors] = useState({});
	useLeaveGuard(state === "dirty");
	const set = (k, x) => (setV((o) => ({ ...o, [k]: x })), setState("dirty"));
	async function save() {
		const e = {};
		if (!String(v.title || "").trim()) e.title = "Give the quiz a title.";
		const pass = Number(v.passing_percentage);
		if (!(pass >= 0 && pass <= 100) || v.passing_percentage === "") e.passing_percentage = "A number from 0 to 100.";
		if (v.duration && !/^\d+$/.test(String(v.duration).trim())) e.duration = "Minutes, as a number.";
		setErrors(e);
		if (Object.keys(e).length) return setState("error");
		setState("saving");
		try {
			const res = await call("orbitutor.teach.save_quiz", { quiz: data.name, values: v });
			setData(res);
			forget("orbitutor.teach.library");
			setState("saved");
		} catch (x) {
			setErrors({ server: x.message });
			setState("error");
		}
	}
	const courseOptions = ((courses.data && courses.data.courses) || []).map((c) => ({ value: c.name, label: c.title }));
	const n = Object.keys(errors).filter((k) => k !== "server").length;
	return (
		<>
			{errors.server ? <O.Alert tone="danger" title="Not saved">{errors.server}</O.Alert> : null}
			<O.FormSection title="The quiz" columns={2}>
				<O.TextField label="Title" className="ot-wide" value={v.title || ""} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={140} />
				<O.Select label="Course" optional className="ot-wide" value={v.course || ""} placeholder="Not tied to a course" onChange={(e) => set("course", e.target.value)} options={courseOptions} hint="Its results show on that course's dashboard." />
			</O.FormSection>
			<O.FormSection title="Taking it" description="How many tries, how long, and what students see afterwards." columns={2}>
				<O.TextField label="Pass mark" type="number" value={numberOr(v.passing_percentage)} onChange={(e) => set("passing_percentage", e.target.value)} hint="Percent of the marks." error={errors.passing_percentage} />
				<O.TextField label="Tries allowed" type="number" value={numberOr(v.max_attempts)} onChange={(e) => set("max_attempts", e.target.value)} hint="0 for as many as they like." />
				<O.TextField label="Time limit" optional value={v.duration || ""} onChange={(e) => set("duration", e.target.value)} hint="Minutes. Leave it empty for no limit." inputMode="numeric" error={errors.duration} />
				<O.TextField label="Questions each student gets" optional type="number" value={v.limit_questions_to ? String(v.limit_questions_to) : ""} onChange={(e) => set("limit_questions_to", e.target.value)} hint="Picked at random from the questions." />
				<O.Switch label="Shuffle the questions" checked={!!v.shuffle_questions} onChange={(x) => set("shuffle_questions", x ? 1 : 0)} />
				<O.Switch label="Show the right answers afterwards" hint="With your explanations." checked={!!v.show_answers} onChange={(x) => set("show_answers", x ? 1 : 0)} />
				<O.Switch label="Show their earlier tries" checked={!!v.show_submission_history} onChange={(x) => set("show_submission_history", x ? 1 : 0)} />
				<O.Switch label="Take marks off for wrong answers" checked={!!v.enable_negative_marking} onChange={(x) => set("enable_negative_marking", x ? 1 : 0)} />
				{v.enable_negative_marking ? <O.TextField label="Marks taken off" type="number" value={numberOr(v.marks_to_cut)} onChange={(e) => set("marks_to_cut", e.target.value)} hint="For each wrong answer." /> : null}
			</O.FormSection>
			<O.SaveBar state={state} onSave={save} onDiscard={() => (setV({ ...data.values }), setErrors({}), setState("clean"))} message={state === "error" && n ? `Not saved. ${n === 1 ? "1 field needs" : n + " fields need"} fixing.` : undefined} />
		</>
	);
}

export function QuizEdit({ quiz }) {
	const query = useQuery();
	const tab = ["questions", "settings", "results"].includes(query.get("tab")) ? query.get("tab") : "questions";
	const d = useCall("orbitutor.teach.quiz_detail", { quiz });
	const [editing, setEditing] = useState(null);
	const [bank, setBank] = useState(false);
	const [removing, setRemoving] = useState(null);
	const [problem, setProblem] = useState(null);
	if (d.error) return <Problem error={d.error} onRetry={d.reload} />;
	if (!d.data) return <Loading lines={4} blocks={2} />;
	const x = d.data;
	const done = (res) => (d.set(res), forget("orbitutor.teach.library"));
	async function move(id, idx) {
		setProblem(null);
		const qs = x.questions.slice();
		const i = qs.findIndex((q) => q.id === id);
		const [it] = qs.splice(i, 1);
		qs.splice(idx, 0, it);
		d.set({ ...x, questions: qs });
		try {
			done(await call("orbitutor.teach.quiz_questions_change", { quiz: x.name, action: "move", question: id, idx }));
		} catch (e) {
			setProblem(e.message);
			d.reload();
		}
	}
	const limit = Number(x.values.limit_questions_to) || undefined;
	return (
		<>
			<O.PageHeader
				back={{ href: "/teach/library?kind=quiz", label: "Quizzes and assignments" }}
				eyebrow="Quiz"
				title={x.values.title}
				meta={usedMeta(x.used_in, x.taken, "taken it")}
				tabs={
					<O.Tabs
						label="Quiz"
						value={tab}
						onChange={(id) => navigate(`/teach/quiz/${encodeURIComponent(x.name)}${id === "questions" ? "" : "?tab=" + id}`, { replace: true, scroll: false })}
						tabs={[{ id: "questions", label: "Questions", count: x.questions.length }, { id: "settings", label: "Settings" }, { id: "results", label: "Results", count: x.taken }]}
					/>
				}
			/>
			{tab === "questions" ? (
				<>
					{problem ? <O.Alert tone="danger" title="That change didn't save">{problem}</O.Alert> : null}
					<O.QuestionList
						questions={x.questions}
						limit={limit}
						onAdd={() => setEditing({})}
						onAddFromBank={() => setBank(true)}
						onEdit={(q) => setEditing(x.questions.find((y) => y.id === q.id) || q)}
						onMove={move}
						onRemove={(q) => setRemoving(q)}
					/>
					<QuestionDialog quiz={x.name} editing={editing} onClose={() => setEditing(null)} onSaved={(res) => (done(res), setEditing(null))} />
					<BankDialog quiz={x.name} open={bank} onClose={() => setBank(false)} onAdded={(res) => (done(res), setBank(false))} />
					<O.ConfirmDialog
						open={!!removing}
						onClose={() => setRemoving(null)}
						title="Take this question out of the quiz?"
						confirmLabel="Take it out"
						icon="minus"
						onConfirm={async () => {
							try {
								done(await call("orbitutor.teach.quiz_questions_change", { quiz: x.name, action: "remove", question: removing.id }));
								setRemoving(null);
								return undefined;
							} catch (e) {
								return { error: e.message };
							}
						}}
					>
						<p>It stays in the question bank, so you can add it back. Attempts already made keep their marks.</p>
					</O.ConfirmDialog>
				</>
			) : null}
			{tab === "settings" ? <QuizSettings key={x.name} data={x} setData={done} /> : null}
			{tab === "results" ? (
				<O.DataTable
					label="Results"
					rows={x.results}
					empty={{ icon: "quiz", title: "Nobody has taken it yet" }}
					rowHref={(r) => r.href}
					columns={[
						{ key: "name", label: "Student", primary: true, sortable: true, render: (r) => <Who name={r.name} /> },
						{ key: "score", label: "Score", sortable: true, sortValue: (r) => r.percentage },
						{ key: "passed", label: "Result", render: (r) => <O.Badge tone={r.passed ? "success" : "danger"}>{r.passed ? "Passed" : "Not passed"}</O.Badge> },
						{ key: "when", label: "Taken", hideOnTablet: true, render: (r) => since(r.when) },
					]}
				/>
			) : null}
		</>
	);
}

// ---- an assignment ----

const HAND_IN = [
	["Image", "A picture", "A photo of what they made. JPG or PNG."],
	["PDF", "A PDF", "A worksheet or a write-up."],
	["Document", "A document", "Word, a spreadsheet or a slide file."],
	["URL", "A link", "A Tinkercad design, a video, a shared folder."],
	["Text", "Written text", "Typed straight into the page."],
];

export function AssignmentEdit({ assignment }) {
	const d = useCall("orbitutor.teach.assignment_detail", { assignment });
	const courses = useCall("orbitutor.teach.courses");
	const [v, setV] = useState(null);
	const [state, setState] = useState("clean");
	const [errors, setErrors] = useState({});
	useLeaveGuard(state === "dirty");
	useEffect(() => {
		if (d.data && v === null) setV({ ...d.data.values });
	}, [d.data]);
	if (d.error) return <Problem error={d.error} onRetry={d.reload} />;
	if (!d.data || !v) return <Loading lines={4} blocks={2} />;
	const x = d.data;
	const set = (k, val) => (setV((o) => ({ ...o, [k]: val })), setState("dirty"));
	async function save() {
		const e = {};
		if (!String(v.title || "").trim()) e.title = "Give the assignment a title.";
		if (!String(v.question || "").replace(/<[^>]*>/g, "").trim()) e.question = "Say what to do.";
		setErrors(e);
		if (Object.keys(e).length) return setState("error");
		setState("saving");
		try {
			const res = await call("orbitutor.teach.save_assignment", { assignment: x.name, values: v });
			d.set(res);
			setV({ ...res.values });
			forget("orbitutor.teach.library");
			setState("saved");
		} catch (err) {
			setErrors({ server: err.message });
			setState("error");
		}
	}
	const n = Object.keys(errors).filter((k) => k !== "server").length;
	return (
		<>
			<O.PageHeader
				back={{ href: "/teach/library?kind=assignment", label: "Quizzes and assignments" }}
				eyebrow="Assignment"
				title={x.values.title}
				meta={usedMeta(x.used_in, x.submissions, "handed it in")}
				actions={x.submissions ? <O.Button variant="secondary" icon="assignment" href="/teach/marking">Marking</O.Button> : null}
			/>
			{errors.server ? <O.Alert tone="danger" title="Not saved">{errors.server}</O.Alert> : null}
			<O.FormSection title="What to do" description="Students see this above the place they hand it in.">
				<O.TextField label="Title" value={v.title || ""} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={140} />
				<O.RichTextField label="Instructions" value={v.question || ""} onChange={(h) => set("question", h)} rows={5} error={errors.question} />
				<O.Select label="Course" optional value={v.course || ""} placeholder="Not tied to a course" onChange={(e) => set("course", e.target.value)} options={((courses.data && courses.data.courses) || []).map((c) => ({ value: c.name, label: c.title }))} />
			</O.FormSection>
			<O.FormSection title="What they hand in" description="One kind per assignment.">
				<div className="teach-kinds" role="radiogroup" aria-label="What they hand in">
					{HAND_IN.map((k) => (
						<O.Radio key={k[0]} name="hand-in" label={k[1]} hint={k[2]} checked={v.type === k[0]} onChange={() => set("type", k[0])} />
					))}
				</div>
			</O.FormSection>
			<O.FormSection title="Marking" description="Marked work emails the student, and shows on their Home.">
				<O.Switch label="An instructor marks it" hint="Passed or not, with your feedback. Off: handing it in is enough." checked={!!v.grade_assignment} onChange={(on) => set("grade_assignment", on ? 1 : 0)} />
				<O.RichTextField label="Model answer" optional value={v.answer || ""} onChange={(h) => set("answer", h)} rows={3} hint="Shown beside the work when marking." tools={["bold", "italic", "bullets", "link"]} />
				<O.Switch label="Show students the model answer" hint="After they've handed their work in." checked={!!v.show_answer} onChange={(on) => set("show_answer", on ? 1 : 0)} />
			</O.FormSection>
			<O.SaveBar state={state} onSave={save} onDiscard={() => (setV({ ...x.values }), setErrors({}), setState("clean"))} message={state === "error" && n ? `Not saved. ${n === 1 ? "1 field needs" : n + " fields need"} fixing.` : undefined} />
		</>
	);
}

// ---- a coding exercise ----

const LANGUAGES = ["Python", "JavaScript", "Rust", "Go"];

export function ExerciseEdit({ exercise }) {
	const d = useCall("orbitutor.teach.exercise_detail", { exercise });
	const [v, setV] = useState(null);
	const [tests, setTests] = useState([]);
	const [state, setState] = useState("clean");
	const [errors, setErrors] = useState({});
	useLeaveGuard(state === "dirty");
	useEffect(() => {
		if (d.data && v === null) {
			setV({ ...d.data.values });
			setTests(d.data.tests.length ? d.data.tests : [{ input: "", expected_output: "" }]);
		}
	}, [d.data]);
	if (d.error) return <Problem error={d.error} onRetry={d.reload} />;
	if (!d.data || !v) return <Loading lines={4} blocks={2} />;
	const x = d.data;
	const set = (k, val) => (setV((o) => ({ ...o, [k]: val })), setState("dirty"));
	async function save() {
		const e = {};
		if (!String(v.title || "").trim()) e.title = "Give the exercise a title.";
		if (!String(v.problem_statement || "").replace(/<[^>]*>/g, "").trim()) e.problem_statement = "Say what the program should do.";
		const caseErrors = tests.map((t) => (String(t.expected_output || "").trim() ? undefined : "Say what it should print."));
		if (caseErrors.some(Boolean)) e.tests = caseErrors;
		setErrors(e);
		if (Object.keys(e).length) return setState("error");
		setState("saving");
		try {
			const res = await call("orbitutor.teach.save_exercise", { exercise: x.name, values: v, tests });
			d.set(res);
			setV({ ...res.values });
			setTests(res.tests);
			forget("orbitutor.teach.library");
			setState("saved");
		} catch (err) {
			setErrors({ server: err.message });
			setState("error");
		}
	}
	const n = Object.keys(errors).filter((k) => k !== "server").length;
	return (
		<>
			<O.PageHeader
				back={{ href: "/teach/library?kind=program", label: "Quizzes and assignments" }}
				eyebrow="Coding exercise"
				title={x.values.title}
				meta={x.submissions === 1 ? "1 student has run it" : `${x.submissions} students have run it`}
				actions={<O.Button variant="secondary" icon="eye" href={`/exercise/${encodeURIComponent(x.name)}`}>Try it as a student</O.Button>}
			/>
			{errors.server ? <O.Alert tone="danger" title="Not saved">{errors.server}</O.Alert> : null}
			<O.FormSection title="The problem" columns={2}>
				<O.TextField label="Title" value={v.title || ""} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={140} />
				<O.Select label="Language" value={v.language || "Python"} onChange={(e) => set("language", e.target.value)} options={LANGUAGES} />
				<O.RichTextField label="What the program should do" className="ot-wide" value={v.problem_statement || ""} onChange={(h) => set("problem_statement", h)} rows={5} error={errors.problem_statement} />
				<O.TextField label="Starting code" optional multiline rows={8} className="ot-wide teach-code" value={v.starter_code || ""} onChange={(e) => set("starter_code", e.target.value)} spellCheck={false} autoCapitalize="none" hint="What's in the editor when they open it." />
			</O.FormSection>
			<O.FormSection title="Tests" description="Each test feeds the program an input and checks what it prints. Hidden tests are checked but not shown.">
				<O.TestCaseEditor cases={tests} onChange={(c) => (setTests(c), setState("dirty"))} errors={errors.tests} />
			</O.FormSection>
			<O.SaveBar state={state} onSave={save} onDiscard={() => (setV({ ...x.values }), setTests(x.tests), setErrors({}), setState("clean"))} message={state === "error" && n ? "Not saved. Something needs fixing." : undefined} />
		</>
	);
}
