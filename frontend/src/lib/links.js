// Where things live. Frappe Learning's own addresses (/lms/..., in its emails and notifications)
// map to OrbiTutor's; the server redirects them too, so an old link still lands right.
import { boot } from "./api.js";

/** Frappe Learning's links (in notifications, emails) to OrbiTutor's addresses where there is one. */
export function fromLmsLink(link) {
	if (!link) return undefined;
	let url;
	try {
		url = new URL(link, window.location.origin);
	} catch (e) {
		return undefined;
	}
	if (url.origin !== window.location.origin) return url.href;
	const p = url.pathname.replace(/^\/lms(?=\/|$)/, "").replace(/\/+$/, "");
	const staff = boot.user && boot.user.staff;
	let m;
	if ((m = p.match(/^\/courses\/([^/]+)\/learn\/(\d+)[-.](\d+)$/))) return `/course/${m[1]}/learn/${m[2]}-${m[3]}`;
	if ((m = p.match(/^\/courses\/([^/]+)/))) return `/course/${m[1]}`;
	if ((m = p.match(/^\/batches\/details\/([^/]+)/)) || (m = p.match(/^\/batches\/([^/]+)/))) return `/batch/${m[1]}` + url.hash;
	if ((m = p.match(/^\/assignment-submission\/([^/]+)\/([^/]+)/))) return staff ? `/teach/marking/assignment/${m[2]}` : `/assignment/${m[1]}`;
	if ((m = p.match(/^\/quiz-submission\/([^/]+)/))) return staff ? `/teach/marking/quiz/${m[1]}` : "/";
	if ((m = p.match(/^\/quiz\/([^/]+)$/))) return `/quiz/${m[1]}`;
	if ((m = p.match(/^\/programming-exercises\/([^/]+)\/submission/))) return `/exercise/${m[1]}`;
	if ((m = p.match(/^\/user\/([^/]+)\/certificates$/))) return "/certificates";
	if ((m = p.match(/^\/user\/([^/]+)$/))) return m[1] === (boot.user && boot.user.username) ? "/my-profile" : `/profile/${m[1]}`;
	if (p === "" || p === "/") return "/";
	return url.pathname.startsWith("/lms") ? "/" : url.pathname + url.search + url.hash;
}

/** What a notification is about, for its icon. */
export function notificationKind(n) {
	const link = String(n.link || "");
	const subject = String(n.subject || "").toLowerCase();
	if (/certificat/.test(link) || /certificat/.test(subject)) return "certificate";
	if (/assignment-submission|quiz-submission|programming-exercise-submission/.test(link) || /marked|evaluat|graded/.test(subject)) return "marked";
	if (/live|class/.test(subject) && /batches/.test(link)) return "live";
	if (/\/learn\//.test(link)) return "lesson";
	return "announcement";
}

/** Where an activity inside a lesson opens. */
export function activityHref(block, lesson) {
	const d = block.data || {};
	const q = lesson ? "?lesson=" + encodeURIComponent(lesson) : "";
	if (block.type === "quiz" && d.quiz) return `/quiz/${encodeURIComponent(d.quiz)}${q}`;
	if (block.type === "assignment" && d.assignment) return `/assignment/${encodeURIComponent(d.assignment)}${q}`;
	if (block.type === "program" && d.exercise) return `/exercise/${encodeURIComponent(d.exercise)}${q}`;
	return null;
}
