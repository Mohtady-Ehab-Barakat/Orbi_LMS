// Marking: everything waiting, oldest first; an assignment marked beside the work; open quiz answers.
import { call } from "../lib/api.js";
import { forget, useCall } from "../lib/load.js";
import { navigate } from "../lib/router.js";
import { sanitize } from "../lib/safe.js";
import { Loading, Problem } from "../pages/Problem.jsx";

const O = window.OrbiTutor;
const { useEffect, useState } = React;

export function useFilter(rows, keys) {
	const [q, setQ] = useState("");
	const [f, setF] = useState({});
	const shown = (rows || []).filter((r) => {
		if (q && !keys.some((k) => String(r[k] || "").toLowerCase().includes(q.toLowerCase()))) return false;
		return Object.entries(f).every(([k, v]) => !v || String(r[k] || "") === v);
	});
	return { q, setQ, f, set: (k, v) => setF((x) => ({ ...x, [k]: v })), clear: () => (setQ(""), setF({})), shown };
}
export function options(rows, key) {
	const seen = {};
	(rows || []).forEach((r) => r[key] && (seen[r[key]] = (seen[r[key]] || 0) + 1));
	return Object.keys(seen).sort().map((v) => ({ value: v, label: v, count: seen[v] }));
}
export function Who({ name, src }) {
	return (
		<span className="teach-who">
			<O.Avatar name={name || "Student"} src={src || undefined} size={28} decorative />
			{name}
		</span>
	);
}
const KIND_WORDS = { assignment: "Assignments", quiz: "Open quiz answers", code: "Coding exercises" };

export function MarkingPage() {
	const [tab, setTab] = useState("waiting");
	const m = useCall("orbitutor.teach.marking", { tab });
	const f = useFilter(m.data && m.data.items, ["title", "name", "course"]);
	const counts = (m.data && m.data.counts) || {};
	return (
		<>
			<O.PageHeader
				title="Marking"
				meta="Oldest first. Students see their result as soon as you save it."
				tabs={<O.Tabs label="Marking" value={tab} onChange={setTab} tabs={[{ id: "waiting", label: "Waiting", count: counts.marking }, { id: "marked", label: "Marked this week" }]} />}
			/>
			<O.FilterBar
				search={{ value: f.q, onChange: f.setQ, placeholder: "Student or assignment" }}
				filters={
					tab === "waiting"
						? [
								{ id: "batch", label: "Batch", value: f.f.batch || "", onChange: (v) => f.set("batch", v), options: options(m.data && m.data.items, "batch") },
								{ id: "kind", label: "Kind", value: f.f.kind || "", onChange: (v) => f.set("kind", v), options: Object.entries(KIND_WORDS).map(([value, label]) => ({ value, label })) },
						  ]
						: []
				}
				count={m.data ? `${f.shown.length} ${tab === "waiting" ? "waiting" : "marked"}` : null}
				onClear={f.clear}
			/>
			<O.DataTable
				label={tab === "waiting" ? "Waiting to be marked" : "Marked this week"}
				rows={f.shown}
				loading={!m.data && !m.error}
				error={m.error ? { title: "The list didn't load", onRetry: m.reload } : null}
				empty={{ icon: "done", title: tab === "waiting" ? "Nothing waiting" : "Nothing marked this week", text: tab === "waiting" ? "When students hand work in, it shows here." : undefined }}
				rowHref={(r) => r.href}
				defaultSort={tab === "waiting" ? { key: "waited", dir: "desc" } : undefined}
				columns={[
					{ key: "title", label: "Work", primary: true, sortable: true, render: (r) => <span className="teach-what"><O.Icon name={r.kind} size={20} />{r.title}</span> },
					{ key: "name", label: "Student", sortable: true, render: (r) => <Who name={r.name} /> },
					{ key: "course", label: "Course", hideOnTablet: true },
					tab === "waiting"
						? { key: "waited", label: "Waiting", sortable: true, sortValue: (r) => r.age, defaultDir: "desc", render: (r) => <O.Badge tone={r.age >= 3 ? "warning" : "neutral"} icon="due">{r.waited}</O.Badge> }
						: { key: "result", label: "Result", render: (r) => <O.Badge tone={r.result === "Passed" ? "success" : "danger"}>{r.result}</O.Badge> },
				]}
			/>
		</>
	);
}

