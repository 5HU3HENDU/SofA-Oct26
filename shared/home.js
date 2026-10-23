/* Home page only: tile taps, "still being built" toast, intro hand-drawn marks. Shared behaviour is in page.js. */
(function () {
  var S = window.SofA;
  if (!S) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var toast = document.querySelector("#topic-toast"), toastTimer;

  document.querySelectorAll(".topic").forEach(function (tile) {
    tile.addEventListener("click", function () {
      S.w("select", { theme: "press", emphasis: "subtle" });
      if (!tile.dataset.toast) return;
      clearTimeout(toastTimer);
      toast.textContent = tile.dataset.toast;
      toast.classList.add("is-visible");
      toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 4200);
    });
  });

  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle("visible", e.isIntersecting); });
  }, { threshold: .05 });
  document.querySelectorAll(".topic").forEach(function (tile) { seen.observe(tile); });

  document.fonts.ready.then(function () {
    var manual = document.querySelector("#manual");
    S.annotate(manual, { type: "underline", color: "#b9432b", strokeWidth: 2.5, padding: 4, animationDuration: 700, animate: !reduce }).show();

    var pillars = document.querySelector("#pillars");
    var words = [].slice.call(pillars.querySelectorAll(".pw")), seps = [].slice.call(pillars.querySelectorAll(".sep"));
    var marks = [
      ["highlight", { color: "#f2c94c99", iterations: 1, padding: [1, 5, 1, 5] }],
      ["underline", { color: "#b9432b", strokeWidth: 3, padding: 2, iterations: 2 }],
      ["circle", { color: "#315847", strokeWidth: 2, padding: [3, 8, 3, 8] }]
    ];
    words.forEach(function (w) {
      var text = w.textContent;
      w.setAttribute("aria-hidden", "true");
      w.replaceChildren.apply(w, [].map.call(text, function (c) {
        var ch = document.createElement("span"); ch.className = "ch"; ch.textContent = c; return ch;
      }));
    });
    var drawn = words.map(function (w, i) {
      return S.annotate(w, Object.assign({ type: marks[i][0], animate: !reduce, animationDuration: 650 }, marks[i][1]));
    });
    if (reduce) {
      pillars.querySelectorAll(".ch,.sep").forEach(function (e) { e.classList.add("on"); });
      drawn.forEach(function (a) { a.show(); });
      return;
    }
    var t = 1100;
    words.forEach(function (w, i) {
      [].forEach.call(w.children, function (c, j) { setTimeout(function () { c.classList.add("on"); }, t + j * 70); });
      t += w.children.length * 70 + 120;
      if (seps[i]) setTimeout(function () { seps[i].classList.add("on"); }, t - 100);
    });
    t += 250;
    drawn.forEach(function (a, i) { setTimeout(function () { a.show(); }, t + i * 750); });
  });
})();

