/* Shared tracker helpers: reminders, own trip plans, holidays, backup. Everything lives in this browser's localStorage. */
(function () {
  var T = window.SofAT = {};
  var K = T.keys = {
    rem: "sofa-reminders-v1", trips: "sofa-trips-other-v1", moving: "sofa-moving-v1", chkInt: "sofa-checkup-interval-v1",
    hol: "sofa-holidays-v1", pack: "sofa-packing-v1", packNa: "sofa-packing-na-v1", packSum: "sofa-packing-sum-v1", chk: "sofa-last-checkup",
    ex: "sofa-exercise-v1", periods: "sofa-periods-v2", trainT: "pnr-tracker-trips-v1", trainC: "sofa-train-pnr-cards-v1",
    flightT: "sofa-flight-trips-v1", flightC: "sofa-flight-cards-v1"
  };
  var DAYS = T.DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  T.FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  T.get = get; T.set = set;
  function two(n) { return ("0" + n).slice(-2); }
  function ymd(d) { return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === "string" ? s : ""); if (!m) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null; }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function addMonths(d, n, day) { var t = new Date(d.getFullYear(), d.getMonth() + n, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); return new Date(t.getFullYear(), t.getMonth(), Math.min(day || d.getDate(), last)); }
  function diff(a, b) { return Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 864e5); }
  function dow(d) { return (d.getDay() + 6) % 7; }
  function fmtD(d, long) { return d.toLocaleDateString("en-IN", long ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" }); }
  T.ymd = ymd; T.parse = parse; T.today = today; T.addDays = addDays; T.addMonths = addMonths; T.diff = diff; T.dow = dow; T.fmtD = fmtD;
  function str(v, n) { return typeof v === "string" ? v.slice(0, n || 80) : ""; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null && text !== "") e.textContent = text; return e; }
  T.el = el;
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- reminders ---------- */
  function cleanRem(r) {
    if (!r || typeof r !== "object" || !parse(r.date)) return null;
    var rep = ["none", "days", "weekly", "monthly", "yearly"].indexOf(r.repeat) >= 0 ? r.repeat : "none";
    var n = Math.round(+r.n); if (rep === "days" && !(n >= 1 && n <= 3650)) return null;
    var lead = Math.round(+r.lead); if (!(lead >= 0 && lead <= 3650)) lead = 0;
    return { id: str(r.id, 30) || uid(), title: str(r.title, 80), who: str(r.who, 60), cat: ["general", "pet", "plant"].indexOf(r.cat) >= 0 ? r.cat : "general", date: r.date, day: Math.min(31, Math.max(1, Math.round(+r.day) || parse(r.date).getDate())), repeat: rep, n: rep === "days" ? n : 0, lead: lead, home: r.home !== false, done: r.done === true, last: parse(r.last) ? r.last : "" };
  }
  T.rems = function () { var a = get(K.rem, []); return Array.isArray(a) ? a.map(cleanRem).filter(Boolean) : []; };
  T.saveRems = function (a) { return set(K.rem, a); };
  function advance(r) {
    var t = today(), d = parse(r.date);
    if (r.repeat === "days") return ymd(addDays(t, r.n));
    var n = 0;
    do {
      n++;
      d = r.repeat === "weekly" ? addDays(d, 7) : r.repeat === "monthly" ? addMonths(d, 1, r.day) : addMonths(d, 12, r.day);
    } while (d <= t && n < 5000);
    return ymd(d);
  }
  T.completeRem = function (id) {
    var a = T.rems();
    a.forEach(function (r) { if (r.id !== id) return; r.last = ymd(today()); if (r.repeat === "none") r.done = true; else r.date = advance(r); });
    T.saveRems(a);
  };
  T.removeRem = function (id) { T.saveRems(T.rems().filter(function (r) { return r.id !== id; })); };
  T.setRemHome = function (id, v) { var a = T.rems(); a.forEach(function (r) { if (r.id === id) r.home = v; }); T.saveRems(a); };
  function repText(r) { return r.repeat === "none" ? "once" : r.repeat === "days" ? "every " + r.n + (r.n === 1 ? " day" : " days") : r.repeat; }
  function dueText(r) { var n = diff(parse(r.date), today()); return n < 0 ? "overdue by " + -n + (n === -1 ? " day" : " days") : n === 0 ? "due today" : n === 1 ? "due tomorrow" : "due in " + n + " days"; }
  T.dueText = dueText;

  T.mountReminders = function (root, o) {
    o = o || {}; var cat = o.cat || "general", all = !!o.all;
    var cfg = cat === "pet" ? { who: "Pet name", tasks: ["Vaccination", "Deworming", "Vet visit", "Food refill", "Grooming", "Other"] } : cat === "plant" ? { who: "Plant name", tasks: ["Watering", "Feeding", "Repotting", "Other"] } : { title: "What is it?" };
    root.textContent = "";
    var form = el("form", "trk-form"); form.noValidate = true;
    var fields = el("div", "cycle-fields");
    function field(label, input) { var l = el("label"); l.appendChild(document.createTextNode(label)); l.appendChild(input); fields.appendChild(l); return input; }
    function inp(type, id, extra) { var i = document.createElement("input"); i.type = type; i.id = id; if (extra) Object.keys(extra).forEach(function (k) { i.setAttribute(k, extra[k]); }); return i; }
    var pre = "rm-" + cat + "-", who, title, task;
    if (cfg.who) { who = field(cfg.who, inp("text", pre + "who", { maxlength: 60, autocomplete: "off" })); task = document.createElement("select"); cfg.tasks.forEach(function (t) { var op = document.createElement("option"); op.value = t; op.textContent = t; task.appendChild(op); }); task.id = pre + "task"; field("What", task); }
    else title = field(cfg.title, inp("text", pre + "title", { maxlength: 80, autocomplete: "off" }));
    var date = field("Next date", inp("date", pre + "date"));
    var rep = document.createElement("select"); rep.id = pre + "rep";
    [["none", "Does not repeat"], ["days", "Every N days"], ["weekly", "Every week"], ["monthly", "Every month"], ["yearly", "Every year"]].forEach(function (p) { var op = document.createElement("option"); op.value = p[0]; op.textContent = p[1]; rep.appendChild(op); });
    field("Repeat", rep);
    var nn = field("Days between", inp("number", pre + "n", { min: 1, max: 3650, inputmode: "numeric" })); nn.parentNode.hidden = true;
    var lead = field("Show on Heads up this many days before", inp("number", pre + "lead", { min: 0, max: 3650, inputmode: "numeric", placeholder: "e.g. 3" }));
    rep.addEventListener("change", function () { nn.parentNode.hidden = rep.value !== "days"; });
    form.appendChild(fields);
    var hl = el("label", "trk-check"), home = inp("checkbox", pre + "home"); home.checked = true; hl.appendChild(home); hl.appendChild(document.createTextNode(" Show on the homepage")); form.appendChild(hl);
    var err = el("p", "cycle-error"); err.setAttribute("role", "alert"); err.hidden = true;
    var add = el("button", "cycle-clear", "Save"); add.type = "submit";
    form.appendChild(add); form.appendChild(err); root.appendChild(form);
    var list = el("div", "trk-list"); root.appendChild(list);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault(); var msg = "";
      var t = who ? task.value : title.value.trim(), w = who ? who.value.trim() : "";
      if (who ? !w : !t) msg = who ? "Add a name." : "Add what it is.";
      else if (!parse(date.value)) msg = "Pick a date.";
      else if (rep.value === "days" && !(+nn.value >= 1 && +nn.value <= 3650)) msg = "Enter how many days between (1 to 3650).";
      else if (!(lead.value !== "" && +lead.value >= 0 && +lead.value <= 3650)) msg = "Enter how many days before to show it on Heads up (0 to 3650).";
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      var a = T.rems(); a.push(cleanRem({ id: uid(), title: t, who: w, cat: cat, date: date.value, repeat: rep.value, n: +nn.value, lead: +lead.value, home: home.checked }));
      if (!T.saveRems(a)) { err.textContent = "Could not save. Browser storage may be off."; err.hidden = false; return; }
      form.reset(); nn.parentNode.hidden = true; home.checked = true; draw();
    });
    function draw() {
      list.textContent = "";
      var a = T.rems().filter(function (r) { return all || r.cat === cat; });
      a.sort(function (x, y) { return (x.done - y.done) || (x.date < y.date ? -1 : x.date > y.date ? 1 : 0); });
      if (!a.length) { list.appendChild(el("p", "cycle-note", "Nothing saved yet.")); return; }
      a.forEach(function (r) {
        var row = el("div", "trk-item" + (r.done ? " is-done" : ""));
        var t = el("div", "trk-main"); t.appendChild(el("strong", "", r.who ? r.who + " \u00b7 " + r.title : r.title));
        t.appendChild(el("span", "trk-meta", r.done ? "Done" : fmtD(parse(r.date), true) + " \u00b7 " + dueText(r) + " \u00b7 " + repText(r) + " \u00b7 Heads up " + r.lead + (r.lead === 1 ? " day" : " days") + " before"));
        row.appendChild(t);
        var act = el("div", "trk-actions");
        if (!r.done) { var d = el("button", "cycle-clear", r.repeat === "none" ? "Done" : r.cat === "plant" && r.title === "Watering" ? "Watered" : "Done"); d.type = "button"; d.addEventListener("click", function () { T.completeRem(r.id); draw(); }); act.appendChild(d); }
        var hh = el("label", "trk-check"), hc = document.createElement("input"); hc.type = "checkbox"; hc.checked = r.home; hc.addEventListener("change", function () { T.setRemHome(r.id, hc.checked); }); hh.appendChild(hc); hh.appendChild(document.createTextNode(" Homepage")); act.appendChild(hh);
        var x = el("button", "cycle-clear", "Delete"); x.type = "button"; x.addEventListener("click", function () { T.removeRem(r.id); draw(); }); act.appendChild(x);
        row.appendChild(act); list.appendChild(row);
      });
    }
    draw();
  };

  /* ---------- own trip plans (stay, bus, cab, other) ---------- */
  function cleanTrip(t) {
    if (!t || typeof t !== "object") return null;
    var type = ["stay", "bus", "cab", "other"].indexOf(t.type) >= 0 ? t.type : "other";
    var s = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.start || "") ? t.start : "", e = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.end || "") ? t.end : "";
    if (!s || isNaN(Date.parse(s))) return null; if (e && (isNaN(Date.parse(e)) || e < s)) e = "";
    if (type === "stay" && !e) return null;
    return { id: str(t.id, 30) || uid(), type: type, title: str(t.title, 80), from: str(t.from, 80), to: str(t.to, 80), start: s, end: e, note: str(t.note, 200) };
  }
  T.trips = function () { var a = get(K.trips, []); return Array.isArray(a) ? a.map(cleanTrip).filter(Boolean) : []; };
  T.mountTrips = function (root, o) {
    var type = (o && o.type) || "other", isStay = type === "stay";
    root.textContent = "";
    var form = el("form", "trk-form"); form.noValidate = true; var fields = el("div", "cycle-fields");
    function field(label, input) { var l = el("label"); l.appendChild(document.createTextNode(label)); l.appendChild(input); fields.appendChild(l); return input; }
    function inp(t, id, x) { var i = document.createElement("input"); i.type = t; i.id = "tp-" + id; if (x) Object.keys(x).forEach(function (k) { i.setAttribute(k, x[k]); }); return i; }
    var kind = null;
    if (type === "other") { kind = document.createElement("select"); kind.id = "tp-kind"; [["other", "Other"], ["stay", "Stay"], ["bus", "Bus"], ["cab", "Cab"]].forEach(function (p) { var op = document.createElement("option"); op.value = p[0]; op.textContent = p[1]; kind.appendChild(op); }); field("Type", kind); }
    var title = field("Name", inp("text", "title", { maxlength: 80, placeholder: isStay ? "Hotel or host name" : "e.g. Night bus" }));
    var from = field(isStay ? "Place" : "From", inp("text", "from", { maxlength: 80 }));
    var to = isStay ? null : field("To", inp("text", "to", { maxlength: 80 }));
    var start = field(isStay ? "Check-in" : "Starts", inp("datetime-local", "start"));
    var end = field(isStay ? "Check-out" : "Ends (optional)", inp("datetime-local", "end"));
    var note = field("Note (optional)", inp("text", "note", { maxlength: 200 }));
    form.appendChild(fields);
    var err = el("p", "cycle-error"); err.setAttribute("role", "alert"); err.hidden = true;
    var add = el("button", "cycle-clear", "Save"); add.type = "submit"; form.appendChild(add); form.appendChild(err); root.appendChild(form);
    var list = el("div", "trk-list"); root.appendChild(list);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault(); var ty = kind ? kind.value : type, msg = "";
      if (!title.value.trim()) msg = "Add a name."; else if (!start.value) msg = "Pick a start date and time."; else if (ty === "stay" && !end.value) msg = "Pick a check-out date and time."; else if (end.value && end.value < start.value) msg = "The end is before the start.";
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      var t = cleanTrip({ id: uid(), type: ty, title: title.value.trim(), from: from.value.trim(), to: to ? to.value.trim() : "", start: start.value, end: end.value, note: note.value.trim() });
      if (!t) { err.textContent = "Check the dates and try again."; err.hidden = false; return; }
      var a = T.trips(); a.push(t); if (!set(K.trips, a)) { err.textContent = "Could not save. Browser storage may be off."; err.hidden = false; return; }
      form.reset(); draw();
    });
    function draw() {
      list.textContent = "";
      var a = T.trips().filter(function (t) { return type === "other" || t.type === type; }).sort(function (x, y) { return x.start < y.start ? -1 : 1; });
      if (!a.length) { list.appendChild(el("p", "cycle-note", "Nothing saved yet. Entries are your own and not checked by any source.")); return; }
      a.forEach(function (t) {
        var row = el("div", "trk-item"), m = el("div", "trk-main");
        m.appendChild(el("strong", "", t.title));
        m.appendChild(el("span", "trk-meta", T.tripWhen(t) + (t.from || t.to ? " \u00b7 " + [t.from, t.to].filter(Boolean).join(" \u2192 ") : "") + " \u00b7 your own entry"));
        if (t.note) m.appendChild(el("span", "trk-meta", t.note));
        row.appendChild(m);
        var x = el("button", "cycle-clear", "Delete"); x.type = "button"; x.addEventListener("click", function () { set(K.trips, T.trips().filter(function (q) { return q.id !== t.id; })); draw(); }); row.appendChild(x); list.appendChild(row);
      });
    }
    draw();
  };
  function fmtDT(s) { var d = new Date(s); return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase(); }
  T.fmtDT = fmtDT;
  T.tripWhen = function (t) { return t.end ? fmtDT(t.start) + " to " + fmtDT(t.end) : fmtDT(t.start); };

  /* ---------- holidays: working days + "yyyy-mm-dd Event" lines; every listed date is a day off ---------- */
  T.parseHolidays = function (text) {
    var out = { map: {}, errors: [] };
    String(text || "").split(/\r?\n/).forEach(function (line, i) {
      var s = line.trim(); if (!s) return;
      var m = /^(\d{4}-\d{2}-\d{2})\s+(.+)$/.exec(s), d = m ? parse(m[1]) : null;
      if (!m || !d) { out.errors.push({ line: i + 1, text: s.slice(0, 60) }); return; }
      var k = m[1]; out.map[k] = out.map[k] ? out.map[k] + " / " + m[2].slice(0, 80) : m[2].slice(0, 80);
    });
    return out;
  };
  T.holidays = function () { var o = get(K.hol, {}); o = o && typeof o === "object" ? o : {}; var w = Array.isArray(o.work) ? o.work.filter(function (n, i, a) { return n === (n | 0) && n >= 0 && n < 7 && a.indexOf(n) === i; }) : []; return { work: w, text: str(o.text, 20000), home: o.home !== false }; };
  /* Breaks are runs of days off (a day off = not a working day, or a listed date) that contain at least one listed date. */
  T.breaks = function (h, from) {
    var p = T.parseHolidays(h.text), keys = Object.keys(p.map).sort(), res = { breaks: [], joins: [], errors: p.errors };
    if (!h.work.length || !keys.length) return res;
    var start = addDays(from || today(), -10), end = addDays(parse(keys[keys.length - 1]), 10);
    if (diff(end, start) > 800) end = addDays(start, 800);
    function off(d) { return h.work.indexOf(dow(d)) < 0 || !!p.map[ymd(d)]; }
    var runs = [], cur = null;
    for (var d = start; d <= end; d = addDays(d, 1)) {
      if (off(d)) { if (!cur) cur = { start: d, end: d, labels: [] }; else cur.end = d; if (p.map[ymd(d)]) cur.labels.push(p.map[ymd(d)]); }
      else if (cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    var t0 = from || today();
    runs.forEach(function (r) { r.len = diff(r.end, r.start) + 1; });
    res.breaks = runs.filter(function (r) { return r.labels.length && r.end >= t0; });
    for (var i = 0; i + 1 < runs.length; i++) {
      var a = runs[i], b = runs[i + 1];
      if (diff(b.start, a.end) === 2 && (a.labels.length || b.labels.length) && b.end >= t0) res.joins.push({ day: addDays(a.end, 1), a: a, b: b, total: a.len + 1 + b.len });
    }
    return res;
  };
  T.breakText = function (r) { var s = r.start, e = r.end, same = ymd(s) === ymd(e); return (same ? fmtD(s) : fmtD(s) + " to " + fmtD(e)) + " \u00b7 " + r.len + (r.len === 1 ? " day off" : " days off"); };
  T.mountHolidays = function (root) {
    root.textContent = ""; var h = T.holidays();
    var wk = el("div", "ex-days"); wk.setAttribute("role", "group"); wk.setAttribute("aria-label", "Your working days");
    DAYS.forEach(function (n, i) { var b = el("button", "ex-day", n); b.type = "button"; b.setAttribute("aria-label", T.FULL[i]); b.setAttribute("aria-pressed", h.work.indexOf(i) >= 0 ? "true" : "false"); b.addEventListener("click", function () { var s = T.holidays(), k = s.work.indexOf(i); if (k >= 0) s.work.splice(k, 1); else s.work.push(i); s.work.sort(); save(s); }); wk.appendChild(b); });
    var l1 = el("h2", "", "Your working days"); root.appendChild(l1); root.appendChild(el("p", "cycle-note", "Tap the days you work. The other days count as days off.")); root.appendChild(wk);
    root.appendChild(el("h2", "", "Your days off"));
    root.appendChild(el("p", "cycle-note", "One per line: yyyy-mm-dd Event. For example: 2026-11-08 Diwali. Every date you add counts as a day off."));
    var ta = document.createElement("textarea"); ta.id = "hol-text"; ta.rows = 6; ta.className = "trk-ta"; ta.value = h.text; ta.setAttribute("aria-label", "Your days off, one per line"); root.appendChild(ta);
    var err = el("p", "cycle-error"); err.setAttribute("role", "alert"); err.hidden = true; root.appendChild(err);
    var hl = el("label", "trk-check"), hc = document.createElement("input"); hc.type = "checkbox"; hc.checked = h.home; hl.appendChild(hc); hl.appendChild(document.createTextNode(" Show my next break on the homepage")); root.appendChild(hl);
    var out = el("div", "trk-list"); root.appendChild(out);
    function save(s) { s.text = ta.value; s.home = hc.checked; set(K.hol, { v: 1, work: s.work, text: s.text, home: s.home }); T.mountHolidays(root); }
    ta.addEventListener("change", function () { var s = T.holidays(); save(s); });
    hc.addEventListener("change", function () { var s = T.holidays(); s.text = ta.value; s.home = hc.checked; set(K.hol, { v: 1, work: s.work, text: s.text, home: s.home }); });
    var r = T.breaks(h);
    if (r.errors.length) { err.hidden = false; err.textContent = "Not understood: " + r.errors.slice(0, 5).map(function (e) { return "line " + e.line + " (" + e.text + ")"; }).join("; ") + ". Use yyyy-mm-dd Event."; }
    if (!h.work.length) { out.appendChild(el("p", "cycle-note", "Pick your working days to see your breaks.")); return; }
    if (!r.breaks.length) { out.appendChild(el("p", "cycle-note", "Add some days off above to see your breaks.")); return; }
    out.appendChild(el("h3", "", "Your breaks"));
    r.breaks.forEach(function (b) { var row = el("div", "trk-item"), m = el("div", "trk-main"); m.appendChild(el("strong", "", T.breakText(b))); m.appendChild(el("span", "trk-meta", b.labels.join(" \u00b7 "))); row.appendChild(m); out.appendChild(row); });
    if (r.joins.length) {
      out.appendChild(el("h3", "", "One leave day can join two breaks"));
      r.joins.forEach(function (j) { var row = el("div", "trk-item"), m = el("div", "trk-main"); m.appendChild(el("strong", "", "Leave on " + fmtD(j.day))); m.appendChild(el("span", "trk-meta", "Joins " + T.breakText(j.a) + " and " + T.breakText(j.b) + ". " + j.total + " days in a row.")); row.appendChild(m); out.appendChild(row); });
    }
  };

  /* ---------- backup ---------- */
  var KEYLIST = Object.keys(K).map(function (n) { return K[n]; }).filter(function (k) { return k !== K.packSum; });
  function b64e(s) { var b = new TextEncoder().encode(s), bin = ""; for (var i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64d(s) { if (!/^[A-Za-z0-9_-]+$/.test(s)) throw Error("bad"); var p = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4); var bin = atob(p); return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); })); }
  T.exportCode = function () {
    var o = {}, n = 0;
    KEYLIST.forEach(function (k) { var v = localStorage.getItem(k); if (v != null) { o[k] = v; n++; } });
    return { code: "sofa1." + b64e(JSON.stringify(o)), count: n };
  };
  function mergeVal(k, mine, theirs) {
    var a, b; try { a = JSON.parse(mine); } catch (e) { a = null; } try { b = JSON.parse(theirs); } catch (e) { return mine; }
    if (a == null) return theirs;
    function ident(x) { return x && typeof x === "object" ? (x.id || x.pnr && (x.pnr + "|" + (x.departAt || x.date || "")) || (x.al ? x.al + x.no + "|" + x.departAt : JSON.stringify(x))) : JSON.stringify(x); }
    if (Array.isArray(a) && Array.isArray(b)) { var seen = {}; a.forEach(function (x) { seen[ident(x)] = 1; }); b.forEach(function (x) { if (!seen[ident(x)]) a.push(x); }); return JSON.stringify(a); }
    if (k === K.ex && a && b) { var d = {}; [a.done, b.done].forEach(function (m) { if (m && typeof m === "object") Object.keys(m).forEach(function (q) { d[q] = 1; }); }); return JSON.stringify({ v: 1, plan: (a.plan && a.plan.length ? a.plan : b.plan) || [], done: d }); }
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) { Object.keys(b).forEach(function (q) { if (!(q in a)) a[q] = b[q]; }); return JSON.stringify(a); }
    return mine;
  }
  T.importCode = function (code, mode, dry) {
    code = String(code || "").trim(); if (code.indexOf("sofa1.") !== 0 || code.length > 400000) throw Error("This is not a School of Adults backup code.");
    var o; try { o = JSON.parse(b64d(code.slice(6))); } catch (e) { throw Error("This code is damaged or incomplete."); }
    if (!o || typeof o !== "object" || Array.isArray(o)) throw Error("This code is damaged or incomplete.");
    var keys = Object.keys(o).filter(function (k) { return KEYLIST.indexOf(k) >= 0 && typeof o[k] === "string"; });
    keys.forEach(function (k) { try { JSON.parse(o[k]); } catch (e) { if (k !== K.chk) throw Error("This code is damaged or incomplete."); } });
    if (dry) return keys.length;
    if (mode === "replace") KEYLIST.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    keys.forEach(function (k) { var mine = mode === "replace" ? null : localStorage.getItem(k); try { localStorage.setItem(k, mine == null ? o[k] : (k === K.chk ? mine : mergeVal(k, mine, o[k]))); } catch (e) {} });
    return keys.length;
  };

  /* ---------- packing summary (written by the packing page, read by Heads up) ---------- */
  T.packSummary = function () { var s = get(K.packSum, null); return s && typeof s === "object" && s.total > 0 ? s : null; };

  /* ---------- check-up interval ---------- */
  T.checkup = function () {
    var i = get(K.chkInt, null), last = parse(localStorage.getItem(K.chk) || ""); if (!i || !(i.months >= 1 && i.months <= 600) || !last) return null;
    var due = addMonths(last, Math.round(i.months), last.getDate());
    return { due: due, lead: Math.max(0, Math.round(+i.lead) || 0), home: i.home === true, months: Math.round(i.months) };
  };
  /* ---------- moving ---------- */
  T.moving = function () { var m = get(K.moving, {}); m = m && typeof m === "object" ? m : {}; return { date: parse(m.date) ? m.date : "", done: m.done && typeof m.done === "object" && !Array.isArray(m.done) ? m.done : {}, custom: Array.isArray(m.custom) ? m.custom.filter(function (c) { return c && typeof c.id === "string" && typeof c.text === "string"; }).slice(0, 60).map(function (c) { return { id: c.id.slice(0, 30), text: c.text.slice(0, 120) }; }) : [], home: m.home !== false }; };
  T.saveMoving = function (m) { set(K.moving, { v: 1, date: m.date, done: m.done, custom: m.custom, home: m.home }); };

  T.MOVE_TASKS = [["t1", "Compare moving services: service area, item inventory, total, damage coverage, deposits and cancellation terms"], ["t2", "Decide on furniture and appliance rental"], ["t3", "Check the myAadhaar address-update procedure and accepted documents"], ["t4", "Check the Parivahan rules for your vehicle and move"]];
  T.movingProgress = function (m) { var tot = T.MOVE_TASKS.length + m.custom.length, n = 0; T.MOVE_TASKS.forEach(function (t) { if (m.done[t[0]]) n++; }); m.custom.forEach(function (c) { if (m.done[c.id]) n++; }); return { done: n, total: tot }; };
  T.mountMoving = function (root) {
    root.textContent = ""; var m = T.moving();
    var dl = el("label", "cycle-fields"); var lab = el("label"); lab.appendChild(document.createTextNode("Moving on (optional)")); var di = document.createElement("input"); di.type = "date"; di.value = m.date; lab.appendChild(di); var f = el("div", "cycle-fields"); f.appendChild(lab); root.appendChild(f);
    di.addEventListener("change", function () { var s = T.moving(); s.date = parse(di.value) ? di.value : ""; T.saveMoving(s); draw(); });
    var hl = el("label", "trk-check"), hc = document.createElement("input"); hc.type = "checkbox"; hc.checked = m.home; hl.appendChild(hc); hl.appendChild(document.createTextNode(" Show progress on the homepage (needs a moving date)")); root.appendChild(hl);
    hc.addEventListener("change", function () { var s = T.moving(); s.home = hc.checked; T.saveMoving(s); });
    var count = el("p", "cycle-note"); count.setAttribute("aria-live", "polite"); root.appendChild(count);
    var list = el("div", "trk-list"); root.appendChild(list);
    var form = el("form", "trk-form"); form.noValidate = true; var ci = document.createElement("input"); ci.type = "text"; ci.maxLength = 120; ci.setAttribute("aria-label", "Add your own task"); ci.placeholder = "Add your own task"; ci.className = "trk-ta"; ci.style.minHeight = "44px";
    var ab = el("button", "cycle-clear", "Add task"); ab.type = "submit"; form.appendChild(ci); form.appendChild(ab); root.appendChild(form);
    form.addEventListener("submit", function (ev) { ev.preventDefault(); var t = ci.value.trim(); if (!t) return; var s = T.moving(); s.custom.push({ id: "c" + uid(), text: t.slice(0, 120) }); T.saveMoving(s); ci.value = ""; draw(); });
    function draw() {
      var s = T.moving(), p = T.movingProgress(s); count.textContent = p.done + " of " + p.total + " done";
      list.textContent = "";
      T.MOVE_TASKS.map(function (t) { return { id: t[0], text: t[1] }; }).concat(s.custom).forEach(function (t) {
        var row = el("div", "trk-item"), l = el("label", "trk-check trk-main"), c = document.createElement("input"); c.type = "checkbox"; c.checked = !!s.done[t.id];
        c.addEventListener("change", function () { var q = T.moving(); if (c.checked) q.done[t.id] = 1; else delete q.done[t.id]; T.saveMoving(q); draw(); });
        l.appendChild(c); var sp = el("span", c.checked ? "trk-struck" : "", " " + t.text); l.appendChild(sp); row.appendChild(l);
        if (t.id.charAt(0) === "c") { var x = el("button", "cycle-clear", "Delete"); x.type = "button"; x.addEventListener("click", function () { var q = T.moving(); q.custom = q.custom.filter(function (z) { return z.id !== t.id; }); delete q.done[t.id]; T.saveMoving(q); draw(); }); row.appendChild(x); }
        list.appendChild(row);
      });
    }
    draw();
  };

  function auto() {
    [].forEach.call(document.querySelectorAll("[data-sofa-mount]"), function (n) {
      var a = n.getAttribute("data-sofa-mount").split(":"), k = a[0], v = a[1];
      if (k === "reminders") T.mountReminders(n, v === "all" ? { cat: "general", all: true } : { cat: v });
      else if (k === "trips") T.mountTrips(n, { type: v });
      else if (k === "holidays") T.mountHolidays(n);
      else if (k === "moving") T.mountMoving(n);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
