// Today, the staff home: what needs doing now.
import { useCall } from "../lib/load.js";
import { Loading, Problem } from "../pages/Problem.jsx";
import { dateRange, when } from "../lib/format.js";

const O = window.OrbiTutor;

export function greeting(d = new Date()) {
	const h = d.getHours();
	return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Block({ title, link, linkHref, children, empty }) {
	return (
		<section className="teach-block">
			<h2 className="teach-block__title">
				<span>{title}</span>
				{link ? <a href={linkHref}>{link}</a> : null}
			</h2>
			{empty ? <p className="teach-block__empty">{empty}</p> : <div className="teach-list">{children}</div>}
		</section>
	);
}

export function Today() {
	const t = useCall("orbitutor.teach.today_page");
	if (t.error) return <Problem error={t.error} onRetry={t.reload} />;
	if (!t.data) return <Loading lines={3} blocks={3} />;
	const d = t.data;
	const now = new Date();
	const s = d.stats;
	const lead = [
		s.classes_today ? `${s.classes_today === 1 ? "One live class" : s.classes_today + " live classes"} today` : null,
		s.to_mark ? `${s.to_mark} ${s.to_mark === 1 ? "piece" : "pieces"} of work to mark` : null,
	].filter(Boolean);
	return (
		<>
			<O.PageHeader
				eyebrow={now.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}
				title={`${greeting(now)}, ${d.first_name}`}
				meta={lead.length ? lead.join(" and ") + "." : "Nothing waiting. A good day to write a lesson."}
			/>
			<O.StatGrid label="Today at a glance">
				{d.roles.instructor ? <O.StatTile label="To mark" icon="assignment" value={s.to_mark} tone={s.to_mark ? "gold" : undefined} meta={d.oldest ? "Oldest from " + d.oldest.toLowerCase() : "All marked"} href="/teach/marking" /> : null}
				<O.StatTile label="Live classes today" icon="live" value={s.classes_today} meta={d.next_class ? "Next at " + d.next_class : "None today"} />
				{d.roles.evaluator ? <O.StatTile label="Evaluations" icon="due" value={s.evaluations} meta="This week" href="/teach/evaluations" /> : null}
				{d.roles.instructor ? <O.StatTile label="Join requests" icon="inbox" value={s.requests} tone={s.requests ? "warning" : undefined} meta={s.requests ? "Waiting for a call" : "None new"} href="/teach/requests" /> : null}
			</O.StatGrid>
			<div className="teach-two">
				<div className="teach-col">
					<Block title="Live classes today" link="Batches" linkHref="/teach/batches" empty={d.classes.length ? null : "No live classes today."}>
						{d.classes.map((c) => (
							<O.ListRow
								key={c.id}
								leading={<span className="teach-time">{c.time}</span>}
								title={c.title}
								meta={[c.batch, c.students + " students"].filter(Boolean).join(" · ")}
								trailing={c.start_url ? <O.Button size="sm" icon="live" href={c.start_url} target="_blank">Start class</O.Button> : <O.Button size="sm" variant="secondary" href={c.batch_href}>Open</O.Button>}
							/>
						))}
					</Block>
					{d.roles.instructor ? (
						<Block title="Waiting to be marked" link={d.stats.to_mark ? `All ${d.stats.to_mark}` : null} linkHref="/teach/marking" empty={d.work.length ? null : "Nothing waiting. Well done."}>
							{d.work.map((w) => (
								<O.ListRow
									key={w.kind + w.id}
									href={w.href}
									leading={<O.Avatar name={w.name || "Student"} size={36} decorative />}
									title={w.title}
									meta={[w.name, w.course_title].filter(Boolean).join(" · ")}
									trailing={<O.Badge tone={w.age >= 3 ? "warning" : "neutral"} icon="due">{w.waited}</O.Badge>}
								/>
							))}
						</Block>
					) : null}
				</div>
				<div className="teach-col">
					{d.roles.instructor ? (
						<Block title="New join requests" link="All requests" linkHref="/teach/requests" empty={d.requests.length ? null : "No new requests."}>
							{d.requests.map((r) => (
								<O.ListRow key={r.name} href="/teach/requests" icon="inbox" title={r.who + (r.for_whom === "Their child" ? " (for their child)" : "")} meta={[r.course, "asked " + r.asked.toLowerCase()].filter(Boolean).join(" · ")} trailing={<O.Badge tone="warning">New</O.Badge>} />
							))}
						</Block>
					) : null}
					<Block title="Batches starting soon" empty={d.starting.length ? null : "No batches start in the next month."}>
						{d.starting.map((b) => (
							<O.ListRow key={b.name} href={b.href} icon="schedule" title={b.title} meta={`Starts ${when(b.starts, now)}` + (b.seats ? ` · ${b.taken} of ${b.seats} seats` : ` · ${b.taken} students`)} />
						))}
					</Block>
				</div>
			</div>
		</>
	);
}

export const fmtRange = dateRange;
