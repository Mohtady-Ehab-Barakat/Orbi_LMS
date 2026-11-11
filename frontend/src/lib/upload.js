// Uploading a file to Frappe (its own upload_file method), with progress.
import { ApiError, boot, serverMessage } from "./api.js";

/**
 * uploadFile(file, { private: true, doctype, docname, fieldname, onProgress }) resolves to
 * Frappe's File: { name, file_url, file_name, is_private }.
 */
export function uploadFile(file, opts = {}) {
	return new Promise((resolve, reject) => {
		const form = new FormData();
		form.append("file", file, file.name);
		form.append("is_private", opts.private === false ? "0" : "1");
		form.append("folder", "Home");
		if (opts.doctype) form.append("doctype", opts.doctype);
		if (opts.docname) form.append("docname", opts.docname);
		if (opts.fieldname) form.append("fieldname", opts.fieldname);
		const xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/method/upload_file");
		xhr.setRequestHeader("Accept", "application/json");
		xhr.setRequestHeader("X-Frappe-CSRF-Token", boot.csrf_token || "");
		xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		xhr.withCredentials = true;
		if (opts.onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress(Math.round((100 * e.loaded) / e.total));
		xhr.onload = () => {
			let body = null;
			try {
				body = JSON.parse(xhr.responseText);
			} catch (e) {
				body = null;
			}
			if (xhr.status >= 200 && xhr.status < 300 && body && body.message) resolve(body.message);
			else reject(new ApiError(serverMessage(body) || (xhr.status === 413 ? "That file is too big." : "The upload didn't finish."), { status: xhr.status, body }));
		};
		xhr.onerror = () => reject(new ApiError("We couldn't reach OrbiTutor.", { status: 0 }));
		xhr.send(form);
	});
}