function afterSave(res, next) {
	forget("orbitutor.teach.");
	if (next) navigate(res.position && res.position.next ? res.position.next : "/teach/marking");
}

export function AssignmentReview({ name }) {
	const r = useCall("orbitutor.teach.assignment_review", { submission: name });
	const [status, setStatus] = useState(null);
	const [comment, setComment] = useState(null);
	const [save, setSave] = useState(null);
	const [error, setError] = useState(null);
	const [next, setNext] = useState(false);
	useEffect(() => {
		if (r.data) {
			setStatus(r.data.status);
			setComment(r.data.comment || "");
		}
	}, [r.data && r.data.name]);
	if (r.error) return <Problem error={r.error} what="page" onRetry={r.reload} />;
	if (!r.data) return <Loading lines={3} blocks={2} />;
	const d = r.data;
	async function doSave(goOn) {
		if (!status) {
			setError("Choose Passed or Not passed first.");
			return;
		}
		setError(null);
		setNext(goOn);
		setSave("saving");
		try {
			const res = await call("orbitutor.teach.mark_assignment", { submission: d.name, status, comment });
			setSave("saved");
			afterSave(res, goOn);
		} catch (e) {
			setSave(null);
			setError(e.message);
		}
	}
	const pos = d.position || {};
	return (
		<O.ReviewLayout
			back={{ href: "/teach/marking", label: "Marking" }}
			eyebrow="Assignment"
			title={d.title}
			student={d.student}
			meta={d.meta}
			submitted={d.submitted}
			position={pos.index ? { index: pos.index, total: pos.total } : undefined}
			prevHref={pos.prev || undefined}
			nextHref={pos.next || undefined}
			work={<O.SubmissionViewer type={d.view} url={d.url || d.link || undefined} text={d.text ? sanitize(d.text) : undefined} studentName={d.student_first} />}
			panel={
				<O.MarkPanel
					question={d.question ? sanitize(d.question) : undefined}
					answerKey={d.answer_key ? sanitize(d.answer_key) : undefined}
					status={status}
					onStatusChange={setStatus}
					comment={comment || ""}
					onCommentChange={setComment}
					notice={`${d.student_first || "They"} gets an email when you save.`}
					error={error}
					saveState={save}
					savingNext={next}
					onSave={() => doSave(false)}
					onSaveNext={() => doSave(true)}
				/>
			}
		/>
	);
}

export function QuizReviewPage({ name }) {
	const r = useCall("orbitutor.teach.quiz_submission", { submission: name });
	const [marks, setMarks] = useState({});
	const [save, setSave] = useState(null);
	const [error, setError] = useState(null);
	const [next, setNext] = useState(false);
	if (r.error) return <Problem error={r.error} what="page" onRetry={r.reload} />;
	if (!r.data) return <Loading lines={3} blocks={2} />;
	const d = r.data;
	const results = d.results.map((x) => ({ ...x, question: sanitize(x.question || ""), marks: x.id in marks ? marks[x.id] : x.marks }));
	async function doSave(goOn) {
		const missing = results.some((x) => x.type === "open" && x.marks == null);
		if (missing) {
			setError("Give marks for every open answer first.");
			return;
		}
		setError(null);
		setNext(goOn);
		setSave("saving");
		try {
			const res = await call("orbitutor.teach.mark_quiz", { submission: d.name, marks: Object.fromEntries(results.filter((x) => x.type === "open").map((x) => [x.id, x.marks])) });
			setSave("saved");
			afterSave(res, goOn);
		} catch (e) {
			setSave(null);
			setError(e.message);
		}
	}
	const pos = d.position || {};
	return (
		<O.ReviewLayout
			back={{ href: "/teach/marking", label: "Marking" }}
			eyebrow="Quiz"
			title={d.title}
			student={d.student}
			meta={d.meta}
			submitted={d.submitted}
			position={pos.index ? { index: pos.index, total: pos.total } : undefined}
			prevHref={pos.prev || undefined}
			nextHref={pos.next || undefined}
			work={<O.QuizReview results={results} passPercent={d.pass_percent || undefined} onMark={(id, v) => setMarks((m) => ({ ...m, [id]: v }))} />}
			panel={
				<O.MarkPanel
					notice={`${d.student_first || "They"} sees the final score when you save.`}
					error={error}
					saveState={save}
					savingNext={next}
					onSave={() => doSave(false)}
					onSaveNext={() => doSave(true)}
				/>
			}
		/>
	);
}
