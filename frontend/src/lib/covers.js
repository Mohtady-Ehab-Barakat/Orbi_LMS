// A course without a picture in Frappe Learning gets a planet in its track's colours, the same
// for that course every time, so cards and course pages never show an empty space.

const TONES = {
	physics: ["#1d3fa8", "#8fbcff"],
	code: ["#0b5a49", "#7ee0b5"],
	making: ["#7a3512", "#ffb37a"],
	competitions: ["#4e2585", "#d6b2ff"],
};

function seedOf(text) {
	let h = 7;
	for (const ch of String(text || "")) h = (h * 31 + ch.charCodeAt(0)) % 9973;
	return h;
}

const made = new Map();

export function coverFor(track, name) {
	const key = (track || "") + ":" + name;
	if (made.has(key)) return made.get(key);
	const t = TONES[track] || ["#1b2b7c", "#c5ceea"];
	const seed = seedOf(name);
	const cx = 330 + ((seed * 53) % 150);
	const cy = 150 + ((seed * 29) % 60);
	const r = 58 + ((seed * 37) % 34);
	let stars = "";
	for (let i = 0; i < 26; i++) {
		stars += `<circle cx='${(i * 97 + seed * 41) % 640}' cy='${(i * 61 + seed * 23) % 360}' r='${0.6 + (i % 3) * 0.5}' fill='white' opacity='${0.3 + (i % 4) * 0.15}'/>`;
	}
	const rx = r * 2.2;
	const ry = r * 0.55;
	const svg =
		"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'><defs>" +
		`<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#030820'/><stop offset='1' stop-color='${t[0]}'/></linearGradient>` +
		`<radialGradient id='p' cx='.36' cy='.32' r='.75'><stop offset='0' stop-color='#ffffff'/><stop offset='.42' stop-color='${t[1]}'/><stop offset='1' stop-color='${t[0]}'/></radialGradient></defs>` +
		`<rect width='640' height='360' fill='url(#g)'/>${stars}` +
		`<ellipse cx='${cx}' cy='${cy}' rx='${rx}' ry='${ry}' transform='rotate(-14 ${cx} ${cy})' fill='none' stroke='${t[1]}' stroke-width='3' opacity='.55'/>` +
		`<circle cx='${cx}' cy='${cy}' r='${r}' fill='url(#p)'/>` +
		`<path d='M ${cx - rx * 0.97} ${cy + rx * 0.24} A ${rx} ${ry} -14 0 0 ${cx + rx * 0.97} ${cy - rx * 0.24}' fill='none' stroke='${t[1]}' stroke-width='3'/></svg>`;
	const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
	made.set(key, url);
	return url;
}

/** The course's own picture, or its planet. */
export function cover(course) {
	if (!course) return undefined;
	return course.cover || coverFor(course.track, course.name || course.title);
}
