// Quizzes, assignments and coding exercises, each on its own page (lessons link here).
// Quizzes are scored by Frappe Learning's own submit_quiz; assignments and exercise runs are
// saved through orbitutor.learn, which keeps Frappe Learning's checks.
import { boot, call } from "../lib/api.js";
import { forget, useCall } from "../lib/load.js";
import { navigate, useQuery } from "../lib/router.js";
import { sanitize } from "../lib/safe.js";
import { uploadFile } from "../lib/upload.js";
import { Loading, Problem } from "./Problem.jsx";

const O = window.OrbiTutor;
const { useEffect, useMemo, useRef, useState } = React;

function shuffle(list) {
	const a = list.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function Frame({ back, children }) {
	return (
		<div className="app-activity">
			{back ? <O.BackLink href={back.href}>{back.label}</O.BackLink> : null}
			{children}
		</div>
	);
}

// ---- quizzes ----

export function QuizPage({ quiz }) {
	const q = useQuery();
	const lesson = q.get("lesson") || undefined;
	const page = useCall("orbitutor.learn.quiz_page", { quiz, lesson });
	const [stage, setStage] = useState("intro");
	const [result, setResult] = useState(null);
	const [review, setReview] = useState(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [round, setRound] = useState(0);
	const d = page.data;
	const questions = useMemo(() => {
		if (!d) return [];
		let list = d.questions.map((x) => ({ id: x.id, type: x.type, html: sanitize(x.html || ""), marks: x.marks, options: x.options.map((o) => ({ id: o.id, text: o.text, explanation: o.explanation || undefined })) }));
		if (d.shuffle) list = shuffle(list);
		if (d.limit) list = list.slice(0, d.limit);
		return list;
		// a new round draws again
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [d, round]);
	useEffect(() => {
		if (d && d.title) document.title = d.title + " · " + (boot.app_name || "OrbiTutor");
	}, [d]);

	if (page.error) return <Problem error={page.error} what="quiz" onRetry={page.reload} />;
	if (!d) return <Loading lines={4} blocks={1} />;
	const byId = Object.fromEntries(d.questions.map((x) => [x.id, x]));

	async function check(question, answer) {
		const src = byId[question.id];
		const values = [].concat(answer || []).map((id) => (src.options.find((o) => o.id === id) || {}).value).filter(Boolean);
		const res = await call("lms.lms.doctype.lms_quiz.lms_quiz.check_answer", {
			quiz,
			question: question.id,
			question_type: src.lms_type || "Choices",
			answers: JSON.stringify(question.type === "typed" ? [answer || ""] : values),
		});
		if (question.type === "typed") return { correct: !!res };
		const marks = Array.isArray(res) ? res : [];
		const correctIds = src.options.filter((o) => [1, 2].includes(marks[+o.id - 1])).map((o) => o.id);
		const chosen = [].concat(answer || []);
		const ok = chosen.length > 0 && chosen.every((id) => correctIds.includes(id)) && correctIds.every((id) => chosen.includes(id));
		const explanations = {};
		src.options.forEach((o) => o.explanation && (explanations[o.id] = o.explanation));
		return { correct: ok, correctIds, explanations };
	}

	async function submit({ answers, reason }) {
		setSubmitting(true);
		setError(null);
		const results = questions.map((x) => {
			const a = answers[x.id];
			const src = byId[x.id];
			if (x.type === "single" || x.type === "multiple") {
				return { question_name: x.id, answer: [].concat(a || []).map((id) => (src.options.find((o) => o.id === id) || {}).value).filter(Boolean) };
			}
			return { question_name: x.id, answer: [typeof a === "string" ? a : ""] };
		});
		try {
			const res = await call("lms.lms.doctype.lms_quiz.lms_quiz.submit_quiz", { quiz, results: JSON.stringify(results), submission_reason: reason || "manual" });
			// Frappe Learning counts a written answer as wrong until it's marked; here it's "waiting"
			const openAnswered = questions.filter((x) => x.type === "open" && typeof answers[x.id] === "string" && answers[x.id].replace(/<[^>]*>/g, "").trim()).length;
			setResult({ ...res, open_answered: openAnswered });
			if (d.show_answers && res && res.submission) {
				call("orbitutor.learn.quiz_review", { submission: res.submission }).then((r) => setReview(r.review), () => {});
			}
			forget("orbitutor.");
			setStage("results");
		} catch (e) {
			setError(e.message);
		} finally {
			setSubmitting(false);
		}
	}

	if (stage === "taking") {
		return (
			<>
				{error ? <O.Alert tone="danger" title="Your answers weren't handed in">{error} Your answers are still here: try again.</O.Alert> : null}
				<O.QuizFrame
					key={round}
					title={d.title}
					course={d.course || undefined}
					questions={questions}
					mode={d.mode}
					timeLimit={d.time_limit || undefined}
					onCheck={d.mode === "practice" ? check : undefined}
					onSubmit={submit}
					onLeave={() => navigate(d.back.href)}
					negativeMarks={d.negative_marks || undefined}
					submitting={submitting}
				/>
			</>
		);
	}

	if (stage === "results" && result) {
		const open = d.questions.filter((x) => x.type === "open").length;
		const left = d.attempts_left == null ? null : Math.max(d.attempts_left - 1, 0);
		return (
			<Frame back={d.back}>
				<O.QuizResults
					title={d.title}
					score={result.score}
					outOf={result.score_out_of}
					percentage={result.percentage}
					passMark={d.pass_mark}
					passed={result.is_open_ended ? null : !!result.pass}
					counts={{ correct: result.correct, wrong: Math.max(0, (result.wrong || 0) - (result.open_answered || 0)), unanswered: result.unanswered, pending: result.is_open_ended ? (result.open_answered != null ? result.open_answered : open) : 0 }}
					attemptsLeft={left}
					onRetry={left === 0 ? undefined : () => (page.reload(), setResult(null), setReview(null), setRound((r) => r + 1), setStage("taking"))}
					continueHref={d.back.href}
					continueLabel={"Back to " + d.back.label}
					review={review || undefined}
					showAnswers={d.show_answers}
					headingAs="h1"
				/>
			</Frame>
		);
	}

	return (
		<Frame back={d.back}>
			<O.QuizIntro
				title={d.title}
				course={d.course || undefined}
				track={d.track || undefined}
				questions={d.question_count}
				timeLimit={d.time_limit || undefined}
				attemptsLeft={d.attempts_left}
				attemptsTotal={d.attempts_total || undefined}
				passMark={d.pass_mark || undefined}
				mode={d.mode}
				hasWritten={d.has_written}
				negativeMarks={d.negative_marks || undefined}
				opensAt={d.opens_at || undefined}
				closesAt={d.closes_at || undefined}
				attempts={d.attempts}
				onStart={() => setStage("taking")}
				backHref={d.back.href}
				backLabel={d.back.label}
				headingAs="h1"
			/>
		</Frame>
	);
}

// ---- assignments ----

export function AssignmentPage({ assignment }) {
	const q = useQuery();
	const lesson = q.get("lesson") || undefined;
	const submission = q.get("submission");
	const page = useCall("orbitutor.learn.assignment_page", { assignment, lesson });
	const [upload, setUpload] = useState({ state: "empty" });
	const [sending, setSending] = useState(false);
	const [error, setError] = useState(null);
	const fileRef = useRef(null);
	const d = page.data;

	useEffect(() => {
		// staff following a "work handed in" link go to marking
		if (submission && boot.user && boot.user.staff && d && d.submission_name !== submission) navigate(`/teach/marking/assignment/${encodeURIComponent(submission)}`, { replace: true });
	}, [submission, d]);
	useEffect(() => {
		if (d && d.title) document.title = d.title + " · " + (boot.app_name || "OrbiTutor");
	}, [d]);

	if (page.error) return <Problem error={page.error} what="assignment" onRetry={page.reload} />;
	if (!d) return <Loading lines={4} blocks={1} />;

	async function pick(file) {
		setError(null);
		setUpload({ state: "uploading", fileName: file.name, fileSize: file.size, progress: 0 });
		fileRef.current = file;
		try {
			const f = await uploadFile(file, { private: true, onProgress: (p) => setUpload((u) => ({ ...u, progress: p })) });
			setUpload({ state: "uploaded", fileName: file.name, fileSize: file.size, url: f.file_url });
		} catch (e) {
			setUpload({ state: "failed", fileName: file.name, fileSize: file.size, error: e.message });
		}
	}
	async function submit(v) {
		setSending(true);
		setError(null);
		try {
			const fresh = await call("orbitutor.learn.submit_assignment", {
				assignment,
				lesson: d.lesson || lesson || null,
				file_url: upload.url || null,
				link: v.link || null,
				answer: v.text || null,
			});
			page.set(fresh);
			setUpload({ state: "empty" });
			forget("orbitutor.");
		} catch (e) {
			setError(e.message);
		} finally {
			setSending(false);
		}
	}
	return (
		<Frame>
			{error ? <O.Alert tone="danger" title="Not handed in">{error}</O.Alert> : null}
			<O.AssignmentPage
				title={d.title}
				course={d.course || undefined}
				track={d.track || undefined}
				html={sanitize(d.html || "")}
				type={d.type}
				due={d.due || undefined}
				opensAt={d.opens_at || undefined}
				status={d.status}
				upload={upload}
				onPick={pick}
				onRemove={() => setUpload({ state: "empty" })}
				onRetry={() => fileRef.current && pick(fileRef.current)}
				onSubmit={submit}
				submitting={sending}
				defaultText={d.submission && d.submission.text ? d.submission.text : undefined}
				defaultLink={d.submission && d.submission.link ? d.submission.link : undefined}
				submittedAt={d.submitted_at || undefined}
				markedAt={d.marked_at || undefined}
				evaluator={d.evaluator || undefined}
				feedback={d.feedback ? <O.Prose html={sanitize(d.feedback)} /> : undefined}
				submission={d.submission || undefined}
				continueHref={d.back.href}
				back={{ href: d.back.href, label: d.back.label }}
				headingAs="h1"
			/>
		</Frame>
	);
}

// ---- coding exercises ----

let runnerLoad = null;
function loadRunner(base) {
	if (!runnerLoad) {
		runnerLoad = new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.src = base.replace(/\/+$/, "") + "/static/livecode.js";
			s.onload = () => resolve();
			s.onerror = () => {
				runnerLoad = null;
				s.remove();
				reject(new Error("The code runner didn't load."));
			};
			document.head.appendChild(s);
		});
	}
	return runnerLoad;
}
function runOnce(base, runtime, code, stdin, onErr) {
	return new Promise((resolve, reject) => {
		const out = [];
		let done = false;
		// eslint-disable-next-line no-undef
		new window.LiveCodeSession({
			base_url: base,
			runtime,
			code,
			files: [{ filename: "stdin", contents: stdin }],
			onMessage: (m) => {
				if (m.msgtype === "write" && m.file === "stdout") out.push(m.data || "");
				if (m.msgtype === "write" && m.file === "stderr") onErr(m.data || "");
				if (m.msgtype !== "exitstatus") return;
				done = true;
				resolve(out.join("").trim());
			},
		});
		setTimeout(() => !done && reject(new Error("The code runner didn't answer in 20 seconds.")), 20000);
	});
}

export function ExercisePage({ exercise }) {
	const q = useQuery();
	const page = useCall("orbitutor.learn.exercise_page", { exercise, lesson: q.get("lesson") || undefined });
	const d = page.data;
	if (page.error) return <Problem error={page.error} what="exercise" onRetry={page.reload} />;
	if (!d) return <Loading lines={4} blocks={1} />;
	const language = d.language === "javascript" ? "javascript" : "python";

	async function run(code) {
		if (!d.runner) throw new Error("Running code isn't set up on OrbiTutor yet. Ask your instructor.");
		await loadRunner(d.runner);
		const started = performance.now();
		const errs = [];
		const outputs = [];
		for (const t of d.tests) outputs.push(await runOnce(d.runner, language, code, t.input || "", (e) => errs.push(e)));
		const saved = await call("orbitutor.learn.save_exercise_run", { exercise, code, outputs });
		forget("orbitutor.");
		return {
			results: saved.results.map((r) => ({ passed: r.passed, output: r.output })),
			console: errs.length ? errs.map((text) => ({ kind: "err", text })) : outputs.slice(0, 1).map((text) => ({ kind: "out", text })),
			time: (performance.now() - started) / 1000,
		};
	}
	return (
		<Frame back={d.back}>
			{!d.runner ? <O.Alert tone="info" title="You can read this one, but not run it yet">Running code isn't set up on OrbiTutor yet. Your instructor can switch it on.</O.Alert> : null}
			<O.CodeExercise
				title={d.title}
				html={sanitize(d.html || "")}
				language={language}
				starterCode={d.starter_code}
				defaultCode={d.code != null ? d.code : undefined}
				tests={d.tests}
				onRun={run}
				initialResults={d.results || undefined}
				headingAs="h1"
			/>
		</Frame>
	);
}