/* "Heads up": nearest saved trips from this browser's own localStorage. Nothing is hardcoded or sent anywhere. */
(function () {
  var sec = document.getElementById("heads-up"), list = document.getElementById("heads-up-list");
  if (!sec || !list) return;
  function read(key) { try { var v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function ms(s) { var n = Date.parse(s); return isFinite(n) ? n : NaN; }
  function str(v, n) { return typeof v === "string" ? v.slice(0, n || 80) : ""; }
  function fmt(d, tz, o) { try { return new Intl.DateTimeFormat("en-IN", Object.assign({ timeZone: tz }, o)).format(d); } catch (e) { return ""; } }
  function dayKey(d, tz) { return fmt(d, tz, { year: "numeric", month: "2-digit", day: "2-digit" }); }
  function when(t, tz) {
    var d = new Date(t), now = new Date(), day = dayKey(d, tz), tag = "";
    if (day === dayKey(now, tz)) tag = "Today"; else if (day === dayKey(new Date(now.getTime() + 864e5), tz)) tag = "Tomorrow";
    var text = fmt(d, tz, { weekday: "short", day: "numeric", month: "short" }) + ", " + fmt(d, tz, { hour: "numeric", minute: "2-digit", hour12: true }).replace(/ ([ap])m$/i, " $1m").toLowerCase();
    return { text: (tag ? tag + ", " : "") + text, tag: tag };
  }
  function asOf(c) { var t = ms(c); return isFinite(t) ? "As of " + fmt(new Date(t), "Asia/Kolkata", { day: "numeric", month: "short" }) + ", " + fmt(new Date(t), "Asia/Kolkata", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase() : ""; }
  function place(s) { s = str(s, 100); var i = s.indexOf("\u00b7"); return (i >= 0 ? s.slice(i + 1) : s).replace(/\s+(Jn\.?|Junction)$/i, "").trim(); }
  function items() {
    var now = Date.now(), out = [], seen = {};
    read("pnr-tracker-trips-v1").forEach(function (t) {
      if (!t || typeof t !== "object" || typeof t.pnr !== "string" || typeof t.train !== "string") return;
      var end = ms(t.endAt); if (!isFinite(end) || end < now) return;
      var dep = ms(t.departAt); if (!isFinite(dep)) dep = end;
      var k = "t" + t.pnr, prev = seen[k];
      if (prev && ms(prev.checked) >= ms(t.checked)) return;
      var ps = str(t.platformStatus, 24).toLowerCase(), tags = [];
      var w = when(dep, "Asia/Kolkata"); if (w.tag) tags.push(w.tag);
      if (ps && ps !== "verified") tags.push("\u26a0\ufe0f Platform not final");
      var cls = str(t.cls, 60).split(/[\u00b7 ]/)[0], bits = [];
      if (cls) bits.push(cls);
      if (t.coach) bits.push(str(t.coach, 16) + (Array.isArray(t.berths) && t.berths.length ? " berths " + t.berths.slice(0, 6).map(function (b) { return str(b, 8); }).join(", ") : ""));
      var o = { kind: "train", trip: true, at: dep, emoji: "1f686", label: "Train " + str(t.train, 24), route: place(t.from) + " \u2192 " + place(t.to), when: w.text, extra: bits.join(" \u00b7 "), tags: tags, asof: asOf(t.checked), href: "/travel/train/", checked: t.checked };
      seen[k] = o; out = out.filter(function (x) { return x !== prev; }); out.push(o);
    });
    read("sofa-flight-trips-v1").forEach(function (t) {
      if (!t || typeof t !== "object" || typeof t.al !== "string" || typeof t.no !== "string") return;
      var dep = ms(t.departAt), end = ms(t.endAt); if (!isFinite(dep) || !isFinite(end) || end < now) return;
      var k = "f" + t.al + t.no + "|" + t.departAt, prev = seen[k];
      if (prev && ms(prev.checked) >= ms(t.checked)) return;
      var tz = str(t.fromTz, 40) || "Asia/Kolkata", tags = [], st = str(t.status, 30), bk = str(t.booking, 30);
      var w = when(dep, tz); if (w.tag) tags.push(w.tag);
      if (st && !/^(scheduled|on time)$/i.test(st)) tags.push("\u26a0\ufe0f " + st);
      var extra = !bk || /^unverified$/i.test(bk) ? "booking not verified" : bk;
      var from = str(t.fromName, 60) || str(t.from, 3);
      var o = { kind: "flight", trip: true, at: dep, emoji: "2708", label: "Flight " + str(t.al, 3) + " " + str(t.no, 4), route: from + (t.depTerminal ? " " + str(t.depTerminal, 12) : "") + " \u2192 " + (str(t.toName, 60) || str(t.to, 3)), when: w.text, extra: extra, tags: tags, asof: asOf(t.checked), href: "/travel/flight/", checked: t.checked };
      seen[k] = o; out = out.filter(function (x) { return x !== prev; }); out.push(o);
    });
    return out.sort(function (a, b) { return a.at - b.at; });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function card(o, big, tile) {
    var a = el("a", "hu-card" + (big ? " hu-big" : "")); a.href = o.href; a.style.setProperty("--tile", tile);
    var top = el("div", "hu-top"), img = document.createElement("img"); img.src = "/shared/emoji/" + o.emoji + ".svg"; img.alt = ""; img.setAttribute("aria-hidden", "true");
    top.appendChild(img); top.appendChild(el("span", "", o.label + (big ? " \u00b7 next up" : "")));
    if (!big && o.tags.length) top.appendChild(el("span", "hu-tag", o.tags[o.tags.length - 1]));
    a.appendChild(top); a.appendChild(el("div", "hu-route", o.route));
    a.appendChild(el("div", "hu-when", o.when + (o.extra ? " \u00b7 " + o.extra : "")));
    if (big && o.tags.length) { var g = el("div", "hu-tags"); o.tags.forEach(function (t) { g.appendChild(el("span", "hu-tag", t)); }); a.appendChild(g); }
    var f = el("div", "hu-foot"); f.appendChild(el("span", "", o.asof)); f.appendChild(el("span", "", "\u2197")); a.appendChild(f);
    return a;
  }
  /* Exercise: planned weekdays and per-date completion, from sofa-exercise-v1 (set on the Exercise page). */
  var EXK = "sofa-exercise-v1", DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  function exLoad() {
    try {
      var o = JSON.parse(localStorage.getItem(EXK)); if (!o || typeof o !== "object") o = {};
      var p = Array.isArray(o.plan) ? o.plan.filter(function (n, i, a) { return n === (n | 0) && n >= 0 && n < 7 && a.indexOf(n) === i; }) : [];
      return { plan: p, done: o.done && typeof o.done === "object" && !Array.isArray(o.done) ? o.done : {} };
    } catch (e) { return { plan: [], done: {} }; }
  }
  function exSave(o) {
    var cut = new Date(), keep = {}, c; cut.setDate(cut.getDate() - 400); c = ymd(cut);
    Object.keys(o.done).forEach(function (k) { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && k >= c && o.done[k]) keep[k] = 1; });
    try { localStorage.setItem(EXK, JSON.stringify({ v: 1, plan: o.plan, done: keep })); } catch (e) {}
  }
  function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function exCard() {
    var o = exLoad(); if (!o.plan.length) return null;
    var now = new Date(), dow = (now.getDay() + 6) % 7, mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow), n = 0;
    var card = el("div", "hu-card hu-ex"); card.style.setProperty("--tile", "#eef0df");
    var top = el("div", "hu-top"), img = document.createElement("img"); img.src = "/shared/emoji/1f3c3.svg"; img.alt = ""; img.setAttribute("aria-hidden", "true");
    top.appendChild(img); top.appendChild(el("span", "", "Exercise \u00b7 this week"));
    var pl = el("a", "hu-tag", "Plan \u2197"); pl.href = "/health/exercise/"; top.appendChild(pl); card.appendChild(top);
    var wk = el("div", "hu-week"); wk.setAttribute("role", "group"); wk.setAttribute("aria-label", "Exercise this week");
    for (var i = 0; i < 7; i++) {
      var dt = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i), key = ymd(dt), planned = o.plan.indexOf(i) >= 0, done = planned && !!o.done[key], future = i > dow;
      if (done) n++;
      var b = el("button", "hu-day " + (planned ? "plan" : "rest") + (done ? " done" : "") + (i === dow ? " today" : "") + (planned && future ? " future" : ""));
      b.type = "button"; b.setAttribute("data-date", key);
      b.appendChild(el("span", "hd", DAYS[i])); b.appendChild(el("span", "ck", done ? "\u2713" : ""));
      var live = planned && !future; b.setAttribute("aria-label", FULL[i] + (planned ? (done ? ", done" : future ? ", planned" : ", planned, not done") : ", rest day"));
      if (planned) b.setAttribute("aria-pressed", done ? "true" : "false");
      if (!live) b.setAttribute("aria-disabled", "true");
      wk.appendChild(b);
    }
    wk.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest(".hu-day"); if (!b || b.getAttribute("aria-disabled") === "true") return;
      var s = exLoad(), k = b.getAttribute("data-date"); if (s.done[k]) delete s.done[k]; else s.done[k] = 1; exSave(s); render();
      var again = list.querySelector('.hu-day[data-date="' + k + '"]'); if (again) again.focus();
    });
    card.appendChild(wk);
    var f = el("div", "hu-foot"); f.appendChild(el("span", "", n + " of " + o.plan.length + " done this week")); card.appendChild(f);
    return card;
  }
  /* Other saved things: reminders, own trip plans, check-up due, moving, next break, packing. All from this browser. */
  function tagFor(at) { var n = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 864e5); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : ""; }
  function more() {
    var T = window.SofAT, out = []; if (!T) return out;
    var t0 = T.today();
    T.rems().forEach(function (r) {
      if (r.done || !r.home) return; var d = T.parse(r.date), n = T.diff(d, t0); if (n > r.lead) return;
      var tags = n < 0 ? ["\u26a0\ufe0f Overdue"] : (tagFor(d) ? [tagFor(d)] : []);
      out.push({ at: d.getTime(), overdue: n < 0, emoji: r.cat === "pet" ? "1f43e" : r.cat === "plant" ? "1fab4" : "1f9fe", label: r.cat === "pet" ? "Pet care" : r.cat === "plant" ? "Plant care" : "Reminder", route: r.who ? r.who + " \u00b7 " + r.title : r.title, when: T.fmtD(d) + " \u00b7 " + T.dueText(r), extra: "", tags: tags, asof: "", href: "/life-skills/reminders/" });
    });
    var now = Date.now();
    T.trips().forEach(function (t) {
      var st = Date.parse(t.start), en = t.end ? Date.parse(t.end) : new Date(new Date(t.start).getFullYear(), new Date(t.start).getMonth(), new Date(t.start).getDate() + 1).getTime();
      if (en < now) return;
      var labels = { stay: "Stay", bus: "Bus", cab: "Cab", other: "Trip" }, em = { stay: "1f3e1", bus: "1f68c", cab: "1f695", other: "1f5fa" };
      var started = t.type === "stay" && st <= now, at = started ? en : st, when = t.type === "stay" ? (started ? "Check-out " + T.fmtDT(t.end) : "Check-in " + T.fmtDT(t.start)) : T.tripWhen(t);
      var tg = tagFor(new Date(at));
      out.push({ trip: true, at: at, emoji: em[t.type], label: labels[t.type] + " \u00b7 " + t.title, route: [t.from, t.to].filter(Boolean).join(" \u2192 ") || t.title, when: when, extra: "your own entry", tags: tg ? [tg] : [], asof: "", href: t.type === "stay" ? "/travel/stay/" : t.type === "bus" ? "/travel/bus/" : t.type === "cab" ? "/travel/cab/" : "/travel/" });
    });
    var c = T.checkup();
    if (c && c.home) { var cn = T.diff(c.due, t0); if (cn <= c.lead) out.push({ at: c.due.getTime(), overdue: cn < 0, emoji: "1f34e", label: "Check-up", route: "Check-up due", when: T.fmtD(c.due) + " \u00b7 " + (cn < 0 ? "overdue by " + -cn + (cn === -1 ? " day" : " days") : cn === 0 ? "due today" : "due in " + cn + (cn === 1 ? " day" : " days")), extra: "", tags: cn < 0 ? ["\u26a0\ufe0f Overdue"] : (tagFor(c.due) ? [tagFor(c.due)] : []), asof: "", href: "/health/check-up/" }); }
    var m = T.moving();
    if (m.date && m.home) { var md = T.parse(m.date); if (T.diff(md, t0) >= 0) { var pr = T.movingProgress(m); out.push({ at: md.getTime(), emoji: "1f4e6", label: "Moving", route: "Moving on " + T.fmtD(md), when: pr.done + " of " + pr.total + " tasks done", extra: "", tags: tagFor(md) ? [tagFor(md)] : [], asof: "", href: "/life-events/moving-to-a-new-city/" }); } }
    var h = T.holidays();
    if (h.home && h.lead != null) {
      var br = T.breaks(h);
      br.breaks.forEach(function (b0) {
        var at0 = b0.start < t0 ? t0 : b0.start; if (T.diff(at0, t0) > h.lead) return;
        var j = br.joins.filter(function (x) { return x.a === b0 || x.b === b0; })[0];
        out.push({ at: at0.getTime(), emoji: "1f9ed", label: "Break", route: T.breakText(b0), when: b0.labels.join(" \u00b7 "), extra: j ? "1 leave day (" + T.fmtD(j.day) + ") joins two breaks" : "", tags: tagFor(at0) ? [tagFor(at0)] : [], asof: "", href: "/travel/holidays/" });
      });
    }
    return out;
  }
  function packCard() {
    var T = window.SofAT; if (!T) return null; var s = T.packSummary(), need = s ? s.total - (s.na || 0) : 0;
    if (s && need > 0 && s.packed >= need) return null;
    return { emoji: "1f4e6", label: "Packing", route: "Packing list", when: s ? s.packed + " of " + need + " packed" : "Not started", extra: "", tags: [], asof: "", href: "/travel/things-to-carry/" };
  }
  function render() {
    var all = items().concat(more()), ex = exCard(); list.textContent = "";
    all.sort(function (a, b) { return ((b.overdue ? 1 : 0) - (a.overdue ? 1 : 0)) || (a.at - b.at); });
    var pk = all.some(function (o) { return o.trip; }) ? packCard() : null;
    if (!all.length && !ex) { sec.hidden = true; return; }
    if (all.length) {
      list.appendChild(card(all[0], true, "#f3e6c4"));
      if (all.length > 1) { list.appendChild(el("p", "hu-later", "Later")); all.slice(1).forEach(function (o) { list.appendChild(card(o, false, "#eef0df")); }); }
    }
    if (pk) list.appendChild(card(pk, false, "#eef0df"));
    if (ex) list.appendChild(ex);
    sec.hidden = false;
  }
  render();
  window.addEventListener("pageshow", render);
  window.addEventListener("storage", render);
})();

