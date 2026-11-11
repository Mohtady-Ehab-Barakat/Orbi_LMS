// HTML from Frappe (course descriptions, lesson paragraphs, replies) is cleaned with DOMPurify
// before anything draws it. The design system's components call this through O.configure().
import DOMPurify from "dompurify";

const FORBID_TAGS = ["style", "form", "input", "button", "textarea", "select", "option", "iframe", "object", "embed", "link", "meta", "base", "svg", "math"];
const FORBID_ATTR = ["style", "srcset", "formaction", "action", "background"];

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
	if (node.tagName === "A" && node.hasAttribute("href")) {
		let external = false;
		try {
			external = new URL(node.getAttribute("href"), window.location.href).origin !== window.location.origin;
		} catch (e) {
			node.removeAttribute("href");
		}
		if (external) {
			node.setAttribute("target", "_blank");
			node.setAttribute("rel", "noopener noreferrer");
		} else {
			node.removeAttribute("target");
		}
	}
	if (node.tagName === "IMG") {
		node.setAttribute("loading", "lazy");
		node.setAttribute("decoding", "async");
	}
});

export function sanitize(html) {
	return DOMPurify.sanitize(String(html == null ? "" : html), {
		USE_PROFILES: { html: true },
		FORBID_TAGS,
		FORBID_ATTR,
		ALLOW_DATA_ATTR: false,
		ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
	});
}

/** Plain text from HTML, for previews. */
export function plainText(html, limit = 0) {
	const div = document.createElement("div");
	div.innerHTML = sanitize(html);
	const text = (div.textContent || "").replace(/\s+/g, " ").trim();
	return limit && text.length > limit ? text.slice(0, limit - 1).trimEnd() + "…" : text;
}
