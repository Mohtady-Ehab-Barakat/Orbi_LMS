// Loaded with the first lesson, not with the app: code highlighting, maths and Markdown.
import hljs from "highlight.js/lib/core";
import arduino from "highlight.js/lib/languages/arduino";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import katex from "katex";
import { Marked } from "marked";

const LANGUAGES = { arduino, bash, c, cpp, css, java, javascript, json, plaintext, python, sql, typescript, xml };
for (const [name, lang] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, lang);
const ALIASES = { js: "javascript", ts: "typescript", py: "python", html: "xml", sh: "bash", shell: "bash", ino: "arduino", "c++": "cpp", text: "plaintext" };

function escape(s) {
	return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/** Highlighted HTML for a code block. Unknown languages come back escaped, not guessed. */
export function highlight(code, language) {
	const lang = ALIASES[(language || "").toLowerCase()] || (language || "").toLowerCase();
	try {
		if (lang && hljs.getLanguage(lang)) return hljs.highlight(String(code || ""), { language: lang, ignoreIllegals: true }).value;
	} catch (e) {
		// fall through to plain
	}
	return escape(code || "");
}

/** LaTeX to MathML: no fonts or stylesheet to load, and screen readers read it. */
export function renderMath(latex) {
	return katex.renderToString(String(latex || ""), {
		output: "mathml",
		displayMode: true,
		throwOnError: false,
		trust: false,
		maxSize: 20,
		maxExpand: 200,
	});
}

const marked = new Marked({ gfm: true, breaks: false, async: false });

/** Markdown blocks to HTML. The caller sanitises it. */
export function markdown(text) {
	return marked.parse(String(text || ""));
}
