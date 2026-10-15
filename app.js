/* SonicApply redesign prototype: interaction layer (v2) */
(() => {
  const D = window.SA_DATA;
  const C = D.candidate;
  const W = D.why;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const plural = (n, one, many) => n === 1 ? one : (many || one + "s");

  const I = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/><path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  const OTP_EMOJI = ["\u{1F60A}", "\u{1F604}", "\u{1F973}", "\u{1F60E}", "\u{1F929}", "✨"];
  const STAGES = [
    { e: "\u{1F4C4}", t: "Analyzing your resume…" },
    { e: "✨", t: "Extracting your experience…" },
    { e: "\u{1F4BC}", t: "Identifying key skills…" },
    { e: "\u{1F3AF}", t: "Preparing your application…" },
  ];

  const state = {
    step: 1, opened: false,
    identity: null, lookup: null, unlocked: false, resumeConfirmed: false, processing: false, otpMode: "send", resumeRow: null,
    status: { text: "CareerGPT", busy: false },
    resume: null, formActive: false, filled: false,
    a: { backup: null, locpref: null, relocate: null },
    bundlesOn: new Set(), bundleRow: null, shown: 3,
    selected: new Set(), step2Ready: false,
    answers: {}, verified: false, sent: [], step3Seen: false,
    email: null, notifyEmail: null, goalDone: false, more: null,
    pending: {}, startRow: null,
    busy: 0,
  };

  /* ================= Thread (CareerGPT rail) ================= */
  const thread = $("#thread");
  let chain = Promise.resolve();

  /* Mobile: no chat. The agent lives in the sticky action bar as the SonicJobs mark plus a word or two (what's happening,
     what it needs). Desktop keeps the rail; both read the same state. */
  const isMobile = () => window.matchMedia("(max-width: 920px)").matches;
  const agentLineInner = () => `<img src="assets/sonicjobs-mark.svg" alt="CareerGPT">${state.status.busy ? '<span class="think"><span class="tdot"></span></span>' : ""}<span class="st-t">${esc(state.status.text)}</span><button type="button" class="help" data-toast="Help (prototype)">Help</button>`;
  const agentLineHtml = () => `<div class="cta-agent" id="cta-agent">${agentLineInner()}</div>`;
  function setStatus(text, busy) {
    state.status = { text, busy: !!busy };
    const line = $("#cta-agent"); if (!line) return;
    line.innerHTML = agentLineInner();
    line.classList.remove("swap"); void line.offsetWidth; line.classList.add("swap");
    bindToasts();
  }
  const scrollThread = () => thread.scrollTo({ top: thread.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  const stamp = () => { const d = new Date(); return d.toLocaleDateString("en-US", { weekday: "long" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); };
  function setBusy(delta) { state.busy = Math.max(0, state.busy + delta); document.body.classList.toggle("is-busy", state.busy > 0); }

  async function streamText(el, text) {
    if (reduce) { el.textContent = text; return; }
    const tokens = text.match(/\S+\s*/g) || [text];
    const per = Math.min(40, Math.max(14, 900 / tokens.length));
    const start = performance.now();
    let shown = 0;
    el.innerHTML = '<span class="tt"></span><span class="caret"></span>';
    const tt = el.querySelector(".tt");
    while (shown < tokens.length) {
      await wait(per);
      shown = Math.min(tokens.length, Math.max(shown + 1, Math.floor((performance.now() - start) / per)));
      tt.textContent = tokens.slice(0, shown).join("");
      if (shown % 3 === 0) scrollThread();
    }
    el.textContent = text;
  }

  function thinkingRow(label) {
    const t = document.createElement("div");
    t.className = "think";
    t.innerHTML = `<span class="tdot"></span><span class="tlabel">${esc(label || "Thinking…")}</span>`;
    return t;
  }

  /* agent(): serialized assistant turn. Shows the thinking state for `think` ms or until `until` settles, then an optional
     meta line ("Read your resume in 6s"), then streams the text, then attaches a card, chips or links. */
  function agent(text, opts = {}) {
    const p = chain.then(async () => {
      setBusy(1);
      const row = document.createElement("div");
      row.className = "msg";
      const t = thinkingRow(opts.thinkLabel);
      row.appendChild(t);
      thread.appendChild(row);
      if (opts.thinkLabel) setStatus(opts.thinkLabel, true);
      scrollThread();
      if (opts.until) await opts.until; else await wait(opts.think ?? 650);
      t.remove();
      if (opts.meta) { const m = document.createElement("div"); m.className = "meta"; m.textContent = opts.meta; row.appendChild(m); }
      const body = document.createElement("div"); body.className = "msg-text"; row.appendChild(body);
      await streamText(body, text);
      if (opts.card) row.appendChild(opts.card);
      if (opts.chips) row.appendChild(opts.chips);
      if (opts.links) {
        const l = document.createElement("div"); l.className = "msg-links";
        opts.links.forEach(k => { const b = document.createElement("button"); b.type = "button"; b.textContent = k.label; b.onclick = k.onClick; l.appendChild(b); });
        row.appendChild(l);
      }
      if (opts.status) setStatus(opts.status);
      scrollThread();
      await wait(opts.after ?? 120);
      setBusy(-1);
      return row;
    });
    chain = p.catch(() => setBusy(-1));
    return p;
  }

  /* collapseThread(): folds everything said so far into one row ("Apply · sent"), so each step starts with a clean rail.
     Serialized on the chain so an in-flight reply finishes first. */
  function collapseThread(label) {
    const p = chain.then(() => {
      const nodes = Array.from(thread.children).filter(n => !n.classList.contains("past"));
      if (!nodes.length) return;
      const d = document.createElement("details");
      d.className = "past";
      d.innerHTML = `<summary><span class="pill">${I.check}${esc(label)}</span><span class="show"></span></summary><div class="past-body"></div>`;
      const body = d.querySelector(".past-body");
      nodes.forEach(n => body.appendChild(n));
      thread.appendChild(d);
      scrollThread();
    });
    chain = p.catch(() => {});
    return p;
  }

  function user(text, opts = {}) {
    const wrap = document.createElement("div");
    wrap.className = "user-wrap";
    wrap.innerHTML = `<div class="user${opts.attachment ? " att" : ""}">${opts.attachment ? I.doc : ""}<span>${esc(text)}</span></div><div class="user-meta">${esc(stamp())}</div>`;
    thread.appendChild(wrap);
    scrollThread();
  }

  function chipRow(options, onPick) {
    const wrap = document.createElement("div");
    wrap.className = "chips";
    options.forEach(o => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.value = o.value;
      b.innerHTML = `<span>${esc(o.label)}</span>${o.count != null ? `<span class="n">${o.count}</span>` : ""}`;
      b.onclick = () => { markChip(wrap, b); onPick(o); };
      wrap.appendChild(b);
    });
    return wrap;
  }
  function markChip(wrap, b) { $$(".chip", wrap).forEach(c => c.classList.remove("on")); b.classList.add("on"); wrap.classList.add("answered"); }
  function refreshCounts(wrap, options) { if (!wrap) return; options.forEach(o => { const n = wrap.querySelector(`.chip[data-value="${o.value}"] .n`); if (n) n.textContent = o.count; }); }

  /* ask(): question + chips. Resolves on the first pick; later picks still call onPick. state.pending[id].answer() lets the
     form (or the right-hand controls) answer the same question without a user bubble. */
  function ask(id, text, options, { onPick, think, thinkLabel, meta, status } = {}) {
    return new Promise(resolve => {
      let first = true;
      const row = chipRow(options, o => { user(o.label); onPick && onPick(o, first); if (first) { first = false; resolve(o); } });
      state.pending[id] = {
        row,
        answer: value => { const b = row.querySelector(`.chip[data-value="${value}"]`); if (b) markChip(row, b); if (first) { first = false; resolve(options.find(o => o.value === value) || { value }); } },
      };
      agent(text, { chips: row, think, thinkLabel, meta, status });
    });
  }

  /* ================= Workspace helpers ================= */
  const workScroll = $("#work-scroll");
  const work = $("#work-inner");
  const cta = $("#cta");
  function setWork(html, quiet) { work.innerHTML = html; if (!quiet) { work.classList.remove("swap"); void work.offsetWidth; work.classList.add("swap"); workScroll.scrollTop = 0; } }
  function setCta(html) { cta.innerHTML = html ? agentLineHtml() + html : ""; cta.style.display = html ? "" : "none"; bindToasts(); }
  function setStep(n) {
    state.step = n;
    $$(".step").forEach((s, i) => { s.classList.toggle("is-done", i + 1 < n); s.classList.toggle("is-current", i + 1 === n); });
    $$(".step-line").forEach((l, i) => l.classList.toggle("is-done", i + 1 < n));
    $$(".note-step").forEach(ns => ns.classList.toggle("is-current", ns.dataset.step === String(n)));
  }
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 2200); }
  const mono = name => name.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  function bindToasts() { $$("[data-toast]").forEach(elm => { if (elm.dataset.bound) return; elm.dataset.bound = "1"; elm.addEventListener("click", e => { e.preventDefault(); toast(elm.dataset.toast); }); }); }

  /* ================= STEP 1: the first application ================= */
  /* Two paths from one email field. Known email: verify by text now, then the saved resume and answers load (nothing to
     verify later). Unknown email: resume first, verify before the batch send. */
  const LOC = [{ value: "San Antonio", label: "San Antonio" }, { value: "Austin", label: "Austin" }, { value: "Dallas", label: "Dallas" }, { value: "Houston", label: "Houston" }];
  const EEO = ["Prefer not to say"];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isKnownEmail = e => e.trim().toLowerCase() === D.saved.email.toLowerCase();
  const sel = (id, opts, value, why, placeholder) => `<div class="f" id="${id}-w"><label for="${id}">${placeholder}${why ? ` <span class="need">Needs you</span><span class="ok">${I.check}</span>` : ""}</label><select id="${id}">${value === "" ? `<option value="">Choose</option>` : ""}${opts.map(o => `<option${o === value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>${why ? `<div class="hint">${esc(why)}</div>` : ""}</div>`;
  const field = (id, label, why, ph = "") => `<div class="f" id="${id}-w"><label for="${id}">${label} <span class="need">Needs you</span><span class="ok">${I.check}</span></label><input id="${id}" value="" placeholder="${esc(ph)}"><div class="hint">${esc(why)}</div></div>`;

  function renderStep1() {
    setWork(`
      <h1>Your application</h1>
      <p class="lede">Start with your email. Returning? Your saved details load in one step. New? Upload a resume and the form fills itself. <b>About 2 minutes.</b></p>

      <section class="sec" id="sec-email">
        <div class="sec-h"><div class="sec-title">Email</div><span class="tag accent" id="email-tag">Start here</span></div>
        <div id="email-box">
          <div class="f" id="f-start-w"><label for="f-start">Email</label>
            <div class="email-in"><input id="f-start" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com"><span class="lookup" id="lookup"></span></div>
            <div class="hint">${esc(W.email)}</div>
          </div>
        </div>
      </section>

      <section class="sec" id="sec-unlock" hidden>
        <div class="sec-h"><div class="sec-title">${I.shield} Unlock your saved details</div><span class="tag accent" id="unlock-tag">Needs you</span></div>
        <div id="unlock-box"></div>
      </section>

      <section class="sec" id="sec-resume" hidden>
        <div class="sec-h"><div class="sec-title">Resume</div><span class="tag accent" id="resume-tag">Start here</span></div>
        <div id="resume-box">
          <div class="drop" id="drop" tabindex="0" role="button" aria-label="Upload your resume">
            <span class="drop-ic">${I.upload}</span>
            <b>Click to upload or drag and drop</b>
            <small>PDF, DOC or DOCX, up to 10 MB</small>
          </div>
          <div class="hint">${esc(W.resume)}</div>
        </div>
      </section>

      <div id="form-rest" class="form-rest is-dim">
      <section class="sec">
        <div class="sec-h"><div class="sec-title">Contact</div><span class="tag" data-fill-tag>From your resume</span></div>
        <div class="grid2">
          ${field("f-first", "First name", W.first, "Jane")}
          ${field("f-last", "Last name", W.last, "Doe")}
          ${field("f-email", "Email", W.email, "you@example.com")}
          ${field("f-phone", "Phone", W.phone, "(555) 123-4567")}
          <div class="span2">${field("f-backup", "Backup email", W.backup, "A second address")}</div>
        </div>
      </section>

      <section class="sec">
        <div class="sec-h"><div class="sec-title">Address</div><span class="tag" data-fill-tag>From your resume</span></div>
        <div class="grid2">
          <div class="span2">${field("f-street", "Street address", W.street, "Street and number")}</div>
          ${field("f-city", "City", W.city, "City")}
          ${sel("f-state", ["California", "Texas", "Arizona", "Nevada", "Oregon"], "", W.state, "State")}
          ${field("f-zip", "ZIP code", W.zip, "5 digits")}
        </div>
      </section>

      <section class="sec">
        <div class="sec-h"><div class="sec-title">Background</div><span class="tag" data-fill-tag>From your resume</span></div>
        <div class="grid2">
          ${field("f-title", "Current job title", W.title, "e.g. Associate Dentist")}
          ${field("f-grad", "Dental school graduation year", W.grad, "YYYY")}
          <div class="span2">${sel("f-school", [C.school, "University of the Pacific, Arthur A. Dugoni School of Dentistry", "UCLA School of Dentistry", "Loma Linda University School of Dentistry"], "", W.school, "Dental institution")}</div>
        </div>
      </section>

      <section class="sec" id="sec-pref">
        <div class="sec-h"><div class="sec-title">Preferences</div><span class="tag" id="pref-tag">Not on a resume</span></div>
        <div class="grid2">
          <div class="f" id="f-locpref-w"><label for="f-locpref">First location preference <span class="need">Needs you</span><span class="ok">${I.check}</span></label>
            <select id="f-locpref"><option value="">Choose a city</option>${LOC.map(o => `<option value="${o.value}">${o.value}, TX</option>`).join("")}</select>
            <div class="hint">${esc(W.locpref)}</div>
          </div>
          <div class="f" id="f-relocate-w"><label>Open to relocating anywhere? <span class="need">Needs you</span><span class="ok">${I.check}</span></label>
            <div class="seg" id="f-relocate"><button type="button" data-v="yes">Yes</button><button type="button" data-v="no">No</button></div>
            <div class="hint">${esc(W.relocate)}</div>
          </div>
        </div>
      </section>

      <section class="sec" id="sec-eeo">
        <div class="sec-h"><div class="sec-title">Voluntary self-identification</div><span class="tag">Optional</span></div>
        <div class="eeo-summary"><span>Gender, race, disability and veteran status are all set to <b>Prefer not to say</b>. CareerGPT never guesses these.</span><button class="btn-text" type="button" id="eeo-edit">Edit</button></div>
        <div class="eeo-body">
          <div class="grid2">
            ${sel("f-gender", [...EEO, "Male", "Female", "Non-binary"], EEO[0], "", "Gender")}
            ${sel("f-race", [...EEO, "Asian", "Black or African American", "Hispanic or Latino", "White", "Two or more races", "Other"], EEO[0], "", "Race / ethnicity")}
            ${sel("f-disability", [...EEO, "Yes, I have a disability", "No, I don't have a disability"], EEO[0], "", "Disability status")}
            ${sel("f-veteran", [...EEO, "I am a veteran", "I am not a veteran"], EEO[0], "", "Veteran status")}
          </div>
          <div class="hint" style="margin-top:10px">${esc(W.eeo)}</div>
        </div>
      </section>
      </div>

      <p class="consent">By submitting, you agree to an AI agent submitting this application on West Alamo Dental Care's careers site, and to the <a href="#" data-toast="Terms of service (prototype)">terms of service</a> and <a href="#" data-toast="Privacy policy (prototype)">privacy policy</a>.</p>
    `);
    renderCta1();
    bindEmailStart();
    const drop = $("#drop");
    drop.addEventListener("click", openFilePicker);
    drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFilePicker(); } });
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; onResume(f ? f.name : C.resume); });
    $("#f-locpref").addEventListener("change", e => { if (e.target.value) setAnswer("locpref", e.target.value, "form"); });
    $$("#f-relocate button").forEach(b => b.addEventListener("click", () => setAnswer("relocate", b.dataset.v, "form")));
    $("#form-rest").addEventListener("input", syncSubmit);
    $("#form-rest").addEventListener("change", syncSubmit);
    $("#f-backup").addEventListener("input", checkBackup);
    $("#f-email").addEventListener("input", checkBackup);
    $("#f-backup").addEventListener("change", e => { if (e.target.value.trim()) setAnswer("backup", e.target.value.trim(), "form"); });
    $$("#form-rest input, #form-rest select").forEach(el => el.addEventListener("input", updateProgress));
    $("#eeo-edit").addEventListener("click", openEeo);
    bindToasts();
    setTimeout(() => { const i = $("#f-start"); if (i && !state.identity) i.focus(); }, 350);
  }

  /* Email lookup as they type: a short check, then "Welcome back" or "New here" inside the field. */
  function bindEmailStart() {
    const inp = $("#f-start"), look = $("#lookup");
    let t = null;
    const check = () => {
      const v = inp.value.trim();
      clearTimeout(t); state.lookup = null; renderCta1();
      if (!EMAIL_RE.test(v)) { look.innerHTML = ""; return; }
      look.innerHTML = `<span class="think"><span class="tdot"></span></span>`;
      setStatus("Checking…", true);
      t = setTimeout(() => {
        state.lookup = isKnownEmail(v) ? "returning" : "new";
        look.innerHTML = state.lookup === "returning" ? `<span class="tag dark">Welcome back</span>` : `<span class="tag">New here</span>`;
        setStatus(state.lookup === "returning" ? "Welcome back" : "New here");
        renderCta1();
      }, reduce ? 10 : 700);
    };
    inp.addEventListener("input", check);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (state.lookup) startWithEmail(); } });
  }

  async function startWithEmail() {
    const inp = $("#f-start"); if (!inp) return;
    const v = inp.value.trim();
    if (!EMAIL_RE.test(v) || state.identity) return;
    state.identity = state.lookup || (isKnownEmail(v) ? "returning" : "new");
    state.email = v;
    $("#f-email").value = v; $("#f-email-w").classList.add("done");
    $("#email-box").innerHTML = `<div class="resume"><div class="ic">${I.mail}</div><div><div class="nm">${esc(v)}</div><div class="sub">${state.identity === "returning" ? "Welcome back, your saved details are ready to unlock" : "New here"}</div></div><button class="btn-text act" type="button" id="email-change">Change</button></div>`;
    $("#email-tag").textContent = "Done"; $("#email-tag").classList.remove("accent");
    $("#email-change").addEventListener("click", changeEmail);
    user(v);
    if (state.identity === "new") {
      $("#sec-resume").hidden = false;
      renderCta1();
      const row = chipRow([{ value: "upload", label: "Upload resume" }, { value: "hand", label: "I'll fill it in by hand" }], o => o.value === "upload" ? openFilePicker() : startByHand());
      state.startRow = row;
      await agent("New here, welcome. Upload your resume and I'll fill most of this form from it. You only check the answers that need you.", { think: 700, thinkLabel: "Looking you up…", chips: row, status: "Upload your resume" });
      return;
    }
    state.otpMode = "unlock"; state.otpChannel = "sms";
    state.maskedPhone = maskPhone(D.saved.profile.phone); state.maskedEmail = maskEmail(v);
    $("#sec-unlock").hidden = false;
    $("#unlock-box").innerHTML = otpHtml();
    bindOtp(onUnlocked);
    renderCta1();
    await agent(`Welcome back. You've applied with me before, so I texted a code to ${state.maskedPhone}. Enter it and I'll load your resume and the ${D.saved.answerCount} answers from your last application.`, { think: 900, thinkLabel: "Looking you up…", meta: "Found your saved details in 1s", status: "Enter the code we texted" });
    const first = $("#otp input"); if (first) first.focus();
  }
  function changeEmail() {
    if (state.formActive || state.unlocked) { toast("Restart the prototype to use a different email"); return; }
    state.identity = null; state.lookup = null; state.email = null;
    renderStep1();
    agent("Sure, which email should I use?", { think: 250, status: "Start with your email" });
  }

  /* Returning candidate, after the code: everything loads, the resume asks to be checked. */
  async function onUnlocked() {
    state.verified = true; state.unlocked = true; state.formActive = true; state.filled = true;
    Object.assign(state.answers, D.saved.answers);
    const es = $("#email-box .sub"); if (es) es.textContent = "Welcome back";
    $("#sec-unlock").innerHTML = `<div class="sec-h"><div class="sec-title">${I.shield} Verified by text</div><span class="tag">Done</span></div><p class="hint" style="font-size:14px;color:var(--t2);margin:0">That's the only code you'll enter. It also covers sending the applications at the end.</p>`;
    $("#sec-resume").hidden = false;
    renderSavedResume();
    $("#form-rest").classList.remove("is-dim");
    $$("[data-fill-tag]").forEach(t => { t.textContent = "Saved from your last application"; });
    renderCta1();
    const P = D.saved.profile;
    const seq = [["f-first", P.first], ["f-last", P.last], ["f-phone", P.phone], ["f-backup", P.backupEmail], ["f-street", P.street], ["f-city", P.city], ["f-state", P.state], ["f-zip", P.zip], ["f-title", P.title], ["f-school", P.school], ["f-grad", P.gradYear], ["f-locpref", P.locpref]];
    const fillAll = (async () => {
      for (const [id, v] of seq) {
        const el = $("#" + id); el.value = v;
        const w = el.closest(".f"); w.classList.remove("flash"); void w.offsetWidth; w.classList.add("flash", "done");
        updateProgress();
        await wait(70);
      }
      state.a.backup = P.backupEmail; state.a.relocate = P.relocate;
      $$("#f-relocate button").forEach(b => b.classList.toggle("on", b.dataset.v === P.relocate));
      $("#f-relocate-w").classList.add("done");
      /* A saved answer whose context changed is re-checked in the form itself (the chat asks the same thing on desktop). */
      const lw = $("#f-locpref-w"); lw.classList.remove("done"); lw.classList.add("needs");
      lw.querySelector(".hint").innerHTML = `Last time you chose <b>${esc(P.locpref)}</b>. This job's in San Antonio.<div class="chips mini"><button type="button" class="chip" data-loc="San Antonio">Switch to San Antonio</button><button type="button" class="chip" data-loc="${esc(P.locpref)}">Keep ${esc(P.locpref)}</button></div>`;
      $$("#f-locpref-w [data-loc]").forEach(b => b.addEventListener("click", () => setAnswer("locpref", b.dataset.loc, "form")));
      updateProgress();
    })();
    const card = document.createElement("div"); card.className = "mcard";
    card.innerHTML = `<ul>
      <li>${I.check}<span><b>Resume</b> from ${esc(fmtDate(D.saved.resume.uploaded))}, your application to ${esc(D.saved.resume.from)}</span></li>
      <li>${I.check}<span><b>Contact, address and background</b></span></li>
      <li>${I.check}<span><b>Preferences</b> ${esc(P.locpref)} first, open to relocating</span></li>
      <li>${I.check}<span><b>Answer bank</b> Texas license, start date, years of experience</span></li>
    </ul>`;
    await agent(`Loaded: your resume from ${fmtDate(D.saved.resume.uploaded)} and ${D.saved.answerCount} answers from your last application.`, { until: fillAll, thinkLabel: "Loading your saved details…", meta: "Loaded your saved details in 1s", card, status: `${D.saved.answerCount} of 19 loaded` });
    const row = chipRow([{ value: "use", label: "Use it" }, { value: "preview", label: "Preview first" }, { value: "replace", label: "Replace" }], o => { if (o.value === "use") confirmResume("chat"); else if (o.value === "preview") openPreview(); else openFilePicker(); });
    state.resumeRow = row;
    await agent(`One thing I can't check for you: is that resume still current? It's ${ageText(daysSince(D.saved.resume.uploaded))} old.`, { think: 400, chips: row, status: "Check your resume" });
    const loc = await ask("locpref", `Last time your first location was ${P.locpref}. This job's in San Antonio. Switch, or keep ${P.locpref}?`, [{ value: "San Antonio", label: "San Antonio" }, { value: P.locpref, label: `Keep ${P.locpref}` }], { onPick: o => setAnswer("locpref", o.value, "chat"), think: 400, status: state.resumeConfirmed ? "Confirm your location" : "Check your resume" });
    await agent(state.resumeConfirmed ? "Everything's ready. Submit when it looks right to you." : "Everything else is ready. Confirm the resume and submit.", { think: 400, status: state.resumeConfirmed ? "Ready to submit" : "Confirm your resume" });
  }
  function renderSavedResume() {
    const R = D.saved.resume, age = daysSince(R.uploaded), stale = age > 90;
    const tag = $("#resume-tag"); tag.textContent = "Still current?"; tag.classList.add("accent");
    $("#resume-box").innerHTML = `
      <div class="saved-resume${stale ? " stale" : ""}" id="saved-resume">
        <div class="sr-top"><div class="ic">${I.doc}</div><div class="sr-meta"><div class="nm">${esc(R.name)}</div><div class="sub">Uploaded ${esc(fmtDate(R.uploaded))} · ${esc(ageText(age))} ago · from your application to ${esc(R.from)}</div><div class="sr-chips">${D.saved.summary.map(x => `<span>${esc(x)}</span>`).join("")}</div></div></div>
        <div class="sr-q">${stale ? `This one is ${esc(ageText(age))} old. Still current?` : "Still current? Check it before it's attached."}</div>
        <div class="sr-actions">
          <button class="btn btn-secondary" type="button" id="resume-preview">${I.eye} Preview</button>
          <button class="btn ${stale ? "btn-secondary" : "btn-primary"}" type="button" id="resume-use">Use this resume</button>
          <button class="btn ${stale ? "btn-primary" : "btn-text"}" type="button" id="resume-replace">${stale ? `${I.upload} Replace` : "Replace"}</button>
        </div>
      </div>`;
    $("#resume-preview").addEventListener("click", openPreview);
    $("#resume-use").addEventListener("click", () => confirmResume("form"));
    $("#resume-replace").addEventListener("click", openFilePicker);
  }
  function confirmResume(source) {
    if (state.resumeConfirmed) return;
    state.resumeConfirmed = true; state.resume = D.saved.resume.name;
    if (state.resumeRow) { const b = state.resumeRow.querySelector('.chip[data-value="use"]'); if (b) markChip(state.resumeRow, b); }
    const R = D.saved.resume;
    $("#resume-box").innerHTML = `<div class="resume"><div class="ic">${I.doc}</div><div><div class="nm">${esc(R.name)}</div><div class="sub">Uploaded ${esc(fmtDate(R.uploaded))} · confirmed as current</div></div><span class="act"><button class="btn-text" type="button" id="resume-preview">Preview</button> · <button class="btn-text" type="button" id="resume-replace">Replace</button></span></div>`;
    $("#resume-preview").addEventListener("click", openPreview);
    $("#resume-replace").addEventListener("click", openFilePicker);
    const tag = $("#resume-tag"); tag.textContent = "Confirmed"; tag.classList.remove("accent");
    closePreview();
    renderCta1(); updateProgress();
    if (source !== "chat") { user("Use it"); }
    agent("Resume confirmed.", { think: 200, status: state.pending.locpref && state.pending.locpref.row.classList.contains("answered") ? "Ready to submit" : "Resume confirmed" });
  }

  /* Resume preview: a drawer on desktop, the whole screen on a phone. The document is rendered, not a picture of it. */
  function resumeDocHtml() {
    const R = D.resumeDoc;
    return `<div class="page">
        <div class="pg-head"><div class="pg-name">${esc(R.name)}</div><div class="pg-title">${esc(R.title)}</div><div class="pg-contact">${esc(R.contact)}</div></div>
        <h4>Summary</h4><p>${esc(R.summary)}</p>
        <h4>Experience</h4>
        ${R.experience.map(e => `<div class="pg-item"><div class="pg-row"><b>${esc(e.role)}</b><span>${esc(e.dates)}</span></div><div class="pg-org">${esc(e.org)}</div><ul>${e.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul></div>`).join("")}
        <div class="pg-num">1 of 2</div>
      </div>
      <div class="page">
        <h4>Education</h4>
        ${R.education.map(e => `<div class="pg-item"><div class="pg-row"><b>${esc(e.degree)}</b><span>${esc(e.year)}</span></div><div class="pg-org">${esc(e.org)}</div></div>`).join("")}
        <h4>Licenses and certifications</h4><ul>${R.licenses.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
        <h4>Skills</h4><p>${esc(R.skills)}</p>
        <div class="pg-num">2 of 2</div>
      </div>`;
  }
  function openPreview() {
    const R = D.saved.resume;
    $("#pv-name").textContent = R.name;
    $("#pv-sub").textContent = `Uploaded ${fmtDate(R.uploaded)} · ${ageText(daysSince(R.uploaded))} ago · ${R.pages} pages`;
    $("#pv-body").innerHTML = resumeDocHtml();
    $("#pv-foot").innerHTML = state.resumeConfirmed
      ? `<button class="btn btn-secondary" type="button" id="pv-replace">Replace</button><button class="btn btn-primary" type="button" id="pv-done">Done</button>`
      : `<button class="btn btn-secondary" type="button" id="pv-replace">Replace</button><button class="btn btn-primary" type="button" id="pv-use">Use this resume</button>`;
    $("#pv-replace").addEventListener("click", () => { closePreview(); openFilePicker(); });
    const u = $("#pv-use"); if (u) u.addEventListener("click", () => confirmResume("form"));
    const d = $("#pv-done"); if (d) d.addEventListener("click", closePreview);
    $("#preview").classList.add("open"); $("#pv-backdrop").classList.add("show"); $("#preview").setAttribute("aria-hidden", "false");
    $("#pv-body").scrollTop = 0;
  }
  function closePreview() { $("#preview").classList.remove("open"); $("#pv-backdrop").classList.remove("show"); $("#preview").setAttribute("aria-hidden", "true"); }
  $("#pv-close").addEventListener("click", closePreview);
  $("#pv-backdrop").addEventListener("click", closePreview);

  const daysSince = iso => Math.max(0, Math.round((Date.now() - new Date(iso + "T12:00:00")) / 86400000));
  const fmtDate = iso => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const ageText = d => d < 1 ? "today" : d === 1 ? "1 day" : d < 60 ? `${d} days` : `${Math.round(d / 30)} months`;

  function renderCta1() {
    if (!state.identity) {
      setCta(`<div class="cta-in"><div class="cta-meta"><span>Your email first. Everything else follows from it.</span></div>
        <div class="cta-actions"><button class="btn btn-primary" type="button" id="email-go"${state.lookup ? "" : " disabled"}>Continue ${I.arrow}</button></div></div>`);
      $("#email-go").addEventListener("click", startWithEmail);
      return;
    }
    if (state.identity === "returning" && !state.unlocked) {
      setCta(`<div class="cta-in"><div class="cta-meta"><span>Enter the code to load your saved details</span></div><div class="cta-actions"><button class="btn btn-primary" type="button" disabled>${I.shield} Unlock</button></div></div>`);
      return;
    }
    if (!state.formActive) {
      setCta(`<div class="cta-in"><div class="cta-meta"><span>19 questions. Most of them fill themselves from your resume.</span></div>
        <div class="cta-actions"><button class="btn btn-ghost" type="button" id="byhand">Fill in by hand</button><button class="btn btn-primary" type="button" id="upload-cta">${I.upload} Upload resume</button></div></div>`);
      $("#upload-cta").addEventListener("click", openFilePicker);
      $("#byhand").addEventListener("click", startByHand);
      return;
    }
    if (state.processing) {
      setCta(`<div class="cta-in"><div class="cta-meta"><span>Reading your resume</span></div><div class="cta-actions"><button class="btn btn-primary" type="button" disabled>Filling in…</button></div></div>`);
      return;
    }
    const needConfirm = state.identity === "returning" && !state.resumeConfirmed;
    setCta(`<div class="cta-in"><div class="cta-meta"><div class="bar"><i id="bar-i" style="width:0%"></i></div><span><b id="ans-n">0</b> of 19 answered${needConfirm ? " · confirm your resume" : ""}</span></div>
      <div class="cta-actions"><button class="btn btn-primary" type="button" id="submit1"${needConfirm ? " disabled" : ""}>Submit application ${I.arrow}</button></div></div>`);
    $("#submit1").addEventListener("click", submitFirst);
    syncSubmit();
    updateProgress();
  }

  /* Prototype: no file dialog. Choosing "upload" behaves as if the sample resume was picked, then pre-populates the form. */
  function openFilePicker() { onResume(C.resume); }
  $("#plus").addEventListener("click", () => { if (state.step === 1 && state.identity && !state.resume) openFilePicker(); else toast("Attachments (prototype)"); });

  function startByHand() {
    if (state.formActive) return;
    state.formActive = true; state.filled = true;
    $("#form-rest").classList.remove("is-dim");
    $$("[data-fill-tag]").forEach(t => { t.textContent = "Type your answers"; });
    ["f-backup", "f-locpref", "f-relocate"].forEach(id => $(`#${id}-w`).classList.add("needs"));
    renderCta1();
    markStart("hand");
    user("I'll fill it in by hand");
    agent("No problem. The form is open on the right, every answer says why it's needed. I'll check it as you go, and you can upload a resume later with the + button.", { think: 500, status: "Fill in the form" });
    $("#f-first").focus();
  }

  function updateProgress() {
    if (!state.filled) return;
    const fields = $$("#form-rest input, #form-rest select");
    let n = fields.filter(f => f.value && f.value.trim()).length + (state.a.relocate ? 1 : 0) + (state.resume ? 1 : 0);
    const an = $("#ans-n"); if (an) an.textContent = n;
    const bar = $("#bar-i"); if (bar) bar.style.width = Math.min(100, n / 19 * 100) + "%";
    const left = ["backup", "locpref", "relocate"].filter(k => !state.a[k]).length;
    const tag = $("#pref-tag"); if (tag) { tag.textContent = left ? `${left} need${left === 1 ? "s" : ""} you` : "Done"; tag.classList.toggle("accent", left > 0); }
    if (state.identity === "new" && state.filled && !state.processing && n < 19) setStatus(`${n} of 19 filled · ${19 - n} to go`);
    if (state.identity === "new" && n >= 19) setStatus("Ready to submit");
    syncSubmit();
    if (n >= 19) { const b = $("#submit1"); if (b && !b.disabled) b.classList.add("pulse"); }
  }

  /* Backup email must differ from the main email (case-insensitive). */
  const BACKUP_ERR = "Backup email must be different from your main email.";
  const sameAsMain = v => { const m = (($("#f-email") && $("#f-email").value) || "").trim().toLowerCase(), b = String(v || "").trim().toLowerCase(); return !!m && !!b && m === b; };
  function checkBackup() {
    const w = $("#f-backup-w"), inp = $("#f-backup"); if (!w || !inp) return true;
    let err = $("#f-backup-err");
    if (!err) { err = document.createElement("div"); err.id = "f-backup-err"; err.className = "err"; err.setAttribute("role", "alert"); err.hidden = true; err.textContent = BACKUP_ERR; w.appendChild(err); }
    const bad = sameAsMain(inp.value);
    err.hidden = !bad; w.classList.toggle("invalid", bad);
    if (bad) { state.a.backup = null; w.classList.remove("done", "flash"); w.classList.add("needs"); updateProgress(); }
    return !bad;
  }

  function setAnswer(key, value, source) {
    if (key === "backup" && sameAsMain(value)) { $("#f-backup").value = value; checkBackup(); return; }
    state.a[key] = value;
    const w = $(`#f-${key}-w`);
    if (key === "locpref") { $("#f-locpref").value = value; $$("#f-locpref-w [data-loc]").forEach(b => b.classList.toggle("on", b.dataset.loc === value)); }
    if (key === "backup") { $("#f-backup").value = value; checkBackup(); }
    if (key === "relocate") $$("#f-relocate button").forEach(b => b.classList.toggle("on", b.dataset.v === value));
    if (w) { w.classList.remove("needs", "flash"); void w.offsetWidth; w.classList.add("done", "flash"); if (source === "chat" && !isMobile()) w.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); }
    if (source === "form" && state.pending[key]) state.pending[key].answer(value);
    updateProgress();
  }
  function openEeo() { const s = $("#sec-eeo"); if (!s) return; s.classList.add("open"); s.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }); }
  function focusField(id) { const el = $("#" + id); if (!el) return; el.closest(".f").classList.add("needs"); el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); el.focus(); }

  /* Resume: processing card (6s, four emoji stages, progress bar), then fields fill one by one. */
  function runProcessing(name) {
    state.resume = null; state.processing = true; state.formActive = true;
    const tag = $("#resume-tag"); tag.textContent = "Reading"; tag.classList.remove("accent");
    const box = $("#resume-box");
    box.innerHTML = `<div class="proc" id="proc"><div class="proc-emoji" id="proc-e">${STAGES[0].e}</div><div class="proc-t" id="proc-t">${STAGES[0].t}</div><div class="proc-bar"><i id="proc-i"></i></div><div class="proc-pct" id="proc-p">0% complete</div></div>
      <div class="hint">${esc(name)} · ${esc(W.resume)}</div>`;
    renderCta1();
    const total = reduce ? 10 : 6200, start = performance.now();
    return new Promise(resolve => {
      let stage = 0;
      const tick = () => {
        const p = Math.min(1, (performance.now() - start) / total);
        const s = Math.min(3, Math.floor(p * 4));
        if (s !== stage) { stage = s; const e = $("#proc-e"); e.textContent = STAGES[s].e; e.classList.remove("pop"); void e.offsetWidth; e.classList.add("pop"); $("#proc-t").textContent = STAGES[s].t; }
        $("#proc-i").style.width = (p * 100) + "%";
        $("#proc-p").textContent = Math.round(p * 100) + "% complete";
        if (p < 1) requestAnimationFrame(tick); else { state.resume = name; state.processing = false; resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }
  async function fillFromResume() {
    const box = $("#resume-box");
    box.innerHTML = `<div class="resume"><div class="ic">${I.doc}</div><div><div class="nm">${esc(state.resume)}</div><div class="sub">Uploaded just now · 11 answers filled from it</div></div><button class="btn-text act" type="button" data-change>Change</button></div>`;
    $("#resume-tag").textContent = "Uploaded";
    $("#resume-tag").classList.remove("accent");
    $("[data-change]").addEventListener("click", openFilePicker);
    $("#form-rest").classList.remove("is-dim");
    state.filled = true;
    if (state.identity === "returning") state.resumeConfirmed = true;
    renderCta1();
    const seq = [["f-first", C.first], ["f-last", C.last], ["f-email", $("#f-email").value || C.email], ["f-phone", C.phone], ["f-street", C.street], ["f-city", C.city], ["f-state", C.state], ["f-zip", C.zip], ["f-title", C.title], ["f-school", C.school], ["f-grad", C.gradYear]];
    for (const [id, v] of seq) {
      const el = $("#" + id); el.value = v;
      const w = el.closest(".f"); w.classList.remove("flash"); void w.offsetWidth; w.classList.add("flash", "done");
      if (id === "f-street" && !isMobile()) w.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      updateProgress();
      await wait(120);
    }
    ["backup", "locpref", "relocate"].forEach(k => { if (!state.a[k]) $(`#f-${k}-w`).classList.add("needs"); });
    updateProgress();
    if (!isMobile()) $("#sec-resume").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  async function onResume(name) {
    if (state.processing) return;
    const replacing = state.identity === "returning";
    if (replacing && state.resumeRow) { const b = state.resumeRow.querySelector('.chip[data-value="replace"]'); if (b) markChip(state.resumeRow, b); }
    closePreview();
    markStart("upload");
    user(name, { attachment: true });
    const done = runProcessing(name).then(fillFromResume);
    if (replacing) {
      await agent("New resume in. I re-read it and updated the 11 answers it covers; everything else stays as it was.", { until: done, thinkLabel: "Reading your resume…", meta: "Read your resume in 6s", status: "New resume in" });
      await agent("Everything's ready. Submit when it looks right to you.", { think: 300, status: "Ready to submit" });
      return;
    }
    const card = document.createElement("div"); card.className = "mcard";
    card.innerHTML = `<ul>
      <li>${I.check}<span><b>Name, email and phone</b></span></li>
      <li>${I.check}<span><b>Address</b> 845 Hayes St, San Francisco</span></li>
      <li>${I.check}<span><b>Associate Dentist</b>, DDS UCSF 2016</span></li>
      <li>${I.check}<span><b>Voluntary questions</b> set to "Prefer not to say"</span></li>
    </ul>`;
    await agent(`Done. I filled 11 of 19 answers from your resume and set the 4 voluntary ones to "Prefer not to say". 3 aren't on a resume, so they need you.`, { until: done, thinkLabel: "Reading your resume…", meta: "Read your resume in 6s", card });
    const be = await ask("backup", "First: West Alamo asks for a backup email in case your main one is already registered with them. Your resume also lists " + C.backupEmail + ". Use that?", [{ value: C.backupEmail, label: "Use " + C.backupEmail }, { value: "other", label: "Type a different one" }], { onPick: o => o.value === "other" ? focusField("f-backup") : setAnswer("backup", o.value, "chat"), think: 400, status: "Backup email needs you" });
    if (be.value === "other") await agent("Sure, it's highlighted in the form.", { think: 300 });
    const loc = await ask("locpref", "West Alamo asks for a first location preference. The job's in San Antonio and your resume says San Francisco. What should I put?", LOC, { onPick: o => setAnswer("locpref", o.value, "chat"), think: 400, status: "Location needs you" });
    await agent(`Done, ${loc.value} it is.`, { think: 300 });
    const rel = await ask("relocate", "And are you open to relocating anywhere?", [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }], { onPick: o => setAnswer("relocate", o.value, "chat"), think: 300, status: "Relocation needs you" });
    await agent(rel.value === "yes" ? "Noted, I've put Yes." : "Noted, I've put No.", { think: 300 });
    await agent("The voluntary questions (gender, race, disability, veteran status) are optional and only used for the employer's equal-opportunity reporting. I never guess them.", { think: 400, links: [{ label: "Open them if you'd like to answer", onClick: openEeo }] });
    await agent("Everything's ready. Submit when it looks right to you.", { think: 400, status: "Ready to submit" });
  }

  async function runStep1Chat() {
    await agent("Hi, I'm CareerGPT. I fill job applications so you don't have to. Start with your email: if you've applied with me before, your resume and answers load in one step. If not, I'll read your resume and fill the form from it.", { think: 700, status: "Start with your email" });
  }
  /* The form (drop zone, sample link, CTA) can answer the chat's first question too: mark the matching chip. */
  function markStart(value) { const row = state.startRow; if (!row) return; const b = row.querySelector(`.chip[data-value="${value}"]`); if (b) markChip(row, b); }

  function shakeField(key) {
    const w = $(`#${key}-w`) || $(`#f-${key}-w`); if (!w) return;
    w.classList.add("needs");
    w.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    w.classList.remove("shake"); void w.offsetWidth; w.classList.add("shake");
  }
  const REQUIRED1 = ["f-first", "f-last", "f-email", "f-phone", "f-backup", "f-street", "f-city", "f-state", "f-zip", "f-title", "f-school", "f-grad", "f-locpref"];
  /* The Submit button stays greyed out until every answer is in, the backup email differs from the main one, and (returning) the resume is confirmed. */
  function formComplete() {
    if (!REQUIRED1.every(id => { const el = $("#" + id); return el && (el.value || "").trim(); })) return false;
    if (!state.a.relocate || sameAsMain($("#f-backup").value)) return false;
    return !(state.identity === "returning" && !state.resumeConfirmed);
  }
  function syncSubmit() {
    const b = $("#submit1"); if (!b || b.dataset.busy) return;
    const ok = formComplete(); b.disabled = !ok; if (!ok) b.classList.remove("pulse");
  }
  async function submitFirst() {
    const required = REQUIRED1;
    const missing = required.filter(id => !($("#" + id).value || "").trim());
    if (!checkBackup()) { shakeField("f-backup"); agent("Your backup email can't be the same as your main one. Please add a different address.", { think: 250 }); return; }
    if (!state.a.relocate) missing.push("f-relocate");
    if (missing.length) {
      shakeField(missing[0]);
      agent(missing.length === 1 ? "One thing first: the highlighted answer in the form." : `${missing.length} answers are still empty. I've highlighted the first one.`, { think: 250 });
      return;
    }
    if (state.identity === "returning" && !state.resumeConfirmed) {
      const sr = $("#saved-resume"); if (sr) { sr.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); sr.classList.remove("shake"); void sr.offsetWidth; sr.classList.add("shake"); }
      agent("One thing first: confirm the resume. It's the one answer I can't check for you.", { think: 250 });
      return;
    }
    const btn = $("#submit1"); btn.dataset.busy = "1"; btn.disabled = true; btn.innerHTML = "Submitting…";
    state.email = ($("#f-email").value || "").trim() || C.email;
    state.phone = ($("#f-phone").value || "").trim() || C.phone;
    agent("Submitting to West Alamo Dental Care.", { think: 250 });
    setStatus("Submitting…", true);
    await runChecklist("Submitting your application", ["Opening West Alamo Dental Care's careers site", "Filling 19 answers", `Attaching ${state.resume || "your resume"}`, "Submitting"]);
    state.sent = [D.firstJob];
    resetSelection();
    collapseThread("Apply · sent to West Alamo");
    setStep(2); renderStep2(false, false, true); runStep2Chat();
  }
  async function runChecklist(title, items) {
    setWork(`<div class="send-card"><h2>${esc(title)}</h2><ul class="steps">${items.map(t => `<li><span class="dot">${I.check}</span><span>${esc(t)}</span></li>`).join("")}</ul></div>`);
    setCta(`<div class="cta-in"><div class="cta-meta"><span>Working on the employer's site</span></div><div class="cta-actions"><button class="btn btn-primary" disabled>Submitting…</button></div></div>`);
    for (const li of $$(".steps li")) { li.classList.add("doing"); await wait(620); li.classList.remove("doing"); li.classList.add("done"); }
    await wait(350);
  }

  /* ================= STEP 2: what else could work ================= */
  /* Liquidity first. The exact role in the exact city is usually thin, so the options relax one thing at a time (role,
     location, hours, pay) and show what each relaxation unlocks, counted live. Exact matches always come first; roles at
     the employer they just applied to are never suggested. The candidate's own answers (first location, open to
     relocating) decide whether location or role relaxes first. */
  const A = D.firstJob;
  const FT = "Full-time";
  const sameEmployer = j => j.company === A.company;
  const sentIds = () => new Set(state.sent.map(j => j.id));
  const candidates = () => D.jobs.filter(j => !sameEmployer(j) && !sentIds().has(j.id));
  const hiddenSameEmployer = () => D.jobs.filter(j => sameEmployer(j) && !sentIds().has(j.id)).length;
  const passesPay = () => true;
  /* Pay is a descriptor of every option, not a separate control: the floor of the listed salaries, rounded down to $5K. */
  const payFloor = jobs => { const v = jobs.map(j => j.salaryMin).filter(x => x != null); return v.length ? Math.floor(Math.min(...v) / 5) * 5 : null; };
  const optionLabel = b => `${b.label}${b.floor ? `, $${b.floor}K+` : ""}`;
  const relocating = () => (state.a.relocate || D.saved.profile.relocate) === "yes";
  const LEAD = ["Lead Dentist", "Dental Director"];
  const BUNDLE_DEFS = [
    { id: "exact", label: `${A.title}, San Antonio area`, why: "Same role, same area, a different employer", changes: [], test: j => j.title === A.title && j.area === "sa" && j.shift === FT, dist: () => 0 },
    { id: "role-tx", label: `${A.title}, elsewhere in Texas`, why: "Same role, wider area", changes: ["Location: Texas"], test: j => j.title === A.title && j.area === "tx" && j.shift === FT, dist: () => relocating() ? 1 : 1.5 },
    { id: "senior-tx", label: "Senior Dentist, Texas", why: "A step up, same state", changes: ["Role: senior"], test: j => j.title === "Senior Dentist" && j.area !== "us" && j.shift === FT, dist: () => 1.2 },
    { id: "assoc-sa", label: "Associate Dentist, San Antonio area", why: "Same area, associate title", changes: ["Role: associate"], test: j => j.title === "Associate Dentist" && j.area === "sa" && j.shift === FT, dist: () => relocating() ? 1.5 : 1 },
    { id: "lead-sa", label: "Lead Dentist or Dental Director, San Antonio area", why: "Same area, a leadership title", changes: ["Role: leadership"], test: j => LEAD.includes(j.title) && j.area === "sa" && j.shift === FT, dist: () => relocating() ? 1.6 : 1.1 },
    { id: "shift-tx", label: "Part-time or weekend dentist roles, Texas", why: "Different hours, same state", changes: ["Hours: part-time or weekends"], test: j => j.shift !== FT && j.area !== "us", dist: () => 1.8 },
    { id: "remote", label: "Remote or hybrid dentist roles", why: "Work from anywhere", changes: ["Location: remote"], test: j => j.remote, dist: () => 1 },
    { id: "role-us", label: `${A.title}, other states`, why: "Same role, open to relocating", changes: ["Location: anywhere in the US"], test: j => j.title === A.title && j.area === "us" && j.shift === FT, dist: () => relocating() ? 2 : 3 },
    { id: "senior-us", label: "Senior Dentist, other states", why: "A step up, open to relocating", changes: ["Role: senior", "Location: anywhere in the US"], test: j => j.title === "Senior Dentist" && j.area === "us" && j.shift === FT, dist: () => relocating() ? 2.2 : 3.2 },
    { id: "assoc-tx", label: "Associate Dentist, elsewhere in Texas", why: "Associate title, wider area", changes: ["Role: associate", "Location: Texas"], test: j => j.title === "Associate Dentist" && j.area === "tx" && j.shift === FT, dist: () => 2.4 },
    { id: "lead-tx", label: "Lead Dentist or Dental Director, elsewhere in Texas", why: "A leadership title, wider area", changes: ["Role: leadership", "Location: Texas"], test: j => LEAD.includes(j.title) && j.area === "tx" && j.shift === FT, dist: () => 2.5 },
    { id: "assoc-us", label: "Associate Dentist, other states", why: "Associate title, open to relocating", changes: ["Role: associate", "Location: anywhere in the US"], test: j => j.title === "Associate Dentist" && j.area === "us" && j.shift === FT, dist: () => 3.4 },
    { id: "lead-us", label: "Lead Dentist or Dental Director, other states", why: "A leadership title, open to relocating", changes: ["Role: leadership", "Location: anywhere in the US"], test: j => LEAD.includes(j.title) && j.area === "us" && j.shift === FT, dist: () => 3.5 },
    { id: "shift-us", label: "Part-time or weekend dentist roles, other states", why: "Different hours, open to relocating", changes: ["Hours: part-time or weekends", "Location: anywhere in the US"], test: j => j.shift !== FT && j.area === "us", dist: () => 3.8 },
  ];
  /* bundles(): every candidate role lands in the first option it matches, so counts never double up. */
  function bundles() {
    const left = candidates().filter(passesPay);
    const out = BUNDLE_DEFS.map(b => ({ ...b, jobs: [] }));
    left.forEach(j => { const b = out.find(x => x.test(j)); if (b) b.jobs.push(j); });
    out.forEach(b => { b.jobs.sort(byRank); b.floor = payFloor(b.jobs); b.name = optionLabel(b); });
    return out.filter(b => b.jobs.length).sort((a, b) => a.dist() - b.dist());
  }
  /* Three options at a time: the closest three by default, plus anything already ticked; "More options" reveals three more. */
  const SHOW = 3;
  const visibleBundles = () => { const bs = bundles(); return bs.filter((b, i) => i < state.shown || state.bundlesOn.has(b.id)); };
  const hiddenBundles = () => { const v = new Set(visibleBundles().map(b => b.id)); return bundles().filter(b => !v.has(b.id)); };
  function showMoreBundles(source) {
    state.shown += SHOW;
    rerenderStep2(); syncBundleChips();
    if (source !== "chat" && state.step2Ready) agent(`${Math.min(SHOW, visibleBundles().length)} more options on the page.`, { think: 150 });
  }
  const bundleOf = j => BUNDLE_DEFS.find(b => b.test(j));
  const pool = () => bundles().filter(b => state.bundlesOn.has(b.id)).flatMap(b => b.jobs);

  /* Effective tier: extra questions already answered (this session, or the answer bank of a returning candidate) don't count,
     so a "quick" job becomes 1-click once its questions are in the bank. */
  const leftQ = j => j.extra.filter(k => !answered(D.questions[k]));
  const tierOf = j => { const n = leftQ(j).length; return n === 0 ? "ready" : n <= 3 ? "quick" : "long"; };
  const bankBoost = p => p.filter(j => D.tierOf(j) !== "ready" && tierOf(j) === "ready").length;
  const groupsFor = p => { const g = { ready: [], quick: [], long: [] }; p.forEach(j => g[tierOf(j)].push(j)); return g; };
  const selectedJobs = () => D.jobs.filter(j => state.selected.has(j.id));
  function unionQuestions(jobs) { const ids = new Set(); jobs.forEach(j => j.extra.forEach(q => ids.add(q))); return Object.keys(D.questions).filter(k => ids.has(k)).map(k => D.questions[k]); }

  /* Daily limit: 10 applications a day, the first one counts. Step 2 can add at most capLeft(); the rest of the eligible
     roles (1-click + quick) wait for tomorrow's email. */
  const DAILY_GOAL = 10;
  const capLeft = () => Math.max(0, DAILY_GOAL - state.sent.length);
  const rankJob = j => (tierOf(j) === "ready" ? 0 : 1) * 10000 + (j.area === "sa" ? 0 : j.area === "tx" ? 1 : 2) * 1000 + (j.miles ?? 999) - (j.early ? 5 : 0);
  const byRank = (a, b) => rankJob(a) - rankJob(b);
  const eligible = () => pool().filter(j => tierOf(j) !== "long").sort(byRank);
  const queued = () => eligible().filter(j => !state.selected.has(j.id));
  const atCap = () => state.selected.size >= capLeft();
  function capToast() { toast(`That's ${DAILY_GOAL} for today. Untick one to swap, or it goes out tomorrow.`); }
  /* Preselection: the exact match, then the next closest options while a whole option still fits in today's limit. */
  function resetSelection() {
    state.bundlesOn = new Set(); state.selected = new Set(); state.shown = SHOW;
    bundles().slice(0, SHOW).forEach((b, i) => {
      const el = b.jobs.filter(j => tierOf(j) !== "long");
      if (i > 0 && (b.dist() > 1.5 || state.selected.size + el.length > capLeft() || state.bundlesOn.size >= 2)) return;
      state.bundlesOn.add(b.id);
      el.forEach(j => { if (state.selected.size < capLeft()) state.selected.add(j.id); });
    });
  }
  function toggleBundle(id, source) {
    const b = bundles().find(x => x.id === id); if (!b) return;
    if (state.bundlesOn.has(id)) { state.bundlesOn.delete(id); b.jobs.forEach(j => state.selected.delete(j.id)); }
    else {
      state.bundlesOn.add(id);
      let cut = false;
      b.jobs.filter(j => tierOf(j) !== "long").forEach(j => { if (atCap()) { cut = true; return; } state.selected.add(j.id); });
      if (cut) capToast();
    }
    rerenderStep2(); syncBundleChips();
    if (state.step2Ready) agent(state.bundlesOn.has(id) ? `Added ${b.name}: ${b.jobs.length} ${plural(b.jobs.length, "role")}. ${state.selected.size} selected${atCap() ? ", today's max" : ""}.` : `Removed ${b.name}. ${state.selected.size} selected.`, { think: 200 });
  }
  function syncBundleChips() {
    const row = state.bundleRow; if (!row) return;
    const vis = new Set(visibleBundles().map(b => b.id));
    $$(".chip", row).forEach(c => { c.classList.toggle("on", state.bundlesOn.has(c.dataset.value)); c.hidden = !vis.has(c.dataset.value); });
    const more = row.parentElement && row.parentElement.querySelector(".msg-links"); if (more) more.hidden = !hiddenBundles().length;
  }
  /* Multi-select chip row for the chat: each chip toggles on its own. */
  function multiRow(options, onToggle) {
    const wrap = document.createElement("div"); wrap.className = "chips multi";
    options.forEach(o => {
      const b = document.createElement("button"); b.type = "button"; b.className = "chip" + (o.on ? " on" : ""); b.dataset.value = o.value;
      b.innerHTML = `<span>${esc(o.label)}</span>${o.count != null ? `<span class="n">${o.count}</span>` : ""}`;
      b.onclick = () => { b.classList.toggle("on"); onToggle(o, b.classList.contains("on")); };
      wrap.appendChild(b);
    });
    return wrap;
  }

  const placeText = j => j.city === "San Antonio" ? "San Antonio · same city as the job" : j.state === "TX" ? `${j.city}, TX · ${j.miles} mi away` : `${j.city}, ${j.state}`;
  const practiceText = j => j.practice === "private" ? "Private practice" : "Group practice";
  const qText = j => { const n = leftQ(j).length; return n ? (tierOf(j) === "long" ? `Longer form · ${n} extra ${plural(n, "question")}` : `${n} extra ${plural(n, "question")}${n < j.extra.length ? ` · ${j.extra.length - n} reused` : ""}`) : "1-click apply · no extra questions"; };
  const jobRow = (j, on, showQ, tag) => `<div class="job${!on ? " off" : ""}${tag ? " queued" : ""}" data-job="${j.id}">
        <div class="mono">${mono(j.company)}</div>
        <div><div class="jt">${esc(j.title)} · ${esc(j.company)}</div><div class="jm">${esc(placeText(j))} · ${practiceText(j)}${j.shift !== FT ? " · " + esc(j.shift) : ""}${j.pay ? " · " + esc(j.pay) : ""}${j.early ? ' · <span class="early">Early applicant</span>' : ""}</div>${showQ ? `<div class="jq${leftQ(j).length ? "" : " ready"}">${qText(j)}</div>` : ""}</div>
        <span class="job-r">${tag ? `<span class="tmrw">${esc(tag)}</span>` : ""}<span class="cb${on ? " on" : ""}">${I.check}</span></span>
      </div>`;

  function bundleHtml(b) {
    const on = state.bundlesOn.has(b.id);
    const sel = b.jobs.filter(j => state.selected.has(j.id)).length;
    const g = groupsFor(b.jobs);
    const mix = [g.ready.length ? `${g.ready.length} 1-click` : "", g.quick.length ? `${g.quick.length} quick` : "", g.long.length ? `${g.long.length} longer` : ""].filter(Boolean).join(" · ");
    const capped = atCap();
    return `<section class="bundle${on ? " on" : ""}${b.id === "exact" ? " exact" : ""}" data-bundle="${b.id}">
      <div class="bundle-h" data-bundle-toggle="${b.id}">
        <span class="cb${on ? (sel === b.jobs.filter(j => tierOf(j) !== "long").length || sel === b.jobs.length ? " on" : " mixed") : ""}">${I.check}</span>
        <div class="bundle-t"><div class="bundle-title">${esc(b.name)} <span class="count">${b.jobs.length}</span>${b.id === "exact" ? '<span class="tag pick">Top pick</span>' : ""}</div>
          <div class="bundle-why">${esc(b.why)}${b.changes.length ? " · " : ""}${b.changes.map(c => `<span class="chg">${esc(c)}</span>`).join(" ")} <span class="mix">· ${mix}</span></div></div>
        <span class="bundle-n">${on ? `${sel} selected` : `${I.plus} Add`}</span>
      </div>
      ${on ? `<div class="bundle-jobs">${b.jobs.map(j => { const s = state.selected.has(j.id); return jobRow(j, s, true, !s && capped && tierOf(j) !== "long" ? "Tomorrow" : ""); }).join("")}</div>` : ""}
    </section>`;
  }

  const SENT_HOLD_MS = 2200;
  function renderStep2(rerender, quiet, intro) {
    const bs = bundles(), exact = bs.find(b => b.id === "exact"), hidden = hiddenSameEmployer();
    const near = visibleBundles(), far = hiddenBundles();
    const st = workScroll.scrollTop;
    setWork(`
      <div class="black-card sent-banner" role="status">
        <div class="big" aria-hidden="true"><span class="em em-party">🎉</span><span class="em em-tick">✅</span></div>
        <div><span class="bc-title">Application sent</span><span class="bc-sub">West Alamo Dental Care</span></div>
        <div class="bc-right">Just now</div>
      </div>
      <div class="s2-rest${intro ? " hold" : ""}" id="s2-rest">
      <div class="pool-h"><h2>What else could work?</h2><span class="live"><b id="live-n">${state.selected.size}</b> ${plural(state.selected.size, "job")} selected</span></div>
      <p class="why-line">${I.sparkle}<span>${state.selected.size ? `Here are some very close matches we can apply to for you easily. We've selected <b>${state.selected.size}</b> ${plural(state.selected.size, "job")} for you. Any differences are highlighted in the details below.` : `Here are some very close matches we can apply to for you easily. Pick any that look right. Any differences are highlighted in the details below.`}</span></p>
      <p class="cap-line">${I.shield}<span>Up to <b>${DAILY_GOAL} applications a day</b>. ${state.sent.length} sent, so up to <b>${capLeft()}</b> here${queued().length && atCap() ? `; the other <b>${queued().length}</b> go out first tomorrow` : ""}.</span></p>
      ${near.map(bundleHtml).join("")}
      ${far.length ? `<button class="btn-text more-opts" type="button" id="more-opts">More options (${far.length}): ${far.slice(0, SHOW).map(b => b.label.split(",")[0]).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</button>` : ""}
      </div>
    `, rerender || quiet);
    const mo = $("#more-opts"); if (mo) mo.addEventListener("click", () => showMoreBundles("form"));
    renderCta2();
    /* First arrival after submitting: let the "Application sent" banner land on its own, then bring in the recommendations. */
    if (intro) {
      const cta = $("#cta"); if (cta) cta.classList.add("hold");
      setTimeout(() => { const r = $("#s2-rest"); if (r) r.classList.remove("hold"); const c = $("#cta"); if (c) c.classList.remove("hold"); }, reduce ? 300 : SENT_HOLD_MS);
    }
    if (rerender) { workScroll.scrollTop = Math.min(st, 180); const n = $("#live-n"); n.classList.remove("pop"); void n.offsetWidth; n.classList.add("pop"); }
    $$("[data-bundle-toggle]").forEach(h => h.addEventListener("click", () => toggleBundle(h.dataset.bundleToggle, "form")));
    $$(".job").forEach(row => row.addEventListener("click", e => { e.stopPropagation(); toggleJob(row.dataset.job); }));
  }
  function rerenderStep2() { const st = workScroll.scrollTop; renderStep2(false, true); workScroll.scrollTop = st; const n = $("#live-n"); if (n) n.textContent = state.selected.size; }
  function toggleJob(id) {
    if (state.selected.has(id)) state.selected.delete(id);
    else if (atCap()) { capToast(); const row = $(`.job[data-job="${id}"]`); if (row) { row.classList.remove("shake"); void row.offsetWidth; row.classList.add("shake"); } return; }
    else state.selected.add(id);
    rerenderStep2();
  }
  function renderCta2() {
    const sel = selectedJobs(), qs = unionQuestions(sel).filter(q => !answered(q)), nOpt = state.bundlesOn.size;
    const mins = qs.length ? Math.max(1, Math.round(qs.length * 0.4)) : 0;
    const meta = sel.length === 0 ? "Add an option or select a role to continue" : `<b>${sel.length}</b> selected${atCap() ? " · today's max" : ""} · ${qs.length ? `${qs.length} extra ${plural(qs.length, "question")} · about ${mins} min` : "no extra questions"}`;
    if (state.step2Ready) setStatus(sel.length ? `${sel.length} selected · ${nOpt} ${plural(nOpt, "option")}${atCap() ? " · today's max" : ""}` : "Add an option to continue");
    setCta(`<div class="cta-in"><div class="cta-meta"><span>${meta}</span></div>
      <div class="cta-actions"><button class="btn btn-ghost" type="button" id="done-early">I'm done for today</button><button class="btn btn-primary" type="button" id="continue2"${sel.length === 0 ? " disabled" : ""}>${sel.length ? `Continue with ${sel.length} ${plural(sel.length, "job")}` : "Continue"} ${I.arrow}</button></div></div>`);
    $("#continue2").addEventListener("click", goStep3);
    $("#done-early").addEventListener("click", finishEarly);
  }
  async function runStep2Chat() {
    await agent("Sent. West Alamo usually replies by email within a week.", { think: 450, status: "Sent to West Alamo" });
    const bs = bundles(), exact = bs.find(b => b.id === "exact"), total = candidates().length, boost = bankBoost(candidates());
    const row = multiRow(bs.map(b => ({ value: b.id, label: b.name, count: b.jobs.length, on: state.bundlesOn.has(b.id) })), (o, on) => { if (on !== state.bundlesOn.has(o.value)) toggleBundle(o.value, "chat"); });
    state.bundleRow = row;
    const onNames = bs.filter(b => state.bundlesOn.has(b.id)).map(b => b.id === "exact" ? `the ${b.jobs.length} in San Antonio` : b.name);
    await agent(`${exact ? `Only ${exact.jobs.length} other ${A.title} ${plural(exact.jobs.length, "opening")} in the San Antonio area right now, selected: same role, different employer.` : `No other ${A.title} openings in the San Antonio area right now.`} Here's what else could work, closest first. I've also selected ${onNames.filter((_, i) => i > 0).join(" and ") || "nothing else yet"}, ${state.selected.size} roles in all${boost ? `, ${boost} of them 1-click thanks to answers from your last application` : ""}. Add or remove any:`, { think: 1400, thinkLabel: "Searching roles…", meta: `Searched ${total} roles in 2s`, chips: row, links: hiddenBundles().length ? [{ label: "More options", onClick: () => showMoreBundles("chat") }] : null, status: `${state.selected.size} selected · ${state.bundlesOn.size} options` });
    syncBundleChips();
    state.step2Ready = true;
    await agent(step2Summary(), { think: 500, status: `${state.selected.size} selected · review and continue` });
  }
  /* One line that also explains the daily limit when more is ticked-able than can go today. */
  function step2Summary() {
    const p = pool(), g = groupsFor(selectedJobs()), k = unionQuestions(g.quick).filter(x => !answered(x)).length, q = queued().length, nOpt = state.bundlesOn.size;
    const mix = `${g.ready.length} 1-click apply${g.quick.length ? `, ${g.quick.length} with ${k} short ${plural(k, "answer")}` : ""}`;
    return q && atCap()
      ? `${state.selected.size} selected across ${nOpt} ${plural(nOpt, "option")}: ${mix}. That's today's max of ${DAILY_GOAL} with West Alamo; the other ${q} go out first tomorrow.`
      : `${state.selected.size} selected across ${nOpt} ${plural(nOpt, "option")}: ${mix}. ${capLeft() - state.selected.size} ${plural(capLeft() - state.selected.size, "slot")} left today, so add another option if any fits, or continue.`;
  }

  /* ================= STEP 3: confirm and send ================= */
  function goStep3() {
    const n = selectedJobs().length, first = !state.step3Seen;
    state.step3Seen = true;
    if (first) collapseThread(`Add more jobs · ${n} selected`);
    setStep(3); renderStep3();
    if (first) runStep3Chat(); else agent(`Back on the last step with ${n} ${plural(n, "job")}.`, { think: 250 });
  }
  function qHtml(q) {
    const v = state.answers[q.id];
    const jobsAsking = selectedJobs().filter(j => j.extra.includes(q.id)).length;
    let control = "";
    if (q.kind === "text") control = `<div class="f"><input data-q="${q.id}" value="${esc(v ?? q.prefill ?? "")}" placeholder="${esc(q.placeholder || "")}">${q.note ? `<div class="hint">${esc(q.note)}</div>` : ""}</div>`;
    if (q.kind === "chips") control = `<div class="opt-chips">${q.options.map(o => `<button type="button" class="chip${v === o ? " on" : ""}" data-q="${q.id}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    if (q.kind === "textarea") control = `<div class="f"><textarea data-q="${q.id}" placeholder="${esc(q.placeholder || "")}">${esc(v ?? "")}</textarea>${q.draft ? `<div class="hint"><button type="button" class="btn-text" data-draft="${q.id}">Draft it from my resume</button> · ${esc(q.note)}</div>` : ""}</div>`;
    return `<div class="q" data-qwrap="${q.id}"><div class="q-h"><div class="q-label">${esc(q.label)}</div><div class="q-meta">Asked by ${jobsAsking} ${plural(jobsAsking, "job")}</div></div>${control}</div>`;
  }
  /* OTP goes to the phone by default (SMS autofills on mobile), with email one tap away. Two modes: "unlock" (returning
     candidate, step 1) and "send" (new candidate, step 3). */
  const maskPhone = p => { const d = String(p).replace(/\D/g, ""); return d.length >= 7 ? `(${d.slice(0, 3)}) •••-${d.slice(-4)}` : "your phone"; };
  const maskEmail = e => String(e).replace(/^(.{2})[^@]*(@.*)$/, (m, a, b) => a + "•".repeat(Math.max(3, m.length - a.length - b.length)) + b);
  const otpDest = () => state.otpChannel === "sms" ? state.maskedPhone : state.maskedEmail;
  const otpCopy = () => {
    const via = state.otpChannel === "sms" ? `texted to <b>${esc(state.maskedPhone)}</b>` : `emailed to <b>${esc(state.maskedEmail)}</b>`;
    if (state.otpMode === "unlock") return `Enter the 6-digit code we ${via}${state.otpChannel === "sms" ? ", the number on your saved profile" : ""}. It unlocks your resume and <b>${D.saved.answerCount} answers</b> from your last application, and it's the only code you'll enter.`;
    const n = selectedJobs().length;
    return `Enter the 6-digit code we ${via}. It confirms it's you before <b>${n} ${plural(n, "application")}</b> go out in your name.`;
  };
  const otpSwitchLabel = () => state.otpChannel === "sms" ? "Get it by email instead" : "Get it by text instead";
  const otpHtml = () => `<div class="otp-card${state.otpMode === "unlock" ? " bare" : ""}" id="otp-card">
        ${state.otpMode === "unlock" ? "" : `<h2>${I.shield} Confirm it's you</h2>`}
        <p id="otp-copy">${otpCopy()}</p>
        <div class="otp" id="otp">${[0, 1, 2, 3, 4, 5].map(i => `<input inputmode="numeric" pattern="[0-9]*" maxlength="1" aria-label="Digit ${i + 1}"${i === 0 ? ' autocomplete="one-time-code"' : ""}>`).join("")}</div>
        <div class="otp-foot"><span id="resend">Resend code in <span id="resend-n">30</span>s</span><button class="btn-text" type="button" id="otp-switch">${otpSwitchLabel()}</button><span class="proto">Prototype: any 6 digits work</span></div>
        <div class="otp-ok">Verification successful!</div>
      </div>`;
  function switchOtpChannel() {
    if (state.verified) return;
    state.otpChannel = state.otpChannel === "sms" ? "email" : "sms";
    $("#otp-copy").innerHTML = otpCopy();
    $("#otp-switch").textContent = otpSwitchLabel();
    startResendTimer();
    const first = $("#otp input"); if (first) first.focus();
    toast(`Code sent to ${otpDest()}`);
    agent(state.otpChannel === "sms" ? `Texted the code to ${state.maskedPhone} instead.` : `Emailed the code to ${state.maskedEmail} instead.`, { think: 250, status: state.otpChannel === "sms" ? "Enter the code we texted" : "Enter the code we emailed" });
  }
  function requiredLeft() {
    return unionQuestions(selectedJobs()).filter(q => q.kind === "chips" ? !state.answers[q.id] : q.kind === "textarea" ? !(state.answers[q.id] || "").trim() : !((state.answers[q.id] ?? q.prefill ?? "").trim()));
  }
  function renderStep3() {
    const sel = selectedJobs(), qs = unionQuestions(sel), asking = sel.filter(j => leftQ(j).length).length;
    const allAns = qs.length > 0 && qs.every(answered);
    state.maskedEmail = maskEmail(state.email || C.email);
    state.maskedPhone = maskPhone(state.phone || C.phone);
    state.otpMode = "send";
    state.otpChannel = state.otpChannel || "sms";
    const verifiedEarly = state.identity === "returning" && state.verified;
    setWork(`
      <h1>Confirm and send</h1>
      <div class="summary-row"><div class="avatars">${sel.slice(0, 6).map(j => `<span>${mono(j.company)}</span>`).join("")}</div><div class="txt"><b>${sel.length} ${plural(sel.length, "application")}</b>${sel.length - asking > 0 ? ` · <b>${sel.length - asking}</b> 1-click apply` : ""}${asking ? ` · <b>${asking}</b> share ${qs.filter(q => !answered(q)).length} extra ${plural(qs.filter(q => !answered(q)).length, "question")}` : ""}</div></div>
      ${qs.length ? `<section class="sec"><div class="sec-h"><div class="sec-title">${allAns ? "Reused from your last application" : "Answer once, I'll reuse it"}</div><span class="tag">${allAns ? "Edit if anything changed" : `${qs.length} ${plural(qs.length, "question")}`}</span></div>${qs.map(qHtml).join("")}</section>`
        : `<section class="sec"><div class="sec-h"><div class="sec-title">All 1-click apply</div><span class="tag">No extra questions</span></div><p class="hint" style="font-size:14px;color:var(--t2);margin:0">Your first application already answers everything these ${sel.length} employers ask.</p></section>`}
      ${verifiedEarly
        ? `<section class="otp-card ok" id="otp-card"><h2>${I.shield} Verified</h2><p>You confirmed it's you by text at the start, so there's nothing to enter here.</p><div class="otp-ok" style="margin-top:0">Verified by text</div></section>`
        : otpHtml()}
    `);
    if (!verifiedEarly) bindOtp();
    renderCta3();
    $$("[data-q]").forEach(elm => {
      if (elm.tagName === "BUTTON") elm.addEventListener("click", () => { state.answers[elm.dataset.q] = elm.dataset.v; $$(`.chip[data-q="${elm.dataset.q}"]`).forEach(c => c.classList.toggle("on", c === elm)); renderCta3(); });
      else elm.addEventListener("input", () => { state.answers[elm.dataset.q] = elm.value; renderCta3(); });
    });
    $$("[data-draft]").forEach(b => b.addEventListener("click", async () => {
      const q = D.questions[b.dataset.draft]; const ta = $(`textarea[data-q="${q.id}"]`); b.disabled = true; ta.value = "";
      if (reduce) ta.value = q.draft; else for (let i = 1; i <= q.draft.length; i++) { ta.value = q.draft.slice(0, i); await wait(6); }
      state.answers[q.id] = q.draft; renderCta3();
    }));
    bindToasts();
  }
  function renderCta3() {
    const sel = selectedJobs(), left = requiredLeft(), ready = state.verified && left.length === 0;
    const meta = !state.verified && left.length ? `${left.length} ${plural(left.length, "answer")} and the code to go` : !state.verified ? "Enter the code to send" : left.length ? `${left.length} ${plural(left.length, "answer")} to go` : "Everything's ready";
    if (state.step3Seen) setStatus(left.length ? `${left.length} ${plural(left.length, "answer")} to go` : state.verified ? "Ready to send" : "Enter the code we texted");
    setCta(`<div class="cta-in"><div class="cta-meta"><span>${meta}</span></div>
      <div class="cta-actions"><button class="btn btn-ghost" type="button" id="back2">${I.back} Back</button><button class="btn btn-primary" type="button" id="send-all"${ready ? "" : " disabled"}>Send ${sel.length} ${plural(sel.length, "application")} ${I.send}</button></div></div>`);
    $("#back2").addEventListener("click", () => { setStep(2); renderStep2(); });
    $("#send-all").addEventListener("click", sendAll);
  }
  function startResendTimer() {
    clearInterval(state.resendTick);
    state.resendT = 30;
    const r = $("#resend"); if (r) r.innerHTML = 'Resend code in <span id="resend-n">30</span>s';
    state.resendTick = setInterval(() => {
      state.resendT--;
      const n = $("#resend-n"); if (!n) { clearInterval(state.resendTick); return; }
      if (state.resendT <= 0) { clearInterval(state.resendTick); $("#resend").innerHTML = '<button class="btn-text" type="button" data-toast="New code sent (prototype)">Resend code</button>'; bindToasts(); }
      else n.textContent = state.resendT;
    }, 1000);
  }
  /* bindOtp(onVerified): six boxes, digits only, paste-aware; on six digits it verifies, flips to the emoji run, then calls back. */
  function bindOtp(onVerified) {
    const box = $("#otp"), inputs = $$("input", box);
    startResendTimer();
    $("#otp-switch").addEventListener("click", switchOtpChannel);
    const celebrate = async () => {
      for (let i = 0; i < inputs.length; i++) { inputs[i].value = OTP_EMOJI[i]; inputs[i].classList.add("emo"); await wait(110); }
      $("#otp-card").classList.add("ok");
    };
    const check = async () => {
      if (!inputs.every(i => /^\d$/.test(i.value))) return;
      inputs.forEach(i => { i.blur(); i.readOnly = true; });
      setStatus("Checking the code…", true);
      box.classList.add("verifying");
      await wait(900);
      box.classList.remove("verifying"); box.classList.add("ok");
      await celebrate();
      state.verified = true;
      if (onVerified) { await wait(350); onVerified(); return; }
      renderCta3();
      agent("Verified. Ready when you are.", { think: 200, status: requiredLeft().length ? `${requiredLeft().length} ${plural(requiredLeft().length, "answer")} to go` : "Verified · ready to send" });
    };
    inputs.forEach((inp, i) => {
      inp.addEventListener("input", () => { if (inp.readOnly) return; inp.value = inp.value.replace(/\D/g, "").slice(-1); if (inp.value && inputs[i + 1]) inputs[i + 1].focus(); check(); });
      inp.addEventListener("keydown", e => { if (e.key === "Backspace" && !inp.value && inputs[i - 1]) inputs[i - 1].focus(); });
      inp.addEventListener("paste", e => { const d = (e.clipboardData.getData("text") || "").replace(/\D/g, ""); if (!d) return; e.preventDefault(); d.split("").slice(0, 6).forEach((ch, k) => { if (inputs[k]) inputs[k].value = ch; }); inputs[Math.min(d.length, 5)].focus(); check(); });
    });
    if (state.verified && !onVerified) { inputs.forEach((i, k) => { i.value = OTP_EMOJI[k]; i.classList.add("emo"); i.readOnly = true; }); box.classList.add("ok"); $("#otp-card").classList.add("ok"); }
  }
  async function runStep3Chat() {
    const sel = selectedJobs(), qs = unionQuestions(sel), open = qs.filter(q => !answered(q)), asking = sel.filter(j => leftQ(j).length).length;
    if (open.length) await agent(`${open.length} short ${plural(open.length, "answer")} ${open.length === 1 ? "covers" : "cover"} ${asking} of the ${sel.length} jobs. Answer once, I'll reuse ${open.length === 1 ? "it" : "them"}.`, { think: 450, status: `${open.length} ${plural(open.length, "answer")} to go` });
    else if (qs.length) await agent(`${qs.length} of the questions these jobs ask were answered on your last application, so I've reused them. Edit any that changed.`, { think: 450, status: "Answers reused" });
    else await agent(`Nothing new to answer for these ${sel.length}.`, { think: 450, status: "Nothing new to answer" });
    if (state.identity === "returning" && state.verified) await agent("No code this time, you verified by text at the start. Send when it looks right.", { think: 350, status: open.length ? `${open.length} ${plural(open.length, "answer")} to go` : "Ready to send" });
    else await agent(`Last thing: I texted a 6-digit code to ${state.maskedPhone}. It confirms it's you before ${sel.length} ${plural(sel.length, "application")} go out in your name. Prefer email? Tap the link under the code.`, { think: 350, status: "Enter the code we texted" });
  }

  /* ================= Sending a batch ================= */
  /* sendBatch(): the labor-illusion list. Used for the step-3 batch and for the "keep going" batch after it. */
  async function sendBatch(jobs, title) {
    setWork(`<h1>${esc(title)}</h1><p class="lede">Each one is filled on the employer's own careers site with your answers and resume.</p>
      <ul class="send-list">${jobs.map(j => `<li data-send="${j.id}"><span class="dot">${I.check}</span><span>${esc(j.company)} <span style="color:var(--t3)">· ${esc(j.city)}, ${esc(j.state)}</span></span><span class="st">Queued</span></li>`).join("")}</ul>`);
    setCta(`<div class="cta-in"><div class="cta-meta"><div class="bar"><i id="send-bar" style="width:0%"></i></div><span><b id="send-n">0</b> of ${jobs.length} sent</span></div><div class="cta-actions"><button class="btn btn-primary" disabled>Sending…</button></div></div>`);
    const per = Math.max(240, Math.min(650, 4200 / jobs.length));
    for (let i = 0; i < jobs.length; i++) {
      const li = $(`[data-send="${jobs[i].id}"]`);
      li.classList.add("doing"); li.querySelector(".st").textContent = `Filling ${19 + jobs[i].extra.length} answers`;
      if (i > 2) li.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      await wait(per);
      li.classList.remove("doing"); li.classList.add("done"); li.querySelector(".st").textContent = "Sent";
      $("#send-n").textContent = i + 1; $("#send-bar").style.width = ((i + 1) / jobs.length * 100) + "%";
    }
    await wait(500);
    state.sent = [...state.sent, ...jobs];
  }
  async function sendAll() {
    const sel = selectedJobs();
    const btn = $("#send-all"); btn.disabled = true; btn.innerHTML = "Sending…";
    /* Answers shown with a prefill and left as they were count as given (the candidate pressed send with them). */
    unionQuestions(sel).forEach(q => { if (q.kind === "text" && q.prefill && !(state.answers[q.id] || "").trim()) state.answers[q.id] = q.prefill; });
    agent(`Sending ${sel.length}. Each one goes through the employer's own site, give me a moment.`, { think: 250 });
    setStatus(`Sending ${sel.length}…`, true);
    await sendBatch(sel, `Sending ${sel.length} ${plural(sel.length, "application")}`);
    collapseThread(`Confirm and send · ${sel.length} sent`);
    renderFinal(); runFinalChat();
  }
  function finishEarly() { state.goalDone = true; collapseThread("Add more jobs · skipped"); renderFinal(); runFinalChat(true); }

  /* ================= Final: the daily goal, then the handoff ================= */
  const answered = q => q.kind === "chips" ? !!state.answers[q.id] : !!((state.answers[q.id] ?? "").trim());
  /* Jobs for the keep-going bundle: not sent yet, every extra question already answered (so they are 1-click now), nearest first. */
  function moreJobs() { return candidates().filter(j => j.extra.every(k => answered(D.questions[k]))).sort(byRank); }
  /* Roles the candidate wanted today but the daily limit pushed to tomorrow: eligible in the ticked options, not sent. */
  function tomorrowQueue() { const ids = sentIds(); return eligible().filter(j => !ids.has(j.id)); }
  function notifyEmail() { return state.notifyEmail || state.email || C.email; }
  function renderFinal(quiet) {
    const n = state.sent.length, left = Math.max(0, DAILY_GOAL - n);
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const keepGoing = left > 0 && !state.goalDone && moreJobs().length > 0;
    if (keepGoing && !state.more) state.more = new Set(moreJobs().slice(0, left).map(j => j.id));
    const more = keepGoing ? moreJobs().slice(0, left) : [];
    const onCount = more.filter(j => state.more.has(j.id)).length;
    setStep(4);
    setWork(`
      <div class="black-card"><div class="bc-num">${n}</div><div><div class="bc-title">${plural(n, "application")} sent today</div><div class="bc-sub">${n > 1 ? `West Alamo Dental Care and ${n - 1} more` : "West Alamo Dental Care"} · ${date}</div></div></div>
      ${keepGoing ? `
      <section class="goal">
        <div class="goal-h"><h2>Keep going: <b>${n} of ${DAILY_GOAL}</b> today</h2><span class="goal-n">${left} to go</span></div>
        <div class="goal-bar"><i style="width:${n / DAILY_GOAL * 100}%"></i></div>
        <p>${left === 1 ? "One more" : `${left} more`} and you've hit ${DAILY_GOAL}. ${more.length === 1 ? "This one is" : "All"} 1-click apply, I already have every answer.</p>
        <ul class="more">${more.map(j => jobRow(j, state.more.has(j.id), false)).join("")}</ul>
        <div class="final-actions"><button class="btn btn-primary" type="button" id="send-more"${onCount ? "" : " disabled"}>Send ${onCount} more ${I.send}</button><button class="btn-text" type="button" id="goal-done">I'm done for today</button></div>
      </section>` : ""}
      <section class="next" id="next">
        <h2>${n >= DAILY_GOAL ? `Great job, that's ${n} in a day.` : keepGoing ? "What happens next" : `Done for today, ${n} sent.`}</h2>
        <p><b>Employers reply directly</b>, by email or phone, usually within a week. I'll email you the moment one does, and send tomorrow's matches${n >= DAILY_GOAL && tomorrowQueue().length ? ` (starting with the <b>${tomorrowQueue().length}</b> that didn't fit today)` : ""} to:</p>
        <div class="email-row"><span class="val" id="notify-val">${esc(notifyEmail())}</span><button class="btn-text" type="button" id="email-edit">Edit</button></div>
        <div class="email-edit"><input type="email" id="notify-in" value="${esc(notifyEmail())}" aria-label="Email for replies and new matches"><button class="btn btn-primary" type="button" id="email-save">Save</button><button class="btn-text" type="button" id="email-cancel">Cancel</button></div>
        ${keepGoing ? "" : `<div class="final-actions"><button class="btn btn-secondary" type="button" data-close>Back to LinkedIn</button></div>`}
      </section>
      <p class="kicker" style="margin-top:26px">Sent today</p>
      <ul class="sent-grid">${state.sent.map(j => `<li><span class="mono">${mono(j.company)}</span><span><b>${esc(j.company)}</b><small>${esc(j.city)}, ${esc(j.state)}</small></span><span class="st">${I.check}</span></li>`).join("")}</ul>
    `, quiet);
    setCta(""); bindToasts();
    $$(".goal .job").forEach(row => row.addEventListener("click", () => { const id = row.dataset.job; if (state.more.has(id)) state.more.delete(id); else state.more.add(id); const st = workScroll.scrollTop; renderFinal(true); workScroll.scrollTop = st; }));
    const sm = $("#send-more"); if (sm) sm.addEventListener("click", () => sendMore("form"));
    const gd = $("#goal-done"); if (gd) gd.addEventListener("click", () => dismissGoal("form"));
    const nx = $("#next");
    $("#email-edit").addEventListener("click", () => { nx.classList.add("editing"); const i = $("#notify-in"); i.focus(); i.select(); });
    $("#email-cancel").addEventListener("click", () => { nx.classList.remove("editing"); $("#notify-in").value = notifyEmail(); });
    const save = () => {
      const v = $("#notify-in").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { $("#notify-in").focus(); toast("That doesn't look like an email address"); return; }
      const changed = v !== notifyEmail();
      state.notifyEmail = v; $("#notify-val").textContent = v; nx.classList.remove("editing");
      if (changed) agent(`Got it. Replies and tomorrow's matches go to ${v}.`, { think: 250, status: "Email updated" });
    };
    $("#email-save").addEventListener("click", save);
    $("#notify-in").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") $("#email-cancel").click(); });
  }
  async function sendMore(source) {
    const jobs = moreJobs().filter(j => state.more.has(j.id));
    if (!jobs.length) return;
    if (source === "form" && state.pending.more) state.pending.more.answer("send");
    const btn = $("#send-more"); if (btn) { btn.disabled = true; btn.innerHTML = "Sending…"; }
    agent(`Sending ${jobs.length} more.`, { think: 200 });
    setStatus(`Sending ${jobs.length} more…`, true);
    await sendBatch(jobs, `Sending ${jobs.length} more`);
    state.more = null;
    renderFinal(); runFinalChat();
  }
  function dismissGoal(source) {
    state.goalDone = true;
    if (source === "form" && state.pending.more) state.pending.more.answer("done");
    renderFinal(true);
    if (source === "form") agent(`No problem. Tomorrow's matches go to ${notifyEmail()}, change it on the right if you'd rather use another address.`, { think: 300, status: "Done for today" });
  }
  async function runFinalChat(early) {
    const n = state.sent.length, left = DAILY_GOAL - n, more = moreJobs().slice(0, Math.max(0, left));
    if (early) { await agent(`No problem. I'll email you when West Alamo replies, and send tomorrow's matches to ${notifyEmail()}. Change it on the right if you'd rather use another address.`, { think: 450, status: "Done for today" }); return; }
    if (n >= DAILY_GOAL || state.goalDone || !more.length) {
      const tq = tomorrowQueue().length;
      await agent(`All ${n} sent. ${n >= DAILY_GOAL ? `Great job, that's ${n} in a day. ` : ""}Tomorrow's matches${n >= DAILY_GOAL && tq ? `, starting with the ${tq} that didn't fit today,` : ""} go to ${notifyEmail()}, change it on the right if you'd rather use another address.`, { think: 450, status: n >= DAILY_GOAL ? `All ${n} sent · great job` : `All ${n} sent` });
      return;
    }
    await agent(`All ${n} sent.`, { think: 400, status: `All ${n} sent` });
    await ask("more", `You're ${left} away from ${DAILY_GOAL} today. ${more.length === 1 ? "This one is" : `These ${more.length} are`} 1-click apply, send ${more.length === 1 ? "it" : "them"}?`, [{ value: "send", label: `Send ${more.length} more` }, { value: "done", label: "I'm done for today" }], {
      onPick: (o, first) => { if (!first) return; if (o.value === "send") sendMore("chat"); else { dismissGoal("chat"); agent(`No problem. Tomorrow's matches go to ${notifyEmail()}, change it on the right if you'd rather use another address.`, { think: 300, status: "Done for today" }); } }, think: 350, status: `${left} more to hit ${DAILY_GOAL}`,
    });
  }

  /* ================= Composer, notes, entry ================= */
  $("#composer").addEventListener("submit", e => {
    e.preventDefault();
    const inp = $("#composer input"), t = inp.value.trim(); if (!t) return;
    inp.value = ""; user(t);
    agent(state.step === 1
      ? "I can only answer from the job post itself. West Alamo lists full-time, on-site, in San Antonio, with pay marked as competitive. Anything beyond that I'd be guessing, so I won't."
      : "Good question. I can only answer from the job posts I'm applying to, so I'll stick to what they say. Anything you'd like me to change in the list?", { think: 700 });
  });

  const NOTES = {
    1: ["Email first, because it's the key", "One field decides the path. Known: the saved resume and answers load. New: resume upload, and the form fills from it. The why-text says exactly what the email is for.",
      "Verify when you unlock, not before you send", "A known email never loads anyone's details on its own. The code goes to the phone on the saved profile; 6 digits buys 19 answers, and that code also covers the batch send later. New candidates verify at the end instead.",
      "The preview is the trust moment", "File name, upload date, which application it came from, and the extracted summary, before anything is attached. Preview opens the rendered document. Past 90 days the card leads with the age and Replace becomes the primary button.",
      "Resume first for new candidates", "The only thing a stranger will give you in the first ten seconds is a file they already have. Everything else is derived from it.",
      "The wait is the product", "Reading takes 5 to 7 seconds, so the card narrates it in four stages with a progress bar. Shown work raises perceived value (labor illusion, Buell and Norton).",
      "Fields fill in front of you", "Eleven answers appear one by one, then the counter sits at 15 of 19. Progress is endowed, not promised.",
      "Every field says why", "Phone: for interview calls, nothing else. Backup email: their system rejects duplicates. The objection is answered before it forms.",
      "The chat is a narrator, not a chatbot", "It does visible work before it asks for anything, so the three questions that follow feel earned. No company name until the candidate has a reason to care.",
      "No OTP here", "The first application has zero friction. Verification moves to the moment it feels fair."],
    2: ["Liquidity decides the options", "The exact role in the exact city is usually thin, so the page doesn't pretend otherwise. Each option relaxes one thing (role, location, hours, pay) and shows the count it unlocks, counted live. Nothing is offered that doesn't exist.",
      "Exact matches first, always", "Another General Dentist opening in the San Antonio area goes to the top, ticked, marked Top pick. Roles at the employer they just applied to are never suggested, and the page says how many it hid.",
      "Their answers decide what relaxes first", "Open to relocating? Location widens before the title changes. Not relocating? Other titles in the same city come first. The ranking reads the answers from step 1.",
      "Start with a bundle, not a blank", "The top pick plus the next closest option are ticked while a whole option still fits in today's limit. The question is what to remove or add, not where to begin.",
      "Three options, not thirteen", "Three at a time, closest first, one or two already ticked. More options reveals the next three. Nobody has to read a taxonomy to choose.",
      "Pay is written into every option", "Each option carries the floor of its listed salaries ($180K+, $205K+), so pay is a criterion the candidate reads, not a filter they have to find.",
      "Names a jobseeker recognises", "Senior Dentist, Associate Dentist, Lead Dentist or Dental Director. Never Other.",
      "Ten a day, said up front", "The limit sits above the list, in the button's count, and on the rows it affects (a quiet Tomorrow tag). What doesn't fit today leads tomorrow's email.",
      "Effort as a quiet sub-metric", "1-click or N extra questions sits in grey under each role, never competing with the role itself.",
      "Same controls in two places", "The chips in the chat and the options on the page are the same state. Either one answers the question."],
    3: ["Answer once, apply many", "The extra questions are the union across the quick tier, so three answers cover every job that asks.",
      "OTP last, where it feels fair", "Before 16 applications go out in your name is a reason people accept. OTP first was a tax on strangers.",
      "Celebrate the unlock", "The code boxes turn into the emoji run from today's product. A small peak right before the big send."],
    4: ["A goal with a bar, not a nag", "Ten in a day. The card shows where you are, and offers only 1-click roles, because every answer is already in hand. One tap, no new OTP.",
      "Make the exit equal", "I'm done for today sits next to the send button at the same size, and the ending is just as warm.",
      "Say where the replies go", "The email address is shown and editable here, where it matters, instead of buried in settings.",
      "Strong ending", "One black card with the number, then tomorrow's matches as the reason to come back."],
    5: ["It starts in the LinkedIn app", "On a phone the job is the LinkedIn app's job page: company, title, the On-site and Full-time pills, Apply beside Save, and the sticky Apply bar once you scroll. Apply opens SonicApply full screen, the way LinkedIn's in-app browser would. The flow is judged from where it really starts.",
      "The form is the page, and the only page", "No chat on a phone. Every job the chat does on desktop has a better home here: the processing card narrates, the fields ask with Needs you pills and why-text, the why line explains the match, the cards nudge. A chat would only compete for space.",
      "The agent lives in the action bar", "The SonicJobs mark and a word or two from CareerGPT sit above the button: Reading your resume, 16 of 19 filled, Backup email needs you, Ready to submit. One bar holds state and action, the way good mobile checkouts do, and it never changes height.",
      "Nothing moves unless you move it", "No auto-scrolling while the form fills, no entrance animation on a tap. A still page reads as a trustworthy one.",
      "Code by text first", "The phone is already in hand and SMS codes autofill on it. Email is one tap away, never a second screen."],
  };
  $("#notes-body").innerHTML = [1, 2, 3, 4, 5].map(s => `<div class="note-step" data-step="${s}"><p class="kicker">${s < 4 ? `Step ${s} · ${["Apply", "Add more jobs", "Confirm and send"][s - 1]}` : s === 4 ? "After sending" : "On a phone"}</p>${NOTES[s].reduce((acc, v, i, arr) => i % 2 === 0 ? acc + `<div class="note"><span class="num">${i / 2 + 1}</span><div><b>${esc(v)}.</b> ${esc(arr[i + 1])}</div></div>` : acc, "")}</div>`).join("");
  $("#notes-btn").addEventListener("click", e => { e.preventDefault(); $("#notes").classList.toggle("open"); });
  $("#notes-close").addEventListener("click", () => $("#notes").classList.remove("open"));
  $("#restart").addEventListener("click", () => location.reload());
  document.addEventListener("click", e => { if (e.target.closest("[data-restart]")) { e.preventDefault(); location.reload(); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape") $("#notes").classList.remove("open"); });

  function openPanel() { const p = $("#panel"); if (!p.hidden) return; p.hidden = false; if (!state.opened) { state.opened = true; setStep(1); renderStep1(); runStep1Chat(); } }
  function closePanel() { $("#panel").hidden = true; }
  $$("[data-start]").forEach(b => b.addEventListener("click", openPanel));
  document.addEventListener("click", e => { const t = e.target.closest("[data-close]"); if (t) { e.preventDefault(); closePanel(); } });
  /* Phone entry: the LinkedIn app's job page. Once the inline Apply scrolls away, the sticky Apply bar slides in (as in the app)
     and the prototype hint steps aside. */
  const liM = $("#li-m");
  if (liM && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { if (isMobile()) liM.classList.toggle("scrolled", !en.isIntersecting); }, { root: $("#li-m-scroll"), threshold: 0 }).observe($("#li-m-actions"));
  }
  /* Phones: tapping anywhere that isn't a field dismisses the keyboard (iOS keeps it open otherwise); tapping another field brings it back.
     Only a tap counts, not the start of a scroll, so scrolling the form with the keyboard up still works. */
  (() => {
    const FIELD = "input, textarea, select, [contenteditable], label";
    let down = null;
    document.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; }, true);
    document.addEventListener("pointerup", e => {
      const a = document.activeElement, d = down; down = null;
      if (!a || !a.matches || !a.matches("input, textarea, select, [contenteditable]") || !d) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || e.timeStamp - d.t > 600) return;
      if (e.target.closest && e.target.closest(FIELD)) return;
      a.blur();
    }, true);
  })();
  bindToasts();
  setStep(1);
})();
