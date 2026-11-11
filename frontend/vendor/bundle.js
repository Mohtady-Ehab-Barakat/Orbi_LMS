/* @ds-bundle: {"format":4,"namespace":"OrbiTutor","components":[{"name":"Button"},{"name":"Icon"},{"name":"Backdrop"},{"name":"TextField"},{"name":"Select"},{"name":"Checkbox"},{"name":"Radio"},{"name":"Switch"},{"name":"FileUpload"},{"name":"Card"},{"name":"ListRow"},{"name":"Avatar"},{"name":"Badge"},{"name":"Chip"},{"name":"ProgressBar"},{"name":"ProgressRing"},{"name":"StepDots"},{"name":"Toast"},{"name":"Alert"},{"name":"EmptyState"},{"name":"Skeleton"},{"name":"ErrorState"},{"name":"Dialog"},{"name":"BottomSheet"},{"name":"Menu"},{"name":"Tooltip"},{"name":"Tabs"},{"name":"SegmentedControl"},{"name":"Accordion"},{"name":"BackLink"},{"name":"LoadMore"},{"name":"AppShell"},{"name":"TopBar"},{"name":"TabBar"},{"name":"OrbitMenu"},{"name":"NotificationBell"},{"name":"NotificationList"},{"name":"SearchPanel"},{"name":"ConnectionBanner"},{"name":"LessonLayout"},{"name":"CourseOutline"},{"name":"LessonBlocks"},{"name":"Prose"},{"name":"Callout"},{"name":"CodeBlock"},{"name":"Figure"},{"name":"VideoPlayer"},{"name":"Embed"},{"name":"FileBlock"},{"name":"Formula"},{"name":"ActivityCard"},{"name":"Checklist"},{"name":"LessonEnd"},{"name":"LessonNav"},{"name":"ChapterComplete"},{"name":"CourseComplete"},{"name":"Discussion"},{"name":"LockedLesson"},{"name":"CourseCatalogue"},{"name":"CourseCard"},{"name":"CourseHero"},{"name":"AskToJoin"},{"name":"ProjectFeature"},{"name":"OutcomeList"},{"name":"KitList"},{"name":"InstructorCard"},{"name":"BatchCard"},{"name":"MyCourses"},{"name":"LearningPath"},{"name":"HomeLayout"},{"name":"HomeGreeting"},{"name":"ContinueCard"},{"name":"LiveClassCard"},{"name":"DueList"},{"name":"CourseStrip"},{"name":"Announcements"},{"name":"CertificateCard"},{"name":"WelcomePanel"},{"name":"QuizIntro"},{"name":"Question"},{"name":"QuizTimer"},{"name":"QuizFrame"},{"name":"QuizResults"},{"name":"ProctorNotice"},{"name":"AssignmentPage"},{"name":"AssignmentStatus"},{"name":"CodeExercise"},{"name":"CompetitionResults"},{"name":"BatchHero"},{"name":"Timetable"},{"name":"Schedule"},{"name":"ClassList"},{"name":"EvaluationBooking"},{"name":"CourseProgress"},{"name":"CertificateList"},{"name":"CertificateDoc"},{"name":"CertificateCheck"},{"name":"AuthFrame"},{"name":"SignIn"},{"name":"PasswordField"},{"name":"AcceptInvite"},{"name":"PasswordReset"},{"name":"WelcomeSetup"},{"name":"HomeTour"},{"name":"PhotoField"},{"name":"ProfileHeader"},{"name":"ProjectGallery"},{"name":"ProfilePage"},{"name":"SettingsLayout"},{"name":"ProfileSettings"},{"name":"NotificationSettings"},{"name":"AppearanceSettings"},{"name":"SecuritySettings"},{"name":"StatusPage"},{"name":"NotFoundPage"},{"name":"NoAccessPage"},{"name":"ErrorPage"},{"name":"ErrorBoundary"},{"name":"MaintenancePage"},{"name":"OfflinePage"},{"name":"PageSection"},{"name":"StaffShell"},{"name":"PageHeader"},{"name":"DataTable"},{"name":"FilterBar"},{"name":"FormSection"},{"name":"SaveBar"},{"name":"Combobox"},{"name":"ConfirmDialog"},{"name":"StatTile"},{"name":"StatGrid"},{"name":"BarChart"},{"name":"SpreadBar"},{"name":"RichTextField"},{"name":"ListEditor"},{"name":"OutlineEditor"},{"name":"BlockEditor"},{"name":"LessonEditor"},{"name":"InlineAdd"},{"name":"QuestionList"},{"name":"QuestionEditor"},{"name":"TestCaseEditor"},{"name":"ReviewLayout"},{"name":"SubmissionViewer"},{"name":"MarkPanel"},{"name":"QuizReview"},{"name":"TestResults"},{"name":"AvailabilityEditor"},{"name":"RoleList"}]} */
// OrbiTutor LMS components, written by hand as plain React (no build step). They read
// window.React and style themselves with bundle.css over the tokens.
(function () {
  var React = window.React;
  var createElement = React.createElement;

  // ---- Safety: every link and source that comes from data, and every piece of HTML from Frappe's editors ----
  // A URL is kept when it's relative, http(s), or (for links) mailto/tel/sms; media may also be inline data of their own kind.
  // Anything else (javascript:, vbscript:, data: links...) is dropped, so a bad link in a lesson, a notification or a live class can't run code.
  var URL_SCHEME = /^([a-z][a-z0-9+.\-]*):/i;
  function safeUrl(u, kind) {
    if (u == null || u === "") return u;
    var s = String(u).trim(), probe = s.replace(/[\u0000- \u007f-\u009f]+/g, ""), m = URL_SCHEME.exec(probe);
    if (!m) return s;
    var scheme = m[1].toLowerCase();
    if (scheme === "https" || scheme === "http") return s;
    if (kind === "frame") return undefined;
    if (scheme === "blob") return s;
    if (!kind || kind === "link") return scheme === "mailto" || scheme === "tel" || scheme === "sms" ? s : undefined;
    if (scheme === "data") {
      var t = /^data:([a-z]+)\//i.exec(probe), type = t && t[1].toLowerCase();
      return type === kind || (kind === "media" && (type === "video" || type === "audio")) ? s : undefined;
    }
    return undefined;
  }
  var SRC_KIND = { img: "image", video: "media", audio: "media", source: "media", track: "text", iframe: "frame", embed: "frame", object: "frame" };
  function safeProps(type, props) {
    var o = Object.assign({}, props);
    if (o.href != null) o.href = safeUrl(o.href, type === "image" ? "image" : "link");
    if (o.src != null) o.src = safeUrl(o.src, SRC_KIND[type] || "image");
    if (o.poster != null) o.poster = safeUrl(o.poster, "image");
    if (o.action != null) o.action = safeUrl(o.action, "link");
    if (o.formAction != null) o.formAction = safeUrl(o.formAction, "link");
    if (o.target === "_blank" && !/\bnoopener\b/.test(o.rel || "")) o.rel = ((o.rel || "") + " noopener noreferrer").trim();
    return o;
  }
  // every element the components draw goes through here, so no component can forget
  function h(type, props) {
    if (props && typeof type === "string" && (props.href != null || props.src != null || props.poster != null || props.action != null || props.formAction != null || props.target === "_blank")) {
      var args = Array.prototype.slice.call(arguments);
      args[1] = safeProps(type, props);
      return createElement.apply(React, args);
    }
    return createElement.apply(React, arguments);
  }

  // HTML from Frappe (lesson text, quiz questions, briefs): kept to plain formatting, links and pictures.
  // Scripts, styles, frames, forms, event handlers and inline styles are removed; unknown tags keep their text.
  // In the app, pass DOMPurify with configure({ sanitizeHtml }) for a second, well-tested pass.
  var KEEP_TAGS = {}, DROP_TAGS = {};
  ("a abbr b bdi bdo blockquote br caption cite code col colgroup dd del details dfn div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p pre q rp rt ruby s samp small span strong sub summary sup table tbody td tfoot th thead time tr u ul var wbr")
    .split(" ").forEach(function (t) { KEEP_TAGS[t] = 1; });
  ("script style template noscript iframe frame frameset object embed applet svg math form input button textarea select option optgroup label fieldset legend link meta base title head audio video source track canvas dialog portal xmp plaintext noembed noframes marquee slot")
    .split(" ").forEach(function (t) { DROP_TAGS[t] = 1; });
  var KEEP_ATTRS = { "*": { title: 1, lang: 1, dir: 1, "class": 1 }, a: { href: 1, target: 1 }, img: { src: 1, alt: 1, width: 1, height: 1 },
    td: { colspan: 1, rowspan: 1 }, th: { colspan: 1, rowspan: 1, scope: 1 }, ol: { start: 1, reversed: 1, type: 1 }, li: { value: 1 }, col: { span: 1 }, colgroup: { span: 1 }, time: { datetime: 1 } };
  // classes Frappe's editors use (Quill, Editor.js), code highlighting and maths; never ours, so pasted HTML can't dress up as the app
  var KEEP_CLASS = /^(ql-[\w-]+|cdx-[\w-]+|hljs[\w-]*|language-[\w-]+|inline-code|katex[\w-]*)$/;
  var HTML_NS = "http://www.w3.org/1999/xhtml";
  function scrubHtml(parent) {
    var kids = Array.prototype.slice.call(parent.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) continue;
      if (n.nodeType !== 1) { parent.removeChild(n); continue; }
      var tag = n.localName;
      if (n.namespaceURI !== HTML_NS || DROP_TAGS[tag]) { parent.removeChild(n); continue; }
      scrubHtml(n);
      if (!KEEP_TAGS[tag]) { while (n.firstChild) parent.insertBefore(n.firstChild, n); parent.removeChild(n); continue; }
      var own = KEEP_ATTRS[tag] || {}, attrs = Array.prototype.slice.call(n.attributes);
      for (var j = 0; j < attrs.length; j++) {
        var name = attrs[j].name, low = name.toLowerCase(), v = attrs[j].value;
        if (!own[low] && !KEEP_ATTRS["*"][low]) { n.removeAttribute(name); continue; }
        if (low === "href" || low === "src") {
          var u = safeUrl(v, low === "src" ? "image" : "link");
          if (u == null) n.removeAttribute(name); else if (u !== v) n.setAttribute(low, u);
        } else if (low === "class") {
          var c = v.split(/\s+/).filter(function (x) { return KEEP_CLASS.test(x); }).join(" ");
          if (c) n.setAttribute("class", c); else n.removeAttribute(name);
        } else if (low === "target" && v !== "_blank") n.removeAttribute(name);
      }
      if (tag === "a" && n.getAttribute("target") === "_blank") n.setAttribute("rel", "noopener noreferrer");
      if (tag === "img") { n.setAttribute("loading", "lazy"); n.setAttribute("decoding", "async"); }
    }
  }
  var CONFIG = { sanitizeHtml: null, embedHosts: [] }, HTML_CACHE = new Map();
  function sanitizeHtml(html) {
    var s = html == null ? "" : String(html);
    if (!s) return "";
    var hit = HTML_CACHE.get(s);
    if (hit !== undefined) return hit;
    var out;
    if (CONFIG.sanitizeHtml) out = String(CONFIG.sanitizeHtml(s));
    else if (typeof document === "undefined") out = escHtml(s);
    else { var tpl = document.createElement("template"); tpl.innerHTML = s; scrubHtml(tpl.content); out = tpl.innerHTML; }
    if (HTML_CACHE.size > 400) HTML_CACHE.clear();
    HTML_CACHE.set(s, out);
    return out;
  }
  function configure(o) {
    o = o || {};
    if (typeof o.sanitizeHtml === "function") CONFIG.sanitizeHtml = o.sanitizeHtml;
    if (o.embedHosts) CONFIG.embedHosts = CONFIG.embedHosts.concat(o.embedHosts);
    HTML_CACHE.clear();
    return { sanitizeHtml: !!CONFIG.sanitizeHtml, embedHosts: EMBED_HOSTS.concat(CONFIG.embedHosts) };
  }
  // read a one-time key from the address (a welcome or reset link's ?key=...) and take it out of the address bar and history
  function takeUrlKey(name) {
    name = name || "key";
    try {
      var u = new URL(window.location.href), v = u.searchParams.get(name);
      if (v != null) { u.searchParams.delete(name); window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash); }
      return v;
    } catch (e) { return null; }
  }
  // where to go after signing in: a path on this site only, never another site
  function safeRedirect(target, fallback) {
    var fb = fallback || "/";
    if (typeof target !== "string") return fb;
    var t = target.trim();
    if (!/^\/(?![\/\\])/.test(t) || /[\u0000-\u001f\u007f\\]/.test(t)) return fb;
    try {
      var u = new URL(t, window.location.origin);
      return u.origin === window.location.origin ? u.pathname + u.search + u.hash : fb;
    } catch (e) { return fb; }
  }
  // a lighter look for low-memory phones and data saver: no frosted glass, no endless decorative motion
  function performanceMode() {
    var n = typeof navigator !== "undefined" ? navigator : {}, c = n.connection || {};
    if (c.saveData) return "lite";
    if (n.deviceMemory && n.deviceMemory <= 2) return "lite";
    if (n.hardwareConcurrency && n.hardwareConcurrency <= 2) return "lite";
    return "full";
  }
  function applyPerformanceMode(mode) {
    var m = mode === "lite" || mode === "full" ? mode : performanceMode();
    if (typeof document !== "undefined") document.documentElement.setAttribute("data-perf", m);
    return m;
  }

  // ---- Icon: a 24-unit line icon, stroked in the text colour ----
  // Each entry is a list of shapes: a string is a path, an array is [tag, attributes].
  var ICONS = {
    // getting around
    home: ["M3.5 11 12 4l8.5 7", "M5.5 9.5V20h13V9.5", "M10 20v-5h4v5"],
    courses: ["M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z", "M12 6.5v13"],
    schedule: [["rect", { x: 3.5, y: 5, width: 17, height: 15, rx: 2.5 }], "M3.5 10h17", "M8 3v4", "M16 3v4"],
    profile: [["circle", { cx: 12, cy: 8.5, r: 3.5 }], "M5 20a7 7 0 0 1 14 0"],
    bell: ["M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15Z", "M10 20.5a2 2 0 0 0 4 0"],
    search: [["circle", { cx: 11, cy: 11, r: 6.5 }], "M16 16l4.5 4.5"],
    menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
    close: ["M6 6l12 12", "M18 6 6 18"],
    "arrow-left": ["M19 12H5", "M11 6l-6 6 6 6"],
    "arrow-right": ["M5 12h14", "M13 6l6 6-6 6"],
    "chevron-down": ["M6 9l6 6 6-6"],
    "chevron-right": ["M9 6l6 6-6 6"],
    external: ["M14 4.5h5.5V10", "M19.5 4.5 11 13", "M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10"],
    // kinds of lesson content
    reading: ["M6 3.5h8l4 4v13H6Z", "M14 3.5v4h4", "M9 12h6", "M9 15.5h6"],
    video: [["rect", { x: 3, y: 5.5, width: 18, height: 13, rx: 3 }], "M10.5 9.5v5l4.2-2.5Z"],
    camera: [["rect", { x: 3, y: 7, width: 18, height: 13, rx: 2.5 }], "M8.5 7 10 4.5h4L15.5 7", ["circle", { cx: 12, cy: 13.5, r: 3.5 }]],
    quiz: [["circle", { cx: 12, cy: 12, r: 8.5 }], "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7", "M12 16.8h.01"],
    assignment: [["rect", { x: 5.5, y: 5, width: 13, height: 15.5, rx: 2 }], "M9 3.5h6v3H9Z", "M9 13l2 2 4-4"],
    code: ["M8.5 8 4.5 12l4 4", "M15.5 8l4 4-4 4", "M13.5 5.5l-3 13"],
    live: [["circle", { cx: 12, cy: 12, r: 2 }], "M8.5 8.5a5 5 0 0 0 0 7", "M15.5 8.5a5 5 0 0 1 0 7", "M6 6a8.5 8.5 0 0 0 0 12", "M18 6a8.5 8.5 0 0 1 0 12"],
    discussion: ["M20 11.5a8 7.5 0 0 1-11.6 6.7L4 19.5l1.4-3.9A8 7.5 0 1 1 20 11.5Z", "M8.5 10.5h7", "M8.5 13.5h4.5"],
    certificate: [["circle", { cx: 12, cy: 9.5, r: 5.5 }], "M8.8 13.8 7.5 20.5l4.5-2.5 4.5 2.5-1.3-6.7"],
    // how things stand
    done: [["circle", { cx: 12, cy: 12, r: 8.5 }], "M8 12.5l2.8 2.8L16 10"],
    check: ["M5 12.5l4.5 4.5L19 7.5"],
    lock: [["rect", { x: 5, y: 10.5, width: 14, height: 10, rx: 2.5 }], "M8 10.5V8a4 4 0 0 1 8 0v2.5", "M12 14.5V17"],
    due: [["circle", { cx: 12, cy: 12, r: 8.5 }], "M12 7.5V12l3 2"],
    warning: ["M12 4 21 19.5H3Z", "M12 10v4", "M12 17h.01"],
    info: [["circle", { cx: 12, cy: 12, r: 8.5 }], "M12 11v5", "M12 8h.01"],
    flag: ["M5.5 21V4.5", "M5.5 5h11l-2 4 2 4h-11"],
    pin: ["M9 3.5h6", "M10 3.5v5.2L7 13h10l-3-4.3V3.5", "M12 13v7.5"],
    // doing things
    play: ["M8 5.5v13l10.5-6.5Z"],
    pause: ["M8.5 5.5v13", "M15.5 5.5v13"],
    plus: ["M12 5v14", "M5 12h14"],
    upload: ["M12 15V4.5", "M7.5 9 12 4.5 16.5 9", "M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"],
    download: ["M12 4.5V15", "M7.5 10.5 12 15l4.5-4.5", "M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"],
    trash: ["M4.5 7h15", "M9.5 7V4.5h5V7", "M6.5 7l1 13h9l1-13"],
    settings: ["M4 7h9", "M17 7h3", "M4 17h3", "M11 17h9", ["circle", { cx: 15, cy: 7, r: 2 }], ["circle", { cx: 9, cy: 17, r: 2 }]],
    "sign-out": ["M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14", "M10 12h10", "M16.5 8.5 20 12l-3.5 3.5"],
    retry: ["M19.5 12a7.5 7.5 0 1 1-2.2-5.3", "M19.5 4.5v4h-4"],
    share: [["circle", { cx: 17.5, cy: 5.5, r: 2.5 }], ["circle", { cx: 6.5, cy: 12, r: 2.5 }], ["circle", { cx: 17.5, cy: 18.5, r: 2.5 }], "M8.7 10.7l6.6-3.9", "M8.7 13.3l6.6 3.9"],
    bulb: ["M9.5 18h5", "M10.5 21h3", "M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"],
    shield: ["M12 3 4.5 6v5.5c0 4.6 3.2 8.1 7.5 9.5 4.3-1.4 7.5-4.9 7.5-9.5V6L12 3Z", "M12 8v4.5", "M12 16v.01"],
    copy: [["rect", { x: 8.5, y: 8.5, width: 11, height: 11, rx: 2 }], "M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"],
    file: ["M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8L14 3.5Z", "M14 3.5V8h4.5"],
    mail: [["rect", { x: 3.5, y: 5.5, width: 17, height: 13, rx: 2.5 }], "M4.5 7.5 12 13l7.5-5.5"],
    key: [["circle", { cx: 7.5, cy: 15.5, r: 4 }], "M10.4 12.6 19.5 3.5", "M16 7l2.5 2.5", "M13.5 9.5l2 2"],
    eye: ["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z", ["circle", { cx: 12, cy: 12, r: 3 }]],
    "eye-off": ["M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4", "M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 5.4-1.6", "M9.9 9.9a3 3 0 0 0 4.2 4.2", "M3.5 3.5l17 17"],
    phone: [["rect", { x: 6.5, y: 2.5, width: 11, height: 19, rx: 2.5 }], "M10.5 18.5h3"],
    laptop: [["rect", { x: 4.5, y: 5.5, width: 15, height: 10, rx: 1.5 }], "M2.5 18.5h19"],
    expand: ["M14.5 4.5h5v5", "M19.5 4.5l-6 6", "M9.5 19.5h-5v-5", "M4.5 19.5l6-6"],
    sun: [["circle", { cx: 12, cy: 12, r: 4 }], "M12 2.5v2", "M12 19.5v2", "M2.5 12h2", "M19.5 12h2", "M5.3 5.3l1.4 1.4", "M17.3 17.3l1.4 1.4", "M5.3 18.7l1.4-1.4", "M17.3 6.7l1.4-1.4"],
    moon: ["M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10Z"],
  };

  function Icon(props) {
    var name = props.name, size = props.size || 24, label = props.label;
    var shapes = ICONS[name] || ICONS.info;
    var children = shapes.map(function (s, i) {
      return typeof s === "string" ? h("path", { key: i, d: s }) : h(s[0], Object.assign({ key: i }, s[1]));
    });
    return h("svg", {
      className: "ot-icon" + (props.className ? " " + props.className : ""),
      width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      strokeWidth: props.strokeWidth || 1.8, strokeLinecap: "round", strokeLinejoin: "round",
      role: label ? "img" : undefined, "aria-label": label || undefined, "aria-hidden": label ? undefined : true, focusable: "false",
    }, children);
  }

  // ---- Button ----
  var BUTTON_PROPS = { variant: 1, size: 1, children: 1, icon: 1, iconAfter: 1, iconOnly: 1, loading: 1, disabled: 1, full: 1, href: 1, target: 1, type: 1, onClick: 1, className: 1, style: 1, title: 1 };
  function Button(props) {
    var variant = props.variant || "primary", size = props.size || "md";
    var label = props.children;
    var cls = ["ot-btn", "ot-btn--" + variant, "ot-btn--" + size];
    if (props.iconOnly) cls.push("ot-btn--icon");
    if (props.full) cls.push("ot-btn--full");
    if (props.loading) cls.push("ot-btn--loading");
    if (props.className) cls.push(props.className);
    var iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18;
    var inner = [];
    if (props.loading) inner.push(h("span", { key: "spin", className: "ot-btn__spinner", "aria-hidden": true }));
    else if (props.icon) inner.push(h(Icon, { key: "icon", name: props.icon, size: iconSize }));
    if (!props.iconOnly) inner.push(h("span", { key: "label", className: "ot-btn__label" }, label));
    if (props.iconAfter && !props.iconOnly) inner.push(h(Icon, { key: "after", name: props.iconAfter, size: iconSize }));
    // anything else (aria-*, data-*, onMouseEnter...) passes straight through to the element
    var rest = {};
    for (var k in props) if (!BUTTON_PROPS[k]) rest[k] = props[k];
    var common = Object.assign(rest, {
      className: cls.join(" "),
      "aria-label": props.iconOnly ? (typeof label === "string" ? label : props["aria-label"]) : props["aria-label"],
      "aria-busy": props.loading || undefined,
      title: props.iconOnly && typeof label === "string" ? label : props.title,
      onClick: props.disabled || props.loading ? undefined : props.onClick,
      style: props.style,
    });
    if (props.href && !props.disabled) {
      return h("a", Object.assign(common, { href: props.href, target: props.target, rel: props.target === "_blank" ? "noopener noreferrer" : undefined }), inner);
    }
    return h("button", Object.assign(common, { type: props.type || "button", disabled: props.disabled || undefined }), inner);
  }

  // ---- Backdrop: the sky behind Home and menus, or the quiet ground behind a lesson ----
  function Backdrop(props) {
    var variant = props.variant || "sky";
    return h("div", {
      className: "ot-backdrop ot-backdrop--" + variant + (props.className ? " " + props.className : ""),
      style: props.style,
    }, h("div", { className: "ot-backdrop__content" }, props.children));
  }

  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useId = React.useId;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function uid(prefix) { return prefix + useId().replace(/[^A-Za-z0-9]/g, ""); }
  // the colour for a tone: gold, success or one of the four tracks
  function toneColor(t) { return t === "gold" ? "var(--meter)" : t === "success" ? "var(--success)" : "var(--track-" + t + ")"; }

  // ---- Forms: a label, the control, a hint, an error ----
  function describedBy(id, p) { return [p.hint ? id + "-hint" : null, p.error ? id + "-error" : null].filter(Boolean).join(" ") || undefined; }
  function Field(p) {
    return h("div", { className: cx("ot-field", p.error && "ot-field--error", p.disabled && "ot-field--disabled", p.className) },
      p.label ? h("label", { className: "ot-field__label", htmlFor: p.id }, p.label, p.optional ? h("span", { className: "ot-field__optional" }, " (optional)") : null) : null,
      p.children,
      p.hint ? h("p", { className: "ot-field__hint", id: p.id + "-hint" }, p.hint) : null,
      p.error ? h("p", { className: "ot-field__error", id: p.id + "-error" }, h(Icon, { name: "warning", size: 16 }), h("span", null, p.error)) : null);
  }

  function TextField(p) {
    var auto = uid("f"), id = p.id || auto;
    var icon = p.search ? "search" : p.icon;
    var control = h(p.multiline ? "textarea" : "input", {
      id: id, name: p.name, type: p.multiline ? undefined : p.search ? "search" : p.type || "text",
      value: p.value, defaultValue: p.defaultValue, placeholder: p.placeholder, rows: p.multiline ? p.rows || 4 : undefined,
      disabled: p.disabled, required: p.required, autoComplete: p.autoComplete, inputMode: p.inputMode,
      maxLength: p.maxLength, minLength: p.minLength, autoCapitalize: p.autoCapitalize, spellCheck: p.spellCheck,
      "aria-invalid": p.error ? true : undefined, "aria-describedby": describedBy(id, p), "aria-label": p.label ? undefined : p.placeholder,
      onChange: p.onChange,
    });
    return h(Field, Object.assign({}, p, { id: id }),
      h("div", { className: cx("ot-input", p.search && "ot-input--search", p.multiline && "ot-input--multiline") },
        icon ? h(Icon, { name: icon, size: 20 }) : null, control));
  }

  function Select(p) {
    var auto = uid("f"), id = p.id || auto;
    var opts = (p.options || []).map(function (o) {
      var v = typeof o === "string" ? o : o.value;
      return h("option", { key: v, value: v }, typeof o === "string" ? o : o.label);
    });
    if (p.placeholder) opts.unshift(h("option", { key: "__placeholder", value: "", disabled: true }, p.placeholder));
    var initial = p.value === undefined ? (p.defaultValue !== undefined ? p.defaultValue : p.placeholder ? "" : undefined) : undefined;
    return h(Field, Object.assign({}, p, { id: id }),
      h("div", { className: "ot-input ot-input--select" },
        h("select", { id: id, name: p.name, value: p.value, defaultValue: initial, disabled: p.disabled, required: p.required,
          "aria-invalid": p.error ? true : undefined, "aria-describedby": describedBy(id, p), onChange: p.onChange }, opts),
        h(Icon, { name: "chevron-down", size: 20, className: "ot-input__chevron" })));
  }

  function choice(type, p) {
    var auto = uid("c"), id = p.id || auto;
    return h("label", { className: cx("ot-choice", "ot-choice--" + type, p.disabled && "ot-choice--disabled", p.className), htmlFor: id },
      h("input", { id: id, type: type, className: "ot-choice__input", name: p.name, value: p.value, checked: p.checked, defaultChecked: p.defaultChecked,
        disabled: p.disabled, onChange: p.onChange, "aria-describedby": p.hint ? id + "-hint" : undefined }),
      h("span", { className: "ot-choice__mark", "aria-hidden": true }, type === "checkbox" ? h(Icon, { name: "check", size: 16, strokeWidth: 2.6 }) : null),
      h("span", { className: "ot-choice__text" },
        h("span", { className: "ot-choice__label" }, p.label || p.children),
        p.hint ? h("span", { className: "ot-choice__hint", id: id + "-hint" }, p.hint) : null));
  }
  function Checkbox(p) { return choice("checkbox", p); }
  function Radio(p) { return choice("radio", p); }

  function Switch(p) {
    var auto = uid("s"), id = p.id || auto;
    var st = useState(!!p.defaultChecked), on = p.checked !== undefined ? p.checked : st[0];
    function toggle() {
      if (p.disabled) return;
      if (p.checked === undefined) st[1](!on);
      if (p.onChange) p.onChange(!on);
    }
    return h("div", { className: cx("ot-switch-row", p.disabled && "ot-switch-row--disabled", p.className) },
      h("span", { className: "ot-switch-row__text" },
        h("span", { className: "ot-switch-row__label", id: id + "-label", onClick: toggle }, p.label),
        p.hint ? h("span", { className: "ot-switch-row__hint", id: id + "-hint" }, p.hint) : null),
      h("button", { type: "button", role: "switch", "aria-checked": on, "aria-labelledby": id + "-label", "aria-describedby": p.hint ? id + "-hint" : undefined,
        disabled: p.disabled, className: "ot-switch", onClick: toggle }, h("span", { className: "ot-switch__thumb" })));
  }

  // ---- File upload: a drop zone, then the file and how its upload is going ----
  function fileSize(b) { return b == null ? "" : b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  // does a file match an accept list like ".pdf,application/pdf" or "image/*"?
  var IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|avif)$/i;
  function fileAccepted(file, accept) {
    if (!accept) return true;
    var name = String(file.name || "").toLowerCase(), type = String(file.type || "").toLowerCase();
    return accept.split(",").some(function (a) {
      a = a.trim().toLowerCase();
      if (!a) return false;
      if (a.charAt(0) === ".") return name.slice(-a.length) === a;
      if (a.slice(-2) === "/*") return type ? type.indexOf(a.slice(0, -1)) === 0 : a === "image/*" && IMAGE_EXT.test(name);
      return type === a;
    });
  }
  function FileUpload(p) {
    var state = p.state || "empty", input = useRef(null), auto = uid("u"), id = p.id || auto, drag = useState(false), bad = useState(null);
    var over = state === "dragging" || drag[0];
    function pick(files) {
      var f = files && files[0];
      if (!f) return;
      if (!fileAccepted(f, p.accept)) { bad[1](p.typeError || "That kind of file can't be handed in here. " + (p.hint || "")); return; }
      if (p.maxSize && f.size > p.maxSize) { bad[1]("That file is " + fileSize(f.size) + ". The most you can upload is " + fileSize(p.maxSize) + "."); return; }
      bad[1](null);
      if (p.onPick) p.onPick(f);
    }
    var head = p.label ? h("p", { className: "ot-field__label", id: id + "-label" }, p.label) : null;
    if (state === "empty" || state === "dragging") {
      return h("div", { className: cx("ot-field", p.className) }, head,
        h("div", {
          className: cx("ot-drop", over && "ot-drop--over"), role: "group", "aria-labelledby": p.label ? id + "-label" : undefined,
          onDragOver: function (e) { e.preventDefault(); drag[1](true); },
          onDragLeave: function () { drag[1](false); },
          onDrop: function (e) { e.preventDefault(); drag[1](false); pick(e.dataTransfer.files); },
        },
          h(Icon, { name: "upload", size: 28 }),
          h("p", { className: "ot-drop__text" }, over ? "Drop it to upload" : "Drag a file here, or"),
          over ? null : h(Button, { variant: "secondary", size: "sm", onClick: function () { if (input.current) input.current.click(); } }, "Choose a file"),
          p.hint ? h("p", { className: "ot-drop__hint" }, p.hint) : null,
          h("input", { ref: input, type: "file", accept: p.accept, className: "ot-visually-hidden", tabIndex: -1, "aria-hidden": true, onChange: function (e) { pick(e.target.files); e.target.value = ""; } })),
        bad[0] ? h("p", { className: "ot-field__error", role: "alert" }, h(Icon, { name: "warning", size: 16 }), h("span", null, bad[0])) : null);
    }
    var status = state === "uploading" ? "Uploading, " + Math.round(p.progress || 0) + "%"
      : state === "uploaded" ? "Uploaded" : state === "failed" ? "Upload failed" : "Ready to upload";
    var meta = [fileSize(p.fileSize), status].filter(Boolean).join(" \u00b7 ");
    var action = state === "failed" ? h(Button, { variant: "text", size: "sm", icon: "retry", onClick: p.onRetry }, "Try again")
      : h(Button, { variant: "text", size: "sm", onClick: p.onRemove }, state === "uploading" ? "Cancel" : "Remove");
    return h("div", { className: cx("ot-field", p.className) }, head,
      h("div", { className: cx("ot-file", "ot-file--" + state) },
        h("span", { className: "ot-file__icon", "aria-hidden": true }, h(Icon, { name: state === "uploaded" ? "done" : state === "failed" ? "warning" : "reading", size: 22 })),
        h("div", { className: "ot-file__text" },
          h("span", { className: "ot-file__name" }, p.fileName),
          h("span", { className: "ot-file__meta", role: "status" }, meta),
          state === "uploading" ? h(ProgressBar, { value: p.progress || 0, size: "thin", label: "Uploading " + p.fileName }) : null),
        action,
        state === "failed" && p.error ? h("p", { className: "ot-file__error", role: "alert" }, p.error) : null));
  }

  // ---- Content: cards and list rows ----
  function Card(p) {
    var variant = p.variant || "card", Tag = p.href ? "a" : "article";
    return h(Tag, {
      className: cx("ot-card", "ot-card--" + variant, p.href && "ot-card--interactive", p.className), href: p.href,
      style: Object.assign({}, p.style, p.tone ? { "--tone": "var(--track-" + p.tone + ")" } : null),
    },
      p.media ? h("div", { className: "ot-card__media" }, typeof p.media === "string" ? h("img", { src: p.media, alt: p.mediaAlt || "", loading: "lazy", decoding: "async" }) : p.media) : null,
      h("div", { className: "ot-card__body" },
        p.eyebrow ? h("p", { className: "ot-card__eyebrow" }, p.eyebrow) : null,
        p.title ? h(p.titleAs || "h3", { className: "ot-card__title" }, p.title) : null,
        p.children,
        p.footer ? h("div", { className: "ot-card__footer" }, p.footer) : null));
  }

  function ListRow(p) {
    var Tag = p.locked ? "div" : p.href ? "a" : p.onClick ? "button" : "div";
    var interactive = Tag !== "div";
    return h(Tag, {
      className: cx("ot-row", p.current && "ot-row--current", p.locked && "ot-row--locked", interactive && "ot-row--interactive", p.className),
      href: Tag === "a" ? p.href : undefined, type: Tag === "button" ? "button" : undefined, onClick: interactive ? p.onClick : undefined,
      "aria-current": p.current ? "step" : undefined,
    },
      p.leading || (p.icon ? h("span", { className: "ot-row__icon", "aria-hidden": true }, h(Icon, { name: p.locked ? "lock" : p.icon, size: 20 })) : null),
      h("span", { className: "ot-row__text" },
        h("span", { className: "ot-row__title" }, p.title),
        p.meta ? h("span", { className: "ot-row__meta" }, p.locked ? h("span", { className: "ot-visually-hidden" }, "Locked. ") : null, p.meta) : null),
      p.trailing !== undefined ? h("span", { className: "ot-row__trailing" }, p.trailing)
        : interactive ? h(Icon, { name: "chevron-right", size: 20, className: "ot-row__chevron" }) : null);
  }

  // ---- Avatars ----
  function initials(name) {
    return (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
  }
  function Avatar(p) {
    var size = p.size || 40;
    return h("span", {
      className: cx("ot-avatar", p.className), title: p.name,
      style: { width: size, height: size, fontSize: Math.round(size * (size <= 32 ? 0.34 : 0.38)) },
      role: p.decorative ? undefined : "img", "aria-label": p.decorative ? undefined : p.name, "aria-hidden": p.decorative || undefined,
    }, p.src ? h("img", { src: p.src, alt: "", width: size, height: size, loading: "lazy", decoding: "async" }) : initials(p.name));
  }
  function AvatarStack(p) {
    var people = p.people || [], max = p.max || 3, size = p.size || 32, shown = people.slice(0, max), more = people.length - shown.length;
    return h("span", { className: cx("ot-avatars", p.className), role: "img", "aria-label": p.label || people.map(function (x) { return x.name; }).join(", ") },
      shown.map(function (x, i) { return h(Avatar, { key: i, name: x.name, src: x.src, size: size, decorative: true }); }),
      more > 0 ? h("span", { className: "ot-avatar ot-avatar--more", "aria-hidden": true, style: { width: size, height: size, fontSize: Math.round(size * 0.34) } }, "+" + more) : null);
  }

  // ---- Status: badges, chips and progress ----
  function Badge(p) {
    var tone = p.tone || "neutral";
    return h("span", { className: cx("ot-badge", "ot-badge--" + tone, p.className) },
      tone === "live" ? h("span", { className: "ot-badge__dot", "aria-hidden": true }) : p.icon ? h(Icon, { name: p.icon, size: 14, strokeWidth: 2.2 }) : null,
      p.children);
  }

  function Chip(p) {
    var removable = !!p.onRemove;
    return h("button", {
      type: "button", className: cx("ot-chip", p.selected && !removable && "ot-chip--selected", removable && "ot-chip--removable", p.className),
      "aria-pressed": removable ? undefined : !!p.selected, onClick: removable ? p.onRemove : p.onClick,
      "aria-label": removable && typeof p.children === "string" ? "Remove " + p.children : undefined,
    },
      p.selected && !removable ? h(Icon, { name: "check", size: 16, strokeWidth: 2.2 }) : p.icon ? h(Icon, { name: p.icon, size: 16 }) : null,
      h("span", null, p.children),
      p.count != null ? h("span", { className: "ot-chip__count" }, p.count) : null,
      removable ? h(Icon, { name: "close", size: 14, strokeWidth: 2.2 }) : null);
  }

  function ProgressBar(p) {
    var v = Math.max(0, Math.min(100, p.value || 0));
    return h("div", { className: cx("ot-progress", "ot-progress--" + (p.size || "md"), p.className), style: p.tone ? { "--tone": toneColor(p.tone) } : undefined },
      p.showLabel ? h("div", { className: "ot-progress__head" }, h("span", null, p.label), h("span", { className: "ot-progress__value" }, p.valueText || Math.round(v) + "%")) : null,
      h("div", { className: "ot-progress__track", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(v), "aria-valuetext": p.valueText, "aria-label": p.label },
        h("div", { className: "ot-progress__fill", style: { width: v + "%" } })));
  }

  function ProgressRing(p) {
    var v = Math.max(0, Math.min(100, p.value || 0)), size = p.size || 56, sw = p.strokeWidth || (size >= 56 ? 5 : 4);
    var r = (size - sw) / 2, c = 2 * Math.PI * r, mid = size / 2;
    var center = p.children !== undefined ? p.children : size >= 48 ? Math.round(v) + "%" : null;
    return h("span", {
      className: cx("ot-ring", p.className), role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(v), "aria-label": p.label,
      style: Object.assign({ width: size, height: size }, p.tone ? { "--tone": toneColor(p.tone) } : null),
    },
      h("svg", { width: size, height: size, viewBox: "0 0 " + size + " " + size, "aria-hidden": true },
        h("circle", { className: "ot-ring__track", cx: mid, cy: mid, r: r, strokeWidth: sw }),
        v > 0 ? h("circle", { className: "ot-ring__fill", cx: mid, cy: mid, r: r, strokeWidth: sw, strokeDasharray: c, strokeDashoffset: c * (1 - v / 100), transform: "rotate(-90 " + mid + " " + mid + ")" }) : null),
      center != null ? h("span", { className: "ot-ring__center", "aria-hidden": true, style: { fontSize: Math.max(11, Math.round(size * 0.24)) } }, center) : null);
  }

  function StepDots(p) {
    var n = p.total || 0, cur = p.current || 0, answered = p.answered || [], flagged = p.flagged || [], dots = [];
    for (var i = 0; i < n; i++) {
      var isFlag = flagged.indexOf(i) >= 0, state = i === cur ? "current" : isFlag ? "flagged" : answered.indexOf(i) >= 0 ? "answered" : "empty";
      var label = "Question " + (i + 1) + ({ answered: ", answered", flagged: ", flagged for later", empty: ", not answered", current: isFlag ? ", flagged for later" : "" })[state];
      dots.push(p.onSelect
        ? h("button", { key: i, type: "button", className: "ot-steps__dot ot-steps__dot--" + state, "aria-label": label, "aria-current": i === cur ? "step" : undefined, onClick: p.onSelect.bind(null, i) },
            p.numbered ? i + 1 : null, p.numbered && isFlag ? h(Icon, { name: "flag", size: 12, strokeWidth: 2.4 }) : null)
        : h("span", { key: i, className: "ot-steps__dot ot-steps__dot--" + state }, p.numbered ? i + 1 : null));
    }
    return h("div", {
      className: cx("ot-steps", p.numbered && "ot-steps--numbered", p.className),
      role: p.onSelect ? "group" : "img", "aria-label": p.label || "Question " + (cur + 1) + " of " + n,
    }, dots);
  }

  // ---- Feedback: toasts, alerts, empty, loading and error states ----
  var TONE_ICON = { neutral: "info", info: "info", success: "done", warning: "warning", danger: "warning" };
  function Toast(p) {
    var tone = p.tone || "neutral";
    return h("div", { className: cx("ot-toast", "ot-toast--" + tone, p.className), role: tone === "danger" ? "alert" : "status", style: p.style },
      h("span", { className: "ot-toast__icon", "aria-hidden": true }, h(Icon, { name: p.icon || TONE_ICON[tone], size: 20 })),
      h("div", { className: "ot-toast__text" },
        p.title ? h("p", { className: "ot-toast__title" }, p.title) : null,
        p.children ? h("p", { className: "ot-toast__body" }, p.children) : null),
      p.action ? h(Button, { variant: "text", size: "sm", onClick: p.action.onClick }, p.action.label) : null,
      p.onClose ? h(Button, { variant: "text", size: "sm", iconOnly: true, icon: "close", onClick: p.onClose, className: "ot-quiet" }, "Dismiss") : null);
  }

  function Alert(p) {
    var tone = p.tone || "info";
    return h("div", { className: cx("ot-alert", "ot-alert--" + tone, p.className), role: tone === "danger" ? "alert" : undefined },
      h("span", { className: "ot-alert__icon", "aria-hidden": true }, h(Icon, { name: p.icon || TONE_ICON[tone], size: 20 })),
      h("div", { className: "ot-alert__text" },
        p.title ? h("p", { className: "ot-alert__title" }, p.title) : null,
        p.children ? h("div", { className: "ot-alert__body" }, p.children) : null,
        p.action ? h("div", { className: "ot-alert__action" }, p.action) : null));
  }

  function EmptyState(p) {
    var tone = p.tone || "neutral";
    return h("div", { className: cx("ot-empty", "ot-empty--" + tone, p.compact && "ot-empty--compact", p.className), role: tone === "danger" ? "alert" : undefined },
      h("span", { className: "ot-empty__art", "aria-hidden": true },
        h("svg", { className: "ot-empty__orbit", viewBox: "0 0 120 72", width: 120, height: 72 }, h("ellipse", { cx: 60, cy: 36, rx: 56, ry: 15, transform: "rotate(-14 60 36)" })),
        h("span", { className: "ot-empty__disc" }, h(Icon, { name: p.icon || (tone === "danger" ? "warning" : "info"), size: 28 })),
        // the orbit's near half crosses in front of the disc, so it goes round it rather than behind it
        h("svg", { className: "ot-empty__orbit ot-empty__orbit--front", viewBox: "0 0 120 72", width: 120, height: 72 }, h("path", { d: "M 5.66 49.55 A 56 15 -14 0 0 114.34 22.45" }))),
      h(p.titleAs || "h3", { className: "ot-empty__title" }, p.title),
      p.children ? h("p", { className: "ot-empty__text" }, p.children) : null,
      p.action ? h("div", { className: "ot-empty__action" }, p.action) : null);
  }

  function ErrorState(p) {
    return h(EmptyState, {
      tone: "danger", icon: "warning", title: p.title || "Something went wrong", titleAs: p.titleAs, compact: p.compact, className: p.className,
      action: p.onRetry ? h(Button, { variant: "secondary", icon: "retry", onClick: p.onRetry }, p.retryLabel || "Try again") : p.action,
    }, p.children);
  }

  function Skeleton(p) {
    var shape = p.shape || "line";
    if (shape === "line" && p.lines > 1) {
      var lines = [];
      for (var i = 0; i < p.lines; i++) lines.push(h("span", { key: i, className: "ot-skeleton ot-skeleton--line", style: { width: i === p.lines - 1 ? "60%" : "100%" } }));
      return h("span", { className: cx("ot-skeleton-lines", p.className), "aria-hidden": true }, lines);
    }
    return h("span", { className: cx("ot-skeleton", "ot-skeleton--" + shape, p.className), "aria-hidden": true, style: { width: p.width, height: p.height } });
  }

  // ---- Overlays: dialogs, bottom sheets, menus, tooltips ----
  function useEscape(active, onClose) {
    useEffect(function () {
      if (!active || !onClose) return;
      function key(e) { if (e.key === "Escape") onClose(); }
      document.addEventListener("keydown", key);
      return function () { document.removeEventListener("keydown", key); };
    }, [active, onClose]);
  }
  function overlay(kind, p) {
    var id = uid("d"), panel = useRef(null);
    useEscape(p.open, p.onClose);
    useEffect(function () { if (p.open && !p.inline && panel.current) panel.current.focus(); }, [p.open, p.inline]);
    if (!p.open) return null;
    var close = p.onClose ? h(Button, { variant: "text", size: "sm", iconOnly: true, icon: "close", onClick: p.onClose, className: "ot-quiet ot-" + kind + "__close" }, "Close") : null;
    return h("div", { className: cx("ot-overlay", "ot-overlay--" + kind, p.inline && "ot-overlay--inline") },
      h("div", { className: "ot-overlay__scrim", onClick: p.onClose }),
      h("div", {
        ref: panel, tabIndex: -1, className: cx("ot-" + kind, p.size && "ot-" + kind + "--" + p.size, p.className),
        role: p.tone === "danger" ? "alertdialog" : "dialog", "aria-modal": true, "aria-labelledby": id + "-title",
      },
        kind === "sheet" ? h("span", { className: "ot-sheet__handle", "aria-hidden": true }) : null,
        h("div", { className: "ot-" + kind + "__head" }, h("h2", { className: "ot-" + kind + "__title", id: id + "-title" }, p.title), close),
        p.children ? h("div", { className: "ot-" + kind + "__body" }, p.children) : null,
        p.actions ? h("div", { className: "ot-" + kind + "__actions" }, p.actions) : null));
  }
  function Dialog(p) { return overlay("dialog", p); }
  function BottomSheet(p) { return overlay("sheet", p); }

  function Menu(p) {
    var st = useState(!!p.defaultOpen), open = p.open !== undefined ? p.open : st[0];
    var id = uid("m"), list = useRef(null), btn = useRef(null), wrap = useRef(null);
    function setOpen(v) { if (p.open === undefined) st[1](v); if (p.onOpenChange) p.onOpenChange(v); }
    useEscape(open, function () { setOpen(false); if (btn.current) btn.current.focus(); });
    useEffect(function () {
      if (!open) return;
      function outside(e) { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); }
      document.addEventListener("pointerdown", outside);
      return function () { document.removeEventListener("pointerdown", outside); };
    }, [open]);
    function items() { return list.current ? Array.prototype.slice.call(list.current.querySelectorAll("[role=menuitem]")) : []; }
    function keys(e) {
      var all = items(), i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); (all[i + 1] || all[0]).focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); (all[i - 1] || all[all.length - 1]).focus(); }
      if (e.key === "Tab") setOpen(false);
    }
    var tv = p.triggerVariant || "secondary", ts = p.triggerSize || "md";
    var trigger = h("button", {
      ref: btn, type: "button", className: cx("ot-btn", "ot-btn--" + tv, "ot-btn--" + ts, p.triggerIconOnly && "ot-btn--icon"),
      "aria-haspopup": "menu", "aria-expanded": open, "aria-controls": open ? id : undefined,
      "aria-label": p.triggerIconOnly ? p.label : undefined, title: p.triggerIconOnly ? p.label : undefined,
      onClick: function () { setOpen(!open); },
      onKeyDown: function (e) {
        if (e.key !== "ArrowDown") return;
        e.preventDefault(); setOpen(true);
        setTimeout(function () { var first = items()[0]; if (first) first.focus(); }, 0);
      },
    },
      p.triggerIcon ? h(Icon, { name: p.triggerIcon, size: 18 }) : null,
      p.triggerIconOnly ? null : h("span", null, p.label),
      p.triggerIconOnly ? null : h(Icon, { name: "chevron-down", size: 18 }));
    return h("div", { ref: wrap, className: cx("ot-menu", "ot-menu--" + (p.align || "start"), p.className) }, trigger,
      open ? h("div", { ref: list, id: id, role: "menu", "aria-label": p.label, className: "ot-menu__list", onKeyDown: keys },
        (p.items || []).map(function (it, i) {
          if (it.divider) return h("div", { key: i, className: "ot-menu__divider", role: "separator" });
          return h(it.href ? "a" : "button", {
            key: i, role: "menuitem", tabIndex: -1, href: it.href, type: it.href ? undefined : "button",
            className: cx("ot-menu__item", it.danger && "ot-menu__item--danger"),
            onClick: function () { setOpen(false); if (it.onSelect) it.onSelect(); },
          }, it.icon ? h(Icon, { name: it.icon, size: 20 }) : null, h("span", null, it.label), it.meta ? h("span", { className: "ot-menu__meta" }, it.meta) : null);
        })) : null);
  }

  function Tooltip(p) {
    var id = uid("t"), st = useState(!!p.defaultOpen), open = p.open !== undefined ? p.open : st[0];
    useEscape(open, function () { st[1](false); });
    var child = React.Children.only(p.children);
    var trigger = React.cloneElement(child, {
      "aria-describedby": id,
      onMouseEnter: function () { st[1](true); }, onMouseLeave: function () { st[1](false); },
      onFocus: function () { st[1](true); }, onBlur: function () { st[1](false); },
    });
    return h("span", { className: cx("ot-tip", "ot-tip--" + (p.side || "top"), p.align && p.align !== "center" && "ot-tip--align-" + p.align, p.className) }, trigger,
      h("span", { id: id, role: "tooltip", className: cx("ot-tip__bubble", open && "ot-tip__bubble--open") }, p.label));
  }

  // ---- Navigation: tabs, segmented control, accordion, back link, load more ----
  function rovingKeys(list, value, select, refs, vertical) {
    return function (e) {
      var i = list.findIndex(function (x) { return x.key === value; }), next = null;
      if (e.key === "ArrowRight" || (vertical && e.key === "ArrowDown")) next = list[(i + 1) % list.length];
      if (e.key === "ArrowLeft" || (vertical && e.key === "ArrowUp")) next = list[(i - 1 + list.length) % list.length];
      if (e.key === "Home") next = list[0];
      if (e.key === "End") next = list[list.length - 1];
      if (!next) return;
      e.preventDefault(); select(next.key);
      if (refs.current[next.key]) refs.current[next.key].focus();
    };
  }

  function Tabs(p) {
    var tabs = p.tabs || [], st = useState(p.defaultValue || (tabs[0] && tabs[0].id)), value = p.value !== undefined ? p.value : st[0], refs = useRef({});
    function select(v) { if (p.value === undefined) st[1](v); if (p.onChange) p.onChange(v); }
    var keyed = tabs.map(function (t) { return { key: t.id }; });
    return h("div", { className: cx("ot-tabs", p.className), role: "tablist", "aria-label": p.label, onKeyDown: rovingKeys(keyed, value, select, refs) },
      tabs.map(function (t) {
        var on = t.id === value;
        return h("button", {
          key: t.id, ref: function (el) { refs.current[t.id] = el; }, type: "button", role: "tab", id: t.tabId, "aria-selected": on, "aria-controls": t.panel,
          tabIndex: on ? 0 : -1, className: cx("ot-tab", on && "ot-tab--on"), onClick: function () { select(t.id); },
        }, h("span", null, t.label), t.count != null ? h("span", { className: "ot-tab__count" }, t.count) : null);
      }));
  }

  function SegmentedControl(p) {
    var opts = p.options || [], st = useState(p.defaultValue || (opts[0] && opts[0].value)), value = p.value !== undefined ? p.value : st[0], refs = useRef({});
    function select(v) { if (p.value === undefined) st[1](v); if (p.onChange) p.onChange(v); }
    var keyed = opts.map(function (o) { return { key: o.value }; });
    return h("div", { className: cx("ot-seg", p.full && "ot-seg--full", p.className), role: "radiogroup", "aria-label": p.label, onKeyDown: rovingKeys(keyed, value, select, refs, true) },
      opts.map(function (o) {
        var on = o.value === value;
        return h("button", {
          key: o.value, ref: function (el) { refs.current[o.value] = el; }, type: "button", role: "radio", "aria-checked": on, tabIndex: on ? 0 : -1,
          className: cx("ot-seg__item", on && "ot-seg__item--on"), onClick: function () { select(o.value); },
          "aria-label": o.iconOnly ? o.label : undefined, title: o.iconOnly ? o.label : undefined,
        }, o.icon ? h(Icon, { name: o.icon, size: 18 }) : null, o.iconOnly ? null : h("span", null, o.label));
      }));
  }

  function Accordion(p) {
    var items = p.items || [], st = useState(p.defaultOpen || []), open = st[0], base = uid("a");
    function toggle(key) {
      var on = open.indexOf(key) >= 0;
      st[1](on ? open.filter(function (x) { return x !== key; }) : p.single ? [key] : open.concat([key]));
    }
    return h("div", { className: cx("ot-accordion", p.className) }, items.map(function (it) {
      var on = open.indexOf(it.id) >= 0, panelId = base + "-" + it.id;
      return h("div", { key: it.id, className: cx("ot-acc", on && "ot-acc--open") },
        h(p.headingAs || "h3", { className: "ot-acc__heading" },
          h("button", { type: "button", className: "ot-acc__button", id: panelId + "-button", "aria-expanded": on, "aria-controls": panelId, onClick: function () { toggle(it.id); } },
            h("span", { className: "ot-acc__text" }, h("span", { className: "ot-acc__title" }, it.title), it.meta ? h("span", { className: "ot-acc__meta" }, it.meta) : null),
            it.trailing ? h("span", { className: "ot-acc__trailing" }, it.trailing) : null,
            h(Icon, { name: "chevron-down", size: 20, className: "ot-acc__chevron" }))),
        h("div", { id: panelId, role: "region", "aria-labelledby": panelId + "-button", className: "ot-acc__panel", hidden: !on }, it.children));
    }));
  }

  function BackLink(p) {
    return h(p.as || "a", { href: p.href, onClick: p.onClick, className: cx("ot-back", p.className) },
      h(Icon, { name: "arrow-left", size: 18 }), h("span", null, p.children || "Back"));
  }

  function LoadMore(p) {
    var done = p.shown >= p.total;
    return h("div", { className: cx("ot-more", p.className) },
      h("p", { className: "ot-more__count", role: "status" }, "Showing " + p.shown + " of " + p.total + (p.noun ? " " + p.noun : "")),
      done ? null : h(Button, { variant: "secondary", loading: p.loading, onClick: p.onClick }, p.loading ? "Loading" : p.label || "Load more"));
  }

  // ---- App frame: the brand, top bar, tab bar, shell, notifications, search and connection ----
  var useLayoutEffect = React.useLayoutEffect, useMemo = React.useMemo;

  function useReducedMotion() {
    var mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var st = useState(mq ? mq.matches : false);
    useEffect(function () {
      if (!mq) return;
      function change() { st[1](mq.matches); }
      if (mq.addEventListener) mq.addEventListener("change", change); else mq.addListener(change);
      return function () { if (mq.removeEventListener) mq.removeEventListener("change", change); else mq.removeListener(change); };
    }, []);
    return st[0];
  }

  // the OrbitCore mark, exactly as the website's favicon draws it
  function BrandMark(p) {
    var id = uid("bm");
    return h("svg", { className: "ot-brand__mark", width: p.size || 32, height: p.size || 32, viewBox: "0 0 64 64", "aria-hidden": true },
      h("defs", null, h("radialGradient", { id: id, cx: "38%", cy: "34%", r: "70%" },
        h("stop", { offset: "0", stopColor: "#FFF6CF" }), h("stop", { offset: "0.45", stopColor: "#FFC93C" }), h("stop", { offset: "1", stopColor: "#E8590C" }))),
      h("rect", { width: 64, height: 64, rx: 14, fill: "#0A143E" }),
      h("ellipse", { cx: 32, cy: 33, rx: 25, ry: 8, fill: "none", stroke: "#F6D488", strokeWidth: 2.5, transform: "rotate(-18 32 33)", opacity: 0.9 }),
      h("circle", { cx: 32, cy: 32, r: 14, fill: "url(#" + id + ")" }),
      h("path", { d: "M 10.5 38.5 A 25 8 -18 0 0 53.5 26.5", fill: "none", stroke: "#F6D488", strokeWidth: 2.5, opacity: 0.95 }));
  }
  function Brand(p) {
    var name = p.name || "OrbiTutor";
    return h(p.href ? "a" : "span", { className: cx("ot-brand", p.className), href: p.href, "aria-label": p.href ? name + ", home" : undefined },
      h(BrandMark, { size: p.size }), h("span", { className: "ot-brand__name" }, name));
  }

  function TopBar(p) {
    return h("header", { className: cx("ot-topbar", p.className) },
      h("div", { className: "ot-topbar__inner" },
        h(Brand, { href: p.homeHref === undefined ? "/" : p.homeHref, name: p.name }),
        p.links && p.links.length ? h("nav", { className: "ot-topbar__links", "aria-label": p.label || "Main" },
          p.links.map(function (l, i) {
            return h("a", { key: i, href: l.href, onClick: l.onClick, className: cx("ot-navlink", l.current && "ot-navlink--current"), "aria-current": l.current ? "page" : undefined }, l.label);
          })) : null,
        h("div", { className: "ot-topbar__actions" }, p.search || null, p.actions || null,
          p.menu ? h("div", { className: "ot-topbar__menu" }, p.menu) : null)));
  }

  function SearchButton(p) {
    var label = p.label || "Search courses and lessons", key = p.shortcut === undefined ? "/" : p.shortcut, btn = useRef(null);
    useEffect(function () {
      if (!key) return;
      function press(e) {
        var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
        if (e.key === key && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && btn.current && btn.current.offsetParent) { e.preventDefault(); btn.current.click(); }
      }
      document.addEventListener("keydown", press);
      return function () { document.removeEventListener("keydown", press); };
    }, [key]);
    return h("button", { ref: btn, type: "button", className: cx("ot-searchbtn", p.className), onClick: p.onClick, "aria-label": label, "aria-expanded": p.expanded, "aria-keyshortcuts": key || undefined },
      h(Icon, { name: "search", size: 20 }), h("span", { className: "ot-searchbtn__text", "aria-hidden": true }, label),
      key ? h("kbd", { className: "ot-searchbtn__key", "aria-hidden": true }, key) : null);
  }

  function TabBar(p) {
    return h("nav", { className: cx("ot-tabbar", p.className), "aria-label": p.label || "Main" },
      (p.tabs || []).map(function (t, i) {
        return h("a", { key: t.id || i, href: t.href, onClick: t.onClick, className: cx("ot-tabbar__tab", t.current && "ot-tabbar__tab--current"), "aria-current": t.current ? "page" : undefined },
          h("span", { className: "ot-tabbar__icon", "aria-hidden": true }, h(Icon, { name: t.icon, size: 24 }),
            t.count ? h("span", { className: "ot-count ot-tabbar__count" }, t.count > 9 ? "9+" : t.count) : null),
          h("span", { className: "ot-tabbar__label" }, t.label, t.count ? h("span", { className: "ot-visually-hidden" }, ", " + t.count + " new") : null));
      }),
      p.menu ? h("div", { className: "ot-tabbar__menu" }, p.menu) : null);
  }

  function AppShell(p) {
    var main = p.mainId || "main";
    return h(Backdrop, { variant: p.backdrop || "sky", className: cx("ot-shell", p.className), style: p.style },
      h("a", { className: "ot-skip", href: "#" + main }, "Skip to content"),
      p.topBar || null, p.banner || null,
      h("main", { id: main, tabIndex: -1, className: cx("ot-shell__main", "ot-shell__main--" + (p.width || "default")) }, p.children),
      p.tabBar ? h("div", { className: "ot-shell__tabbar" }, p.tabBar) : null);
  }

  function NotificationBell(p) {
    var st = useState(!!p.defaultOpen), open = p.open !== undefined ? p.open : st[0], wrap = useRef(null), btn = useRef(null), pop = useRef(null), id = uid("n");
    var mt = useState(open), mounted = mt[0], setMounted = mt[1], reduce = useReducedMotion();
    var n = p.count || 0, label = n ? "Notifications, " + n + " unread" : "Notifications";
    function setOpen(v) { if (p.open === undefined) st[1](v); if (p.onOpenChange) p.onOpenChange(v); }
    useEscape(open, function () { setOpen(false); if (btn.current) btn.current.focus(); });
    useEffect(function () {
      if (!open) return;
      function outside(e) { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); }
      document.addEventListener("pointerdown", outside);
      return function () { document.removeEventListener("pointerdown", outside); };
    }, [open]);
    // keep the panel for a moment after it's closed, so it can shrink back into the bell
    useEffect(function () {
      if (open) { setMounted(true); return; }
      var t = setTimeout(function () { setMounted(false); }, reduce ? 150 : 260);
      return function () { clearTimeout(t); };
    }, [open]);
    // the panel grows out of the bell as a circle, like the menu: find the bell's centre from the panel, and how far the circle must reach
    useLayoutEffect(function () {
      var el = pop.current, b = btn.current;
      if (!open || !el || !b) return;
      var a = el.getBoundingClientRect(), c = b.getBoundingClientRect(), ox = c.left + c.width / 2 - a.left, oy = c.top + c.height / 2 - a.top;
      var reach = Math.max(Math.hypot(ox, oy), Math.hypot(a.width - ox, oy), Math.hypot(ox, a.height - oy), Math.hypot(a.width - ox, a.height - oy));
      el.style.setProperty("--ox", ox.toFixed(1) + "px");
      el.style.setProperty("--oy", oy.toFixed(1) + "px");
      el.style.setProperty("--reach", Math.ceil(reach + 4) + "px");
    }, [open]);
    var count = n ? h("span", { className: "ot-count", "aria-hidden": true }, n > 9 ? "9+" : n) : null;
    if (p.href) return h("a", { className: cx("ot-iconbtn", p.className), href: p.href, "aria-label": label, title: "Notifications" }, h(Icon, { name: "bell", size: 22 }), count);
    return h("div", { ref: wrap, className: cx("ot-bell", p.className), "data-open": open },
      h("button", { ref: btn, type: "button", className: "ot-iconbtn", "aria-label": label, title: "Notifications", "aria-expanded": open, "aria-controls": open ? id : undefined, onClick: function () { setOpen(!open); } },
        h(Icon, { name: "bell", size: 22 }), count),
      open || mounted ? h("div", { ref: pop, id: id, className: cx("ot-pop", !open && "ot-pop--closing"), role: "dialog", "aria-label": "Notifications", "aria-hidden": open ? undefined : true },
        h("span", { className: "ot-pop__shadow", "aria-hidden": true }),
        h("div", { className: "ot-pop__sheet" },
          h("div", { className: "ot-pop__head" }, h("h2", { className: "ot-pop__title" }, "Notifications"),
            p.onMarkAllRead && n > 0 ? h(Button, { variant: "text", size: "sm", onClick: p.onMarkAllRead }, "Mark all as read") : null),
          h("div", { className: "ot-pop__body" }, p.children),
          p.seeAllHref ? h("a", { className: "ot-pop__foot", href: p.seeAllHref }, "See all notifications", h(Icon, { name: "arrow-right", size: 18 })) : null)) : null);
  }

  // what each kind of notification looks like: its icon and the colour of its square
  var NOTIFICATION_KINDS = { lesson: ["reading", "neutral"], live: ["live", "live"], marked: ["assignment", "success"], certificate: ["certificate", "gold"], announcement: ["discussion", "neutral"] };
  function NotificationList(p) {
    var items = p.items || [];
    if (!items.length) return h(EmptyState, { compact: true, icon: "bell", title: p.emptyTitle || "You're all caught up", className: p.className }, p.emptyText || "New lessons, live classes and marks will show up here.");
    var groups = [];
    items.forEach(function (it) {
      var g = groups[groups.length - 1];
      if (!g || (it.group || null) !== g.label) groups.push(g = { label: it.group || null, items: [] });
      g.items.push(it);
    });
    var order = 0;
    function row(it, i) {
      var k = NOTIFICATION_KINDS[it.kind] || NOTIFICATION_KINDS.announcement, Tag = it.href && !it.action ? "a" : "div";
      return h("li", { key: it.id || i, style: { "--i": order++ } },
        h(Tag, { href: Tag === "a" ? it.href : undefined, onClick: it.onClick, className: cx("ot-notif", it.unread && "ot-notif--unread") },
          h("span", { className: "ot-notif__icon ot-notif__icon--" + k[1], "aria-hidden": true }, h(Icon, { name: it.icon || k[0], size: 20 })),
          h("span", { className: "ot-notif__text" },
            h("span", { className: "ot-notif__title" }, it.unread ? h("span", { className: "ot-visually-hidden" }, "Unread: ") : null, it.title),
            it.body ? h("span", { className: "ot-notif__body" }, it.body) : null,
            it.time ? h("span", { className: "ot-notif__time" }, it.time) : null,
            it.action ? h("span", { className: "ot-notif__action" }, it.action) : null),
          it.unread ? h("span", { className: "ot-notif__dot", "aria-hidden": true }) : null));
    }
    var HeadTag = p.headingAs || "h3";
    return h("div", { className: cx("ot-notifs", p.className) }, groups.map(function (g, gi) {
      return h("section", { key: gi, className: "ot-notifs__section" },
        g.label ? h(HeadTag, { className: "ot-notifs__group", style: { "--i": order++ } }, g.label) : null,
        h("ul", { className: "ot-notifs__list" }, g.items.map(row)));
    }));
  }

  // search results: the matching part of each title is marked
  function markMatch(text, q) {
    var i = q ? String(text).toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) return text;
    return [text.slice(0, i), h("mark", { key: "m", className: "ot-mark" }, text.slice(i, i + q.length)), text.slice(i + q.length)];
  }
  function SearchPanel(p) {
    var q = p.query || "", id = uid("s"), input = useRef(null), list = useRef(null), variant = p.variant || "dropdown";
    var courses = p.courses || [], lessons = p.lessons || [], any = courses.length + lessons.length > 0;
    useEffect(function () { if (p.autoFocus && input.current) input.current.focus(); }, []);
    useEscape(!!p.onClose, p.onClose);
    function keys(e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      var all = list.current ? Array.prototype.slice.call(list.current.querySelectorAll("a.ot-result")) : [];
      if (!all.length) return;
      e.preventDefault();
      var i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") (all[i + 1] || all[0]).focus();
      else if (i <= 0) input.current.focus(); else all[i - 1].focus();
    }
    function result(r, i, kind) {
      var tone = kind === "course" && r.track ? { "--tone": "var(--track-" + r.track + ")", "--tone-soft": "var(--track-" + r.track + "-soft)" } : undefined;
      return h("li", { key: r.id || i }, h("a", { className: "ot-result", href: r.href, onClick: r.onClick },
        h("span", { className: "ot-result__icon", style: tone, "aria-hidden": true }, h(Icon, { name: r.icon || (kind === "course" ? "courses" : "reading"), size: 20 })),
        h("span", { className: "ot-result__text" },
          h("span", { className: "ot-result__title" }, markMatch(r.title, q)),
          r.meta ? h("span", { className: "ot-result__meta" }, r.meta) : null)));
    }
    function group(title, rows, kind) {
      return rows.length ? h("section", { className: "ot-search__group", "aria-label": title },
        h("h3", { className: "ot-search__heading" }, title, h("span", { className: "ot-search__count" }, rows.length)),
        h("ul", null, rows.map(function (r, i) { return result(r, i, kind); }))) : null;
    }
    var body;
    if (!q) body = h("div", null,
      h("p", { className: "ot-search__hint" }, p.hint || "Search by course, lesson or topic."),
      p.suggestions && p.suggestions.length ? h("div", { className: "ot-search__suggest" }, p.suggestions.map(function (s) {
        return h(Chip, { key: s, icon: "search", onClick: function () { if (p.onQueryChange) p.onQueryChange(s); } }, s);
      })) : null);
    else if (p.loading) body = h("div", { className: "ot-search__loading", "aria-busy": true },
      [0, 1, 2].map(function (i) { return h("div", { key: i, className: "ot-search__skel" }, h(Skeleton, { shape: "block", width: 40, height: 40 }), h(Skeleton, { lines: 2 })); }),
      h("span", { className: "ot-visually-hidden", role: "status" }, "Searching"));
    else if (!any) body = h(EmptyState, { compact: true, icon: "search", title: "No results for \u201c" + q + "\u201d", action: p.noResultsAction },
      p.noResultsText || "Check the spelling, or try a topic like \u201clight\u201d or \u201cPython\u201d.");
    else body = [group("Courses", courses, "course"), group("Lessons", lessons, "lesson"),
      h("span", { key: "n", className: "ot-visually-hidden", role: "status" }, courses.length + lessons.length + " results")];
    return h("div", { className: cx("ot-search", "ot-search--" + variant, p.className), role: variant === "screen" ? "dialog" : "search", "aria-label": "Search", onKeyDown: keys },
      h("div", { className: "ot-search__bar" },
        h("div", { className: "ot-input ot-input--search" }, h(Icon, { name: "search", size: 20 }),
          h("input", { ref: input, type: "search", value: q, placeholder: p.placeholder || "Search courses and lessons", "aria-label": "Search courses and lessons", "aria-controls": id, autoComplete: "off",
            onChange: function (e) { if (p.onQueryChange) p.onQueryChange(e.target.value); } })),
        p.onClose ? h(Button, { variant: "text", size: "sm", onClick: p.onClose }, variant === "screen" ? "Cancel" : "Close") : null),
      h("div", { id: id, ref: list, className: "ot-search__results" }, body));
  }

  function ConnectionBanner(p) {
    var s = p.state || "offline";
    var text = p.children || { offline: "You're offline. Your answers are kept on this device until you reconnect.", reconnecting: "Reconnecting", online: "Back online" }[s];
    return h("div", { className: cx("ot-conn", "ot-conn--" + s, p.className), role: "status" },
      s === "reconnecting" ? h("span", { className: "ot-conn__spin", "aria-hidden": true }) : h(Icon, { name: s === "online" ? "done" : "warning", size: 20 }),
      h("span", { className: "ot-conn__text" }, text),
      s === "offline" && p.onRetry ? h(Button, { variant: "text", size: "sm", icon: "retry", onClick: p.onRetry }, "Try again") : null);
  }

  // ---- OrbitMenu: the website's menu, a little solar system ----
  // Ported from the website's OrbitMenu: tonight's moon at the centre, each link a planet on its
  // own orbit, moonlets circling at Kepler speeds, and items with sub-pages opening their own system.
  function clampNum(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function seeded(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function orbitLayout(W, H, n) {
    var wide = W / H >= 1;
    var R = wide ? clampNum(H * 0.11, 52, 110) : clampNum(W * 0.12, 36, 64);
    var cx0 = wide ? W * 0.2 : W * 0.21, cy0 = wide ? H * 0.24 : H * 0.14;
    var column = cx0 + (wide ? Math.max(R * 2.6, W * 0.24) : Math.max(R * 1.7, W * 0.2));
    var top = wide ? H * 0.36 : H * 0.31, bottom = H * 0.84, dx = column - cx0, orbits = [];
    for (var i = 0; i < n; i++) {
      var y = n === 1 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (n - 1);
      orbits.push({ r: Math.hypot(dx, y - cy0), theta: Math.atan2(y - cy0, dx) });
    }
    var first = orbits.length ? orbits[0].r : R * 4;
    return { W: W, H: H, wide: wide, cx: cx0, cy: cy0, R: R, orbits: orbits, innerRings: [R * 1.75, R * 2.6].filter(function (r) { return r < first - 24; }), dense: false, compact: false };
  }
  function subOrbitLayout(W, H, n) {
    var base = orbitLayout(W, H, n);
    if (n < 8) return base;
    var columns = base.wide ? 2 : 1, perColumn = Math.ceil(n / columns);
    var top = base.wide ? H * 0.3 : H * 0.27, bottom = base.wide ? H * 0.9 : H * 0.93;
    var rowGap = perColumn > 1 ? (bottom - top) / (perColumn - 1) : 0, compact = rowGap < 76;
    var first = base.cx + (!base.wide ? base.R * 0.2 : compact ? base.R * 1.6 : Math.max(base.R * 2.2, W * 0.2));
    var right = W - Math.max(16, W * 0.03), columnWidth = (right - first) / columns, orbits = [];
    for (var i = 0; i < n; i++) {
      var col = Math.floor(i / perColumn), row = i % perColumn, x = first + col * columnWidth, y = perColumn === 1 ? (top + bottom) / 2 : top + row * rowGap;
      orbits.push({ r: Math.hypot(x - base.cx, y - base.cy), theta: Math.atan2(y - base.cy, x - base.cx) });
    }
    var least = Math.min.apply(null, orbits.map(function (o) { return o.r; }));
    return Object.assign({}, base, { orbits: orbits, innerRings: [base.R * 1.75, base.R * 2.6].filter(function (r) { return r < least - 24; }), dense: true, compact: compact, labelWidth: Math.max(120, columnWidth - 16) });
  }
  function allRings(L) { return L.innerRings.concat(L.orbits.map(function (o) { return o.r; })); }
  function orbitPoint(L, o, offset) { var a = o.theta + (offset || 0); return [L.cx + o.r * Math.cos(a), L.cy + o.r * Math.sin(a)]; }
  function placeLinkAt(x, y) { return "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px) translate(-12px, calc(-0.56em - 6px))"; }
  function starDust(W, H) {
    var rand = seeded(20261025), out = [], n = Math.round((W * H) / 3200);
    for (var i = 0; i < n; i++) out.push({ x: rand() * W, y: rand() * H, r: 0.35 + Math.pow(rand(), 3) * 0.9, a: 0.2 + rand() * 0.5 });
    return out;
  }
  function moonletPeriod(r) { return 26 * Math.pow(r / 300, 1.5); }

  // tonight's moon: where it is in its cycle, and the shape of its lit part
  var SYNODIC_MONTH = 29.530588853, REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14), DAY_MS = 86400000;
  var PHASE_NAMES = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
  function moonPhase(date) {
    var age = ((((date.getTime() - REFERENCE_NEW_MOON) / DAY_MS) % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH, q = SYNODIC_MONTH / 4;
    function near(t) { return Math.abs(age - t) < 1; }
    var name = age < 1 || age > SYNODIC_MONTH - 1 ? PHASE_NAMES[0] : near(q) ? PHASE_NAMES[2] : near(2 * q) ? PHASE_NAMES[4] : near(3 * q) ? PHASE_NAMES[6]
      : age < q ? PHASE_NAMES[1] : age < 2 * q ? PHASE_NAMES[3] : age < 3 * q ? PHASE_NAMES[5] : PHASE_NAMES[7];
    var f = age / SYNODIC_MONTH;
    return { f: f, lit: (1 - Math.cos(2 * Math.PI * f)) / 2, name: name };
  }
  function litPath(f, R) {
    var waxing = f < 0.5, k = Math.cos(2 * Math.PI * f), mid = (waxing ? 1 : -1) * R * k;
    return "M 0 " + -R + " A " + R + " " + R + " 0 0 " + (waxing ? 1 : 0) + " 0 " + R + " A " + Math.abs(mid).toFixed(2) + " " + R + " 0 0 " + (mid > 0 ? 0 : 1) + " 0 " + -R + " Z";
  }
  var CRATERS = [[-0.36, -0.3, 0.17], [0.3, -0.44, 0.1], [0.42, 0.12, 0.2], [-0.08, 0.4, 0.13], [-0.58, 0.16, 0.08], [0.06, -0.06, 0.07], [0.12, 0.72, 0.07]];
  function MoonDisc(o) {
    var id = uid("mo"), R = o.R;
    return h("g", null,
      h("defs", null,
        h("radialGradient", { id: id + "g" }, h("stop", { offset: "0", stopColor: "rgb(200,215,255)", stopOpacity: 0.28 }), h("stop", { offset: "0.42", stopColor: "rgb(120,150,255)", stopOpacity: 0.1 }), h("stop", { offset: "1", stopColor: "rgb(80,110,255)", stopOpacity: 0 })),
        h("radialGradient", { id: id + "s", cx: "0.42", cy: "0.38", r: "0.7" }, h("stop", { offset: "0", stopColor: "#E7E9EE" }), h("stop", { offset: "0.65", stopColor: "#C3C7CF" }), h("stop", { offset: "1", stopColor: "#9095A1" })),
        h("clipPath", { id: id + "l" }, h("path", { d: litPath(o.f, R) }))),
      h("circle", { r: R * 2.6, fill: "url(#" + id + "g)" }),
      h("circle", { r: R, fill: "#10183A" }),
      CRATERS.map(function (c, i) { return h("circle", { key: "n" + i, cx: c[0] * R, cy: c[1] * R, r: c[2] * R, fill: "rgba(140,160,220,0.07)" }); }),
      h("g", { clipPath: "url(#" + id + "l)" }, h("circle", { r: R, fill: "url(#" + id + "s)" }),
        CRATERS.map(function (c, i) { return h("circle", { key: "d" + i, cx: c[0] * R, cy: c[1] * R, r: c[2] * R, fill: "rgba(112,118,132,0.24)", stroke: "rgba(255,255,255,0.12)", strokeWidth: Math.max(0.6, R * 0.012) }); })),
      h("circle", { r: R, fill: "none", stroke: "rgba(220,230,255,0.18)", strokeWidth: 1 }));
  }

  // the menu button's icon: a small moon with a gold star circling it (an x once the menu is open)
  var ORBIT_PATH = "M 4 22.5 A 16 6.5 -18 1 1 36 17.5 A 16 6.5 -18 1 1 4 22.5 Z";
  function OrbitIcon(o) {
    var id = uid("oi");
    var svg = h("svg", { className: "ot-orbicon", viewBox: "0 0 40 40", "aria-hidden": true },
      h("defs", null,
        h("radialGradient", { id: id + "m", cx: "0.4", cy: "0.36", r: "0.75" }, h("stop", { offset: "0", stopColor: "#EEF0F4" }), h("stop", { offset: "1", stopColor: "#A6ABB6" })),
        h("clipPath", { id: id + "f" }, h("rect", { x: 0, y: 20, width: 40, height: 20 }))),
      h("circle", { cx: 20, cy: 20, r: 19.5, className: "ot-orbicon__disc" }),
      h("path", { d: ORBIT_PATH, fill: "none", stroke: "rgba(220,230,255,0.45)", strokeWidth: 1 }),
      h("circle", { cx: 20, cy: 20, r: 7.5, fill: "url(#" + id + "m)" }),
      o.open ? h("path", { d: "M 17 17 L 23 23 M 23 17 L 17 23", stroke: "#10183A", strokeWidth: 1.8, strokeLinecap: "round" })
        : h("path", { d: "M 20 12.5 A 7.5 7.5 0 0 0 20 27.5 A 4.6 7.5 0 0 1 20 12.5 Z", fill: "#10183A", opacity: 0.92 }),
      h("path", { d: ORBIT_PATH, fill: "none", stroke: "rgba(220,230,255,0.6)", strokeWidth: 1.1, clipPath: "url(#" + id + "f)" }),
      o.animate ? null : h("circle", { cx: 34, cy: 16, r: 2, className: "ot-orbicon__star" }));
    if (!o.animate) return svg;
    // two eased axes on plain elements, tilted like the orbit: the same path as before, but drawn by the graphics card, not redrawn by the page every frame
    return h("span", { className: "ot-orbicon-wrap", "aria-hidden": true }, svg,
      h("span", { className: "ot-orbicon__orbit" }, h("span", { className: "ot-orbicon__x" }, h("span", { className: "ot-orbicon__y" }, h("span", { className: "ot-orbicon__dot" })))));
  }
  function OrbitTrigger(o) {
    var kind = o.kind || "pill";
    return h("button", Object.assign({ ref: o.buttonRef, type: "button", className: cx("ot-orbit-trigger", "ot-orbit-trigger--" + kind, o.className), style: o.style, onClick: o.onClick,
      "aria-label": kind === "icon" ? o.label : undefined, title: kind === "icon" ? o.label : undefined }, o.attrs),
      h(OrbitIcon, { open: o.open, animate: o.animate }),
      kind === "icon" ? null : h("span", { className: "ot-orbit-trigger__label" }, o.label));
  }

  // links swing in along their orbits, and moonlets circle every orbit (inner ones faster)
  function useOrbitMotion(running, swingIn, L, reduce, linkRefs, moonletRefs, delay) {
    useEffect(function () {
      if (!running || !L) return;
      var rings = allRings(L), start = null, raf = 0, landed = false, landsAt = delay + L.orbits.length * 0.08 + 1.05;
      function frame(now) {
        if (start === null) start = now;
        var t = (now - start) / 1000;
        if (swingIn && !landed) {
          landed = reduce || t > landsAt;
          L.orbits.forEach(function (o, i) {
            var el = linkRefs.current[i];
            if (!el) return;
            var pr = reduce ? 1 : easeOutCubic(clampNum((t - delay - i * 0.08) / 0.95, 0, 1)), pt = orbitPoint(L, o, -(1 - pr) * 0.8);
            el.style.transform = placeLinkAt(pt[0], pt[1]);
            el.style.opacity = String(pr);
          });
        }
        if (!reduce) rings.forEach(function (r, i) {
          var g = moonletRefs.current[i];
          if (g) g.setAttribute("transform", "rotate(" + (((t / moonletPeriod(r)) * 360 + i * 67) % 360).toFixed(2) + " " + L.cx.toFixed(1) + " " + L.cy.toFixed(1) + ")");
        });
        if (!reduce || (swingIn && !landed)) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return function () { cancelAnimationFrame(raf); };
    }, [running, swingIn, L, reduce, delay]);
  }

  function OrbitRings(o) {
    var L = o.L, rings = allRings(L), first = L.innerRings.length;
    return h("g", { className: "ot-orbit__rings", "data-drawn": !!o.drawn, "data-variant": o.variant },
      rings.map(function (r, i) {
        var len = 2 * Math.PI * r;
        return h("circle", { key: "r" + i, className: "ot-orbit__ring", cx: L.cx, cy: L.cy, r: r, "data-active": i - first === o.active,
          style: { "--len": len + "px", strokeDasharray: len + "px", transitionDelay: o.drawn ? ((o.delay || 0) + 0.12 + i * 0.07).toFixed(2) + "s, 0s, 0s" : "0s", transform: "rotate(-150deg)", transformOrigin: L.cx + "px " + L.cy + "px" } });
      }),
      L.orbits.map(function (orb, i) {
        var s = orb.theta - 0.42, pt = orbitPoint(L, orb);
        return h("path", { key: "t" + i, className: "ot-orbit__trail", "data-active": i === o.active,
          d: "M " + (L.cx + orb.r * Math.cos(s)).toFixed(1) + " " + (L.cy + orb.r * Math.sin(s)).toFixed(1) + " A " + orb.r.toFixed(1) + " " + orb.r.toFixed(1) + " 0 0 1 " + pt[0].toFixed(1) + " " + pt[1].toFixed(1) });
      }),
      h("g", { className: "ot-orbit__moonlets" }, rings.map(function (r, i) {
        return h("g", { key: "m" + i, ref: function (el) { o.moonletRefs.current[i] = el; }, transform: "rotate(" + i * 67 + " " + L.cx + " " + L.cy + ")" },
          h("circle", { cx: L.cx + r, cy: L.cy, r: i % 2 ? 1.6 : 2.2, className: "ot-orbit__moonlet" }),
          i === rings.length - 1 ? h("circle", { cx: L.cx - r, cy: L.cy, r: 1.5, fill: "#DCE6FF" }) : null);
      })));
  }

  function OrbitLinks(o) {
    var L = o.L;
    function leave(i) { o.setActive(function (c) { return c === i ? null : c; }); }
    return h("nav", { ref: o.navRef, id: o.id, "aria-label": o.label },
      h("ul", { className: "ot-orbit__list", "data-variant": o.variant || "main", "data-has-active": o.active !== null, "data-dimmed": !!o.dimmed, "data-dense": !!L.dense, "data-compact": !!L.compact,
        style: L.labelWidth ? { "--lw": Math.round(L.labelWidth) + "px" } : undefined },
        o.items.map(function (item, i) {
          var pt = orbitPoint(L, L.orbits[i]), opens = !!o.onOpen && !!(item.children && item.children.length);
          var textWidth = Math.max(140, Math.min(L.labelWidth || Infinity, L.W - pt[0] - 50));
          var shared = {
            ref: function (el) { o.linkRefs.current[i] = el; },
            className: cx("ot-orbit__link", item.current && "ot-orbit__link--current"),
            "data-active": i === o.active, "data-away": i === o.away,
            style: { transform: placeLinkAt(pt[0], pt[1]), opacity: o.swinging ? undefined : 1, "--w": Math.round(textWidth) + "px" },
            onMouseEnter: function () { o.setActive(i); }, onMouseLeave: function () { leave(i); },
            onFocus: function (e) { if (e.currentTarget.matches(":focus-visible")) o.setActive(i); }, onBlur: function () { leave(i); },
          };
          var content = [
            h("span", { key: "p", className: "ot-orbit__planet", "data-ringed": opens, "aria-hidden": true }),
            h("span", { key: "t", className: "ot-orbit__text" },
              h("span", { className: "ot-orbit__label" }, item.label, opens ? h("span", { className: "ot-orbit__more", "aria-hidden": true }, h(Icon, { name: "chevron-right", size: 16, strokeWidth: 2.6 })) : null),
              item.description ? h("span", { className: "ot-orbit__desc" }, item.description) : null)];
          return h("li", { key: item.label + "-" + i }, opens
            ? h("button", Object.assign({ type: "button", "aria-expanded": i === o.away, "aria-controls": o.controls, onClick: function () { o.onOpen(i); } }, shared), content)
            : h("a", Object.assign({ href: item.href, "aria-current": item.current ? "page" : undefined, onClick: function (e) { o.onChoose(item, e); } }, shared), content));
        })));
  }

  function OrbitSystem(o) {
    var S = o.L, r = S.R * 0.6, side = S.cx + r * 1.45 + 14;
    var away = "translate(" + (o.from[0] - S.cx).toFixed(1) + "px, " + (o.from[1] - S.cy).toFixed(1) + "px) scale(" + (7 / r).toFixed(3) + ")";
    var place = S.wide ? { left: S.cx - 150, width: 300, top: S.cy + r + 22, textAlign: "center", alignItems: "center" }
      : { left: side, top: S.cy - 34, width: Math.max(120, S.W - side - 16), alignItems: "flex-start" };
    return h("div", { ref: o.sysRef, className: "ot-orbit__system", "data-system": o.shown ? "here" : "away" },
      h("span", { className: "ot-orbit__glow", style: { background: "radial-gradient(circle at " + S.cx + "px " + S.cy + "px, rgba(255, 168, 60, 0.15), rgba(3, 8, 32, 0) " + Math.round(r * 7) + "px)" } }),
      h("svg", { className: "ot-orbit__sky", width: S.W, height: S.H, "aria-hidden": true }, h(OrbitRings, { L: S, active: o.active, drawn: o.shown, delay: 0.3, moonletRefs: o.moonletRefs, variant: "sub" })),
      h("button", { type: "button", className: "ot-orbit__back", onClick: o.onBack, "aria-label": "Back to the main menu" }, h(Icon, { name: "chevron-right", size: 18, strokeWidth: 2.4, className: "ot-flip" }), "Back"),
      h("span", { className: "ot-orbit__sun", "data-shown": o.shown, "aria-hidden": true, style: { left: S.cx - r, top: S.cy - r, width: 2 * r, height: 2 * r, transform: o.shown ? "none" : away } },
        h("span", { className: "ot-orbit__sun-ring" }), h("span", { className: "ot-orbit__sun-ball" }), h("span", { className: "ot-orbit__sun-ring ot-orbit__sun-ring--front" })),
      h("div", { className: "ot-orbit__subcap", style: place },
        h("h2", { className: "ot-orbit__subtitle" }, o.item.label),
        o.item.description ? h("p", { className: "ot-orbit__subdesc" }, o.item.description) : null,
        o.item.href ? h("a", { className: "ot-orbit__all", href: o.item.href, "aria-label": "See all: " + o.item.label, onClick: function (e) { o.onChoose(o.item, e); } }, "See all", h(Icon, { name: "chevron-right", size: 14, strokeWidth: 2.6 })) : null),
      h(OrbitLinks, { variant: "sub", id: o.id, items: o.item.children, L: S, label: o.item.label, active: o.active, setActive: o.setActive, swinging: o.swinging, linkRefs: o.linkRefs, onChoose: o.onChoose }));
  }

  function OrbitMenu(p) {
    var items = p.items || [], label = p.label || "Menu", kind = p.trigger || "pill", reduce = useReducedMotion(), panelId = uid("om");
    var ph = useState(p.defaultOpen ? "opening" : "closed"), phase = ph[0], setPhase = ph[1];
    var sh = useState(false), shown = sh[0], setShown = sh[1];
    var ac = useState(null), active = ac[0], setActive = ac[1];
    var sz = useState({ W: 1280, H: 800 }), size = sz[0], setSize = sz[1];
    var og = useState(null), origin = og[0], setOrigin = og[1];
    var si = useState(null), subIndex = si[0], setSubIndex = si[1];
    var sp = useState("closed"), subPhase = sp[0], setSubPhase = sp[1];
    var ss = useState(false), subShown = ss[0], setSubShown = ss[1];
    var sa = useState(null), subActive = sa[0], setSubActive = sa[1];
    var triggerRef = useRef(null), overlayRef = useRef(null), navRef = useRef(null), sysRef = useRef(null);
    var linkRefs = useRef([]), moonletRefs = useRef([]), subLinkRefs = useRef([]), subMoonletRefs = useRef([]);
    var closeTimer = useRef(0), subTimer = useRef(0), refocus = useRef(false);
    var visible = phase !== "closed", subOpen = subPhase === "opening";

    var L = useMemo(function () { return orbitLayout(size.W, size.H, items.length); }, [size.W, size.H, items.length]);
    var dust = useMemo(function () { return starDust(size.W, size.H); }, [size.W, size.H]);
    var moon = useMemo(function () { return p.tonightsMoon === false ? null : moonPhase(p.moonDate || new Date()); }, [p.tonightsMoon, p.moonDate, phase]);
    var subItem = subIndex !== null ? items[subIndex] : null;
    var SL = useMemo(function () { return subItem && subItem.children && subItem.children.length ? subOrbitLayout(size.W, size.H, subItem.children.length) : null; }, [size.W, size.H, subItem]);

    function measure() {
      var o = overlayRef.current;
      if (!o) return;
      var r = o.getBoundingClientRect(), t = triggerRef.current ? triggerRef.current.getBoundingClientRect() : null;
      setSize({ W: Math.round(r.width) || 1280, H: Math.round(r.height) || 800 });
      setOrigin(t && t.width ? { left: t.left - r.left, top: t.top - r.top, width: t.width, height: t.height } : null);
    }
    function open() { clearTimeout(closeTimer.current); setActive(null); setPhase("opening"); if (p.onOpenChange) p.onOpenChange(true); }
    function close(returnFocus) {
      setShown(false); setPhase("closing"); refocus.current = returnFocus !== false;
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(function () { setPhase("closed"); setSubIndex(null); setSubPhase("closed"); setSubShown(false); }, reduce ? 200 : 520);
      if (p.onOpenChange) p.onOpenChange(false);
    }
    function enterSub(i) { clearTimeout(subTimer.current); setActive(null); setSubActive(null); setSubIndex(i); setSubShown(false); setSubPhase("opening"); }
    function leaveSub() {
      setSubShown(false); setSubPhase("closing"); clearTimeout(subTimer.current);
      subTimer.current = setTimeout(function () { setSubPhase("closed"); setSubIndex(null); }, reduce ? 150 : 560);
    }
    function choose(item, e) { if (p.onNavigate) p.onNavigate(item, e); close(false); }

    // measure where it opens from, then flip to shown a frame later so the reveal runs
    useLayoutEffect(function () { if (phase === "opening") measure(); }, [phase]);
    useEffect(function () {
      if (phase !== "opening") return;
      var id = requestAnimationFrame(function () { id = requestAnimationFrame(function () { setShown(true); }); });
      return function () { cancelAnimationFrame(id); };
    }, [phase]);
    useEffect(function () {
      if (subPhase !== "opening") return;
      var id = requestAnimationFrame(function () { id = requestAnimationFrame(function () { setSubShown(true); }); });
      return function () { cancelAnimationFrame(id); };
    }, [subPhase, subIndex]);
    useEffect(function () {
      if (!visible) return;
      window.addEventListener("resize", measure);
      var html = document.documentElement, before = html.style.overflow;
      if (!p.inline) html.style.overflow = "hidden";
      return function () { window.removeEventListener("resize", measure); if (!p.inline) html.style.overflow = before; };
    }, [visible]);
    useEffect(function () {
      if (!visible) return;
      function key(e) { if (e.key === "Escape") { e.preventDefault(); if (subOpen) leaveSub(); else close(); } }
      document.addEventListener("keydown", key);
      return function () { document.removeEventListener("keydown", key); };
    }, [visible, subOpen]);
    // (before the focus effects, so focus never lands on something still inert)
    // the main links are set aside while a system is open, and a system only works once it's here
    useEffect(function () { if (navRef.current) navRef.current.inert = subOpen; }, [subOpen, visible]);
    useEffect(function () { if (sysRef.current) sysRef.current.inert = !subShown; }, [subShown, subIndex]);
    // focus: the first link once it's up, into a system and back to its item, and the button again once closed
    useEffect(function () {
      if (!shown) return;
      var id = setTimeout(function () { if (linkRefs.current[0]) linkRefs.current[0].focus({ preventScroll: true }); }, 80);
      return function () { clearTimeout(id); };
    }, [shown]);
    useEffect(function () {
      if (!subShown) return;
      var id = setTimeout(function () { if (subLinkRefs.current[0]) subLinkRefs.current[0].focus({ preventScroll: true }); }, 80);
      return function () { clearTimeout(id); };
    }, [subShown]);
    useEffect(function () { if (subPhase === "closing" && subIndex !== null && linkRefs.current[subIndex]) linkRefs.current[subIndex].focus({ preventScroll: true }); }, [subPhase]);
    useEffect(function () { if (phase === "closed" && refocus.current) { refocus.current = false; if (triggerRef.current) triggerRef.current.focus(); } }, [phase]);
    useEffect(function () { return function () { clearTimeout(closeTimer.current); clearTimeout(subTimer.current); }; }, []);

    useOrbitMotion(visible, shown && phase === "opening", L, reduce, linkRefs, moonletRefs, 0.22);
    useOrbitMotion(SL !== null, subShown && subOpen, SL, reduce, subLinkRefs, subMoonletRefs, 0.5);

    function keys(e) {
      if (e.key === "ArrowLeft" && subOpen) { leaveSub(); return; }
      if (e.key === "Tab") {
        var all = Array.prototype.filter.call(overlayRef.current.querySelectorAll("a[href], button:not([disabled])"), function (el) { return !el.closest("[inert]") && el.getClientRects().length; });
        if (!all.length) return;
        var at = all.indexOf(document.activeElement);
        if (e.shiftKey && at <= 0) { e.preventDefault(); all[all.length - 1].focus(); }
        else if (!e.shiftKey && at === all.length - 1) { e.preventDefault(); all[0].focus(); }
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      var links = (subOpen ? subLinkRefs : linkRefs).current.filter(Boolean), i = links.indexOf(document.activeElement);
      var next = links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length];
      if (next) next.focus();
    }

    var trigger = h(OrbitTrigger, { kind: kind, label: label, animate: !reduce, onClick: open, buttonRef: triggerRef, className: p.className,
      style: Object.assign({}, p.style, visible ? { visibility: "hidden" } : null), attrs: { "aria-expanded": visible, "aria-controls": panelId, "aria-haspopup": "dialog" } });
    if (!visible) return trigger;

    var ox = origin ? origin.left + origin.width / 2 : L.W - 60, oy = origin ? origin.top + origin.height / 2 : 40;
    var reach = Math.hypot(Math.max(ox, L.W - ox), Math.max(oy, L.H - oy)) + 20;
    var foot = [];
    if (p.user) foot.push(h("div", { key: "u", className: "ot-orbit__user" }, h(Avatar, { name: p.user.name, src: p.user.src, size: 40, decorative: true }),
      h("span", { className: "ot-orbit__who" }, h("span", { className: "ot-orbit__name" }, p.user.name), p.user.meta ? h("span", { className: "ot-orbit__meta" }, p.user.meta) : null)));
    if (p.onSignOut) foot.push(h("button", { key: "s", type: "button", className: "ot-orbit__signout", onClick: p.onSignOut }, h(Icon, { name: "sign-out", size: 18 }), "Sign out"));
    if (p.footer) foot.push(h(React.Fragment, { key: "f" }, p.footer));
    var footStyle = kind === "tab" && origin ? { right: Math.max(16, L.W - origin.left + 8), bottom: Math.max(12, L.H - origin.top - origin.height + 8) } : undefined;
    var closeStyle = origin ? { position: "absolute", left: origin.left, top: origin.top, width: origin.width, height: origin.height } : { position: "absolute", right: 20, top: 16 };

    var overlay = h("div", {
      ref: overlayRef, id: panelId, className: cx("ot-orbit", p.inline && "ot-orbit--inline"), "data-theme": "night", role: "dialog", "aria-modal": true, "aria-label": label,
      "data-state": shown ? "open" : "closed", "data-sub": subOpen ? "open" : "closed", onKeyDown: keys,
      style: {
        clipPath: "circle(" + Math.round(shown ? reach : 0) + "px at " + Math.round(ox) + "px " + Math.round(oy) + "px)",
        background: "radial-gradient(circle at " + Math.round(L.cx) + "px " + Math.round(L.cy) + "px, rgba(58,108,244,0.24), rgba(3,8,32,0) " + Math.round(L.R * 5) + "px), radial-gradient(ellipse at 70% 60%, rgba(40,70,170,0.14), rgba(3,8,32,0) 60%), #030820",
      },
    },
      h("svg", { className: "ot-orbit__sky", width: L.W, height: L.H, "aria-hidden": true },
        h("g", { fill: "#FFFFFF" }, dust.map(function (d, i) { return h("circle", { key: i, cx: d.x.toFixed(1), cy: d.y.toFixed(1), r: d.r.toFixed(2), opacity: d.a.toFixed(2) }); })),
        h(OrbitRings, { L: L, active: active, drawn: shown, moonletRefs: moonletRefs, variant: "main" }),
        h("g", { transform: "translate(" + L.cx + " " + L.cy + ")" }, h("g", { className: "ot-orbit__moon" }, h(MoonDisc, { R: L.R, f: moon ? moon.f : 0.5 })))),
      moon ? h("p", { className: "ot-orbit__caption", style: L.wide ? { left: L.cx - 120, width: 240, top: L.cy + L.R + 18, textAlign: "center" } : { left: L.cx + L.R + 14, top: L.cy - 20, width: Math.max(120, L.W - (L.cx + L.R + 14) - 16) } },
        h("b", null, "Tonight\u2019s moon"), moon.name + " \u00b7 " + Math.round(moon.lit * 100) + "% lit") : null,
      h(OrbitLinks, { navRef: navRef, items: items, L: L, label: label, active: active, setActive: setActive, swinging: shown && phase === "opening", linkRefs: linkRefs,
        onChoose: choose, onOpen: enterSub, away: subIndex, dimmed: subOpen, controls: panelId + "-sub" }),
      subItem && SL ? h(OrbitSystem, { id: panelId + "-sub", sysRef: sysRef, item: subItem, from: orbitPoint(L, L.orbits[subIndex]), L: SL, shown: subShown, swinging: subShown && subOpen,
        active: subActive, setActive: setSubActive, linkRefs: subLinkRefs, moonletRefs: subMoonletRefs, onChoose: choose, onBack: leaveSub }) : null,
      h("div", { className: "ot-orbit__foot", style: footStyle }, foot, h("span", { className: "ot-orbit__hint" }, "Press Esc to close")),
      h(OrbitTrigger, { kind: kind, label: "Close", open: true, animate: !reduce, onClick: function () { close(); }, className: "ot-orbit__close", style: closeStyle, attrs: { "aria-label": "Close menu" } }));

    return h(React.Fragment, null, trigger, !p.inline && window.ReactDOM && ReactDOM.createPortal ? ReactDOM.createPortal(overlay, document.body) : overlay);
  }

  // ---- Lessons: the page, its outline, the content blocks Frappe's lesson editor makes, and the end of a lesson ----
  var KIND_WORDS = { reading: "Reading", video: "Video", quiz: "Quiz", assignment: "Assignment", code: "Coding exercise", live: "Live class" };
  function portal(node) { return window.ReactDOM && ReactDOM.createPortal ? ReactDOM.createPortal(node, document.body) : node; }
  function stripTags(s) { return String(s || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim(); }
  function useMedia(query) {
    var mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query) : null;
    var st = useState(mq ? mq.matches : false);
    useEffect(function () {
      if (!mq) return;
      function change() { st[1](mq.matches); }
      change();
      if (mq.addEventListener) mq.addEventListener("change", change); else mq.addListener(change);
      return function () { if (mq.removeEventListener) mq.removeEventListener("change", change); else mq.removeListener(change); };
    }, [query]);
    return st[0];
  }

  // the lesson page: its own slim bar, the outline beside the lesson (a drawer on phones and tablets), and the reading column
  function LessonLayout(p) {
    var wide = useMedia("(min-width: 860px)"), c = p.course || {};
    var sd = useState(p.defaultOutlineOpen !== false), side = sd[0];
    var dr = useState(false), drawer = dr[0], setDrawer = dr[1];
    var open = wide ? side : drawer, outlineId = uid("ol"), drawerRef = useRef(null), toggleRef = useRef(null);
    function toggle() { if (wide) sd[1](!side); else setDrawer(!drawer); }
    function closeDrawer() { setDrawer(false); if (toggleRef.current) toggleRef.current.focus(); }
    useEscape(!wide && drawer, closeDrawer);
    useEffect(function () { if (wide) setDrawer(false); }, [wide]);
    useEffect(function () {
      if (wide || !drawer || !drawerRef.current) return;
      var t = setTimeout(function () {
        var el = drawerRef.current && (drawerRef.current.querySelector("[aria-current='page']") || drawerRef.current.querySelector("button, a[href]"));
        if (el) el.focus({ preventScroll: false });
      }, 60);
      return function () { clearTimeout(t); };
    }, [drawer, wide]);
    var progress = p.progress || null;
    return h(Backdrop, { variant: "reading", className: cx("ot-lesson", open && "ot-lesson--outline", !wide && drawer && "ot-lesson--drawer", p.className), style: p.style },
      h("a", { className: "ot-skip", href: "#" + (p.mainId || "lesson") }, "Skip to the lesson"),
      h("header", { className: "ot-lessonbar" },
        h("a", { className: "ot-iconbtn ot-lessonbar__back", href: c.href, onClick: c.onClick, "aria-label": "Back to the course: " + (c.title || ""), title: "Back to the course" }, h(Icon, { name: "arrow-left", size: 22 })),
        h("div", { className: "ot-lessonbar__course" },
          h("span", { className: "ot-lessonbar__title" }, c.title),
          progress ? h(ProgressBar, { value: progress.value, label: "Your progress in " + (c.title || "this course"), valueText: progress.text, size: "thin" }) : null),
        progress && progress.text ? h("span", { className: "ot-lessonbar__count", "aria-hidden": true }, progress.text) : null,
        h("button", { ref: toggleRef, type: "button", className: "ot-lessonbar__toggle", "aria-expanded": open, "aria-controls": outlineId, onClick: toggle },
          h(Icon, { name: "courses", size: 20 }), h("span", { className: "ot-lessonbar__toggletext" }, "Outline")),
        p.actions || null),
      h("div", { className: "ot-lesson__body" },
        wide ? null : h("div", { className: "ot-lesson__scrim", "aria-hidden": true, onClick: closeDrawer }),
        h("aside", { ref: drawerRef, id: outlineId, className: "ot-lesson__outline", "aria-label": "Course outline", hidden: wide && !side ? true : undefined,
          role: wide ? undefined : "dialog", "aria-modal": wide ? undefined : drawer || undefined },
          wide ? null : h("div", { className: "ot-lesson__drawerhead" },
            h("span", { className: "ot-lesson__drawertitle" }, c.title || "Outline"),
            h(Button, { variant: "text", iconOnly: true, icon: "close", onClick: closeDrawer }, "Close the outline")),
          p.outline),
        h("main", { id: p.mainId || "lesson", tabIndex: -1, className: "ot-lesson__main" },
          h("div", { className: "ot-lesson__column" }, p.children))));
  }

  function CourseOutline(p) {
    var chapters = p.chapters || [], here = null;
    chapters.forEach(function (ch) { (ch.lessons || []).forEach(function (l) { if (l.status === "current") here = ch.id; }); });
    var items = chapters.map(function (ch, ci) {
      var lessons = ch.lessons || [], all = lessons.length, done = lessons.filter(function (l) { return l.status === "done"; }).length, finished = all > 0 && done === all;
      return {
        id: ch.id, title: (ci + 1) + ". " + ch.title, meta: finished ? "All " + all + " done" : done + " of " + all + " done",
        trailing: finished ? h("span", { className: "ot-outline__done", "aria-hidden": true }, h(Icon, { name: "check", size: 16, strokeWidth: 2.6 }))
          : h(ProgressRing, { value: all ? (done / all) * 100 : 0, size: 28, label: ch.title + ": " + done + " of " + all + " lessons done" }),
        children: h("ol", { className: "ot-outline__lessons" }, lessons.map(function (l, li) {
          var status = l.status || "todo", locked = status === "locked", Tag = locked ? "div" : "a";
          var note = status === "done" ? "Done" : locked ? "Locked" : status === "current" ? "You're here" : null;
          return h("li", { key: l.id || li }, h(Tag, { href: locked ? undefined : l.href, onClick: locked ? undefined : l.onClick, className: cx("ot-outrow", "ot-outrow--" + status), "aria-current": status === "current" ? "page" : undefined },
            h("span", { className: "ot-outrow__mark", "aria-hidden": true }, h(Icon, { name: status === "done" ? "check" : locked ? "lock" : l.kind || "reading", size: 16, strokeWidth: status === "done" ? 2.6 : 1.9 })),
            h("span", { className: "ot-outrow__text" },
              h("span", { className: "ot-outrow__title" }, l.title),
              h("span", { className: "ot-outrow__meta" }, [KIND_WORDS[l.kind] || "Reading", l.length].filter(Boolean).join(", ") + (note ? " \u00b7 " + note : "")))));
        })),
      };
    });
    return h("nav", { className: cx("ot-outline", p.className), "aria-label": p.label || "Course outline" },
      h(Accordion, { items: items, defaultOpen: p.defaultOpen || (here ? [here] : chapters.length ? [chapters[0].id] : []), headingAs: p.headingAs || "h2" }));
  }

  function LessonHeader(p) {
    return h("header", { className: cx("ot-lessonhead", p.className) },
      p.eyebrow ? h("p", { className: "ot-lessonhead__eyebrow" }, p.eyebrow) : null,
      h("h1", { className: "ot-lessonhead__title" }, p.title),
      p.kind || p.done ? h("p", { className: "ot-lessonhead__meta" },
        p.kind ? h("span", { className: "ot-lessonhead__kind" }, h(Icon, { name: p.kind, size: 18 }), [KIND_WORDS[p.kind], p.length].filter(Boolean).join(", ")) : null,
        p.done ? h(Badge, { tone: "success", icon: "check" }, "Done") : null) : null);
  }

  // lesson text: headings, paragraphs, lists, links, inline code and tables, in the reading style
  function Prose(p) {
    return h(p.as || "div", { className: cx("ot-prose", p.className), dangerouslySetInnerHTML: p.html ? { __html: sanitizeHtml(p.html) } : undefined }, p.html ? undefined : p.children);
  }

  var CALLOUTS = { tip: ["bulb", "Tip"], note: ["info", "Note"], warning: ["warning", "Watch out"], safety: ["shield", "Safety"] };
  function Callout(p) {
    var tone = CALLOUTS[p.tone] ? p.tone : "tip", c = CALLOUTS[tone];
    return h("aside", { className: cx("ot-callout", "ot-callout--" + tone, p.className), "aria-label": p.title || c[1] },
      h("span", { className: "ot-callout__icon", "aria-hidden": true }, h(Icon, { name: p.icon || c[0], size: 22 })),
      h("div", { className: "ot-callout__body" },
        h("p", { className: "ot-callout__title" }, p.title || c[1]),
        h("div", { className: "ot-callout__text" }, p.children)));
  }

  var LANG_NAMES = { python: "Python", py: "Python", javascript: "JavaScript", js: "JavaScript", typescript: "TypeScript", html: "HTML", xml: "HTML", css: "CSS", cpp: "C++", c: "C", arduino: "Arduino", bash: "Terminal", shell: "Terminal", json: "JSON", java: "Java", sql: "SQL", plaintext: "Text" };
  function CodeBlock(p) {
    var st = useState(false), copied = st[0], timer = useRef(0);
    useEffect(function () { return function () { clearTimeout(timer.current); }; }, []);
    function copy() {
      function done() { st[1](true); clearTimeout(timer.current); timer.current = setTimeout(function () { st[1](false); }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(p.code || "").then(done, done); else done();
    }
    var lang = (p.language || "").toLowerCase();
    return h("figure", { className: cx("ot-code", p.className), "data-theme": "night" },
      h("div", { className: "ot-code__bar" },
        h("span", { className: "ot-code__lang" }, p.title || LANG_NAMES[lang] || p.language || "Code"),
        h("button", { type: "button", className: "ot-code__copy", onClick: copy, "aria-label": copied ? "Copied" : "Copy the code" },
          h(Icon, { name: copied ? "check" : "copy", size: 16, strokeWidth: copied ? 2.4 : 1.8 }), h("span", { "aria-hidden": true }, copied ? "Copied" : "Copy")),
        h("span", { className: "ot-visually-hidden", role: "status" }, copied ? "Copied to the clipboard" : "")),
      h("pre", { className: "ot-code__pre", tabIndex: 0, "aria-label": (LANG_NAMES[lang] || "Code") + " example" },
        p.html ? h("code", { className: "hljs language-" + lang, dangerouslySetInnerHTML: { __html: sanitizeHtml(p.html) } }) : h("code", { className: "hljs language-" + lang }, p.code)),
      p.caption ? h("figcaption", { className: "ot-code__caption" }, p.caption) : null);
  }

  function Figure(p) {
    var st = useState(false), zoom = st[0], btn = useRef(null), closeBtn = useRef(null);
    function shut() { st[1](false); if (btn.current) btn.current.focus(); }
    useEscape(zoom, shut);
    useEffect(function () { if (zoom && closeBtn.current) closeBtn.current.focus(); }, [zoom]);
    var img = h("img", { className: "ot-figure__img", src: p.src, alt: p.alt || "", width: p.width, height: p.height, loading: "lazy", decoding: "async" });
    return h("figure", { className: cx("ot-figure", p.border && "ot-figure--border", p.background && "ot-figure--bg", p.stretched && "ot-figure--wide", p.className) },
      p.zoom === false ? img : h("button", { ref: btn, type: "button", className: "ot-figure__zoom", onClick: function () { st[1](true); }, "aria-label": "Zoom in" + (p.alt ? ": " + p.alt : "") },
        img, h("span", { className: "ot-figure__hint", "aria-hidden": true }, h(Icon, { name: "expand", size: 18 }))),
      p.caption ? h("figcaption", { className: "ot-figure__caption" }, p.caption) : null,
      zoom ? portal(h("div", { className: "ot-lightbox", "data-theme": "night", role: "dialog", "aria-modal": true, "aria-label": p.alt || "Picture",
        onClick: function (e) { if (e.target === e.currentTarget) shut(); } },
        h("img", { className: "ot-lightbox__img", src: p.src, alt: p.alt || "" }),
        p.caption ? h("p", { className: "ot-lightbox__caption" }, p.caption) : null,
        h("button", { ref: closeBtn, type: "button", className: "ot-vbtn ot-lightbox__close", onClick: shut, "aria-label": "Close", title: "Close" }, h(Icon, { name: "close", size: 22 })))) : null);
  }

  // ---- the video player, in the website's style ----
  var PLAYER_LINE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  var PLAYER_ICONS = {
    play: [["path", { d: "M 6.5 4.2 L 15.6 10 L 6.5 15.8 Z", fill: "currentColor", stroke: "currentColor", strokeWidth: 1.4, strokeLinejoin: "round" }]],
    pause: [["rect", { x: 5, y: 4, width: 3.4, height: 12, rx: 1.1, fill: "currentColor" }], ["rect", { x: 11.6, y: 4, width: 3.4, height: 12, rx: 1.1, fill: "currentColor" }]],
    sound: [["path", { d: "M 3.5 7.6 H 6.4 L 10.2 4.4 V 15.6 L 6.4 12.4 H 3.5 Z", fill: "currentColor", stroke: "currentColor", strokeWidth: 1.2, strokeLinejoin: "round" }], ["path", Object.assign({ d: "M 13.2 7.4 Q 14.8 10 13.2 12.6 M 15.6 5.4 Q 18.6 10 15.6 14.6" }, PLAYER_LINE)]],
    muted: [["path", { d: "M 3.5 7.6 H 6.4 L 10.2 4.4 V 15.6 L 6.4 12.4 H 3.5 Z", fill: "currentColor", stroke: "currentColor", strokeWidth: 1.2, strokeLinejoin: "round" }], ["path", Object.assign({ d: "M 13 7.5 L 18 12.5 M 18 7.5 L 13 12.5" }, PLAYER_LINE)]],
    captions: [["rect", Object.assign({ x: 2.6, y: 4.6, width: 14.8, height: 10.8, rx: 2.4 }, PLAYER_LINE)], ["path", Object.assign({ d: "M 9 8.6 Q 8.2 7.9 7.3 8 Q 6 8.2 6 10 Q 6 11.8 7.3 12 Q 8.2 12.1 9 11.4 M 14 8.6 Q 13.2 7.9 12.3 8 Q 11 8.2 11 10 Q 11 11.8 12.3 12 Q 13.2 12.1 14 11.4" }, PLAYER_LINE, { strokeWidth: 1.5 })]],
    full: [["path", Object.assign({ d: "M 3.5 7.5 V 3.5 H 7.5 M 12.5 3.5 H 16.5 V 7.5 M 16.5 12.5 V 16.5 H 12.5 M 7.5 16.5 H 3.5 V 12.5" }, PLAYER_LINE)]],
    exitfull: [["path", Object.assign({ d: "M 7.5 3.5 V 7.5 H 3.5 M 16.5 7.5 H 12.5 V 3.5 M 12.5 16.5 V 12.5 H 16.5 M 3.5 12.5 H 7.5 V 16.5" }, PLAYER_LINE)]],
    back: [["path", Object.assign({ d: "M 4.6 9.2 A 5.6 5.6 0 1 1 6.2 14" }, PLAYER_LINE)], ["path", Object.assign({ d: "M 2.8 6.6 L 4.6 9.6 L 7.6 7.8" }, PLAYER_LINE)]],
  };
  function PlayerIcon(o) {
    return h("svg", { width: o.size || 20, height: o.size || 20, viewBox: "0 0 20 20", "aria-hidden": true, focusable: "false" },
      PLAYER_ICONS[o.name].map(function (s, i) { return h(s[0], Object.assign({ key: i }, s[1])); }));
  }
  function clockText(s) { s = Math.max(0, Math.floor(s || 0)); var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  function spokenTime(s) {
    s = Math.max(0, Math.round(s || 0)); var m = Math.floor(s / 60), r = s % 60, out = [];
    if (m) out.push(m + (m === 1 ? " minute" : " minutes"));
    if (r || !m) out.push(r + (r === 1 ? " second" : " seconds"));
    return out.join(" ");
  }
  function speedText(x) { return String(x).replace(/^0\./, "0.") + "\u00d7"; }
  var SPEEDS = [0.75, 1, 1.25, 1.5, 2];

  function SeekBar(o) {
    var k = o.duration ? clampNum(o.time / o.duration, 0, 1) : 0, b = o.duration ? clampNum(o.buffered / o.duration, 0, 1) : 0;
    function at(e) { var r = e.currentTarget.getBoundingClientRect(); if (o.duration && r.width) o.onSeek(clampNum((e.clientX - r.left) / r.width, 0, 1) * o.duration); }
    function keys(e) {
      var map = { ArrowLeft: o.time - 5, ArrowDown: o.time - 5, ArrowRight: o.time + 5, ArrowUp: o.time + 5, PageDown: o.time - o.duration / 10, PageUp: o.time + o.duration / 10, Home: 0, End: o.duration }, to = map[e.key];
      if (to === undefined || !o.duration) return;
      e.preventDefault(); e.stopPropagation(); o.onSeek(clampNum(to, 0, o.duration));
    }
    return h("div", { className: "ot-seek", role: "slider", tabIndex: 0, "aria-label": "Seek: " + o.title, "aria-valuemin": 0, "aria-valuemax": Math.round(o.duration || 0), "aria-valuenow": Math.round(o.time || 0),
      "aria-valuetext": spokenTime(o.time) + " of " + spokenTime(o.duration), onKeyDown: keys,
      onPointerDown: function (e) { e.currentTarget.setPointerCapture(e.pointerId); at(e); },
      onPointerMove: function (e) { if (e.currentTarget.hasPointerCapture(e.pointerId)) at(e); } },
      h("span", { className: "ot-seek__rail", "aria-hidden": true },
        h("span", { className: "ot-seek__buffered", style: { transform: "scaleX(" + b + ")" } }),
        h("span", { className: "ot-seek__fill", style: { transform: "scaleX(" + k + ")" } })),
      o.duration ? (o.markers || []).map(function (m, i) {
        return h("span", { key: i, className: cx("ot-seek__marker", m.done && "ot-seek__marker--done"), style: { left: (clampNum(m.time / o.duration, 0, 1) * 100) + "%" }, title: "Question at " + clockText(m.time), "aria-hidden": true });
      }) : null,
      h("span", { className: "ot-seek__knobtrack", style: { transform: "translateX(" + k * 100 + "%)" }, "aria-hidden": true }, h("span", { className: "ot-seek__knob" })));
  }

  function VideoPlayer(p) {
    var wrap = useRef(null), vid = useRef(null), quizRef = useRef(null), speedBtn = useRef(null), hide = useRef(0), props = useRef(p);
    props.current = p;
    var s = useState({ playing: false, started: false, ended: false, time: 0, duration: p.duration || 0, buffered: 0, muted: false, captions: !!p.captionsOn, speed: 1, full: false, chrome: true, menu: false, waiting: false });
    var st = s[0];
    function set(patch) { s[1](function (o) { return Object.assign({}, o, patch); }); }
    var qz = useState(null), quiz = qz[0], setQuiz = qz[1];
    var asked = useRef({}), furthest = useRef(0), finished = useRef(false), quizzes = p.quizzes || [];

    useEffect(function () {
      var v = vid.current;
      if (!v) return;
      function on(e) {
        var t = v.currentTime, d = v.duration || 0, pp = props.current;
        if (e.type === "play") set({ playing: true, started: true, ended: false });
        else if (e.type === "pause") set({ playing: false });
        else if (e.type === "ended") {
          set({ playing: false, ended: true });
          if (!finished.current) { finished.current = true; if (pp.onComplete) pp.onComplete(); }
        } else if (e.type === "loadedmetadata" || e.type === "durationchange") set({ duration: isFinite(d) ? d : 0 });
        else if (e.type === "waiting") set({ waiting: true });
        else if (e.type === "playing" || e.type === "canplay") set({ waiting: false });
        else if (e.type === "volumechange") set({ muted: v.muted });
        else if (e.type === "progress" && v.buffered.length) set({ buffered: v.buffered.end(v.buffered.length - 1) });
        else if (e.type === "timeupdate") {
          set({ time: t });
          if (d && t > furthest.current) { furthest.current = t; if (pp.onProgress) pp.onProgress(t / d); }
          // an in-video question: pause on it the first time the video reaches it
          (pp.quizzes || []).forEach(function (q) {
            if (!asked.current[q.time] && !v.paused && t >= q.time && t < q.time + 2) { asked.current[q.time] = true; v.pause(); setQuiz(q); }
          });
        }
      }
      var names = ["play", "pause", "ended", "loadedmetadata", "durationchange", "waiting", "playing", "canplay", "volumechange", "progress", "timeupdate"];
      names.forEach(function (n) { v.addEventListener(n, on); });
      if (v.readyState >= 1 && isFinite(v.duration)) set({ duration: v.duration });
      return function () { names.forEach(function (n) { v.removeEventListener(n, on); }); };
    }, [p.src, p.sources && p.sources[0] && p.sources[0].src]);
    // smooth time while playing (timeupdate only fires a few times a second)
    useEffect(function () {
      if (!st.playing) return;
      // move the bar and the knob directly each frame; re-render the player only when the clock's second changes
      var raf = 0, sec = -1, root = wrap.current, fill = root && root.querySelector(".ot-seek__fill"), knob = root && root.querySelector(".ot-seek__knobtrack");
      function tick() {
        var v = vid.current;
        if (v) {
          var t = v.currentTime, d = v.duration, k = d > 0 && isFinite(d) ? clampNum(t / d, 0, 1) : 0;
          if (fill) fill.style.transform = "scaleX(" + k + ")";
          if (knob) knob.style.transform = "translateX(" + k * 100 + "%)";
          if (Math.floor(t) !== sec) { sec = Math.floor(t); set({ time: t }); }
        }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
      return function () { cancelAnimationFrame(raf); };
    }, [st.playing]);
    // captions: the browser reads the cues, and the player draws them itself, above the controls
    var cp = useState(""), cueText = cp[0];
    useEffect(function () {
      var v = vid.current, tracks = v ? v.textTracks : null;
      if (!tracks || !tracks.length) return;
      for (var i = 0; i < tracks.length; i++) tracks[i].mode = i === 0 ? "hidden" : "disabled";
      var t = tracks[0];
      function change() { var a = t.activeCues, out = []; for (var j = 0; a && j < a.length; j++) out.push(a[j].text); cp[1](out.join("\n")); }
      t.addEventListener("cuechange", change);
      return function () { t.removeEventListener("cuechange", change); };
    }, [p.captions && p.captions.length, p.captions && p.captions[0] && p.captions[0].src]);
    useEffect(function () {
      function change() { set({ full: document.fullscreenElement === wrap.current }); }
      document.addEventListener("fullscreenchange", change);
      return function () { document.removeEventListener("fullscreenchange", change); clearTimeout(hide.current); };
    }, []);
    useEffect(function () { var b = quiz && quizRef.current && quizRef.current.querySelector("button"); if (b) b.focus(); }, [quiz]);
    useEffect(function () {
      if (!st.menu) return;
      function outside(e) { if (wrap.current && !e.target.closest(".ot-video__speedwrap")) set({ menu: false }); }
      document.addEventListener("pointerdown", outside);
      return function () { document.removeEventListener("pointerdown", outside); };
    }, [st.menu]);

    function poke() {
      if (!st.chrome) set({ chrome: true });
      clearTimeout(hide.current);
      hide.current = setTimeout(function () { set({ chrome: false }); }, 2600);
    }
    function play() { var v = vid.current; if (!v) return; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
    function toggle() { var v = vid.current; if (!v || quiz) return; if (v.paused || v.ended) play(); else v.pause(); poke(); }
    function seek(to) {
      var v = vid.current;
      if (!v || !st.duration) return;
      if (p.noSkipping) to = Math.min(to, furthest.current + 0.5);
      v.currentTime = clampNum(to, 0, st.duration);
      set({ time: v.currentTime, ended: false });
    }
    function replay() { asked.current = {}; seek(0); play(); }
    function mute() { var v = vid.current; if (v) v.muted = !v.muted; }
    function speed(x) { var v = vid.current; if (v) v.playbackRate = x; set({ speed: x, menu: false }); if (speedBtn.current) speedBtn.current.focus(); }
    function fullscreen() {
      var el = wrap.current, v = vid.current;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el && el.requestFullscreen) el.requestFullscreen();
      else if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    }
    function answer() { var q = quiz; setQuiz(null); if (p.onQuiz) p.onQuiz(q); }
    function keepWatching() { setQuiz(null); play(); }
    function keys(e) {
      if (quiz || e.altKey || e.ctrlKey || e.metaKey) return;
      var onWrap = e.target === wrap.current || e.target === vid.current, k = e.key.toLowerCase();
      if (st.menu && e.key === "Escape") { e.preventDefault(); set({ menu: false }); if (speedBtn.current) speedBtn.current.focus(); return; }
      if (st.menu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        var items = Array.prototype.slice.call(wrap.current.querySelectorAll(".ot-video__menuitem")), at = items.indexOf(document.activeElement);
        var next = items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
        if (next) next.focus();
        return;
      }
      if (k === "k" || (k === " " && onWrap)) { e.preventDefault(); toggle(); }
      else if (k === "f") { e.preventDefault(); fullscreen(); }
      else if (k === "m") { e.preventDefault(); mute(); }
      else if (k === "c" && p.captions && p.captions.length) { e.preventDefault(); set({ captions: !st.captions }); }
      else if (onWrap && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); seek(st.time + (e.key === "ArrowLeft" ? -5 : 5)); }
      poke();
    }

    var showChrome = !st.playing || st.chrome || st.menu;
    var markers = quizzes.map(function (q) { return { time: q.time, done: !!asked.current[q.time] }; });
    function vbtn(label, icon, onClick, extra) {
      return h("button", Object.assign({ type: "button", className: "ot-vbtn", onClick: onClick, "aria-label": label, title: label }, extra), icon);
    }
    return h("div", { ref: wrap, className: cx("ot-video", st.playing && "ot-video--playing", !showChrome && "ot-video--idle", st.full && "ot-video--full", p.className), "data-theme": "night",
      role: "region", "aria-label": "Video: " + p.title, tabIndex: -1, onKeyDown: keys, onPointerMove: poke, onPointerDown: poke, onFocusCapture: poke },
      h("video", { ref: vid, className: "ot-video__media", src: p.sources ? undefined : p.src, poster: p.poster, preload: p.preload || "metadata", playsInline: true, onClick: toggle, tabIndex: -1 },
        (p.sources || []).map(function (f, i) { return h("source", { key: "s" + i, src: f.src, type: f.type }); }),
        (p.captions || []).map(function (c, i) { return h("track", { key: i, kind: "captions", src: c.src, srcLang: c.srclang || "en", label: c.label || "English" }); })),
      quizzes.length ? h("p", { className: "ot-visually-hidden" }, "This video asks " + quizzes.length + (quizzes.length === 1 ? " question" : " questions") + ", at " + quizzes.map(function (q) { return spokenTime(q.time); }).join(", ") + ".") : null,
      !st.playing && !quiz ? h("button", { type: "button", className: "ot-video__big", onClick: st.ended ? replay : toggle, "aria-label": (st.ended ? "Watch again: " : st.started ? "Resume: " : "Play: ") + p.title },
        h("span", { className: "ot-video__beacon", "aria-hidden": true }), st.ended ? h(PlayerIcon, { name: "back", size: 30 }) : h(PlayerIcon, { name: "play", size: 30 })) : null,
      st.waiting && st.playing ? h("span", { className: "ot-video__wait", "aria-hidden": true }) : null,
      st.captions && cueText && !quiz ? h("div", { className: "ot-video__captions" }, h("span", null, cueText)) : null,
      quiz ? h("div", { ref: quizRef, className: "ot-video__quiz", role: "dialog", "aria-label": "Time for a quick question" },
        h("div", { className: "ot-video__quizcard" },
          h("p", { className: "ot-video__quizeyebrow" }, "Time for a quick question"),
          h("p", { className: "ot-video__quiztitle" }, quiz.title || "Check what you just saw"),
          quiz.text ? h("p", { className: "ot-video__quiztext" }, quiz.text) : null,
          h("div", { className: "ot-video__quizactions" },
            h(Button, { icon: "quiz", onClick: answer }, "Answer now"),
            quiz.required ? null : h(Button, { variant: "secondary", onClick: keepWatching }, "Keep watching")))) : null,
      h("div", { className: "ot-video__console" },
        h(SeekBar, { time: st.time, duration: st.duration, buffered: st.buffered, title: p.title, markers: markers, onSeek: seek }),
        h("div", { className: "ot-video__row" },
          h("button", { type: "button", className: "ot-vbtn ot-vbtn--primary", onClick: st.ended ? replay : toggle, "aria-label": st.playing ? "Pause" : st.ended ? "Watch again" : "Play", title: st.playing ? "Pause (K)" : "Play (K)" },
            h(PlayerIcon, { name: st.playing ? "pause" : st.ended ? "back" : "play", size: 20 })),
          vbtn("Back 10 seconds", h(PlayerIcon, { name: "back" }), function () { seek(st.time - 10); }, { className: "ot-vbtn ot-video__back" }),
          h("span", { className: "ot-video__clock", "aria-hidden": true }, clockText(st.time) + " / " + clockText(st.duration)),
          h("span", { className: "ot-video__gap" }),
          h("span", { className: "ot-video__speedwrap" },
            h("button", { ref: speedBtn, type: "button", className: "ot-vbtn ot-video__speed", "aria-label": "Speed: " + speedText(st.speed), title: "Speed", "aria-haspopup": "menu", "aria-expanded": st.menu, onClick: function () { set({ menu: !st.menu }); } }, speedText(st.speed)),
            st.menu ? h("div", { className: "ot-video__menu", role: "menu", "aria-label": "Speed" }, SPEEDS.map(function (x) {
              return h("button", { key: x, type: "button", role: "menuitemradio", "aria-checked": st.speed === x, className: "ot-video__menuitem", onClick: function () { speed(x); },
                ref: function (el) { if (el && st.speed === x && st.menu && document.activeElement === speedBtn.current) el.focus(); } },
                h("span", null, x === 1 ? "Normal" : speedText(x)), st.speed === x ? h(Icon, { name: "check", size: 16, strokeWidth: 2.4 }) : null);
            })) : null),
          p.captions && p.captions.length ? vbtn("Captions (C)", h(PlayerIcon, { name: "captions" }), function () { set({ captions: !st.captions }); }, { "aria-pressed": st.captions }) : null,
          vbtn(st.muted ? "Unmute (M)" : "Mute (M)", h(PlayerIcon, { name: st.muted ? "muted" : "sound" }), mute),
          vbtn(st.full ? "Exit full screen (F)" : "Full screen (F)", h(PlayerIcon, { name: st.full ? "exitfull" : "full" }), fullscreen))));
  }

  // YouTube and Vimeo show a poster and a play button first, and only load the provider's player when pressed;
  // slides, documents and code sandboxes sit in a framed window with a link to open them on their own
  var EMBED_NAMES = { youtube: "YouTube", vimeo: "Vimeo", cloudflareStream: "Cloudflare Stream", bunnyStream: "Bunny Stream", slides: "Google Slides", slidesPublic: "Google Slides", drive: "Google Drive", docsPublic: "Google Docs", sheetsPublic: "Google Sheets", codepen: "CodePen", codesandbox: "CodeSandbox", github: "GitHub" };
  var EMBED_VIDEO = { youtube: 1, vimeo: 1, cloudflareStream: 1, bunnyStream: 1 };
  // what a lesson may show inside itself; anything else becomes a link that opens on its own. Add more with configure({ embedHosts }).
  var EMBED_HOSTS = ["www.youtube-nocookie.com", "www.youtube.com", "youtube.com", "player.vimeo.com", "iframe.videodelivery.net", "*.cloudflarestream.com",
    "iframe.mediadelivery.net", "player.mediadelivery.net", "docs.google.com", "drive.google.com", "codepen.io", "codesandbox.io", "*.csb.app",
    "phet.colorado.edu", "www.desmos.com", "www.geogebra.org", "wokwi.com", "www.tinkercad.com", "scratch.mit.edu", "trinket.io"];
  function embedHostOk(src) {
    try {
      var u = new URL(src, window.location.href);
      if (u.protocol !== "https:") return false;
      return EMBED_HOSTS.concat(CONFIG.embedHosts).some(function (hst) { return hst.charAt(0) === "*" ? u.hostname.slice(-(hst.length - 1)) === hst.slice(1) : u.hostname === hst; });
    } catch (e) { return false; }
  }
  function Embed(p) {
    var service = p.service || "", name = EMBED_NAMES[service] || p.serviceName || "Another site", video = !!EMBED_VIDEO[service] || p.kind === "video";
    var st = useState(!video), loaded = st[0];
    if (!p.srcDoc && !embedHostOk(p.src)) {
      var away = safeUrl(p.href || p.src, "link"), host = "";
      try { host = new URL(away, window.location.href).hostname; } catch (e) { host = ""; }
      return h("figure", { className: cx("ot-embed ot-embed--page ot-embed--away", p.className) },
        h("div", { className: "ot-embed__bar" }, h(Icon, { name: "external", size: 18 }), h("span", { className: "ot-embed__name" }, p.title || name)),
        h("div", { className: "ot-embed__away" },
          h("p", null, "This opens on " + (host || "another site") + ", outside OrbiTutor."),
          away ? h(Button, { variant: "secondary", size: "sm", href: away, target: "_blank", iconAfter: "external" }, "Open it", h("span", { className: "ot-visually-hidden" }, " in a new tab")) : null),
        p.caption ? h("figcaption", { className: "ot-figure__caption" }, p.caption) : null);
    }
    var frame = function (extra) {
      // a frame never shares this site's origin with what's inside it unless it comes from a known host; inline documents get no origin at all
      return h("iframe", Object.assign({ className: "ot-embed__frame", src: p.srcDoc ? undefined : p.src, srcDoc: p.srcDoc, title: p.title || name, loading: "lazy",
        sandbox: p.srcDoc ? "allow-scripts" : "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms",
        referrerPolicy: "strict-origin-when-cross-origin",
        allow: p.srcDoc ? undefined : video ? "autoplay; fullscreen; picture-in-picture; encrypted-media" : "fullscreen; clipboard-write" }, extra));
    };
    if (video) return h("figure", { className: cx("ot-embed ot-embed--video", p.className) },
      h("div", { className: "ot-embed__screen", "data-theme": "night" },
        loaded ? frame({ src: p.srcDoc ? undefined : p.src + (p.src && p.src.indexOf("?") >= 0 ? "&" : "?") + "autoplay=1" })
          : h("button", { type: "button", className: "ot-embed__start", onClick: function () { st[1](true); }, "aria-label": "Play " + (p.title ? "\u201c" + p.title + "\u201d " : "") + "from " + name },
            p.poster ? h("img", { className: "ot-embed__poster", src: p.poster, alt: "", loading: "lazy", decoding: "async" }) : null,
            h("span", { className: "ot-video__big ot-embed__play", "aria-hidden": true }, h("span", { className: "ot-video__beacon" }), h(PlayerIcon, { name: "play", size: 30 })),
            h("span", { className: "ot-embed__from", "aria-hidden": true }, "Plays from " + name))),
      p.caption ? h("figcaption", { className: "ot-figure__caption" }, p.caption) : null);
    var codey = service === "codepen" || service === "codesandbox" || service === "github";
    return h("figure", { className: cx("ot-embed ot-embed--page", p.className) },
      h("div", { className: "ot-embed__bar" },
        h(Icon, { name: codey ? "code" : "file", size: 18 }),
        h("span", { className: "ot-embed__name" }, p.title || name),
        p.title ? h("span", { className: "ot-embed__service" }, name) : null,
        p.href ? h("a", { className: "ot-embed__open", href: p.href, target: "_blank", rel: "noopener" }, "Open", h("span", { className: "ot-visually-hidden" }, " " + (p.title || name) + " in a new tab"), h(Icon, { name: "external", size: 16 })) : null),
      frame({ style: { aspectRatio: p.aspect || (/docs|sheets|drive/i.test(service) ? "4 / 5" : "16 / 10") } }),
      p.caption ? h("figcaption", { className: "ot-figure__caption" }, p.caption) : null);
  }

  var FILE_KINDS = { PDF: "PDF", ZIP: "ZIP file", STL: "3D model", "3MF": "3D model", INO: "Arduino sketch", PY: "Python file", DOCX: "Word document", PPTX: "PowerPoint", XLSX: "Spreadsheet", PNG: "Picture", JPG: "Picture", JPEG: "Picture", SVG: "Drawing", MP3: "Audio", WAV: "Audio", CSV: "Spreadsheet", TXT: "Text file" };
  function FileBlock(p) {
    var ext = String(p.name || p.href || "").split("?")[0].split(".").pop().toUpperCase();
    if (ext.length > 4) ext = "FILE";
    return h("div", { className: cx("ot-fileblock", p.className) },
      h("span", { className: "ot-fileblock__icon", "aria-hidden": true }, h(Icon, { name: "file", size: 22 }), h("span", { className: "ot-fileblock__ext" }, ext)),
      h("span", { className: "ot-fileblock__text" },
        h("span", { className: "ot-fileblock__name" }, p.title || p.name),
        h("span", { className: "ot-fileblock__meta" }, [p.kind || FILE_KINDS[ext] || ext + " file", p.size ? fileSize(p.size) : null].filter(Boolean).join(" \u00b7 "))),
      h("span", { className: "ot-fileblock__actions" },
        p.openHref ? h(Button, { variant: "text", size: "sm", href: p.openHref, target: "_blank", iconAfter: "external" }, "Open") : null,
        h(Button, { variant: "secondary", size: "sm", icon: "download", href: p.href, download: p.name || true, onClick: p.onDownload }, "Download")));
  }

  // a display formula (the app turns LaTeX into MathML, e.g. with Temml or KaTeX)
  function Formula(p) {
    return h("figure", { className: cx("ot-formula", p.className) },
      h("div", { className: "ot-formula__row" },
        h("div", { className: "ot-formula__math", tabIndex: 0, dangerouslySetInnerHTML: p.html ? { __html: p.html } : undefined }, p.html ? undefined : p.children),
        p.number ? h("span", { className: "ot-formula__no" }, "(" + p.number + ")") : null),
      p.caption ? h("figcaption", { className: "ot-formula__caption" }, p.caption) : null);
  }

  // a quiz, assignment or coding exercise placed inside a lesson
  var ACTIVITY = { quiz: ["quiz", "Quiz"], assignment: ["assignment", "Assignment"], code: ["code", "Coding exercise"] };
  function ActivityCard(p) {
    var kind = ACTIVITY[p.kind] ? p.kind : "quiz", a = ACTIVITY[kind];
    return h("section", { className: cx("ot-activity", "ot-activity--" + kind, p.className), "aria-label": a[1] + ": " + p.title },
      h("span", { className: "ot-activity__icon", "aria-hidden": true }, h(Icon, { name: a[0], size: 24 })),
      h("div", { className: "ot-activity__body" },
        h("p", { className: "ot-activity__eyebrow" }, a[1]),
        h(p.titleAs || "h3", { className: "ot-activity__title" }, p.title),
        p.facts && p.facts.length ? h("ul", { className: "ot-activity__facts" }, p.facts.map(function (f, i) { return h("li", { key: i }, f); })) : null,
        p.children ? h("div", { className: "ot-activity__text" }, p.children) : null,
        p.status ? h("div", { className: "ot-activity__status" }, p.status) : null),
      p.action ? h("div", { className: "ot-activity__action" }, p.action) : null);
  }

  function Checklist(p) {
    var items = p.items || [];
    var st = useState(function () { return items.map(function (it) { return !!it.done; }); }), done = p.done || st[0];
    var count = done.filter(Boolean).length, title = p.title || "Steps", all = items.length;
    function toggle(i) { var next = done.slice(); next[i] = !next[i]; if (!p.done) st[1](next); if (p.onChange) p.onChange(next); }
    return h("section", { className: cx("ot-checklist", count === all && all > 0 && "ot-checklist--all", p.className), "aria-label": title },
      h("div", { className: "ot-checklist__head" },
        h("p", { className: "ot-checklist__title" }, title),
        h("span", { className: "ot-checklist__count" }, count === all && all ? "All done" : count + " of " + all + " done")),
      h(ProgressBar, { value: all ? (count / all) * 100 : 0, label: title + ": " + count + " of " + all + " done", size: "thin", tone: count === all && all ? "success" : undefined }),
      h("ol", { className: "ot-checklist__list" }, items.map(function (it, i) {
        return h("li", { key: i, className: cx("ot-checklist__item", done[i] && "ot-checklist__item--done") },
          h(Checkbox, { label: it.html ? h("span", { dangerouslySetInnerHTML: { __html: sanitizeHtml(it.html) } }) : it.text, hint: it.hint, checked: !!done[i], onChange: function () { toggle(i); } }));
      })));
  }

  // the end of a lesson: Mark as done, held until the video's watched, and done
  function LessonEnd(p) {
    var state = p.state || "ready", body;
    if (state === "done") body = [
      h("span", { key: "d", className: "ot-lessonend__disc ot-lessonend__disc--done", "aria-hidden": true }, h("span", { className: "ot-lessonend__ripple" }), h(Icon, { name: "check", size: 28, strokeWidth: 2.6 })),
      h("div", { key: "t", className: "ot-lessonend__text" }, h("p", { className: "ot-lessonend__title" }, p.title || "Lesson done"), p.children ? h("p", { className: "ot-lessonend__sub" }, p.children) : null),
      p.next ? h(Button, { key: "b", iconAfter: "arrow-right", href: p.next.href, onClick: p.next.onClick }, p.next.label || "Next lesson") : null];
    else if (state === "held") body = [
      h("span", { key: "d", className: "ot-lessonend__disc", "aria-hidden": true }, h(Icon, { name: "video", size: 26 })),
      h("div", { key: "t", className: "ot-lessonend__text" },
        h("p", { className: "ot-lessonend__title" }, p.title || "Watch the video to the end"),
        h("p", { className: "ot-lessonend__sub" }, p.children || "Then this lesson counts as done."),
        p.watched !== undefined ? h(ProgressBar, { value: p.watched, label: "Video watched", valueText: Math.round(p.watched) + "% watched", showLabel: true, size: "thin" }) : null)];
    else body = [
      h("span", { key: "d", className: "ot-lessonend__disc", "aria-hidden": true }, h(Icon, { name: "done", size: 26 })),
      h("div", { key: "t", className: "ot-lessonend__text" }, h("p", { className: "ot-lessonend__title" }, p.title || "Finished this lesson?"), h("p", { className: "ot-lessonend__sub" }, p.children || "Mark it as done to keep your progress.")),
      h(Button, { key: "b", icon: "check", loading: p.loading, onClick: p.onMarkDone }, "Mark as done")];
    return h("section", { className: cx("ot-lessonend", "ot-lessonend--" + state, p.className), "aria-live": "polite", "aria-label": "End of the lesson" }, body);
  }

  function LessonNav(p) {
    function link(o, dir) {
      if (!o) return h("span", { className: "ot-lessonnav__spacer" });
      var locked = !!o.locked, Tag = locked ? "div" : "a";
      return h(Tag, { className: cx("ot-lessonnav__link", "ot-lessonnav__link--" + dir, locked && "ot-lessonnav__link--locked"), href: locked ? undefined : o.href, onClick: locked ? undefined : o.onClick, rel: dir === "prev" ? "prev" : "next" },
        dir === "prev" ? h(Icon, { name: "arrow-left", size: 20 }) : null,
        h("span", { className: "ot-lessonnav__text" },
          h("span", { className: "ot-lessonnav__dir" }, dir === "prev" ? "Previous" : locked ? "Next (opens when this one's done)" : "Next"),
          h("span", { className: "ot-lessonnav__title" }, o.title)),
        dir === "next" ? h(Icon, { name: locked ? "lock" : "arrow-right", size: 20 }) : null);
    }
    return h("nav", { className: cx("ot-lessonnav", p.className), "aria-label": "Previous and next lesson" }, link(p.previous, "prev"), link(p.next, "next"));
  }

  function ChapterComplete(p) {
    var stats = p.stats || [];
    return h("section", { className: cx("ot-chapterdone", p.className), "aria-label": (p.eyebrow || "Chapter done") + ": " + p.title },
      h("div", { className: "ot-chapterdone__art", "aria-hidden": true },
        [0, 1, 2, 3, 4, 5].map(function (i) { return h("span", { key: i, className: "ot-chapterdone__spark", style: { "--a": i * 60 + 18 + "deg", "--i": i } }); }),
        h("span", { className: "ot-chapterdone__ring" }, h(Icon, { name: "check", size: 36, strokeWidth: 2.4 }))),
      h("p", { className: "ot-chapterdone__eyebrow" }, p.eyebrow || "Chapter done"),
      h(p.titleAs || "h2", { className: "ot-chapterdone__title" }, p.title),
      stats.length ? h("ul", { className: "ot-chapterdone__stats" }, stats.map(function (s, i) { return h("li", { key: i }, h("b", null, s.value), h("span", null, s.label)); })) : null,
      p.next ? h("div", { className: "ot-chapterdone__next" },
        h("span", { className: "ot-chapterdone__up" }, h("span", { className: "ot-chapterdone__uplabel" }, "Up next"), h("span", { className: "ot-chapterdone__uptitle" }, p.next.title)),
        h(Button, { iconAfter: "arrow-right", href: p.next.href, onClick: p.next.onClick }, p.next.label || "Start the next chapter")) : null);
  }

  // the course finished: orbits draw in round a gold ringed planet, sparks fly out, and the certificate is ready
  function CourseComplete(p) {
    var sparks = [];
    for (var i = 0; i < 14; i++) sparks.push(h("span", { key: i, className: "ot-celebrate__spark", style: { "--a": (i * 360) / 14 + (i % 2) * 9 + "deg", "--d": 120 + (i % 3) * 46 + "px", "--i": i } }));
    var c = p.certificate;
    return h("section", { className: cx("ot-celebrate", p.inline && "ot-celebrate--inline", p.className), "data-theme": "night", "aria-label": "Course finished" },
      h("div", { className: "ot-celebrate__art", "aria-hidden": true },
        h("svg", { className: "ot-celebrate__orbits", viewBox: "-210 -210 420 420" }, [78, 120, 162, 204].map(function (r, k) {
          return h("circle", { key: r, r: r, style: { "--len": (2 * Math.PI * r).toFixed(1), "--k": k } });
        })),
        h("span", { className: "ot-celebrate__planet" }, h("span", { className: "ot-orbit__sun-ring" }), h("span", { className: "ot-orbit__sun-ball" }), h("span", { className: "ot-orbit__sun-ring ot-orbit__sun-ring--front" })),
        sparks),
      h("div", { className: "ot-celebrate__text" },
        h("p", { className: "ot-celebrate__eyebrow" }, p.eyebrow || "Course finished"),
        h(p.titleAs || "h1", { className: "ot-celebrate__title" }, p.title),
        p.children ? h("p", { className: "ot-celebrate__sub" }, p.children) : null),
      c ? h("div", { className: "ot-cert", role: "img", "aria-label": "Certificate of completion for " + c.name + ", " + c.course + ", " + c.date },
        h("div", { className: "ot-cert__top" }, h(BrandMark, { size: 26 }), h("span", { className: "ot-cert__brand" }, "OrbiTutor")),
        h("p", { className: "ot-cert__kind" }, "Certificate of completion"),
        h("p", { className: "ot-cert__name" }, c.name),
        h("p", { className: "ot-cert__for" }, "for finishing"),
        h("p", { className: "ot-cert__course" }, c.course),
        h("p", { className: "ot-cert__date" }, c.date),
        h("span", { className: "ot-cert__seal" }, h(Icon, { name: "certificate", size: 22 }))) : null,
      p.actions ? h("div", { className: "ot-celebrate__actions" }, p.actions) : null);
  }

  // questions under a lesson: the list of topics, or one topic with its replies
  function Discussion(p) {
    var topic = p.topic, topics = p.topics || [], me = p.me || { name: "You" };
    var tx = useState(""), text = tx[0], ti = useState(""), title = ti[0], ask = useState(!!p.defaultAsking), asking = ask[0];
    var HeadTag = p.headingAs || "h2";
    function submit(e) {
      e.preventDefault();
      if (topic) { if (!text.trim()) return; if (p.onReply) p.onReply(text.trim()); tx[1](""); }
      else { if (!title.trim()) return; if (p.onAsk) p.onAsk({ title: title.trim(), text: text.trim() }); ti[1](""); tx[1](""); ask[1](false); }
    }
    function post(m, i, first) {
      return h("article", { key: m.id || i, className: cx("ot-post", m.instructor && "ot-post--instructor", first && "ot-post--question") },
        h(Avatar, { name: m.author, src: m.src, size: first ? 44 : 36, decorative: true }),
        h("div", { className: "ot-post__body" },
          h("p", { className: "ot-post__by" }, h("span", { className: "ot-post__name" }, m.author), m.instructor ? h(Badge, { tone: "gold" }, "Instructor") : null, h("span", { className: "ot-post__time" }, m.time)),
          first && topic ? h("h3", { className: "ot-post__title" }, topic.title) : null,
          m.text ? h("div", { className: "ot-post__text" }, m.text) : null));
    }
    var composer = topic || asking ? h("form", { method: "post", className: "ot-composer", onSubmit: submit },
      h(Avatar, { name: me.name, src: me.src, size: 36, decorative: true }),
      h("div", { className: "ot-composer__fields" },
        topic ? null : h(TextField, { label: "Your question", maxLength: 140, value: title, onChange: function (e) { ti[1](e.target.value); }, placeholder: "What would you like to ask?" }),
        h(TextField, { label: topic ? "Your reply" : "More detail", optional: !topic, multiline: true, rows: 3, maxLength: 10000, value: text, onChange: function (e) { tx[1](e.target.value); },
          hint: topic ? undefined : "Your instructors and classmates in this batch will see it." }),
        h("div", { className: "ot-composer__actions" },
          topic ? null : h(Button, { variant: "text", size: "sm", onClick: function () { ask[1](false); } }, "Cancel"),
          h(Button, { type: "submit", size: "sm", disabled: topic ? !text.trim() : !title.trim() }, topic ? "Post reply" : "Post question")))) : null;
    if (topic) {
      var replies = topic.replies || [];
      return h("section", { className: cx("ot-discuss", p.className), "aria-label": "Question: " + topic.title },
        h("button", { type: "button", className: "ot-back", onClick: p.onBack }, h(Icon, { name: "arrow-left", size: 18 }), h("span", null, "All questions")),
        post(topic, 0, true),
        h(HeadTag, { className: "ot-discuss__count" }, replies.length ? replies.length + (replies.length === 1 ? " reply" : " replies") : "No replies yet"),
        h("div", { className: "ot-discuss__replies" }, replies.map(function (m, i) { return post(m, i, false); })),
        composer);
    }
    return h("section", { className: cx("ot-discuss", p.className), "aria-label": p.title || "Questions about this lesson" },
      h("div", { className: "ot-discuss__head" },
        h(HeadTag, { className: "ot-discuss__title" }, p.title || "Questions about this lesson", topics.length ? h("span", { className: "ot-discuss__badge" }, topics.length) : null),
        asking ? null : h(Button, { variant: "secondary", size: "sm", icon: "plus", onClick: function () { ask[1](true); } }, "Ask a question")),
      composer,
      topics.length ? h("ul", { className: "ot-topics" }, topics.map(function (t, i) {
        return h("li", { key: t.id || i }, h(t.href ? "a" : "button", { type: t.href ? undefined : "button", href: t.href, className: "ot-topic", onClick: function (e) { if (p.onOpen) p.onOpen(t, e); } },
          h(Avatar, { name: t.author, src: t.src, size: 36, decorative: true }),
          h("span", { className: "ot-topic__text" },
            h("span", { className: "ot-topic__title" }, t.title),
            h("span", { className: "ot-topic__meta" }, h("span", null, t.author + " \u00b7 " + t.time),
              t.instructorReplied ? h(Badge, { tone: "gold", icon: "check" }, "Instructor replied") : null)),
          h("span", { className: "ot-topic__count" }, h(Icon, { name: "discussion", size: 16 }), String(t.replyCount || 0),
            h("span", { className: "ot-visually-hidden" }, t.replyCount === 1 ? " reply" : " replies"))));
      })) : asking ? null : h(EmptyState, { compact: true, icon: "discussion", title: "No questions yet", titleAs: "h3",
        action: h(Button, { variant: "secondary", size: "sm", icon: "plus", onClick: function () { ask[1](true); } }, "Ask a question") },
        "Stuck on something? Ask it here, and your instructor will answer."));
  }

  var LOCKED_WORDS = {
    order: ["This lesson is locked", "Finish the lessons before it to open this one."],
    enrol: ["Join the course to open this lesson", "You can see what's in it, but its lessons open once you're enrolled in a batch."],
    missing: ["Lesson not found", "There's no lesson at this address in this course."],
  };
  function LockedLesson(p) {
    var reason = LOCKED_WORDS[p.reason] ? p.reason : "order", w = LOCKED_WORDS[reason];
    return h(EmptyState, { icon: reason === "missing" ? "search" : "lock", title: p.title || w[0], titleAs: p.titleAs || "h1", action: p.action, className: cx("ot-locked", p.className) }, p.children || w[1]);
  }

  // Frappe Learning's lesson content (Editor.js blocks) drawn with these components
  var CALLOUT_LEAD = /^\s*(?:<(?:b|strong)>\s*)?(Tip|Note|Warning|Watch out|Safety)\s*:\s*(?:<\/(?:b|strong)>)?\s*/i;
  var CALLOUT_TONES = { tip: "tip", note: "note", warning: "warning", "watch out": "warning", safety: "safety" };
  var CHECK_LEAD = /^\s*\[( |x|X)\]\s*/;
  var VIDEO_TYPES = { mov: 1, mp4: 1, avi: 1, mkv: 1, webm: 1 }, AUDIO_TYPES = { mp3: 1, wav: 1, ogg: 1 }, IMAGE_TYPES = { png: 1, jpg: 1, jpeg: 1, gif: 1, webp: 1, svg: 1 };
  // Frappe Learning keeps a YouTube embed as the bare video id (it plays it with its own player)
  function embedSrc(d) {
    var e = String(d.embed || "");
    if (d.service === "youtube" && /^[\w-]{11}$/.test(e)) return "https://www.youtube-nocookie.com/embed/" + e;
    return e;
  }
  function LessonBlocks(p) {
    var blocks = (p.data && p.data.blocks) || p.blocks || [], render = p.render || {};
    function clean(html) { return { __html: p.sanitize ? p.sanitize(html || "") : sanitizeHtml(html) }; }
    function listItems(items, ordered) {
      return items.map(function (it, i) {
        var text = typeof it === "string" ? it : it.content, kids = it && it.items && it.items.length ? h(ordered ? "ol" : "ul", null, listItems(it.items, ordered)) : null;
        return h("li", { key: i }, h("span", { dangerouslySetInnerHTML: clean(text) }), kids);
      });
    }
    return h(Prose, { className: p.className }, blocks.map(function (b, i) {
      var d = b.data || {}, key = b.id || i;
      if (render[b.type]) return h(React.Fragment, { key: key }, render[b.type](b));
      switch (b.type) {
        case "header": return h("h" + Math.min(4, Math.max(2, d.level || 2)), { key: key, dangerouslySetInnerHTML: clean(d.text) });
        case "paragraph": {
          var lead = CALLOUT_LEAD.exec(d.text || "");
          if (lead) return h(Callout, { key: key, tone: CALLOUT_TONES[lead[1].toLowerCase()] }, h("p", { dangerouslySetInnerHTML: clean(d.text.slice(lead[0].length)) }));
          var math = /^\s*\$\$([\s\S]+)\$\$\s*$/.exec(stripTags(d.text));
          if (math && p.renderMath) return h(Formula, { key: key, html: p.renderMath(math[1]) });
          return h("p", { key: key, dangerouslySetInnerHTML: clean(d.text) });
        }
        case "list": {
          var items = d.items || [], flat = items.map(function (it) { return stripTags(typeof it === "string" ? it : it.content); });
          if (flat.length && flat.every(function (t) { return CHECK_LEAD.test(t); })) return h(Checklist, { key: key, title: p.checklistTitle,
            items: items.map(function (it) { var html = typeof it === "string" ? it : it.content; return { html: html.replace(/\[( |x|X)\]\s*/, ""), done: /\[(x|X)\]/.test(html) }; }) });
          return h(d.style === "ordered" ? "ol" : "ul", { key: key }, listItems(items, d.style === "ordered"));
        }
        case "table": {
          var rows = d.content || [], head = d.withHeadings && rows.length ? rows[0] : null, body = head ? rows.slice(1) : rows;
          return h("div", { key: key, className: "ot-table", tabIndex: 0, role: "region", "aria-label": "Table" }, h("table", null,
            head ? h("thead", null, h("tr", null, head.map(function (c, j) { return h("th", { key: j, scope: "col", dangerouslySetInnerHTML: clean(c) }); }))) : null,
            h("tbody", null, body.map(function (row, r) { return h("tr", { key: r }, row.map(function (c, j) { return h("td", { key: j, dangerouslySetInnerHTML: clean(c) }); })); }))));
        }
        case "codeBox": case "code": return h(CodeBlock, { key: key, code: d.code, language: d.language, html: p.highlight ? p.highlight(d.code || "", d.language) : undefined });
        case "image": return h(Figure, { key: key, src: d.url, alt: stripTags(d.caption), caption: d.caption ? h("span", { dangerouslySetInnerHTML: clean(d.caption) }) : null, border: d.withBorder, background: d.withBackground, stretched: d.stretched });
        case "upload": {
          var type = String(d.file_type || "").toLowerCase(), url = d.file_url, name = String(url || "").split("/").pop();
          if (VIDEO_TYPES[type]) return h(VideoPlayer, { key: key, src: url, title: p.videoTitle || "Lesson video", poster: p.posterFor && p.posterFor(url), captions: p.captionsFor && p.captionsFor(url),
            quizzes: (d.quizzes || []).map(function (q) { return { time: q.time, id: q.quiz, title: q.title }; }), onQuiz: p.onVideoQuiz, onProgress: p.onVideoProgress, onComplete: p.onVideoComplete, noSkipping: p.noSkipping });
          if (AUDIO_TYPES[type]) return h("audio", { key: key, className: "ot-audio", controls: true, src: url, preload: "metadata" });
          if (IMAGE_TYPES[type]) return h(Figure, { key: key, src: url, alt: "" });
          return h(FileBlock, { key: key, name: name, href: url, openHref: type === "pdf" ? url : undefined });
        }
        case "embed": return h(Embed, { key: key, service: d.service, src: embedSrc(d), href: d.source, caption: d.caption ? h("span", { dangerouslySetInnerHTML: clean(d.caption) }) : null });
        case "quiz": case "assignment": case "program":
          return p.renderActivity ? h(React.Fragment, { key: key }, p.renderActivity(b)) : h(ActivityCard, { key: key, kind: b.type === "program" ? "code" : b.type, title: d.title || d.quiz || d.assignment || d.exercise || "Activity" });
        default: return null;
      }
    }));
  }

  // ---- Courses: cards, the catalogue, the course page, asking to join, My courses and learning paths ----
  var TRACKS = [
    { id: "physics", title: "Physics and space", text: "Bend light into a floating hologram, build a telescope, make electricity with your own hands and find your way round the night sky." },
    { id: "code", title: "Code and AI", text: "Write Python from your first variable to a full program, learn why one search takes 20 steps where another takes a million, then train AI models that classify, see and write." },
    { id: "making", title: "Engineering and making", text: "Design and 3D-print your own part, code an Arduino radar that maps the room, and build a truss bridge that beats your first attempt." },
    { id: "competitions", title: "Competitions", text: "A maths competition with Kangaroo-level questions and a physics competition, with every answer explained afterwards." },
  ];
  function trackName(id) { for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === id) return TRACKS[i].title; return ""; }

  // a section of a page: its heading, a line under it, and an optional link at the right
  function PageSection(p) {
    var HeadTag = p.headingAs || "h2", id = uid("ps");
    return h("section", { className: cx("ot-section", p.className), "aria-labelledby": id, style: p.tone ? { "--tone": "var(--track-" + p.tone + ")" } : undefined },
      h("div", { className: "ot-section__head" },
        h("div", { className: "ot-section__titles" },
          p.eyebrow ? h("p", { className: "ot-section__eyebrow" }, p.eyebrow) : null,
          h(HeadTag, { id: id, className: "ot-section__title" }, p.tone ? h("span", { className: "ot-section__dot", "aria-hidden": true }) : null, p.title,
            p.count != null ? h("span", { className: "ot-section__count" }, p.count) : null),
          p.description ? h("p", { className: "ot-section__text" }, p.description) : null),
        p.action ? h("div", { className: "ot-section__action" }, p.action) : null),
      p.children);
  }

  // a course as a card: browsing, in progress, finished, or asked to join
  function CourseCard(p) {
    var state = p.state || "browse", footer;
    if (state === "progress") footer = h("div", { className: "ot-coursecard__progress" },
      h(ProgressBar, { value: p.progress || 0, label: "Your progress", valueText: p.progressText, showLabel: !!p.progressText, size: "thin", tone: p.track }),
      p.next ? h("span", { className: "ot-coursecard__next" }, h("span", { className: "ot-visually-hidden" }, "Next lesson: "), h(Icon, { name: "play", size: 16 }), p.next) : null);
    else if (state === "done") footer = [h(Badge, { key: "b", tone: "success", icon: "check" }, "Finished"), p.finishedText ? h("span", { key: "t", className: "ot-coursecard__meta" }, p.finishedText) : null];
    else if (state === "asked") footer = [h(Badge, { key: "b", tone: "gold", icon: "due" }, "Asked to join"), p.askedText ? h("span", { key: "t", className: "ot-coursecard__meta" }, p.askedText) : null];
    else footer = [h("span", { key: "f", className: "ot-coursecard__meta" }, (p.facts || []).join(" \u00b7 ")), h(Icon, { key: "a", name: "arrow-right", size: 20, className: "ot-coursecard__arrow" })];
    var media = p.cover ? h("span", { className: "ot-coursecard__cover" },
      h("img", { src: p.cover, alt: p.coverAlt || "", loading: "lazy", decoding: "async" }),
      state === "done" ? h("span", { className: "ot-coursecard__seal", "aria-hidden": true }, h(Icon, { name: "certificate", size: 20 })) : null) : null;
    return h(Card, { className: cx("ot-coursecard", "ot-coursecard--" + state, p.compact && "ot-coursecard--compact", p.className), href: p.href, media: media, tone: p.track,
      eyebrow: p.eyebrow || trackName(p.track), title: p.title, titleAs: p.titleAs, footer: footer },
      p.tagline && !p.compact ? h("p", { className: "ot-coursecard__tagline" }, p.tagline) : null);
  }

  // the catalogue: search, track filters, and the courses grouped by track
  function CourseCatalogue(p) {
    var courses = p.courses || [], tracks = p.tracks || TRACKS;
    var qs = useState(p.defaultQuery || ""), q = qs[0], ts = useState(p.defaultTrack || "all"), track = ts[0];
    var needle = q.trim().toLowerCase();
    function matches(c) {
      if (track !== "all" && c.track !== track) return false;
      if (!needle) return true;
      return [c.title, c.tagline, c.project, trackName(c.track)].concat(c.keywords || []).join(" ").toLowerCase().indexOf(needle) >= 0;
    }
    var shown = courses.filter(matches);
    var chips = [{ id: "all", label: "All", count: courses.length }].concat(tracks.map(function (t) { return { id: t.id, label: t.title, count: courses.filter(function (c) { return c.track === t.id; }).length }; }));
    function clear() { qs[1](""); ts[1]("all"); }
    return h("div", { className: cx("ot-catalogue", p.className) },
      h("div", { className: "ot-catalogue__tools" },
        h(TextField, { search: true, value: q, placeholder: "Search courses, projects and topics", onChange: function (e) { qs[1](e.target.value); }, className: "ot-catalogue__search" }),
        h("div", { className: "ot-catalogue__chips", role: "group", "aria-label": "Show courses from" }, chips.map(function (c) {
          return h(Chip, { key: c.id, selected: track === c.id, count: c.count, onClick: function () { ts[1](c.id); } }, c.label);
        }))),
      h("p", { className: "ot-catalogue__status", role: "status" }, shown.length === courses.length ? courses.length + " courses" : shown.length + " of " + courses.length + " courses"),
      shown.length ? tracks.map(function (t) {
        var list = shown.filter(function (c) { return c.track === t.id; });
        if (!list.length) return null;
        return h(PageSection, { key: t.id, title: t.title, tone: t.id, count: list.length, description: track === t.id || track === "all" ? t.text : null },
          h("div", { className: "ot-catalogue__grid" }, list.map(function (c, i) { return h(CourseCard, Object.assign({ key: c.id || i }, c)); })));
      }) : h(EmptyState, { compact: true, icon: "search", title: needle ? "No courses match \u201c" + q.trim() + "\u201d" : "No courses here yet", titleAs: "h2",
        action: h(Button, { variant: "secondary", size: "sm", onClick: clear }, "Show all courses") }, "Try a topic like \u201clight\u201d, \u201cPython\u201d or \u201cbridge\u201d, or look through all 14 courses."));
  }

  // the top of a course page: track, title, what it is, the facts, and what the student can do next
  function CourseHero(p) {
    var facts = p.facts || [];
    return h("header", { className: cx("ot-coursehero", p.className), style: p.track ? { "--tone": "var(--track-" + p.track + ")" } : undefined },
      h("div", { className: "ot-coursehero__text" },
        p.back ? h("a", { className: "ot-back", href: p.back.href, onClick: p.back.onClick }, h(Icon, { name: "arrow-left", size: 18 }), h("span", null, p.back.label || "All courses")) : null,
        h("p", { className: "ot-coursehero__track" }, trackName(p.track) || p.eyebrow),
        h("h1", { className: "ot-coursehero__title" }, p.title),
        p.tagline ? h("p", { className: "ot-coursehero__tagline" }, p.tagline) : null,
        facts.length ? h("dl", { className: "ot-coursehero__facts" }, facts.map(function (f, i) {
          return h("div", { key: i, className: "ot-coursehero__fact" }, h("dt", null, f.label), h("dd", null, f.value));
        })) : null,
        p.children ? h("div", { className: "ot-coursehero__panel" }, p.children) : null),
      p.cover ? h("div", { className: "ot-coursehero__art" },
        h("svg", { className: "ot-coursehero__orbit", viewBox: "0 0 400 300", "aria-hidden": true, preserveAspectRatio: "none" }, h("ellipse", { cx: 200, cy: 150, rx: 196, ry: 70, transform: "rotate(-14 200 150)" })),
        h("img", { className: "ot-coursehero__cover", src: p.cover, alt: p.coverAlt || "", decoding: "async" })) : null);
  }

  // what the student will build, linked to its project page on the website
  function ProjectFeature(p) {
    return h("article", { className: cx("ot-project", p.className) },
      p.image ? h("img", { className: "ot-project__img", src: p.image, alt: p.imageAlt || "", loading: "lazy", decoding: "async" }) : null,
      h("div", { className: "ot-project__body" },
        h("p", { className: "ot-project__eyebrow" }, p.eyebrow || "You'll build"),
        h(p.titleAs || "h3", { className: "ot-project__title" }, p.title),
        p.text ? h("p", { className: "ot-project__text" }, p.text) : null,
        p.href ? h("a", { className: "ot-project__link", href: p.href, target: "_blank", rel: "noopener" }, p.linkLabel || "See the project on our website", h(Icon, { name: "external", size: 16 }),
          h("span", { className: "ot-visually-hidden" }, " (opens in a new tab)")) : null));
  }

  function OutcomeList(p) {
    return h("ul", { className: cx("ot-outcomes", p.className) }, (p.items || []).map(function (it, i) {
      return h("li", { key: i, className: "ot-outcomes__item" }, h("span", { className: "ot-outcomes__mark", "aria-hidden": true }, h(Icon, { name: "check", size: 16, strokeWidth: 2.6 })), h("span", null, it));
    }));
  }

  function KitList(p) {
    return h("ul", { className: cx("ot-kit", p.className) }, (p.items || []).map(function (it, i) {
      var item = typeof it === "string" ? { name: it } : it;
      return h("li", { key: i, className: "ot-kit__item" },
        h("span", { className: "ot-kit__icon", "aria-hidden": true }, h(Icon, { name: item.icon || "settings", size: 20 })),
        h("span", { className: "ot-kit__text" }, h("span", { className: "ot-kit__name" }, item.name), item.note ? h("span", { className: "ot-kit__note" }, item.note) : null),
        item.provided === true ? h(Badge, { tone: "success", icon: "check" }, "We provide it") : item.provided === false ? h(Badge, { tone: "neutral" }, "Bring your own") : null);
    }));
  }

  function InstructorCard(p) {
    return h("article", { className: cx("ot-instructor", p.className) },
      h(Avatar, { name: p.name, src: p.photo, size: p.compact ? 48 : 72, decorative: true }),
      h("div", { className: "ot-instructor__body" },
        h(p.titleAs || "h3", { className: "ot-instructor__name" }, p.name),
        p.role ? h("p", { className: "ot-instructor__role" }, p.role) : null,
        p.bio && !p.compact ? h("p", { className: "ot-instructor__bio" }, p.bio) : null));
  }

  // a batch of a course: when it meets, where, and how many places are left
  function BatchCard(p) {
    var status = p.status || "open", seats = p.seatsLeft, badge;
    if (status === "yours") badge = h(Badge, { tone: "success", icon: "check" }, "Your batch");
    else if (status === "running") badge = h(Badge, { tone: "neutral" }, "Running now");
    else if (status === "full" || seats === 0) badge = h(Badge, { tone: "neutral" }, "Full");
    else if (seats != null && seats <= 3) badge = h(Badge, { tone: "warning", icon: "warning" }, seats === 1 ? "1 place left" : seats + " places left");
    else if (seats != null) badge = h(Badge, { tone: "gold" }, seats + " places left");
    return h("article", { className: cx("ot-batch", "ot-batch--" + status, p.className) },
      h("div", { className: "ot-batch__head" }, h(p.titleAs || "h3", { className: "ot-batch__name" }, p.name), badge || null),
      h("ul", { className: "ot-batch__facts" },
        p.when ? h("li", null, h(Icon, { name: "schedule", size: 18 }), h("span", null, p.when)) : null,
        p.dates ? h("li", null, h(Icon, { name: "due", size: 18 }), h("span", null, p.dates)) : null,
        p.where ? h("li", null, h(Icon, { name: p.online ? "live" : "home", size: 18 }), h("span", null, p.where)) : null),
      p.action ? h("div", { className: "ot-batch__action" }, p.action) : null);
  }

  // asking to join: payment is in cash, so it's a message on WhatsApp or a short form, never a checkout
  function AskToJoin(p) {
    var st = useState(p.defaultState || "start"), state = p.state || st[0];
    function go(s) { if (!p.state) st[1](s); if (p.onStateChange) p.onStateChange(s); }
    var f = useState({ name: "", phone: "", who: "me", batch: p.defaultBatch || "", note: "", website: "" }), form = f[0];
    var er = useState({}), errors = er[0];
    function field(k) { return function (e) { var v = e.target.value, next = Object.assign({}, form); next[k] = v; f[1](next); }; }
    function submit(e) {
      e.preventDefault();
      var bad = {};
      if (!form.name.trim()) bad.name = "Tell us your name.";
      if (!/^[+\d][\d\s-]{6,}$/.test(form.phone.trim())) bad.phone = "Use a number we can reach on WhatsApp, like 012 345 6789.";
      if (p.batches && p.batches.length && !form.batch) bad.batch = "Choose a batch.";
      er[1](bad);
      if (Object.keys(bad).length) return;
      // a person never sees the "website" box; a bot that fills it in gets the thank-you and nothing is sent
      if (form.website) { go("asked"); return; }
      if (p.onSubmit) p.onSubmit({ name: form.name.trim(), phone: form.phone.trim(), who: form.who, batch: form.batch, note: form.note.trim() });
      go("asked");
    }
    var course = p.course || "this course", head, body;
    if (state === "enrolled") {
      head = [h("span", { key: "d", className: "ot-join__disc ot-join__disc--done", "aria-hidden": true }, h(Icon, { name: "check", size: 26, strokeWidth: 2.4 })),
        h("div", { key: "t" }, h("p", { className: "ot-join__title" }, "You're in" + (p.batch ? " the " + p.batch : "")), h("p", { className: "ot-join__text" }, p.enrolledText || "Your lessons are open. See you in class."))];
      body = p.start ? h(Button, { iconAfter: "arrow-right", href: p.start.href, onClick: p.start.onClick, full: true }, p.start.label || "Start learning") : null;
    } else if (state === "asked") {
      head = [h("span", { key: "d", className: "ot-join__disc", "aria-hidden": true }, h(Icon, { name: "due", size: 26 })),
        h("div", { key: "t" }, h("p", { className: "ot-join__title" }, "We've got your request"),
          h("p", { className: "ot-join__text" }, p.askedText || "We'll message you on WhatsApp within a working day to confirm your place. You pay in cash at our Cyberjaya centre on your first day."))];
      body = p.onCancel ? h(Button, { variant: "text", size: "sm", onClick: function () { p.onCancel(); go("start"); } }, "Cancel my request") : null;
    } else if (state === "form") {
      head = [h("div", { key: "t" }, h("p", { className: "ot-join__title" }, "Ask to join " + course), h("p", { className: "ot-join__text" }, "We'll message you on WhatsApp to confirm a place."))];
      body = h("form", { method: "post", className: "ot-join__form", onSubmit: submit, noValidate: true },
        h(TextField, { label: "Your name", maxLength: 140, value: form.name, onChange: field("name"), autoComplete: "name", error: errors.name }),
        h("div", { className: "ot-hp", "aria-hidden": true }, h("label", null, "Leave this empty", h("input", { type: "text", name: "website", tabIndex: -1, autoComplete: "off", value: form.website, onChange: field("website") }))),
        h(TextField, { label: "WhatsApp number", type: "tel", inputMode: "tel", maxLength: 20, value: form.phone, onChange: field("phone"), autoComplete: "tel", placeholder: "012 345 6789", error: errors.phone }),
        h("fieldset", { className: "ot-join__who" }, h("legend", { className: "ot-field__label" }, "Who is it for?"),
          h("div", { className: "ot-join__choices" },
            h(Radio, { name: "who", value: "me", label: "Me", checked: form.who === "me", onChange: field("who") }),
            h(Radio, { name: "who", value: "child", label: "My child", checked: form.who === "child", onChange: field("who") }))),
        p.batches && p.batches.length ? h(Select, { label: "Batch", options: p.batches, placeholder: "Choose a batch", value: form.batch, onChange: field("batch"), error: errors.batch }) : null,
        h(TextField, { label: "Anything we should know?", optional: true, multiline: true, rows: 3, maxLength: 1000, value: form.note, onChange: field("note") }),
        h("div", { className: "ot-join__actions" },
          h(Button, { variant: "text", onClick: function () { go("start"); } }, "Back"),
          h(Button, { type: "submit", icon: "check" }, "Send my request")));
    } else {
      head = [h("div", { key: "t" }, h("p", { className: "ot-join__title" }, p.title || "Join " + course),
        h("p", { className: "ot-join__text" }, p.text || "Payment is in cash at our Cyberjaya centre, so there's no online checkout. Tell us you're interested and we'll sort out a place with you."))];
      body = h("div", { className: "ot-join__buttons" },
        p.whatsappHref ? h(Button, { href: p.whatsappHref, target: "_blank", icon: "discussion", full: true }, "Ask on WhatsApp") : null,
        h(Button, { variant: "secondary", full: true, onClick: function () { go("form"); } }, "Fill in a short form"),
        p.nextBatch ? h("p", { className: "ot-join__note" }, p.nextBatch) : null);
    }
    return h("section", { className: cx("ot-join", "ot-join--" + state, p.className), "aria-label": "Join " + course, "aria-live": "polite" },
      h("div", { className: "ot-join__head" }, head), body);
  }

  // My courses: in progress and finished, each with its own empty state
  function MyCourses(p) {
    var inProgress = p.inProgress || [], done = p.completed || [], ts = useState(p.defaultTab || "progress"), tab = ts[0], base = uid("mc");
    var list = tab === "progress" ? inProgress : done;
    return h("div", { className: cx("ot-mycourses", p.className) },
      h(Tabs, { label: "My courses", value: tab, onChange: ts[1], tabs: [
        { id: "progress", label: "In progress", count: inProgress.length, tabId: base + "-t1", panel: base + "-p" },
        { id: "done", label: "Finished", count: done.length, tabId: base + "-t2", panel: base + "-p" }] }),
      h("div", { id: base + "-p", role: "tabpanel", "aria-labelledby": tab === "progress" ? base + "-t1" : base + "-t2", className: "ot-mycourses__panel" },
        list.length ? h("div", { className: "ot-catalogue__grid" }, list.map(function (c, i) { return h(CourseCard, Object.assign({ key: c.id || i, state: tab === "progress" ? (c.state || "progress") : "done" }, c)); }))
          : tab === "progress" ? h(EmptyState, { icon: "courses", title: "No courses in progress", titleAs: "h2", action: p.browseHref ? h(Button, { href: p.browseHref, iconAfter: "arrow-right" }, "Browse courses") : null },
            "When you're enrolled in a batch, your courses show up here.")
          : h(EmptyState, { icon: "certificate", title: "No finished courses yet", titleAs: "h2" }, "Finish a course and it moves here, with its certificate.")));
  }

  // a learning path: courses in a set order, joined by an orbit line
  function LearningPath(p) {
    var steps = p.courses || [];
    return h("ol", { className: cx("ot-path", p.className), "aria-label": p.label || "Courses in order" }, steps.map(function (c, i) {
      var status = c.status || "todo", locked = status === "locked", Tag = c.href && !locked ? "a" : "div";
      var word = { done: "Finished", current: "In progress", todo: "Not started", locked: "Opens after the course before" }[status];
      return h("li", { key: c.id || i, className: cx("ot-path__step", "ot-path__step--" + status), style: c.track ? { "--tone": "var(--track-" + c.track + ")" } : undefined },
        h("span", { className: "ot-path__node", "aria-hidden": true }, status === "done" ? h(Icon, { name: "check", size: 18, strokeWidth: 2.6 }) : locked ? h(Icon, { name: "lock", size: 16 }) : i + 1),
        h(Tag, { className: "ot-path__card", href: Tag === "a" ? c.href : undefined, "aria-current": status === "current" ? "step" : undefined },
          h("span", { className: "ot-path__text" },
            h("span", { className: "ot-path__track" }, trackName(c.track)),
            h("span", { className: "ot-path__title" }, c.title),
            c.meta ? h("span", { className: "ot-path__meta" }, c.meta) : null),
          status === "current" && c.progress != null ? h(ProgressRing, { value: c.progress, size: 48, tone: c.track, label: c.title + ": " + Math.round(c.progress) + "% done" }) : h("span", { className: "ot-path__status" }, word)));
    }));
  }

  // ---- Home: the greeting, what to do next, live classes, what's due, courses, announcements, a new certificate, and a first visit ----
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function toDate(d) { return d == null ? null : d instanceof Date ? d : new Date(d); }
  // whole calendar days from a to b (1 = b is tomorrow)
  function dayDiff(a, b) { return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
  function timeText(d) { var hr = d.getHours(), m = d.getMinutes(); return ((hr % 12) || 12) + ":" + (m < 10 ? "0" : "") + m + " " + (hr < 12 ? "am" : "pm"); }
  function longDate(d) { return WEEKDAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()]; }
  // "Today", "Tomorrow", "Saturday" this week, then "Thursday 12 November"
  function dayText(d, now) {
    var n = dayDiff(now, d);
    return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n === -1 ? "Yesterday" : n > 1 && n < 7 ? WEEKDAYS[d.getDay()] : longDate(d);
  }
  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }
  var TRACK_NAMES = { physics: 1, code: 1, making: 1, competitions: 1 };
  function trackStyle(track) { return TRACK_NAMES[track] ? { "--tone": "var(--track-" + track + ")", "--tone-soft": "var(--track-" + track + "-soft)" } : undefined; }

  // the time now, ticking every `every` ms. `start` pretends it is another time (for previews) and still ticks from there.
  function useNow(start, every) {
    var skew = useRef(null);
    if (skew.current === null) skew.current = start ? toDate(start).getTime() - Date.now() : 0;
    var st = useState(function () { return Date.now() + skew.current; });
    useEffect(function () {
      if (!every) return;
      // no ticking while the tab or the app is in the background; catch up the moment it's back
      var t = 0;
      function tick() { st[1](Date.now() + skew.current); }
      function start() { clearInterval(t); t = document.hidden ? 0 : setInterval(tick, every); }
      function vis() { if (!document.hidden) tick(); start(); }
      start();
      document.addEventListener("visibilitychange", vis);
      return function () { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
    }, [every]);
    return new Date(st[0]);
  }

  // the heading of a Home block: a title, an optional count, and a link at the right
  function HomeHead(p) {
    var HeadTag = p.headingAs || "h2";
    return h("div", { className: "ot-homehead" },
      h(HeadTag, { id: p.id, className: "ot-homehead__title" }, p.title,
        p.count != null ? h("span", { className: "ot-homehead__count" }, p.count, p.countLabel ? h("span", { className: "ot-visually-hidden" }, " " + p.countLabel) : null) : null),
      p.action ? h("div", { className: "ot-homehead__action" }, p.action) : null);
  }
  function seeAll(href, label) {
    return href ? h("a", { className: "ot-homehead__link", href: href }, label || "See all", h(Icon, { name: "arrow-right", size: 18 })) : null;
  }

  // tonight's moon, drawn small: the lit part in gold so it reads in both themes
  function MoonGlyph(p) {
    var R = 8;
    return h("svg", { className: "ot-moonglyph", width: p.size || 18, height: p.size || 18, viewBox: "-10 -10 20 20", "aria-hidden": true },
      h("circle", { r: R, className: "ot-moonglyph__dark" }),
      h("path", { d: litPath(p.f, R), className: "ot-moonglyph__lit" }),
      h("circle", { r: R, className: "ot-moonglyph__rim" }));
  }

  // the top of Home: today's date with the moon's phase, and a greeting for the time of day
  function HomeGreeting(p) {
    var now = useNow(p.now, 60000), phase = moonPhase(now), hr = now.getHours();
    var hello = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    return h("header", { className: cx("ot-greet", p.className) },
      h("p", { className: "ot-greet__date" },
        h(MoonGlyph, { f: phase.f }),
        h("span", null, longDate(now)),
        p.moon !== false ? h("span", { className: "ot-greet__phase" }, phase.name) : null),
      h(p.headingAs || "h1", { className: "ot-greet__title" }, p.title || (hello + (p.name ? ", " + p.name : ""))),
      p.children ? h("p", { className: "ot-greet__text" }, p.children) : null,
      p.action ? h("div", { className: "ot-greet__action" }, p.action) : null);
  }

  // the lesson to pick up next: the whole card is one link
  function ContinueCard(p) {
    var id = uid("cc"), lesson = p.lesson || {}, where = lesson.number && lesson.total ? "Lesson " + lesson.number + " of " + lesson.total : null;
    return h("a", { className: cx("ot-continue", p.className), href: p.href, onClick: p.onClick, style: trackStyle(p.track), "aria-labelledby": id + "c " + id + "t " + id + "l" },
      h("div", { className: "ot-continue__in" },
        p.cover ? h("span", { className: "ot-continue__cover" },
          h("img", { src: p.cover, alt: "", decoding: "async" }),
          h("span", { className: "ot-continue__play", "aria-hidden": true }, h(Icon, { name: "play", size: 26 }))) : null,
        h("div", { className: "ot-continue__body" },
          h("p", { className: "ot-continue__eyebrow" }, p.eyebrow || "Continue learning"),
          h(p.titleAs || "h2", { id: id + "t", className: "ot-continue__title" }, p.course),
          h("p", { id: id + "l", className: "ot-continue__lesson" },
            h(Icon, { name: lesson.kind || "reading", size: 18 }),
            h("span", null, where ? h("span", { className: "ot-continue__where" }, where + ": ") : null, lesson.title)),
          p.progress != null ? h(ProgressBar, { value: p.progress, size: "thin", tone: p.track, label: "Your progress", valueText: p.progressText, showLabel: !!p.progressText }) : null,
          h("div", { className: "ot-continue__foot" },
            h("span", { id: id + "c", className: "ot-btn ot-btn--primary ot-btn--md ot-continue__cta" }, h(Icon, { name: "play", size: 18 }), h("span", { className: "ot-btn__label" }, p.cta || "Resume lesson")),
            p.meta ? h("span", { className: "ot-continue__meta" }, p.meta) : null))));
  }

  // ---- the next live class: a date, then a countdown, then Join, then the recording ----
  function liveState(now, start, minutes, opens) {
    var t = now.getTime(), s = start.getTime();
    return t >= s + minutes * 60000 ? "ended" : t >= s ? "live" : t >= s - opens * 60000 ? "soon" : "upcoming";
  }
  function untilText(ms) {
    var m = Math.max(1, Math.ceil(ms / 60000)), hr = Math.floor(m / 60), r = m % 60;
    return hr ? hr + " h" + (r ? " " + r + " min" : "") : m + " min";
  }
  var LIVE_NEWS = { soon: "Your live class opens now. You can join.", live: "Your live class has started.", ended: "Your live class has ended." };
  function LiveClassCard(p) {
    var start = toDate(p.startsAt), minutes = p.minutes || 60, opens = p.joinOpensMinutes != null ? p.joinOpensMinutes : 10;
    var every = useRef(1000), now = useNow(p.now, every.current), state = liveState(now, start, minutes, opens), left = start - now, end = new Date(start.getTime() + minutes * 60000);
    every.current = state === "live" || state === "soon" || Math.abs(left) < 7200000 ? 1000 : 30000;
    var id = uid("lc"), seen = useRef(state), news = useState("");
    // say it out loud only when the state changes, never every second
    useEffect(function () {
      if (seen.current !== state) { seen.current = state; news[1](LIVE_NEWS[state] || ""); }
    }, [state]);
    var when = [dayText(start, now) + ", ", h("span", { key: "t", className: "ot-live__nowrap" }, timeText(start))], visual, lines;
    if (state === "upcoming") {
      visual = h("span", { className: "ot-live__cal", "aria-hidden": true },
        h("span", { className: "ot-live__calday" }, WEEKDAYS[start.getDay()].slice(0, 3)),
        h("span", { className: "ot-live__calnum" }, start.getDate()),
        h("span", { className: "ot-live__calmonth" }, MONTHS[start.getMonth()].slice(0, 3)));
      lines = [h("span", { key: "a", className: "ot-live__when" }, when),
        h("span", { key: "b", className: "ot-live__sub" }, left < 86400000 ? "Starts in " + untilText(left) : "Starts in " + plural(dayDiff(now, start), "day"))];
    } else if (state === "soon") {
      var secs = Math.max(0, Math.ceil(left / 1000)), frac = Math.min(1, left / (opens * 60000)), R = 46, C = 2 * Math.PI * R;
      var a = -Math.PI / 2 + 2 * Math.PI * frac;
      visual = h("span", { className: "ot-live__ring", "aria-hidden": true },
        h("svg", { viewBox: "0 0 112 112", width: 112, height: 112 },
          h("circle", { className: "ot-live__ringtrack", cx: 56, cy: 56, r: R }),
          h("circle", { className: "ot-live__ringfill", cx: 56, cy: 56, r: R, strokeDasharray: C, strokeDashoffset: C * (1 - frac), transform: "rotate(-90 56 56)" }),
          h("circle", { className: "ot-live__ringdot", cx: (56 + R * Math.cos(a)).toFixed(2), cy: (56 + R * Math.sin(a)).toFixed(2), r: 5 })),
        h("span", { className: "ot-live__count" }, clockText(secs)));
      lines = [h("span", { key: "a", className: "ot-live__when" }, "Starting soon"),
        h("span", { key: "b", className: "ot-live__sub" }, when)];
    } else if (state === "live") {
      var ago = Math.floor((now - start) / 60000);
      visual = h("span", { className: "ot-live__beacon", "aria-hidden": true }, h("span", null), h("span", null), h(Icon, { name: "live", size: 26 }));
      lines = [h("span", { key: "a", className: "ot-live__when" }, ago < 1 ? "Started just now" : "Started " + plural(ago, "minute") + " ago"),
        h("span", { key: "b", className: "ot-live__sub" }, "Ends at " + timeText(end))];
    } else {
      visual = h("span", { className: "ot-live__done", "aria-hidden": true }, h(Icon, { name: p.recordingHref ? "video" : "done", size: 26 }));
      lines = [h("span", { key: "a", className: "ot-live__when" }, "Ended at ", h("span", { className: "ot-live__nowrap" }, timeText(end))),
        h("span", { key: "b", className: "ot-live__sub" }, p.attendedMinutes ? "You were there for " + plural(p.attendedMinutes, "minute") : p.recordingHref ? "The recording is ready" : p.recording === false ? dayText(start, now) : "The recording will be here soon")];
    }
    var newTab = p.joinTarget !== "_self";
    var join = h(Button, { href: p.joinHref, onClick: p.onJoin, target: newTab && p.joinHref ? "_blank" : undefined, icon: "live", full: true, className: state === "live" ? "ot-live__join--live" : undefined },
      p.joinLabel || "Join live class", newTab && p.joinHref ? h("span", { className: "ot-visually-hidden" }, " (opens in a new tab)") : null);
    var actions = state === "soon" || state === "live" ? join
      : state === "ended" ? (p.recordingHref ? h(Button, { variant: "secondary", href: p.recordingHref, icon: "play", full: true }, "Watch the recording") : null)
      : [p.calendarHref || p.onAddToCalendar ? h(Button, { key: "c", variant: "secondary", size: "sm", icon: "schedule", href: p.calendarHref, onClick: p.onAddToCalendar }, "Add to calendar") : null,
        h("span", { key: "n", className: "ot-live__note" }, h(Icon, { name: "due", size: 16 }), "Join opens " + plural(opens, "minute") + " before")];
    var eyebrow = state === "live" ? "Live class" : state === "ended" ? "Past live class" : "Next live class";
    return h("article", { className: cx("ot-live", "ot-live--" + state, p.className), style: trackStyle(p.track), "aria-labelledby": id + "t" },
      h("div", { className: "ot-live__head" },
        h("p", { className: "ot-live__eyebrow" }, eyebrow),
        state === "live" ? h(Badge, { tone: "live" }, "Live now") : null),
      h(p.titleAs || "h2", { id: id + "t", className: "ot-live__title" }, p.title),
      h("p", { className: "ot-live__meta" },
        p.course ? h("span", { className: "ot-live__course" }, h("span", { className: "ot-live__dot", "aria-hidden": true }), p.course) : null,
        h("span", null, plural(minutes, "minute") + (p.where ? " \u00b7 " + p.where : ""))),
      h("div", { className: "ot-live__time" },
        visual,
        h("p", { className: "ot-live__lines" }, lines)),
      p.instructor ? h("p", { className: "ot-live__who" }, h(Avatar, { name: p.instructor.name, src: p.instructor.src, size: 28, decorative: true }), h("span", null, "With " + p.instructor.name)) : null,
      actions ? h("div", { className: "ot-live__actions" }, actions) : null,
      h("p", { className: "ot-visually-hidden", role: "status" }, news[0]));
  }

  // ---- what's due: assignments and quizzes, soonest first ----
  function dueLabel(it, now) {
    if (it.status === "submitted") return { text: it.statusText || "Submitted", tone: "success", icon: "check" };
    var d = toDate(it.due);
    if (!d) return { text: it.statusText || "No due date", tone: "neutral" };
    if (d < now) { var late = dayDiff(d, now); return { text: late >= 1 ? "Overdue by " + plural(late, "day") : "Overdue since " + timeText(d), tone: "danger", icon: "warning" }; }
    var n = dayDiff(now, d);
    if (n === 0) return { text: "Due today, " + timeText(d), tone: "warning", icon: "due" };
    if (n === 1) return { text: "Due tomorrow, " + timeText(d), tone: "warning", icon: "due" };
    return { text: "Due " + (n < 7 ? WEEKDAYS[d.getDay()] : d.getDate() + " " + MONTHS[d.getMonth()]), tone: "neutral", icon: "due" };
  }
  function DueList(p) {
    var now = useNow(p.now, 60000), id = uid("dl"), limit = p.limit || 5;
    var items = (p.items || []).slice().sort(function (a, b) {
      var sa = a.status === "submitted" ? 1 : 0, sb = b.status === "submitted" ? 1 : 0;
      if (sa !== sb) return sa - sb;
      return (toDate(a.due) || Infinity) - (toDate(b.due) || Infinity);
    });
    var open = items.filter(function (x) { return x.status !== "submitted"; }).length, shown = items.slice(0, limit);
    return h("section", { className: cx("ot-homepanel ot-due", p.className), "aria-labelledby": id },
      h(HomeHead, { id: id, title: p.title || "Due soon", headingAs: p.headingAs, count: open || null, countLabel: open === 1 ? "thing to do" : "things to do",
        action: seeAll(p.seeAllHref, items.length > limit ? "See all " + items.length : "See all") }),
      shown.length ? h("ul", { className: "ot-due__list" }, shown.map(function (it, i) {
        var label = dueLabel(it, now), Tag = it.href ? "a" : "div", kind = it.kind === "quiz" ? "quiz" : "assignment";
        return h("li", { key: it.id || i },
          h(Tag, { className: cx("ot-due__row", "ot-due__row--" + label.tone), href: it.href, style: trackStyle(it.track) },
            h("span", { className: "ot-due__icon", "aria-hidden": true }, h(Icon, { name: kind, size: 20 })),
            h("span", { className: "ot-due__text" },
              h("span", { className: "ot-due__title" }, it.title),
              h("span", { className: "ot-due__meta" },
                h(Badge, { tone: label.tone, icon: label.icon }, label.text),
                h("span", { className: "ot-due__course" }, h("span", { className: "ot-visually-hidden" }, KIND_WORDS[kind] + ", "), it.course))),
            Tag === "a" ? h(Icon, { name: "chevron-right", size: 20, className: "ot-due__chevron" }) : null));
      }))
        : h(EmptyState, { compact: true, icon: "done", title: p.emptyTitle || "Nothing due", titleAs: "h3" }, p.emptyText || "You're all caught up. New assignments and quizzes show up here with their due dates."));
  }

  // ---- the student's courses in a row that scrolls sideways, each with a progress ring ----
  function CourseStrip(p) {
    var courses = p.courses || [], list = useRef(null), id = uid("cs"), reduce = useReducedMotion();
    var st = useState({ start: true, end: true }), edges = st[0];
    useEffect(function () {
      var el = list.current;
      if (!el) return;
      function measure() {
        var s = el.scrollLeft <= 2, e = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
        st[1](function (o) { return o.start === s && o.end === e ? o : { start: s, end: e }; });
      }
      measure();
      el.addEventListener("scroll", measure, { passive: true });
      var ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
      if (ro) ro.observe(el);
      return function () { el.removeEventListener("scroll", measure); if (ro) ro.disconnect(); };
    }, [courses.length]);
    function page(dir) { var el = list.current; if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: reduce ? "auto" : "smooth" }); }
    return h("section", { className: cx("ot-strip", p.className), "aria-labelledby": id },
      h(HomeHead, { id: id, title: p.title || "My courses", headingAs: p.headingAs, action: seeAll(p.seeAllHref) }),
      courses.length ? h("div", { className: cx("ot-strip__frame", !edges.start && "ot-strip__frame--more-before", !edges.end && "ot-strip__frame--more-after") },
        h("ul", { ref: list, className: "ot-strip__list" },
          courses.map(function (c, i) {
            var done = c.status === "done" || c.progress >= 100, Tag = c.href ? "a" : "div";
            return h("li", { key: c.id || i, className: "ot-strip__item" },
              h(Tag, { className: cx("ot-strip__tile", done && "ot-strip__tile--done"), href: c.href, style: trackStyle(c.track) },
                h(ProgressRing, { value: done ? 100 : c.progress || 0, size: 56, tone: c.track, label: c.title + ": " + (done ? "finished" : Math.round(c.progress || 0) + "% done") },
                  done ? h(Icon, { name: "check", size: 22, strokeWidth: 2.4 }) : undefined),
                h("span", { className: "ot-strip__track" }, trackName(c.track)),
                h("span", { className: "ot-strip__title" }, c.title),
                h("span", { className: "ot-strip__next" }, done ? [h(Icon, { key: "i", name: "certificate", size: 16 }), c.finishedText || "Finished"]
                  : c.next ? [h(Icon, { key: "i", name: "play", size: 16 }), h("span", { key: "t" }, h("span", { className: "ot-visually-hidden" }, "Next lesson: "), c.next)] : c.progressText || null)));
          }),
          p.browseHref ? h("li", { className: "ot-strip__item" },
            h("a", { className: "ot-strip__tile ot-strip__tile--browse", href: p.browseHref },
              h("span", { className: "ot-strip__plus", "aria-hidden": true }, h(Icon, { name: "plus", size: 24 })),
              h("span", { className: "ot-strip__title" }, p.browseLabel || "Find another course"))) : null),
        // for a mouse: page the row left and right (keyboard users tab through the tiles, which scroll into view)
        h("button", { type: "button", className: "ot-strip__arrow ot-strip__arrow--before", tabIndex: -1, "aria-hidden": true, hidden: edges.start, onClick: function () { page(-1); } }, h(Icon, { name: "arrow-left", size: 20 })),
        h("button", { type: "button", className: "ot-strip__arrow ot-strip__arrow--after", tabIndex: -1, "aria-hidden": true, hidden: edges.end, onClick: function () { page(1); } }, h(Icon, { name: "arrow-right", size: 20 })))
        : h(EmptyState, { compact: true, icon: "courses", title: "No courses yet", titleAs: "h3",
          action: p.browseHref ? h(Button, { href: p.browseHref, size: "sm", iconAfter: "arrow-right" }, "Browse courses") : null }, "When you're enrolled in a batch, your courses show up here."));
  }

  // ---- announcements from instructors and the OrbitCore team ----
  function Announcement(p) {
    var it = p.item, text = useRef(null), ex = useState(false), ov = useState(false), id = uid("an"), a = it.author || {};
    useLayoutEffect(function () {
      var el = text.current;
      if (el && !ex[0]) ov[1](el.scrollHeight > el.clientHeight + 1);
    }, [it.text, ex[0]]);
    return h("article", { className: cx("ot-ann", it.unread && "ot-ann--unread", it.pinned && "ot-ann--pinned"), "aria-labelledby": id + "t" },
      h("div", { className: "ot-ann__head" },
        a.brand ? h("span", { className: "ot-ann__brand", "aria-hidden": true }, h(BrandMark, { size: 40 })) : h(Avatar, { name: a.name, src: a.src, size: 40, decorative: true }),
        h("div", { className: "ot-ann__who" },
          h("p", { className: "ot-ann__name" }, a.name, a.role ? h(Badge, { tone: a.instructor ? "gold" : "neutral" }, a.role) : null),
          h("p", { className: "ot-ann__meta" }, [it.batch, it.time].filter(Boolean).join(" \u00b7 "))),
        it.pinned ? h("span", { className: "ot-ann__pin" }, h(Icon, { name: "pin", size: 16 }), "Pinned") : it.unread ? h("span", { className: "ot-ann__dot" }, h("span", { className: "ot-visually-hidden" }, "New")) : null),
      h(p.titleAs || "h3", { id: id + "t", className: "ot-ann__title" }, it.href ? h("a", { href: it.href }, it.title) : it.title),
      h("div", { id: id + "x", ref: text, className: cx("ot-ann__text", !ex[0] && "ot-ann__text--clamped") }, it.text),
      ov[0] || ex[0] ? h("button", { type: "button", className: "ot-ann__more", "aria-expanded": ex[0], "aria-controls": id + "x", onClick: function () { ex[1](!ex[0]); } },
        ex[0] ? "Show less" : "Read more", h(Icon, { name: "chevron-down", size: 16 })) : null);
  }
  function Announcements(p) {
    var items = p.items || [], id = uid("as"), unread = items.filter(function (x) { return x.unread; }).length, limit = p.limit || 3;
    var ordered = items.filter(function (x) { return x.pinned; }).concat(items.filter(function (x) { return !x.pinned; })).slice(0, limit);
    return h("section", { className: cx("ot-homepanel ot-anns", p.className), "aria-labelledby": id },
      h(HomeHead, { id: id, title: p.title || "Announcements", headingAs: p.headingAs, count: unread || null, countLabel: "new", action: seeAll(p.seeAllHref) }),
      ordered.length ? h("div", { className: "ot-anns__list" }, ordered.map(function (it, i) { return h(Announcement, { key: it.id || i, item: it }); }))
        : h(EmptyState, { compact: true, icon: "discussion", title: "No announcements yet", titleAs: "h3" }, p.emptyText || "News from your instructors and the OrbitCore team shows up here."));
  }

  // ---- a certificate the student has just earned ----
  function CertificateCard(p) {
    var hide = useState(false), copied = useState(false), card = useRef(null), id = uid("nc");
    useEffect(function () {
      if (!copied[0]) return;
      var t = setTimeout(function () { copied[1](false); }, 2400);
      return function () { clearTimeout(t); };
    }, [copied[0]]);
    if (hide[0]) return null;
    function dismiss() {
      var main = card.current && card.current.closest("main");
      hide[1](true);
      if (p.onDismiss) p.onDismiss();
      // the button is about to disappear, so put focus somewhere that stays
      if (main) setTimeout(function () { main.focus(); }, 0);
    }
    function share() {
      if (p.onShare) return p.onShare();
      var title = "My certificate for " + p.course, url = p.shareUrl;
      if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
      if (navigator.clipboard && url) navigator.clipboard.writeText(url).then(function () { copied[1](true); }, function () {});
    }
    return h("article", { ref: card, className: cx("ot-newcert", p.className), style: trackStyle(p.track), "aria-labelledby": id },
      h("div", { className: "ot-newcert__art", "aria-hidden": true },
        h("span", { className: "ot-newcert__paper" },
          h("span", { className: "ot-newcert__brand" }, h(BrandMark, { size: 12 }), "OrbiTutor"),
          h("span", { className: "ot-newcert__line ot-newcert__line--kind" }),
          h("span", { className: "ot-newcert__line ot-newcert__line--name" }),
          h("span", { className: "ot-newcert__line" }),
          h("span", { className: "ot-newcert__seal" }, h(Icon, { name: "certificate", size: 14, strokeWidth: 2.2 }))),
        [0, 1, 2, 3].map(function (i) { return h("span", { key: i, className: "ot-newcert__spark", style: { "--i": i } }); })),
      h("div", { className: "ot-newcert__body" },
        h("p", { className: "ot-newcert__eyebrow" }, p.eyebrow || "New certificate"),
        h(p.titleAs || "h2", { id: id, className: "ot-newcert__title" }, p.title || "Your certificate for " + p.course + " is ready"),
        p.children || p.finishedText ? h("p", { className: "ot-newcert__text" }, p.children || p.finishedText) : null,
        h("div", { className: "ot-newcert__actions" },
          h(Button, { href: p.href, icon: "certificate", size: "sm" }, "See your certificate"),
          p.shareUrl || p.onShare ? h(Button, { variant: "secondary", size: "sm", icon: copied[0] ? "check" : "share", onClick: share }, copied[0] ? "Link copied" : "Share") : null),
        h("p", { className: "ot-visually-hidden", role: "status" }, copied[0] ? "Link copied" : "")),
      p.onDismiss ? h("button", { type: "button", className: "ot-iconbtn ot-newcert__close", "aria-label": "Hide this", title: "Hide this", onClick: dismiss }, h(Icon, { name: "close", size: 20 })) : null);
  }

  // ---- a first visit: before the student has a course, after asking to join, and before Lesson 1 ----
  var WELCOME_TIPS = [
    { icon: "reading", title: "Lessons", text: "Work through them at your own pace. Your place is saved as you go." },
    { icon: "live", title: "Live classes", text: "They show up on Home with a countdown. Join from there when one is about to start." },
    { icon: "discussion", title: "Questions", text: "Ask under any lesson. Your instructor answers there." }];
  function WelcomePanel(p) {
    var stage = p.stage || "new", id = uid("wp");
    if (stage === "enrolled") {
      var c = p.course || {};
      return h("section", { className: cx("ot-welcome ot-welcome--enrolled", p.className), "aria-labelledby": id }, h("div", { className: "ot-welcome__in" },
        h("div", { className: "ot-welcome__intro" },
          h("p", { className: "ot-welcome__eyebrow" }, p.eyebrow || "You're in"),
          h(p.headingAs || "h2", { id: id, className: "ot-welcome__title" }, p.title || "Your first lesson is ready"),
          h("p", { className: "ot-welcome__text" }, p.children || (c.batch ? "You're in the " + c.batch + " batch for " + c.title + ". Start whenever you like." : "Start whenever you like."))),
        h(ContinueCard, { course: c.title, track: c.track, cover: c.cover, href: c.href, lesson: c.lesson, eyebrow: "Start here", cta: "Start lesson 1", titleAs: "h3", meta: c.meta }),
        h("ul", { className: "ot-welcome__tips" }, (p.tips || WELCOME_TIPS).map(function (t, i) {
          return h("li", { key: i, className: "ot-welcome__tip" },
            h("span", { className: "ot-welcome__tipicon", "aria-hidden": true }, h(Icon, { name: t.icon, size: 20 })),
            h("span", null, h("strong", null, t.title), h("span", null, t.text)));
        }))));
    }
    var asked = stage === "asked", course = p.course && p.course.title;
    var steps = [
      { title: "Pick a course", text: "Hands-on courses in physics, code, making and competitions. You don't need to know anything beforehand." },
      { title: asked && course ? "You asked to join " + course : "Ask to join a batch", text: asked ? "We'll message you on WhatsApp within a working day to confirm your place." : "Choose a batch and leave a phone number. We'll message you on WhatsApp to confirm your place." },
      { title: "Come to your first class", text: "Pay in cash at our Cyberjaya centre on your first day. Your lessons open here as soon as you're enrolled." }];
    var current = asked ? 2 : 0;
    return h("section", { className: cx("ot-welcome ot-welcome--" + stage, p.className), "aria-labelledby": id }, h("div", { className: "ot-welcome__in" },
      h("div", { className: "ot-welcome__art", "aria-hidden": true },
        h("svg", { viewBox: "0 0 200 160", width: 200, height: 160 },
          h("defs", null, h("radialGradient", { id: id + "g", cx: "38%", cy: "34%", r: "70%" },
            h("stop", { offset: "0", stopColor: "#FFF6CF" }), h("stop", { offset: "0.45", stopColor: "#FFC93C" }), h("stop", { offset: "1", stopColor: "#E8590C" }))),
          h("ellipse", { className: "ot-welcome__orbit", cx: 100, cy: 84, rx: 92, ry: 30, transform: "rotate(-14 100 84)" }),
          h("circle", { className: "ot-welcome__planet", cx: 100, cy: 84, r: 34, fill: "url(#" + id + "g)" }),
          h("path", { className: "ot-welcome__orbit", d: "M 10.73 106.26 A 92 30 -14 0 0 189.27 61.74" }),
          h("circle", { className: "ot-welcome__star", cx: 180.93, cy: 79.28, r: 6 }))),
      h("div", { className: "ot-welcome__intro" },
        h("p", { className: "ot-welcome__eyebrow" }, p.eyebrow || (asked ? "Nearly there" : "Start here")),
        h(p.headingAs || "h2", { id: id, className: "ot-welcome__title" }, p.title || (asked ? "We'll be in touch soon" : "Three steps to your first lesson"))),
      h("ol", { className: "ot-welcome__steps" }, steps.map(function (s, i) {
        var state = i < current ? "done" : i === current ? "current" : "todo";
        return h("li", { key: i, className: "ot-welcome__step ot-welcome__step--" + state, "aria-current": state === "current" ? "step" : undefined },
          h("span", { className: "ot-welcome__node", "aria-hidden": true }, state === "done" ? h(Icon, { name: "check", size: 16, strokeWidth: 2.6 }) : i + 1),
          h("span", { className: "ot-welcome__steptext" },
            h("strong", null, state === "done" ? h("span", { className: "ot-visually-hidden" }, "Done: ") : null, s.title),
            h("span", null, s.text)));
      })),
      h("div", { className: "ot-welcome__actions" }, (function () {
        // the main action comes first: browsing before asking, messaging us after
        var browse = p.browseHref ? h(Button, { key: "b", href: p.browseHref, variant: asked ? "secondary" : "primary", iconAfter: "arrow-right" }, asked ? "Look at other courses" : "Browse courses") : null;
        var chat = p.whatsappHref ? h(Button, { key: "w", href: p.whatsappHref, variant: asked ? "primary" : "secondary", icon: "discussion", target: "_blank" }, "Message us on WhatsApp",
          h("span", { className: "ot-visually-hidden" }, " (opens WhatsApp)")) : null;
        return asked ? [chat, browse] : [browse, chat];
      })())));
  }

  // ---- Home's layout: the greeting across the top, then a main column and a side column that stack on phones.
  // `urgent` (a live class about to start) tops the side column on wide screens and comes before everything else on phones ----
  function HomeLayout(p) {
    var two = p.side || p.urgent;
    return h("div", { className: cx("ot-home", p.className) },
      p.header ? h("div", { className: "ot-home__header" }, p.header) : null,
      h("div", { className: cx("ot-home__grid", two ? (p.urgent ? "ot-home__grid--urgent" : "ot-home__grid--two") : "ot-home__grid--one") },
        p.urgent ? h("div", { className: "ot-home__urgent" }, p.urgent) : null,
        h("div", { className: "ot-home__main" }, p.children),
        p.side ? h("div", { className: "ot-home__side" }, p.side) : null));
  }

  // ---- Quizzes and assignments: the student's side of Frappe Learning's quizzes, assignments and coding exercises ----
  var LETTERS = "ABCDEFGHIJ";
  function mmss(s) {
    s = Math.max(0, Math.ceil(s)); var hr = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (hr ? hr + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (r < 10 ? "0" : "") + r;
  }
  function leftWords(s) { return s >= 60 ? plural(Math.ceil(s / 60), "minute") : plural(Math.max(0, Math.ceil(s)), "second"); }
  function minutesText(n) { return n >= 60 && n % 60 === 0 ? plural(n / 60, "hour") : plural(n, "minute"); }
  // mid-sentence: "Closes tomorrow, 5:00 pm", "Opens Saturday 7 November, 9:00 am"
  function whenText(d, now) { return dayText(d, now).replace(/^(Today|Tomorrow|Yesterday)$/, function (w) { return w.toLowerCase(); }) + ", " + timeText(d); }
  // a question's or a brief's text: Frappe's editor gives HTML (sanitise it first), or pass plain text or nodes
  function rich(p, cls, id) {
    return p.html ? h("div", { id: id, className: cx("ot-rich", cls), dangerouslySetInnerHTML: { __html: sanitizeHtml(p.html) } }) : h("div", { id: id, className: cx("ot-rich", cls) }, p.prompt || p.text || p.children);
  }
  function blank(q, a) { return a == null || a === "" || (Array.isArray(a) && !a.length) || (typeof a === "string" && !a.trim()); }
  function norm(s) { return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " "); }
  // the verdict for an answer, worked out from the question itself (previews, or quizzes checked on the device)
  function localVerdict(q, a) {
    if (q.type === "open") return { correct: null };
    if (q.type === "typed") return { correct: (q.accepted || []).some(function (x) { return norm(x) === norm(a); }), expected: q.accepted, explanation: q.explanation };
    var right = (q.options || []).filter(function (o) { return o.correct; }).map(function (o) { return o.id; });
    var mine = q.type === "multiple" ? a || [] : a == null ? [] : [a], notes = {};
    (q.options || []).forEach(function (o) { if (o.explanation) notes[o.id] = o.explanation; });
    return { correct: right.length === mine.length && right.every(function (x) { return mine.indexOf(x) >= 0; }), correctIds: right, explanations: notes, explanation: q.explanation };
  }

  // the time left on a quiz: amber in the last quarter, red in the last tenth
  function QuizTimer(p) {
    var left = Math.max(0, p.remaining || 0), total = p.total || left, f = total ? left / total : 0;
    var tone = !total ? "normal" : f <= 0.1 ? "critical" : f <= 0.25 ? "warning" : "normal", R = 9, C = 2 * Math.PI * R;
    return h("div", { className: cx("ot-timer", "ot-timer--" + tone, p.size === "lg" && "ot-timer--lg", p.className), role: "timer", "aria-label": (p.label || "Time left") + ": " + leftWords(left) },
      h("svg", { className: "ot-timer__ring", viewBox: "0 0 24 24", "aria-hidden": true },
        h("circle", { className: "ot-timer__track", cx: 12, cy: 12, r: R }),
        h("circle", { className: "ot-timer__fill", cx: 12, cy: 12, r: R, strokeDasharray: C.toFixed(2), strokeDashoffset: (C * (1 - f)).toFixed(2), transform: "rotate(-90 12 12)" })),
      h("span", { className: "ot-timer__text", "aria-hidden": true },
        h("span", { className: "ot-timer__time" }, mmss(left)),
        p.size === "lg" ? h("span", { className: "ot-timer__label" }, "left") : null));
  }

  // ---- one question: one answer, several answers, a typed answer or a written one ----
  var QUESTION_HINTS = { single: "Choose one answer", multiple: "Choose all the answers that apply", typed: "Type your answer", open: "Write your answer. Your instructor marks this one." };
  function Question(p) {
    var type = p.type || "single", id = uid("q"), opts = p.options || [], v = p.verdict, locked = !!(p.disabled || v);
    var value = p.value, picked = type === "multiple" ? value || [] : value;
    function change(next) { if (!locked && p.onChange) p.onChange(next); }
    var body;
    if (type === "single" || type === "multiple") {
      body = h("div", { className: "ot-question__options", role: type === "single" ? "radiogroup" : "group", "aria-labelledby": id + "p", "aria-describedby": id + "h" },
        opts.map(function (o, i) {
          var on = type === "multiple" ? picked.indexOf(o.id) >= 0 : picked === o.id, right = !!(v && v.correctIds && v.correctIds.indexOf(o.id) >= 0);
          var state = !v ? (on ? "picked" : "idle") : right && on ? "right" : right ? "missed" : on ? "wrong" : "idle";
          var word = { right: "Your answer, correct", wrong: "Your answer, not correct", missed: type === "multiple" ? "Also correct" : "Correct answer" }[state];
          var note = v && v.explanations ? v.explanations[o.id] : null;
          return h("label", { key: o.id, className: cx("ot-option", "ot-option--" + state, locked && "ot-option--locked") },
            h("input", { type: type === "single" ? "radio" : "checkbox", name: id, className: "ot-option__input", checked: on, disabled: locked,
              onChange: function () { change(type === "multiple" ? (on ? picked.filter(function (x) { return x !== o.id; }) : picked.concat([o.id])) : o.id); } }),
            h("span", { className: "ot-option__key", "aria-hidden": true },
              state === "right" || state === "missed" ? h(Icon, { name: "check", size: 18, strokeWidth: 2.6 }) : state === "wrong" ? h(Icon, { name: "close", size: 18, strokeWidth: 2.6 }) : LETTERS[i]),
            h("span", { className: "ot-option__body" },
              o.html ? h("span", { className: "ot-option__text", dangerouslySetInnerHTML: { __html: sanitizeHtml(o.html) } }) : h("span", { className: "ot-option__text" }, o.text),
              word ? h("span", { className: "ot-option__verdict" }, word) : null,
              note && (on || right) ? h("span", { className: "ot-option__note" }, note) : null));
        }));
    } else if (type === "typed") {
      body = h("div", { className: cx("ot-typed", v && (v.correct ? "ot-typed--right" : "ot-typed--wrong")) },
        h("label", { className: "ot-visually-hidden", htmlFor: id + "i" }, "Your answer"),
        h("div", { className: "ot-input" },
          h("input", { id: id + "i", type: "text", maxLength: 500, value: value || "", disabled: locked, autoComplete: "off", spellCheck: false, placeholder: "Your answer", "aria-describedby": id + "h",
            "aria-invalid": p.error ? true : undefined, onChange: function (e) { change(e.target.value); }, onKeyDown: function (e) { if (e.key === "Enter" && p.onEnter) { e.preventDefault(); p.onEnter(); } } }),
          v ? h(Icon, { name: v.correct ? "done" : "warning", size: 20, className: "ot-typed__mark" }) : null),
        v && !v.correct && v.expected && v.expected.length ? h("p", { className: "ot-typed__expected" }, v.expected.length > 1 ? "Accepted answers: " : "The answer: ", h("strong", null, v.expected.join(", "))) : null);
    } else {
      var words = norm(value) ? norm(value).split(" ").length : 0;
      body = h("div", { className: "ot-openans" },
        h("label", { className: "ot-visually-hidden", htmlFor: id + "i" }, "Your answer"),
        h("div", { className: "ot-input ot-input--multiline" },
          h("textarea", { id: id + "i", rows: p.rows || 6, maxLength: 20000, value: value || "", disabled: locked, placeholder: "Write your answer here", "aria-describedby": id + "h", "aria-invalid": p.error ? true : undefined,
            onChange: function (e) { change(e.target.value); } })),
        h("p", { className: "ot-openans__count" }, plural(words, "word")));
    }
    var result = !v ? null : v.correct === null
      ? h("p", { className: "ot-question__result ot-question__result--pending", role: "status" }, h(Icon, { name: "due", size: 20 }), h("span", null, h("strong", null, "Saved. "), "Your instructor marks written answers, so this one counts later."))
      : h("p", { className: "ot-question__result ot-question__result--" + (v.correct ? "right" : "wrong"), role: "status" }, h(Icon, { name: v.correct ? "done" : "info", size: 20 }),
        h("span", null, h("strong", null, v.correct ? "Correct. " : "Not quite. "), v.correct ? (p.marks ? "That's " + plural(p.marks, "mark") + "." : "") : type === "multiple" ? "The ticks show every right answer." : type === "single" ? "The tick shows the right answer." : ""));
    return h("section", { ref: p.focusRef, tabIndex: p.focusRef ? -1 : undefined, className: cx("ot-question", p.className), "aria-labelledby": id + "c " + id + "p" },
      h("div", { className: "ot-question__top" },
        h("p", { id: id + "c", className: "ot-question__count" }, p.number ? "Question " + p.number + (p.total ? " of " + p.total : "") : "Question"),
        p.marks ? h("span", { className: "ot-question__marks" }, plural(p.marks, "mark")) : null,
        p.flagged ? h("span", { className: "ot-question__flag" }, h(Icon, { name: "flag", size: 14 }), "Flagged") : null),
      rich(p, "ot-question__prompt", id + "p"),
      h("p", { id: id + "h", className: "ot-question__hint" }, p.hint || QUESTION_HINTS[type]),
      body,
      p.error ? h("p", { className: "ot-question__error", role: "alert" }, h(Icon, { name: "warning", size: 18 }), p.error) : null,
      result,
      v && v.explanation ? h("div", { className: "ot-question__why" }, h(Icon, { name: "bulb", size: 20 }), h("div", null, h("strong", null, "Why"), h("span", null, v.explanation))) : null);
  }

  // ---- the frame round a quiz: its title, the timer, where you are, flags, and handing it in ----
  function QuizFrame(p) {
    var qs = p.questions || [], comp = p.variant === "competition", exam = comp || p.mode === "exam", total = Math.round((p.timeLimit || 0) * 60);
    var ix = useState(p.initialIndex || 0), i = Math.min(ix[0], Math.max(0, qs.length - 1)), q = qs[i] || {};
    var ans = useState(p.initialAnswers || {}), answers = ans[0], fl = useState(p.initialFlags || {}), flags = fl[0];
    var vd = useState(p.initialVerdicts || {}), verdicts = vd[0], lt = useState(p.timeLeft != null ? p.timeLeft : total), left = lt[0];
    var cf = useState(!!p.defaultConfirm), lv = useState(false), done = useState(null), news = useState(""), nav = useState(false), busy = useState(false), err = useState(null);
    var id = uid("qf"), qref = useRef(null), first = useRef(true);
    var endsAt = useRef(0);
    if (!endsAt.current && total) endsAt.current = Date.now() + (p.timeLeft != null ? p.timeLeft : total) * 1000;
    useEffect(function () {
      if (!total || done[0]) return;
      function tick() { lt[1](Math.max(0, Math.round((endsAt.current - Date.now()) / 1000))); }
      var t = setInterval(tick, 1000);
      document.addEventListener("visibilitychange", tick);
      return function () { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
    }, [total, !!done[0]]);
    useEffect(function () {
      if (!total || done[0]) return;
      if (left === 0) finish("timer_expired");
      else if ((left === 300 && total > 600) || left === 60) news[1](leftWords(left) + " left");
    }, [left]);
    useEffect(function () { if (first.current) { first.current = false; return; } if (qref.current) qref.current.focus(); }, [i]);
    var a = answers[q.id], v = verdicts[q.id], n = qs.length;
    var answered = qs.filter(function (x) { return !blank(x, answers[x.id]); }).length;
    var unanswered = [], flagged = [];
    qs.forEach(function (x, k) { if (blank(x, answers[x.id])) unanswered.push(k); if (flags[x.id]) flagged.push(k); });
    function finish(reason) {
      if (done[0]) return;
      done[1](reason || "manual"); cf[1](false); lv[1](false);
      news[1](reason === "timer_expired" ? "Time's up. Your answers have been handed in." : "Your answers have been handed in.");
      if (p.onSubmit) p.onSubmit({ answers: answers, flags: flags, reason: reason || "manual", timeLeft: left });
    }
    function setAnswer(val) { var x = Object.assign({}, answers); x[q.id] = val; ans[1](x); err[1](null); if (p.onAnswer) p.onAnswer(q.id, val); }
    function go(k) { if (k < 0 || k >= n) return; ix[1](k); nav[1](false); err[1](null); }
    function check() {
      if (blank(q, a)) { err[1](q.type === "typed" || q.type === "open" ? "Write an answer first." : "Choose an answer first."); return; }
      busy[1](true);
      Promise.resolve(p.onCheck ? p.onCheck(q, a) : localVerdict(q, a)).then(function (res) {
        busy[1](false); var x = Object.assign({}, verdicts); x[q.id] = res; vd[1](x);
      }, function () { busy[1](false); err[1]("Your answer didn't reach us. Check your connection and try again."); });
    }
    function flag() { var x = Object.assign({}, flags); x[q.id] = !flags[q.id]; fl[1](x); }

    if (done[0]) {
      var timeUp = done[0] === "timer_expired";
      return h("div", { className: cx("ot-quizframe ot-quizframe--done", comp && "ot-quizframe--competition", p.className) },
        h("div", { className: "ot-quizframe__handed", role: "status" },
          h("span", { className: "ot-quizframe__handedicon", "aria-hidden": true }, h(Icon, { name: timeUp ? "due" : "done", size: 32 })),
          h("h1", { className: "ot-quizframe__handedtitle" }, timeUp ? "Time's up" : "Handed in"),
          h("p", null, timeUp ? "Your answers were handed in when the timer ran out." : "Your answers are in."),
          p.submitting !== false ? h("p", { className: "ot-quizframe__handednote" }, h("span", { className: "ot-btn__spinner", "aria-hidden": true }), "Working out your score") : null));
    }

    var navGrid = h("div", { className: "ot-quizframe__navgrid" },
      h(StepDots, { total: n, current: i, numbered: true, answered: qs.map(function (x, k) { return blank(x, answers[x.id]) ? -1 : k; }).filter(function (k) { return k >= 0; }), flagged: flagged, onSelect: go, label: "Questions" }),
      h("ul", { className: "ot-quizframe__legend", "aria-hidden": true },
        h("li", { className: "ot-quizframe__key ot-quizframe__key--answered" }, "Answered"),
        h("li", { className: "ot-quizframe__key ot-quizframe__key--flagged" }, "Flagged"),
        h("li", { className: "ot-quizframe__key" }, "Not answered")));
    var side = exam ? h("aside", { className: "ot-quizframe__side", "aria-label": "Questions" },
      h("button", { type: "button", className: "ot-quizframe__navtoggle", "aria-expanded": nav[0], "aria-controls": id + "nav", onClick: function () { nav[1](!nav[0]); } },
        h("span", null, h("strong", null, "Questions"), h("span", { className: "ot-quizframe__navcount" }, answered + " of " + n + " answered" + (flagged.length ? ", " + flagged.length + " flagged" : ""))),
        h(Icon, { name: "chevron-down", size: 20 })),
      h("div", { id: id + "nav", className: cx("ot-quizframe__nav", nav[0] && "ot-quizframe__nav--open") },
        h("p", { className: "ot-quizframe__sidetitle" }, "Questions", h("span", null, answered + " of " + n + " answered")),
        navGrid,
        h(Button, { variant: "secondary", full: true, icon: "upload", onClick: function () { cf[1](true); } }, comp ? "Finish the competition" : "Submit quiz"))) : null;

    var foot;
    if (!exam) {
      var last = i === n - 1;
      foot = !v ? [h(Button, { key: "c", loading: busy[0], onClick: check }, q.type === "open" ? "Save answer" : "Check answer")]
        : [h(Button, { key: "n", iconAfter: last ? undefined : "arrow-right", icon: last ? "done" : undefined, onClick: function () { if (last) finish("manual"); else go(i + 1); } }, last ? "See your results" : "Next question")];
    } else {
      foot = [
        i > 0 ? h(Button, { key: "b", variant: "secondary", icon: "arrow-left", onClick: function () { go(i - 1); } }, "Previous") : h("span", { key: "b" }),
        h("button", { key: "f", type: "button", className: cx("ot-quizframe__flag", flags[q.id] && "ot-quizframe__flag--on"), "aria-pressed": !!flags[q.id], onClick: flag },
          h(Icon, { name: "flag", size: 18 }), flags[q.id] ? "Flagged" : "Flag for later"),
        i < n - 1 ? h(Button, { key: "n", iconAfter: "arrow-right", onClick: function () { go(i + 1); } }, "Next")
          : h(Button, { key: "n", icon: "upload", onClick: function () { cf[1](true); } }, comp ? "Finish" : "Submit quiz")];
    }
    var progress = exam ? null : h(ProgressBar, { value: n ? ((i + (v ? 1 : 0)) / n) * 100 : 0, size: "thin", label: "Your progress", showLabel: true,
      valueText: Object.keys(verdicts).filter(function (k) { return verdicts[k] && verdicts[k].correct; }).length + " correct so far" });

    return h("div", { className: cx("ot-quizframe", exam ? "ot-quizframe--exam" : "ot-quizframe--practice", comp && "ot-quizframe--competition", p.className), style: comp ? trackStyle("competitions") : undefined },
      h("header", { className: "ot-quizframe__bar" },
        p.onLeave ? h("button", { type: "button", className: "ot-iconbtn", "aria-label": "Leave the quiz", title: "Leave", onClick: function () { lv[1](true); } }, h(Icon, { name: "close", size: 22 })) : null,
        h("div", { className: "ot-quizframe__titles" },
          h("p", { className: "ot-quizframe__eyebrow" }, p.eyebrow || (comp ? "Competition" : p.course || "Quiz")),
          h("h1", { className: "ot-quizframe__title" }, p.title)),
        p.proctor ? h("span", { className: cx("ot-quizframe__watch", p.proctor.warnings > 0 && "ot-quizframe__watch--warned"), title: "Your camera is on" },
          h(Icon, { name: "camera", size: 18 }), h("span", null, (p.proctor.warnings || 0) + " of " + p.proctor.max), h("span", { className: "ot-visually-hidden" }, " warnings")) : null,
        total ? h(QuizTimer, { remaining: left, total: total, size: comp ? "lg" : undefined }) : null),
      h("div", { className: "ot-quizframe__body" },
        h("div", { className: "ot-quizframe__main" },
          progress,
          h(Question, Object.assign({}, q, { key: q.id, focusRef: qref, number: i + 1, total: n, value: a, verdict: exam ? undefined : v, flagged: exam && flags[q.id], error: err[0],
            onChange: setAnswer, onEnter: exam ? function () { go(i + 1); } : check })),
          h("div", { className: "ot-quizframe__foot" }, foot),
          p.savedText !== false ? h("p", { className: "ot-quizframe__saved" }, h(Icon, { name: "check", size: 16 }), p.savedText || "Your answers save as you go. Leaving the page hands the quiz in.") : null),
        side),
      h("p", { className: "ot-visually-hidden", role: "status" }, news[0]),
      h(Dialog, { open: cf[0], onClose: function () { cf[1](false); }, title: unanswered.length ? "Hand in with " + plural(unanswered.length, "question") + " left?" : comp ? "Finish the competition?" : "Submit your quiz?",
        actions: [h(Button, { key: "k", variant: "secondary", onClick: function () { cf[1](false); } }, "Keep going"), h(Button, { key: "s", onClick: function () { finish("manual"); } }, comp ? "Finish" : "Submit quiz")] },
        h("p", { className: "ot-quizframe__sum" }, answered + " of " + n + " answered" + (flagged.length ? ", " + plural(flagged.length, "question") + " flagged for later" : "") + "." + (total ? " " + leftWords(left) + " left." : "")),
        unanswered.length ? h("div", { className: "ot-quizframe__jump" }, h("p", null, "Not answered yet:"),
          h("div", { className: "ot-quizframe__jumplist" }, unanswered.map(function (k) {
            return h("button", { key: k, type: "button", className: "ot-quizframe__jumpbtn", onClick: function () { cf[1](false); go(k); } }, "Question " + (k + 1));
          }))) : null,
        p.negativeMarks ? h("p", { className: "ot-quizframe__sum" }, "Blank answers lose nothing; wrong ones lose " + plural(p.negativeMarks, "mark") + ".") : null,
        h("p", { className: "ot-quizframe__sum" }, "You can't change your answers after this.")),
      h(Dialog, { open: lv[0], onClose: function () { lv[1](false); }, title: "Leave the quiz?",
        actions: [h(Button, { key: "s", variant: "secondary", onClick: function () { lv[1](false); } }, "Stay"), h(Button, { key: "l", variant: "danger", onClick: function () { finish("left"); if (p.onLeave) p.onLeave(); } }, "Leave and submit")] },
        h("p", { className: "ot-quizframe__sum" }, "Your answers so far are handed in as they are, and this counts as one of your attempts.")));
  }

  // ---- before a quiz: what it is, the rules, and Start ----
  function QuizIntro(p) {
    var now = useNow(p.now, 30000), opens = toDate(p.opensAt), closes = toDate(p.closesAt), id = uid("qi");
    var state = p.state || (opens && now < opens ? "opens" : closes && now > closes ? "closed" : p.attemptsLeft === 0 ? "used" : "ready");
    var comp = p.variant === "competition", noun = comp ? "competition" : "quiz";
    var facts = [
      { value: p.questions != null ? String(p.questions) : "-", label: p.questions === 1 ? "question" : "questions" },
      { value: p.timeLimit ? (p.timeLimit >= 60 && p.timeLimit % 60 === 0 ? p.timeLimit / 60 + " h" : p.timeLimit + " min") : "None", label: "time limit" },
      { value: p.attemptsLeft == null ? "Any" : p.attemptsTotal ? p.attemptsLeft + " of " + p.attemptsTotal : String(p.attemptsLeft), label: p.attemptsLeft == null ? "number of tries" : "attempts left" },
      { value: p.passMark != null ? p.passMark + "%" : "None", label: "pass mark" }];
    var rules = p.rules || [
      p.timeLimit ? "The timer starts when you press Start, and the " + noun + " hands itself in when time runs out." : null,
      p.mode === "exam" || comp ? "Move between the questions freely, and flag any you want to come back to." : "Check each answer as you go, and see why it's right or wrong straight away.",
      p.hasWritten ? "Your instructor marks written answers later, so your score can go up after you finish." : null,
      p.negativeMarks ? "A wrong answer loses " + plural(p.negativeMarks, "mark") + ". A blank one loses nothing." : null,
      p.proctored ? "Your camera stays on. Leaving this tab counts as a warning, and after " + plural(p.maxWarnings || 3, "warning") + " the " + noun + " hands itself in." : null,
      "Leaving or refreshing the page hands the " + noun + " in."].filter(Boolean);
    var attempts = p.attempts || [];
    var best = attempts.reduce(function (m, x) { return x.percentage != null && (m == null || x.percentage > m) ? x.percentage : m; }, null);
    var gate = state === "opens" ? h("p", { className: "ot-quizintro__gate" }, h(Icon, { name: "lock", size: 20 }), h("span", null, "Opens " + whenText(opens, now) + "."))
      : state === "closed" ? h("p", { className: "ot-quizintro__gate" }, h(Icon, { name: "due", size: 20 }), h("span", null, "This " + noun + " closed " + whenText(closes, now) + "." + (best != null ? " Your best score was " + best + "%." : "")))
      : state === "used" ? h("p", { className: "ot-quizintro__gate" }, h(Icon, { name: "info", size: 20 }), h("span", null, "You've used all " + plural(p.attemptsTotal || attempts.length, "attempt") + "." + (best != null ? " Your best score was " + best + "%." : "")))
      : null;
    return h("section", { className: cx("ot-quizintro", comp && "ot-quizintro--competition", p.className), style: comp ? trackStyle("competitions") : trackStyle(p.track), "aria-labelledby": id },
      h("div", { className: "ot-quizintro__head" },
        h("span", { className: "ot-quizintro__icon", "aria-hidden": true }, h(Icon, { name: comp ? "flag" : "quiz", size: 28 })),
        h("div", null,
          h("p", { className: "ot-quizintro__eyebrow" }, p.eyebrow || (comp ? "Competition" : "Quiz") + (p.course ? " \u00b7 " + p.course : "")),
          h(p.headingAs || "h1", { id: id, className: "ot-quizintro__title" }, p.title),
          p.description ? h("p", { className: "ot-quizintro__text" }, p.description) : null)),
      h("dl", { className: "ot-quizintro__facts" }, facts.map(function (f, k) {
        return h("div", { key: k, className: "ot-quizintro__fact" }, h("dt", null, f.label), h("dd", null, f.value));
      })),
      h("div", { className: "ot-quizintro__rules" },
        h("h2", { className: "ot-quizintro__subtitle" }, "Before you start"),
        h("ul", null, rules.map(function (r, k) { return h("li", { key: k }, h(Icon, { name: "check", size: 18, strokeWidth: 2.2 }), h("span", null, r)); }))),
      attempts.length ? h("div", { className: "ot-quizintro__attempts" },
        h("h2", { className: "ot-quizintro__subtitle" }, "Your attempts"),
        h("ol", null, attempts.map(function (x, k) {
          return h("li", { key: k },
            h("span", { className: "ot-quizintro__attemptno" }, "Attempt " + (k + 1)),
            h("span", { className: "ot-quizintro__attemptdate" }, x.date ? longDate(toDate(x.date)) : ""),
            h("span", { className: "ot-quizintro__attemptscore" }, x.percentage + "%"),
            x.passed == null ? h("span") : h(Badge, { tone: x.passed ? "success" : "neutral", icon: x.passed ? "check" : undefined }, x.passed ? "Passed" : "Not passed"));
        }))) : null,
      h("div", { className: "ot-quizintro__go" },
        gate || [h(Button, { key: "s", size: "lg", icon: "play", onClick: p.onStart, href: p.startHref }, p.startLabel || (attempts.length ? "Try again" : comp ? "Start the competition" : "Start quiz")),
          closes ? h("span", { key: "c", className: "ot-quizintro__closes" }, h(Icon, { name: "due", size: 16 }), "Closes " + whenText(closes, now)) : null],
        p.backHref ? h(Button, { variant: "text", href: p.backHref, icon: "arrow-left" }, p.backLabel || "Back to the lesson") : null));
  }

  // ---- after a quiz: the score, passed or not, and every answer with its explanation ----
  function ScoreRing(p) {
    var size = p.size || 168, sw = 12, r = (size - sw) / 2, c = 2 * Math.PI * r, mid = size / 2, v = Math.max(0, Math.min(100, p.value || 0));
    var mark = p.mark != null ? (-90 + 3.6 * p.mark) * Math.PI / 180 : null;
    return h("span", { className: cx("ot-score", p.className), style: { width: size, height: size } },
      h("svg", { width: size, height: size, viewBox: "0 0 " + size + " " + size, "aria-hidden": true },
        h("circle", { className: "ot-score__track", cx: mid, cy: mid, r: r, strokeWidth: sw }),
        v > 0 ? h("circle", { className: "ot-score__fill", cx: mid, cy: mid, r: r, strokeWidth: sw, strokeDasharray: c.toFixed(2), strokeDashoffset: (c * (1 - v / 100)).toFixed(2), transform: "rotate(-90 " + mid + " " + mid + ")" }) : null,
        mark != null ? h("line", { className: "ot-score__mark", x1: (mid + (r - sw) * Math.cos(mark)).toFixed(2), y1: (mid + (r - sw) * Math.sin(mark)).toFixed(2), x2: (mid + (r + sw) * Math.cos(mark)).toFixed(2), y2: (mid + (r + sw) * Math.sin(mark)).toFixed(2) }) : null),
      h("span", { className: "ot-score__center", "aria-hidden": true }, h("span", { className: "ot-score__value" }, p.children || Math.round(v) + "%"), p.caption ? h("span", { className: "ot-score__caption" }, p.caption) : null));
  }
  var REVIEW_STATES = { right: ["check", "Correct"], wrong: ["close", "Not correct"], skipped: ["info", "Not answered"], pending: ["due", "Waiting for marking"] };
  function QuizResults(p) {
    var pct = p.percentage != null ? p.percentage : p.outOf ? Math.round((p.score / p.outOf) * 100) : 0, pass = p.passMark;
    var passed = p.passed != null ? p.passed : pass == null ? null : pct >= pass, counts = p.counts || {}, id = uid("qr"), review = p.review || [];
    var ft = useState("all"), filter = ft[0];
    var shown = review.filter(function (r) { return filter === "all" || (filter === "wrong" ? r.state === "wrong" || r.state === "skipped" : r.state === filter); });
    var head = passed === true ? "You passed" : passed === false ? "Not passed this time" : "Your score";
    var reason = p.reason === "timer_expired" ? "Handed in when the timer ran out."
      : p.reason === "max_violations" ? "Handed in automatically after " + plural(p.maxWarnings || 3, "warning") + ". To try again, talk to your instructor." : null;
    var chips = [["right", counts.correct, "correct"], ["wrong", counts.wrong, "wrong"], ["skipped", counts.unanswered, "not answered"], ["pending", counts.pending, "waiting for marking"]].filter(function (c) { return c[1]; });
    var canRetry = p.onRetry && p.attemptsLeft !== 0 && p.reason !== "max_violations";
    return h("section", { className: cx("ot-results", passed === true && "ot-results--passed", passed === false && "ot-results--notpassed", p.className), "aria-labelledby": id },
      h("div", { className: "ot-results__top" },
        h(ScoreRing, { value: pct, mark: pass, caption: p.outOf ? p.score + " of " + p.outOf + " marks" : null }),
        h("div", { className: "ot-results__text" },
          h("p", { className: "ot-results__eyebrow" }, p.title || "Quiz results"),
          h(p.headingAs || "h1", { id: id, className: "ot-results__title" }, head),
          h("p", { className: "ot-results__line" }, "You scored " + pct + "%" + (pass != null ? (passed ? ", and the pass mark is " + pass + "%." : ". You need " + pass + "% to pass.") : ".")),
          counts.pending ? h("p", { className: "ot-results__line ot-results__line--pending" }, h(Icon, { name: "due", size: 18 }), plural(counts.pending, "written answer") + " still to be marked by your instructor, so your score may go up.") : null,
          reason ? h("p", { className: "ot-results__line ot-results__line--note" }, h(Icon, { name: "info", size: 18 }), reason) : null,
          chips.length ? h("ul", { className: "ot-results__counts" }, chips.map(function (c) {
            return h("li", { key: c[0], className: "ot-results__count ot-results__count--" + c[0] }, h(Icon, { name: REVIEW_STATES[c[0]][0], size: 16, strokeWidth: 2.2 }), h("strong", null, c[1]), " " + c[2]);
          })) : null,
          h("div", { className: "ot-results__actions" },
            p.continueHref ? h(Button, { href: p.continueHref, iconAfter: "arrow-right", variant: passed === false && canRetry ? "secondary" : "primary" }, p.continueLabel || "Back to the lesson") : null,
            canRetry ? h(Button, { variant: passed === false ? "primary" : "secondary", icon: "retry", onClick: p.onRetry }, "Try again") : null,
            p.attemptsLeft != null && p.reason !== "max_violations" ? h("span", { className: "ot-results__attempts" }, p.attemptsLeft === 0 ? "No attempts left" : plural(p.attemptsLeft, "attempt") + " left") : null))),
      review.length || p.showAnswers === false ? h("div", { className: "ot-results__review" },
        h("div", { className: "ot-results__reviewhead" },
          h("h2", { className: "ot-results__subtitle" }, "Your answers"),
          p.showAnswers !== false ? h(SegmentedControl, { label: "Show", value: filter, onChange: ft[1], options: [
            { value: "all", label: "All " + review.length },
            { value: "wrong", label: "To look at " + review.filter(function (r) { return r.state === "wrong" || r.state === "skipped"; }).length },
            { value: "right", label: "Correct " + review.filter(function (r) { return r.state === "right"; }).length }] }) : null),
        p.showAnswers === false ? h("p", { className: "ot-results__hidden" }, h(Icon, { name: "lock", size: 18 }), p.hiddenText || "Your instructor shares the answers after everyone has finished.")
          : shown.length ? h("ol", { className: "ot-results__list" }, shown.map(function (r) {
            var s = REVIEW_STATES[r.state] || REVIEW_STATES.skipped;
            return h("li", { key: r.number, className: "ot-review ot-review--" + (r.state || "skipped") },
              h("div", { className: "ot-review__head" },
                h("span", { className: "ot-review__badge", "aria-hidden": true }, h(Icon, { name: s[0], size: 16, strokeWidth: 2.4 })),
                h("span", { className: "ot-review__no" }, "Question " + r.number, h("span", { className: "ot-visually-hidden" }, ", " + s[1])),
                r.outOf ? h("span", { className: "ot-review__marks" }, (r.state === "pending" ? "-" : r.marks || 0) + " of " + plural(r.outOf, "mark")) : null),
              rich({ html: r.html, text: r.prompt }, "ot-review__prompt"),
              h("dl", { className: "ot-review__answers" },
                h("div", { className: "ot-review__answer ot-review__answer--mine" }, h("dt", null, "Your answer"), h("dd", null, r.yourAnswer || h("em", null, "No answer"))),
                r.state !== "right" && r.state !== "pending" && r.correctAnswer ? h("div", { className: "ot-review__answer ot-review__answer--right" }, h("dt", null, "Correct answer"), h("dd", null, r.correctAnswer)) : null),
              r.explanation ? h("p", { className: "ot-review__why" }, h(Icon, { name: "bulb", size: 18 }), h("span", null, r.explanation)) : null,
              r.feedback ? h("p", { className: "ot-review__why" }, h(Icon, { name: "discussion", size: 18 }), h("span", null, h("strong", null, "Your instructor: "), r.feedback)) : null);
          })) : h("p", { className: "ot-results__hidden" }, h(Icon, { name: "done", size: 18 }), "Nothing here. Every answer in this list was right.")) : null);
  }

  // ---- exam supervision (Frappe's proctoring): the camera check, a warning, and a quiz handed in after too many ----
  var FACE = {
    off: ["Your camera is off", "neutral", "camera"], loading: ["Starting your camera", "neutral", "camera"], detecting: ["Looking for your face", "neutral", "profile"],
    none: ["We can't see your face. Look straight at the camera.", "warning", "warning"], many: ["More than one person is in view. Only you can be in the frame.", "warning", "warning"],
    ready: ["We can see you clearly", "success", "done"] };
  var WARN = {
    tab_switch: ["You left the quiz tab", "Switching tabs or apps counts as a warning."],
    focus_loss: ["You switched to another window", "Clicking outside the quiz counts as a warning."],
    no_face: ["We couldn't see your face", "Keep your face in the frame until you hand the quiz in."],
    many_faces: ["Someone else was in view", "Only you can be in the frame during the quiz."],
    camera_disconnect: ["Your camera disconnected", "Keep your camera connected until you hand the quiz in."] };
  function Silhouette(p) {
    return h("g", { className: "ot-proctor__person", transform: p.transform },
      h("circle", { cx: 0, cy: -30, r: 24 }),
      h("path", { d: "M -62 74 C -62 22 -34 2 0 2 C 34 2 62 22 62 74 Z" }));
  }
  function WarningDots(p) {
    var out = [];
    for (var k = 0; k < p.max; k++) out.push(h("span", { key: k, className: cx("ot-proctor__dot", k < p.count && "ot-proctor__dot--on") }));
    return h("span", { className: "ot-proctor__dots", "aria-hidden": true }, out);
  }
  function ProctorNotice(p) {
    var kind = p.kind || "setup", video = useRef(null), id = uid("pn"), max = p.maxWarnings || 3, count = p.warnings || 0, noun = p.noun || "quiz";
    useEffect(function () { if (video.current && p.stream) { video.current.srcObject = p.stream; } }, [p.stream, kind]);
    if (kind === "warning") {
      var w = WARN[p.reason] || WARN.tab_switch, lastOne = count >= max - 1;
      return h(Dialog, { open: p.open !== false, onClose: p.onBack, tone: "danger", title: w[0], inline: p.inline,
        actions: [h(Button, { key: "b", onClick: p.onBack }, "Back to the " + noun)] },
        h("div", { className: "ot-proctor__warn" },
          h(WarningDots, { max: max, count: count }),
          h("p", null, h("strong", null, "Warning " + count + " of " + max + ". "), w[1]),
          h("p", null, lastOne ? "One more and your " + noun + " hands itself in." : "At " + plural(max, "warning") + " your " + noun + " hands itself in.")));
    }
    if (kind === "ended") {
      return h("section", { className: cx("ot-proctor ot-proctor--ended", p.className), "aria-labelledby": id },
        h("span", { className: "ot-proctor__badge", "aria-hidden": true }, h(Icon, { name: "shield", size: 30 })),
        h(p.headingAs || "h1", { id: id, className: "ot-proctor__title" }, "Your " + noun + " was handed in automatically"),
        h(WarningDots, { max: max, count: max }),
        h("p", { className: "ot-proctor__text" }, "It reached " + plural(max, "warning") + (p.reasons && p.reasons.length ? ": " + p.reasons.join(", ") + "." : ".") + " Your answers up to then count."),
        h("p", { className: "ot-proctor__text" }, "If something went wrong, like a camera that dropped out, talk to your instructor. Only they can give you another try."),
        h("div", { className: "ot-proctor__actions" },
          p.onContinue || p.continueHref ? h(Button, { onClick: p.onContinue, href: p.continueHref, iconAfter: "arrow-right" }, "See your results") : null,
          p.contactHref ? h(Button, { variant: "secondary", href: p.contactHref, icon: "discussion" }, "Message your instructor") : null));
    }
    if (kind === "denied") {
      return h("section", { className: cx("ot-proctor ot-proctor--denied", p.className), "aria-labelledby": id },
        h("span", { className: "ot-proctor__badge ot-proctor__badge--off", "aria-hidden": true }, h(Icon, { name: "camera", size: 30 })),
        h(p.headingAs || "h1", { id: id, className: "ot-proctor__title" }, "This " + noun + " needs your camera"),
        h("p", { className: "ot-proctor__text" }, "Your browser blocked it. Let OrbiTutor use the camera, then try again."),
        h("ol", { className: "ot-proctor__how" },
          h("li", null, h("strong", null, "On a computer: "), "select the camera or lock icon at the left of the address bar, and set Camera to Allow."),
          h("li", null, h("strong", null, "In the phone app: "), "open your phone's Settings, find OrbiTutor, and turn on Camera.")),
        h("div", { className: "ot-proctor__actions" }, h(Button, { icon: "retry", onClick: p.onRetry }, "Try again")));
    }
    // setup: the camera check before the quiz starts
    var status = p.status || "off", f = FACE[status] || FACE.off, ready = status === "ready";
    var rules = [["external", "Stay on this tab", "Switching tabs or apps counts as a warning."], ["bulb", "Keep your face in view", "Sit where the light is in front of you."],
      ["profile", "Only you in the frame", "Nobody else can be in view."], ["camera", "Keep the camera connected", "Unplugging it counts as a warning."]];
    return h("section", { className: cx("ot-proctor ot-proctor--setup", p.className), "aria-labelledby": id },
      h("div", { className: cx("ot-proctor__view", "ot-proctor__view--" + status) },
        p.stream ? h("video", { ref: video, className: "ot-proctor__video", autoPlay: true, muted: true, playsInline: true, "aria-label": "Your camera" })
          : h("svg", { className: "ot-proctor__scene", viewBox: "-160 -100 320 200", preserveAspectRatio: "xMidYMid slice", "aria-hidden": true },
            status === "ready" || status === "detecting" ? h(Silhouette, { transform: "translate(0 22)" }) : null,
            status === "many" ? [h(Silhouette, { key: 1, transform: "translate(-50 26)" }), h(Silhouette, { key: 2, transform: "translate(62 36) scale(0.9)" })] : null,
            status === "off" || status === "loading" ? h("g", { className: "ot-proctor__officon" }, h("rect", { x: -26, y: -16, width: 52, height: 34, rx: 7 }), h("circle", { cx: 0, cy: 1, r: 9 })) : null),
        status !== "off" && status !== "loading" ? h("span", { className: "ot-proctor__guide", "aria-hidden": true }) : null,
        h("p", { className: "ot-proctor__status ot-proctor__status--" + f[1], role: "status" }, h(Icon, { name: f[2], size: 16 }), f[0])),
      h("div", { className: "ot-proctor__side" },
        h("p", { className: "ot-proctor__eyebrow" }, "Camera check"),
        h(p.headingAs || "h1", { id: id, className: "ot-proctor__title" }, "This " + noun + " is supervised"),
        h("p", { className: "ot-proctor__text" }, "Your camera stays on while you answer. After " + plural(max, "warning") + " the " + noun + " hands itself in."),
        h("ul", { className: "ot-proctor__rules" }, rules.map(function (r) {
          return h("li", { key: r[1] }, h("span", { className: "ot-proctor__ruleicon", "aria-hidden": true }, h(Icon, { name: r[0], size: 18 })), h("span", null, h("strong", null, r[1]), h("span", null, r[2])));
        })),
        h("div", { className: "ot-proctor__actions" },
          status === "off" ? h(Button, { icon: "camera", onClick: p.onAllow }, "Turn on your camera")
            : h(Button, { icon: "play", disabled: !ready, loading: status === "loading", onClick: p.onStart }, "Start the " + noun),
          !ready && status !== "off" ? h("span", { className: "ot-proctor__wait" }, "Start opens once we can see your face.") : null),
        p.privacyText !== false ? h("p", { className: "ot-proctor__privacy" }, h(Icon, { name: "lock", size: 14 }), p.privacyText || "Only your instructor sees the camera snapshots, and only for this " + noun + ".") : null));
  }

  // ---- assignments: the brief, handing work in, and where it stands ----
  var ASSIGN = {
    pdf: ["a PDF", ".pdf,application/pdf", "A PDF, up to 20 MB", 20971520], image: ["a photo", "image/*", "A JPG, PNG or HEIC photo, up to 20 MB", 20971520],
    document: ["a document", ".pdf,.doc,.docx,.odt", "A PDF, Word or OpenDocument file, up to 20 MB", 20971520], link: ["a link"], text: ["a written answer"] };
  function AssignmentPage(p) {
    var now = useNow(p.now, 60000), due = toDate(p.due), opens = toDate(p.opensAt), type = ASSIGN[p.type] ? p.type : "pdf", t = ASSIGN[type], id = uid("ap");
    var status = p.status || "todo", ed = useState(false), txt = useState(p.defaultText || ""), lnk = useState(p.defaultLink || ""), er = useState(null);
    var gate = opens && now < opens ? "opens" : due && now > due && status === "todo" ? "closed" : null;
    var editing = status === "todo" || ed[0], label = dueLabel({ due: p.due, status: status === "todo" ? "todo" : "submitted", statusText: status === "todo" ? null : "Handed in" }, now);
    function submit() {
      var up = p.upload || {}, value = { type: type };
      if (type === "link") { if (!/^https?:\/\/\S+\.\S+/.test(lnk[0].trim())) return er[1]("Paste the full link, starting with https://"); value.link = lnk[0].trim(); }
      else if (type === "text") { if (!norm(txt[0])) return er[1]("Write your answer first."); value.text = txt[0]; }
      else if (up.state !== "uploaded") return er[1](up.state === "uploading" ? "Wait for your file to finish uploading." : "Add your file first.");
      er[1](null); ed[1](false);
      if (p.onSubmit) p.onSubmit(value);
    }
    var form;
    if (type === "link") form = h(TextField, { label: "Link to your work", type: "url", inputMode: "url", placeholder: "https://", maxLength: 2048, autoCapitalize: "none", spellCheck: false, value: lnk[0], error: er[0], hint: "Make sure anyone with the link can open it.", onChange: function (e) { lnk[1](e.target.value); er[1](null); } });
    else if (type === "text") {
      var words = norm(txt[0]) ? norm(txt[0]).split(" ").length : 0;
      form = h("div", null, h(TextField, { label: "Your answer", multiline: true, rows: 8, maxLength: 50000, value: txt[0], error: er[0], onChange: function (e) { txt[1](e.target.value); er[1](null); } }),
        h("p", { className: "ot-assign__count" }, plural(words, "word")));
    } else {
      var up = p.upload || {};
      form = h("div", null, h(FileUpload, { label: "Your " + (type === "image" ? "photo" : "file"), accept: t[1], hint: t[2], maxSize: p.maxSize || t[3], state: up.state || "empty", fileName: up.fileName, fileSize: up.fileSize, progress: up.progress,
        error: up.error, onPick: function (file) { er[1](null); if (p.onPick) p.onPick(file); }, onRemove: p.onRemove, onRetry: p.onRetry }),
        er[0] ? h("p", { className: "ot-field__error", role: "alert" }, er[0]) : null);
    }
    var work = gate === "opens" ? h("p", { className: "ot-assign__gate" }, h(Icon, { name: "lock", size: 20 }), "You can hand your work in from " + whenText(opens, now) + ". Read the brief now if you like.")
      : gate === "closed" ? h("p", { className: "ot-assign__gate" }, h(Icon, { name: "due", size: 20 }), "This assignment closed " + whenText(due, now) + ". If you still need to hand it in, talk to your instructor.")
      : editing ? h("div", { className: "ot-assign__form" }, form,
        h("div", { className: "ot-assign__actions" },
          h(Button, { icon: "upload", loading: p.submitting, onClick: submit }, status === "todo" ? "Submit assignment" : "Save changes"),
          status !== "todo" ? h(Button, { variant: "text", onClick: function () { ed[1](false); er[1](null); } }, "Cancel") : null,
          status === "todo" && due ? h("span", { className: "ot-assign__duenote" }, "You can change it until it's marked.") : null))
      : h(AssignmentStatus, { status: status, submittedAt: p.submittedAt, markedAt: p.markedAt, evaluator: p.evaluator, feedback: p.feedback, submission: p.submission, now: p.now,
        onEdit: gate ? undefined : function () { ed[1](true); }, onAskAgain: p.onAskAgain, continueHref: p.continueHref, headingAs: "h3" });
    return h("article", { className: cx("ot-assign", p.className), style: trackStyle(p.track), "aria-labelledby": id },
      h("header", { className: "ot-assign__head" },
        p.back ? h("a", { className: "ot-back", href: p.back.href, onClick: p.back.onClick }, h(Icon, { name: "arrow-left", size: 18 }), h("span", null, p.back.label || "Back to the lesson")) : null,
        h("p", { className: "ot-assign__eyebrow" }, "Assignment" + (p.course ? " \u00b7 " + p.course : "")),
        h(p.headingAs || "h1", { id: id, className: "ot-assign__title" }, p.title),
        h("div", { className: "ot-assign__meta" },
          due || status !== "todo" ? h(Badge, { tone: label.tone, icon: label.icon }, label.text) : null,
          h("span", { className: "ot-assign__kind" }, h(Icon, { name: type === "link" ? "external" : type === "text" ? "reading" : "upload", size: 16 }), "Hand in " + t[0]))),
      h("section", { className: "ot-assign__brief", "aria-label": "The brief" },
        h("h2", { className: "ot-assign__subtitle" }, "The brief"),
        rich({ html: p.html, text: p.brief }, "ot-prose ot-assign__prose")),
      h("section", { className: "ot-assign__work", "aria-label": "Your work" },
        h("h2", { className: "ot-assign__subtitle" }, "Your work"),
        work));
  }

  var MARKING = {
    submitted: ["Waiting to be marked", "You can still change your work until your instructor marks it.", "due", "neutral"],
    returned: ["Sent back for changes", "Your instructor left a note. Make the changes and save to hand it in again.", "retry", "warning"],
    passed: ["Passed", null, "done", "success"],
    failed: ["Not passed", "Read the feedback. If you'd like another try, ask your instructor to reopen it.", "info", "danger"] };
  function AssignmentStatus(p) {
    var status = MARKING[p.status] ? p.status : "submitted", m = MARKING[status], now = useNow(p.now, 60000), id = uid("ast");
    var sub = p.submission || {}, marked = status === "passed" || status === "failed", ev = p.evaluator;
    var steps = [
      { label: "Handed in", sub: p.submittedAt ? whenText(toDate(p.submittedAt), now) : null, state: "done" },
      { label: status === "returned" ? "Sent back" : "Being marked", sub: ev && !marked ? "By " + ev.name : null, state: status === "submitted" ? "current" : status === "returned" ? "back" : "done" },
      { label: status === "passed" ? "Passed" : status === "failed" ? "Not passed" : "Marked", sub: marked && p.markedAt ? longDate(toDate(p.markedAt)) : null, state: marked ? (status === "passed" ? "passed" : "failed") : "todo" }];
    var text = status === "passed" ? (ev ? "Marked by " + ev.name + (p.markedAt ? " on " + longDate(toDate(p.markedAt)) : "") + "." : "Well done.") : m[1];
    return h("section", { className: cx("ot-astatus", "ot-astatus--" + status, p.className), "aria-labelledby": id },
      h("ol", { className: "ot-astatus__steps" }, steps.map(function (s, k) {
        return h("li", { key: k, className: "ot-astatus__step ot-astatus__step--" + s.state, "aria-current": s.state === "current" || s.state === "back" ? "step" : undefined },
          h("span", { className: "ot-astatus__node", "aria-hidden": true },
            s.state === "todo" ? k + 1 : s.state === "current" ? h(Icon, { name: "due", size: 16 }) : s.state === "back" ? h(Icon, { name: "retry", size: 16 }) : s.state === "failed" ? h(Icon, { name: "close", size: 16, strokeWidth: 2.4 }) : h(Icon, { name: "check", size: 16, strokeWidth: 2.6 })),
          h("span", { className: "ot-astatus__steptext" }, h("strong", null, s.label), s.sub ? h("span", null, s.sub) : null));
      })),
      h("div", { className: "ot-astatus__head" },
        h("span", { className: "ot-astatus__icon", "aria-hidden": true }, h(Icon, { name: m[2], size: 24 })),
        h("div", null,
          h(p.headingAs || "h2", { id: id, className: "ot-astatus__title" }, m[0]),
          text ? h("p", { className: "ot-astatus__text" }, text) : null)),
      sub.fileName || sub.link || sub.text ? h("div", { className: "ot-astatus__sub" },
        h("p", { className: "ot-astatus__label" }, "What you handed in"),
        sub.fileName ? h("a", { className: "ot-astatus__file", href: sub.href, target: "_blank", rel: "noopener noreferrer" },
          h("span", { className: "ot-astatus__fileicon", "aria-hidden": true }, h(Icon, { name: "file", size: 20 })),
          h("span", { className: "ot-astatus__filetext" }, h("strong", null, sub.fileName), sub.fileSize ? h("span", null, fileSize(sub.fileSize)) : null),
          h(Icon, { name: "external", size: 18 }))
          : sub.link ? h("a", { className: "ot-astatus__file", href: sub.link, target: "_blank", rel: "noopener noreferrer" },
            h("span", { className: "ot-astatus__fileicon", "aria-hidden": true }, h(Icon, { name: "external", size: 20 })),
            h("span", { className: "ot-astatus__filetext" }, h("strong", null, sub.link.replace(/^https?:\/\//, "")), h("span", null, "Opens in a new tab")))
          : h("blockquote", { className: "ot-astatus__quote" }, sub.text)) : null,
      p.feedback ? h("figure", { className: "ot-astatus__feedback" },
        h("figcaption", null, ev ? h(Avatar, { name: ev.name, src: ev.src, size: 32, decorative: true }) : null, h("span", null, h("strong", null, ev ? ev.name : "Your instructor"), " left feedback")),
        h("blockquote", null, p.feedback)) : null,
      h("div", { className: "ot-astatus__actions" },
        p.onEdit && (status === "submitted" || status === "returned") ? h(Button, { variant: status === "returned" ? "primary" : "secondary", icon: "settings", onClick: p.onEdit }, status === "returned" ? "Make changes" : "Change your work") : null,
        status === "failed" && p.onAskAgain ? h(Button, { variant: "secondary", icon: "discussion", onClick: p.onAskAgain }, "Ask for another try") : null,
        p.continueHref && marked ? h(Button, { variant: status === "passed" ? "primary" : "text", href: p.continueHref, iconAfter: "arrow-right" }, "Back to the lesson") : null));
  }

  // ---- coding exercises: the problem, an editor, Run tests, and how each test went ----
  var KW = {
    python: "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(" "),
    javascript: "const let var function return if else for while do break continue new class extends import from export default try catch finally throw typeof instanceof of in null undefined true false this async await switch case".split(" ") };
  var BUILTINS = {
    python: "print input len range int str float list dict set tuple sorted sum min max abs round open enumerate zip map filter isinstance".split(" "),
    javascript: "console Math JSON parseInt parseFloat Number String Array Object require".split(" ") };
  function escHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  // a small highlighter for the editor; it uses the same colour classes as CodeBlock
  function highlightCode(code, lang) {
    var js = lang === "javascript", kw = KW[js ? "javascript" : "python"], bi = BUILTINS[js ? "javascript" : "python"];
    var re = js ? /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g
      : /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
    var out = "", last = 0, m, afterDef = false;
    while ((m = re.exec(code))) {
      out += escHtml(code.slice(last, m.index)); last = re.lastIndex;
      var tok = m[0], cls = m[1] ? "hljs-comment" : m[2] ? "hljs-string" : m[3] ? "hljs-number" : kw.indexOf(tok) >= 0 ? "hljs-keyword" : bi.indexOf(tok) >= 0 ? "hljs-built_in" : afterDef ? "hljs-title function_" : "";
      afterDef = !!m[4] && (tok === "def" || tok === "function" || tok === "class");
      out += cls ? "<span class=\"" + cls + "\">" + escHtml(tok) + "</span>" : escHtml(tok);
    }
    return out + escHtml(code.slice(last));
  }
  function CodeEditor(p) {
    var ta = useRef(null), esc = useRef(false), sel = useRef(null), id = uid("ce"), code = p.value || "", lines = code.split("\n").length, tab = p.language === "javascript" ? "  " : "    ";
    // put the cursor back as soon as the new text is on screen, before the next key arrives
    useLayoutEffect(function () {
      if (sel.current && ta.current) { ta.current.setSelectionRange(sel.current[0], sel.current[1]); sel.current = null; }
    });
    function edit(next, a, b) { sel.current = [a, b]; p.onChange(next); }
    function keys(e) {
      var el = e.target, s = el.selectionStart, en = el.selectionEnd, v = el.value;
      if (e.key === "Escape") { esc.current = true; return; }
      if (e.key === "Tab" && esc.current) { esc.current = false; return; }
      esc.current = false;
      if (e.key === "Tab") {
        e.preventDefault();
        var ls = v.lastIndexOf("\n", s - 1) + 1;
        if (e.shiftKey) {
          var strip = v.slice(ls, ls + tab.length).match(/^ */)[0].length;
          if (strip) edit(v.slice(0, ls) + v.slice(ls + strip), Math.max(ls, s - strip), Math.max(ls, en - strip));
        } else edit(v.slice(0, s) + tab + v.slice(en), s + tab.length, s + tab.length);
      } else if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        var line = v.slice(v.lastIndexOf("\n", s - 1) + 1, s), indent = line.match(/^\s*/)[0];
        if (/[:{[(]\s*$/.test(line)) indent += tab;
        edit(v.slice(0, s) + "\n" + indent + v.slice(en), s + 1 + indent.length, s + 1 + indent.length);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && p.onRun) { e.preventDefault(); p.onRun(); }
    }
    var nums = [];
    for (var k = 1; k <= lines; k++) nums.push(h("span", { key: k }, k));
    return h("div", { className: "ot-code ot-editor" },
      h("div", { className: "ot-code__bar" },
        h("span", { className: "ot-code__lang" }, p.fileName || (p.language === "javascript" ? "solution.js" : "solution.py")),
        h("span", { className: "ot-editor__tools" },
          p.savedText ? h("span", { className: "ot-editor__saved" }, h(Icon, { name: "check", size: 14, strokeWidth: 2.4 }), p.savedText) : null,
          p.onReset ? h("button", { type: "button", className: "ot-code__copy", onClick: p.onReset }, h(Icon, { name: "retry", size: 16 }), "Reset") : null)),
      h("div", { className: "ot-editor__scroll" },
        h("div", { className: "ot-editor__gutter", "aria-hidden": true }, nums),
        h("div", { className: "ot-editor__layer" },
          h("pre", { className: "ot-editor__hl", "aria-hidden": true, dangerouslySetInnerHTML: { __html: highlightCode(code, p.language) + "\n" } }),
          h("textarea", { ref: ta, id: id, className: "ot-editor__input", value: code, wrap: "off", spellCheck: false, autoCapitalize: "off", autoComplete: "off", autoCorrect: "off",
            "aria-label": "Your code", "aria-describedby": id + "k", onChange: function (e) { p.onChange(e.target.value); }, onKeyDown: keys }))),
      h("p", { id: id + "k", className: "ot-editor__keys" }, "Tab indents. Press Esc, then Tab, to leave the editor. Ctrl + Enter runs the tests."));
  }
  function useWidth(ref) {
    var st = useState(0);
    useLayoutEffect(function () {
      var el = ref.current;
      if (!el) return;
      st[1](el.getBoundingClientRect().width);
      if (!window.ResizeObserver) return;
      var ro = new ResizeObserver(function (en) { st[1](en[0].contentRect.width); });
      ro.observe(el);
      return function () { ro.disconnect(); };
    }, []);
    return st[0];
  }
  function CodeExercise(p) {
    var root = useRef(null), wide = useWidth(root) >= 760, id = uid("cx"), tests = p.tests || [];
    var cd = useState(p.defaultCode != null ? p.defaultCode : p.starterCode || ""), code = p.code != null ? p.code : cd[0];
    var rs = useState(p.initialResults || null), results = rs[0], cs = useState(p.initialConsole || null), con = cs[0];
    var run = useState(false), tb = useState("problem"), rd = useState(false), news = useState(""), took = useState(p.initialTime || null);
    function setCode(v) { if (p.code == null) cd[1](v); if (p.onChange) p.onChange(v); }
    var passed = results ? results.filter(function (r) { return r && r.passed; }).length : 0, all = results && passed === tests.length && tests.length > 0;
    function runTests() {
      if (run[0] || !p.onRun) return;
      run[1](true); news[1]("Running your code");
      Promise.resolve(p.onRun(code)).then(function (out) {
        run[1](false); rs[1](out.results || []); cs[1](out.console || []); took[1](out.time || null);
        var n = (out.results || []).filter(function (r) { return r && r.passed; }).length;
        news[1](n === tests.length ? "All " + tests.length + " tests passed." : n + " of " + tests.length + " tests passed.");
        if (!wide) tb[1]("tests");
      }, function (e) {
        run[1](false); cs[1]([{ kind: "err", text: (e && e.message) || "We couldn't run your code. Check your connection and try again." }]); news[1]("Your code didn't run.");
      });
    }
    var statement = h("section", { className: "ot-exercise__problem", "aria-label": "The problem" },
      h("p", { className: "ot-exercise__eyebrow" }, "Coding exercise" + (p.course ? " \u00b7 " + p.course : "")),
      h(p.headingAs || "h1", { className: "ot-exercise__title" }, p.title),
      rich({ html: p.html, text: p.statement }, "ot-prose ot-exercise__prose"));
    var summary = results ? h("span", { className: cx("ot-exercise__sum", all ? "ot-exercise__sum--all" : "ot-exercise__sum--some") }, all ? "All " + tests.length + " passed" : passed + " of " + tests.length + " passed") : h("span", { className: "ot-exercise__sum" }, "Not run yet");
    var testList = h("section", { className: "ot-tests", "aria-label": "Tests" },
      h("div", { className: "ot-tests__head" }, h("h2", { className: "ot-tests__title" }, "Tests"), summary),
      h("div", { className: "ot-tests__bar", "aria-hidden": true }, tests.map(function (t, k) {
        var r = results && results[k];
        return h("span", { key: k, className: cx("ot-tests__pip", r && (r.passed ? "ot-tests__pip--pass" : "ot-tests__pip--fail")) });
      })),
      h("ol", { className: "ot-tests__list" }, tests.map(function (t, k) {
        var r = results && results[k], state = !r ? "todo" : r.passed ? "pass" : "fail";
        var word = state === "todo" ? "Not run" : state === "pass" ? "Passed" : "Failed";
        return h("li", { key: k, className: "ot-test ot-test--" + state },
          h("details", { open: state === "fail" && !t.hidden ? true : undefined },
            h("summary", null,
              h("span", { className: "ot-test__icon", "aria-hidden": true }, h(Icon, { name: state === "pass" ? "check" : state === "fail" ? "close" : "due", size: 16, strokeWidth: 2.4 })),
              h("span", { className: "ot-test__name" }, (t.hidden ? "Hidden test " : "Test ") + (k + 1)),
              h("span", { className: "ot-test__word" }, word, r && r.time != null ? h("span", { className: "ot-test__time" }, " \u00b7 " + r.time.toFixed(2) + " s") : null),
              h(Icon, { name: "chevron-down", size: 18, className: "ot-test__chev" })),
            t.hidden ? h("p", { className: "ot-test__hidden" }, h(Icon, { name: "lock", size: 16 }), "We don't show this test's input, so your code has to work for any input, not just the examples.")
              : h("dl", { className: "ot-test__io" },
                h("div", null, h("dt", null, "Input"), h("dd", null, h("code", null, t.input || "(nothing)"))),
                h("div", null, h("dt", null, "Expected"), h("dd", null, h("code", null, t.expected))),
                r ? h("div", { className: state === "fail" ? "ot-test__got--wrong" : undefined }, h("dt", null, "Your output"), h("dd", null, h("code", null, r.output === "" || r.output == null ? "(nothing printed)" : r.output))) : null)));
      })));
    var consolePane = h("section", { className: "ot-console", "data-theme": "night", "aria-label": "Console" },
      h("div", { className: "ot-console__bar" }, h("span", null, "Console"), took[0] != null ? h("span", { className: "ot-console__time" }, "Ran in " + took[0].toFixed(2) + " s") : null),
      h("pre", { className: "ot-console__out", tabIndex: 0 }, run[0] ? h("span", { className: "ot-console__info" }, "Running your code\u2026")
        : con && con.length ? con.map(function (l, k) { return h("span", { key: k, className: "ot-cline ot-cline--" + (l.kind || "out") }, (l.kind === "cmd" ? "$ " : "") + l.text + "\n"); })
          : h("span", { className: "ot-console__info" }, "Run your code to see what it prints.")));
    var editor = h(CodeEditor, { value: code, onChange: setCode, language: (p.language || "python").toLowerCase(), savedText: p.savedText, onRun: runTests, onReset: p.starterCode != null ? function () { rd[1](true); } : null });
    var actions = h("div", { className: "ot-exercise__actions" },
      h(Button, { icon: "play", loading: run[0], onClick: runTests, variant: all && p.onSubmit ? "secondary" : "primary" }, run[0] ? "Running" : "Run tests"),
      p.onSubmit ? h(Button, { icon: "upload", variant: all ? "primary" : "secondary", onClick: function () { p.onSubmit(code); } }, "Submit") : null,
      all ? h("span", { className: "ot-exercise__done" }, h(Icon, { name: "done", size: 18 }), p.onSubmit ? "Every test passes. Submit when you're happy." : "Every test passes. Your code is saved.") : null);
    var tabs = [{ id: "problem", label: "Problem" }, { id: "code", label: "Code" }, { id: "tests", label: "Tests", count: results ? passed + "/" + tests.length : null }];
    var body = wide ? h("div", { className: "ot-exercise__grid" },
      h("div", { className: "ot-exercise__left" }, statement, testList),
      h("div", { className: "ot-exercise__right" }, editor, actions, consolePane))
      : h("div", { className: "ot-exercise__stack" },
        h(Tabs, { label: "Exercise", value: tb[0], onChange: tb[1], tabs: tabs.map(function (t) { return Object.assign({}, t, { tabId: id + t.id, panel: id + "p" }); }) }),
        h("div", { id: id + "p", role: "tabpanel", "aria-labelledby": id + tb[0], className: "ot-exercise__panel" },
          tb[0] === "problem" ? statement : tb[0] === "code" ? [h("div", { key: "e" }, editor), h("div", { key: "a" }, actions), h("div", { key: "c" }, consolePane)] : [h("div", { key: "t" }, testList), h("div", { key: "a" }, actions)]));
    return h("div", { ref: root, className: cx("ot-exercise", p.className), style: trackStyle(p.track || "code") },
      body,
      h("p", { className: "ot-visually-hidden", role: "status" }, news[0]),
      h(Dialog, { open: rd[0], onClose: function () { rd[1](false); }, title: "Start again?",
        actions: [h(Button, { key: "k", variant: "secondary", onClick: function () { rd[1](false); } }, "Keep my code"),
          h(Button, { key: "r", variant: "danger", onClick: function () { rd[1](false); setCode(p.starterCode || ""); rs[1](null); cs[1](null); took[1](null); } }, "Start again")] },
        h("p", { className: "ot-quizframe__sum" }, "Your code goes back to how the exercise started. This can't be undone.")));
  }

  // ---- competitions: the place, the award, the topics, and the answers once everyone has finished ----
  function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function CompetitionResults(p) {
    var now = useNow(p.now, 60000), id = uid("cr"), opens = toDate(p.answersAt), open = !opens || now >= opens, pct = p.outOf ? Math.round((p.score / p.outOf) * 100) : 0;
    var award = p.award ? String(p.award).toLowerCase() : null;
    return h("section", { className: cx("ot-compres", p.className), style: trackStyle("competitions"), "aria-labelledby": id },
      h("div", { className: "ot-compres__top" },
        h("div", { className: "ot-compres__text" },
          h("p", { className: "ot-compres__eyebrow" }, "Competition results"),
          h(p.headingAs || "h1", { id: id, className: "ot-compres__title" }, p.title),
          p.subtitle ? h("p", { className: "ot-compres__line" }, p.subtitle) : null,
          h("dl", { className: "ot-compres__stats" },
            h("div", { className: "ot-compres__stat ot-compres__stat--place" }, h("dt", null, "Your place"),
              h("dd", null, p.rank ? [h("strong", { key: "r" }, ordinal(p.rank)), p.entrants ? h("span", { key: "o" }, " of " + p.entrants) : null] : h("span", null, "After it closes"))),
            h("div", { className: "ot-compres__stat" }, h("dt", null, "Score"), h("dd", null, h("strong", null, p.score), " of " + p.outOf)),
            p.minutes != null ? h("div", { className: "ot-compres__stat" }, h("dt", null, "Time taken"), h("dd", null, h("strong", null, p.minutes), " min" + (p.timeLimit ? " of " + p.timeLimit : ""))) : null)),
        h("div", { className: "ot-compres__medalwrap" },
          award ? h("span", { className: "ot-compres__medal ot-compres__medal--" + (["gold", "silver", "bronze"].indexOf(award) >= 0 ? award : "merit") },
            h("span", { className: "ot-compres__ribbon", "aria-hidden": true }),
            h("span", { className: "ot-compres__disc" }, h(Icon, { name: "certificate", size: 30, strokeWidth: 2 }), h("span", null, p.award)))
            : h(ScoreRing, { value: pct, size: 140 }))),
      p.topics && p.topics.length ? h("div", { className: "ot-compres__topics" },
        h("h2", { className: "ot-compres__subtitle" }, "By topic"),
        h("ul", null, p.topics.map(function (t) {
          var v = t.outOf ? (t.score / t.outOf) * 100 : 0;
          return h("li", { key: t.name, className: "ot-compres__topic" },
            h("span", { className: "ot-compres__topicname" }, t.name),
            h("span", { className: "ot-compres__topicscore" }, t.score + " of " + t.outOf),
            h(ProgressBar, { value: v, size: "thin", tone: "competitions", label: t.name + ": " + t.score + " of " + t.outOf }));
        }))) : null,
      h("div", { className: "ot-compres__answers" },
        open ? [h("p", { key: "t", className: "ot-compres__note" }, h(Icon, { name: "bulb", size: 20 }), "Every question is explained, including the ones you got right. It's the fastest way to do better next time."),
          h("div", { key: "a", className: "ot-compres__actions" },
            p.reviewHref ? h(Button, { href: p.reviewHref, iconAfter: "arrow-right" }, "Go through the answers") : null,
            p.certificateHref ? h(Button, { variant: "secondary", href: p.certificateHref, icon: "certificate" }, "See your certificate") : null)]
          : h("p", { className: "ot-compres__note" }, h(Icon, { name: "lock", size: 20 }), "The answers and explanations open " + whenText(opens, now) + ", once everyone has finished.")),
      p.rank == null ? h("p", { className: "ot-compres__fine" }, "Places are worked out when the competition closes, so everyone sits it on the same terms.") : p.rankNote ? h("p", { className: "ot-compres__fine" }, p.rankNote) : null);
  }

  // ---- Batches and live classes: the student's batch, its timetable, the week's schedule, live classes and evaluations ----
  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  // weeks start on Monday, as Malaysian calendars do
  function weekStart(d) { var x = dayStart(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function dayMonth(d) { return d.getDate() + " " + MONTHS[d.getMonth()]; }
  function rangeText(a, b) { return a.getMonth() === b.getMonth() ? a.getDate() + " to " + dayMonth(b) : dayMonth(a) + " to " + dayMonth(b); }
  function shortDay(d) { return WEEKDAYS[d.getDay()].slice(0, 3); }
  function spanText(a, b) {
    if (!b) return timeText(a);
    var sa = timeText(a), sb = timeText(b);
    return sa.slice(-2) === sb.slice(-2) ? sa.slice(0, -3) + " to " + sb : sa + " to " + sb;
  }
  function minutesBetween(a, b) { return Math.round((b - a) / 60000); }
  function lengthText(m) { return m >= 60 && m % 60 === 0 ? plural(m / 60, "hour") : m > 60 ? Math.floor(m / 60) + " h " + (m % 60) + " min" : m + " min"; }
  function normEvent(e) {
    var s = toDate(e.start), en = toDate(e.end) || (e.kind === "due" ? s : new Date(s.getTime() + (e.minutes || 60) * 60000));
    return Object.assign({}, e, { start: s, end: en });
  }
  var EVENT_KINDS = { "class": ["schedule", "Class"], live: ["live", "Live class"], due: ["due", "Due"], evaluation: ["certificate", "Evaluation"], event: ["schedule", "Event"] };

  // the top of My batch: the batch, when and where it meets, how far through it is, and the people in it
  function BatchHero(p) {
    var now = useNow(p.now, 60000), s = toDate(p.startDate), e = toDate(p.endDate), id = uid("bh");
    // a batch's weeks count from its first day, not from Monday
    var weeks = s && e ? Math.max(1, Math.ceil((dayDiff(s, e) + 1) / 7)) : 0;
    var started = s && now >= s, ended = e && dayDiff(e, now) > 0;
    var week = started ? Math.min(weeks, Math.floor(dayDiff(s, now) / 7) + 1) : 0;
    var pct = !s || !e ? 0 : ended ? 100 : started ? Math.min(100, Math.max(2, ((now - s) / (addDays(e, 1) - s)) * 100)) : 0;
    var where = p.online ? (p.where || "Online") : p.where;
    var progress = !s || !e ? null : ended ? "Finished on " + longDate(e) : !started ? (dayDiff(now, s) === 1 ? "Starts tomorrow" : "Starts in " + plural(dayDiff(now, s), "day")) : "Week " + week + " of " + weeks;
    var ticks = [];
    for (var k = 1; k < weeks; k++) ticks.push(h("span", { key: k, className: "ot-bhero__tick", style: { left: (k / weeks) * 100 + "%" } }));
    var courses = p.courses || [], people = p.instructors || [];
    return h("header", { className: cx("ot-bhero", p.className), style: trackStyle(courses[0] && courses[0].track), "aria-labelledby": id },
      h("div", { className: "ot-bhero__top" },
        h("div", { className: "ot-bhero__titles" },
          h("p", { className: "ot-bhero__eyebrow" }, p.eyebrow || "Your batch"),
          h(p.headingAs || "h1", { id: id, className: "ot-bhero__title" }, p.name),
          courses.length ? h("p", { className: "ot-bhero__courses" }, courses.map(function (c, i) {
            return h("span", { key: i, className: "ot-bhero__course", style: trackStyle(c.track) }, h("span", { className: "ot-bhero__dot", "aria-hidden": true }),
              c.href ? h("a", { href: c.href }, c.title) : c.title);
          })) : null),
        p.action ? h("div", { className: "ot-bhero__action" }, p.action) : null),
      h("dl", { className: "ot-bhero__facts" },
        p.when ? h("div", { className: "ot-bhero__fact" }, h("dt", null, h(Icon, { name: "due", size: 18 }), "When"), h("dd", null, p.when)) : null,
        s && e ? h("div", { className: "ot-bhero__fact" }, h("dt", null, h(Icon, { name: "schedule", size: 18 }), "Dates"), h("dd", null, rangeText(s, e))) : null,
        where ? h("div", { className: "ot-bhero__fact" }, h("dt", null, h(Icon, { name: p.online ? "live" : "home", size: 18 }), "Where"),
          h("dd", null, p.mapHref ? h("a", { href: p.mapHref, target: "_blank", rel: "noopener noreferrer" }, where, h("span", { className: "ot-visually-hidden" }, " (opens a map)")) : where)) : null),
      progress ? h("div", { className: "ot-bhero__progress" },
        h("div", { className: "ot-bhero__progresshead" }, h("strong", null, progress), started && !ended ? h("span", null, "Ends " + longDate(e)) : null),
        h("div", { className: "ot-bhero__track", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(pct), "aria-valuetext": progress, "aria-label": "How far through the batch" },
          h("span", { className: "ot-bhero__fill", style: { width: pct + "%" } }), ticks,
          started && !ended ? h("span", { className: "ot-bhero__now", style: { left: pct + "%" }, "aria-hidden": true }) : null)) : null,
      people.length || p.studentCount || (p.students && p.students.length) ? h("div", { className: "ot-bhero__people" },
        people.length ? h("div", { className: "ot-bhero__group" },
          h("p", { className: "ot-bhero__label" }, people.length === 1 ? "Instructor" : "Instructors"),
          h("ul", { className: "ot-bhero__teachers" }, people.map(function (x, i) {
            return h("li", { key: i }, h(Avatar, { name: x.name, src: x.src, size: 36, decorative: true }), h("span", null, h("strong", null, x.name), x.role ? h("span", null, x.role) : null));
          }))) : null,
        p.students && p.students.length ? h("div", { className: "ot-bhero__group" },
          h("p", { className: "ot-bhero__label" }, "Classmates"),
          h("div", { className: "ot-bhero__class" }, h(AvatarStack, { people: p.students, max: 5, size: 32, label: plural(p.studentCount || p.students.length, "student") + " in this batch" }),
            h("span", null, plural(p.studentCount || p.students.length, "student")))) : null) : null);
  }

  // the batch's timetable (Frappe's batch timetable), a week at a time
  var TT_KINDS = { lesson: ["reading", "Lesson"], video: ["video", "Lesson"], quiz: ["quiz", "Quiz"], assignment: ["assignment", "Assignment"], live: ["live", "Live class"], "class": ["schedule", "Class"], evaluation: ["certificate", "Evaluation"] };
  function Timetable(p) {
    var now = useNow(p.now, 60000), s = toDate(p.startDate), base = dayStart(s || weekStart(now)), id = uid("tt");
    var items = (p.items || []).map(function (x) { return Object.assign({}, x, { date: toDate(x.date), end: toDate(x.end) }); }).sort(function (a, b) { return a.date - b.date; });
    var weeks = [];
    items.forEach(function (x) {
      var n = Math.floor(dayDiff(base, x.date) / 7);
      var w = weeks[n] || (weeks[n] = { n: n + 1, from: addDays(base, n * 7), items: [] });
      w.items.push(x);
    });
    var thisWeek = Math.floor(dayDiff(base, now) / 7) + 1;
    return h("section", { className: cx("ot-tt", p.className), "aria-labelledby": id },
      h(HomeHead, { id: id, title: p.title || "Timetable", headingAs: p.headingAs, action: p.action }),
      h("ol", { className: "ot-tt__weeks" }, weeks.filter(Boolean).map(function (w) {
        var end = toDate(p.endDate), to = end && end < addDays(w.from, 6) ? dayStart(end) : addDays(w.from, 6), cur = w.n === thisWeek, past = w.n < thisWeek;
        var done = w.items.filter(function (x) { return x.status === "done"; }).length, todo = w.items.length;
        return h("li", { key: w.n, className: cx("ot-tt__week", cur && "ot-tt__week--current", past && "ot-tt__week--past") },
          h("details", { open: cur || p.openAll ? true : undefined },
            h("summary", null,
              h("span", { className: "ot-tt__weekno" }, "Week " + w.n),
              h("span", { className: "ot-tt__range" }, rangeText(w.from, to)),
              cur ? h(Badge, { tone: "gold" }, "This week") : past ? h("span", { className: cx("ot-tt__count", done === todo && "ot-tt__count--all") }, done === todo ? h(Icon, { name: "check", size: 14, strokeWidth: 2.4 }) : null, done + " of " + todo + " done")
                : h("span", { className: "ot-tt__count" }, plural(todo, "thing")),
              w.items.some(function (x) { return x.milestone; }) ? h("span", { className: "ot-tt__flag", title: "Milestone" }, h(Icon, { name: "flag", size: 14 }), h("span", { className: "ot-visually-hidden" }, "Has a milestone")) : null,
              h(Icon, { name: "chevron-down", size: 18, className: "ot-tt__chev" })),
            h("ul", { className: "ot-tt__items" }, w.items.map(function (x, i) {
              var k = TT_KINDS[x.kind] || TT_KINDS.lesson, Tag = x.href ? "a" : "div", today = dayDiff(now, x.date) === 0;
              var meta = x.kind === "quiz" || x.kind === "assignment" ? "Due " + timeText(x.date) : x.end ? spanText(x.date, x.end) : x.kind === "lesson" || x.kind === "video" ? null : timeText(x.date);
              return h("li", { key: x.id || i, className: cx("ot-tt__item", x.status && "ot-tt__item--" + x.status, x.milestone && "ot-tt__item--milestone", today && "ot-tt__item--today"), style: trackStyle(x.track) },
                h(Tag, { className: "ot-tt__row", href: x.href },
                  h("span", { className: "ot-tt__day" }, h("span", null, shortDay(x.date)), h("strong", null, x.date.getDate()), today ? h("span", { className: "ot-visually-hidden" }, " (today)") : null),
                  h("span", { className: "ot-tt__icon", "aria-hidden": true }, h(Icon, { name: x.milestone ? "flag" : k[0], size: 18 })),
                  h("span", { className: "ot-tt__text" },
                    h("span", { className: "ot-tt__title" }, x.title),
                    h("span", { className: "ot-tt__meta" }, [x.milestone ? "Milestone" : k[1], meta, x.where].filter(Boolean).join(" \u00b7 "))),
                  x.status === "done" ? h("span", { className: "ot-tt__status ot-tt__status--done" }, h(Icon, { name: "done", size: 18 }), h("span", null, "Done"))
                    : x.status === "missed" ? h("span", { className: "ot-tt__status" }, "Missed")
                      : today ? h(Badge, { tone: "gold" }, "Today") : null));
            }))));
      })));
  }

  // ---- the schedule: a week of classes, live classes, due dates and evaluations; a grid when there's room, a list on phones ----
  function placeColumns(list) {
    // events that overlap share the day's width
    var cols = [], out = [];
    list.forEach(function (e) {
      var c = 0;
      while (cols[c] && cols[c] > e.start) c++;
      cols[c] = e.end; out.push({ e: e, col: c });
    });
    out.forEach(function (o) { o.of = cols.length; });
    return out;
  }
  function eventState(e, now) { return e.kind === "due" ? (e.status === "submitted" ? "done" : e.start < now ? "late" : "todo") : e.end <= now ? "past" : e.start <= now ? "live" : minutesBetween(now, e.start) <= 10 ? "soon" : "todo"; }
  function Schedule(p) {
    var now = useNow(p.now, 60000), root = useRef(null), w = useWidth(root), id = uid("sc");
    var wk = useState(function () { return weekStart(toDate(p.week) || now); }), from = wk[0], to = addDays(from, 7);
    var vw = useState(p.defaultView || "week"), news = useState("");
    var grid = w >= (p.gridMinWidth || 700) && vw[0] === "week";
    var events = (p.events || []).map(normEvent).filter(function (e) { return e.start >= from && e.start < to; }).sort(function (a, b) { return a.start - b.start; });
    var isThis = dayDiff(weekStart(now), from) === 0;
    function move(n) {
      var next = n === 0 ? weekStart(now) : addDays(from, 7 * n);
      wk[1](next); news[1]((dayDiff(weekStart(now), next) === 0 ? "This week, " : "Week of ") + rangeText(next, addDays(next, 6)));
      if (p.onWeekChange) p.onWeekChange(next);
    }
    var bar = h("div", { className: "ot-sched__bar" },
      h("div", { className: "ot-sched__nav" },
        h(Button, { variant: "secondary", size: "sm", iconOnly: true, icon: "arrow-left", onClick: function () { move(-1); } }, "Previous week"),
        h(Button, { variant: "secondary", size: "sm", iconOnly: true, icon: "arrow-right", onClick: function () { move(1); } }, "Next week"),
        h("h2", { id: id, className: "ot-sched__range" }, rangeText(from, addDays(from, 6)), isThis ? h("span", { className: "ot-sched__this" }, "This week") : null),
        !isThis ? h(Button, { variant: "text", size: "sm", onClick: function () { move(0); } }, "Back to this week") : null),
      w >= (p.gridMinWidth || 700) ? h(SegmentedControl, { label: "Show the week as", value: vw[0], onChange: vw[1], options: [{ value: "week", label: "Week", icon: "schedule" }, { value: "list", label: "List", icon: "menu" }] }) : null);
    var body;
    if (!events.length) body = h(EmptyState, { compact: true, icon: "schedule", title: isThis ? "Nothing on this week" : "Nothing on that week", titleAs: "h3" }, p.emptyText || "Classes, live classes and due dates show up here as soon as they're set.");
    else if (grid) {
      var timed = events.filter(function (e) { return e.kind !== "due"; }), dues = events.filter(function (e) { return e.kind === "due"; });
      var first = Math.min(p.startHour != null ? p.startHour : 8, Math.min.apply(null, timed.map(function (e) { return e.start.getHours(); }).concat([24])));
      var last = Math.max(p.endHour != null ? p.endHour : 18, Math.max.apply(null, timed.map(function (e) { return e.end.getHours() + (e.end.getMinutes() ? 1 : 0); }).concat([0])));
      var hh = 56, hours = [];
      for (var hr = first; hr < last; hr++) hours.push(hr);
      var days = [0, 1, 2, 3, 4, 5, 6].map(function (k) { return addDays(from, k); });
      var nowTop = isThis ? ((now.getHours() + now.getMinutes() / 60) - first) * hh : -1;
      body = h("div", { className: "ot-week", style: { "--hh": hh + "px" } },
        h("div", { className: "ot-week__head", "aria-hidden": true }, h("span"), days.map(function (d, k) {
          var today = dayDiff(now, d) === 0;
          return h("span", { key: k, className: cx("ot-week__day", today && "ot-week__day--today") }, h("span", null, shortDay(d)), h("strong", null, d.getDate()));
        })),
        dues.length ? h("div", { className: "ot-week__dues" }, h("span", { className: "ot-week__dueslabel", "aria-hidden": true }, "Due"), days.map(function (d, k) {
          var list = dues.filter(function (e) { return dayDiff(d, e.start) === 0; });
          return h("ul", { key: k, className: "ot-week__duecell", "aria-label": list.length ? "Due on " + longDate(d) : undefined }, list.map(function (e, i) {
            var st = eventState(e, now), Tag = e.href ? "a" : "span";
            return h("li", { key: e.id || i }, h(Tag, { href: e.href, className: cx("ot-wdue", "ot-wdue--" + st), style: trackStyle(e.track), title: e.title + " \u00b7 due " + timeText(e.start) },
              h(Icon, { name: st === "done" ? "check" : e.icon || "due", size: 14, strokeWidth: 2.2 }), h("span", null, e.title),
              h("span", { className: "ot-visually-hidden" }, ", " + (st === "done" ? "handed in" : "due " + timeText(e.start)))));
          }));
        })) : null,
        h("div", { className: "ot-week__body", style: { height: hours.length * hh } },
          h("div", { className: "ot-week__hours", "aria-hidden": true }, hours.map(function (x) { return h("span", { key: x, style: { top: (x - first) * hh } }, (x % 12 || 12) + (x < 12 ? " am" : " pm")); })),
          days.map(function (d, k) {
            var list = placeColumns(timed.filter(function (e) { return dayDiff(d, e.start) === 0; })), today = dayDiff(now, d) === 0;
            return h("div", { key: k, className: cx("ot-week__col", today && "ot-week__col--today") },
              h("h3", { className: "ot-visually-hidden" }, (today ? "Today, " : "") + longDate(d)),
              list.length ? h("ul", null, list.map(function (o, i) {
                var e = o.e, st = eventState(e, now), kind = EVENT_KINDS[e.kind] || EVENT_KINDS.event, Tag = e.href ? "a" : "div";
                var top = ((e.start.getHours() + e.start.getMinutes() / 60) - first) * hh, ht = Math.max(26, (minutesBetween(e.start, e.end) / 60) * hh - 3);
                return h("li", { key: e.id || i, className: "ot-wevent__slot", style: { top: top, height: ht, left: (o.col / o.of) * 100 + "%", width: 100 / o.of + "%" } },
                  h(Tag, { href: e.href, className: cx("ot-wevent", "ot-wevent--" + e.kind, "ot-wevent--is-" + st, ht < 36 && "ot-wevent--short"), style: trackStyle(e.track) },
                    h("span", { className: "ot-wevent__time" }, st === "live" ? h("span", { className: "ot-wevent__live" }, "Live") : h(Icon, { name: kind[0], size: 12, strokeWidth: 2.2 }), timeText(e.start), h("span", { className: "ot-visually-hidden" }, " to " + timeText(e.end))),
                    h("span", { className: "ot-wevent__title" }, h("span", { className: "ot-visually-hidden" }, kind[1] + ": "), e.title),
                    e.where && ht >= 92 ? h("span", { className: "ot-wevent__where" }, e.where) : null));
              })) : null,
              today && nowTop >= 0 && nowTop <= hours.length * hh ? h("span", { className: "ot-week__now", style: { top: nowTop }, "aria-hidden": true }) : null);
          })));
    } else {
      var byDay = [];
      events.forEach(function (e) { var g = byDay[byDay.length - 1]; if (!g || dayDiff(g.d, e.start) !== 0) byDay.push(g = { d: dayStart(e.start), list: [] }); g.list.push(e); });
      body = h("div", { className: "ot-agenda" }, byDay.map(function (g, gi) {
        var n = dayDiff(now, g.d);
        return h("section", { key: gi, className: cx("ot-agenda__day", n === 0 && "ot-agenda__day--today", n < 0 && "ot-agenda__day--past"), "aria-label": longDate(g.d) },
          h("h3", { className: "ot-agenda__date" }, n === 0 ? h("span", { className: "ot-agenda__today" }, "Today") : n === 1 ? h("span", { className: "ot-agenda__today" }, "Tomorrow") : null, longDate(g.d)),
          h("ul", { className: "ot-agenda__list" }, g.list.map(function (e, i) {
            var st = eventState(e, now), kind = EVENT_KINDS[e.kind] || EVENT_KINDS.event, Tag = e.href ? "a" : "div";
            var join = (st === "live" || st === "soon") && e.joinHref;
            return h("li", { key: e.id || i, className: cx("ot-agenda__item", "ot-agenda__item--" + st), style: trackStyle(e.track) },
              h(Tag, { href: e.href, className: "ot-agenda__row" },
                h("span", { className: "ot-agenda__time" }, h("strong", null, timeText(e.start)), h("span", null, e.kind === "due" ? "Due" : lengthText(minutesBetween(e.start, e.end)))),
                h("span", { className: "ot-agenda__bar", "aria-hidden": true }),
                h("span", { className: "ot-agenda__text" },
                  h("span", { className: "ot-agenda__kind" }, h(Icon, { name: e.kind === "due" ? e.icon || "due" : kind[0], size: 14 }), [kind[1], e.course].filter(Boolean).join(" \u00b7 ")),
                  h("span", { className: "ot-agenda__title" }, e.title),
                  e.where ? h("span", { className: "ot-agenda__where" }, e.where) : null)),
              join ? h(Button, { size: "sm", icon: "live", href: e.joinHref, target: "_blank", className: cx("ot-agenda__join", st === "live" && "ot-live__join--live") }, "Join", h("span", { className: "ot-visually-hidden" }, " " + e.title + " (opens in a new tab)"))
                : st === "live" ? h(Badge, { tone: "live" }, "Live now")
                  : e.kind === "due" && st === "done" ? h(Badge, { tone: "success", icon: "check" }, "Handed in")
                    : e.kind === "due" && st === "late" ? h(Badge, { tone: "danger", icon: "warning" }, "Overdue") : null);
          })));
      }));
    }
    return h("div", { ref: root, className: cx("ot-sched", p.className) },
      bar, h("div", { className: "ot-sched__body", "aria-labelledby": id, role: "region" }, body),
      p.timezone ? h("p", { className: "ot-sched__tz" }, "Times are in " + p.timezone + ".") : null,
      h("p", { className: "ot-visually-hidden", role: "status" }, news[0]));
  }

  // ---- a batch's live classes (Frappe's Classes tab): what's coming, and what's been, with recordings and attendance ----
  function ClassList(p) {
    var now = useNow(p.now, 30000), opens = p.joinOpensMinutes != null ? p.joinOpensMinutes : 10, id = uid("cl");
    var all = (p.classes || []).map(function (c) { var s = toDate(c.start); return Object.assign({}, c, { start: s, end: new Date(s.getTime() + (c.minutes || 60) * 60000) }); });
    var next = all.filter(function (c) { return c.end > now; }).sort(function (a, b) { return a.start - b.start; });
    var past = all.filter(function (c) { return c.end <= now; }).sort(function (a, b) { return b.start - a.start; });
    function row(c, i) {
      var st = c.end <= now ? "ended" : c.start <= now ? "live" : minutesBetween(now, c.start) <= opens ? "soon" : "upcoming";
      var mins = c.minutes || 60, today = dayDiff(now, c.start) === 0;
      var status = st === "live" ? h(Badge, { tone: "live" }, "Live now")
        : st === "soon" ? h(Badge, { tone: "gold", icon: "due" }, "Starts in " + Math.max(1, Math.ceil((c.start - now) / 60000)) + " min")
          : st === "upcoming" ? (today ? h(Badge, { tone: "gold" }, "Today") : null)
            : c.attendedMinutes ? h(Badge, { tone: "success", icon: "check" }, "You were there \u00b7 " + lengthText(c.attendedMinutes))
              : c.attendedMinutes === 0 ? h(Badge, { tone: "neutral" }, "Missed") : null;
      var action = (st === "live" || st === "soon") && c.joinHref ? h(Button, { size: "sm", icon: "live", href: c.joinHref, target: "_blank", className: st === "live" ? "ot-live__join--live" : undefined }, "Join", h("span", { className: "ot-visually-hidden" }, " (opens in a new tab)"))
        : st === "upcoming" && c.calendarHref ? h(Button, { variant: "text", size: "sm", icon: "schedule", href: c.calendarHref }, "Add to calendar")
          : st === "ended" && c.recordingHref ? h(Button, { variant: "secondary", size: "sm", icon: "play", href: c.recordingHref }, "Watch", h("span", { className: "ot-visually-hidden" }, " the recording"))
            : st === "ended" && c.recording !== false && p.recordings !== false ? h("span", { className: "ot-classrow__note" }, "Recording soon") : null;
      return h("li", { key: c.id || i, className: cx("ot-classrow", "ot-classrow--" + st), style: trackStyle(c.track) },
        h("span", { className: "ot-classrow__cal", "aria-hidden": true }, h("span", null, shortDay(c.start)), h("strong", null, c.start.getDate()), h("span", null, MONTHS[c.start.getMonth()].slice(0, 3))),
        h("div", { className: "ot-classrow__text" },
          h("h3", { className: "ot-classrow__title" }, c.title),
          h("p", { className: "ot-classrow__meta" }, h("span", { className: "ot-visually-hidden" }, longDate(c.start) + ", "), timeText(c.start) + " \u00b7 " + lengthText(mins) + (c.where ? " \u00b7 " + c.where : "")),
          c.description && st !== "ended" ? h("p", { className: "ot-classrow__desc" }, c.description) : null),
        h("div", { className: "ot-classrow__side" }, status, action));
    }
    if (!all.length) return h(EmptyState, { compact: true, icon: "live", title: "No live classes yet", titleAs: "h3", className: p.className }, p.emptyText || "When your instructor schedules one, it shows up here, and you get an email on the day.");
    return h("div", { className: cx("ot-classes", p.className) },
      next.length ? h("section", { className: "ot-classes__group", "aria-labelledby": id + "n" },
        h(HomeHead, { id: id + "n", title: "Coming up", count: next.length, headingAs: p.headingAs }),
        h("ul", { className: "ot-classes__list" }, next.map(row)),
        p.reminderText !== false ? h("p", { className: "ot-classes__note" }, h(Icon, { name: "bell", size: 16 }), p.reminderText || "You get an email reminder on the day of each class.") : null) : null,
      past.length ? h("section", { className: "ot-classes__group", "aria-labelledby": id + "p" },
        h(HomeHead, { id: id + "p", title: "Earlier", count: past.length, headingAs: p.headingAs }),
        h("ul", { className: "ot-classes__list" }, past.map(row))) : null);
  }

  // ---- booking a certificate evaluation: pick a time with the evaluator, then the booking and a reminder ----
  var READY_TIPS = ["Have what you built with you, and your kit nearby.", "Test your camera and microphone before the call.", "Join a couple of minutes early."];
  function EvaluationBooking(p) {
    var now = useNow(p.now, 30000), id = uid("eb"), courses = p.courses || [];
    var cs = useState(p.course || (courses[0] && courses[0].id)), course = courses.filter(function (c) { return c.id === cs[0]; })[0] || courses[0] || {};
    var days = (p.days || []).map(function (d) { return { date: dayStart(toDate(d.date)), slots: (d.slots || []).map(function (s) { return { start: toDate(s.start), end: toDate(s.end) }; }).filter(function (s) { return s.start > now; }) }; });
    var dsel = useState(null), ssel = useState(null), busy = useState(false), err = useState(null), cancel = useState(false), news = useState("");
    var booking = p.booking ? Object.assign({}, p.booking, { start: toDate(p.booking.start), end: toDate(p.booking.end) }) : null;
    var last = toDate(p.lastDay), closed = last && dayDiff(last, now) > 0;
    var state = p.state || (booking ? (booking.end <= now ? "done" : "booked") : closed ? "closed" : "book");
    var ev = (booking && booking.evaluator) || course.evaluator || p.evaluator;
    var firstOpen = days.filter(function (d) { return d.slots.length; })[0], day = dsel[0] ? days.filter(function (d) { return d.date.getTime() === dsel[0]; })[0] : firstOpen;
    var slot = ssel[0] && day ? day.slots.filter(function (s) { return s.start.getTime() === ssel[0]; })[0] : null;
    function book() {
      if (!slot) { err[1]("Pick a time first."); return; }
      busy[1](true); err[1](null);
      Promise.resolve(p.onBook ? p.onBook({ course: course.id, start: slot.start, end: slot.end }) : null).then(function () {
        busy[1](false); news[1]("Booked for " + longDate(slot.start) + " at " + timeText(slot.start) + ".");
      }, function (e) { busy[1](false); err[1]((e && e.message) || "That time was just taken. Pick another one."); });
    }
    var head = function (eyebrow, title, text) {
      return h("div", { className: "ot-evalbook__head" },
        h("span", { className: "ot-evalbook__icon", "aria-hidden": true }, h(Icon, { name: "certificate", size: 26 })),
        h("div", null,
          h("p", { className: "ot-evalbook__eyebrow" }, eyebrow),
          h(p.headingAs || "h2", { id: id, className: "ot-evalbook__title" }, title),
          text ? h("p", { className: "ot-evalbook__text" }, text) : null));
    };
    var evRow = ev ? h("p", { className: "ot-evalbook__who" }, h(Avatar, { name: ev.name, src: ev.src, size: 32, decorative: true }), h("span", null, "With ", h("strong", null, ev.name), ev.role ? ", " + ev.role : ", your evaluator")) : null;
    var body;
    if (state === "closed") {
      body = [head("Certificate evaluation", "Booking has closed", "The last day to book was " + longDate(last) + ". If you still need an evaluation, talk to your instructor."),
        p.contactHref ? h("div", { key: "a", className: "ot-evalbook__actions" }, h(Button, { variant: "secondary", icon: "discussion", href: p.contactHref }, "Message your instructor")) : null];
    } else if (state === "done") {
      body = [head("Certificate evaluation", "Evaluation done", "Your evaluator is writing up the result. It shows here and on your certificates page once it's ready."), evRow];
    } else if (state === "booked") {
      // today or tomorrow, it becomes a reminder: what's coming, and how to get ready
      var mins = minutesBetween(now, booking.start), soon = mins <= (p.joinOpensMinutes != null ? p.joinOpensMinutes : 10), n = dayDiff(now, booking.start), within = n <= 1;
      body = [head(within ? (n === 0 ? "Today" : "Tomorrow") : "Your evaluation", booking.courseTitle || course.title || "Your evaluation", null),
        h("div", { key: "w", className: cx("ot-evalbook__when", within && "ot-evalbook__when--soon") },
          h("span", { className: "ot-evalbook__cal", "aria-hidden": true }, h("span", null, shortDay(booking.start)), h("strong", null, booking.start.getDate()), h("span", null, MONTHS[booking.start.getMonth()].slice(0, 3))),
          h("div", null,
            h("p", { className: "ot-evalbook__date" }, longDate(booking.start)),
            h("p", { className: "ot-evalbook__time" }, spanText(booking.start, booking.end) + (p.timezone ? " (" + p.timezone + ")" : "")),
            n === 0 && !soon ? h("p", { className: "ot-evalbook__countdown" }, h(Icon, { name: "due", size: 16 }), "Starts in " + (mins >= 60 ? Math.floor(mins / 60) + " h " + (mins % 60) + " min" : plural(mins, "minute"))) : null)),
        evRow ? h("div", { key: "e" }, evRow) : null,
        h("p", { key: "m", className: "ot-evalbook__where" }, h(Icon, { name: booking.joinHref ? "live" : "info", size: 18 }),
          booking.joinHref ? (booking.where || "On Google Meet") : booking.where ? booking.where : "The meeting link shows up here once it's ready. We've emailed you the details."),
        within ? h("div", { key: "r", className: "ot-evalbook__ready" }, h("p", null, h(Icon, { name: "bell", size: 18 }), h("strong", null, "Get ready")),
          h("ul", null, (p.tips || READY_TIPS).map(function (t, i) { return h("li", { key: i }, t); }))) : null,
        h("div", { key: "a", className: "ot-evalbook__actions" },
          soon && booking.joinHref ? h(Button, { icon: "live", href: booking.joinHref, target: "_blank", className: "ot-live__join--live" }, "Join the call", h("span", { className: "ot-visually-hidden" }, " (opens in a new tab)"))
            : booking.calendarHref ? h(Button, { variant: "secondary", icon: "schedule", href: booking.calendarHref }, "Add to calendar") : null,
          p.onCancel ? h(Button, { variant: "text", onClick: function () { cancel[1](true); } }, "Cancel booking") : null),
        h(Dialog, { key: "d", open: cancel[0], onClose: function () { cancel[1](false); }, title: "Cancel your evaluation?",
          actions: [h(Button, { key: "k", variant: "secondary", onClick: function () { cancel[1](false); } }, "Keep it"),
            h(Button, { key: "c", variant: "danger", onClick: function () { cancel[1](false); p.onCancel(); } }, "Cancel booking")] },
          h("p", null, "You can book another time afterwards" + (last ? ", up to " + longDate(last) : "") + "."))];
    } else {
      var shown = [];
      for (var k = 0; k < (p.daysShown || 14); k++) shown.push(addDays(dayStart(now), k));
      body = [head("Certificate evaluation", "Book your evaluation", p.intro || "A short call where you show your evaluator what you built and what you learned. It's the last step before your certificate."),
        courses.length > 1 ? h("div", { key: "c", className: "ot-evalbook__courses", role: "group", "aria-label": "Course" }, courses.map(function (c) {
          return h(Chip, { key: c.id, selected: c.id === course.id, onClick: function () { cs[1](c.id); dsel[1](null); ssel[1](null); if (p.onCourseChange) p.onCourseChange(c.id); } }, c.title);
        })) : null,
        evRow ? h("div", { key: "e" }, evRow) : null,
        !firstOpen ? h("p", { key: "n", className: "ot-evalbook__none" }, h(Icon, { name: "info", size: 18 }), "No times are free in the next two weeks. Check back soon, or message your instructor.")
          : h("div", { key: "p", className: "ot-evalbook__picker" },
            h("p", { className: "ot-evalbook__label", id: id + "d" }, "Pick a day"),
            h("div", { className: "ot-evalbook__days", role: "group", "aria-labelledby": id + "d" }, shown.map(function (d) {
              var avail = days.filter(function (x) { return x.date.getTime() === d.getTime(); })[0], n2 = avail ? avail.slots.length : 0, on = day && day.date.getTime() === d.getTime();
              var after = last && dayDiff(last, d) > 0;
              return h("button", { key: d.getTime(), type: "button", className: cx("ot-evalbook__day", on && "ot-evalbook__day--on"), disabled: !n2 || after, "aria-pressed": on,
                "aria-label": longDate(d) + (n2 ? ", " + plural(n2, "time") + " free" : ", no times"), onClick: function () { dsel[1](d.getTime()); ssel[1](null); err[1](null); } },
                h("span", null, shortDay(d)), h("strong", null, d.getDate()), h("span", { className: "ot-evalbook__free" }, n2 ? plural(n2, "time") : "None"));
            })),
            day ? [h("p", { key: "l", className: "ot-evalbook__label", id: id + "t" }, "Times on " + longDate(day.date)),
              h("div", { key: "s", className: "ot-evalbook__slots", role: "radiogroup", "aria-labelledby": id + "t" }, day.slots.map(function (s) {
                var on = slot && slot.start.getTime() === s.start.getTime();
                return h("button", { key: s.start.getTime(), type: "button", role: "radio", "aria-checked": !!on, className: cx("ot-evalbook__slot", on && "ot-evalbook__slot--on"),
                  onClick: function () { ssel[1](s.start.getTime()); err[1](null); } }, timeText(s.start));
              }))] : null,
            p.timezone ? h("p", { key: "z", className: "ot-evalbook__tz" }, "Times are in " + p.timezone + ".") : null),
        firstOpen ? h("div", { key: "f", className: "ot-evalbook__foot" },
          h("p", { className: "ot-evalbook__summary" }, slot ? [h("strong", { key: "a" }, longDate(slot.start) + ", " + spanText(slot.start, slot.end)), ev ? " with " + ev.name : ""] : "Pick a time to see it here."),
          err[0] ? h("p", { className: "ot-field__error", role: "alert" }, h(Icon, { name: "warning", size: 16 }), err[0]) : null,
          h("div", { className: "ot-evalbook__actions" },
            h(Button, { icon: "check", loading: busy[0], onClick: book }, "Book this time"),
            last ? h("span", { className: "ot-evalbook__last" }, "Book by " + longDate(last)) : null)) : null];
    }
    return h("section", { className: cx("ot-evalbook", "ot-evalbook--" + state, p.className), style: trackStyle(course.track), "aria-labelledby": id },
      body, h("p", { className: "ot-visually-hidden", role: "status" }, news[0]));
  }

  // ---- Progress and certificates: how far through a course, the certificates earned, the certificate itself, and checking one ----
  function fullDate(d) { return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  // share a link with the phone's share sheet, or copy it; says "Link copied" for a moment
  function useShare() {
    var st = useState(false);
    useEffect(function () {
      if (!st[0]) return;
      var t = setTimeout(function () { st[1](false); }, 2400);
      return function () { clearTimeout(t); };
    }, [st[0]]);
    function share(url, title) {
      if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
      if (navigator.clipboard && url) navigator.clipboard.writeText(url).then(function () { st[1](true); }, function () {});
    }
    return [st[0], share];
  }
  // a score against its pass mark
  function ScoreBar(p) {
    var v = Math.max(0, Math.min(100, p.value || 0));
    return h("span", { className: cx("ot-scorebar", p.passed && "ot-scorebar--passed"), "aria-hidden": true },
      h("span", { className: "ot-scorebar__fill", style: { width: v + "%" } }),
      p.mark != null ? h("span", { className: "ot-scorebar__mark", style: { left: p.mark + "%" } }) : null);
  }
  var ASSIGN_STATUS = { passed: ["success", "check", "Passed"], failed: ["danger", "close", "Not passed"], submitted: ["neutral", "due", "Waiting to be marked"], returned: ["warning", "retry", "Sent back for changes"] };

  // how far through a course: lessons by chapter, quiz scores, assignments, and what's left for the certificate
  function CourseProgress(p) {
    var c = p.course || {}, id = uid("cp"), chapters = p.chapters || [], quizzes = p.quizzes || [], tasks = p.assignments || [];
    var lessons = [].concat.apply([], chapters.map(function (ch) { return ch.lessons || []; }));
    var done = p.lessonsDone != null ? p.lessonsDone : lessons.filter(function (l) { return l.status === "done"; }).length;
    var total = p.lessonsTotal || lessons.length, pct = p.progress != null ? p.progress : total ? (done / total) * 100 : 0;
    var next = lessons.filter(function (l) { return l.status === "current"; })[0];
    var qPassed = quizzes.filter(function (q) { return q.passed; }).length, aPassed = tasks.filter(function (a) { return a.status === "passed"; }).length;
    var cert = p.certificate, now = useNow(p.now, 60000);
    var stats = [{ label: "Lessons done", value: done + " of " + total }];
    if (quizzes.length) stats.push({ label: "Quizzes passed", value: qPassed + " of " + quizzes.length });
    if (tasks.length) stats.push({ label: "Assignments passed", value: aPassed + " of " + tasks.length });
    var currentChapter = -1;
    chapters.forEach(function (ch, i) { if (currentChapter < 0 && (ch.lessons || []).some(function (l) { return l.status === "current"; })) currentChapter = i; });
    return h("div", { className: cx("ot-cprog", p.className), style: trackStyle(c.track) },
      h("section", { className: "ot-cprog__top", "aria-labelledby": id },
        h(ScoreRing, { value: pct, size: 136, caption: "done" }),
        h("div", { className: "ot-cprog__text" },
          h("p", { className: "ot-cprog__eyebrow" }, p.eyebrow || "Your progress" + (c.track ? " \u00b7 " + trackName(c.track) : "")),
          h(p.headingAs || "h1", { id: id, className: "ot-cprog__title" }, c.href ? h("a", { href: c.href }, c.title) : c.title),
          h("p", { className: "ot-cprog__line" }, pct >= 100 ? "You've finished every lesson." : done + " of " + plural(total, "lesson") + " done." + (next ? " Up next: " + next.title + "." : "")),
          h("dl", { className: "ot-cprog__stats" }, stats.map(function (s) { return h("div", { key: s.label, className: "ot-cprog__stat" }, h("dt", null, s.label), h("dd", null, s.value)); })),
          p.continueHref && pct < 100 ? h("div", { className: "ot-cprog__actions" }, h(Button, { href: p.continueHref, icon: "play" }, next ? "Continue: " + next.title : "Continue the course")) : null)),
      cert ? h("section", { className: cx("ot-cprog__cert", cert.earned && "ot-cprog__cert--earned"), "aria-labelledby": id + "c" },
        h("span", { className: "ot-cprog__certicon", "aria-hidden": true }, h(Icon, { name: "certificate", size: 26 })),
        h("div", { className: "ot-cprog__certbody" },
          h("h2", { id: id + "c", className: "ot-cprog__subtitle" }, cert.earned ? "You've earned your certificate" : "Your certificate"),
          cert.earned ? h("p", { className: "ot-cprog__certtext" }, "Awarded " + (cert.date ? fullDate(toDate(cert.date)) : "") + ". Download it, share it, or print it for your wall.")
            : h("p", { className: "ot-cprog__certtext" }, "Here's what's left before it's yours:"),
          !cert.earned && cert.steps ? h("ul", { className: "ot-cprog__steps" }, cert.steps.map(function (s, i) {
            return h("li", { key: i, className: s.done ? "ot-cprog__step--done" : undefined },
              h("span", { className: "ot-cprog__stepmark", "aria-hidden": true }, s.done ? h(Icon, { name: "check", size: 14, strokeWidth: 2.6 }) : null),
              h("span", null, s.done ? h("span", { className: "ot-visually-hidden" }, "Done: ") : null, s.text, s.note ? h("span", { className: "ot-cprog__stepnote" }, " " + s.note) : null));
          })) : null,
          cert.earned && cert.href ? h("div", { className: "ot-cprog__actions" }, h(Button, { href: cert.href, icon: "certificate" }, "See your certificate")) : null)) : null,
      chapters.length ? h("section", { className: "ot-cprog__section", "aria-labelledby": id + "h" },
        h(HomeHead, { id: id + "h", title: "Lessons by chapter" }),
        h("ol", { className: "ot-cprog__chapters" }, chapters.map(function (ch, i) {
          var ls = ch.lessons || [], d = ls.filter(function (l) { return l.status === "done"; }).length, all = d === ls.length && ls.length;
          return h("li", { key: i, className: cx("ot-chap", all && "ot-chap--done") },
            h("details", { open: i === currentChapter || undefined },
              h("summary", null,
                h("span", { className: "ot-chap__no", "aria-hidden": true }, all ? h(Icon, { name: "check", size: 16, strokeWidth: 2.6 }) : i + 1),
                h("span", { className: "ot-chap__text" },
                  h("span", { className: "ot-chap__title" }, h("span", { className: "ot-visually-hidden" }, "Chapter " + (i + 1) + ": "), ch.title),
                  h("span", { className: "ot-chap__bar" }, h(ProgressBar, { value: ls.length ? (d / ls.length) * 100 : 0, size: "thin", tone: all ? "success" : c.track, label: ch.title + ": " + d + " of " + ls.length + " lessons done" }))),
                h("span", { className: "ot-chap__count" }, d + " of " + ls.length),
                h(Icon, { name: "chevron-down", size: 18, className: "ot-chap__chev" })),
              h("ul", { className: "ot-chap__lessons" }, ls.map(function (l, k) {
                var Tag = l.href && l.status !== "locked" ? "a" : "span", word = { done: "Done", current: "Up next", locked: "Locked" }[l.status];
                return h("li", { key: k, className: "ot-chap__lesson ot-chap__lesson--" + (l.status || "todo") },
                  h(Tag, { href: Tag === "a" ? l.href : undefined },
                    h("span", { className: "ot-chap__mark", "aria-hidden": true }, l.status === "done" ? h(Icon, { name: "check", size: 14, strokeWidth: 2.6 }) : l.status === "locked" ? h(Icon, { name: "lock", size: 12 }) : l.status === "current" ? h(Icon, { name: "play", size: 12 }) : null),
                    h(Icon, { name: l.kind || "reading", size: 18, className: "ot-chap__kind" }),
                    h("span", { className: "ot-chap__name" }, l.title),
                    word ? h("span", { className: "ot-chap__word" }, word) : null));
              }))));
        }))) : null,
      quizzes.length ? h("section", { className: "ot-cprog__section", "aria-labelledby": id + "q" },
        h(HomeHead, { id: id + "q", title: "Quiz scores" }),
        h("ul", { className: "ot-cprog__rows" }, quizzes.map(function (q, i) {
          var started = q.best != null, Tag = q.href ? "a" : "div";
          return h("li", { key: i },
            h(Tag, { href: q.href, className: "ot-cprog__row" },
              h("span", { className: "ot-cprog__rowicon", "aria-hidden": true }, h(Icon, { name: "quiz", size: 20 })),
              h("span", { className: "ot-cprog__rowtext" },
                h("span", { className: "ot-cprog__rowtitle" }, q.title),
                h("span", { className: "ot-cprog__rowmeta" }, !started ? (q.due ? dueLabel({ due: q.due }, now).text : "Not started")
                  : (q.attempts > 1 ? "Best of " + q.attempts + " attempts" : "1 attempt") + (q.passMark != null ? " \u00b7 pass mark " + q.passMark + "%" : ""))),
              started ? h("span", { className: "ot-cprog__score" }, h("strong", null, q.best + "%"), h(ScoreBar, { value: q.best, mark: q.passMark, passed: q.passed })) : null,
              started ? h(Badge, { tone: q.passed ? "success" : "neutral", icon: q.passed ? "check" : undefined }, q.passed ? "Passed" : "Not passed yet") : h(Badge, { tone: "neutral" }, "To do")));
        }))) : null,
      tasks.length ? h("section", { className: "ot-cprog__section", "aria-labelledby": id + "a" },
        h(HomeHead, { id: id + "a", title: "Assignments" }),
        h("ul", { className: "ot-cprog__rows" }, tasks.map(function (a, i) {
          var s = ASSIGN_STATUS[a.status], Tag = a.href ? "a" : "div", lab = s ? null : dueLabel({ due: a.due }, now);
          return h("li", { key: i },
            h(Tag, { href: a.href, className: "ot-cprog__row" },
              h("span", { className: "ot-cprog__rowicon", "aria-hidden": true }, h(Icon, { name: "assignment", size: 20 })),
              h("span", { className: "ot-cprog__rowtext" },
                h("span", { className: "ot-cprog__rowtitle" }, a.title),
                h("span", { className: "ot-cprog__rowmeta" }, a.feedback ? "\u201c" + a.feedback + "\u201d" : a.status === "submitted" && a.submittedAt ? "Handed in " + longDate(toDate(a.submittedAt)) : a.evaluator ? "Marked by " + a.evaluator : "")),
              s ? h(Badge, { tone: s[0], icon: s[1] }, s[2]) : h(Badge, { tone: lab.tone, icon: lab.icon }, lab.text)));
        }))) : null);
  }

  // a small picture of a certificate, for lists and cards
  function CertThumb(p) {
    return h("span", { className: "ot-certthumb", "aria-hidden": true },
      h("span", { className: "ot-certthumb__brand" }, h(BrandMark, { size: 12 }), "OrbiTutor"),
      h("span", { className: "ot-certthumb__kind" }, "Certificate of completion"),
      h("span", { className: "ot-certthumb__name" }, p.name),
      h("span", { className: "ot-certthumb__course" }, p.course),
      h("span", { className: "ot-certthumb__seal" }, h(Icon, { name: "certificate", size: 12, strokeWidth: 2.2 })));
  }

  // the certificates page: every certificate earned, to see, download and share
  function CertificateList(p) {
    var items = p.items || [], now = useNow(p.now, 60000), sh = useShare(), id = uid("cl"), soon = p.inProgress || [];
    var on = useState(null);
    if (!items.length) return h("div", { className: cx("ot-certlist ot-certlist--empty", p.className) },
      h(EmptyState, { icon: "certificate", title: p.emptyTitle || "No certificates yet", titleAs: "h2" }, p.emptyText || "Finish a course and pass what it asks, and your certificate shows up here, ready to download and share."),
      soon.length ? h("section", { className: "ot-certlist__soon", "aria-labelledby": id + "s" },
        h(HomeHead, { id: id + "s", title: "On the way" }),
        h("ul", null, soon.map(function (c, i) {
          return h("li", { key: i, style: trackStyle(c.track) }, h("a", { href: c.href, className: "ot-certlist__soonrow" },
            h(ProgressRing, { value: c.progress || 0, size: 48, tone: c.track, label: c.title + ": " + Math.round(c.progress || 0) + "% done" }),
            h("span", null, h("strong", null, c.title), h("span", null, c.next || plural(c.left || 0, "lesson") + " to go")),
            h(Icon, { name: "chevron-right", size: 20 })));
        }))) : null);
    return h("div", { className: cx("ot-certlist", p.className) },
      h("ul", { className: "ot-certlist__grid" }, items.map(function (c, i) {
        var issued = toDate(c.issued), exp = toDate(c.expires), expired = exp && exp < now;
        return h("li", { key: c.id || i },
          h("article", { className: cx("ot-certcard", expired && "ot-certcard--expired"), style: trackStyle(c.track), "aria-labelledby": id + i },
            h(c.viewHref ? "a" : "span", { href: c.viewHref, className: "ot-certcard__media", tabIndex: c.viewHref ? -1 : undefined, "aria-hidden": true }, h(CertThumb, { name: c.name, course: c.course })),
            h("div", { className: "ot-certcard__body" },
              h("p", { className: "ot-certcard__eyebrow" }, trackName(c.track) || "Certificate"),
              h("h3", { id: id + i, className: "ot-certcard__title" }, c.viewHref ? h("a", { href: c.viewHref }, c.course) : c.course),
              h("p", { className: "ot-certcard__meta" }, "Awarded " + fullDate(issued) + (c.batch ? " \u00b7 " + c.batch + " batch" : "")),
              exp ? h("p", { className: cx("ot-certcard__meta", expired && "ot-certcard__meta--expired") }, expired ? "Expired on " + fullDate(exp) : "Valid until " + fullDate(exp)) : null,
              h("div", { className: "ot-certcard__actions" },
                c.pdfHref ? h(Button, { size: "sm", icon: "download", href: c.pdfHref, download: true }, "Download PDF") : null,
                c.public && c.shareUrl ? h(Button, { size: "sm", variant: "secondary", icon: sh[0] && on[0] === i ? "check" : "share", onClick: function () { on[1](i); sh[1](c.shareUrl, "My certificate for " + c.course); } }, sh[0] && on[0] === i ? "Link copied" : "Share") : null),
              !c.public ? h("p", { className: "ot-certcard__private" }, h(Icon, { name: "lock", size: 14 }), "Only you can see this one. Ask us to make it public so others can check it.") : null)));
      })),
      h("p", { className: "ot-visually-hidden", role: "status" }, sh[0] ? "Link copied" : ""));
  }

  // ---- the certificate itself: an A4 landscape page, printed by Frappe from a print format ----
  function CertificateDoc(p) {
    var root = useRef(null), w = useWidth(root), W = 1123, H = 794, s = w ? Math.min(p.maxScale || 1, w / W) : 0.6, id = uid("cd");
    var date = toDate(p.date), people = [p.instructor, p.evaluator].filter(Boolean);
    return h("div", { ref: root, className: cx("ot-certdoc", p.className), style: { height: Math.round(H * s) } },
      h("article", { className: "ot-certdoc__page", style: { transform: "scale(" + s + ")" }, "aria-label": "Certificate for " + p.name + ", " + p.course },
        h("svg", { className: "ot-certdoc__art", viewBox: "0 0 1123 794", "aria-hidden": true },
          h("ellipse", { cx: 930, cy: 210, rx: 300, ry: 92, transform: "rotate(-14 930 210)" }),
          h("ellipse", { cx: 190, cy: 640, rx: 250, ry: 70, transform: "rotate(-14 190 640)" }),
          [[862, 120, 3], [1010, 300, 2], [770, 250, 2], [120, 560, 2.5], [300, 700, 2], [960, 96, 2]].map(function (st, i) { return h("circle", { key: i, cx: st[0], cy: st[1], r: st[2] }); })),
        h("div", { className: "ot-certdoc__frame", "aria-hidden": true }),
        h("div", { className: "ot-certdoc__brand" }, h(BrandMark, { size: 44 }), h("span", null, h("strong", null, "OrbiTutor"), h("span", null, "by OrbitCore"))),
        p.id ? h("p", { className: "ot-certdoc__id" }, "Certificate no.", h("span", null, p.id)) : null,
        h("div", { className: "ot-certdoc__main" },
          h("p", { className: "ot-certdoc__kind" }, p.kind || "Certificate of completion"),
          h("p", { className: "ot-certdoc__lead" }, "This is to certify that"),
          // long names step down a size so they stay on one line
          h("h2", { className: "ot-certdoc__name", style: { fontSize: (p.name || "").length > 30 ? 40 : (p.name || "").length > 22 ? 48 : 60 } }, p.name),
          h("span", { className: "ot-certdoc__rule", "aria-hidden": true }),
          h("p", { className: "ot-certdoc__lead" }, "has completed"),
          h("p", { className: "ot-certdoc__course" }, p.course),
          p.detail ? h("p", { className: "ot-certdoc__detail" }, p.detail) : null,
          h("p", { className: "ot-certdoc__date" }, "Awarded on " + fullDate(date) + (p.batch ? " \u00b7 " + p.batch + " batch" : ""))),
        h("div", { className: "ot-certdoc__foot" },
          people.map(function (x, i) {
            return h("div", { key: i, className: "ot-certdoc__sign ot-certdoc__sign--" + (i ? "right" : "left") },
              h("span", { className: "ot-certdoc__signname" }, x.name), h("span", { className: "ot-certdoc__line", "aria-hidden": true }), h("span", { className: "ot-certdoc__role" }, x.role || (i ? "Evaluator" : "Instructor")));
          }),
          h("svg", { className: "ot-certdoc__seal", viewBox: "0 0 140 140", "aria-hidden": true },
            h("defs", null,
              h("radialGradient", { id: id + "g", cx: "36%", cy: "32%", r: "75%" }, h("stop", { offset: "0", stopColor: "#FFF6CF" }), h("stop", { offset: "0.45", stopColor: "#FFC93C" }), h("stop", { offset: "1", stopColor: "#E8590C" })),
              h("path", { id: id + "t", d: "M 70 70 m -50 0 a 50 50 0 1 1 100 0 a 50 50 0 1 1 -100 0" })),
            h("circle", { cx: 70, cy: 70, r: 64, fill: "url(#" + id + "g)" }),
            h("circle", { cx: 70, cy: 70, r: 58, fill: "none", stroke: "#7a4f00", strokeOpacity: 0.45, strokeWidth: 1.2 }),
            h("circle", { cx: 70, cy: 70, r: 38, fill: "none", stroke: "#7a4f00", strokeOpacity: 0.45, strokeWidth: 1.2 }),
            h("text", { className: "ot-certdoc__sealtext" }, h("textPath", { href: "#" + id + "t", startOffset: "0", textLength: 312, lengthAdjust: "spacing" }, (p.sealText || "ORBITUTOR \u00b7 CYBERJAYA \u00b7 MALAYSIA \u00b7 ").toUpperCase())),
            h("ellipse", { cx: 70, cy: 72, rx: 30, ry: 10, transform: "rotate(-18 70 72)", fill: "none", stroke: "#3a1d00", strokeWidth: 2.2 }),
            h("circle", { cx: 70, cy: 70, r: 12, fill: "#3a1d00", fillOpacity: 0.85 }))),
        p.checkUrl ? h("p", { className: "ot-certdoc__check" }, "Check this certificate at ", h("span", null, p.checkUrl)) : null));
  }

  // ---- the public page for a shared certificate link: genuine, expired, or not found ----
  function CertificateCheck(p) {
    var status = p.status || "lookup", code = useState(p.code || ""), err = useState(null), busy = useState(false), id = uid("cc"), c = p.certificate || {};
    function check(e) {
      if (e) e.preventDefault();
      var v = code[0].trim().toLowerCase();
      if (!/^[a-z0-9]{6,20}$/.test(v)) { err[1]("Type the certificate number from the bottom of the certificate, like 7f3a9c21b4."); return; }
      err[1](null); busy[1](true);
      Promise.resolve(p.onCheck ? p.onCheck(v) : null).then(function () { busy[1](false); }, function () { busy[1](false); });
    }
    var form = h("form", { method: "post", className: "ot-certcheck__form", onSubmit: check, noValidate: true },
      h(TextField, { label: "Certificate number", maxLength: 40, autoCapitalize: "none", spellCheck: false, value: code[0], placeholder: "7f3a9c21b4", error: err[0], autoComplete: "off", onChange: function (e) { code[1](e.target.value); err[1](null); } }),
      h(Button, { type: "submit", icon: "search", loading: busy[0] }, "Check"));
    var issued = toDate(c.issued), exp = toDate(c.expires);
    var details = h("dl", { key: "dl", className: "ot-certcheck__details" },
      [["Awarded to", c.name], ["Course", c.course], ["Awarded on", issued ? fullDate(issued) : null], ["Batch", c.batch], ["Evaluated by", c.evaluator], exp ? [status === "expired" ? "Expired on" : "Valid until", fullDate(exp)] : null, ["Certificate no.", c.id]]
        .filter(function (r) { return r && r[1]; }).map(function (r) { return h("div", { key: r[0] }, h("dt", null, r[0]), h("dd", null, r[1])); }));
    var top, body;
    if (status === "valid") {
      top = [h("span", { key: "i", className: "ot-certcheck__badge ot-certcheck__badge--valid", "aria-hidden": true }, h(Icon, { name: "certificate", size: 34 }), h("span", { className: "ot-certcheck__tick" }, h(Icon, { name: "check", size: 16, strokeWidth: 3 }))),
        h("h1", { key: "t", id: id, className: "ot-certcheck__title" }, "This certificate is genuine"),
        h("p", { key: "x", className: "ot-certcheck__text" }, (p.issuer || "OrbitCore") + " awarded it to " + c.name + " for " + c.course + ".")];
      body = [details, h(CertificateDoc, { key: "d", name: c.name, course: c.course, detail: c.detail, date: c.issued, batch: c.batch, id: c.id, instructor: c.instructor, evaluator: c.evaluatorPerson, checkUrl: c.checkUrl }),
        h("div", { key: "a", className: "ot-certcheck__actions" },
          c.pdfHref ? h(Button, { icon: "download", href: c.pdfHref, download: true }, "Download PDF") : null,
          p.onReset ? h(Button, { variant: "text", icon: "search", onClick: p.onReset }, "Check another certificate") : null)];
    } else if (status === "expired") {
      top = [h("span", { key: "i", className: "ot-certcheck__badge ot-certcheck__badge--expired", "aria-hidden": true }, h(Icon, { name: "due", size: 34 })),
        h("h1", { key: "t", id: id, className: "ot-certcheck__title" }, "This certificate has expired"),
        h("p", { key: "x", className: "ot-certcheck__text" }, "It's genuine, but it was only valid until " + fullDate(exp) + ".")];
      body = [details, p.onReset ? h("div", { key: "a", className: "ot-certcheck__actions" }, h(Button, { variant: "text", icon: "search", onClick: p.onReset }, "Check another certificate")) : null];
    } else {
      var nf = status === "notfound";
      top = [h("span", { key: "i", className: cx("ot-certcheck__badge", nf && "ot-certcheck__badge--missing"), "aria-hidden": true }, h(Icon, { name: nf ? "search" : "certificate", size: 32 })),
        h("h1", { key: "t", id: id, className: "ot-certcheck__title" }, nf ? "We couldn't find that certificate" : "Check a certificate"),
        h("p", { key: "x", className: "ot-certcheck__text" }, nf ? "Check the number and try again. It's printed at the bottom of the certificate, 10 letters and numbers long. Only certificates that have been made public can be checked here."
          : "Every OrbiTutor certificate has a number at the bottom. Type it here to see who it was awarded to, and for what.")];
      body = [form];
    }
    return h("section", { className: cx("ot-certcheck", "ot-certcheck--" + status, p.className), "aria-labelledby": id },
      h("header", { className: "ot-certcheck__bar" }, h(Brand, { href: p.homeHref || "/" }), h("span", { className: "ot-certcheck__label" }, "Certificate check")),
      h("div", { className: "ot-certcheck__card" }, h("div", { className: "ot-certcheck__top" }, top), body),
      h("p", { className: "ot-certcheck__foot" }, "Certificates are issued by " + (p.issuerFull || "OrbitCore Sdn. Bhd., Cyberjaya, Malaysia") + ". ",
        p.aboutHref ? h("a", { href: p.aboutHref }, "What is OrbiTutor?") : null));
  }


  // ---- Signing in: Frappe's sign-in, welcome-link and password-reset pages in OrbiTutor's look, then a first-time welcome and a tour of Home ----

  // the picture beside the sign-in pages: a planet, its orbit, and a moon for each of the four tracks
  var ART_MOONS = [["physics", 206], ["code", 326], ["making", 58], ["competitions", 128]];
  var ART_STARS = [[40, 44, 1.6], [98, 254, 1.2], [322, 36, 2], [366, 218, 1.4], [276, 270, 1.1], [152, 26, 1.2], [20, 164, 1], [352, 112, 1.1]];
  function artOrbitPoint(cx0, cy0, rx, ry, tilt, t) {
    var a = t * Math.PI / 180, r = tilt * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [cx0 + rx * c * Math.cos(r) - ry * s * Math.sin(r), cy0 + rx * c * Math.sin(r) + ry * s * Math.cos(r)];
  }
  function AuthArt(p) {
    var id = uid("aa"), CX = 200, CY = 150, RX = 178, RY = 46, TILT = -14;
    function f(n) { return n.toFixed(2); }
    var L = artOrbitPoint(CX, CY, RX, RY, TILT, 180), R = artOrbitPoint(CX, CY, RX, RY, TILT, 0);
    function moon(m) {
      var pt = artOrbitPoint(CX, CY, RX, RY, TILT, m[1]);
      return h("g", { key: m[0], className: "ot-authart__moon ot-authart__moon--" + m[0], transform: "translate(" + f(pt[0]) + " " + f(pt[1]) + ")" },
        h("circle", { className: "ot-authart__halo", r: 15 }), h("circle", { r: 7.5 }));
    }
    // moons on the far half of the orbit go behind the planet, the near ones in front of it
    var far = ART_MOONS.filter(function (m) { return Math.sin(m[1] * Math.PI / 180) < 0; }).map(moon);
    var near = ART_MOONS.filter(function (m) { return Math.sin(m[1] * Math.PI / 180) >= 0; }).map(moon);
    return h("svg", { className: cx("ot-authart", p && p.className), viewBox: "0 0 400 300", "aria-hidden": true, focusable: "false" },
      h("defs", null,
        h("radialGradient", { id: id + "p", cx: "38%", cy: "34%", r: "70%" },
          h("stop", { offset: "0", stopColor: "#FFF6CF" }), h("stop", { offset: "0.45", stopColor: "#FFC93C" }), h("stop", { offset: "1", stopColor: "#E8590C" })),
        h("radialGradient", { id: id + "g" }, h("stop", { offset: "0", stopColor: "#FFC93C", stopOpacity: 0.3 }), h("stop", { offset: "1", stopColor: "#FFC93C", stopOpacity: 0 }))),
      ART_STARS.map(function (s, i) { return h("circle", { key: "s" + i, className: "ot-authart__star", cx: s[0], cy: s[1], r: s[2], style: { animationDelay: (i * 0.6).toFixed(1) + "s" } }); }),
      h("ellipse", { className: "ot-authart__ring", cx: CX, cy: CY, rx: 194, ry: 82, transform: "rotate(9 " + CX + " " + CY + ")" }),
      h("circle", { cx: CX, cy: CY, r: 118, fill: "url(#" + id + "g)" }),
      h("ellipse", { className: "ot-authart__orbit", cx: CX, cy: CY, rx: RX, ry: RY, transform: "rotate(" + TILT + " " + CX + " " + CY + ")" }),
      far,
      h("circle", { cx: CX, cy: CY, r: 66, fill: "url(#" + id + "p)" }),
      h("circle", { className: "ot-authart__crater", cx: 224, cy: 128, r: 9 }),
      h("circle", { className: "ot-authart__crater", cx: 178, cy: 174, r: 6 }),
      h("circle", { className: "ot-authart__crater", cx: 236, cy: 176, r: 4 }),
      h("path", { className: "ot-authart__orbit", d: "M " + f(L[0]) + " " + f(L[1]) + " A " + RX + " " + RY + " " + TILT + " 0 0 " + f(R[0]) + " " + f(R[1]) }),
      near);
  }

  // ---- the frame round every page outside the app: the sky, the brand, a card, and a picture beside it on wide screens ----
  function AuthFrame(p) {
    var a = p.aside, single = a === false, help = p.helpHref, wa = help && /wa\.me|whatsapp/i.test(help);
    return h(Backdrop, { variant: "sky", className: cx("ot-auth", single && "ot-auth--single", p.className), style: p.style },
      h("header", { className: "ot-auth__bar" },
        h(Brand, { href: p.homeHref === undefined ? "/" : p.homeHref }),
        help ? h("a", { className: "ot-auth__help", href: help, target: wa ? "_blank" : undefined, rel: wa ? "noopener noreferrer" : undefined },
          h(Icon, { name: "discussion", size: 18 }), h("span", null, p.helpLabel || "Need help?"), wa ? h("span", { className: "ot-visually-hidden" }, " (opens WhatsApp)") : null) : null),
      h("div", { className: "ot-auth__body" },
        single ? null : h("div", { className: "ot-auth__aside" }, h(AuthArt),
          a && (a.title || a.text) ? h("div", { className: "ot-auth__pitch" },
            a.eyebrow ? h("p", { className: "ot-auth__pitcheyebrow" }, a.eyebrow) : null,
            a.title ? h("p", { className: "ot-auth__pitchtitle" }, a.title) : null,
            a.text ? h("p", { className: "ot-auth__pitchtext" }, a.text) : null) : null),
        h("main", { id: p.mainId || "main", tabIndex: -1, className: "ot-auth__card" }, p.children)),
      h("footer", { className: "ot-auth__foot" },
        h("span", null, p.legal || "OrbiTutor is run by OrbitCore Sdn. Bhd., Cyberjaya."),
        p.termsHref ? h("a", { href: p.termsHref }, "Terms") : null,
        p.privacyHref ? h("a", { href: p.privacyHref }, "Privacy") : null));
  }
  // the page's frame, or just its insides (`bare`) to put in a dialog or a page of your own
  function authPage(p, aside, kids) {
    if (p.bare) return h("div", { className: cx("ot-auth__card ot-auth__card--bare", p.className) }, kids);
    return h(AuthFrame, { aside: p.aside !== undefined ? p.aside : aside, homeHref: p.homeHref, helpHref: p.helpHref, termsHref: p.termsHref, privacyHref: p.privacyHref, className: p.className, style: p.style }, kids);
  }
  function authHead(o) {
    return h("div", { key: "head", className: cx("ot-auth__head", o.center && "ot-auth__head--center") },
      o.icon ? h("span", { className: "ot-auth__badge ot-auth__badge--" + (o.tone || "gold"), "aria-hidden": true }, h(Icon, { name: o.icon, size: 28 })) : null,
      o.eyebrow ? h("p", { className: "ot-auth__eyebrow" }, o.eyebrow) : null,
      h("h1", { className: "ot-auth__title", id: o.id, tabIndex: -1 }, o.title),
      o.text ? h("p", { className: "ot-auth__text" }, o.text) : null);
  }
  function orLine(text) { return h("p", { key: "or", className: "ot-auth__or" }, h("span", null, text)); }
  // when the page changes step, move focus to the new heading so it's read out
  function useFocusTitle(key, id) {
    var first = useRef(true);
    useEffect(function () {
      if (first.current) { first.current = false; return; }
      var el = document.getElementById(id);
      if (el) el.focus();
    }, [key]);
  }
  // seconds left on a pause (a locked sign-in, or "send again"), ticking down
  function useCountdown() {
    var end = useState(0), force = useState(0);
    var left = Math.max(0, Math.ceil((end[0] - Date.now()) / 1000));
    useEffect(function () {
      if (end[0] <= Date.now()) return;
      var t = setInterval(function () { force[1](function (n) { return n + 1; }); if (Date.now() >= end[0]) clearInterval(t); }, 500);
      return function () { clearInterval(t); };
    }, [end[0]]);
    return [left, function (secs) { end[1](Date.now() + secs * 1000); }];
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function emailProblem(v, empty) {
    v = (v || "").trim();
    return !v ? empty || "Type your email." : EMAIL_RE.test(v) ? null : "That doesn't look like an email address. Check for a missing @ or a typo.";
  }
  function focusId(id) { setTimeout(function () { var el = document.getElementById(id); if (el) el.focus(); }, 0); }

  // ---- the single sign-on button: your OrbitCore account (Authentik) ----
  function SsoButton(p) {
    var busy = useState(false);
    useEffect(function () {
      if (!busy[0]) return;
      // coming back with the browser's Back button, or a sign-in page that never opened, puts the button back
      function back() { busy[1](false); }
      var t = setTimeout(back, 8000);
      window.addEventListener("pageshow", back);
      return function () { clearTimeout(t); window.removeEventListener("pageshow", back); };
    }, [busy[0]]);
    return h(Button, {
      variant: p.primary ? "primary" : "secondary", size: "lg", full: true, href: p.href, loading: busy[0], className: "ot-sso",
      onClick: function (e) { busy[1](true); if (p.onClick) p.onClick(e); },
    }, busy[0] ? "Opening OrbitCore sign-in" : [h(BrandMark, { key: "m", size: 22 }), h("span", { key: "t" }, p.label || "Continue with OrbitCore account")]);
  }

  // ---- a password box: show or hide what's typed, a warning when Caps Lock is on, and (for a new password) how strong it is ----
  var PW_COMMON = ["password", "passw0rd", "qwerty", "letmein", "welcome", "iloveyou", "abc123", "orbitutor", "orbitcore", "student", "admin", "monkey", "dragon", "football", "sunshine", "princess", "abcdef"];
  var PW_WORDS = ["Too easy to guess", "Too easy to guess", "Good enough", "Strong", "Very strong"];
  // a rough guess of 0 (very weak) to 4 (very strong), the same scale as Frappe's password check, for when its answer isn't to hand
  function passwordStrength(pw, mine) {
    if (!pw) return null;
    var low = pw.toLowerCase(), len = pw.length, tip = null;
    var kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(pw); }).length;
    var words = pw.split(/[\s\-_.,+]+/).filter(function (w) { return w.length > 1; }).length;
    var score = len >= 16 ? 4 : len >= 12 ? 3 : len >= 9 ? 2 : len >= 6 ? 1 : 0;
    if (kinds >= 3 && len >= 8) score++;
    if (words >= 3 && len >= 12) score++;
    score = Math.min(4, score);
    var personal = [];
    (mine || []).forEach(function (s) { String(s || "").toLowerCase().replace(/@.*$/, "").split(/[^a-z0-9]+/).forEach(function (w) { if (w.length >= 3) personal.push(w); }); });
    if (/^\d+$/.test(pw)) { score = Math.min(score, 1); tip = "Numbers on their own are easy to guess. Use words."; }
    else if (personal.some(function (w) { return low.indexOf(w) >= 0; })) { score = Math.min(score, 1); tip = "Leave your name and email out of it."; }
    else if (len < 14 && PW_COMMON.some(function (w) { return low.indexOf(w) >= 0; })) { score = Math.min(score, 1); tip = "Common words like that are the first ones people guess."; }
    else if (/^(.)\1+$/.test(pw) || /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|asdf)/.test(low)) { score = Math.min(score, 1); tip = "Runs like 1234 or abcd are easy to guess."; }
    if (!tip && score < 2) tip = len < 9 ? "Make it longer. Three or four words together works well." : "Add another word or two.";
    return { score: score, tip: tip };
  }
  function strengthFrom(p, value) {
    if (!p.strength || !value) return null;
    if (typeof p.strength === "number") return { score: p.strength };
    if (typeof p.strength === "object") {
      var fb = p.strength.feedback || {};
      return { score: p.strength.score, tip: p.strength.tip || fb.warning || (fb.suggestions || [])[0] };
    }
    return passwordStrength(value, p.userInputs);
  }
  function PasswordField(p) {
    var auto = uid("pw"), id = p.id || auto, show = useState(false), caps = useState(false);
    var st = useState(p.defaultValue || ""), value = p.value !== undefined ? p.value : st[0];
    var min = p.minScore == null ? 2 : p.minScore, s = strengthFrom(p, value);
    function change(e) { if (p.value === undefined) st[1](e.target.value); if (p.onChange) p.onChange(e); }
    function key(e) { if (e.getModifierState) caps[1](e.getModifierState("CapsLock")); }
    var described = [p.strength ? id + "-meter" : null, caps[0] ? id + "-caps" : null, p.hint ? id + "-hint" : null, p.error ? id + "-error" : null].filter(Boolean).join(" ") || undefined;
    var meter = null;
    if (p.strength) {
      var tone = !s ? "empty" : s.score < min ? "weak" : s.score === min ? "ok" : "strong", filled = !s ? 0 : Math.max(1, s.score);
      meter = h("div", { className: "ot-pwmeter ot-pwmeter--" + tone, id: id + "-meter" },
        h("span", { className: "ot-pwmeter__bars", "aria-hidden": true }, [0, 1, 2, 3].map(function (i) { return h("span", { key: i, className: cx("ot-pwmeter__bar", i < filled && "is-on") }); })),
        h("p", { className: "ot-pwmeter__text", "aria-live": "polite" },
          s ? [h("strong", { key: "w" }, PW_WORDS[s.score] + (s.score < min ? "" : ".")), s.score < min && s.tip ? ". " + s.tip : ""]
            : p.meterHint || "Use three or four words together, like a short odd sentence. It's easy to remember and hard to guess."));
    }
    return h("div", { className: cx("ot-field ot-pwfield", p.error && "ot-field--error", p.disabled && "ot-field--disabled", p.className) },
      h("div", { className: "ot-pwfield__head" },
        h("label", { className: "ot-field__label", htmlFor: id }, p.label || "Password"),
        p.labelAction || null),
      h("div", { className: "ot-input ot-input--password" },
        h("input", {
          id: id, ref: p.inputRef, name: p.name || "password", type: show[0] ? "text" : "password", value: value, maxLength: p.maxLength || 512,
          autoComplete: p.autoComplete || "current-password", autoCapitalize: "off", autoCorrect: "off", spellCheck: false,
          required: p.required, disabled: p.disabled, autoFocus: p.autoFocus, placeholder: p.placeholder,
          "aria-invalid": p.error ? true : undefined, "aria-describedby": described,
          onChange: change, onKeyDown: key, onKeyUp: key,
        }),
        h("button", { type: "button", className: "ot-pwfield__toggle", "aria-pressed": show[0], "aria-label": "Show password", title: show[0] ? "Hide password" : "Show password", disabled: p.disabled, onClick: function () { show[1](!show[0]); } },
          h(Icon, { name: show[0] ? "eye-off" : "eye", size: 20 }))),
      caps[0] ? h("p", { className: "ot-pwfield__caps", id: id + "-caps" }, h(Icon, { name: "warning", size: 16 }), h("span", null, "Caps Lock is on")) : null,
      meter,
      p.hint ? h("p", { className: "ot-field__hint", id: id + "-hint" }, p.hint) : null,
      p.error ? h("p", { className: "ot-field__error", id: id + "-error" }, h(Icon, { name: "warning", size: 16 }), h("span", null, p.error)) : null);
  }

  // ---- what Frappe can say when signing in, said plainly ----
  function authAlert(k, tone, title, text, action) {
    return h("div", { key: "msg", className: "ot-auth__msg" },
      // warnings aren't read out by themselves, so say the title once when one appears
      tone !== "danger" ? h("p", { className: "ot-visually-hidden", role: "status" }, title) : null,
      h(Alert, { tone: tone, title: title, action: action }, text));
  }
  function helpButton(p) { return p.helpHref ? h(Button, { variant: "text", size: "sm", icon: "discussion", href: p.helpHref, target: /^https?:/.test(p.helpHref) ? "_blank" : undefined }, "Message us") : null; }
  function signInProblem(pr, left, p) {
    var k = pr.kind, email = pr.email;
    var forgot = p.forgotHref || p.onForgot ? h("a", { className: "ot-linkbtn", href: p.forgotHref || "#", onClick: p.onForgot ? function (e) { e.preventDefault(); p.onForgot(); } : undefined }, "Reset your password instead") : null;
    switch (k) {
      case "wrong": return authAlert(k, "danger", "That email and password don't match", "Check both and try again. Passwords care about capital letters.", forgot);
      case "locked": return authAlert(k, "warning", "Too many tries", left > 0 ? "To keep your account safe, signing in is paused for a moment. Try again in\u00a0" + mmss(left) + "." : "You can try again now.", left > 0 ? forgot : null);
      case "disabled": return authAlert(k, "danger", "This account is switched off", "Your OrbiTutor account isn't active right now. If that sounds wrong, message us and we'll sort it out.", helpButton(p));
      case "no-account": return authAlert(k, "warning", "No student here uses " + (email || "that email"), "You signed in to OrbitCore, but no OrbiTutor student has that email. Use the account with the email we enrolled you with, or message us.", helpButton(p));
      case "sso-failed": return authAlert(k, "danger", "Signing in didn't finish", "The OrbitCore sign-in page was closed or took too long. Try again.");
      case "rate": return authAlert(k, "warning", "That's a lot of links", "You've asked for several sign-in links in the last hour. Use the newest one, or sign in with your password.");
      case "offline": return authAlert(k, "warning", "You're offline", "Connect to the internet, then try again.");
      default: return authAlert(k, "danger", "We couldn't sign you in just now", pr.message || "Something went wrong on our side. Try again in a minute.");
    }
  }
  var SIGNIN_NOTICES = {
    "signed-out": ["success", "You've signed out", "See you next time."],
    expired: ["info", "Please sign in again", "You were away for a while, so we signed you out to keep your account safe."],
    everywhere: ["success", "You've signed out everywhere", "Every phone and computer you used OrbiTutor on is now signed out."],
    "password-saved": ["success", "Password saved", "Sign in with your new password."],
  };

  // ---- the sign-in page: your OrbitCore account, email and password, or both ----
  function SignIn(p) {
    var id = uid("si"), sso = p.sso, usePw = p.password !== false, primary = p.primary || (sso ? "sso" : "password");
    var view = useState(p.view || "form"), email = useState(p.email || ""), pw = useState(""), errs = useState({});
    var problem = useState(p.error || null), notice = useState(p.notice || null), busy = useState(null);
    var lock = useCountdown(), again = useCountdown(), pwRef = useRef(null);
    useFocusTitle(view[0], id);
    useEffect(function () {
      if (p.error && p.error.kind === "locked") lock[1](p.error.seconds || 60);
      if (p.view === "link") again[1](60);
    }, []);
    function fail(pr) {
      notice[1](null); problem[1](pr);
      if (pr.kind === "locked") lock[1](pr.seconds || 60);
      if (pr.kind === "wrong") { pw[1](""); if (pwRef.current) pwRef.current.focus(); }
    }
    function run(kind, call, then) {
      busy[1](kind); problem[1](null);
      Promise.resolve(call()).then(function (res) {
        busy[1](null);
        if (res && res.error) fail(res.error); else if (then) then();
      }, function (er) { busy[1](null); fail(er && er.kind ? er : { kind: navigator.onLine === false ? "offline" : "server" }); });
    }
    function submit(e) {
      e.preventDefault();
      if (lock[0] > 0 || busy[0]) return;
      var next = { email: emailProblem(email[0]), pw: pw[0] ? null : "Type your password." };
      errs[1](next);
      if (next.email || next.pw) { focusId(next.email ? id + "e" : id + "p"); return; }
      run("password", function () { return p.onSignIn ? p.onSignIn({ email: email[0].trim(), password: pw[0] }) : null; });
    }
    function sendLink() {
      if (busy[0]) return;
      var er = emailProblem(email[0], "Type your email first, and we'll send the link there.");
      errs[1]({ email: er });
      if (er) { focusId(id + "e"); return; }
      run("link", function () { return p.onEmailLink ? p.onEmailLink(email[0].trim()) : null; }, function () { view[1]("link"); again[1](60); });
    }
    var alert = problem[0] ? signInProblem(problem[0], lock[0], p)
      : notice[0] && SIGNIN_NOTICES[notice[0]] ? authAlert(notice[0], SIGNIN_NOTICES[notice[0]][0], SIGNIN_NOTICES[notice[0]][1], SIGNIN_NOTICES[notice[0]][2]) : null;
    var kids;
    if (view[0] === "link") {
      kids = [authHead({ id: id, icon: "mail", title: "Check your email", text: h("span", null, "If ", h("strong", null, email[0].trim()), " has an OrbiTutor account, we've sent it a sign-in link. It works once, for " + plural(p.linkMinutes || 10, "minute") + ".") }),
        problem[0] ? alert : null,
        h("ul", { key: "tips", className: "ot-auth__tips" },
          h("li", null, "Open the email on this phone or computer, then tap the link. It signs you in where it's opened."),
          h("li", null, "Can't see it? Look in spam or promotions.")),
        h("div", { key: "act", className: "ot-auth__actions" },
          h(Button, { variant: "secondary", icon: "retry", disabled: again[0] > 0, loading: busy[0] === "link", onClick: sendLink }, again[0] > 0 ? "Send again in " + mmss(again[0]) : "Send it again"),
          h(Button, { variant: "text", icon: "arrow-left", onClick: function () { view[1]("form"); problem[1](null); } }, "Back to sign in"))];
    } else {
      var form = usePw ? h("form", { method: "post", key: "form", className: "ot-auth__form", onSubmit: submit, noValidate: true },
        h(TextField, { id: id + "e", label: "Email", type: "email", name: "email", autoComplete: "username", inputMode: "email", maxLength: 254, autoCapitalize: "none", spellCheck: false, value: email[0], error: errs[0].email,
          onChange: function (e) { email[1](e.target.value); if (errs[0].email) errs[1](Object.assign({}, errs[0], { email: null })); } }),
        h(PasswordField, { id: id + "p", inputRef: pwRef, value: pw[0], error: errs[0].pw,
          labelAction: p.forgotHref || p.onForgot ? h("a", { className: "ot-linkbtn ot-linkbtn--sm", href: p.forgotHref || "#", onClick: p.onForgot ? function (e) { e.preventDefault(); p.onForgot(email[0].trim()); } : undefined }, "Forgot password?") : null,
          onChange: function (e) { pw[1](e.target.value); if (errs[0].pw) errs[1](Object.assign({}, errs[0], { pw: null })); } }),
        h(Button, { type: "submit", variant: primary === "password" ? "primary" : "secondary", size: "lg", full: true, loading: busy[0] === "password", disabled: lock[0] > 0 }, "Sign in"),
        p.emailLink ? h("button", { type: "button", className: "ot-linkbtn ot-auth__alt", onClick: sendLink, disabled: !!busy[0] }, h(Icon, { name: "mail", size: 18 }), "Email me a sign-in link instead") : null) : null;
      kids = [authHead({ id: id, title: p.title || "Sign in", text: p.subtitle || (usePw || sso ? "Welcome back. Your lessons are where you left them." : null) }),
        alert,
        sso ? h(SsoButton, { key: "sso", primary: primary === "sso", href: sso.href, label: sso.label, onClick: sso.onClick }) : null,
        sso && !usePw ? h("p", { key: "ssonote", className: "ot-auth__note" }, "Use the email and password of your OrbitCore account. ",
          sso.resetHref ? h("a", { className: "ot-linkbtn ot-linkbtn--sm", href: sso.resetHref }, "Forgot it?") : null) : null,
        sso && usePw ? orLine(primary === "sso" ? "or use your email" : "or") : null,
        form,
        p.newcomer === false ? null : p.signUpHref && p.newcomer === undefined ? h("p", { key: "new", className: "ot-auth__new" },
          h("strong", null, "New to OrbiTutor? "), h("a", { className: "ot-linkbtn ot-linkbtn--sm", href: p.signUpHref }, "Create an account"),
          " to look around and ask to join a course.") : h("p", { key: "new", className: "ot-auth__new" },
          h("strong", null, "New to OrbiTutor? "), p.newcomer || "Once you're enrolled in a batch, we email you a link to set up your account. ",
          p.joinHref ? h("a", { className: "ot-linkbtn ot-linkbtn--sm", href: p.joinHref }, "Browse courses") : null)];
    }
    return authPage(p, { eyebrow: "OrbiTutor", title: "Your lab is where you left it", text: "Lessons, live classes and your marked work, all in one place." }, kids);
  }

  // ---- making an account: a name and an email; the email brings a link to choose a password ----
  // Signing up only makes the account. Joining a class is still the instructor's doing.
  function signUpProblem(pr, p) {
    switch (pr.kind) {
      case "rate": return authAlert(pr.kind, "warning", "That's a lot of sign-ups", "Wait a little, then try again. Or message us and we'll make your account.", helpButton(p));
      case "offline": return authAlert(pr.kind, "warning", "You're offline", "Connect to the internet, then try again.");
      default: return authAlert(pr.kind, "danger", "We couldn't make your account just now", pr.message || "Something went wrong on our side. Try again in a minute.");
    }
  }
  function SignUp(p) {
    var id = uid("su"), view = useState(p.view || "form"), name = useState(p.name || ""), email = useState(p.email || ""), trap = useState("");
    var errs = useState({}), busy = useState(false), problem = useState(p.error && p.error.kind !== "closed" ? p.error : null);
    var closed = useState(!!p.closed || !!(p.error && p.error.kind === "closed"));
    useFocusTitle(closed[0] ? "closed" : view[0], id);
    function submit(e) {
      e.preventDefault();
      if (busy[0]) return;
      var n = name[0].trim().replace(/\s+/g, " ");
      var next = { name: !n ? "Type your name." : n.length > 140 ? "Keep your name under 140 characters." : null, email: emailProblem(email[0]) };
      errs[1](next);
      if (next.name || next.email) { focusId(next.name ? id + "n" : id + "e"); return; }
      busy[1](true); problem[1](null);
      Promise.resolve(p.onSignUp ? p.onSignUp({ name: n, email: email[0].trim(), website: trap[0] }) : null).then(function (res) {
        busy[1](false);
        var x = res && res.error;
        if (!x) { view[1]("sent"); return; }
        if (x.kind === "closed") closed[1](true); else problem[1](x);
      }, function (er) { busy[1](false); problem[1](er && er.kind ? er : { kind: navigator.onLine === false ? "offline" : "server" }); });
    }
    var kids;
    if (closed[0]) {
      kids = [authHead({ id: id, icon: "lock", tone: "neutral", center: true, title: "Signing up is closed for now",
          text: "OrbitCore makes accounts for new students at the moment. Message us and we'll set yours up." }),
        h("div", { key: "act", className: "ot-auth__actions ot-auth__actions--center" },
          p.helpHref ? h(Button, { icon: "discussion", href: p.helpHref, target: /^https?:/.test(p.helpHref) ? "_blank" : undefined }, "Message us") : null,
          p.signInHref ? h(Button, { variant: "secondary", href: p.signInHref }, "Go to sign in") : null)];
    } else if (view[0] === "sent") {
      kids = [authHead({ id: id, icon: "mail", title: "Check your email",
          text: h("span", null, "If ", h("strong", null, email[0].trim()), " is new to OrbiTutor, we've sent it a link to choose a password. It works for " + plural(p.linkMinutes || 20, "minute") + ".") }),
        h("ul", { key: "tips", className: "ot-auth__tips" },
          h("li", null, "Open the email and tap \u201cSet my password\u201d."),
          h("li", null, "Can't see it? Look in spam or promotions."),
          h("li", null, "Already have an account with this email? Sign in, or reset your password from the sign-in page.")),
        h("div", { key: "act", className: "ot-auth__actions" },
          p.signInHref ? h(Button, { variant: "secondary", href: p.signInHref, iconAfter: "arrow-right" }, "Go to sign in") : null,
          h(Button, { variant: "text", icon: "arrow-left", onClick: function () { view[1]("form"); } }, "Use a different email"))];
    } else {
      kids = [authHead({ id: id, title: p.title || "Create your account",
          text: p.subtitle || "Look around every course and ask to join one. Your instructor adds you to your class." }),
        problem[0] ? signUpProblem(problem[0], p) : null,
        h("form", { method: "post", key: "form", className: "ot-auth__form", onSubmit: submit, noValidate: true },
          h(TextField, { id: id + "n", label: "Your name", name: "name", autoComplete: "name", maxLength: 140, value: name[0], error: errs[0].name,
            onChange: function (e) { name[1](e.target.value); if (errs[0].name) errs[1](Object.assign({}, errs[0], { name: null })); } }),
          h("div", { className: "ot-hp", "aria-hidden": true }, h("label", null, "Leave this empty", h("input", { type: "text", name: "website", tabIndex: -1, autoComplete: "off", value: trap[0], onChange: function (e) { trap[1](e.target.value); } }))),
          h(TextField, { id: id + "e", label: "Email", type: "email", name: "email", autoComplete: "email", inputMode: "email", maxLength: 254, autoCapitalize: "none", spellCheck: false, value: email[0], error: errs[0].email,
            hint: "We'll send a link there to choose your password. Signing up for your child? Use the email you'd like us to write to.",
            onChange: function (e) { email[1](e.target.value); if (errs[0].email) errs[1](Object.assign({}, errs[0], { email: null })); } }),
          h(Button, { type: "submit", size: "lg", full: true, loading: busy[0], iconAfter: "arrow-right" }, "Create my account")),
        p.signInHref ? h("p", { key: "have", className: "ot-auth__new" }, h("strong", null, "Already have an account? "),
          h("a", { className: "ot-linkbtn ot-linkbtn--sm", href: p.signInHref }, "Sign in")) : null];
    }
    return authPage(p, { eyebrow: "OrbiTutor", title: "Look around before you join", text: "Every course, what you'd build in it, and when the next batch starts." }, kids);
  }

  // ---- the link in a new student's welcome email: set a password, or use an OrbitCore account ----
  function AcceptInvite(p) {
    var id = uid("ai"), st = useState(p.status || "ready"), status = st[0], s = p.student || {}, e = p.enrolment;
    var sso = p.sso, usePw = p.password !== false, primary = p.primary || (usePw ? "password" : "sso");
    var pw = useState(""), err = useState(null), busy = useState(false), sent = useState(null), again = useCountdown(), problem = useState(null);
    var first = (s.name || "").split(/\s+/)[0], min = p.minScore == null ? 2 : p.minScore, signup = p.kind === "signup";
    useFocusTitle(status, id);
    function submit(ev) {
      ev.preventDefault();
      if (busy[0]) return;
      var str = passwordStrength(pw[0], [s.name, s.email]);
      var why = !pw[0] ? "Choose a password." : str.score < min ? "Choose a harder one to guess. " + (str.tip || "") : null;
      err[1](why);
      if (why) { focusId(id + "p"); return; }
      busy[1](true); problem[1](null);
      Promise.resolve(p.onSetPassword ? p.onSetPassword({ password: pw[0] }) : null).then(function (res) {
        busy[1](false);
        var x = res && res.error;
        if (!x) return;
        if (x.kind === "expired" || x.kind === "used") st[1](x.kind);
        else if (x.kind === "weak") { err[1](x.message || "Choose a harder one to guess."); focusId(id + "p"); }
        else problem[1](x.message || "We couldn't save that. Check your connection and try again.");
      }, function () { busy[1](false); problem[1]("We couldn't save that. Check your connection and try again."); });
    }
    function resend() {
      if (busy[0]) return;
      busy[1](true);
      Promise.resolve(p.onResend ? p.onResend(s.email) : null).then(function (res) {
        busy[1](false);
        if (res && res.error) { sent[1](res.error.kind === "rate" ? "rate" : "failed"); return; }
        sent[1]("sent"); again[1](60);
      }, function () { busy[1](false); sent[1]("failed"); });
    }
    var kids;
    if (status === "expired") {
      kids = [authHead({ id: id, icon: "due", tone: "warning", center: true, title: "This link has expired",
          text: "Links to set up an account only work for a short time, to keep it safe." + (s.email ? " We can send a new one to " + s.email + "." : "") }),
        sent[0] === "sent" ? authAlert("sent", "success", "Sent", "Check your inbox for an email from OrbiTutor called \u201cPassword Reset\u201d. It can take a minute, and sometimes lands in spam.")
          : sent[0] === "rate" ? authAlert("rate", "warning", "That's a lot of links", "You've asked for a few already. Use the newest email, or message us.", helpButton(p))
          : sent[0] === "failed" ? authAlert("failed", "danger", "That didn't send", "Check your connection and try again.") : null,
        h("div", { key: "act", className: "ot-auth__actions ot-auth__actions--center" },
          p.onResend && s.email ? h(Button, { icon: "mail", loading: busy[0], disabled: again[0] > 0, onClick: resend }, again[0] > 0 ? "Send again in " + mmss(again[0]) : sent[0] === "sent" ? "Send it again" : "Email me a new link") : null,
          p.helpHref ? h(Button, { variant: "secondary", icon: "discussion", href: p.helpHref, target: "_blank" }, "Message us") : null)];
    } else if (status === "used") {
      kids = [authHead({ id: id, icon: "lock", tone: "neutral", center: true, title: "This link has already been used",
          text: "Each link works once. If you've already set your password, sign in. If you haven't, ask for a new link." }),
        h("div", { key: "act", className: "ot-auth__actions ot-auth__actions--center" },
          p.signInHref ? h(Button, { href: p.signInHref, iconAfter: "arrow-right" }, "Go to sign in") : null,
          p.forgotHref ? h(Button, { variant: "secondary", href: p.forgotHref }, "Get a new link") : null)];
    } else {
      var start = e && toDate(e.startsAt);
      var course = e ? h("div", { key: "course", className: "ot-invite__course", style: trackStyle(e.track) },
        h("span", { className: "ot-invite__courseicon", "aria-hidden": true }, h(Icon, { name: "courses", size: 22 })),
        h("span", { className: "ot-invite__coursetext" },
          h("strong", null, e.course),
          h("span", null, [e.batch ? e.batch + " batch" : null, start ? "starts " + longDate(start) + ", " + timeText(start) : null].filter(Boolean).join(", ")))) : null;
      var form = usePw ? h("form", { method: "post", key: "form", className: "ot-auth__form", onSubmit: submit, noValidate: true },
        // the email, for password managers to save the new password against
        h("input", { type: "email", name: "username", autoComplete: "username", value: s.email || "", readOnly: true, hidden: true }),
        h(PasswordField, { id: id + "p", label: sso ? "Or choose a password" : "Choose a password", autoComplete: "new-password", value: pw[0], strength: true, minScore: min, userInputs: [s.name, s.email], error: err[0],
          onChange: function (ev) { pw[1](ev.target.value); if (err[0]) err[1](null); } }),
        problem[0] ? authAlert("p", "danger", "That didn't work", problem[0]) : null,
        h(Button, { type: "submit", variant: primary === "password" ? "primary" : "secondary", size: "lg", full: true, loading: busy[0], iconAfter: "arrow-right" }, "Set password and continue")) : null;
      kids = [authHead({ id: id, eyebrow: signup ? "Almost there" : "You're enrolled", title: first ? "Welcome to OrbiTutor, " + first : "Welcome to OrbiTutor",
          text: signup ? "Choose a password, then look around the courses and ask to join one." : "Set up how you'll sign in, and you're ready for your first class." }),
        course,
        s.email ? h("div", { key: "who", className: "ot-auth__who" }, h(Avatar, { name: s.name || s.email, size: 36, decorative: true }),
          h("span", null, h("span", { className: "ot-auth__whoname" }, s.name), h("span", { className: "ot-auth__whomail" }, s.email))) : null,
        sso ? h("div", { key: "sso", className: "ot-auth__ssobox" },
          h(SsoButton, { primary: primary === "sso", href: sso.href, label: sso.label || "Use my OrbitCore account", onClick: sso.onClick }),
          h("p", { className: "ot-auth__note" }, "If you already have an OrbitCore account with this email, use that and skip the password.")) : null,
        sso && usePw ? orLine("or") : null,
        form];
    }
    return authPage(p, signup ? { eyebrow: "Welcome", title: "Look around, then ask to join", text: "Every course, what you'd build in it, and when the next batch starts. Your instructor adds you to your class." }
      : { eyebrow: "Welcome aboard", title: "One sign-in, then you're ready to build", text: "Your batch, its live classes and every lesson you're enrolled in will be waiting." }, kids);
  }

  // ---- forgot your password: ask for a link, check your email, then set a new password ----
  function PasswordReset(p) {
    var id = uid("pr"), st = useState(p.step || "request"), step = st[0], email = useState(p.email || ""), err = useState(null);
    var pw = useState(""), others = useState(p.signOutOthers !== false), busy = useState(false), problem = useState(null), again = useCountdown();
    var mins = p.linkMinutes || 20, min = p.minScore == null ? 2 : p.minScore;
    useFocusTitle(step, id);
    useEffect(function () { if (p.step === "sent") again[1](60); }, []);
    function go(s) { problem[1](null); err[1](null); st[1](s); }
    function request(ev) {
      if (ev) ev.preventDefault();
      if (busy[0]) return;
      var er = emailProblem(email[0]);
      err[1](er);
      if (er) { focusId(id + "e"); return; }
      busy[1](true); problem[1](null);
      Promise.resolve(p.onRequest ? p.onRequest(email[0].trim()) : null).then(function (res) {
        busy[1](false);
        if (res && res.error) { problem[1](res.error.kind === "rate" ? "rate" : "failed"); return; }
        st[1]("sent"); again[1](60);
      }, function () { busy[1](false); problem[1]("failed"); });
    }
    function save(ev) {
      ev.preventDefault();
      if (busy[0]) return;
      var str = passwordStrength(pw[0], [p.name, p.email]);
      var why = !pw[0] ? "Type a new password." : str.score < min ? "Choose a harder one to guess. " + (str.tip || "") : null;
      err[1](why);
      if (why) { focusId(id + "p"); return; }
      busy[1](true); problem[1](null);
      Promise.resolve(p.onReset ? p.onReset({ password: pw[0], signOutOthers: others[0] }) : null).then(function (res) {
        busy[1](false);
        var x = res && res.error;
        if (!x) { st[1]("done"); return; }
        if (x.kind === "expired" || x.kind === "invalid") st[1](x.kind);
        else if (x.kind === "weak") { err[1](x.message || "Choose a harder one to guess."); focusId(id + "p"); }
        else problem[1]("failed");
      }, function () { busy[1](false); problem[1]("failed"); });
    }
    var oops = problem[0] === "rate" ? authAlert("rate", "warning", "That's a lot of links", "You've asked for a few in the last hour. Use the newest email, or wait an hour and try again.", helpButton(p))
      : problem[0] === "failed" ? authAlert("failed", "danger", "That didn't work", "Check your connection and try again.") : null;
    var back = p.signInHref || p.onSignIn ? h(BackLink, { key: "back", href: p.signInHref || "#", onClick: p.onSignIn ? function (e) { e.preventDefault(); p.onSignIn(); } : undefined, className: "ot-auth__back" }, "Back to sign in") : null;
    var kids;
    if (step === "sent") {
      kids = [authHead({ id: id, icon: "mail", title: "Check your email",
          text: h("span", null, "If ", h("strong", null, email[0].trim()), " belongs to an OrbiTutor account, we've sent it a link to set a new password. The link works for " + plural(mins, "minute") + ".") }),
        oops,
        h("ul", { key: "tips", className: "ot-auth__tips" }, h("li", null, "Look for an email called \u201cPassword Reset\u201d."), h("li", null, "Can't see it? Look in spam or promotions.")),
        h("div", { key: "act", className: "ot-auth__actions" },
          h(Button, { variant: "secondary", icon: "retry", loading: busy[0], disabled: again[0] > 0, onClick: function () { request(); } }, again[0] > 0 ? "Send again in " + mmss(again[0]) : "Send it again"),
          h(Button, { variant: "text", onClick: function () { go("request"); } }, "Use a different email")),
        back];
    } else if (step === "reset") {
      kids = [authHead({ id: id, icon: "key", title: "Set a new password", text: p.email ? h("span", null, "For ", h("strong", null, p.email), ".") : null }),
        h("form", { method: "post", key: "form", className: "ot-auth__form", onSubmit: save, noValidate: true },
          h("input", { type: "email", name: "username", autoComplete: "username", value: p.email || "", readOnly: true, hidden: true }),
          h(PasswordField, { id: id + "p", label: "New password", autoComplete: "new-password", value: pw[0], strength: true, minScore: min, userInputs: [p.name, p.email], error: err[0],
            onChange: function (ev) { pw[1](ev.target.value); if (err[0]) err[1](null); } }),
          h(Checkbox, { checked: others[0], onChange: function (ev) { others[1](ev.target.checked); }, label: "Sign me out on my other devices", hint: "Do this if you think someone else knows your old password." }),
          oops,
          h(Button, { type: "submit", size: "lg", full: true, loading: busy[0] }, "Save password"))];
    } else if (step === "expired" || step === "invalid") {
      var exp = step === "expired";
      kids = [authHead({ id: id, icon: exp ? "due" : "lock", tone: exp ? "warning" : "neutral", center: true, title: exp ? "This link has expired" : "This link doesn't work",
          text: exp ? "Reset links work for " + plural(mins, "minute") + ". Ask for a new one and use it straight away." : "It may have been used already: each link works once. Ask for a new one if you still need it." }),
        h("div", { key: "act", className: "ot-auth__actions ot-auth__actions--center" },
          h(Button, { icon: "mail", onClick: function () { go("request"); } }, "Send me a new link"),
          p.signInHref ? h(Button, { variant: "secondary", href: p.signInHref }, "Back to sign in") : null)];
    } else if (step === "done") {
      kids = [authHead({ id: id, icon: "done", tone: "success", center: true, title: "Password saved",
          text: others[0] ? "You're signed in here, and signed out everywhere else." : "You're signed in. Use your new password next time." }),
        h("div", { key: "act", className: "ot-auth__actions ot-auth__actions--center" },
          h(Button, { href: p.homeHref || "/", onClick: p.onDone, iconAfter: "arrow-right" }, p.doneLabel || "Go to Home"))];
    } else {
      kids = [authHead({ id: id, icon: "key", title: "Forgot your password?", text: "Type the email you use for OrbiTutor. We'll email you a link to set a new one." }),
        p.ssoResetHref ? h("p", { key: "sso", className: "ot-auth__note ot-auth__ssonote" }, h(BrandMark, { size: 20 }),
          h("span", null, "Sign in with your OrbitCore account? ", h("a", { className: "ot-linkbtn ot-linkbtn--sm", href: p.ssoResetHref }, "Reset that password on the OrbitCore page"), " instead.")) : null,
        h("form", { method: "post", key: "form", className: "ot-auth__form", onSubmit: request, noValidate: true },
          h(TextField, { id: id + "e", label: "Email", type: "email", name: "email", autoComplete: "username", inputMode: "email", maxLength: 254, autoCapitalize: "none", spellCheck: false, value: email[0], error: err[0],
            onChange: function (ev) { email[1](ev.target.value); if (err[0]) err[1](null); } }),
          oops,
          h(Button, { type: "submit", size: "lg", full: true, icon: "mail", loading: busy[0] }, "Email me a link")),
        back];
    }
    return authPage(p, { eyebrow: "No problem", title: "Back to building in a minute", text: "We'll email you a link. Open it, choose a new password, and carry on." }, kids);
  }

  // ---- a student's first sign-in: photo and name, notifications (phone app), then a tour of Home ----
  var NOTIFY_KINDS = [["live", "A live class is about to start"], ["assignment", "Your work has been marked"], ["reading", "A new lesson opens"], ["certificate", "Your certificate is ready"], ["discussion", "Your batch has an announcement"]];
  function WelcomeSetup(p) {
    var u = p.user || {}, app = !!p.app, id = uid("ws");
    var steps = ["you"].concat(app ? ["alerts"] : [], ["ready"]);
    var at = useState(Math.max(0, steps.indexOf(p.step || "you"))), step = steps[at[0]];
    var name = useState(u.name || ""), nameErr = useState(null), photo = useState(u.image ? { src: u.image } : null);
    var busy = useState(false), saveErr = useState(null), alerts = useState(p.notifications || "prompt");
    useFocusTitle(step, id);
    // let go of a picked photo's preview when it's replaced
    useEffect(function () {
      var src = photo[0] && photo[0].file ? photo[0].src : null;
      return function () { if (src && URL.revokeObjectURL) URL.revokeObjectURL(src); };
    }, [photo[0]]);
    var maxMB = p.maxPhotoMB || 10, first = (name[0].trim() || u.name || "").split(/\s+/)[0];
    function go(d) { saveErr[1](null); at[1](Math.max(0, Math.min(steps.length - 1, at[0] + d))); }
    function saveYou(e) {
      e.preventDefault();
      if (busy[0]) return;
      var n = name[0].trim().replace(/\s+/g, " ");
      if (n.length < 2) { nameErr[1]("Type your name as it should appear on your certificates."); focusId(id + "n"); return; }
      nameErr[1](null); busy[1](true); saveErr[1](null);
      Promise.resolve(p.onSave ? p.onSave({ name: n, photo: photo[0] && photo[0].file || null, removePhoto: !photo[0] && !!u.image }) : null).then(function (res) {
        busy[1](false);
        if (res && res.error) { saveErr[1](res.error.message || "We couldn't save that. Try again."); return; }
        go(1);
      }, function () { busy[1](false); saveErr[1]("We couldn't save that. Check your connection and try again."); });
    }
    function enable() {
      if (busy[0]) return;
      busy[1](true);
      Promise.resolve(p.onEnableNotifications ? p.onEnableNotifications() : "granted").then(function (r) { busy[1](false); alerts[1](r === "granted" ? "granted" : "denied"); },
        function () { busy[1](false); alerts[1]("denied"); });
    }
    var progress = h("div", { key: "prog", className: "ot-setup__progress" },
      at[0] > 0 ? h(Button, { variant: "text", size: "sm", icon: "arrow-left", className: "ot-quiet ot-setup__back", onClick: function () { go(-1); } }, "Back") : null,
      h("span", { className: "ot-setup__count" }, "Step " + (at[0] + 1) + " of " + steps.length),
      h("span", { className: "ot-setup__bars", "aria-hidden": true }, steps.map(function (s, i) { return h("span", { key: s, className: cx("ot-setup__bar", i <= at[0] && "is-on") }); })));
    var kids;
    if (step === "alerts") {
      var a = alerts[0];
      kids = [progress,
        authHead({ id: id, icon: "bell", title: "Know when class is starting", text: "Turn on notifications and your phone will tell you when:" }),
        h("ul", { key: "list", className: "ot-setup__list" }, NOTIFY_KINDS.map(function (k) {
          return h("li", { key: k[0] }, h("span", { className: "ot-setup__listicon", "aria-hidden": true }, h(Icon, { name: k[0], size: 20 })), h("span", null, k[1]));
        })),
        a === "granted" ? authAlert("on", "success", "Notifications are on", "You can choose which ones you get in Settings.")
          : a === "denied" ? authAlert("off", "warning", "Notifications are off", "You can turn them on any time in your phone's Settings, under OrbiTutor, then Notifications.") : null,
        h("div", { key: "act", className: "ot-auth__actions" }, a === "prompt"
          ? [h(Button, { key: "on", size: "lg", icon: "bell", loading: busy[0], onClick: enable }, "Turn on notifications"), h(Button, { key: "no", variant: "text", className: "ot-quiet", onClick: function () { go(1); } }, "Not now")]
          : h(Button, { size: "lg", iconAfter: "arrow-right", onClick: function () { go(1); } }, "Continue")),
        a === "prompt" ? h("p", { key: "note", className: "ot-auth__note" }, "Your phone will ask you to allow them. You can change your mind later.") : null];
    } else if (step === "ready") {
      kids = [progress,
        h("div", { key: "hero", className: "ot-setup__hero", "aria-hidden": true },
          h("svg", { className: "ot-setup__orbit", viewBox: "0 0 200 120", width: 200, height: 120 },
            h("ellipse", { cx: 100, cy: 60, rx: 92, ry: 30, transform: "rotate(-14 100 60)" }),
            h("circle", { className: "ot-setup__moon", cx: 13.8, cy: 72.4, r: 5 }),
            h("circle", { className: "ot-setup__moon ot-setup__moon--gold", cx: 183.6, cy: 34.4, r: 6.5 })),
          h(Avatar, { name: name[0] || u.name, src: photo[0] && photo[0].src, size: 96, decorative: true })),
        authHead({ id: id, center: true, title: first ? "You're all set, " + first : "You're all set", text: "Want a quick look around Home first? It takes about half a minute." }),
        h("div", { key: "act", className: "ot-auth__actions ot-auth__actions--center" },
          h(Button, { size: "lg", iconAfter: "arrow-right", onClick: p.onTour }, "Show me around"),
          h(Button, { variant: "secondary", size: "lg", onClick: p.onDone }, "I'll explore myself"))];
    } else {
      kids = [progress,
        h("form", { method: "post", key: "form", className: "ot-auth__form ot-setup__you", onSubmit: saveYou, noValidate: true },
          authHead({ id: id, title: "First, is this you?", text: "Add a photo so your instructors can put a face to your name, and check your name is spelled right." }),
          h(PhotoField, { className: "ot-setup__photo", name: name[0] || u.name || "?", src: photo[0] && photo[0].src, maxMB: maxMB,
            hint: "A clear photo of your face works best. You can change it any time in Settings.", onChange: function (v) { photo[1](v); } }),
          h(TextField, { id: id + "n", label: "Your full name", maxLength: 140, value: name[0], autoComplete: "name", error: nameErr[0], hint: nameErr[0] ? null : "It's printed on your certificates, so check the spelling.",
            onChange: function (e) { name[1](e.target.value); if (nameErr[0]) nameErr[1](null); } }),
          saveErr[0] ? authAlert("save", "danger", "That didn't save", saveErr[0]) : null,
          h("div", { className: "ot-auth__actions" },
            h(Button, { type: "submit", size: "lg", loading: busy[0], iconAfter: "arrow-right" }, "Continue"),
            p.onSkip ? h(Button, { variant: "text", className: "ot-quiet", onClick: p.onSkip }, "Skip for now") : null))];
    }
    return authPage(Object.assign({ aside: false }, p), false, kids);
  }

  // ---- a short tour of Home: a spotlight on each part in turn, with a note beside it ----
  var HOME_TOUR = [
    { target: ".ot-continue", title: "Pick up where you left off", text: "Your latest lesson is always here. Tap it to carry on." },
    { target: ".ot-live", title: "Your next live class", text: "It counts down here, and a Join button appears when the class starts." },
    { target: ".ot-due", title: "Due soon", text: "Quizzes and assignments, with the closest deadline first." },
    { target: ".ot-strip", title: "Your courses", text: "Each ring shows how far through a course you are." },
    { target: [".ot-tabbar", ".ot-topbar__links"], title: "Getting around", text: "Home, your courses, your schedule and your profile are always here." }];
  function HomeTour(p) {
    var steps = p.steps || HOME_TOUR, reduce = useReducedMotion(), id = uid("tour");
    var order = useState([]), at = useState(0), box = useState(null), pos = useState(null), pop = useRef(null), back = useRef(null);
    function find(s) {
      var scope = (p.root && p.root.current) || document, list = [].concat(s.target);
      for (var i = 0; i < list.length; i++) {
        var el = typeof list[i] === "string" ? scope.querySelector(list[i]) : list[i] && list[i].current;
        if (el) { var r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return el; }
      }
      return null;
    }
    // only the parts on this student's Home are shown: no live class, no stop for it
    useLayoutEffect(function () {
      if (!p.open) return;
      back.current = document.activeElement;
      var o = [];
      steps.forEach(function (s, i) { if (find(s)) o.push(i); });
      order[1](o); at[1](Math.max(0, Math.min(o.length - 1, p.start || 0))); box[1](null); pos[1](null);
      return function () { var b = back.current; if (b && b.focus && document.contains(b)) b.focus(); };
    }, [p.open]);
    var k = at[0], n = order[0].length, si = n ? order[0][k] : -1, step = si >= 0 ? steps[si] : null;
    // bring the part into view, then follow it while the page scrolls or resizes
    useLayoutEffect(function () {
      if (!p.open || si < 0) return;
      var el = find(steps[si]);
      if (!el) return;
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
      var raf = 0, until = Date.now() + (reduce ? 0 : 900);
      function measure() { var r = el.getBoundingClientRect(); box[1]({ top: r.top, left: r.left, width: r.width, height: r.height, vw: window.innerWidth, vh: window.innerHeight }); }
      function loop() { measure(); if (Date.now() < until) raf = requestAnimationFrame(loop); }
      loop();
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, true);
      return function () { cancelAnimationFrame(raf); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
    }, [p.open, si]);
    // place the note: under or over the part on wide screens, along the top or bottom edge on phones
    useLayoutEffect(function () {
      var b = box[0], el = pop.current;
      if (!b || !el) return;
      var ph = el.offsetHeight, pw = el.offsetWidth, m = 16, gap = 18, pad = 8, next;
      if (b.vw < 560) next = { dock: b.top + b.height / 2 < b.vh / 2 ? "bottom" : "top" };
      else {
        var left = Math.round(Math.min(Math.max(m, b.left + b.width / 2 - pw / 2), b.vw - pw - m));
        var arrow = Math.round(Math.min(Math.max(24, b.left + b.width / 2 - left), pw - 24));
        var below = b.top + b.height + pad + gap, above = b.top - pad - gap - ph;
        if (below + ph + m <= b.vh) next = { top: Math.round(below), left: left, side: "below", arrow: arrow };
        else if (above >= m) next = { top: Math.round(above), left: left, side: "above", arrow: arrow };
        else next = { top: Math.round(Math.max(m, b.vh - ph - m)), left: left, side: "over" };
      }
      var c = pos[0];
      if (!c || c.top !== next.top || c.left !== next.left || c.dock !== next.dock || c.side !== next.side || c.arrow !== next.arrow) pos[1](next);
    });
    function close(finished) { if (p.onClose) p.onClose(finished); }
    function move(d) { var j = k + d; if (j < 0) return; if (j >= n) close(true); else at[1](j); }
    // each stop's note takes focus, so it's read out
    useEffect(function () { if (p.open && si >= 0 && pop.current) pop.current.focus({ preventScroll: true }); }, [p.open, si]);
    // Escape ends the tour, the arrow keys move through it, and Tab stays inside the note
    useEffect(function () {
      if (!p.open || si < 0) return;
      function keys(e) {
        if (e.key === "Escape") { e.preventDefault(); close(false); }
        else if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
        else if (e.key === "Tab" && pop.current) {
          var f = Array.prototype.slice.call(pop.current.querySelectorAll("button:not([disabled])"));
          if (!f.length) return;
          var i = f.indexOf(document.activeElement);
          if (i < 0) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
          else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      }
      document.addEventListener("keydown", keys);
      return function () { document.removeEventListener("keydown", keys); };
    }, [p.open, si, k, n]);
    if (!p.open || !step) return null;
    var b = box[0], P = 8, last = k === n - 1, ps = pos[0] || {};
    var spot = b ? { top: b.top - P, left: b.left - P, width: b.width + 2 * P, height: b.height + 2 * P } : null;
    var style = ps.dock ? (ps.dock === "top" ? { top: 16 } : { bottom: 16 }) : ps.top != null ? { top: ps.top, left: ps.left, "--ax": ps.arrow + "px" } : { top: 0, left: 0, opacity: 0, pointerEvents: "none" };
    return h("div", { className: cx("ot-tour", reduce && "ot-tour--still", p.className) },
      h("div", { className: "ot-tour__catch", "aria-hidden": true, onMouseDown: function (e) { e.preventDefault(); } }),
      spot ? h("div", { className: "ot-tour__spot", style: spot, "aria-hidden": true }) : null,
      h("div", {
        ref: pop, className: cx("ot-tour__pop", ps.dock && "ot-tour__pop--dock", ps.side && "ot-tour__pop--" + ps.side), style: style,
        role: "dialog", "aria-modal": true, "aria-labelledby": id + "t", "aria-describedby": id + "x", tabIndex: -1,
      },
        ps.side === "below" || ps.side === "above" ? h("span", { className: "ot-tour__arrow", "aria-hidden": true }) : null,
        h("div", { className: "ot-tour__top" },
          h("span", { className: "ot-tour__count" }, (k + 1) + " of " + n),
          h("span", { className: "ot-tour__dots", "aria-hidden": true }, order[0].map(function (_, i) { return h("span", { key: i, className: cx("ot-tour__dot", i === k && "is-on", i < k && "is-done") }); }))),
        h("h2", { id: id + "t", className: "ot-tour__title" }, step.title),
        h("p", { id: id + "x", className: "ot-tour__text" }, step.text),
        h("div", { className: "ot-tour__actions" },
          last ? h("span") : h(Button, { variant: "text", size: "sm", className: "ot-quiet", onClick: function () { close(false); } }, "Skip tour"),
          h("span", { className: "ot-tour__nav" },
            k > 0 ? h(Button, { variant: "secondary", size: "sm", onClick: function () { move(-1); } }, "Back") : null,
            h(Button, { size: "sm", iconAfter: last ? undefined : "arrow-right", onClick: function () { move(1); } }, last ? "Done" : "Next")))));
  }


  // ---- Profile and settings: the student's own page, and how they set the app up ----
  function monthYear(d) { return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function trackName(id) { for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === id) return TRACKS[i].title; return ""; }
  // "5 minutes ago", "yesterday", "12 days ago", "on 3 November 2026"
  function agoText(d, now) {
    var m = Math.round((now - d) / 60000);
    if (m < 5) return "just now";
    if (m < 60) return plural(m, "minute") + " ago";
    var hr = Math.round(m / 60);
    if (hr < 24) return plural(hr, "hour") + " ago";
    var dd = dayDiff(d, now);
    if (dd <= 1) return "yesterday";
    if (dd < 30) return dd + " days ago";
    return "on " + fullDate(d);
  }
  // "Saved" for a moment after a change goes through
  function useSaved() {
    var st = useState(0);
    useEffect(function () {
      if (!st[0]) return;
      var t = setTimeout(function () { st[1](0); }, 2600);
      return function () { clearTimeout(t); };
    }, [st[0]]);
    return [!!st[0], function () { st[1](Date.now()); }];
  }
  function savedNote(on, text) {
    return h("span", { className: cx("ot-saved", on && "is-on"), role: "status" }, on ? [h(Icon, { key: "i", name: "done", size: 16 }), h("span", { key: "t" }, text || "Saved")] : null);
  }

  // ---- a photo: pick one (checked before it's used), change it or take it away ----
  function PhotoField(p) {
    var file = useRef(null), err = useState(null), maxMB = p.maxMB || 10, size = p.size || 88;
    function pick(e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!f) return;
      if (!fileAccepted(f, "image/*")) { err[1]("That file isn't a photo. Choose a JPG or PNG."); return; }
      if (f.size > maxMB * 1048576) { err[1]("That photo is too big. Choose one under " + maxMB + " MB."); return; }
      err[1](null);
      if (p.onChange) p.onChange({ file: f, src: URL.createObjectURL(f) });
    }
    return h("div", { className: cx("ot-photofield", p.className) },
      h("span", { className: "ot-photofield__avatar" }, h(Avatar, { name: p.name || "?", src: p.src, size: size, decorative: true })),
      h("div", { className: "ot-photofield__side" },
        p.label ? h("p", { className: "ot-field__label" }, p.label) : null,
        h("div", { className: "ot-photofield__btns" },
          h(Button, { variant: "secondary", size: "sm", icon: "camera", onClick: function () { if (file.current) file.current.click(); } }, p.src ? "Change photo" : "Add a photo"),
          p.src ? h(Button, { variant: "text", size: "sm", className: "ot-quiet", onClick: function () { err[1](null); if (p.onChange) p.onChange(null); } }, "Remove") : null),
        err[0] ? h("p", { className: "ot-field__error", role: "alert" }, h(Icon, { name: "warning", size: 16 }), h("span", null, err[0]))
          : h("p", { className: "ot-photofield__hint" }, p.hint || "A clear photo of your face works best. JPG or PNG, up to " + maxMB + " MB.")),
      h("input", { ref: file, type: "file", accept: "image/*", className: "ot-visually-hidden", tabIndex: -1, "aria-hidden": true, onChange: pick }));
  }

  // ---- the top of a profile: photo in its orbit, name, a line about them, and what they've done ----
  function ProfileHeader(p) {
    var u = p.user || {}, joined = u.joinedAt ? toDate(u.joinedAt) : null;
    var moons = (p.tracks || []).filter(function (t) { return TRACK_NAMES[t]; }).slice(0, 4);
    var meta = [u.batch ? u.batch + " batch" : null, joined ? "Joined " + monthYear(joined) : null].filter(Boolean).join(" \u00b7 ");
    return h("header", { className: cx("ot-profhead", p.className) },
      h("div", { className: "ot-profhead__band", "aria-hidden": true }),
      h("div", { className: "ot-profhead__main" },
        h("span", { className: "ot-profhead__avatar" },
          h(Avatar, { name: u.name || "?", src: u.image, size: 112, decorative: true }),
          // a moon for each track they've finished a course in
          moons.map(function (t, i) { return h("span", { key: t, className: "ot-profhead__moon ot-profhead__moon--" + i, style: trackStyle(t), "aria-hidden": true }); })),
        h("div", { className: "ot-profhead__text" },
          h("h1", { className: "ot-profhead__name" }, u.name),
          meta ? h("p", { className: "ot-profhead__meta" }, meta) : null,
          u.bio ? h("p", { className: "ot-profhead__bio" }, u.bio)
            : p.own ? h("p", { className: "ot-profhead__bio ot-profhead__bio--empty" }, "Add a line about yourself: what you like building, or what you'd like to learn next.") : null),
        p.own && (p.editHref || p.onEdit) ? h(Button, { variant: "secondary", size: "sm", icon: "settings", href: p.editHref, onClick: p.onEdit, className: "ot-profhead__edit" }, "Edit profile") : null),
      p.stats && p.stats.length ? h("dl", { className: "ot-profhead__stats" }, p.stats.map(function (s) {
        return h("div", { key: s.label, className: "ot-profhead__stat" }, h("dt", null, s.label), h("dd", null, s.value));
      })) : null);
  }

  // ---- what they've built: one project per finished course, with their own photo when they handed one in ----
  function ProjectGallery(p) {
    var items = p.items || [];
    if (!items.length) return h("div", { className: cx("ot-projgal ot-projgal--empty", p.className) },
      h(EmptyState, { icon: "settings", compact: true, title: p.emptyTitle || (p.own ? "Your first project is on its way" : "No projects yet") },
        p.emptyText || (p.own ? "Every course ends with something you build. Finish one and it shows up here, with your photo of it." : "Projects show up here as courses are finished.")));
    return h("ul", { className: cx("ot-projgal", p.className), role: "list" }, items.map(function (it, i) {
      var d = it.finishedAt ? toDate(it.finishedAt) : null, pic = it.photo || it.image;
      var inner = [
        h("span", { key: "p", className: cx("ot-projgal__pic", !pic && "ot-projgal__pic--none") },
          pic ? h("img", { src: pic, alt: it.photo ? it.photoAlt || "" : "", loading: "lazy", decoding: "async" }) : h(Icon, { name: "settings", size: 34 }),
          it.photo ? h("span", { className: "ot-projgal__own" }, h(Icon, { name: "camera", size: 14 }), p.own ? "Your photo" : "Their photo") : null),
        h("span", { key: "t", className: "ot-projgal__text" },
          h("span", { className: "ot-projgal__title" }, it.title),
          h("span", { className: "ot-projgal__meta" }, [it.course, d ? "built " + monthYear(d) : null].filter(Boolean).join(" \u00b7 ")))];
      return h("li", { key: it.id || i, className: "ot-projgal__item", style: trackStyle(it.track) },
        it.href ? h("a", { className: "ot-projgal__card", href: it.href, target: "_blank" }, inner,
            h("span", { className: "ot-projgal__go", "aria-hidden": true }, h(Icon, { name: "external", size: 16 })), h("span", { className: "ot-visually-hidden" }, " (opens the project's page)"))
          : h("div", { className: "ot-projgal__card" }, inner));
    }));
  }

  // ---- a student's profile page: theirs, or a classmate's ----
  var VISIBILITY = { batch: "Your batch and your instructors can see this page.", instructors: "Only your instructors can see this page. Classmates see your name and photo." };
  function ProfilePage(p) {
    var u = p.user || {}, own = !!p.own, certs = p.certificates || [], projects = p.projects || [], done = p.finished || [], going = own ? p.inProgress || [] : [];
    var tracks = [];
    done.forEach(function (c) { if (c.track && tracks.indexOf(c.track) < 0) tracks.push(c.track); });
    var stats = [{ label: done.length === 1 ? "Course finished" : "Courses finished", value: done.length }, { label: certs.length === 1 ? "Certificate" : "Certificates", value: certs.length },
      { label: projects.length === 1 ? "Project built" : "Projects built", value: projects.length }];
    var courseRows = going.map(function (c, i) {
      return h(ListRow, { key: "g" + i, href: c.href, title: c.title, meta: [trackName(c.track), c.progressText].filter(Boolean).join(" \u00b7 "),
        leading: h(ProgressRing, { value: c.progress || 0, size: 40, label: c.title + ", " + Math.round(c.progress || 0) + "% done" }) });
    }).concat(done.map(function (c, i) {
      var d = c.finishedAt ? toDate(c.finishedAt) : null;
      return h(ListRow, { key: "d" + i, href: c.href, title: c.title, meta: [trackName(c.track), d ? "finished " + fullDate(d) : null].filter(Boolean).join(" \u00b7 "),
        leading: h("span", { className: "ot-profcourse__done", style: trackStyle(c.track), "aria-hidden": true }, h(Icon, { name: "done", size: 20 })) });
    }));
    return h("div", { className: cx("ot-profile", p.className) },
      h(ProfileHeader, { user: u, own: own, editHref: p.editHref, onEdit: p.onEdit, stats: stats, tracks: tracks }),
      own && VISIBILITY[p.visibility] ? h("p", { className: "ot-profile__seen" }, h(Icon, { name: "lock", size: 16 }), h("span", null, VISIBILITY[p.visibility], " "),
        p.settingsHref ? h("a", { className: "ot-linkbtn ot-linkbtn--sm", href: p.settingsHref }, "Change who can see it") : null) : null,
      h(PageSection, { title: own ? "Projects you've built" : "Projects built", count: projects.length || undefined }, h(ProjectGallery, { items: projects, own: own })),
      h(PageSection, { title: "Certificates", count: certs.length || undefined, action: own && p.certificatesHref && certs.length ? h(Button, { variant: "text", size: "sm", href: p.certificatesHref, iconAfter: "arrow-right" }, "See all") : null },
        certs.length ? h("ul", { className: "ot-profcerts", role: "list" }, certs.map(function (c, i) {
          var d = c.issuedAt ? toDate(c.issuedAt) : null;
          var inner = [h(CertThumb, { key: "t", name: u.name, course: c.course }), h("span", { key: "i", className: "ot-profcerts__icon", "aria-hidden": true }, h(Icon, { name: "certificate", size: 22 })),
            h("span", { key: "x", className: "ot-profcerts__text" }, h("span", { className: "ot-profcerts__course" }, c.course), d ? h("span", { className: "ot-profcerts__date" }, fullDate(d)) : null)];
          return h("li", { key: c.id || i }, c.href ? h("a", { className: "ot-profcerts__card", href: c.href }, inner) : h("div", { className: "ot-profcerts__card" }, inner));
        })) : h(EmptyState, { icon: "certificate", compact: true, title: own ? "No certificates yet" : "None yet" }, own ? "Finish a course and its certificate shows up here." : null)),
      courseRows.length ? h(PageSection, { title: own ? "Your courses" : "Courses finished" }, h("div", { className: "ot-profcourses" }, courseRows)) : null);
  }

  // ---- settings: the sections down the side (a list you open on phones), and the one you're in ----
  function SettingsLayout(p) {
    var secs = p.sections || [], id = uid("set"), st = useState(p.defaultSection || null), chosen = p.active !== undefined ? p.active : st[0];
    var view = useState(p.defaultSection || p.active ? "section" : "list");
    var cur = secs.filter(function (s) { return s.id === chosen; })[0] || secs[0];
    useFocusTitle(view[0] + (cur ? cur.id : ""), id + "h");
    function select(s, e) {
      if (!s.href && e) e.preventDefault();
      if (p.active === undefined) st[1](s.id);
      view[1]("section");
      if (p.onSelect) p.onSelect(s.id, e);
    }
    return h("div", { className: cx("ot-settings", "ot-settings--" + view[0], p.className) },
      h("nav", { className: "ot-settings__nav", "aria-label": p.title || "Settings" },
        h("h1", { className: "ot-settings__title" }, p.title || "Settings"),
        h("ul", { className: "ot-settings__list", role: "list" }, secs.map(function (s) {
          var on = cur && s.id === cur.id;
          return h("li", { key: s.id },
            h("a", { className: cx("ot-settings__link", on && "is-current"), href: s.href || "#" + s.id, "aria-current": on ? "page" : undefined, onClick: function (e) { select(s, e); } },
              h("span", { className: "ot-settings__icon", "aria-hidden": true }, h(Icon, { name: s.icon || "settings", size: 20 })),
              h("span", { className: "ot-settings__linktext" }, h("span", { className: "ot-settings__linklabel" }, s.label), s.summary ? h("span", { className: "ot-settings__linkdesc" }, s.summary) : null),
              h(Icon, { name: "chevron-right", size: 18, className: "ot-settings__chev" })));
        })),
        p.onSignOut ? h(Button, { variant: "text", icon: "sign-out", className: "ot-settings__signout", onClick: p.onSignOut }, "Sign out") : null),
      h("section", { className: "ot-settings__body", "aria-labelledby": id + "h" },
        h(Button, { variant: "text", size: "sm", icon: "arrow-left", className: "ot-settings__back", onClick: function () { view[1]("list"); } }, p.title || "Settings"),
        h("h2", { className: "ot-settings__heading", id: id + "h", tabIndex: -1 }, cur ? cur.label : ""),
        cur && cur.description ? h("p", { className: "ot-settings__lead" }, cur.description) : null,
        cur && cur.content !== undefined ? cur.content : p.children));
  }

  // ---- settings: photo, name, a line about you, and who can see your profile ----
  function ProfileSettings(p) {
    var u = p.user || {}, id = uid("pf");
    var start = useState(function () { return { name: u.name || "", bio: u.bio || "", visibility: p.visibility || "batch", photo: u.image ? { src: u.image } : null }; });
    var base = start[0], f = useState(base), form = f[0], errs = useState({}), busy = useState(false), fail = useState(null), saved = useSaved();
    var dirty = form.name !== base.name || form.bio !== base.bio || form.visibility !== base.visibility || form.photo !== base.photo;
    // previews of picked photos are let go when the form closes
    var made = useRef([]);
    useEffect(function () { return function () { made.current.forEach(function (u) { if (URL.revokeObjectURL) URL.revokeObjectURL(u); }); }; }, []);
    function set(k, v) { var n = Object.assign({}, form); n[k] = v; f[1](n); fail[1](null); if (errs[0][k]) errs[1]({}); }
    function save(e) {
      e.preventDefault();
      if (busy[0]) return;
      var name = form.name.trim().replace(/\s+/g, " ");
      if (name.length < 2) { errs[1]({ name: "Type your name as it should appear on your certificates." }); focusId(id + "n"); return; }
      if (!dirty) { saved[1](); return; }
      busy[1](true); fail[1](null);
      var next = Object.assign({}, form, { name: name, bio: form.bio.trim() });
      Promise.resolve(p.onSave ? p.onSave({ name: next.name, bio: next.bio, visibility: next.visibility, photo: next.photo && next.photo.file || null, removePhoto: !next.photo && !!base.photo }) : null).then(function (res) {
        busy[1](false);
        if (res && res.error) { fail[1](res.error.message || "That didn't save. Try again."); return; }
        start[1](next); f[1](next); saved[1]();
      }, function () { busy[1](false); fail[1]("That didn't save. Check your connection and try again."); });
    }
    var left = 300 - form.bio.length;
    return h("form", { method: "post", className: cx("ot-setform", p.className), onSubmit: save, noValidate: true },
      h(PhotoField, { label: "Photo", name: form.name || u.name, src: form.photo && form.photo.src, onChange: function (v) { if (v && v.file) made.current.push(v.src); set("photo", v); } }),
      h(TextField, { id: id + "n", label: "Your full name", maxLength: 140, autoComplete: "name", value: form.name, error: errs[0].name,
        hint: errs[0].name ? null : "New certificates use this name. To fix one you already have, message us.", onChange: function (e) { set("name", e.target.value); } }),
      h(TextField, { label: "About you", optional: true, multiline: true, rows: 3, maxLength: 300, value: form.bio,
        hint: (left < 60 ? plural(left, "character") + " left. " : "") + "What you like building, or what you'd like to learn next.", onChange: function (e) { set("bio", e.target.value); } }),
      h("fieldset", { className: "ot-setform__group" },
        h("legend", { className: "ot-field__label" }, "Who can see your profile"),
        h(Radio, { name: id + "v", value: "batch", checked: form.visibility === "batch", onChange: function () { set("visibility", "batch"); },
          label: "My batch and instructors", hint: "Classmates see your projects and certificates, as well as your name and photo." }),
        h(Radio, { name: id + "v", value: "instructors", checked: form.visibility === "instructors", onChange: function () { set("visibility", "instructors"); },
          label: "Only my instructors", hint: "Classmates see just your name and photo, in class lists." })),
      u.email ? h("div", { className: "ot-setform__fixed" }, h("p", { className: "ot-field__label" }, "Email"), h("p", { className: "ot-setform__value" }, u.email),
        h("p", { className: "ot-field__hint" }, "You sign in with this. To change it, message us.")) : null,
      fail[0] ? authAlert("fail", "danger", "That didn't save", fail[0]) : null,
      h("div", { className: cx("ot-setform__actions", dirty && "is-dirty") },
        h(Button, { type: "submit", loading: busy[0] }, "Save changes"),
        dirty ? h(Button, { variant: "text", className: "ot-quiet", onClick: function () { f[1](base); errs[1]({}); fail[1](null); } }, "Discard changes") : null,
        dirty ? h("span", { className: "ot-setform__unsaved" }, "Unsaved changes") : savedNote(saved[0])));
  }

  // ---- settings: which notifications come, on the phone and by email ----
  var NOTIFY_SETTINGS = [
    { id: "live", icon: "live", label: "Live classes", hint: "The day before, and when one's about to start" },
    { id: "marked", icon: "assignment", label: "Marked work", hint: "When an assignment or quiz has been marked" },
    { id: "lessons", icon: "reading", label: "New lessons", hint: "When a lesson opens in one of your courses" },
    { id: "certificates", icon: "certificate", label: "Certificates", hint: "When a certificate is ready" },
    { id: "announcements", icon: "discussion", label: "Announcements", hint: "From your batch and your instructors" }];
  function NotificationSettings(p) {
    var kinds = p.kinds || NOTIFY_SETTINGS, perm = useState(p.push || "unsupported"), push = perm[0], hasPush = push !== "unsupported";
    var vals = useState(function () {
      var v = {};
      kinds.forEach(function (k) { var x = (p.values || {})[k.id] || {}; v[k.id] = { push: x.push !== false, email: x.email !== false }; });
      return v;
    });
    var fail = useState(null), saved = useSaved(), asking = useState(false);
    function flip(k, ch) {
      var was = vals[0][k.id][ch], next = Object.assign({}, vals[0]);
      next[k.id] = Object.assign({}, next[k.id]); next[k.id][ch] = !was;
      vals[1](next); fail[1](null);
      Promise.resolve(p.onChange ? p.onChange({ kind: k.id, channel: ch, value: !was }) : null).then(function (res) {
        if (res && res.error) throw res.error;
        saved[1]();
      }).catch(function () {
        // put it back as it was, and say so
        vals[1](function (cur) { var c = Object.assign({}, cur); c[k.id] = Object.assign({}, c[k.id]); c[k.id][ch] = was; return c; });
        fail[1](k.label);
      });
    }
    function enable() {
      asking[1](true);
      Promise.resolve(p.onEnablePush ? p.onEnablePush() : "granted").then(function (r) { asking[1](false); perm[1](r === "granted" ? "granted" : "denied"); },
        function () { asking[1](false); perm[1]("denied"); });
    }
    function sw(k, ch, label, off) {
      var on = !off && vals[0][k.id][ch];
      return h("button", { type: "button", role: "switch", className: "ot-switch", "aria-checked": on, "aria-label": k.label + " " + label, disabled: off, onClick: function () { flip(k, ch); } }, h("span", { className: "ot-switch__thumb" }));
    }
    var pushOff = push === "denied" || push === "prompt";
    return h("div", { className: cx("ot-notifset", !hasPush && "ot-notifset--email", p.className) },
      push === "prompt" ? authAlert("ask", "info", "Get these on your phone", "Turn on notifications and they'll come as alerts, not just emails.",
          h(Button, { size: "sm", icon: "bell", loading: asking[0], onClick: enable }, "Turn on"))
        : push === "denied" ? authAlert("off", "warning", "Notifications are off on this phone", "Turn them on in your phone's Settings, under OrbiTutor, then Notifications. Until then, only emails come.")
        : !hasPush && p.appHref !== false ? h("p", { className: "ot-notifset__note" }, h(Icon, { name: "bell", size: 16 }), h("span", null, "With the OrbiTutor phone app, these can come as notifications too.")) : null,
      fail[0] ? authAlert("fail", "danger", "That didn't save", "We couldn't change " + fail[0].toLowerCase() + ". It's back as it was. Try again in a moment.") : null,
      h("table", { className: "ot-notifset__table" },
        h("caption", { className: "ot-visually-hidden" }, "Which notifications you get"),
        h("thead", null, h("tr", null,
          h("th", { scope: "col" }, h("span", { className: "ot-visually-hidden" }, "Notification")),
          hasPush ? h("th", { scope: "col", className: "ot-notifset__col" }, "Phone") : null,
          h("th", { scope: "col", className: "ot-notifset__col" }, "Email"))),
        h("tbody", null, kinds.map(function (k) {
          return h("tr", { key: k.id },
            h("th", { scope: "row" },
              h("span", { className: "ot-notifset__kind" },
                h("span", { className: "ot-notifset__icon", "aria-hidden": true }, h(Icon, { name: k.icon, size: 20 })),
                h("span", null, h("span", { className: "ot-notifset__label" }, k.label), k.hint ? h("span", { className: "ot-notifset__hint" }, k.hint) : null))),
            hasPush ? h("td", { className: "ot-notifset__col" }, sw(k, "push", "on your phone", pushOff)) : null,
            h("td", { className: "ot-notifset__col" }, sw(k, "email", "by email")));
        }))),
      h("div", { className: "ot-notifset__foot" },
        h("p", { className: "ot-notifset__note" }, h(Icon, { name: "info", size: 16 }), h("span", null, "Emails about your account, like a password reset, always come.")),
        savedNote(saved[0])));
  }

  // ---- settings: night or day, and a lighter look for older phones ----
  var THEME_CHOICES = [
    { id: "night", label: "Night", hint: "The night sky, easy on the eyes after dark." },
    { id: "day", label: "Day", hint: "Light and bright, for daytime and sunny rooms." },
    { id: "system", label: "Match my device", hint: "Follows your phone or computer: night when it's dark mode." }];
  function AppearanceSettings(p) {
    var id = uid("ap"), th = useState(p.theme || "night"), lite = useState(p.lite || "auto"), saved = useSaved();
    function pickTheme(v) { th[1](v); if (p.onTheme) p.onTheme(v); saved[1](); }
    function pickLite(v) { lite[1](v); if (p.onLite) p.onLite(v); saved[1](); }
    return h("div", { className: cx("ot-appear", p.className) },
      h("fieldset", { className: "ot-appear__group" },
        h("legend", { className: "ot-appear__legend" }, "Theme"),
        h("div", { className: "ot-themepick" }, THEME_CHOICES.map(function (t) {
          var on = th[0] === t.id;
          return h("label", { key: t.id, className: cx("ot-themepick__opt", on && "is-on") },
            h("input", { type: "radio", name: id + "t", value: t.id, checked: on, className: "ot-themepick__input", onChange: function () { pickTheme(t.id); } }),
            h("span", { className: "ot-themepick__swatch ot-themepick__swatch--" + t.id, "aria-hidden": true },
              h("span", { className: "ot-themepick__card" }, h("span", { className: "ot-themepick__bar" }), h("span", { className: "ot-themepick__line" }), h("span", { className: "ot-themepick__line ot-themepick__line--short" }))),
            h("span", { className: "ot-themepick__text" },
              h("span", { className: "ot-themepick__label" }, t.label, on ? h(Icon, { name: "done", size: 16, className: "ot-themepick__tick" }) : null),
              h("span", { className: "ot-themepick__hint" }, t.hint)));
        })),
        h("p", { className: "ot-appear__note" }, "Follows you to every device you sign in on.")),
      h("fieldset", { className: "ot-appear__group" },
        h("legend", { className: "ot-appear__legend" }, "Lighter look"),
        h("p", { className: "ot-appear__lead" }, "No frosted glass or moving decorations. Smoother on older phones, and kinder to the battery."),
        h("div", { className: "ot-appear__choices" },
          h(Radio, { name: id + "l", value: "auto", checked: lite[0] === "auto", onChange: function () { pickLite("auto"); }, label: "Automatic",
            hint: p.liteDetected ? "This device gets the lighter look." : "This device gets the full look. Older phones and data saver get the lighter one." }),
          h(Radio, { name: id + "l", value: "on", checked: lite[0] === "on", onChange: function () { pickLite("on"); }, label: "Always lighter" }),
          h(Radio, { name: id + "l", value: "off", checked: lite[0] === "off", onChange: function () { pickLite("off"); }, label: "Always the full look" })),
        h("p", { className: "ot-appear__note" }, "Only for this device.")),
      savedNote(saved[0]));
  }

  // ---- settings: how you sign in, your password, and where you're signed in ----
  var DEVICE_ICON = { phone: "phone", tablet: "phone", computer: "laptop" }, DEVICE_NAME = { phone: "A phone", tablet: "A tablet", computer: "A computer" };
  function SecuritySettings(p) {
    var id = uid("sec"), method = p.method || "password", usePw = method !== "sso", useSso = method !== "password", now = useNow(p.now, 60000);
    var open = useState(!!p.defaultChangeOpen), cur = useState(""), pw = useState(""), others = useState(true), errs = useState({}), busy = useState(null), ok = useState(null), oops = useState(null);
    var list = useState(p.sessions || []), sessions = list[0], ask = useState(false);
    var min = p.minScore == null ? 2 : p.minScore, elsewhere = sessions.filter(function (s) { return !s.current; });
    function resetForm() { cur[1](""); pw[1](""); errs[1]({}); oops[1](null); }
    function change(e) {
      e.preventDefault();
      if (busy[0]) return;
      var str = passwordStrength(pw[0], [p.name, p.email]), er = {};
      if (!cur[0]) er.cur = "Type your current password.";
      if (!pw[0]) er.pw = "Type a new password.";
      else if (str.score < min) er.pw = "Choose a harder one to guess. " + (str.tip || "");
      else if (pw[0] === cur[0]) er.pw = "That's the password you have now. Choose a new one.";
      errs[1](er);
      if (er.cur || er.pw) { focusId(er.cur ? id + "c" : id + "p"); return; }
      busy[1]("pw"); oops[1](null);
      Promise.resolve(p.onChangePassword ? p.onChangePassword({ current: cur[0], password: pw[0], signOutOthers: others[0] }) : null).then(function (res) {
        busy[1](null);
        var x = res && res.error;
        if (!x) {
          open[1](false); resetForm();
          if (others[0]) list[1](function (l) { return l.filter(function (s) { return s.current; }); });
          ok[1](others[0] ? "Password changed. You're signed out everywhere else." : "Password changed.");
          return;
        }
        if (x.kind === "wrong") { errs[1]({ cur: "That's not your current password." }); cur[1](""); focusId(id + "c"); }
        else if (x.kind === "weak") { errs[1]({ pw: x.message || "Choose a harder one to guess." }); focusId(id + "p"); }
        else if (x.kind === "rate") oops[1]("Too many tries. Wait a few minutes, then try again.");
        else oops[1](x.message || "That didn't work. Check your connection and try again.");
      }, function () { busy[1](null); oops[1]("That didn't work. Check your connection and try again."); });
    }
    function signOutOthers() {
      busy[1]("out");
      Promise.resolve(p.onSignOutOthers ? p.onSignOutOthers() : null).then(function (res) {
        busy[1](null); ask[1](false);
        if (res && res.error) { oops[1]("We couldn't sign the other devices out. Try again in a moment."); return; }
        var n = elsewhere.length;
        list[1](sessions.filter(function (s) { return s.current; }));
        ok[1]("Signed out on " + plural(n, "other device") + ".");
      }, function () { busy[1](null); ask[1](false); oops[1]("We couldn't sign the other devices out. Try again in a moment."); });
    }
    var how = [];
    if (useSso) how.push(h("div", { key: "sso", className: "ot-secset__row" },
      h("span", { className: "ot-secset__icon ot-secset__icon--brand", "aria-hidden": true }, h(BrandMark, { size: 26 })),
      h("span", { className: "ot-secset__text" }, h("span", { className: "ot-secset__label" }, "OrbitCore account"), h("span", { className: "ot-secset__meta" }, "Its password and security are managed on the OrbitCore account page.")),
      p.ssoManageHref ? h(Button, { variant: "secondary", size: "sm", href: p.ssoManageHref, target: "_blank", iconAfter: "external" }, "Manage", h("span", { className: "ot-visually-hidden" }, " your OrbitCore account")) : null));
    if (usePw) how.push(h("div", { key: "pw", className: "ot-secset__row" },
      h("span", { className: "ot-secset__icon", "aria-hidden": true }, h(Icon, { name: "key", size: 22 })),
      h("span", { className: "ot-secset__text" }, h("span", { className: "ot-secset__label" }, "Password"), h("span", { className: "ot-secset__meta" }, p.passwordChangedAt ? "Last changed " + agoText(toDate(p.passwordChangedAt), now) : "For signing in with your email")),
      open[0] ? null : h(Button, { variant: "secondary", size: "sm", onClick: function () { open[1](true); ok[1](null); focusId(id + "c"); } }, "Change password")));
    var form = usePw && open[0] ? h("form", { method: "post", className: "ot-secset__form", onSubmit: change, noValidate: true, "aria-labelledby": id + "fh" },
      h("h4", { className: "ot-visually-hidden", id: id + "fh" }, "Change password"),
      h("input", { type: "email", name: "username", autoComplete: "username", value: p.email || "", readOnly: true, hidden: true }),
      h(PasswordField, { id: id + "c", label: "Current password", autoComplete: "current-password", value: cur[0], error: errs[0].cur, onChange: function (e) { cur[1](e.target.value); if (errs[0].cur) errs[1](Object.assign({}, errs[0], { cur: null })); } }),
      h(PasswordField, { id: id + "p", label: "New password", autoComplete: "new-password", value: pw[0], strength: true, minScore: min, userInputs: [p.name, p.email], error: errs[0].pw,
        onChange: function (e) { pw[1](e.target.value); if (errs[0].pw) errs[1](Object.assign({}, errs[0], { pw: null })); } }),
      h(Checkbox, { checked: others[0], onChange: function (e) { others[1](e.target.checked); }, label: "Sign me out on my other devices", hint: "Do this if you think someone else knows your old password." }),
      oops[0] ? authAlert("oops", "danger", "That didn't work", oops[0]) : null,
      h("div", { className: "ot-auth__actions" },
        h(Button, { type: "submit", loading: busy[0] === "pw" }, "Change password"),
        h(Button, { variant: "text", className: "ot-quiet", onClick: function () { open[1](false); resetForm(); } }, "Cancel"))) : null;
    return h("div", { className: cx("ot-secset", p.className) },
      ok[0] ? authAlert("ok", "success", ok[0], null) : null,
      h("section", { className: "ot-secset__group", "aria-labelledby": id + "a" },
        h("h3", { className: "ot-secset__heading", id: id + "a" }, "How you sign in"),
        h("div", { className: "ot-secset__box" }, how, form)),
      h("section", { className: "ot-secset__group", "aria-labelledby": id + "b" },
        h("h3", { className: "ot-secset__heading", id: id + "b" }, "Where you're signed in"),
        h("ul", { className: "ot-secset__box ot-secset__devices", role: "list" }, sessions.map(function (s, i) {
          var last = s.lastActive ? toDate(s.lastActive) : null, since = s.signedInAt ? toDate(s.signedInAt) : null;
          return h("li", { key: s.id || i, className: "ot-secset__row" },
            h("span", { className: "ot-secset__icon", "aria-hidden": true }, h(Icon, { name: DEVICE_ICON[s.kind] || "laptop", size: 22 })),
            h("span", { className: "ot-secset__text" },
              h("span", { className: "ot-secset__label" }, s.label || DEVICE_NAME[s.kind] || "A device", s.current ? h(Badge, { tone: "success", className: "ot-secset__here" }, "This device") : null),
              h("span", { className: "ot-secset__meta" }, [s.current ? "Active now" : last ? "Last active " + agoText(last, now) : null, s.place, since ? "signed in " + fullDate(since) : null].filter(Boolean).join(" \u00b7 "))));
        })),
        elsewhere.length ? h("div", { className: "ot-secset__out" },
            h(Button, { variant: "danger", icon: "sign-out", onClick: function () { ask[1](true); ok[1](null); } }, "Sign out everywhere else"),
            h("p", { className: "ot-secset__note" }, "If you see a device you don't know, sign out everywhere else and change your password."))
          : h("p", { className: "ot-secset__note" }, "You're only signed in here.")),
      oops[0] && !open[0] ? authAlert("oops", "danger", "That didn't work", oops[0]) : null,
      h(Dialog, { open: ask[0], onClose: function () { ask[1](false); }, tone: "danger", title: "Sign out on " + plural(elsewhere.length, "other device") + "?", inline: p.inlineDialog,
        actions: [h(Button, { key: "c", variant: "secondary", onClick: function () { ask[1](false); } }, "Cancel"),
          h(Button, { key: "o", variant: "danger", loading: busy[0] === "out", onClick: signOutOthers }, "Sign them out")] },
        h("p", null, "You'll stay signed in here. On the others, you'll need to sign in again.")));
  }


  // ---- When things go wrong: full pages, each with a clear way back ----
  // a small scene for each problem: the planet and its orbit, and what's gone wrong with them
  var PART_STARS = [[22, 30, 1.4], [70, 178, 1.1], [292, 24, 1.7], [304, 150, 1.2], [238, 186, 1], [118, 14, 1.1], [12, 112, 1]];
  var PART_MOONS = {
    locked: [["physics", 206], ["code", 330], ["making", 52], ["competitions", 130]],
    broken: [["physics", 214], ["making", 40], ["competitions", 140]],
    maintenance: [["code", 320], ["making", 62]],
    offline: [["physics", 206], ["code", 330], ["making", 52], ["competitions", 130]],
    lost: [["code", 320], ["competitions", 136]],
  };
  function gearPath(cx0, cy0, r, teeth) {
    var d = "", n = teeth * 2;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r;
      var p0 = [cx0 + rr * Math.cos(a0), cy0 + rr * Math.sin(a0)], p1 = [cx0 + rr * Math.cos(a1), cy0 + rr * Math.sin(a1)];
      d += (i ? "L" : "M") + p0[0].toFixed(1) + " " + p0[1].toFixed(1) + "L" + p1[0].toFixed(1) + " " + p1[1].toFixed(1);
    }
    return d + "Z";
  }
  function probe(x, y, rot, broken) {
    return h("g", { className: "ot-part__probe", transform: "translate(" + x + " " + y + ") rotate(" + rot + ")" },
      h("rect", { className: "ot-part__panel", x: -31, y: -6, width: 19, height: 12, rx: 1.5, transform: broken ? "translate(-9 12) rotate(-38 -21 0)" : undefined }),
      h("line", { className: "ot-part__strut", x1: -12, y1: 0, x2: -7, y2: 0 }),
      h("rect", { className: "ot-part__panel", x: 12, y: -6, width: 19, height: 12, rx: 1.5 }),
      h("line", { className: "ot-part__strut", x1: 7, y1: 0, x2: 12, y2: 0 }),
      h("rect", { className: "ot-part__body", x: -7, y: -8, width: 14, height: 16, rx: 3 }),
      h("line", { className: "ot-part__strut", x1: 0, y1: -8, x2: 0, y2: -16 }),
      h("circle", { className: "ot-part__tip", cx: 0, cy: -17.5, r: 2.4 }));
  }
  function ProblemArt(p) {
    var kind = PART_MOONS[p.kind] ? p.kind : "lost", id = uid("pa"), CX = 160, CY = 112, RX = 132, RY = 34, TILT = -14;
    function f(n) { return n.toFixed(1); }
    var L = artOrbitPoint(CX, CY, RX, RY, TILT, 180), R = artOrbitPoint(CX, CY, RX, RY, TILT, 0);
    function moon(m) {
      var pt = artOrbitPoint(CX, CY, RX, RY, TILT, m[1]);
      return h("g", { key: m[0], className: "ot-part__moon ot-part__moon--" + m[0], transform: "translate(" + f(pt[0]) + " " + f(pt[1]) + ")" },
        h("circle", { className: "ot-part__halo", r: 11 }), h("circle", { r: 5.5 }));
    }
    var moons = PART_MOONS[kind];
    var far = moons.filter(function (m) { return Math.sin(m[1] * Math.PI / 180) < 0; }).map(moon);
    var near = moons.filter(function (m) { return Math.sin(m[1] * Math.PI / 180) >= 0; }).map(moon);
    var extra = null;
    if (kind === "lost") {
      // a probe that's left its orbit, its trail curling away off the path
      var o = artOrbitPoint(CX, CY, RX, RY, TILT, 335);
      extra = h("g", null,
        h("path", { className: "ot-part__trail", d: "M " + f(o[0]) + " " + f(o[1]) + " C 300 92, 300 58, 262 46" }),
        probe(250, 40, -24));
    } else if (kind === "locked") {
      extra = h("g", { className: "ot-part__badge", transform: "translate(206 150)" },
        h("circle", { r: 22 }),
        h("path", { className: "ot-part__shackle", d: "M -6.5 -2 V -7 a 6.5 6.5 0 0 1 13 0 V -2" }),
        h("rect", { className: "ot-part__lockbody", x: -10, y: -3, width: 20, height: 15, rx: 3 }),
        h("circle", { className: "ot-part__keyhole", cx: 0, cy: 3.5, r: 2.2 }));
    } else if (kind === "broken") {
      extra = h("g", null,
        probe(78, 62, 16, true),
        h("g", { className: "ot-part__sparks" },
          h("line", { x1: 92, y1: 40, x2: 98, y2: 32 }), h("line", { x1: 100, y1: 50, x2: 110, y2: 47 }), h("line", { x1: 86, y1: 36, x2: 86, y2: 27 })));
    } else if (kind === "maintenance") {
      extra = h("g", null,
        h("g", { className: "ot-part__gear" }, h("path", { d: gearPath(204, 150, 22, 9) }), h("circle", { className: "ot-part__hub", cx: 204, cy: 150, r: 8 })),
        h("g", { className: "ot-part__gear ot-part__gear--small" }, h("path", { d: gearPath(236, 128, 13, 7) }), h("circle", { className: "ot-part__hub", cx: 236, cy: 128, r: 4.5 })));
    } else if (kind === "offline") {
      // a mast on the planet, its signal fading to nothing
      extra = h("g", null,
        h("line", { className: "ot-part__mast", x1: CX, y1: CY - 44, x2: CX, y2: CY - 68 }),
        h("circle", { className: "ot-part__tip", cx: CX, cy: CY - 70, r: 3.2 }),
        [10, 19, 28].map(function (r, i) {
          var a = 0.62, y0 = CY - 70;
          var left = "M " + f(CX - r * Math.sin(a)) + " " + f(y0 - r * Math.cos(a)) + " A " + r + " " + r + " 0 0 0 " + f(CX - r * Math.sin(a)) + " " + f(y0 + r * Math.cos(a));
          var right = "M " + f(CX + r * Math.sin(a)) + " " + f(y0 - r * Math.cos(a)) + " A " + r + " " + r + " 0 0 1 " + f(CX + r * Math.sin(a)) + " " + f(y0 + r * Math.cos(a));
          return h("path", { key: r, className: "ot-part__wave ot-part__wave--" + i, d: left + " " + right });
        }));
    }
    return h("svg", { className: cx("ot-part", "ot-part--" + kind, p.className), viewBox: "0 0 320 200", "aria-hidden": true, focusable: "false" },
      h("defs", null,
        h("radialGradient", { id: id + "p", cx: "38%", cy: "34%", r: "70%" },
          h("stop", { offset: "0", stopColor: "#FFF6CF" }), h("stop", { offset: "0.45", stopColor: "#FFC93C" }), h("stop", { offset: "1", stopColor: "#E8590C" })),
        h("radialGradient", { id: id + "g" }, h("stop", { offset: "0", stopColor: "#FFC93C", stopOpacity: 0.26 }), h("stop", { offset: "1", stopColor: "#FFC93C", stopOpacity: 0 }))),
      PART_STARS.map(function (s, i) { return h("circle", { key: "s" + i, className: "ot-part__star", cx: s[0], cy: s[1], r: s[2] }); }),
      h("circle", { cx: CX, cy: CY, r: 84, fill: "url(#" + id + "g)" }),
      h("ellipse", { className: "ot-part__orbit", cx: CX, cy: CY, rx: RX, ry: RY, transform: "rotate(" + TILT + " " + CX + " " + CY + ")" }),
      far,
      h("g", { className: "ot-part__planet" },
        h("circle", { cx: CX, cy: CY, r: 44, fill: "url(#" + id + "p)" }),
        h("circle", { className: "ot-part__crater", cx: 177, cy: 96, r: 7 }),
        h("circle", { className: "ot-part__crater", cx: 144, cy: 130, r: 4.5 }),
        h("circle", { className: "ot-part__crater", cx: 186, cy: 128, r: 3 })),
      h("path", { className: "ot-part__orbit", d: "M " + f(L[0]) + " " + f(L[1]) + " A " + RX + " " + RY + " " + TILT + " 0 0 " + f(R[0]) + " " + f(R[1]) }),
      near, extra);
  }

  // ---- the page every problem uses: a picture, what happened, and the ways back ----
  function StatusPage(p) {
    var id = uid("sp");
    useEffect(function () {
      if (p.focusTitle === false) return;
      var el = document.getElementById(id + "h");
      if (el) try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }, []);
    var art = p.art === false ? null : h("div", { className: "ot-status__art" }, p.art && typeof p.art !== "string" ? p.art : h(ProblemArt, { kind: p.art }));
    var kids = [
      art ? h(React.Fragment, { key: "a" }, art) : null,
      h("div", { key: "h", className: "ot-status__head" },
        p.eyebrow ? h("p", { className: "ot-status__eyebrow" }, p.eyebrow) : null,
        h(p.titleAs || "h1", { className: "ot-status__title", id: id + "h", tabIndex: -1 }, p.title),
        p.children ? h("div", { className: "ot-status__text" }, p.children) : null,
        p.path ? h("p", { className: "ot-status__path" }, h("span", { className: "ot-visually-hidden" }, "The address: "), p.path) : null),
      // the ways back usually come after anything extra; when they're the main thing to do (offline), they come first
      p.actionsFirst && p.actions ? h("div", { key: "b", className: "ot-status__actions" }, p.actions) : null,
      p.extra ? h("div", { key: "x", className: "ot-status__extra" }, p.extra) : null,
      !p.actionsFirst && p.actions ? h("div", { key: "b", className: "ot-status__actions" }, p.actions) : null,
      p.note ? h("div", { key: "n", className: "ot-status__note", role: p.noteLive ? "status" : undefined }, p.note) : p.noteLive ? h("div", { key: "n", className: "ot-visually-hidden", role: "status" }) : null,
      p.help || p.code ? h("div", { key: "f", className: "ot-status__foot" },
        p.help ? h("p", { className: "ot-status__help" }, p.help) : null,
        p.code ? h("p", { className: "ot-status__code" }, p.code) : null) : null];
    if (p.standalone) return h(AuthFrame, { aside: false, homeHref: p.homeHref, helpHref: p.helpHref, helpLabel: p.helpLabel, termsHref: p.termsHref, privacyHref: p.privacyHref, className: cx("ot-status-frame", p.className), style: p.style },
      h("section", { className: "ot-status ot-status--card", "aria-labelledby": id + "h" }, kids));
    return h("section", { className: cx("ot-status", p.className), style: p.style, "aria-labelledby": id + "h" }, kids);
  }
  // "Message us" on WhatsApp, with the message started for them
  function helpLink(href, message, label) {
    if (!href) return null;
    var url = href, wa = /wa\.me|whatsapp/i.test(href);
    if (wa && message) try { var u = new URL(href); u.searchParams.set("text", message); url = u.toString(); } catch (e) { url = href; }
    return h("a", { className: "ot-linkbtn ot-linkbtn--sm ot-status__wa", href: url, target: wa ? "_blank" : undefined },
      h(Icon, { name: "discussion", size: 16 }), h("span", null, label || "Message us on WhatsApp"), wa ? h("span", { className: "ot-visually-hidden" }, " (opens WhatsApp)") : null);
  }
  function statusPass(p) { return { standalone: p.standalone, homeHref: p.homeHref, helpHref: p.helpHref, termsHref: p.termsHref, privacyHref: p.privacyHref, className: p.className, style: p.style, focusTitle: p.focusTitle, titleAs: p.titleAs }; }

  // ---- page not found ----
  var NOT_FOUND_WORDS = {
    page: ["We can't find that page", "The link may be old, or the address may have a typo."],
    course: ["We can't find that course", "It may have been renamed, or the link may be old. Every course is in the catalogue."],
    batch: ["We can't find that batch", "It may have ended, or the link may be old. Your own batch is always under Schedule."],
    profile: ["We can't find that profile", "The link may be old, or the student may have left."],
  };
  function NotFoundPage(p) {
    var what = NOT_FOUND_WORDS[p.what] ? p.what : "page", w = NOT_FOUND_WORDS[what], out = p.signedIn === false;
    var home = p.homeHref || "/", acts = [];
    if (out) {
      acts.push(h(Button, { key: "in", href: p.signInHref || "/login", icon: "key" }, "Sign in"));
      if (p.coursesHref) acts.push(h(Button, { key: "c", variant: "secondary", href: p.coursesHref }, "Browse courses"));
    } else {
      var first = what === "course" && p.coursesHref ? h(Button, { key: "c", href: p.coursesHref, icon: "courses" }, "Browse courses")
        : what === "batch" && p.myBatchHref ? h(Button, { key: "b", href: p.myBatchHref, icon: "schedule" }, "Go to my batch")
        : h(Button, { key: "h", href: home, icon: "home" }, "Go to Home");
      acts.push(first);
      if (first.key !== "h") acts.push(h(Button, { key: "h", variant: "secondary", href: home }, "Go to Home"));
      else if (p.onSearch) acts.push(h(Button, { key: "s", variant: "secondary", icon: "search", onClick: p.onSearch }, "Search courses and lessons"));
      else if (p.coursesHref) acts.push(h(Button, { key: "c", variant: "secondary", href: p.coursesHref }, "Browse courses"));
    }
    if (p.onBack) acts.push(h(Button, { key: "back", variant: "text", icon: "arrow-left", onClick: p.onBack }, "Go back"));
    return h(StatusPage, Object.assign(statusPass(p), { art: "lost", eyebrow: "Page not found", title: p.title || w[0], path: p.path, actions: acts }),
      h("p", null, p.text || w[1], out ? " Some pages only open once you're signed in." : null));
  }

  // ---- no access: not in this course or batch, signed out, or a staff page ----
  function NoAccessPage(p) {
    var reason = p.reason || "course", c = p.course || {}, title, text, eyebrow, acts = [], extra = null, help = null;
    var home = p.homeHref || "/", join = p.join;
    function askPanel(courseName) {
      if (!join) return null;
      return h(AskToJoin, Object.assign({ course: courseName }, join));
    }
    if (reason === "signedOut") {
      eyebrow = "Signed out"; title = p.title || "Sign in to see this";
      text = "This page is for OrbiTutor students. Sign in and you'll come straight back here.";
      acts.push(h(Button, { key: "in", href: p.signInHref || "/login", icon: "key" }, "Sign in"));
      if (p.coursesHref) acts.push(h(Button, { key: "c", variant: "secondary", href: p.coursesHref }, "Browse courses"));
      help = p.coursesHref ? "New to OrbiTutor? Browse the courses and ask to join one." : null;
    } else if (reason === "staff") {
      eyebrow = "No access"; title = p.title || "This page is for instructors";
      text = "It's one of the staff tools. If you think you should be able to see it, message us.";
      acts.push(h(Button, { key: "h", href: home, icon: "home" }, "Go to Home"));
      help = helpLink(p.helpHref, "Hi, I can't open a page in OrbiTutor" + (p.path ? ": " + p.path : "") + ".");
    } else if (reason === "batch") {
      var batch = p.batch || {};
      eyebrow = "Not in this batch"; title = p.title || (batch.title ? "This page is for the " + batch.title + " batch" : "This page is for another batch");
      text = "Only students in this batch can see its classes and announcements.";
      if (p.myBatchHref) {
        text += " Yours are on your own batch page.";
        acts.push(h(Button, { key: "b", href: p.myBatchHref, icon: "schedule" }, "Go to my batch"));
        acts.push(h(Button, { key: "h", variant: "secondary", href: home }, "Go to Home"));
      } else {
        extra = askPanel(batch.course || c.title);
        acts.push(h(Button, { key: "h", variant: extra ? "text" : "primary", href: home, icon: extra ? undefined : "home" }, "Go to Home"));
      }
    } else {
      eyebrow = "Not enrolled yet"; title = p.title || "You're not in this course yet";
      text = (c.title ? c.title + "'s" : "Its") + " lessons open once you're in one of its batches. You can still see what's in it.";
      extra = h(React.Fragment, null,
        c.title ? h("div", { className: "ot-status__course", style: trackStyle(c.track) },
          c.cover ? h("img", { className: "ot-status__cover", src: c.cover, alt: "", loading: "lazy", decoding: "async" }) : h("span", { className: "ot-status__cover ot-status__cover--none", "aria-hidden": true }, h(Icon, { name: "courses", size: 26 })),
          h("span", { className: "ot-status__coursetext" },
            c.track && TRACK_NAMES[c.track] ? h("span", { className: "ot-status__track" }, trackName(c.track)) : null,
            h("span", { className: "ot-status__coursetitle" }, c.title),
            c.tagline ? h("span", { className: "ot-status__tagline" }, c.tagline) : null)) : null,
        askPanel(c.title));
      if (c.href) acts.push(h(Button, { key: "c", variant: "secondary", href: c.href, iconAfter: "arrow-right" }, "See what's in the course"));
      acts.push(h(Button, { key: "h", variant: "text", href: home }, "Go to Home"));
    }
    return h(StatusPage, Object.assign(statusPass(p), { art: "locked", eyebrow: eyebrow, title: title, extra: extra, actions: acts, help: help }), h("p", null, p.text || text));
  }

  // ---- something went wrong, with Try again; after two misses, a way to tell us ----
  var ERROR_WORDS = {
    server: ["That didn't load", "Something went wrong on our side, not yours. Try again in a moment."],
    busy: ["OrbiTutor is busy right now", "Too many requests came in at once. Wait a minute, then try again."],
    crash: ["This page stopped working", "Something on this page broke. Try again, or go back to Home."],
  };
  function ErrorPage(p) {
    var kind = ERROR_WORDS[p.kind] ? p.kind : "server", w = ERROR_WORDS[kind];
    var st = useState(0), fails = p.failures != null ? p.failures : st[0], busy = useState(false), at = useState(function () { return p.at ? toDate(p.at) : new Date(); })[0];
    var cd = useCountdown(), left = cd[0];
    useEffect(function () { if (p.retryAfter) cd[1](p.retryAfter); }, [p.retryAfter]);
    var alive = useRef(true);
    useEffect(function () { return function () { alive.current = false; }; }, []);
    function retry() {
      if (busy[0] || !p.onRetry) return;
      busy[1](true);
      Promise.resolve(p.onRetry()).then(function (r) {
        if (!alive.current) return;
        busy[1](false);
        if (r === false) { st[1](function (n) { return n + 1; }); if (kind === "busy" && p.retryAfter) cd[1](p.retryAfter); }
      }, function () { if (!alive.current) return; busy[1](false); st[1](function (n) { return n + 1; }); });
    }
    var still = fails >= 2;
    var code = [p.code ? "Code " + p.code : null, dayMonth(at) + ", " + timeText(at)].filter(Boolean).join(" \u00b7 ");
    var acts = [];
    if (p.onRetry) acts.push(h(Button, { key: "r", icon: "retry", loading: busy[0], disabled: left > 0, onClick: retry }, left > 0 ? "Try again in " + left + "s" : "Try again"));
    if (kind === "crash" && fails >= 1) acts.push(h(Button, { key: "re", variant: "secondary", onClick: p.onReload || function () { window.location.reload(); } }, "Reload OrbiTutor"));
    acts.push(h(Button, { key: "h", variant: p.onRetry ? "text" : "primary", href: p.homeHref || "/", icon: p.onRetry ? undefined : "home" }, "Go to Home"));
    var note = fails === 1 && !still ? "Still not working. Give it another moment." : null;
    return h(StatusPage, Object.assign(statusPass(p), {
      art: "broken", eyebrow: "Something went wrong", title: still ? "It's still not working" : p.title || w[0], actions: acts, note: note, noteLive: true,
      help: still || p.showHelp ? helpLink(p.helpHref, "Hi, OrbiTutor isn't working for me. " + code + (p.path ? " \u00b7 " + p.path : "")) : null,
      code: p.code || still ? code : null }),
      h("p", null, still ? "If you need it now, message us on WhatsApp. The message already includes the code below, so we can find what happened." : p.text || w[1]));
  }

  // ---- catch a page that breaks while drawing, and show ErrorPage instead of a blank screen ----
  function ErrorBoundary(props) { React.Component.call(this, props); this.state = { error: null, tries: 0 }; this.reset = this.reset.bind(this); }
  ErrorBoundary.prototype = Object.create(React.Component.prototype);
  ErrorBoundary.prototype.constructor = ErrorBoundary;
  ErrorBoundary.getDerivedStateFromError = function (error) { return { error: error }; };
  ErrorBoundary.prototype.componentDidCatch = function (error, info) {
    this.setState(function (s) { return { tries: s.tries + 1 }; });
    if (this.props.onError) try { this.props.onError(error, info); } catch (e) { /* reporting must never break the fallback */ }
  };
  ErrorBoundary.prototype.componentDidUpdate = function (prev, prevState) {
    if (prev.resetKey !== this.props.resetKey && (this.state.error || this.state.tries)) this.setState({ error: null, tries: 0 });
    // it drew fine after Try again, so a later break is a new problem, not the same one again
    else if (prevState.error && !this.state.error && this.state.tries) this.setState({ tries: 0 });
  };
  ErrorBoundary.prototype.reset = function () { this.setState({ error: null }); };
  ErrorBoundary.prototype.render = function () {
    var p = this.props, s = this.state;
    if (!s.error) return p.children === undefined ? null : p.children;
    if (typeof p.fallback === "function") return p.fallback({ error: s.error, reset: this.reset, tries: s.tries });
    if (p.fallback !== undefined) return p.fallback;
    return h(ErrorPage, { kind: "crash", onRetry: this.reset, failures: Math.max(0, s.tries - 1), homeHref: p.homeHref, helpHref: p.helpHref, standalone: p.standalone, code: p.code, path: p.path, onReload: p.onReload });
  };

  // ---- down for maintenance: checks by itself, and opens the app when it's back ----
  function MaintenancePage(p) {
    var checking = useState(false), still = useState(false), back = useState(false), alive = useRef(true), cb = useRef(null);
    var every = p.checkEvery === 0 ? 0 : p.checkEvery || 60000, now = useNow(p.now, 60000), until = p.until ? toDate(p.until) : null;
    useEffect(function () { return function () { alive.current = false; }; }, []);
    function check(manual) {
      if (!p.onCheck || checking[0]) return;
      checking[1](true);
      Promise.resolve(p.onCheck()).then(function (ok) {
        if (!alive.current) return;
        checking[1](false);
        if (ok) { back[1](true); if (p.onBack) p.onBack(); } else if (manual) still[1](true);
      }, function () { if (!alive.current) return; checking[1](false); if (manual) still[1](true); });
    }
    cb.current = check;
    useEffect(function () {
      if (!p.onCheck || !every || back[0]) return;
      var t = 0;
      function start() { clearInterval(t); t = document.hidden ? 0 : setInterval(function () { cb.current(false); }, every); }
      function vis() { if (!document.hidden) cb.current(false); start(); }
      start();
      document.addEventListener("visibilitychange", vis);
      return function () { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
    }, [every, !!p.onCheck, back[0]]);
    if (back[0] && !p.onBack) return h(StatusPage, Object.assign(statusPass(p), { art: "maintenance", eyebrow: "All done", title: "OrbiTutor is back",
      actions: h(Button, { icon: "arrow-right", href: p.continueHref, onClick: p.continueHref ? undefined : function () { window.location.reload(); } }, "Carry on") }),
      h("p", null, "Thanks for waiting. Everything is where you left it."));
    // "by about 10:30 pm", "by about 9:00 am tomorrow", "by about 9:00 am on Sunday"; and when that's passed, say so
    var late = until && until <= now, dd = until ? dayDiff(now, until) : 0;
    var when = until && !late ? "about " + timeText(until) + (dd === 0 ? "" : dd === 1 ? " tomorrow" : " on " + (dd > 1 && dd < 7 ? WEEKDAYS[until.getDay()] : longDate(until))) : null;
    var minutes = Math.round(every / 60000);
    var note = still[0] ? "Still updating." + (p.onCheck && every ? " We'll keep checking." : "") : null;
    return h(StatusPage, Object.assign(statusPass(p), {
      art: "maintenance", eyebrow: "Down for maintenance", title: p.title || "We're updating OrbiTutor", note: note, noteLive: true,
      extra: p.notice ? h("p", { className: "ot-status__aside" }, h(Icon, { name: "info", size: 16 }), h("span", null, p.notice)) : null,
      actions: p.onCheck ? h(Button, { icon: "retry", variant: "secondary", loading: checking[0], onClick: function () { check(true); } }, "Check again") : null,
      help: p.onCheck && every ? "We check " + (minutes <= 1 ? "every minute" : "every " + minutes + " minutes") + " and open OrbiTutor as soon as it's back." : null }),
      h("p", null, p.text || "It'll be back soon. Your progress, marks and certificates are safe.", when ? " We expect to be back by " + when + "." : late ? " It's taking a little longer than we expected." : null));
  }

  // ---- offline, in the phone app: what still works, and back by itself when the connection is ----
  function OfflinePage(p) {
    var checking = useState(false), fails = useState(0), alive = useRef(true), cb = useRef(null);
    useEffect(function () { return function () { alive.current = false; }; }, []);
    function retry(manual) {
      if (checking[0]) return;
      if (!p.onRetry) return;
      checking[1](true);
      Promise.resolve(p.onRetry()).then(function (ok) {
        if (!alive.current) return;
        checking[1](false);
        if (ok === false && manual) fails[1](function (n) { return n + 1; });
      }, function () { if (!alive.current) return; checking[1](false); if (manual) fails[1](function (n) { return n + 1; }); });
    }
    cb.current = retry;
    // the connection's back: try straight away, without waiting for a tap
    useEffect(function () {
      function on() { cb.current(false); }
      window.addEventListener("online", on);
      return function () { window.removeEventListener("online", on); };
    }, []);
    var was = useRef(p.online);
    useEffect(function () { if (p.online && was.current === false) cb.current(false); was.current = p.online; }, [p.online]);
    var saved = p.saved || [], waiting = p.waiting || 0;
    var extra = [];
    if (waiting) extra.push(h("p", { key: "w", className: "ot-status__aside" }, h(Icon, { name: "upload", size: 16 }),
      h("span", null, p.waitingText || (waiting === 1 ? "1 answer is waiting on this phone. It'll send by itself when you're back online." : waiting + " answers are waiting on this phone. They'll send by themselves when you're back online."))));
    if (saved.length) extra.push(h("div", { key: "s", className: "ot-status__saved" },
      h("h2", { className: "ot-status__savedtitle" }, p.savedTitle || "Still on this phone"),
      h("div", { className: "ot-status__savedlist" }, saved.map(function (s, i) {
        return h(ListRow, { key: s.id || i, href: s.href, onClick: s.onClick, title: s.title, meta: s.meta, leading: h("span", { className: "ot-status__savedicon", "aria-hidden": true }, h(Icon, { name: s.icon || "reading", size: 20 })) });
      }))));
    return h(StatusPage, Object.assign(statusPass(p), {
      art: "offline", eyebrow: "No connection", title: p.title || "You're offline", actionsFirst: true, note: fails[0] ? "Still offline. We'll try again by ourselves when the connection's back." : null, noteLive: true,
      extra: extra.length ? extra : null,
      actions: p.onRetry ? h(Button, { icon: "retry", loading: checking[0], onClick: function () { retry(true); } }, "Try again") : null }),
      h("p", null, p.text || "OrbiTutor needs the internet to open this. Check your Wi-Fi or mobile data, or turn off aeroplane mode."));
  }

  // ---- which page a failed request should show ----
  function problemKind(e, o) {
    o = o || {};
    var online = o.online !== undefined ? o.online : typeof navigator === "undefined" || navigator.onLine !== false;
    if (!online) return "offline";
    if (!e) return "error";
    var res = e.response || e, status = +(e.status || e.httpStatus || e.statusCode || res.status || 0);
    var body = e.body || e.data || (e.response && e.response.data) || e;
    var type = (body && (body.exc_type || (body.errors && body.errors[0] && body.errors[0].type))) || e.exc_type || "";
    if (type === "SessionStopped") return "maintenance";
    if (type === "InReadOnlyMode") return "readOnly";
    if (status === 429 || type === "TooManyRequestsError" || type === "RateLimitExceededError" || type === "QueueOverloaded") return "busy";
    if (status === 401 || type === "AuthenticationError" || type === "SessionExpired") return "signedOut";
    if (status === 403 || type === "PermissionError") return o.signedIn === false ? "signedOut" : "noAccess";
    if (status === 404 || type === "DoesNotExistError" || type === "PageDoesNotExistError") return "notFound";
    if (status === 503) return "maintenance";
    return "error";
  }


  // ======== Staff: the Teach area, for instructors, evaluators and moderators ========
  // Same look as the student side, denser, and laptop first. Everything here also works on a phone.

  Object.assign(ICONS, {
    edit: ["M4.5 19.5l1-4.5L15.8 4.7a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L9 18.5Z", "M13.5 7l3.5 3.5"],
    users: [["circle", { cx: 9, cy: 8.5, r: 3.5 }], "M2.5 20a6.5 6.5 0 0 1 13 0", "M15.5 5.2a3.5 3.5 0 0 1 0 6.6", "M18 14.3a6.5 6.5 0 0 1 3.5 5.7"],
    "user-plus": [["circle", { cx: 10, cy: 8.5, r: 3.5 }], "M3.5 20a6.5 6.5 0 0 1 13 0", "M19 8v6", "M16 11h6"],
    chart: ["M4 20.5h16", "M7 17v-5", "M12 17V6.5", "M17 17v-7.5"],
    grip: ["M9 6h.01", "M15 6h.01", "M9 12h.01", "M15 12h.01", "M9 18h.01", "M15 18h.01"],
    more: ["M5.5 12h.01", "M12 12h.01", "M18.5 12h.01"],
    filter: ["M4 5.5h16l-6.2 7.3v5.7l-3.6 2v-7.7Z"],
    sort: ["M8 4.5v15", "M4.5 8 8 4.5 11.5 8", "M16 19.5v-15", "M12.5 16l3.5 3.5 3.5-3.5"],
    inbox: ["M3.5 13.5 6 5.5h12l2.5 8", "M3.5 13.5v5h17v-5h-5l-1 2.5h-5l-1-2.5Z"],
    teach: [["rect", { x: 3.5, y: 4, width: 17, height: 11.5, rx: 1.5 }], "M12 15.5v2", "M8 21l4-3.5 4 3.5", "M7.5 8.5h6", "M7.5 11.5h9"],
    student: ["M2.5 9 12 4.5 21.5 9 12 13.5Z", "M6.5 11v5c1.5 1.6 3.5 2.5 5.5 2.5s4-.9 5.5-2.5v-5", "M21.5 9v5.5"],
    text: ["M5 7V5h14v2", "M12 5v14", "M9.5 19h5"],
    heading: ["M6.5 5v14", "M17.5 5v14", "M6.5 12h11"],
    list: ["M9.5 6.5h10", "M9.5 12h10", "M9.5 17.5h10", "M5 6.5h.01", "M5 12h.01", "M5 17.5h.01"],
    "list-ordered": ["M10.5 6.5h9", "M10.5 12h9", "M10.5 17.5h9", "M4.5 5 6 4v5", "M4.5 15.2a1.4 1.4 0 0 1 2.6.7c0 1.1-2.6 1.7-2.6 3.3h2.7"],
    image: [["rect", { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2.5 }], ["circle", { cx: 9, cy: 9.5, r: 1.8 }], "M20.5 15.5l-5-5-9 9"],
    table: [["rect", { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2 }], "M3.5 9.5h17", "M3.5 14.5h17", "M10 9.5v10"],
    link: ["M10 14a4 4 0 0 0 5.7 0l3.3-3.3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0L5 13.3a4 4 0 0 0 5.7 5.7l1-1"],
    bold: ["M7 5h6a3.5 3.5 0 0 1 0 7H7Z", "M7 12h7a3.5 3.5 0 0 1 0 7H7Z"],
    italic: ["M10 5h8", "M6 19h8", "M14 5l-4 14"],
    sigma: ["M17.5 5H6.5l6 7-6 7h11"],
    undo: ["M9 14 4.5 9.5 9 5", "M4.5 9.5h10a5 5 0 0 1 0 10H11"],
    "arrow-up": ["M12 19V5", "M6 11l6-6 6 6"],
    "arrow-down": ["M12 5v14", "M6 13l6 6 6-6"],
    send: ["M20.5 3.5 10 14", "M20.5 3.5 14 20.5l-4-6.5-6.5-4Z"],
    minus: ["M5 12h14"],
  });
  var DOT_ICONS = { grip: 1, more: 1 };

  // useMedia(query): the base bundle's, exported below
  function dotIcon(name, size) { return h(Icon, { name: name, size: size || 20, strokeWidth: DOT_ICONS[name] ? 3 : undefined }); }
  function plain(text) { return typeof text === "string" ? text : ""; }

  // ---- StaffShell: the Teach frame (top bar, the staff navigation, and a tab bar on phones) ----
  function staffCount(it) {
    if (!it.count) return null;
    return h("span", { className: "ot-staffnav__count" }, h("span", { "aria-hidden": true }, it.count > 99 ? "99+" : it.count),
      h("span", { className: "ot-visually-hidden" }, ", " + it.count + " " + (it.countLabel || "waiting")));
  }
  function StaffShell(p) {
    var nav = p.nav || [], main = p.mainId || "main", more = useState(false), user = p.user || {};
    var phoneIds = p.phoneTabs || nav.filter(function (it) { return !it.divider; }).slice(0, 4).map(function (it) { return it.id; });
    function go(it, e) {
      more[1](false);
      if (p.onNavigate) p.onNavigate(it, e);
    }
    var links = nav.map(function (it, i) {
      if (it.divider) return h("li", { key: "d" + i, className: "ot-staffnav__divider", role: "separator" }, it.label ? h("span", null, it.label) : null);
      return h("li", { key: it.id },
        h("a", { href: it.href || "#", className: cx("ot-staffnav__link", it.current && "is-current"), "aria-current": it.current ? "page" : undefined,
          onClick: function (e) { go(it, e); } },
          h("span", { className: "ot-staffnav__icon", "aria-hidden": true }, h(Icon, { name: it.icon || "info", size: 20 })),
          h("span", { className: "ot-staffnav__label" }, it.label), staffCount(it)));
    });
    var learn = p.learnHref ? h("a", { href: p.learnHref, className: "ot-staffnav__link ot-staffnav__learn", onClick: function (e) { go({ id: "learn", href: p.learnHref }, e); } },
      h("span", { className: "ot-staffnav__icon", "aria-hidden": true }, h(Icon, { name: "student", size: 20 })),
      h("span", { className: "ot-staffnav__label" }, p.learnLabel || "Student view")) : null;
    var account = h(Menu, {
      label: "Your account", triggerIconOnly: true, triggerIcon: "profile", triggerVariant: "text", align: "end", className: "ot-staff__account",
      items: [{ label: user.name || "You", meta: user.role, icon: "profile", href: p.profileHref }]
        .concat(p.learnHref ? [{ label: p.learnLabel || "Student view", icon: "student", href: p.learnHref }] : [])
        .concat(p.onSignOut ? [{ divider: true }, { label: "Sign out", icon: "sign-out", onSelect: p.onSignOut }] : []),
    });
    var top = h("header", { className: "ot-topbar ot-staff__top" },
      h("div", { className: "ot-topbar__inner" },
        h(Brand, { href: p.homeHref === undefined ? "/" : p.homeHref, name: p.name }),
        h("span", { className: "ot-staff__mode" }, h(Icon, { name: "teach", size: 16 }), h("span", null, p.modeLabel || "Teach")),
        h("div", { className: "ot-topbar__actions" }, p.search || null,
          p.learnHref ? h(Button, { variant: "secondary", size: "sm", icon: "student", href: p.learnHref, className: "ot-staff__learn" }, p.learnLabel || "Student view") : null,
          p.actions || null, account)));
    var tabs = nav.filter(function (it) { return !it.divider && phoneIds.indexOf(it.id) >= 0; });
    var moreCount = nav.reduce(function (n, it) { return n + (!it.divider && phoneIds.indexOf(it.id) < 0 && it.count ? it.count : 0); }, 0);
    var moreCurrent = nav.some(function (it) { return it.current && phoneIds.indexOf(it.id) < 0; });
    var tabBar = h("nav", { className: "ot-tabbar ot-staff__tabbar", "aria-label": p.label || "Teach" },
      tabs.map(function (t) {
        return h("a", { key: t.id, href: t.href || "#", onClick: function (e) { go(t, e); }, className: cx("ot-tabbar__tab", t.current && "ot-tabbar__tab--current"), "aria-current": t.current ? "page" : undefined },
          h("span", { className: "ot-tabbar__icon", "aria-hidden": true }, h(Icon, { name: t.icon, size: 24 }),
            t.count ? h("span", { className: "ot-count ot-tabbar__count" }, t.count > 9 ? "9+" : t.count) : null),
          h("span", { className: "ot-tabbar__label" }, t.label, t.count ? h("span", { className: "ot-visually-hidden" }, ", " + t.count + " " + (t.countLabel || "waiting")) : null));
      }),
      h("button", { type: "button", className: cx("ot-tabbar__tab", moreCurrent && "ot-tabbar__tab--current"), "aria-expanded": more[0], onClick: function () { more[1](true); } },
        h("span", { className: "ot-tabbar__icon", "aria-hidden": true }, h(Icon, { name: "menu", size: 24 }),
          moreCount ? h("span", { className: "ot-count ot-tabbar__count" }, moreCount > 9 ? "9+" : moreCount) : null),
        h("span", { className: "ot-tabbar__label" }, "More")));
    return h(Backdrop, { variant: p.backdrop || "reading", className: cx("ot-shell ot-staff", p.className), style: p.style },
      h("a", { className: "ot-skip", href: "#" + main }, "Skip to content"),
      top, p.banner || null,
      h("div", { className: "ot-staff__body" },
        h("nav", { className: "ot-staffnav", "aria-label": p.label || "Teach" },
          h("ul", { className: "ot-staffnav__list", role: "list" }, links), learn),
        h("main", { id: main, tabIndex: -1, className: cx("ot-staff__main", p.width && "ot-staff__main--" + p.width) }, p.children)),
      h("div", { className: "ot-shell__tabbar" }, tabBar),
      h(BottomSheet, { open: more[0], onClose: function () { more[1](false); }, title: p.label || "Teach" },
        h("nav", { className: "ot-staffnav ot-staffnav--sheet", "aria-label": (p.label || "Teach") + ", all pages" },
          h("ul", { className: "ot-staffnav__list", role: "list" }, links), learn,
          p.onSignOut ? h(Button, { variant: "text", icon: "sign-out", className: "ot-staffnav__signout", onClick: function () { more[1](false); p.onSignOut(); } }, "Sign out") : null)));
  }

  // ---- PageHeader: where you are, the page's name, what you can do here, and its tabs ----
  function PageHeader(p) {
    return h("header", { className: cx("ot-pagehead", p.tabs && "ot-pagehead--tabs", p.className) },
      p.back ? h(BackLink, { href: p.back.href, onClick: p.back.onClick, className: "ot-pagehead__back" }, p.back.label) : null,
      h("div", { className: "ot-pagehead__row" },
        h("div", { className: "ot-pagehead__text" },
          p.eyebrow ? h("p", { className: "ot-pagehead__eyebrow" }, p.eyebrow) : null,
          h("div", { className: "ot-pagehead__titlerow" },
            h(p.titleAs || "h1", { className: "ot-pagehead__title", id: p.titleId, tabIndex: p.titleId ? -1 : undefined }, p.title),
            p.status || null),
          p.meta ? h("p", { className: "ot-pagehead__meta" }, p.meta) : null),
        p.actions ? h("div", { className: "ot-pagehead__actions" }, p.actions) : null),
      p.tabs ? h("div", { className: "ot-pagehead__tabs" }, p.tabs) : null);
  }

  // ---- DataTable: a sortable, selectable list; a table on laptops, cards on phones ----
  function dtValue(col, row) {
    var v = col.render ? col.render(row) : row[col.key];
    return v == null || v === "" ? h("span", { className: "ot-dt__none", "aria-label": "None" }, "\u2014") : v;
  }
  function dtSortValue(col, row) { var v = col.sortValue ? col.sortValue(row) : row[col.key]; return v == null ? "" : v; }
  function DataTable(p) {
    var cols = p.columns || [], rows = p.rows || [], rk = p.rowKey || "id";
    var phone = useMedia("(max-width: 719px)"), base = uid("dt");
    var ss = useState(p.defaultSort || null), sort = p.sort !== undefined ? p.sort : ss[0];
    var sl = useState([]), selected = p.selected !== undefined ? p.selected : sl[0];
    var all = useRef(null);
    var primary = cols.filter(function (c) { return c.primary; })[0] || cols[0];
    function keyOf(r) { return r[rk]; }
    function setSelected(ids) { if (p.selected === undefined) sl[1](ids); if (p.onSelectionChange) p.onSelectionChange(ids); }
    function sortBy(col) {
      var next = sort && sort.key === col.key ? { key: col.key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key: col.key, dir: col.defaultDir || "asc" };
      if (p.sort === undefined) ss[1](next);
      if (p.onSort) p.onSort(next);
    }
    var shown = rows;
    if (sort && !p.serverSort) {
      var sc = cols.filter(function (c) { return c.key === sort.key; })[0];
      if (sc) shown = rows.slice().sort(function (a, b) {
        var x = dtSortValue(sc, a), y = dtSortValue(sc, b);
        var r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
        return sort.dir === "desc" ? -r : r;
      });
    }
    var ids = shown.map(keyOf), picked = ids.filter(function (id) { return selected.indexOf(id) >= 0; });
    var allOn = ids.length > 0 && picked.length === ids.length, someOn = picked.length > 0 && !allOn;
    useEffect(function () { if (all.current) all.current.indeterminate = someOn; });
    function toggle(id) { setSelected(selected.indexOf(id) >= 0 ? selected.filter(function (x) { return x !== id; }) : selected.concat([id])); }
    function toggleAll() { setSelected(allOn ? selected.filter(function (x) { return ids.indexOf(x) < 0; }) : selected.concat(ids.filter(function (x) { return selected.indexOf(x) < 0; }))); }
    function rowName(r) { return plain(r[primary.key]) || plain(p.rowLabel ? p.rowLabel(r) : "") || "this row"; }
    function check(r) {
      var id = keyOf(r), on = selected.indexOf(id) >= 0;
      return h("label", { className: "ot-dt__check" },
        h("input", { type: "checkbox", checked: on, onChange: function () { toggle(id); } }),
        h("span", { className: "ot-dt__box", "aria-hidden": true }, h(Icon, { name: "check", size: 14, strokeWidth: 2.8 })),
        h("span", { className: "ot-visually-hidden" }, "Select " + rowName(r)));
    }
    function title(r) {
      var v = dtValue(primary, r), href = p.rowHref ? p.rowHref(r) : null;
      if (href || p.onRowClick) return h(href ? "a" : "button", { className: "ot-dt__link", href: href || undefined, type: href ? undefined : "button",
        onClick: function (e) { if (p.onRowClick) p.onRowClick(r, e); } }, v);
      return v;
    }
    function actions(r) {
      var items = p.rowActions ? p.rowActions(r) : null;
      if (!items || !items.length) return null;
      return h(Menu, { label: "More for " + rowName(r), triggerIconOnly: true, triggerIcon: "more", triggerVariant: "text", triggerSize: "sm", align: "end", items: items, className: "ot-dt__menu" });
    }
    var hasActions = !!p.rowActions;
    var body;
    if (p.error) {
      body = h(ErrorState, { compact: true, title: p.error.title || "This list didn't load", onRetry: p.error.onRetry }, p.error.text);
    } else if (!p.loading && !shown.length) {
      var em = p.empty || {};
      body = h(EmptyState, { compact: true, icon: em.icon || "info", title: em.title || "Nothing here yet", action: em.action }, em.text);
    }
    var bulk = p.selectable && picked.length ? h("div", { className: "ot-dt__bulk", role: "region", "aria-label": "Selected rows" },
      h("p", { className: "ot-dt__bulkcount", role: "status" }, picked.length + " selected"),
      h("div", { className: "ot-dt__bulkactions" }, p.bulkActions ? p.bulkActions(picked) : null,
        h(Button, { variant: "text", size: "sm", onClick: function () { setSelected([]); } }, "Clear selection"))) : null;
    var skeletonRows = [0, 1, 2, 3, 4];

    if (phone) {
      var cardCols = cols.filter(function (c) { return c !== primary && !c.hideOnPhone; });
      return h("div", { className: cx("ot-dt", "ot-dt--cards", p.className) }, bulk,
        p.selectable && shown.length && !p.loading && !p.error ? h("label", { className: "ot-dt__allrow" },
          h("span", { className: "ot-dt__check" }, h("input", { type: "checkbox", ref: all, checked: allOn, onChange: toggleAll }),
            h("span", { className: "ot-dt__box", "aria-hidden": true }, h(Icon, { name: someOn ? "minus" : "check", size: 14, strokeWidth: 2.8 }))),
          h("span", null, "Select all " + shown.length)) : null,
        body || h("ul", { className: "ot-dt__cardlist", role: "list", "aria-label": p.label, "aria-busy": p.loading || undefined },
          p.loading ? skeletonRows.slice(0, 3).map(function (i) { return h("li", { key: i, className: "ot-dt__card" }, h(Skeleton, { lines: 3 })); })
            : shown.map(function (r) {
              var id = keyOf(r), on = selected.indexOf(id) >= 0;
              return h("li", { key: id, className: cx("ot-dt__card", on && "is-selected", (p.rowHref || p.onRowClick) && "ot-dt__card--link") },
                p.selectable ? check(r) : null,
                h("div", { className: "ot-dt__cardbody" },
                  h("p", { className: "ot-dt__cardtitle" }, title(r)),
                  cardCols.length ? h("dl", { className: "ot-dt__facts" }, cardCols.map(function (c) {
                    return h("div", { key: c.key, className: cx("ot-dt__fact", c.phoneWide && "ot-dt__fact--wide") }, h("dt", null, c.phoneLabel || c.label), h("dd", null, dtValue(c, r)));
                  })) : null),
                hasActions ? actions(r) : null);
            })),
        p.footer || null);
    }

    return h("div", { className: cx("ot-dt", p.density === "compact" && "ot-dt--compact", p.className) }, bulk,
      body || h("div", { className: "ot-dt__frame" },
        h("table", { className: "ot-dt__table", "aria-busy": p.loading || undefined },
          h("caption", { id: base + "-cap", className: "ot-visually-hidden" }, p.label || "List"),
          h("thead", null, h("tr", null,
            p.selectable ? h("th", { scope: "col", className: "ot-dt__selcol" },
              h("label", { className: "ot-dt__check" }, h("input", { type: "checkbox", ref: all, checked: allOn, onChange: toggleAll, disabled: !ids.length }),
                h("span", { className: "ot-dt__box", "aria-hidden": true }, h(Icon, { name: someOn ? "minus" : "check", size: 14, strokeWidth: 2.8 })),
                h("span", { className: "ot-visually-hidden" }, "Select all"))) : null,
            cols.map(function (c) {
              var on = sort && sort.key === c.key;
              var inner = c.sortable ? h("button", { type: "button", className: "ot-dt__sort", onClick: function () { sortBy(c); } },
                h("span", null, c.label), h(Icon, { name: on ? (sort.dir === "desc" ? "arrow-down" : "arrow-up") : "sort", size: 16, className: cx("ot-dt__sorticon", on && "is-on") })) : c.label;
              return h("th", { key: c.key, scope: "col", className: cx(c.align && "ot-dt--" + c.align, c.hideOnTablet && "ot-dt__tabhide"), style: c.width ? { width: c.width } : undefined,
                "aria-sort": on ? (sort.dir === "desc" ? "descending" : "ascending") : c.sortable ? "none" : undefined }, inner);
            }),
            hasActions ? h("th", { scope: "col", className: "ot-dt__actcol" }, h("span", { className: "ot-visually-hidden" }, "Actions")) : null)),
          h("tbody", null, p.loading
            ? skeletonRows.map(function (i) {
              return h("tr", { key: i }, p.selectable ? h("td", null) : null,
                cols.map(function (c) { return h("td", { key: c.key, className: c.hideOnTablet ? "ot-dt__tabhide" : undefined }, h(Skeleton, { width: c === primary ? "70%" : "50%" })); }), hasActions ? h("td", null) : null);
            })
            : shown.map(function (r) {
              var id = keyOf(r), on = selected.indexOf(id) >= 0;
              return h("tr", { key: id, className: cx(on && "is-selected", (p.rowHref || p.onRowClick) && "ot-dt__row--link") },
                p.selectable ? h("td", { className: "ot-dt__selcol" }, check(r)) : null,
                cols.map(function (c) {
                  return h(c === primary ? "th" : "td", { key: c.key, scope: c === primary ? "row" : undefined, className: cx(c.align && "ot-dt--" + c.align, c === primary && "ot-dt__primary", c.hideOnTablet && "ot-dt__tabhide") },
                    c === primary ? title(r) : dtValue(c, r));
                }),
                hasActions ? h("td", { className: "ot-dt__actcol" }, actions(r)) : null);
            })))),
      p.footer || null);
  }

  // ---- FilterBar: search, a few filters, how many match, and clear ----
  function FilterBar(p) {
    var filters = p.filters || [];
    var active = filters.some(function (f) { return f.value != null && f.value !== "" && f.value !== f.allValue; }) || !!(p.search && p.search.value);
    return h("div", { className: cx("ot-filterbar", p.className), role: p.search ? "search" : undefined, "aria-label": p.label },
      p.search ? h(TextField, { search: true, className: "ot-filterbar__search", label: undefined, placeholder: p.search.placeholder || "Search", value: p.search.value || "",
        onChange: function (e) { p.search.onChange(e.target.value, e); } }) : null,
      filters.map(function (f) {
        var on = f.value != null && f.value !== "" && f.value !== f.allValue;
        var cur = (f.options || []).filter(function (o) { return String(typeof o === "string" ? o : o.value) === String(f.value); })[0];
        var shownText = on && cur ? (typeof cur === "string" ? cur : cur.label) : f.allLabel || "All";
        return h("label", { key: f.id, className: cx("ot-filter", on && "is-on") },
          h("span", { className: "ot-filter__label" }, f.label),
          h("span", { className: "ot-filter__value", "aria-hidden": true }, shownText),
          h("select", { "aria-label": f.label, value: f.value == null ? "" : f.value, onChange: function (e) { f.onChange(e.target.value, e); } },
            [h("option", { key: "__all", value: f.allValue === undefined ? "" : f.allValue }, f.allLabel || "All")].concat((f.options || []).map(function (o) {
              var v = typeof o === "string" ? o : o.value;
              return h("option", { key: v, value: v }, (typeof o === "string" ? o : o.label) + (o.count != null ? " (" + o.count + ")" : ""));
            }))),
          h(Icon, { name: "chevron-down", size: 16, className: "ot-filter__chevron" }));
      }),
      p.count != null || active ? h("div", { className: "ot-filterbar__status" },
        p.count != null ? h("p", { className: "ot-filterbar__count", role: "status" }, p.count) : null,
        active && p.onClear ? h(Button, { variant: "text", size: "sm", onClick: p.onClear }, "Clear filters") : null) : null,
      p.actions ? h("div", { className: "ot-filterbar__actions" }, p.actions) : null);
  }

  // ---- FormSection and SaveBar: long forms in named parts, saved together ----
  function FormSection(p) {
    var id = uid("fs");
    return h("section", { className: cx("ot-formsec", p.className), "aria-labelledby": id, id: p.id },
      h("div", { className: "ot-formsec__intro" },
        h(p.titleAs || "h2", { className: "ot-formsec__title", id: id }, p.title),
        p.description ? h("p", { className: "ot-formsec__desc" }, p.description) : null),
      h("div", { className: cx("ot-formsec__fields", p.columns === 2 && "ot-formsec__fields--2") }, p.children));
  }

  var SAVE_TEXT = { dirty: "You have changes that aren't saved", saving: "Saving\u2026", saved: "All changes saved", error: "Not saved. Check the fields marked in red.", clean: "No changes yet" };
  function SaveBar(p) {
    var state = p.state || "clean";
    if (state === "clean" && !p.always) return null;
    return h("div", { className: cx("ot-savebar", "ot-savebar--" + state, p.className), role: "region", "aria-label": p.label || "Save" },
      h("p", { className: "ot-savebar__text", role: state === "error" ? "alert" : "status" },
        state === "saved" ? h(Icon, { name: "done", size: 20 }) : state === "error" ? h(Icon, { name: "warning", size: 20 }) : state === "dirty" ? h("span", { className: "ot-savebar__dot", "aria-hidden": true }) : null,
        h("span", null, p.message || SAVE_TEXT[state])),
      h("div", { className: "ot-savebar__actions" },
        p.onDiscard && (state === "dirty" || state === "error") ? h(Button, { variant: "text", onClick: p.onDiscard }, p.discardLabel || "Discard changes") : null,
        h(Button, { onClick: p.onSave, loading: state === "saving", disabled: state === "saved" || state === "clean" }, state === "saving" ? "Saving" : p.saveLabel || "Save changes")));
  }

  // ---- Combobox: type to find, then pick one or several (people, courses, batches) ----
  function Combobox(p) {
    var auto = uid("cb"), id = p.id || auto, listId = id + "-list", multiple = !!p.multiple;
    var vs = useState(multiple ? [] : null), value = p.value !== undefined ? p.value : vs[0];
    var qs = useState(""), query = qs[0], os = useState(false), open = os[0], as = useState(-1), active = as[0];
    var rs = useState({ loading: false, error: false, options: null }), remote = rs[0];
    var wrap = useRef(null), input = useRef(null), seq = useRef(0);
    var picked = multiple ? value || [] : value ? [value] : [];
    var minChars = p.minChars || 0, q = query.trim();
    function isPicked(o) { return picked.some(function (x) { return x.value === o.value; }); }
    function setValue(v) { if (p.value === undefined) vs[1](v); if (p.onChange) p.onChange(v); }
    useEffect(function () {
      if (!p.onSearch || !open) return;
      if (q.length < minChars) { seq.current++; rs[1]({ loading: false, error: false, options: null }); return; }
      var n = ++seq.current;
      rs[1](function (r) { return { loading: true, error: false, options: r.options }; });
      var t = setTimeout(function () {
        Promise.resolve(p.onSearch(q)).then(function (opts) { if (n === seq.current) rs[1]({ loading: false, error: false, options: opts || [] }); },
          function () { if (n === seq.current) rs[1]({ loading: false, error: true, options: [] }); });
      }, p.debounce === undefined ? 250 : p.debounce);
      return function () { clearTimeout(t); };
    }, [q, open]);
    var options = p.onSearch ? remote.options || [] : (p.options || []).filter(function (o) {
      return !q || (o.label + " " + (o.description || "")).toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
    useEffect(function () { as[1](options.length ? 0 : -1); }, [q, remote.options, open]);
    useEffect(function () {
      if (!open) return;
      function outside(e) { if (wrap.current && !wrap.current.contains(e.target)) { os[1](false); qs[1](""); } }
      document.addEventListener("pointerdown", outside);
      return function () { document.removeEventListener("pointerdown", outside); };
    }, [open]);
    function choose(o) {
      if (!o || o.disabled) return;
      if (multiple) { setValue(isPicked(o) ? picked.filter(function (x) { return x.value !== o.value; }) : picked.concat([o])); qs[1](""); }
      else { setValue(o); qs[1](""); os[1](false); }
    }
    function keys(e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (!open) os[1](true); else as[1](Math.min(options.length - 1, active + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); as[1](Math.max(0, active - 1)); }
      else if (e.key === "Enter") { if (open && options[active]) { e.preventDefault(); choose(options[active]); } }
      else if (e.key === "Escape") { if (open) { e.preventDefault(); e.stopPropagation(); os[1](false); qs[1](""); } }
      else if (e.key === "Backspace" && multiple && !query && picked.length) setValue(picked.slice(0, -1));
    }
    var status = null;
    if (open) {
      if (p.onSearch && q.length < minChars) status = minChars > 1 ? "Type at least " + minChars + " letters" : "Start typing to search";
      else if (remote.loading && !options.length) status = "Searching\u2026";
      else if (remote.error) status = p.errorText || "Couldn't search just now. Try again.";
      else if (!options.length) status = q ? (p.noResults || "Nothing matches \u201c" + q + "\u201d") : p.emptyText || "Nothing to pick";
    }
    var single = !multiple && value && !open ? value.label : query;
    var activeId = open && options[active] ? id + "-o" + active : undefined;
    return h(Field, Object.assign({}, p, { id: id, className: cx("ot-combo", open && "ot-combo--open", p.className) }),
      h("div", { ref: wrap, className: "ot-combo__wrap" },
        h("div", { className: cx("ot-input", "ot-combo__box", multiple && picked.length && "ot-combo__box--chips"), onClick: function () { if (input.current) input.current.focus(); } },
          h(Icon, { name: p.icon || "search", size: 20 }),
          multiple ? picked.map(function (o) {
            return h(Chip, { key: o.value, className: "ot-combo__chip", onRemove: function (e) { if (e && e.stopPropagation) e.stopPropagation(); choose(o); } }, o.label);
          }) : null,
          h("input", {
            ref: input, id: id, type: "text", role: "combobox", autoComplete: "off", spellCheck: false, value: single,
            placeholder: multiple && picked.length ? p.morePlaceholder || "Add another" : p.placeholder, disabled: p.disabled,
            "aria-expanded": open, "aria-controls": listId, "aria-autocomplete": "list", "aria-activedescendant": activeId,
            "aria-invalid": p.error ? true : undefined, "aria-describedby": describedBy(id, p),
            onFocus: function () { os[1](true); }, onKeyDown: keys,
            onChange: function (e) { qs[1](e.target.value); os[1](true); },
          }),
          !multiple && value && !p.required && !p.disabled ? h(Button, { variant: "text", size: "sm", iconOnly: true, icon: "close", className: "ot-quiet ot-combo__clear",
            onClick: function (e) { e.stopPropagation(); setValue(null); if (input.current) input.current.focus(); } }, "Clear " + (p.label || "choice")) : null,
          remote.loading && options.length ? h("span", { className: "ot-combo__spin", "aria-hidden": true }) : null),
        open ? h("div", { className: "ot-combo__pop" },
          options.length ? h("ul", { id: listId, role: "listbox", "aria-label": p.label, "aria-multiselectable": multiple || undefined, className: "ot-combo__list" },
            options.map(function (o, i) {
              var on = isPicked(o);
              return h("li", {
                key: o.value, id: id + "-o" + i, role: "option", "aria-selected": on, "aria-disabled": o.disabled || undefined,
                className: cx("ot-combo__opt", i === active && "is-active", on && "is-picked", o.disabled && "is-disabled"),
                onMouseDown: function (e) { e.preventDefault(); }, onMouseMove: function () { if (i !== active) as[1](i); }, onClick: function () { choose(o); },
              },
                o.person || o.avatar !== undefined ? h(Avatar, { name: o.label, src: o.avatar || undefined, size: 32, decorative: true }) : o.icon ? h("span", { className: "ot-combo__icon", "aria-hidden": true }, h(Icon, { name: o.icon, size: 20 })) : null,
                h("span", { className: "ot-combo__text" }, h("span", { className: "ot-combo__label" }, o.label), o.description ? h("span", { className: "ot-combo__desc" }, o.description) : null),
                on ? h(Icon, { name: "check", size: 18, className: "ot-combo__check" }) : o.note ? h("span", { className: "ot-combo__note" }, o.note) : null);
            })) : h("ul", { id: listId, role: "listbox", "aria-label": p.label, className: "ot-combo__list ot-combo__list--empty" }),
          status ? h("p", { className: cx("ot-combo__status", remote.error && "ot-combo__status--error"), role: "status" }, status) : null) : null));
  }

  // ---- ConfirmDialog: are you sure, said plainly, with what happens if you go ahead ----
  function ConfirmDialog(p) {
    var bs = useState(false), busy = bs[0], es = useState(null), err = es[0], ts = useState(""), typed = ts[0];
    useEffect(function () { if (p.open) { bs[1](false); es[1](null); ts[1](""); } }, [p.open]);
    var blocked = !!p.typeToConfirm && typed.trim().toLowerCase() !== String(p.typeToConfirm).trim().toLowerCase();
    var danger = p.tone !== "neutral";
    function go() {
      if (blocked || busy) return;
      bs[1](true); es[1](null);
      Promise.resolve(p.onConfirm ? p.onConfirm() : null).then(function (res) {
        bs[1](false);
        if (res && res.error) es[1](typeof res.error === "string" ? res.error : res.error.message || "That didn't work. Try again.");
      }, function (e) { bs[1](false); es[1]((e && e.message) || "That didn't work. Try again."); });
    }
    return h(Dialog, {
      open: p.open, onClose: busy ? undefined : p.onClose, title: p.title, tone: danger ? "danger" : undefined, className: "ot-confirm", inline: p.inline,
      actions: [
        h(Button, { key: "no", variant: "secondary", onClick: p.onClose, disabled: busy }, p.cancelLabel || "Cancel"),
        h(Button, { key: "yes", variant: danger ? "danger" : "primary", icon: danger ? p.icon || "trash" : p.icon, onClick: go, loading: busy, disabled: blocked }, p.confirmLabel || "Delete"),
      ],
    },
      p.children ? h("div", { className: "ot-confirm__text" }, p.children) : null,
      p.typeToConfirm ? h(TextField, { label: "To confirm, type " + p.typeToConfirm, value: typed, autoComplete: "off", spellCheck: false,
        onChange: function (e) { ts[1](e.target.value); } }) : null,
      err ? h(Alert, { tone: "danger", title: p.errorTitle || "Not done" }, err) : null);
  }

  // ---- StatTile, StatGrid, BarChart, SpreadBar: numbers for dashboards ----
  function StatTile(p) {
    var t = p.trend, Tag = p.href ? "a" : "div";
    return h(Tag, { className: cx("ot-stat", p.href && "ot-stat--link", p.tone && "ot-stat--" + p.tone, p.className), href: p.href, onClick: p.onClick },
      h("p", { className: "ot-stat__label" }, p.icon ? h(Icon, { name: p.icon, size: 18 }) : null, h("span", null, p.label)),
      p.loading ? h(Skeleton, { width: "40%", height: 36, className: "ot-stat__skeleton" })
        : h("p", { className: "ot-stat__value" }, p.value, p.unit ? h("span", { className: "ot-stat__unit" }, " " + p.unit) : null),
      t ? h("p", { className: cx("ot-stat__trend", "ot-stat__trend--" + (t.good === false ? "bad" : t.good ? "good" : "flat")) },
        h(Icon, { name: t.direction === "down" ? "arrow-down" : t.direction === "up" ? "arrow-up" : "arrow-right", size: 16 }), h("span", null, t.text))
        : p.meta ? h("p", { className: "ot-stat__meta" }, p.meta) : null,
      p.href ? h(Icon, { name: "chevron-right", size: 18, className: "ot-stat__chev" }) : null);
  }
  function StatGrid(p) {
    return h("div", { className: cx("ot-stats", p.className), role: p.label ? "group" : undefined, "aria-label": p.label }, h("div", { className: "ot-stats__grid" }, p.children));
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  var CHART_TONES = { gold: "var(--meter)", success: "var(--success)", warning: "var(--warning)", danger: "var(--danger)", neutral: "var(--ink-3)",
    physics: "var(--track-physics)", code: "var(--track-code)", making: "var(--track-making)", competitions: "var(--track-competitions)" };
  function chartColor(tone) { return CHART_TONES[tone] || tone || CHART_TONES.gold; }
  function BarChart(p) {
    var data = p.data || [], fmt = p.format || function (v) { return String(v); };
    var top = niceMax(p.max || Math.max.apply(null, data.map(function (d) { return d.value || 0; }).concat([0])));
    var horizontal = p.orientation === "horizontal";
    var summary = p.label || (p.title ? p.title + ": " : "") + data.map(function (d) { return d.label + " " + fmt(d.value); }).join(", ");
    var table = h("table", { className: "ot-visually-hidden" }, h("caption", null, p.title || p.label),
      h("thead", null, h("tr", null, h("th", { scope: "col" }, p.labelHeading || "Label"), h("th", { scope: "col" }, p.valueHeading || "Value"))),
      h("tbody", null, data.map(function (d, i) { return h("tr", { key: i }, h("th", { scope: "row" }, d.label), h("td", null, fmt(d.value))); })));
    var plot = horizontal
      ? h("div", { className: "ot-chart__rows", "aria-hidden": true }, data.map(function (d, i) {
        return h("div", { key: i, className: "ot-chart__row" },
          h("span", { className: "ot-chart__rowlabel" }, d.label),
          h("span", { className: "ot-chart__track" }, h("span", { className: "ot-chart__fill", style: { width: (100 * (d.value || 0) / top) + "%", background: chartColor(d.tone || p.tone) } })),
          h("span", { className: "ot-chart__rowvalue" }, fmt(d.value)));
      }))
      : h("div", { className: "ot-chart__frame", "aria-hidden": true, style: { "--plot-h": (p.height || 180) + "px" } },
        h("div", { className: "ot-chart__axis" }, [top, top / 2, 0].map(function (v, i) { return h("span", { key: i }, fmt(Math.round(v * 10) / 10)); })),
        h("div", { className: "ot-chart__area" },
          h("div", { className: "ot-chart__plot" }, data.map(function (d, i) {
            return h("div", { key: i, className: "ot-chart__col" },
              h("span", { className: "ot-chart__bar", style: { height: (100 * (d.value || 0) / top) + "%", background: chartColor(d.tone || p.tone) } },
                h("span", { className: "ot-chart__value" }, fmt(d.value))));
          })),
          h("div", { className: "ot-chart__labels" }, data.map(function (d, i) { return h("span", { key: i }, d.short || d.label); }))));
    return h("figure", { className: cx("ot-chart", horizontal ? "ot-chart--h" : "ot-chart--v", p.className) },
      p.title ? h("figcaption", { className: "ot-chart__title" }, p.title, p.note ? h("span", { className: "ot-chart__note" }, p.note) : null) : null,
      h("div", { role: "img", "aria-label": summary }, plot), table);
  }

  var SPREAD_DEFAULT = ["neutral", "physics", "code", "gold", "success"];
  function SpreadBar(p) {
    var segs = p.segments || [], total = p.total || segs.reduce(function (n, s) { return n + (s.value || 0); }, 0);
    var pct = function (v) { return total ? Math.round(100 * v / total) : 0; };
    return h("figure", { className: cx("ot-spread", p.className) },
      p.title ? h("figcaption", { className: "ot-chart__title" }, p.title, p.note ? h("span", { className: "ot-chart__note" }, p.note) : null) : null,
      h("div", { className: "ot-spread__bar", role: "img", "aria-label": (p.title ? p.title + ": " : "") + segs.map(function (s) { return s.label + " " + s.value; }).join(", ") },
        total ? segs.map(function (s, i) {
          return s.value ? h("span", { key: i, className: "ot-spread__seg", style: { flexGrow: s.value, background: chartColor(s.tone || SPREAD_DEFAULT[i % SPREAD_DEFAULT.length]) } }) : null;
        }) : null),
      h("ul", { className: "ot-spread__legend", role: "list" }, segs.map(function (s, i) {
        return h("li", { key: i },
          h("span", { className: "ot-spread__swatch", style: { background: chartColor(s.tone || SPREAD_DEFAULT[i % SPREAD_DEFAULT.length]) }, "aria-hidden": true }),
          h("span", { className: "ot-spread__name" }, s.label),
          h("span", { className: "ot-spread__num" }, s.value + (p.percent === false ? "" : " \u00b7 " + pct(s.value) + "%")));
      })));
  }

  // ---- RichTextField: formatted text (descriptions, instructions, announcements) ----
  var RT_TOOLS = {
    bold: { icon: "bold", label: "Bold", cmd: "bold", keys: "Control+B" },
    italic: { icon: "italic", label: "Italic", cmd: "italic", keys: "Control+I" },
    heading: { icon: "heading", label: "Heading" },
    bullets: { icon: "list", label: "Bulleted list", cmd: "insertUnorderedList" },
    numbers: { icon: "list-ordered", label: "Numbered list", cmd: "insertOrderedList" },
    link: { icon: "link", label: "Link", keys: "Control+K" },
  };
  function RichTextField(p) {
    var auto = uid("rt"), id = p.id || auto, ed = useRef(null), last = useRef(undefined), range = useRef(null);
    var fs = useState({}), on = fs[0], ls = useState(null), linking = ls[0], le = useState(null), linkErr = le[0];
    var tools = p.tools || ["bold", "italic", "heading", "bullets", "numbers", "link"];
    useLayoutEffect(function () {
      var v = p.value || "";
      if (ed.current && v !== last.current) { ed.current.innerHTML = sanitizeHtml(v); last.current = v; }
    }, [p.value]);
    function refresh() {
      try {
        var block = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
        fs[1]({ bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), heading: block === "h3" || block === "heading 3",
          bullets: document.queryCommandState("insertUnorderedList"), numbers: document.queryCommandState("insertOrderedList") });
      } catch (e) { /* not every browser answers */ }
    }
    function emit() {
      var html = ed.current.innerHTML;
      if (html === "<br>" || html === "<p><br></p>" || !ed.current.textContent.trim() && !/<(img|li)/i.test(html)) html = "";
      last.current = html;
      if (p.onChange) p.onChange(html);
      refresh();
    }
    function run(name) {
      var t = RT_TOOLS[name];
      ed.current.focus();
      if (name === "link") { openLink(); return; }
      if (name === "heading") document.execCommand("formatBlock", false, on.heading ? "p" : "h3");
      else document.execCommand(t.cmd, false, null);
      emit();
    }
    function openLink() {
      var sel = window.getSelection();
      range.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      var a = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      a = a && a.closest ? a.closest("a") : null;
      le[1](null); ls[1]({ url: a ? a.getAttribute("href") || "" : "", existing: !!a });
    }
    function restore() {
      ed.current.focus();
      if (range.current) { var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range.current); }
    }
    function applyLink(e) {
      if (e) e.preventDefault();
      var url = (linking.url || "").trim();
      if (url && !/^[a-z][a-z0-9+.\-]*:/i.test(url) && !/^[/#]/.test(url)) url = "https://" + url;
      if (!safeUrl(url, "link")) { le[1]("Use a web address that starts with https://"); return; }
      restore();
      if (range.current && range.current.collapsed) document.execCommand("insertHTML", false, "<a href=\"" + url.replace(/"/g, "&quot;") + "\">" + url.replace(/</g, "&lt;") + "</a>");
      else document.execCommand("createLink", false, url);
      ls[1](null); emit();
    }
    function removeLink() { restore(); document.execCommand("unlink", false, null); ls[1](null); emit(); }
    function keys(e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k" && tools.indexOf("link") >= 0) { e.preventDefault(); openLink(); }
    }
    function paste(e) {
      // text comes in plain, so nothing foreign (fonts, colours, scripts) rides along
      var text = e.clipboardData && e.clipboardData.getData("text/plain");
      if (text == null) return;
      e.preventDefault();
      document.execCommand("insertText", false, text);
    }
    var labelId = id + "-label";
    return h("div", { className: cx("ot-field", "ot-rt", p.error && "ot-field--error", p.disabled && "ot-field--disabled", p.className) },
      p.label ? h("span", { className: "ot-field__label", id: labelId, onClick: function () { if (ed.current) ed.current.focus(); } }, p.label,
        p.optional ? h("span", { className: "ot-field__optional" }, " (optional)") : null) : null,
      h("div", { className: "ot-rt__box" },
        h("div", { className: "ot-rt__toolbar", role: "toolbar", "aria-label": (plain(p.label) || "Text") + " formatting", "aria-controls": id },
          tools.map(function (name) {
            var t = RT_TOOLS[name];
            return h("button", { key: name, type: "button", className: cx("ot-rt__tool", on[name] && "is-on"), "aria-pressed": name === "link" ? undefined : !!on[name],
              "aria-keyshortcuts": t.keys, title: t.label + (t.keys ? " (" + t.keys.replace("Control", "Ctrl") + ")" : ""), disabled: p.disabled,
              onMouseDown: function (e) { e.preventDefault(); }, onClick: function () { run(name); } },
              h(Icon, { name: t.icon, size: 18, strokeWidth: name === "bold" ? 2.4 : undefined }), h("span", { className: "ot-visually-hidden" }, t.label));
          })),
        linking ? h("form", { className: "ot-rt__linkbar", onSubmit: applyLink },
          h(TextField, { label: "Link address", placeholder: "https://", value: linking.url, error: linkErr, autoComplete: "off",
            onChange: function (e) { ls[1]({ url: e.target.value, existing: linking.existing }); le[1](null); } }),
          h("div", { className: "ot-rt__linkactions" },
            linking.existing ? h(Button, { variant: "text", size: "sm", onClick: removeLink }, "Remove link") : null,
            h(Button, { variant: "text", size: "sm", onClick: function () { ls[1](null); restore(); } }, "Cancel"),
            h(Button, { size: "sm", type: "submit" }, "Add link"))) : null,
        h("div", {
          ref: ed, id: id, className: "ot-rt__edit ot-prose", contentEditable: !p.disabled, suppressContentEditableWarning: true,
          role: "textbox", "aria-multiline": true, "aria-labelledby": p.label ? labelId : undefined, "aria-label": p.label ? undefined : p.placeholder,
          "aria-describedby": describedBy(id, p), "aria-invalid": p.error ? true : undefined, "data-placeholder": p.placeholder || "",
          style: { minHeight: (p.rows || 5) * 26 }, onInput: emit, onKeyDown: keys, onKeyUp: refresh, onMouseUp: refresh, onPaste: paste,
          onBlur: p.onBlur,
        })),
      p.hint ? h("p", { className: "ot-field__hint", id: id + "-hint" }, p.hint) : null,
      p.error ? h("p", { className: "ot-field__error", id: id + "-error" }, h(Icon, { name: "warning", size: 16 }), h("span", null, p.error)) : null);
  }

  // exports: StaffShell, PageHeader, DataTable, FilterBar, FormSection, SaveBar, Combobox, ConfirmDialog, StatTile, StatGrid, BarChart, SpreadBar, RichTextField, useMedia

  // ======== Staff: writing courses (lists, the outline, the lesson editor) ========

  // Drag to reorder, for mouse users; every list also has Move up and Move down in its menu.
  function useReorder(onMove) {
    var as = useState(null), armed = as[0], ds = useState(null), dragging = ds[0], os = useState(null), over = os[0];
    function clear() { as[1](null); ds[1](null); os[1](null); }
    return {
      dragging: dragging,
      handle: function (i) {
        return { onPointerDown: function (e) { if (e.pointerType === "mouse") as[1](i); }, onPointerUp: function () { if (dragging == null) as[1](null); } };
      },
      row: function (i) {
        return {
          draggable: armed === i || undefined,
          onDragStart: function (e) { if (armed !== i) return; ds[1](i); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", "row " + i); } catch (x) { /* old browsers */ } },
          onDragOver: function (e) {
            if (dragging == null) return;
            e.preventDefault();
            var r = e.currentTarget.getBoundingClientRect(), side = e.clientY < r.top + r.height / 2 ? "before" : "after";
            if (!over || over.i !== i || over.side !== side) os[1]({ i: i, side: side });
          },
          onDrop: function (e) {
            if (dragging == null) return;
            e.preventDefault();
            var to = over ? (over.side === "after" ? over.i + 1 : over.i) : i;
            if (to > dragging) to--;
            if (to !== dragging) onMove(dragging, to);
            clear();
          },
          onDragEnd: clear,
        };
      },
      dropClass: function (i) { return dragging != null && over && over.i === i && dragging !== i ? "is-drop-" + over.side : dragging === i ? "is-dragging" : null; },
    };
  }
  function moveItem(list, from, to) { var a = list.slice(), x = a.splice(from, 1)[0]; a.splice(to, 0, x); return a; }
  function Announcer(p) { return h("p", { className: "ot-visually-hidden", role: "status", "aria-live": "polite" }, p.text || ""); }

  // ---- ListEditor: a short list of lines (what they'll learn, the kit), added, reordered and removed ----
  function ListEditor(p) {
    var items = p.items || [], base = uid("le"), refs = useRef([]), focusNext = useRef(null), said = useState("");
    useEffect(function () {
      if (focusNext.current == null) return;
      var el = refs.current[focusNext.current]; focusNext.current = null;
      if (el) el.focus();
    });
    function set(next, focus, msg) { if (focus != null) focusNext.current = focus; if (msg) said[1](msg); p.onChange(next); }
    var drag = useReorder(function (from, to) { set(moveItem(items, from, to), to, "Moved to position " + (to + 1)); });
    var full = p.max && items.length >= p.max;
    function name(i) { return p.itemLabel ? p.itemLabel(i) : (plain(p.label) || "Item") + " " + (i + 1); }
    return h("div", { className: cx("ot-field", "ot-listed", p.error && "ot-field--error", p.className), role: "group", "aria-labelledby": base + "-label" },
      h("p", { className: "ot-field__label", id: base + "-label" }, p.label, p.optional ? h("span", { className: "ot-field__optional" }, " (optional)") : null),
      p.hint ? h("p", { className: "ot-field__hint", id: base + "-hint" }, p.hint) : null,
      items.length ? h("ol", { className: "ot-listed__list" }, items.map(function (it, i) {
        return h("li", Object.assign({ key: i, className: cx("ot-listed__row", drag.dropClass(i)) }, drag.row(i)),
          h("span", Object.assign({ className: "ot-listed__grip", "aria-hidden": true, title: "Drag to move" }, drag.handle(i)), dotIcon("grip", 18)),
          h("div", { className: "ot-input ot-listed__input" },
            h("input", {
              ref: function (el) { refs.current[i] = el; }, type: "text", value: it, placeholder: p.placeholder, "aria-label": name(i), maxLength: p.maxLength,
              onChange: function (e) { var next = items.slice(); next[i] = e.target.value; p.onChange(next); },
              onKeyDown: function (e) {
                if (e.key === "Enter" && !full) { e.preventDefault(); var next = items.slice(); next.splice(i + 1, 0, ""); set(next, i + 1); }
                else if (e.key === "Backspace" && !it && items.length > 1) { e.preventDefault(); set(items.filter(function (x, j) { return j !== i; }), Math.max(0, i - 1)); }
                else if (e.altKey && e.key === "ArrowUp" && i > 0) { e.preventDefault(); set(moveItem(items, i, i - 1), i - 1, "Moved up to position " + i); }
                else if (e.altKey && e.key === "ArrowDown" && i < items.length - 1) { e.preventDefault(); set(moveItem(items, i, i + 1), i + 1, "Moved down to position " + (i + 2)); }
              },
            })),
          h(Menu, { label: "More for " + name(i).toLowerCase(), triggerIconOnly: true, triggerIcon: "more", triggerVariant: "text", triggerSize: "sm", align: "end", className: "ot-listed__menu",
            items: [
              { label: "Move up", icon: "arrow-up", onSelect: function () { if (i > 0) set(moveItem(items, i, i - 1), i - 1, "Moved up"); } },
              { label: "Move down", icon: "arrow-down", onSelect: function () { if (i < items.length - 1) set(moveItem(items, i, i + 1), i + 1, "Moved down"); } },
              { divider: true },
              { label: "Remove", icon: "trash", danger: true, onSelect: function () { set(items.filter(function (x, j) { return j !== i; }), Math.max(0, i - 1), "Removed"); } },
            ] }));
      })) : null,
      full ? null : h(Button, { variant: "text", size: "sm", icon: "plus", className: "ot-listed__add", onClick: function () { set(items.concat([""]), items.length); } }, p.addLabel || "Add another"),
      p.error ? h("p", { className: "ot-field__error" }, h(Icon, { name: "warning", size: 16 }), h("span", null, p.error)) : null,
      h(Announcer, { text: said[0] }));
  }

  // ---- InlineAdd: a button that becomes a title field (a new chapter, a new lesson) ----
  function InlineAdd(p) {
    var os = useState(false), open = os[0], vs = useState(""), bs = useState(false), es = useState(null), input = useRef(null);
    useEffect(function () { if (open && input.current) input.current.focus(); }, [open]);
    function close() { os[1](false); vs[1](""); es[1](null); }
    function save(e) {
      if (e) e.preventDefault();
      var t = vs[0].trim();
      if (!t) { es[1](p.emptyError || "Give it a title"); return; }
      bs[1](true); es[1](null);
      Promise.resolve(p.onAdd(t)).then(function (res) {
        bs[1](false);
        if (res && res.error) es[1](res.error); else { vs[1](""); if (!p.keepOpen) close(); else if (input.current) input.current.focus(); }
      }, function (err) { bs[1](false); es[1]((err && err.message) || "That didn't save. Try again."); });
    }
    if (!open) return h(Button, { variant: p.variant || "text", size: p.size || "sm", icon: "plus", className: cx("ot-inlineadd__open", p.className), onClick: function () { os[1](true); } }, p.label);
    return h("form", { className: cx("ot-inlineadd", p.className), onSubmit: save, onKeyDown: function (e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } } },
      h(TextField, { label: p.fieldLabel, value: vs[0], placeholder: p.placeholder, error: es[0], autoComplete: "off", maxLength: 140,
        onChange: function (e) { vs[1](e.target.value); es[1](null); } }),
      h("div", { className: "ot-inlineadd__actions" },
        h(Button, { variant: "text", size: "sm", onClick: close, disabled: bs[0] }, "Cancel"),
        h(Button, { size: "sm", type: "submit", loading: bs[0] }, p.saveLabel || "Add")));
  }

  // ---- OutlineEditor: a course's chapters and lessons, renamed, added, reordered and moved ----
  var LESSON_KIND_LABEL = { reading: "Reading", video: "Video", quiz: "Quiz", assignment: "Assignment", code: "Coding exercise", live: "Live class" };
  function OutlineEditor(p) {
    var chapters = p.chapters || [], said = useState(""), rn = useState(null), renaming = rn[0], rv = useState("");
    var cdrag = useReorder(function (from, to) { if (p.onMoveChapter) p.onMoveChapter(chapters[from].id, to); said[1]("Chapter moved to position " + (to + 1)); });
    var ld = useState(null), ldrag = ld[0], lo = useState(null), lover = lo[0], la = useState(null), larmed = la[0];
    function moveLesson(lesson, fromC, toC, toIndex, msg) {
      if (p.onMoveLesson) p.onMoveLesson(lesson.id, chapters[fromC].id, chapters[toC].id, toIndex);
      said[1](msg || "Moved \u201c" + lesson.title + "\u201d to chapter " + (toC + 1) + ", lesson " + (toIndex + 1));
    }
    function clearL() { ld[1](null); lo[1](null); la[1](null); }
    function lessonRow(c, ci, l, li) {
      var dragged = ldrag && ldrag.c === ci && ldrag.l === li;
      var dropCls = ldrag && lover && lover.c === ci && lover.l === li && !dragged ? "is-drop-" + lover.side : dragged ? "is-dragging" : null;
      var others = chapters.map(function (x, j) { return j === ci ? null : { label: "Move to chapter " + (j + 1) + ": " + x.title, icon: "arrow-right", onSelect: function () { moveLesson(l, ci, j, (x.lessons || []).length); } }; }).filter(Boolean);
      var number = (ci + 1) + "." + (li + 1);
      return h("li", {
        key: l.id, className: cx("ot-outed__lesson", dropCls, p.pending && p.pending.indexOf(l.id) >= 0 && "is-pending"),
        draggable: larmed === l.id || undefined,
        onDragStart: function (e) { if (larmed !== l.id) return; e.stopPropagation(); ld[1]({ c: ci, l: li, lesson: l }); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", l.title); } catch (x) { /* */ } },
        onDragOver: function (e) {
          if (!ldrag) return;
          e.preventDefault(); e.stopPropagation();
          var r = e.currentTarget.getBoundingClientRect(), side = e.clientY < r.top + r.height / 2 ? "before" : "after";
          if (!lover || lover.c !== ci || lover.l !== li || lover.side !== side) lo[1]({ c: ci, l: li, side: side });
        },
        onDrop: function (e) {
          if (!ldrag) return;
          e.preventDefault(); e.stopPropagation();
          var to = lover && lover.c === ci ? (lover.side === "after" ? lover.l + 1 : lover.l) : li;
          if (ldrag.c === ci && to > ldrag.l) to--;
          if (ldrag.c !== ci || to !== ldrag.l) moveLesson(ldrag.lesson, ldrag.c, ci, to);
          clearL();
        },
        onDragEnd: clearL,
      },
        h("span", { className: "ot-outed__grip", "aria-hidden": true, title: "Drag to move", onPointerDown: function (e) { if (e.pointerType === "mouse") la[1](l.id); }, onPointerUp: function () { if (!ldrag) la[1](null); } }, dotIcon("grip", 18)),
        h("span", { className: "ot-outed__kind", "aria-hidden": true }, h(Icon, { name: l.kind || "reading", size: 20 })),
        h("span", { className: "ot-outed__no" }, number),
        h("span", { className: "ot-outed__ltext" },
          h(l.href ? "a" : "span", { className: "ot-outed__ltitle", href: l.href, onClick: l.href && p.onOpenLesson ? function (e) { p.onOpenLesson(l, e); } : undefined },
            h("span", { className: "ot-visually-hidden" }, (LESSON_KIND_LABEL[l.kind] || "Reading") + ": "), l.title),
          l.meta ? h("span", { className: "ot-outed__lmeta" }, l.meta) : null),
        l.preview ? h(Badge, { tone: "neutral", icon: "eye", className: "ot-outed__badge" }, "Free preview") : null,
        l.draft ? h(Badge, { tone: "warning", className: "ot-outed__badge" }, "Empty") : null,
        h(Menu, { label: "More for lesson " + number, triggerIconOnly: true, triggerIcon: "more", triggerVariant: "text", triggerSize: "sm", align: "end", className: "ot-outed__menu",
          items: [].concat(
            l.href ? [{ label: "Edit lesson", icon: "edit", href: l.href, onSelect: p.onOpenLesson ? function () { p.onOpenLesson(l); } : undefined }] : [],
            p.onTogglePreview ? [{ label: l.preview ? "Stop the free preview" : "Make it a free preview", icon: "eye", onSelect: function () { p.onTogglePreview(l.id, !l.preview); } }] : [],
            [{ label: "Move up", icon: "arrow-up", onSelect: function () {
              if (li > 0) moveLesson(l, ci, ci, li - 1); else if (ci > 0) moveLesson(l, ci, ci - 1, (chapters[ci - 1].lessons || []).length);
            } },
            { label: "Move down", icon: "arrow-down", onSelect: function () {
              if (li < (c.lessons || []).length - 1) moveLesson(l, ci, ci, li + 1); else if (ci < chapters.length - 1) moveLesson(l, ci, ci + 1, 0);
            } }],
            others,
            p.onDeleteLesson ? [{ divider: true }, { label: "Delete lesson", icon: "trash", danger: true, onSelect: function () { p.onDeleteLesson(l, c); } }] : [])
        }));
    }
    return h("div", { className: cx("ot-outed", p.className) },
      chapters.length ? h("ol", { className: "ot-outed__chapters", "aria-label": p.label || "Chapters" }, chapters.map(function (c, ci) {
        var lessons = c.lessons || [], editing = renaming === c.id;
        return h("li", Object.assign({ key: c.id, className: cx("ot-outed__chapter", cdrag.dropClass(ci)) }, cdrag.row(ci)),
          h("div", { className: "ot-outed__head",
            onDragOver: ldrag && !lessons.length ? function (e) { e.preventDefault(); lo[1]({ c: ci, l: 0, side: "before" }); } : undefined,
            onDrop: ldrag && !lessons.length ? function (e) { e.preventDefault(); moveLesson(ldrag.lesson, ldrag.c, ci, 0); clearL(); } : undefined },
            h("span", Object.assign({ className: "ot-outed__grip", "aria-hidden": true, title: "Drag to move" }, cdrag.handle(ci)), dotIcon("grip", 18)),
            editing ? h("form", { className: "ot-outed__rename", onSubmit: function (e) {
              e.preventDefault(); var t = rv[0].trim(); if (!t) return;
              Promise.resolve(p.onRenameChapter && p.onRenameChapter(c.id, t)).then(function () { rn[1](null); });
            } },
              h(TextField, { label: "Chapter title", value: rv[0], autoComplete: "off", maxLength: 140, onChange: function (e) { rv[1](e.target.value); } }),
              h("div", { className: "ot-inlineadd__actions" }, h(Button, { variant: "text", size: "sm", onClick: function () { rn[1](null); } }, "Cancel"), h(Button, { size: "sm", type: "submit" }, "Save")))
              : h("div", { className: "ot-outed__htext" },
                h("p", { className: "ot-outed__eyebrow" }, "Chapter " + (ci + 1)),
                h(p.chapterTitleAs || "h3", { className: "ot-outed__ctitle" }, c.title),
                h("p", { className: "ot-outed__cmeta" }, lessons.length === 1 ? "1 lesson" : lessons.length + " lessons")),
            editing ? null : h(Menu, { label: "More for chapter " + (ci + 1), triggerIconOnly: true, triggerIcon: "more", triggerVariant: "text", triggerSize: "sm", align: "end",
              items: [].concat(
                p.onRenameChapter ? [{ label: "Rename", icon: "edit", onSelect: function () { rv[1](c.title); rn[1](c.id); } }] : [],
                [{ label: "Move up", icon: "arrow-up", onSelect: function () { if (ci > 0 && p.onMoveChapter) { p.onMoveChapter(c.id, ci - 1); said[1]("Chapter moved up"); } } },
                { label: "Move down", icon: "arrow-down", onSelect: function () { if (ci < chapters.length - 1 && p.onMoveChapter) { p.onMoveChapter(c.id, ci + 1); said[1]("Chapter moved down"); } } }],
                p.onDeleteChapter ? [{ divider: true }, { label: "Delete chapter", icon: "trash", danger: true, onSelect: function () { p.onDeleteChapter(c); } }] : []) })),
          lessons.length ? h("ol", { className: "ot-outed__lessons" }, lessons.map(function (l, li) { return lessonRow(c, ci, l, li); }))
            : h("p", { className: "ot-outed__none" }, "No lessons yet."),
          p.onAddLesson ? h(InlineAdd, { label: "Add a lesson", fieldLabel: "New lesson's title", placeholder: "Why the pencil bends", saveLabel: "Add lesson", className: "ot-outed__add",
            onAdd: function (t) { return p.onAddLesson(c.id, t); } }) : null);
      })) : h(EmptyState, { compact: true, icon: "courses", title: "No chapters yet" }, "Start with a chapter, then add its lessons."),
      p.onAddChapter ? h(InlineAdd, { label: "Add a chapter", fieldLabel: "New chapter's title", placeholder: "Refraction", saveLabel: "Add chapter", variant: "secondary", size: "md", className: "ot-outed__addchapter",
        onAdd: function (t) { return p.onAddChapter(t); } }) : null,
      h(Announcer, { text: said[0] }));
  }

  // ---- BlockEditor: a lesson's content as blocks, saved as Editor.js data ----
  function blockId() { return Math.random().toString(36).slice(2, 12); }
  var CALLOUT_WORDS = { tip: "Tip", note: "Note", warning: "Warning", safety: "Safety" };
  var BLOCK_KINDS = [
    { kind: "paragraph", label: "Text", icon: "text", text: "Plain paragraphs" },
    { kind: "header", label: "Heading", icon: "heading", text: "A section title" },
    { kind: "bullets", label: "Bulleted list", icon: "list" },
    { kind: "numbers", label: "Numbered list", icon: "list-ordered" },
    { kind: "callout", label: "Tip, note or safety", icon: "bulb" },
    { kind: "image", label: "Picture", icon: "image" },
    { kind: "upload", label: "Video, sound or file", icon: "upload" },
    { kind: "embed", label: "YouTube, Vimeo or a page", icon: "video" },
    { kind: "codeBox", label: "Code", icon: "code" },
    { kind: "math", label: "Maths", icon: "sigma" },
    { kind: "table", label: "Table", icon: "table" },
    { kind: "quiz", label: "Quiz", icon: "quiz" },
    { kind: "assignment", label: "Assignment", icon: "assignment" },
    { kind: "program", label: "Coding exercise", icon: "code" },
  ];
  var CODE_LANGS = [["python", "Python"], ["arduino", "Arduino"], ["cpp", "C++"], ["c", "C"], ["javascript", "JavaScript"], ["html", "HTML"], ["css", "CSS"], ["bash", "Terminal"], ["json", "JSON"], ["plaintext", "Text"]];
  function newBlock(kind) {
    var id = blockId();
    switch (kind) {
      case "header": return { id: id, type: "header", data: { text: "", level: 2 } };
      case "bullets": return { id: id, type: "list", data: { style: "unordered", items: [{ content: "", items: [] }] } };
      case "numbers": return { id: id, type: "list", data: { style: "ordered", items: [{ content: "", items: [] }] } };
      case "callout": return { id: id, type: "callout", data: { tone: "tip", text: "" } };
      case "math": return { id: id, type: "math", data: { latex: "" } };
      case "codeBox": return { id: id, type: "codeBox", data: { code: "", language: "python" } };
      case "table": return { id: id, type: "table", data: { withHeadings: true, content: [["", ""], ["", ""]] } };
      case "image": return { id: id, type: "image", data: { url: "", caption: "" } };
      case "upload": return { id: id, type: "upload", data: { file_url: "", file_type: "" } };
      case "embed": return { id: id, type: "embed", data: { service: "", source: "", embed: "", caption: "" } };
      case "quiz": return { id: id, type: "quiz", data: {} };
      case "assignment": return { id: id, type: "assignment", data: {} };
      case "program": return { id: id, type: "program", data: {} };
      default: return { id: id, type: "paragraph", data: { text: "" } };
    }
  }
  // Frappe Learning's blocks in, the editor's own (callout and maths are paragraphs underneath) out
  function editorBlocks(data) {
    var blocks = (data && data.blocks) || [];
    var out = blocks.map(function (b) {
      var d = b.data || {}, id = b.id || blockId();
      if (b.type === "paragraph") {
        var lead = CALLOUT_LEAD.exec(d.text || "");
        if (lead) return { id: id, type: "callout", data: { tone: CALLOUT_TONES[lead[1].toLowerCase()] || "tip", text: (d.text || "").slice(lead[0].length) } };
        var m = /^\s*\$\$([\s\S]+)\$\$\s*$/.exec(stripTags(d.text || ""));
        if (m) return { id: id, type: "math", data: { latex: m[1].trim() } };
      }
      return { id: id, type: b.type, data: JSON.parse(JSON.stringify(d)), tunes: b.tunes };
    });
    return out.length ? out : [newBlock("paragraph")];
  }
  function isEmptyHtml(html) { return !stripTags(html || "").replace(/&nbsp;|\u00a0/g, " ").trim() && !/<img/i.test(html || ""); }
  function savedBlocks(blocks) {
    return blocks.map(function (b) {
      var d = b.data || {}, out;
      if (b.type === "callout") out = { id: b.id, type: "paragraph", data: { text: "<b>" + (CALLOUT_WORDS[d.tone] || "Tip") + ":</b> " + (d.text || "") } };
      else if (b.type === "math") out = { id: b.id, type: "paragraph", data: { text: "$$" + (d.latex || "") + "$$" } };
      else out = { id: b.id, type: b.type, data: d };
      if (b.tunes) out.tunes = b.tunes;
      return out;
    }).filter(function (b) {
      var d = b.data;
      if (b.type === "paragraph" || b.type === "header") return !isEmptyHtml(d.text);
      if (b.type === "list") return (d.items || []).some(function (it) { return !isEmptyHtml(typeof it === "string" ? it : it.content); });
      if (b.type === "image") return !!d.url;
      if (b.type === "upload") return !!d.file_url;
      if (b.type === "embed") return !!d.embed;
      if (b.type === "quiz") return !!d.quiz;
      if (b.type === "assignment") return !!d.assignment;
      if (b.type === "program") return !!d.exercise;
      if (b.type === "codeBox") return !!(d.code || "").trim();
      return true;
    });
  }
  var EMBED_RULES = [
    ["youtube", /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/i, function (m) { return m[1]; }],
    ["vimeo", /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/i, function (m) { return "https://player.vimeo.com/video/" + m[1] + (m[2] ? "?h=" + m[2] : ""); }],
    ["slides", /^https:\/\/docs\.google\.com\/presentation\/d\/([\w-]+)/i, function (m) { return "https://docs.google.com/presentation/d/" + m[1] + "/embed"; }],
    ["codepen", /^https?:\/\/codepen\.io\/([^/?#&]+)\/pen\/([^/?#&]+)/i, function (m) { return "https://codepen.io/" + m[1] + "/embed/" + m[2]; }],
  ];
  function parseEmbed(url) {
    var u = String(url || "").trim();
    for (var i = 0; i < EMBED_RULES.length; i++) {
      var m = EMBED_RULES[i][1].exec(u);
      if (m) return { service: EMBED_RULES[i][0], source: u, embed: EMBED_RULES[i][2](m) };
    }
    return null;
  }
  function caretAt(el, end) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
    var r = sel.getRangeAt(0), probe = document.createRange();
    probe.selectNodeContents(el);
    if (end) probe.setStart(r.endContainer, r.endOffset); else probe.setEnd(r.startContainer, r.startOffset);
    return !probe.toString().replace(/\u200b/g, "").length && (end || !/<(img)/i.test(probe.cloneContents().textContent || ""));
  }
  function placeCaret(el, atEnd) {
    if (!el) return;
    el.focus();
    var sel = window.getSelection(), r = document.createRange();
    r.selectNodeContents(el); r.collapse(!atEnd);
    sel.removeAllRanges(); sel.addRange(r);
  }

  // one contenteditable: set from data once, then read on each change
  function Editable(p) {
    var ref = useRef(null);
    useLayoutEffect(function () { if (ref.current) ref.current.innerHTML = sanitizeHtml(p.html || ""); }, [p.resetKey]);
    useEffect(function () { if (p.register) p.register(ref.current); });
    return h(p.tag || "div", {
      ref: ref, className: cx("ot-bed__text", p.className), contentEditable: !p.readOnly, suppressContentEditableWarning: true,
      role: "textbox", "aria-multiline": p.multiline !== false, "aria-label": p.label, "data-placeholder": p.placeholder || "",
      onInput: function () { p.onInput(ref.current.innerHTML, ref.current); }, onKeyDown: p.onKeyDown, onFocus: p.onFocus, onPaste: p.onPaste,
    });
  }
  function listHtml(items) {
    return (items || []).map(function (it) {
      var c = typeof it === "string" ? it : it.content || "", kids = it && it.items && it.items.length ? "<ul>" + listHtml(it.items) + "</ul>" : "";
      return "<li>" + c + kids + "</li>";
    }).join("") || "<li></li>";
  }
  function listItems(el) {
    return Array.prototype.filter.call(el.children, function (n) { return n.tagName === "LI"; }).map(function (li) {
      var nested = li.querySelector(":scope > ul, :scope > ol"), copy = li.cloneNode(true);
      Array.prototype.forEach.call(copy.querySelectorAll(":scope > ul, :scope > ol"), function (n) { n.remove(); });
      return { content: copy.innerHTML.replace(/<br\s*\/?>$/, ""), items: nested ? listItems(nested) : [] };
    });
  }

  function BlockEditor(p) {
    var init = useState(function () { return editorBlocks(p.value); }), bs = useState(init[0]), blocks = bs[0];
    var refs = useRef({}), focusReq = useRef(null), last = useRef(null), fs = useState(null), focused = fs[0];
    var us = useState(null), undo = us[0], said = useState(""), base = uid("bed");
    var version = (p.value && p.value.version) || "2.29.1";
    useEffect(function () {
      var f = focusReq.current;
      if (!f) return;
      focusReq.current = null;
      var el = refs.current[f.id];
      if (el && el.isContentEditable) { placeCaret(el, f.atEnd); return; }
      if (!el) return;
      var target = el.matches && el.matches("button, input, textarea, select, a[href]") ? el : el.querySelector("[contenteditable=true], input, textarea, select, button");
      if (target && target.isContentEditable) placeCaret(target, f.atEnd); else (target || el).focus();
    });
    useEffect(function () { if (!undo) return; var t = setTimeout(function () { us[1](null); }, 8000); return function () { clearTimeout(t); }; }, [undo]);
    function commit(next, focus) {
      if (focus) focusReq.current = focus;
      bs[1](next);
      var out = { time: Date.now(), blocks: savedBlocks(next), version: version };
      last.current = out;
      if (p.onChange) p.onChange(out);
    }
    function update(id, patch, replace) {
      commit(blocks.map(function (b) { return b.id === id ? Object.assign({}, b, replace ? patch : { data: Object.assign({}, b.data, patch) }) : b; }));
    }
    function insertAfter(i, block, focusEnd) { var next = blocks.slice(); next.splice(i + 1, 0, block); commit(next, { id: block.id, atEnd: !!focusEnd }); said[1](kindLabel(block) + " added"); }
    function remove(i, keepFocus) {
      var b = blocks[i], next = blocks.filter(function (x, j) { return j !== i; });
      if (!next.length) next = [newBlock("paragraph")];
      var to = next[Math.max(0, i - 1)];
      commit(next, keepFocus ? { id: to.id, atEnd: true } : null);
      if (!isBlank(b)) { us[1]({ block: b, index: i }); said[1](kindLabel(b) + " deleted"); }
    }
    function move(i, to) { if (to < 0 || to >= blocks.length) return; commit(moveItem(blocks, i, to), { id: blocks[i].id + "-menu" }); said[1]("Moved to position " + (to + 1) + " of " + blocks.length); }
    function turnInto(i, kind) {
      var b = blocks[i], html = b.type === "list" ? (b.data.items || []).map(function (it) { return typeof it === "string" ? it : it.content; }).join("<br>") : b.data.text || "";
      var nb = newBlock(kind); nb.id = b.id;
      if (kind === "paragraph" || kind === "header" || kind === "callout") nb.data.text = html;
      else if (kind === "bullets" || kind === "numbers") nb.data.items = html.split(/<br\s*\/?>/i).map(function (x) { return { content: x, items: [] }; });
      var next = blocks.slice(); next[i] = nb;
      commit(next, { id: nb.id, atEnd: true });
    }
    var drag = useReorder(function (from, to) { move(from, to); });
    function isBlank(b) { var s = savedBlocks([b]); return !s.length; }
    function kindLabel(b) {
      var k = b.type === "list" ? (b.data.style === "ordered" ? "numbers" : "bullets") : b.type;
      var f = BLOCK_KINDS.filter(function (x) { return x.kind === k; })[0];
      return f ? f.label : "Block";
    }
    function register(id) { return function (el) { refs.current[id] = el; }; }
    function textKeys(i) {
      return function (e) {
        var b = blocks[i], el = e.currentTarget;
        if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") { e.preventDefault(); linkFor(el); return; }
        if (b.type === "list") {
          if (e.key === "Enter" && !e.shiftKey) {
            var sel = window.getSelection(), li = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
            li = li && li.closest ? li.closest("li") : null;
            if (li && li === el.lastElementChild && !li.textContent.trim() && el.children.length > 1) {
              e.preventDefault(); li.remove();
              var para = newBlock("paragraph"), after = blocks.slice();
              after[i] = Object.assign({}, b, { data: Object.assign({}, b.data, { items: listItems(el) }) });
              after.splice(i + 1, 0, para);
              commit(after, { id: para.id });
            }
          }
          if (e.key === "Backspace" && !el.textContent.trim() && el.children.length <= 1) { e.preventDefault(); remove(i, true); }
          return;
        }
        if (e.key === "Enter" && !e.shiftKey && b.type !== "callout") {
          e.preventDefault();
          var s = window.getSelection(), rest = "";
          if (s && s.rangeCount) {
            var r = s.getRangeAt(0); r.deleteContents();
            var tail = document.createRange(); tail.setStart(r.endContainer, r.endOffset); tail.setEnd(el, el.childNodes.length);
            var frag = tail.extractContents(), box = document.createElement("div"); box.appendChild(frag); rest = box.innerHTML;
          }
          var keep = el.innerHTML, nb = newBlock("paragraph"); nb.data.text = isEmptyHtml(rest) ? "" : rest;
          var next = blocks.slice(); next[i] = Object.assign({}, b, { data: Object.assign({}, b.data, { text: keep }) }); next.splice(i + 1, 0, nb);
          commit(next, { id: nb.id, atEnd: false });
          return;
        }
        if (e.key === "Backspace" && isEmptyHtml(el.innerHTML) && blocks.length > 1) { e.preventDefault(); remove(i, true); return; }
        if (e.key === "ArrowUp" && i > 0 && caretAt(el, false)) { var pe = refs.current[blocks[i - 1].id]; if (pe && pe.isContentEditable) { e.preventDefault(); placeCaret(pe, true); } }
        if (e.key === "ArrowDown" && i < blocks.length - 1 && caretAt(el, true)) { var ne = refs.current[blocks[i + 1].id]; if (ne && ne.isContentEditable) { e.preventDefault(); placeCaret(ne, false); } }
      };
    }
    function plainPaste(e) {
      var text = e.clipboardData && e.clipboardData.getData("text/plain");
      if (text == null) return;
      e.preventDefault(); document.execCommand("insertText", false, text);
    }
    // inline formatting for the text block being written in
    var ls = useState(null), linking = ls[0], linkRange = useRef(null), le = useState(null);
    function linkFor(el) {
      var sel = window.getSelection();
      linkRange.current = { el: el, range: sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null };
      var a = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      a = a && a.closest ? a.closest("a") : null;
      le[1](null); ls[1]({ url: a ? a.getAttribute("href") || "" : "", existing: !!a });
    }
    function restoreLink() {
      var lr = linkRange.current; if (!lr || !lr.el) return;
      lr.el.focus();
      if (lr.range) { var s = window.getSelection(); s.removeAllRanges(); s.addRange(lr.range); }
    }
    function fireInput() { var lr = linkRange.current; if (lr && lr.el) lr.el.dispatchEvent(new Event("input", { bubbles: true })); }
    function applyLink(e) {
      e.preventDefault();
      var url = (linking.url || "").trim();
      if (url && !/^[a-z][a-z0-9+.\-]*:/i.test(url) && !/^[/#]/.test(url)) url = "https://" + url;
      if (!safeUrl(url, "link")) { le[1]("Use a web address that starts with https://"); return; }
      restoreLink();
      var lr = linkRange.current;
      if (lr.range && lr.range.collapsed) document.execCommand("insertHTML", false, "<a href=\"" + url.replace(/"/g, "&quot;") + "\">" + url.replace(/</g, "&lt;") + "</a>");
      else document.execCommand("createLink", false, url);
      ls[1](null); fireInput();
    }
    function format(cmd) {
      var el = focused && refs.current[focused];
      if (!el || !el.isContentEditable) return;
      if (cmd === "link") { el.focus(); linkFor(el); return; }
      el.focus();
      if (cmd === "code") {
        var sel = window.getSelection(), text = sel ? sel.toString() : "";
        if (text) document.execCommand("insertHTML", false, "<code class=\"inline-code\">" + text.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</code>");
      } else document.execCommand(cmd, false, null);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    var fb = focused ? blocks.filter(function (b) { return b.id === focused; })[0] : null;
    var textish = fb && (fb.type === "paragraph" || fb.type === "header" || fb.type === "list" || fb.type === "callout" || fb.type === "table");
    var fbIndex = fb ? blocks.indexOf(fb) : -1;
    var fbKind = fb ? (fb.type === "list" ? (fb.data.style === "ordered" ? "numbers" : "bullets") : fb.type) : "";
    var addItems = function (i) {
      return BLOCK_KINDS.filter(function (k) { return k.kind !== "quiz" && k.kind !== "assignment" && k.kind !== "program" || p.searchActivities; })
        .map(function (k) { return { label: k.label, icon: k.icon, onSelect: function () { insertAfter(i, newBlock(k.kind)); } }; });
    };

    function renderBlock(b, i) {
      var d = b.data || {}, label = kindLabel(b);
      var focusMe = function () { fs[1](b.id); };
      var body;
      switch (b.type) {
        case "paragraph": case "header":
          body = h(Editable, { register: register(b.id), resetKey: b.id + b.type + (d.level || ""), html: d.text, tag: b.type === "header" ? "h" + Math.min(4, Math.max(2, d.level || 2)) : "p",
            className: b.type === "header" ? "ot-bed__heading" : null, label: b.type === "header" ? "Heading" : "Text",
            placeholder: b.type === "header" ? "Heading" : i === 0 && blocks.length === 1 ? p.placeholder || "Start writing, or add a picture, video or quiz below" : "Write here",
            multiline: b.type !== "header", onFocus: focusMe, onKeyDown: textKeys(i), onPaste: plainPaste,
            onInput: function (html) { update(b.id, { text: html }); } });
          break;
        case "callout":
          body = h("div", { className: cx("ot-bed__callout", "ot-callout", "ot-callout--" + (d.tone || "tip")) },
            h("div", { className: "ot-bed__calloutbar" },
              h(SegmentedControl, { label: "Kind of box", value: d.tone || "tip", onChange: function (v) { update(b.id, { tone: v }); },
                options: [{ value: "tip", label: "Tip" }, { value: "note", label: "Note" }, { value: "warning", label: "Warning" }, { value: "safety", label: "Safety" }] })),
            h(Editable, { register: register(b.id), resetKey: b.id, html: d.text, label: (CALLOUT_WORDS[d.tone] || "Tip") + " text", placeholder: "What should they know?",
              onFocus: focusMe, onKeyDown: textKeys(i), onPaste: plainPaste, onInput: function (html) { update(b.id, { text: html }); } }));
          break;
        case "list":
          body = h(Editable, { register: register(b.id), resetKey: b.id + d.style, html: listHtml(d.items), tag: d.style === "ordered" ? "ol" : "ul", className: "ot-bed__list",
            label: d.style === "ordered" ? "Numbered list" : "Bulleted list", onFocus: focusMe, onKeyDown: textKeys(i), onPaste: plainPaste,
            onInput: function (html, el) { update(b.id, { items: listItems(el) }); } });
          break;
        case "math":
          body = h("div", { className: "ot-bed__pair" },
            h(TextField, { label: "Maths, in LaTeX", multiline: true, rows: 2, value: d.latex || "", spellCheck: false, placeholder: "n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2",
              onChange: function (e) { update(b.id, { latex: e.target.value }); }, className: "ot-bed__mono" }),
            d.latex && p.renderMath ? h(Formula, { html: p.renderMath(d.latex) }) : null);
          break;
        case "codeBox": case "code":
          body = h("div", { className: "ot-bed__code" },
            h(Select, { label: "Language", value: d.language || "python", onChange: function (e) { update(b.id, { language: e.target.value }); }, options: CODE_LANGS.map(function (l) { return { value: l[0], label: l[1] }; }) }),
            h(TextField, { label: "Code", multiline: true, rows: Math.min(18, Math.max(4, String(d.code || "").split("\n").length + 1)), value: d.code || "", spellCheck: false,
              autoCapitalize: "off", onChange: function (e) { update(b.id, { code: e.target.value }); }, className: "ot-bed__mono" }));
          break;
        case "markdown":
          body = h(TextField, { label: "Markdown", multiline: true, rows: 6, value: d.text || "", onChange: function (e) { update(b.id, { text: e.target.value }); }, className: "ot-bed__mono" });
          break;
        case "table": {
          var rows = d.content && d.content.length ? d.content : [[""]], cols = rows[0].length;
          var setCell = function (r, c, v) { var next = rows.map(function (row) { return row.slice(); }); next[r][c] = v; update(b.id, { content: next }); };
          body = h("div", { className: "ot-bed__table" },
            h("div", { className: "ot-bed__tablewrap" }, h("table", null, h("tbody", null, rows.map(function (row, r) {
              return h("tr", { key: r, className: r === 0 && d.withHeadings ? "is-head" : null }, row.map(function (cell, c) {
                return h("td", { key: c }, h("input", { type: "text", value: stripTags(cell), "aria-label": "Row " + (r + 1) + ", column " + (c + 1), onFocus: focusMe,
                  onChange: function (e) { setCell(r, c, e.target.value.replace(/</g, "&lt;")); } }));
              }));
            })))),
            h("div", { className: "ot-bed__tablebar" },
              h(Checkbox, { label: "First row is headings", checked: !!d.withHeadings, onChange: function (e) { update(b.id, { withHeadings: e.target.checked }); } }),
              h(Button, { variant: "text", size: "sm", icon: "plus", onClick: function () { update(b.id, { content: rows.concat([new Array(cols).fill("")]) }); } }, "Row"),
              h(Button, { variant: "text", size: "sm", icon: "plus", onClick: function () { update(b.id, { content: rows.map(function (row) { return row.concat([""]); }) }); } }, "Column"),
              rows.length > 1 ? h(Button, { variant: "text", size: "sm", icon: "minus", onClick: function () { update(b.id, { content: rows.slice(0, -1) }); } }, "Last row") : null,
              cols > 1 ? h(Button, { variant: "text", size: "sm", icon: "minus", onClick: function () { update(b.id, { content: rows.map(function (row) { return row.slice(0, -1); }) }); } }, "Last column") : null));
          break;
        }
        case "image": case "upload":
          body = h(MediaBlock, { block: b, update: function (patch) { update(b.id, patch); }, uploadFile: p.uploadFile, register: register(b.id), onFocus: focusMe });
          break;
        case "embed": {
          var info = d.embed ? { service: d.service, embed: d.embed } : null;
          body = h(EmbedBlock, { block: b, info: info, update: function (patch) { update(b.id, patch); }, register: register(b.id), onFocus: focusMe });
          break;
        }
        case "quiz": case "assignment": case "program":
          body = h(ActivityBlock, { block: b, update: function (patch) { update(b.id, patch, true); }, searchActivities: p.searchActivities, onCreateActivity: p.onCreateActivity,
            activityHref: p.activityHref, activityTitle: p.activityTitle, register: register(b.id), onFocus: focusMe });
          break;
        default:
          body = h(Alert, { tone: "info", title: "This part can't be changed here" }, "It's a \u201c" + b.type + "\u201d block this editor can't change. It stays in the lesson as it is; move it or delete it with its menu.");
      }
      var canTurn = b.type === "paragraph" || b.type === "header" || b.type === "list" || b.type === "callout";
      var menu = h(Menu, { label: label + " options", triggerIconOnly: true, triggerIcon: "grip", triggerVariant: "text", triggerSize: "sm", className: "ot-bed__menu",
        items: [].concat(
          [{ label: "Move up", icon: "arrow-up", onSelect: function () { move(i, i - 1); } }, { label: "Move down", icon: "arrow-down", onSelect: function () { move(i, i + 1); } }],
          canTurn ? [{ divider: true }].concat([["paragraph", "Turn into text", "text"], ["header", "Turn into a heading", "heading"], ["bullets", "Turn into a bulleted list", "list"],
            ["numbers", "Turn into a numbered list", "list-ordered"], ["callout", "Turn into a tip box", "bulb"]].filter(function (t) {
              var cur = b.type === "list" ? (b.data.style === "ordered" ? "numbers" : "bullets") : b.type; return t[0] !== cur;
            }).map(function (t) { return { label: t[1], icon: t[2], onSelect: function () { turnInto(i, t[0]); } }; })) : [],
          [{ divider: true }, { label: "Delete", icon: "trash", danger: true, onSelect: function () { remove(i); } }]) });
      return h("li", Object.assign({ key: b.id, className: cx("ot-bed__block", "ot-bed__block--" + b.type, focused === b.id && "is-focused", drag.dropClass(i)) }, drag.row(i)),
        h("div", Object.assign({ className: "ot-bed__gutter", ref: register(b.id + "-menu") }, drag.handle(i)), menu),
        h("div", { className: "ot-bed__body", onFocus: focusMe }, body),
        h("div", { className: "ot-bed__after" },
          h(Menu, { label: "Add a block after this", triggerIconOnly: true, triggerIcon: "plus", triggerVariant: "text", triggerSize: "sm", className: "ot-bed__plus", items: addItems(i) })));
    }

    return h("div", { className: cx("ot-bed", p.className), "aria-labelledby": p.label ? base + "-l" : undefined, role: "group" },
      p.label ? h("p", { className: "ot-visually-hidden", id: base + "-l" }, p.label) : null,
      h("div", { className: "ot-bed__toolbar", role: "toolbar", "aria-label": "Formatting" },
        h("div", { className: "ot-bed__tools" },
          [["bold", "Bold", "bold", "Control+B"], ["italic", "Italic", "italic", "Control+I"], ["link", "Link", "link", "Control+K"], ["code", "Code in a line", "code"]].map(function (t) {
            return h("button", { key: t[0], type: "button", className: "ot-rt__tool", disabled: !textish || fb.type === "table", title: t[1] + (t[3] ? " (" + t[3].replace("Control", "Ctrl") + ")" : ""),
              "aria-keyshortcuts": t[3], onMouseDown: function (e) { e.preventDefault(); }, onClick: function () { format(t[0]); } },
              h(Icon, { name: t[2], size: 18, strokeWidth: t[0] === "bold" ? 2.4 : undefined }), h("span", { className: "ot-visually-hidden" }, t[1]));
          })),
        fb && fbIndex >= 0 && (fb.type === "paragraph" || fb.type === "header" || fb.type === "list" || fb.type === "callout") ? h("label", { className: "ot-filter ot-bed__kind" },
          h("span", { className: "ot-filter__label" }, "Block"),
          h("span", { className: "ot-filter__value", "aria-hidden": true }, fb.type === "header" ? (fb.data.level === 3 ? "Smaller heading" : "Heading") : kindLabel(fb)),
          h("select", { "aria-label": "Kind of block", value: fb.type === "header" && fb.data.level === 3 ? "header3" : fbKind, onChange: function (e) {
            var v = e.target.value;
            if (v === "header" || v === "header3") {
              if (fb.type === "header") update(fb.id, { level: v === "header3" ? 3 : 2 });
              else { turnInto(fbIndex, "header"); }
            } else turnInto(fbIndex, v);
          } },
            h("option", { value: "paragraph" }, "Text"), h("option", { value: "header" }, "Heading"), h("option", { value: "header3" }, "Smaller heading"),
            h("option", { value: "bullets" }, "Bulleted list"), h("option", { value: "numbers" }, "Numbered list"), h("option", { value: "callout" }, "Tip, note or safety")),
          h(Icon, { name: "chevron-down", size: 16, className: "ot-filter__chevron" })) : null),
      linking ? h("form", { className: "ot-rt__linkbar ot-bed__linkbar", onSubmit: applyLink },
        h(TextField, { label: "Link address", placeholder: "https://", value: linking.url, error: le[0], autoComplete: "off",
          onChange: function (e) { ls[1]({ url: e.target.value, existing: linking.existing }); le[1](null); } }),
        h("div", { className: "ot-rt__linkactions" },
          linking.existing ? h(Button, { variant: "text", size: "sm", onClick: function () { restoreLink(); document.execCommand("unlink", false, null); ls[1](null); fireInput(); } }, "Remove link") : null,
          h(Button, { variant: "text", size: "sm", onClick: function () { ls[1](null); restoreLink(); } }, "Cancel"),
          h(Button, { size: "sm", type: "submit" }, "Add link"))) : null,
      h("ol", { className: "ot-bed__blocks" }, blocks.map(renderBlock)),
      h("div", { className: "ot-bed__end" },
        h(Menu, { label: "Add a block", triggerIcon: "plus", triggerVariant: "secondary", items: addItems(blocks.length - 1) })),
      undo ? h(Toast, { className: "ot-bed__undo", title: kindLabel(undo.block) + " deleted", action: { label: "Undo", onClick: function () {
        var next = blocks.slice(); next.splice(Math.min(undo.index, next.length), 0, undo.block); us[1](null); commit(next, { id: undo.block.id, atEnd: true }); said[1]("Restored");
      } }, onClose: function () { us[1](null); } }) : null,
      h(Announcer, { text: said[0] }));
  }

  // a picture, or a video, sound or other file, uploaded to Frappe
  function MediaBlock(p) {
    var b = p.block, d = b.data || {}, image = b.type === "image", url = image ? d.url : d.file_url;
    var ss = useState({ state: "empty" }), up = ss[0];
    var type = String(image ? "" : d.file_type || String(url || "").split("?")[0].split(".").pop()).toLowerCase();
    function pick(file) {
      if (!p.uploadFile) { ss[1]({ state: "failed", name: file.name, size: file.size, error: "Uploading isn't set up here." }); return; }
      ss[1]({ state: "uploading", name: file.name, size: file.size, progress: 0, file: file });
      Promise.resolve(p.uploadFile(file, function (pct) { ss[1](function (s) { return Object.assign({}, s, { progress: pct }); }); })).then(function (res) {
        var fileUrl = res && (res.file_url || res.url);
        if (!fileUrl) throw new Error("No address came back for the file.");
        ss[1]({ state: "empty" });
        if (image) p.update({ url: fileUrl }); else p.update({ file_url: fileUrl, file_type: String(res.file_type || fileUrl.split(".").pop()).toLowerCase() });
      }).catch(function (e) { ss[1]({ state: "failed", name: file.name, size: file.size, file: file, error: (e && e.message) || "The upload didn't finish." }); });
    }
    if (!url) {
      if (up.state !== "empty") return h(FileUpload, { label: image ? "Picture" : "Video, sound or file", state: up.state, fileName: up.name, fileSize: up.size, progress: up.progress,
        error: up.error, onRetry: function () { if (up.file) pick(up.file); }, onRemove: function () { ss[1]({ state: "empty" }); } });
      return h("div", { className: "ot-bed__media", ref: p.register, tabIndex: -1 },
        h(FileUpload, { label: image ? "Picture" : "Video, sound or file", accept: image ? "image/*" : "video/*,audio/*,.pdf,.zip,.ino,.py,.stl,.docx,.pptx,.xlsx",
          maxSize: image ? 10485760 : 524288000, hint: image ? "JPG, PNG, GIF or WebP, up to 10 MB." : "MP4 or WebM video, MP3 sound, PDF, or a project file, up to 500 MB.", onPick: pick }),
        image ? h(LinkPaste, { label: "Or paste the picture's address", onUse: function (u) { p.update({ url: u }); }, kind: "image", onFocus: p.onFocus }) : null);
    }
    var preview = image || IMAGE_TYPES[type] ? h("img", { className: "ot-bed__img", src: safeUrl(url, "image"), alt: "" })
      : VIDEO_TYPES[type] ? h("video", { className: "ot-bed__video", src: safeUrl(url, "media"), controls: true, preload: "metadata" })
      : AUDIO_TYPES[type] ? h("audio", { className: "ot-audio", src: safeUrl(url, "media"), controls: true, preload: "metadata" })
      : h(FileBlock, { name: String(url).split("/").pop(), href: url });
    return h("div", { className: "ot-bed__media", ref: p.register, tabIndex: -1 },
      preview,
      image ? h(TextField, { label: "Caption", optional: true, value: stripTags(d.caption || ""), onFocus: p.onFocus, onChange: function (e) { p.update({ caption: e.target.value.replace(/</g, "&lt;") }); },
        hint: "Also read out to students who can't see the picture." }) : null,
      h("div", { className: "ot-bed__mediabar" },
        h(Button, { variant: "text", size: "sm", icon: "upload", onClick: function () { if (image) p.update({ url: "" }); else p.update({ file_url: "", file_type: "" }); } }, "Replace")));
  }
  function LinkPaste(p) {
    var vs = useState(""), es = useState(null);
    function use(e) {
      e.preventDefault();
      var u = vs[0].trim();
      if (!safeUrl(u, p.kind || "link") || !/^https?:/i.test(u)) { es[1]("Use an address that starts with https://"); return; }
      p.onUse(u);
    }
    return h("form", { className: "ot-bed__paste", onSubmit: use },
      h(TextField, { label: p.label, placeholder: p.placeholder || "https://", value: vs[0], error: es[0] || p.error, autoComplete: "off", onFocus: p.onFocus, onChange: function (e) { vs[1](e.target.value); es[1](null); } }),
      h(Button, { variant: "secondary", type: "submit" }, p.useLabel || "Use it"));
  }
  function EmbedBlock(p) {
    var b = p.block, d = b.data || {}, es = useState(null);
    if (!d.embed) return h("div", { className: "ot-bed__media", ref: p.register, tabIndex: -1 },
      h(LinkPaste, { label: "Address of the video or page", placeholder: "https://www.youtube.com/watch?v=...", useLabel: "Show it", error: es[0], onFocus: p.onFocus,
        onUse: function (u) { var e = parseEmbed(u); if (!e) { es[1]("That isn't a YouTube, Vimeo, Google Slides or CodePen address. For anything else, add a link in the text."); return; } p.update(e); } }),
      h("p", { className: "ot-bed__note" }, "YouTube, Vimeo, Google Slides and CodePen show inside the lesson."));
    return h("div", { className: "ot-bed__media", ref: p.register, tabIndex: -1 },
      h(Embed, { service: d.service, src: embedSrc(d), href: d.source, title: d.caption ? stripTags(d.caption) : undefined }),
      h(TextField, { label: "Caption", optional: true, value: stripTags(d.caption || ""), onFocus: p.onFocus, onChange: function (e) { p.update({ caption: e.target.value.replace(/</g, "&lt;") }); } }),
      h("div", { className: "ot-bed__mediabar" }, h(Button, { variant: "text", size: "sm", icon: "edit", onClick: function () { p.update({ service: "", source: "", embed: "" }); } }, "Change the address")));
  }
  var ACTIVITY_FIELD = { quiz: "quiz", assignment: "assignment", program: "exercise" };
  var ACTIVITY_WORD = { quiz: ["Quiz", "quiz"], assignment: ["Assignment", "assignment"], program: ["Coding exercise", "coding exercise"] };
  function ActivityBlock(p) {
    var b = p.block, field = ACTIVITY_FIELD[b.type], name = (b.data || {})[field], words = ACTIVITY_WORD[b.type];
    var cs = useState(false), creating = cs[0], ce = useState(null);
    var title = name ? (p.activityTitle ? p.activityTitle(b.type, name) : null) || (b.data && b.data.title) || name : null;
    if (!name) return h("div", { className: "ot-bed__activity", ref: p.register, tabIndex: -1 },
      h(Combobox, { label: "Which " + words[1] + "?", icon: b.type === "program" ? "code" : b.type, minChars: 0, placeholder: "Search by title", onFocus: p.onFocus,
        onSearch: function (q) { return p.searchActivities(b.type, q); }, value: null,
        onChange: function (o) { if (o) { var data = {}; data[field] = o.value; data.title = o.label; p.update({ id: b.id, type: b.type, data: data }); } } }),
      p.onCreateActivity ? h("div", { className: "ot-bed__mediabar" },
        h(Button, { variant: "text", size: "sm", icon: "plus", loading: creating, onClick: function () {
          cs[1](true); ce[1](null);
          Promise.resolve(p.onCreateActivity(b.type)).then(function (o) { cs[1](false); if (o && o.value) { var data = {}; data[field] = o.value; data.title = o.label; p.update({ id: b.id, type: b.type, data: data }); } },
            function (e) { cs[1](false); ce[1]((e && e.message) || "It wasn't made. Try again."); });
        } }, "Make a new " + words[1]), ce[0] ? h("p", { className: "ot-field__error", role: "alert" }, ce[0]) : null) : null);
    return h("div", { ref: p.register, tabIndex: -1, className: "ot-bed__activity" },
      h(ActivityCard, { kind: b.type === "program" ? "code" : b.type, title: title, facts: ["Students do it here, in the lesson"],
        action: h("span", { className: "ot-bed__activityactions" },
          p.activityHref ? h(Button, { variant: "secondary", size: "sm", icon: "edit", href: p.activityHref(b.type, name) }, "Edit " + words[1]) : null,
          h(Button, { variant: "text", size: "sm", onClick: function () { p.update({ id: b.id, type: b.type, data: {} }); } }, "Pick another")) }));
  }

  // ---- LessonEditor: the page for writing a lesson ----
  var SAVE_WORDS = { saved: "Saved", saving: "Saving\u2026", unsaved: "Not saved yet", error: "Not saved", offline: "Offline. Saved here until you're back." };
  function LessonEditor(p) {
    var ms = useState(p.defaultMode || "edit"), mode = p.mode || ms[0];
    function setMode(v) { if (!p.mode) ms[1](v); if (p.onModeChange) p.onModeChange(v); }
    var save = p.saveState || "saved";
    var status = h("p", { className: cx("ot-lesed__save", "ot-lesed__save--" + save), role: save === "error" ? "alert" : "status" },
      save === "saved" ? h(Icon, { name: "done", size: 18 }) : save === "saving" ? h("span", { className: "ot-combo__spin", "aria-hidden": true }) : h(Icon, { name: save === "unsaved" ? "due" : "warning", size: 18 }),
      h("span", null, p.saveText || SAVE_WORDS[save] + (save === "saved" && p.savedAt ? " " + p.savedAt : "")),
      save === "error" && p.onRetry ? h(Button, { variant: "text", size: "sm", icon: "retry", onClick: p.onRetry }, "Try again") : null);
    return h("div", { className: cx("ot-lesed", p.className) },
      h("header", { className: "ot-lesed__head" },
        p.back ? h(BackLink, { href: p.back.href, onClick: p.back.onClick, className: "ot-lesed__back" }, p.back.label) : null,
        h("div", { className: "ot-lesed__bar" },
          status,
          h("div", { className: "ot-lesed__actions" },
            h(SegmentedControl, { label: "Edit or preview", value: mode, onChange: setMode, options: [{ value: "edit", label: "Edit", icon: "edit" }, { value: "preview", label: "Preview", icon: "eye" }] }),
            p.actions || null))),
      h("div", { className: "ot-lesed__grid" },
        h("div", { className: "ot-lesed__main" },
          p.eyebrow ? h("p", { className: "ot-pagehead__eyebrow" }, p.eyebrow) : null,
          mode === "edit"
            ? h("input", { className: cx("ot-lesed__title", p.titleError && "is-error"), type: "text", value: p.title || "", placeholder: "Lesson title", "aria-label": "Lesson title", maxLength: 140,
              "aria-invalid": p.titleError ? true : undefined, onChange: function (e) { if (p.onTitleChange) p.onTitleChange(e.target.value); } })
            : h("h1", { className: "ot-lesed__previewtitle" }, p.title || "Untitled lesson"),
          p.titleError && mode === "edit" ? h("p", { className: "ot-field__error" }, h(Icon, { name: "warning", size: 16 }), h("span", null, p.titleError)) : null,
          mode === "edit" ? p.editor : h("div", { className: "ot-lesed__preview" }, h(Alert, { tone: "info" }, "This is what students see. Quizzes and assignments work in the real lesson."), p.preview),
          p.prev || p.next ? h("nav", { className: "ot-lesed__nav", "aria-label": "Other lessons" },
            p.prev ? h("a", { className: "ot-lesed__navlink", href: p.prev.href, onClick: p.prev.onClick }, h(Icon, { name: "arrow-left", size: 18 }), h("span", null, h("small", null, "Previous"), p.prev.title)) : h("span"),
            p.next ? h("a", { className: "ot-lesed__navlink ot-lesed__navlink--next", href: p.next.href, onClick: p.next.onClick }, h("span", null, h("small", null, "Next"), p.next.title), h(Icon, { name: "arrow-right", size: 18 })) : null) : null),
        p.side ? h("aside", { className: "ot-lesed__side", "aria-label": "Lesson settings" }, p.side) : null));
  }

  // exports: ListEditor, OutlineEditor, BlockEditor, LessonEditor, InlineAdd

  // ======== Staff: quizzes, assignments and coding, and marking them ========

  var QUESTION_TYPES = [
    { value: "single", label: "One answer", word: "One answer" },
    { value: "multiple", label: "Several answers", word: "Several answers" },
    { value: "typed", label: "Typed answer", word: "Typed answer" },
    { value: "open", label: "Open answer", word: "Open answer" },
  ];
  function questionWord(t) { var q = QUESTION_TYPES.filter(function (x) { return x.value === t; })[0]; return q ? q.word : "Question"; }
  function marksText(n) { n = +n || 0; return n === 1 ? "1 mark" : n + " marks"; }

  // ---- QuestionList: a quiz's questions, in order, with their marks ----
  function QuestionList(p) {
    var qs = p.questions || [], said = useState("");
    var drag = useReorder(function (from, to) { if (p.onMove) p.onMove(qs[from].id, to); said[1]("Question moved to position " + (to + 1)); });
    var total = qs.reduce(function (n, q) { return n + (+q.marks || 0); }, 0);
    return h("section", { className: cx("ot-qlist", p.className), "aria-label": p.label || "Questions" },
      h("div", { className: "ot-qlist__head" },
        h("p", { className: "ot-qlist__sum" }, h("strong", null, qs.length === 1 ? "1 question" : qs.length + " questions"), " \u00b7 " + marksText(total) + (p.limit ? " \u00b7 each student gets " + p.limit + " of them" : "")),
        h("div", { className: "ot-qlist__actions" },
          p.onAddFromBank ? h(Button, { variant: "secondary", size: "sm", icon: "copy", onClick: p.onAddFromBank }, "Add from the question bank") : null,
          p.onAdd ? h(Button, { size: "sm", icon: "plus", onClick: p.onAdd }, "New question") : null)),
      qs.length ? h("ol", { className: "ot-qlist__list" }, qs.map(function (q, i) {
        return h("li", Object.assign({ key: q.id, className: cx("ot-qlist__row", drag.dropClass(i)) }, drag.row(i)),
          h("span", Object.assign({ className: "ot-listed__grip", "aria-hidden": true, title: "Drag to move" }, drag.handle(i)), dotIcon("grip", 18)),
          h("span", { className: "ot-qlist__no", "aria-hidden": true }, i + 1),
          h("span", { className: "ot-qlist__text" },
            h(p.onEdit ? "button" : "span", { type: p.onEdit ? "button" : undefined, className: "ot-qlist__q", onClick: p.onEdit ? function () { p.onEdit(q); } : undefined },
              h("span", { className: "ot-visually-hidden" }, "Question " + (i + 1) + ": "), stripTags(q.text || "") || "Untitled question"),
            h("span", { className: "ot-qlist__meta" }, questionWord(q.type) + " \u00b7 " + marksText(q.marks) + (q.shared ? " \u00b7 also in " + q.shared : ""))),
          q.problem ? h(Badge, { tone: "warning", icon: "warning" }, q.problem) : null,
          h(Menu, { label: "More for question " + (i + 1), triggerIconOnly: true, triggerIcon: "more", triggerVariant: "text", triggerSize: "sm", align: "end",
            items: [].concat(p.onEdit ? [{ label: "Edit", icon: "edit", onSelect: function () { p.onEdit(q); } }] : [],
              [{ label: "Move up", icon: "arrow-up", onSelect: function () { if (i > 0 && p.onMove) p.onMove(q.id, i - 1); } },
                { label: "Move down", icon: "arrow-down", onSelect: function () { if (i < qs.length - 1 && p.onMove) p.onMove(q.id, i + 1); } }],
              p.onRemove ? [{ divider: true }, { label: "Take out of this quiz", icon: "minus", danger: true, onSelect: function () { p.onRemove(q); } }] : []) }));
      })) : h(EmptyState, { compact: true, icon: "quiz", title: "No questions yet" }, "Write a new question, or add ones you've used before from the question bank."),
      h(Announcer, { text: said[0] }));
  }

  // ---- QuestionEditor: one question, its kind, its answers and its marks ----
  function QuestionEditor(p) {
    var v = p.value || {}, type = v.type || "single", options = v.options && v.options.length ? v.options : [{ text: "", correct: true }, { text: "", correct: false }];
    var errs = p.errors || {}, base = uid("qe"), open = useState({});
    function set(patch) { p.onChange(Object.assign({}, v, { options: options }, patch)); }
    function setOpt(i, patch) { set({ options: options.map(function (o, j) { return j === i ? Object.assign({}, o, patch) : type === "single" && patch.correct ? Object.assign({}, o, { correct: false }) : o; }) }); }
    function setType(t) {
      var next = { type: t };
      if (t === "single" && options.filter(function (o) { return o.correct; }).length > 1) {
        var first = -1; next.options = options.map(function (o, j) { if (o.correct && first < 0) { first = j; return o; } return Object.assign({}, o, { correct: false }); });
      }
      set(next);
    }
    var choice = type === "single" || type === "multiple";
    return h("div", { className: cx("ot-qedit", p.className) },
      h("div", { className: "ot-field" },
        h("p", { className: "ot-field__label", id: base + "-t" }, "Kind of question"),
        h("div", { className: "ot-qedit__types", role: "radiogroup", "aria-labelledby": base + "-t" }, QUESTION_TYPES.map(function (t) {
          var on = t.value === type;
          return h("button", { key: t.value, type: "button", role: "radio", "aria-checked": on, className: cx("ot-qedit__type", on && "is-on"), onClick: function () { setType(t.value); } },
            h("span", { className: "ot-qedit__typemark", "aria-hidden": true }, on ? h(Icon, { name: "check", size: 14, strokeWidth: 2.8 }) : null),
            h("span", null, t.label));
        }))),
      h(RichTextField, { label: "Question", value: v.question || "", onChange: function (html) { set({ question: html }); }, rows: 3, error: errs.question,
        tools: ["bold", "italic", "bullets", "link"], placeholder: "What do you want to ask?" }),
      h(TextField, { label: "Marks", type: "number", inputMode: "numeric", value: v.marks == null ? 1 : v.marks, className: "ot-qedit__marks", error: errs.marks,
        onChange: function (e) { set({ marks: e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0) }); } }),
      choice ? h("fieldset", { className: cx("ot-qedit__answers", errs.options && "ot-field--error") },
        h("legend", { className: "ot-field__label" }, "Answers"),
        h("p", { className: "ot-field__hint" }, type === "single" ? "Mark the right one. Students see the answers in a different order each time if the quiz shuffles them." : "Mark every right one. Students need all of them, and none of the others."),
        h("ol", { className: "ot-qedit__opts" }, options.map(function (o, i) {
          var exp = open[0][i] || !!o.explanation;
          return h("li", { key: i, className: cx("ot-qedit__opt", o.correct && "is-correct") },
            h("div", { className: "ot-qedit__optrow" },
              h("button", { type: "button", role: type === "single" ? "radio" : "checkbox", "aria-checked": !!o.correct, className: cx("ot-qedit__correct", type === "single" && "ot-qedit__correct--radio"),
                onClick: function () { setOpt(i, { correct: type === "single" ? true : !o.correct }); } },
                h("span", { className: "ot-qedit__tick", "aria-hidden": true }, o.correct ? h(Icon, { name: "check", size: 14, strokeWidth: 2.8 }) : null),
                h("span", { className: "ot-qedit__correctword" }, o.correct ? "Right" : "Wrong"),
                h("span", { className: "ot-visually-hidden" }, ", answer " + (i + 1))),
              h("div", { className: "ot-input ot-qedit__optinput" },
                h("input", { type: "text", value: o.text || "", "aria-label": "Answer " + (i + 1), placeholder: "Answer " + (i + 1), maxLength: 500,
                  onChange: function (e) { setOpt(i, { text: e.target.value }); } })),
              options.length > 2 ? h(Button, { variant: "text", size: "sm", iconOnly: true, icon: "close", className: "ot-quiet",
                onClick: function () { set({ options: options.filter(function (x, j) { return j !== i; }) }); } }, "Remove answer " + (i + 1)) : null),
            exp ? h(TextField, { label: "Why it's " + (o.correct ? "right" : "wrong"), optional: true, value: o.explanation || "", className: "ot-qedit__why",
              hint: "Students see this after they answer, if the quiz shows answers.", onChange: function (e) { setOpt(i, { explanation: e.target.value }); } })
              : h(Button, { variant: "text", size: "sm", className: "ot-qedit__addwhy", onClick: function () { var o2 = Object.assign({}, open[0]); o2[i] = true; open[1](o2); } }, "Explain why"));
        })),
        options.length < 10 ? h(Button, { variant: "text", size: "sm", icon: "plus", onClick: function () { set({ options: options.concat([{ text: "", correct: false }]) }); } }, "Add an answer") : null,
        errs.options ? h("p", { className: "ot-field__error" }, h(Icon, { name: "warning", size: 16 }), h("span", null, errs.options)) : null) : null,
      type === "typed" ? h(ListEditor, { label: "Answers we accept", hint: "A student's answer counts if it matches one of these, ignoring capitals and spaces at the ends.", max: 10,
        items: v.answers && v.answers.length ? v.answers : [""], onChange: function (a) { set({ answers: a }); }, placeholder: "An answer that counts", addLabel: "Add another answer", error: errs.answers }) : null,
      type === "open" ? h(Alert, { tone: "info", title: "You'll mark this one" }, "Students write their own answer. It waits in Marking until you give it marks, and the quiz's score updates then.") : null);
  }

  // ---- TestCaseEditor: a coding exercise's tests, an input and the output it should give ----
  function TestCaseEditor(p) {
    var cases = p.cases || [], said = useState("");
    function set(i, patch) { p.onChange(cases.map(function (c, j) { return j === i ? Object.assign({}, c, patch) : c; })); }
    return h("div", { className: cx("ot-tced", p.className) },
      cases.length ? h("ol", { className: "ot-tced__list" }, cases.map(function (c, i) {
        return h("li", { key: i, className: "ot-tced__case" },
          h("div", { className: "ot-tced__head" },
            h("p", { className: "ot-tced__name" }, "Test " + (i + 1)),
            h(Checkbox, { label: "Hide it from students", checked: !!c.hidden, onChange: function (e) { set(i, { hidden: e.target.checked }); } }),
            h(Button, { variant: "text", size: "sm", iconOnly: true, icon: "trash", className: "ot-quiet", onClick: function () { p.onChange(cases.filter(function (x, j) { return j !== i; })); said[1]("Test " + (i + 1) + " removed"); } }, "Remove test " + (i + 1))),
          h("div", { className: "ot-tced__io" },
            h(TextField, { label: "Input", multiline: true, rows: 3, value: c.input || "", spellCheck: false, autoCapitalize: "off", className: "ot-bed__mono", hint: i === 0 ? "What the program reads, one value per line. Leave it empty if it reads nothing." : undefined,
              onChange: function (e) { set(i, { input: e.target.value }); } }),
            h(TextField, { label: "Expected output", multiline: true, rows: 3, value: c.expected_output != null ? c.expected_output : c.expected || "", spellCheck: false, autoCapitalize: "off", className: "ot-bed__mono",
              error: p.errors && p.errors[i], hint: i === 0 ? "Exactly what it should print." : undefined,
              onChange: function (e) { set(i, { expected_output: e.target.value }); } })));
      })) : h(EmptyState, { compact: true, icon: "code", title: "No tests yet" }, "Add at least one test, so students can check their code."),
      h(Button, { variant: "secondary", size: "sm", icon: "plus", className: "ot-tced__add", onClick: function () { p.onChange(cases.concat([{ input: "", expected_output: "", hidden: false }])); said[1]("Test " + (cases.length + 1) + " added"); } }, "Add a test"),
      h(Announcer, { text: said[0] }));
  }

  // ---- ReviewLayout: marking one piece of work, the work beside the marks ----
  function ReviewLayout(p) {
    var s = p.student || {}, pos = p.position;
    return h("div", { className: cx("ot-mrev", p.className) },
      h("header", { className: "ot-mrev__head" },
        p.back ? h(BackLink, { href: p.back.href, onClick: p.back.onClick }, p.back.label) : null,
        h("div", { className: "ot-mrev__row" },
          h("div", { className: "ot-mrev__who" },
            h(Avatar, { name: s.name || "Student", src: s.src, size: 48 }),
            h("div", { className: "ot-mrev__whotext" },
              p.eyebrow ? h("p", { className: "ot-pagehead__eyebrow" }, p.eyebrow) : null,
              h("h1", { className: "ot-mrev__title", id: p.titleId, tabIndex: p.titleId ? -1 : undefined }, p.title),
              h("p", { className: "ot-mrev__meta" }, [s.name, p.meta, p.submitted].filter(Boolean).join(" \u00b7 ")))),
          pos ? h("nav", { className: "ot-mrev__pager", "aria-label": "Work to mark" },
            h(Button, { variant: "secondary", size: "sm", iconOnly: true, icon: "arrow-left", href: p.prevHref, onClick: p.onPrev, disabled: !p.prevHref && !p.onPrev }, "Previous piece of work"),
            h("span", { className: "ot-mrev__count" }, pos.index + " of " + pos.total),
            h(Button, { variant: "secondary", size: "sm", iconOnly: true, icon: "arrow-right", href: p.nextHref, onClick: p.onNext, disabled: !p.nextHref && !p.onNext }, "Next piece of work")) : null)),
      h("div", { className: "ot-mrev__grid" },
        h("section", { className: "ot-mrev__work", "aria-label": p.workLabel || "Their work" }, p.work),
        h("aside", { className: "ot-mrev__panel", "aria-label": "Marking" }, p.panel)));
  }

  // ---- SubmissionViewer: what a student handed in, whatever kind it is ----
  function SubmissionViewer(p) {
    var t = p.type, url = p.url, safe = url ? safeUrl(url, "link") : null, name = p.fileName || String(url || "").split("/").pop();
    var zoom = useState(false);
    var body;
    if (!url && !p.text && !p.code) body = h(EmptyState, { compact: true, icon: "assignment", title: "Nothing handed in yet" }, p.emptyText);
    else if (t === "image") body = h("figure", { className: cx("ot-subview__img", zoom[0] && "is-zoomed") },
      h("button", { type: "button", className: "ot-subview__zoom", onClick: function () { zoom[1](!zoom[0]); }, "aria-pressed": zoom[0] },
        h("img", { src: safeUrl(url, "image"), alt: p.alt || "What " + (p.studentName || "the student") + " handed in" }),
        h("span", { className: "ot-visually-hidden" }, zoom[0] ? "Fit to the screen" : "Show at full size")),
      h("figcaption", { className: "ot-subview__bar" }, h("span", null, name), h(Button, { variant: "text", size: "sm", href: safe, target: "_blank", iconAfter: "external" }, "Open full size")));
    else if (t === "pdf") body = h("div", { className: "ot-subview__pdf" },
      h("object", { data: safe, type: "application/pdf", "aria-label": name },
        h(FileBlock, { name: name, href: safe, openHref: safe })),
      h("div", { className: "ot-subview__bar" }, h("span", null, name), h(Button, { variant: "text", size: "sm", href: safe, target: "_blank", iconAfter: "external" }, "Open in a new tab")));
    else if (t === "url") {
      var host = ""; try { host = new URL(url).hostname; } catch (e) { host = ""; }
      body = h("div", { className: "ot-subview__link" },
        h("span", { className: "ot-subview__linkicon", "aria-hidden": true }, h(Icon, { name: "link", size: 24 })),
        h("div", { className: "ot-subview__linktext" }, h("p", { className: "ot-subview__host" }, host || "A link"), h("p", { className: "ot-subview__url" }, url)),
        safe ? h(Button, { variant: "secondary", href: safe, target: "_blank", iconAfter: "external" }, "Open the link") : null);
    }
    else if (t === "text") body = h(Prose, { className: "ot-subview__text", html: p.text });
    else if (t === "code") body = h(CodeBlock, { code: p.code, language: p.language, html: p.highlight ? p.highlight(p.code || "", p.language) : undefined });
    else body = h(FileBlock, { name: name, href: safe, kind: p.kindLabel });
    return h("div", { className: cx("ot-subview", "ot-subview--" + (t || "file"), p.className) }, body, p.children);
  }

  // ---- MarkPanel: passed or not, a comment, and save (and go on to the next) ----
  function MarkPanel(p) {
    var st = p.status, base = uid("mk"), saving = p.saveState === "saving";
    function pick(v) { if (p.onStatusChange) p.onStatusChange(v); }
    return h("div", { className: cx("ot-markp", p.className) },
      p.question ? h("details", { className: "ot-markp__fold", open: p.questionOpen },
        h("summary", null, h("span", null, p.questionLabel || "What they were asked"), h(Icon, { name: "chevron-down", size: 18 })),
        h(Prose, { className: "ot-markp__q", html: p.question })) : null,
      p.answerKey ? h("details", { className: "ot-markp__fold" },
        h("summary", null, h("span", null, "Your model answer"), h(Icon, { name: "chevron-down", size: 18 })),
        h(Prose, { className: "ot-markp__q", html: p.answerKey })) : null,
      p.children,
      p.onStatusChange ? h("div", { className: "ot-field" },
        h("p", { className: "ot-field__label", id: base + "-s" }, "Result"),
        h("div", { className: "ot-markp__choices", role: "radiogroup", "aria-labelledby": base + "-s" },
          [["passed", "Passed", "done"], ["failed", "Not passed", "close"]].map(function (c) {
            var on = st === c[0];
            return h("button", { key: c[0], type: "button", role: "radio", "aria-checked": on, className: cx("ot-markp__choice", "ot-markp__choice--" + c[0], on && "is-on"), onClick: function () { pick(c[0]); } },
              h(Icon, { name: c[2], size: 20, strokeWidth: 2.2 }), h("span", null, c[1]));
          })),
        p.statusError ? h("p", { className: "ot-field__error" }, h(Icon, { name: "warning", size: 16 }), h("span", null, p.statusError)) : null) : null,
      p.onCommentChange ? h(RichTextField, { label: p.commentLabel || "Feedback", value: p.comment || "", onChange: p.onCommentChange, rows: 5, tools: ["bold", "italic", "bullets", "link"],
        hint: p.commentHint || "They see this with their result.", placeholder: "What went well, and what to do next" }) : null,
      p.notice ? h("p", { className: "ot-markp__notice" }, h(Icon, { name: "mail", size: 18 }), h("span", null, p.notice)) : null,
      p.error ? h(Alert, { tone: "danger", title: "Not saved" }, p.error) : null,
      h("div", { className: "ot-markp__actions" },
        p.saveState === "saved" ? h("p", { className: "ot-markp__saved", role: "status" }, h(Icon, { name: "done", size: 18 }), h("span", null, p.savedText || "Saved")) : null,
        p.onSave ? h(Button, { variant: p.onSaveNext ? "secondary" : "primary", onClick: function () { p.onSave(); }, loading: saving && !p.savingNext, disabled: saving }, p.saveLabel || "Save") : null,
        p.onSaveNext ? h(Button, { icon: undefined, iconAfter: "arrow-right", onClick: function () { p.onSaveNext(); }, loading: saving && p.savingNext, disabled: saving }, p.saveNextLabel || "Save and next") : null));
  }

  // ---- QuizReview: a quiz someone took, each answer, and marks for the open ones ----
  function QuizReview(p) {
    var rs = p.results || [];
    var score = rs.reduce(function (n, r) { return n + (+r.marks || 0); }, 0), outOf = p.outOf || rs.reduce(function (n, r) { return n + (+r.outOf || 0); }, 0);
    var pct = outOf ? Math.round(100 * score / outOf) : 0, passed = p.passPercent != null ? pct >= p.passPercent : null;
    var waiting = rs.filter(function (r) { return r.type === "open" && r.marks == null; }).length;
    return h("div", { className: cx("ot-qreview", p.className) },
      h("div", { className: "ot-qreview__score", role: "status" },
        h("p", { className: "ot-qreview__big" }, String(score), h("span", { className: "ot-qreview__of" }, " of " + outOf)),
        h("div", null,
          h("p", { className: "ot-qreview__pct" }, pct + "%" + (p.passPercent != null ? " \u00b7 pass mark " + p.passPercent + "%" : "")),
          waiting ? h(Badge, { tone: "warning", icon: "due" }, waiting === 1 ? "1 answer to mark" : waiting + " answers to mark")
            : passed == null ? null : h(Badge, { tone: passed ? "success" : "danger", icon: passed ? "done" : "close" }, passed ? "Passed" : "Not passed"))),
      h("ol", { className: "ot-qreview__list" }, rs.map(function (r, i) {
        var open = r.type === "open", state = open ? (r.marks == null ? "waiting" : "marked") : r.correct ? "right" : "wrong";
        return h("li", { key: r.id || i, className: cx("ot-qreview__item", "ot-qreview__item--" + state) },
          h("p", { className: "ot-qreview__eyebrow" }, "Question " + (i + 1) + " \u00b7 " + questionWord(r.type) + " \u00b7 " + marksText(r.outOf)),
          h(Prose, { className: "ot-qreview__q", html: r.question }),
          h("div", { className: "ot-qreview__answer" },
            h("p", { className: "ot-qreview__label" }, p.answerLabel || "Their answer"),
            r.answer ? h("p", { className: "ot-qreview__text" }, r.answer) : h("p", { className: "ot-qreview__text ot-qreview__text--none" }, "No answer"),
            !open && r.expected ? h("p", { className: "ot-qreview__expected" }, "Right answer: " + r.expected) : null),
          open ? h("div", { className: "ot-qreview__marking" },
            h(TextField, { label: "Marks out of " + (r.outOf || 0), type: "number", inputMode: "numeric", value: r.marks == null ? "" : r.marks, className: "ot-qreview__marks",
              onChange: function (e) { var v = e.target.value === "" ? null : Math.max(0, Math.min(+r.outOf || 0, parseInt(e.target.value, 10) || 0)); if (p.onMark) p.onMark(r.id, v); } }),
            h(Button, { variant: "secondary", size: "sm", onClick: function () { if (p.onMark) p.onMark(r.id, +r.outOf || 0); } }, "Full marks"),
            h(Button, { variant: "text", size: "sm", onClick: function () { if (p.onMark) p.onMark(r.id, 0); } }, "No marks"))
            : h("p", { className: "ot-qreview__auto" }, h(Icon, { name: r.correct ? "done" : "close", size: 18, strokeWidth: 2.2 }), h("span", null, (r.correct ? "Right" : "Wrong") + " \u00b7 " + marksText(r.marks) + ", marked automatically")));
      })));
  }

  // ---- TestResults: how someone's code did on each test ----
  function TestResults(p) {
    var tests = p.tests || [], passed = tests.filter(function (t) { return t.passed; }).length, all = tests.length && passed === tests.length;
    return h("section", { className: cx("ot-tests", p.className), "aria-label": p.title || "Tests" },
      h("div", { className: "ot-tests__head" }, h("h2", { className: "ot-tests__title" }, p.title || "Tests"),
        h("span", { className: cx("ot-exercise__sum", all ? "ot-exercise__sum--all" : "ot-exercise__sum--some") }, all ? "All " + tests.length + " passed" : passed + " of " + tests.length + " passed")),
      h("div", { className: "ot-tests__bar", "aria-hidden": true }, tests.map(function (t, k) { return h("span", { key: k, className: cx("ot-tests__pip", t.passed ? "ot-tests__pip--pass" : "ot-tests__pip--fail") }); })),
      h("ol", { className: "ot-tests__list" }, tests.map(function (t, k) {
        var state = t.passed ? "pass" : "fail";
        return h("li", { key: k, className: "ot-test ot-test--" + state },
          h("details", { open: !t.passed || undefined },
            h("summary", null,
              h("span", { className: "ot-test__icon", "aria-hidden": true }, h(Icon, { name: t.passed ? "check" : "close", size: 16, strokeWidth: 2.4 })),
              h("span", { className: "ot-test__name" }, "Test " + (k + 1) + (t.hidden ? " (hidden from students)" : "")),
              h("span", { className: "ot-test__word" }, t.passed ? "Passed" : "Failed"),
              h(Icon, { name: "chevron-down", size: 18, className: "ot-test__chev" })),
            h("dl", { className: "ot-test__io" },
              h("div", null, h("dt", null, "Input"), h("dd", null, h("code", null, t.input || "(nothing)"))),
              h("div", null, h("dt", null, "Expected"), h("dd", null, h("code", null, t.expected))),
              h("div", { className: t.passed ? undefined : "ot-test__got--wrong" }, h("dt", null, p.outputLabel || "Their output"), h("dd", null, h("code", null, t.output === "" || t.output == null ? "(nothing printed)" : t.output))))));
      })));
  }

  // exports: QuestionList, QuestionEditor, TestCaseEditor, ReviewLayout, SubmissionViewer, MarkPanel, QuizReview, TestResults

  // ======== Staff: evaluations, people and settings ========

  // ---- AvailabilityEditor: an evaluator's weekly times, and days away ----
  var WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  function slotTimeText(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t || "");
    if (!m) return t || "";
    var hh = +m[1], ap = hh >= 12 ? "pm" : "am", h12 = hh % 12 || 12;
    return h12 + ":" + m[2] + " " + ap;
  }
  function AvailabilityEditor(p) {
    var slots = p.slots || [], said = useState(""), errs = p.errors || {};
    function set(next, msg) { p.onChange(next); if (msg) said[1](msg); }
    function add(day) {
      var mine = slots.filter(function (s) { return s.day === day; }), last = mine[mine.length - 1];
      var start = last ? last.end : "16:00", sh = +String(start).slice(0, 2), end = (sh + 1 < 24 ? (sh + 1 < 10 ? "0" : "") + (sh + 1) : "23") + String(start).slice(2, 5);
      set(slots.concat([{ day: day, start: String(start).slice(0, 5), end: end }]), "Added a time on " + day);
    }
    return h("div", { className: cx("ot-avail", p.className) },
      h("ul", { className: "ot-avail__days", role: "list" }, WEEK_DAYS.map(function (day) {
        var mine = [];
        slots.forEach(function (s, i) { if (s.day === day) mine.push({ s: s, i: i }); });
        return h("li", { key: day, className: cx("ot-avail__day", mine.length && "is-on") },
          h("p", { className: "ot-avail__name" }, day, h("span", { className: "ot-avail__sum" }, mine.length ? mine.map(function (x) { return slotTimeText(x.s.start) + " to " + slotTimeText(x.s.end); }).join(", ") : "Not available")),
          h("div", { className: "ot-avail__slots" },
            mine.map(function (x) {
              var bad = errs[x.i];
              return h("div", { key: x.i, className: cx("ot-avail__slot", bad && "is-error") },
                h("label", { className: "ot-avail__time" }, h("span", { className: "ot-visually-hidden" }, day + ", from"),
                  h("input", { type: "time", value: String(x.s.start || "").slice(0, 5), step: 900, onChange: function (e) { var n = slots.slice(); n[x.i] = Object.assign({}, x.s, { start: e.target.value }); set(n); } })),
                h("span", { className: "ot-avail__to", "aria-hidden": true }, "to"),
                h("label", { className: "ot-avail__time" }, h("span", { className: "ot-visually-hidden" }, day + ", until"),
                  h("input", { type: "time", value: String(x.s.end || "").slice(0, 5), step: 900, onChange: function (e) { var n = slots.slice(); n[x.i] = Object.assign({}, x.s, { end: e.target.value }); set(n); } })),
                h(Button, { variant: "text", size: "sm", iconOnly: true, icon: "close", className: "ot-quiet", onClick: function () { set(slots.filter(function (z, j) { return j !== x.i; }), "Removed a time on " + day); } },
                  "Remove " + day + " " + slotTimeText(x.s.start)),
                bad ? h("p", { className: "ot-field__error ot-avail__err" }, h(Icon, { name: "warning", size: 16 }), h("span", null, bad)) : null);
            }),
            h(Button, { variant: "text", size: "sm", icon: "plus", className: "ot-avail__add", onClick: function () { add(day); } }, mine.length ? "Add another time" : "Add a time")));
      })),
      p.onAwayChange ? h("div", { className: "ot-avail__away" },
        h("p", { className: "ot-field__label" }, "Away"),
        h("p", { className: "ot-field__hint" }, "No evaluations are booked with you between these dates."),
        h("div", { className: "ot-avail__awayrow" },
          h(TextField, { label: "From", type: "date", value: (p.away && p.away.from) || "", onChange: function (e) { p.onAwayChange(Object.assign({}, p.away, { from: e.target.value })); } }),
          h(TextField, { label: "Until", type: "date", value: (p.away && p.away.to) || "", error: p.awayError, onChange: function (e) { p.onAwayChange(Object.assign({}, p.away, { to: e.target.value })); } }),
          p.away && (p.away.from || p.away.to) ? h(Button, { variant: "text", size: "sm", onClick: function () { p.onAwayChange({ from: "", to: "" }); } }, "Clear") : null)) : null,
      h(Announcer, { text: said[0] }));
  }

  // ---- RoleList: which roles someone has, as words ----
  var ROLE_WORDS = { "Moderator": ["Moderator", "gold"], "Course Creator": ["Instructor", "physics"], "Batch Evaluator": ["Evaluator", "code"], "LMS Student": ["Student", "neutral"], "System Manager": ["Administrator", "making"] };
  function RoleList(p) {
    var roles = (p.roles || []).filter(function (r) { return ROLE_WORDS[r]; });
    if (!roles.length) return h("span", { className: "ot-dt__none" }, p.none || "\u2014");
    return h("span", { className: cx("ot-roles", p.className) }, roles.map(function (r) {
      var w = ROLE_WORDS[r];
      return h("span", { key: r, className: "ot-role", style: { "--tone": w[1] === "gold" ? "var(--gold-text)" : w[1] === "neutral" ? "var(--ink-2)" : "var(--track-" + w[1] + ")" } }, w[0]);
    }));
  }

  // exports: AvailabilityEditor, RoleList

  window.OrbiTutor = {
    Button: Button, Icon: Icon, Backdrop: Backdrop,
    TextField: TextField, Select: Select, Checkbox: Checkbox, Radio: Radio, Switch: Switch, FileUpload: FileUpload,
    Card: Card, ListRow: ListRow, Avatar: Avatar, AvatarStack: AvatarStack,
    Badge: Badge, Chip: Chip, ProgressBar: ProgressBar, ProgressRing: ProgressRing, StepDots: StepDots,
    Toast: Toast, Alert: Alert, EmptyState: EmptyState, Skeleton: Skeleton, ErrorState: ErrorState,
    Dialog: Dialog, BottomSheet: BottomSheet, Menu: Menu, Tooltip: Tooltip,
    Tabs: Tabs, SegmentedControl: SegmentedControl, Accordion: Accordion, BackLink: BackLink, LoadMore: LoadMore,
    AppShell: AppShell, TopBar: TopBar, TabBar: TabBar, OrbitMenu: OrbitMenu, NotificationBell: NotificationBell, NotificationList: NotificationList,
    SearchPanel: SearchPanel, SearchButton: SearchButton, ConnectionBanner: ConnectionBanner, Brand: Brand,
    LessonLayout: LessonLayout, CourseOutline: CourseOutline, LessonHeader: LessonHeader, LessonBlocks: LessonBlocks, Prose: Prose, Callout: Callout, CodeBlock: CodeBlock,
    Figure: Figure, VideoPlayer: VideoPlayer, Embed: Embed, FileBlock: FileBlock, Formula: Formula, ActivityCard: ActivityCard, Checklist: Checklist,
    LessonEnd: LessonEnd, LessonNav: LessonNav, ChapterComplete: ChapterComplete, CourseComplete: CourseComplete, Discussion: Discussion, LockedLesson: LockedLesson,
    TRACKS: TRACKS, PageSection: PageSection, CourseCard: CourseCard, CourseCatalogue: CourseCatalogue, CourseHero: CourseHero, ProjectFeature: ProjectFeature, OutcomeList: OutcomeList,
    KitList: KitList, InstructorCard: InstructorCard, BatchCard: BatchCard, AskToJoin: AskToJoin, MyCourses: MyCourses, LearningPath: LearningPath,
    HomeLayout: HomeLayout, HomeGreeting: HomeGreeting, ContinueCard: ContinueCard, LiveClassCard: LiveClassCard, DueList: DueList, CourseStrip: CourseStrip,
    Announcements: Announcements, CertificateCard: CertificateCard, WelcomePanel: WelcomePanel,
    QuizIntro: QuizIntro, Question: Question, QuizTimer: QuizTimer, QuizFrame: QuizFrame, QuizResults: QuizResults,
    ProctorNotice: ProctorNotice, AssignmentPage: AssignmentPage, AssignmentStatus: AssignmentStatus, CodeExercise: CodeExercise, CompetitionResults: CompetitionResults,
    BatchHero: BatchHero, Timetable: Timetable, Schedule: Schedule, ClassList: ClassList, EvaluationBooking: EvaluationBooking,
    CourseProgress: CourseProgress, CertificateList: CertificateList, CertificateDoc: CertificateDoc, CertificateCheck: CertificateCheck,
    AuthFrame: AuthFrame, SignIn: SignIn, SignUp: SignUp, PasswordField: PasswordField, AcceptInvite: AcceptInvite, PasswordReset: PasswordReset, WelcomeSetup: WelcomeSetup, HomeTour: HomeTour,
    PhotoField: PhotoField, ProfileHeader: ProfileHeader, ProjectGallery: ProjectGallery, ProfilePage: ProfilePage, SettingsLayout: SettingsLayout,
    ProfileSettings: ProfileSettings, NotificationSettings: NotificationSettings, AppearanceSettings: AppearanceSettings, SecuritySettings: SecuritySettings,
    StatusPage: StatusPage, NotFoundPage: NotFoundPage, NoAccessPage: NoAccessPage, ErrorPage: ErrorPage, ErrorBoundary: ErrorBoundary, MaintenancePage: MaintenancePage, OfflinePage: OfflinePage,
    problemKind: problemKind,
    ICON_NAMES: Object.keys(ICONS),
    configure: configure, sanitizeHtml: sanitizeHtml, safeUrl: safeUrl, takeUrlKey: takeUrlKey, safeRedirect: safeRedirect,
    performanceMode: performanceMode, applyPerformanceMode: applyPerformanceMode,
  };
  Object.assign(window.OrbiTutor, { StaffShell: StaffShell, PageHeader: PageHeader, DataTable: DataTable, FilterBar: FilterBar, FormSection: FormSection, SaveBar: SaveBar, Combobox: Combobox, ConfirmDialog: ConfirmDialog, StatTile: StatTile, StatGrid: StatGrid, BarChart: BarChart, SpreadBar: SpreadBar, RichTextField: RichTextField, useMedia: useMedia, ListEditor: ListEditor, OutlineEditor: OutlineEditor, BlockEditor: BlockEditor, LessonEditor: LessonEditor, InlineAdd: InlineAdd, QuestionList: QuestionList, QuestionEditor: QuestionEditor, TestCaseEditor: TestCaseEditor, ReviewLayout: ReviewLayout, SubmissionViewer: SubmissionViewer, MarkPanel: MarkPanel, QuizReview: QuizReview, TestResults: TestResults, AvailabilityEditor: AvailabilityEditor, RoleList: RoleList });
})();