/* Back up or move saved data: one code covering everything this browser saves on the site. */
(function () {
  var body = document.getElementById("backup-body"), T = window.SofAT; if (!body || !T) return;
  var el = T.el;
  body.appendChild(el("p", "cycle-note", "Everything you save here lives only in this browser. Make a code to keep a copy or move it to a new phone. The code includes all your saved items, health dates too, so keep it private."));
  var mk = el("button", "cycle-clear", "Create backup code"); mk.type = "button"; body.appendChild(mk);
  var out = document.createElement("textarea"); out.className = "trk-ta"; out.rows = 4; out.readOnly = true; out.hidden = true; out.setAttribute("aria-label", "Backup code"); body.appendChild(out);
  var cp = el("button", "cycle-clear", "Copy code"); cp.type = "button"; cp.hidden = true; body.appendChild(cp);
  var msg = el("p", "cycle-note"); msg.setAttribute("role", "status"); body.appendChild(msg);
  mk.addEventListener("click", function () { var r = T.exportCode(); if (!r.count) { out.hidden = cp.hidden = true; msg.textContent = "Nothing is saved on this device yet."; return; } out.value = r.code; out.hidden = cp.hidden = false; msg.textContent = "Code ready: " + r.count + " saved " + (r.count === 1 ? "item" : "items") + "."; });
  cp.addEventListener("click", function () { out.select(); var ok = false; try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(out.value); ok = true; } else ok = document.execCommand("copy"); } catch (e) {} msg.textContent = ok ? "Copied." : "Select the code and copy it."; });
  body.appendChild(el("h3", "", "Restore from a code"));
  var inp = document.createElement("textarea"); inp.className = "trk-ta"; inp.rows = 4; inp.setAttribute("aria-label", "Paste a backup code"); inp.placeholder = "Paste a backup code"; body.appendChild(inp);
  var mg = el("button", "cycle-clear", "Add to what is here"); mg.type = "button"; var rp = el("button", "cycle-clear", "Replace what is here"); rp.type = "button";
  body.appendChild(mg); body.appendChild(rp);
  var msg2 = el("p", "cycle-note"); msg2.setAttribute("role", "status"); body.appendChild(msg2);
  var armed = false;
  function run(mode) { try { var n = T.importCode(inp.value, mode); msg2.textContent = "Restored " + n + " saved " + (n === 1 ? "item" : "items") + (mode === "replace" ? ", replacing what was here." : ", added to what was here."); inp.value = ""; window.dispatchEvent(new Event("storage")); } catch (e) { msg2.textContent = e.message; } armed = false; rp.textContent = "Replace what is here"; }
  mg.addEventListener("click", function () { run("merge"); });
  rp.addEventListener("click", function () { try { T.importCode(inp.value, "merge", true); } catch (e) { msg2.textContent = e.message; return; } if (!armed) { armed = true; rp.textContent = "Tap again to replace everything saved here"; msg2.textContent = "This removes what is saved on this device first."; return; } run("replace"); });
})();
