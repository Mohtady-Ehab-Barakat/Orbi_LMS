// OrbiTutor's student app. The page (orbitutor/www/_orbitutor.html) loads React 18, the design
// system (window.OrbiTutor) and the boot object (window.orbitutorBoot), then this.
import "./app.css";
import App from "./App.jsx";
import { interceptLinks } from "./lib/router.js";
import { sanitize } from "./lib/safe.js";

const O = window.OrbiTutor;

// Every component that draws HTML from Frappe cleans it with DOMPurify.
O.configure({ sanitizeHtml: sanitize });

// Lite on low-memory phones and with data saver; a saved choice wins.
let saved = null;
try {
	saved = localStorage.getItem("orbitutor.performance");
} catch (e) {
	saved = null;
}
O.applyPerformanceMode(saved === "lite" || saved === "full" ? saved : undefined);

// "System" theme follows the device while the app is open.
try {
	const mq = window.matchMedia("(prefers-color-scheme: light)");
	mq.addEventListener("change", () => {
		let pref = null;
		try {
			pref = localStorage.getItem("orbitutor.theme");
		} catch (e) {
			pref = null;
		}
		const chosen = pref || (window.orbitutorBoot && window.orbitutorBoot.user && window.orbitutorBoot.user.theme) || "night";
		if (chosen === "system") document.documentElement.setAttribute("data-theme", mq.matches ? "day" : "night");
	});
} catch (e) {
	// old browser: the theme set at load stays
}

interceptLinks();
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
