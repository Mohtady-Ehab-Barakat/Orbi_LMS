// Builds the OrbiTutor app into ../orbitutor/public/ui, which Frappe serves at /assets/orbitutor/ui/.
//
//   node build.mjs           build once (minified)
//   node build.mjs --watch   rebuild on every change, not minified
//
// The design system (vendor/bundle.js and bundle.css), React 18 and the fonts are copied in
// as they are, minified. The app itself (src/) is bundled with esbuild; the lesson extras
// (code highlighting, maths and Markdown) are split into a chunk that loads with the first lesson.
import * as esbuild from "esbuild";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../orbitutor/public/ui");
const watch = process.argv.includes("--watch");
const nodePaths = (process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean);
const browsers = ["chrome100", "safari15", "firefox100", "edge100"];

fs.mkdirSync(out, { recursive: true });
for (const old of ["chunks"]) fs.rmSync(path.join(out, old), { recursive: true, force: true });

async function copyVendor() {
	const v = (f) => path.join(here, "vendor", f);
	// React's own files are already minified.
	for (const f of ["react.production.min.js", "react-dom.production.min.js", "icon-192.png", "icon-512.png"]) {
		fs.copyFileSync(v(f), path.join(out, f));
	}
	fs.mkdirSync(path.join(out, "fonts"), { recursive: true });
	for (const f of fs.readdirSync(v("fonts"))) fs.copyFileSync(v(path.join("fonts", f)), path.join(out, "fonts", f));
	for (const [file, loader] of [["bundle.js", "js"], ["bundle.css", "css"], ["tokens.css", "css"]]) {
		const src = fs.readFileSync(v(file), "utf8");
		const result = await esbuild.transform(src, {
			loader,
			minify: !watch,
			target: browsers,
			charset: "ascii",
			legalComments: "none",
		});
		fs.writeFileSync(path.join(out, file), result.code);
	}
}

const options = {
	entryPoints: { app: path.join(here, "src/main.jsx") },
	outdir: out,
	bundle: true,
	splitting: true,
	format: "esm",
	chunkNames: "chunks/[name]-[hash]",
	minify: !watch,
	sourcemap: watch ? "inline" : false,
	target: browsers,
	charset: "ascii",
	legalComments: "none",
	jsx: "transform",
	jsxFactory: "React.createElement",
	jsxFragment: "React.Fragment",
	nodePaths,
	define: { "process.env.NODE_ENV": watch ? '"development"' : '"production"' },
	metafile: true,
	logLevel: "info",
};

function writeManifest() {
	// A short hash of each file, added to its address so browsers fetch it again only when it changes.
	const files = {};
	const walk = (dir, prefix = "") => {
		for (const name of fs.readdirSync(dir)) {
			const full = path.join(dir, name);
			const rel = prefix + name;
			if (fs.statSync(full).isDirectory()) walk(full, rel + "/");
			else if (name !== "manifest.json") {
				files[rel] = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex").slice(0, 10);
			}
		}
	};
	walk(out);
	fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(files, null, 1) + "\n");
}

await copyVendor();
if (watch) {
	const ctx = await esbuild.context({
		...options,
		plugins: [{ name: "manifest", setup: (b) => b.onEnd(() => writeManifest()) }],
	});
	await ctx.watch();
	console.log("Watching src/ ...");
} else {
	const result = await esbuild.build(options);
	writeManifest();
	const sizes = Object.entries(result.metafile.outputs).map(([f, o]) => `${path.relative(out, f)} ${(o.bytes / 1024).toFixed(1)} KB`);
	console.log(sizes.join("\n"));
}
