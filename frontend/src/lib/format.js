// Dates, times and counts in OrbiTutor's words: "Sunday", "2 November", "3:50 pm", "4 of 9 lessons".
import { boot } from "./api.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The server's clock against this device's: Frappe's dates are the server's wall-clock time
// in its own time zone ("2026-11-05 15:52:00"), so they need the zone to become a moment.
const SERVER_TZ = boot.timezone || "Asia/Kuala_Lumpur";

function zoneOffsetMinutes(at, tz) {
	try {
		const parts = {};
		new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			hourCycle: "h23",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
			.formatToParts(at)
			.forEach((p) => (parts[p.type] = p.value));
		const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
		return Math.round((asUtc - at.getTime()) / 60000);
	} catch (e) {
		return -at.getTimezoneOffset();
	}
}

/** A Date from what Frappe sends: an ISO string with an offset, or the server's local "YYYY-MM-DD HH:MM:SS". */
export function toDate(value) {
	if (value == null || value === "") return null;
	if (value instanceof Date) return value;
	if (typeof value === "number") return new Date(value);
	const s = String(value).trim();
	if (/[zZ]$|[+-]\d\d:?\d\d$/.test(s)) return new Date(s);
	const m = s.match(/^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d)(?::(\d\d)(?:\.\d+)?)?)?$/);
	if (!m) {
		const d = new Date(s);
		return isNaN(d) ? null : d;
	}
	const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
	const offset = zoneOffsetMinutes(new Date(guess), SERVER_TZ);
	return new Date(guess - offset * 60000);
}

/** A date with no time ("2026-11-05"): the calendar day itself, at local midnight. */
export function toDay(value) {
	if (!value) return null;
	const m = String(value).match(/^(\d{4})-(\d\d)-(\d\d)/);
	return m ? new Date(+m[1], +m[2] - 1, +m[3]) : toDate(value);
}

function dayDiff(a, b) {
	const x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
	const y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
	return Math.round((y - x) / 86400000);
}

export function time(d) {
	d = toDate(d);
	if (!d) return "";
	const h = d.getHours(), m = d.getMinutes();
	return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + (h < 12 ? " am" : " pm");
}

/** "2 November", or "2 November 2025" in another year. */
export function date(d, now = new Date()) {
	d = d instanceof Date ? d : toDate(d);
	if (!d) return "";
	return d.getDate() + " " + MONTHS[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : "");
}

/** For something that happened: "3:50 pm" today, "Yesterday", "Sunday" this week, then "2 November". */
export function when(value, now = new Date()) {
	const d = toDate(value);
	if (!d) return "";
	const diff = dayDiff(d, now);
	if (diff === 0) return time(d);
	if (diff === 1) return "Yesterday";
	if (diff > 1 && diff < 7) return DAYS[d.getDay()];
	return date(d, now);
}

/** Which group a notification falls in. */
export function dayGroup(value, now = new Date()) {
	const d = toDate(value);
	if (!d) return "Earlier";
	const diff = dayDiff(d, now);
	return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : "Earlier";
}

/** "5 December to 16 January". */
export function dateRange(start, end, now = new Date()) {
	const a = toDay(start), b = toDay(end);
	if (!a) return "";
	if (!b) return "From " + date(a, now);
	return date(a, now) + " to " + date(b, now);
}

/** "10:00 am to 12:00 pm" from Frappe's "10:00:00" times. */
export function timeRange(start, end) {
	const t = (s) => {
		const m = String(s || "").match(/^(\d{1,2}):(\d\d)/);
		if (!m) return "";
		const h = +m[1];
		return (h % 12 || 12) + ":" + m[2] + (h < 12 ? " am" : " pm");
	};
	const a = t(start), b = t(end);
	return a && b ? a + " to " + b : a;
}

export function plural(n, one, many) {
	return n + " " + (n === 1 ? one : many || one + "s");
}

export function lessonsText(done, total) {
	return total ? `${done || 0} of ${plural(total, "lesson")}` : "";
}

export const TRACK_TITLES = {
	physics: "Physics and space",
	code: "Code and AI",
	making: "Engineering and making",
	competitions: "Competitions",
};

/** "1-2" or "1.2" to { chapter: 1, lesson: 2 }. */
export function lessonNumber(n) {
	const m = String(n || "").match(/^(\d+)[-.](\d+)$/);
	return m ? { chapter: +m[1], lesson: +m[2], id: m[1] + "-" + m[2] } : null;
}

/** A wa.me link with the message written. */
export function whatsapp(text) {
	const base = (boot.contact && boot.contact.whatsapp) || "";
	if (!base) return undefined;
	return base + (base.includes("?") ? "&" : "?") + "text=" + encodeURIComponent(text);
}
