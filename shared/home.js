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
  var MAX = 5;
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
  function place(s) { s = str(s, 100); var i = s.indexOf("\u00b7"); return (i >= 0 ? s.slice(i + 1) : s).trim(); }
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
      var o = { kind: "train", at: dep, emoji: "1f686", label: "Train " + str(t.train, 24), route: place(t.from) + " \u2192 " + place(t.to), when: w.text, extra: bits.join(" \u00b7 "), tags: tags, asof: asOf(t.checked), href: "/travel/train/", checked: t.checked };
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
      var o = { kind: "flight", at: dep, emoji: "2708", label: "Flight " + str(t.al, 3) + " " + str(t.no, 4), route: from + (t.depTerminal ? " " + str(t.depTerminal, 12) : "") + " \u2192 " + (str(t.toName, 60) || str(t.to, 3)), when: w.text, extra: extra, tags: tags, asof: asOf(t.checked), href: "/travel/flight/", checked: t.checked };
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
  function render() {
    var all = items(); list.textContent = "";
    if (!all.length) { sec.hidden = true; return; }
    var shown = all.slice(0, MAX);
    list.appendChild(card(shown[0], true, "#f3e6c4"));
    if (shown.length > 1) { list.appendChild(el("p", "hu-later", "Later")); shown.slice(1).forEach(function (o) { list.appendChild(card(o, false, "#eef0df")); }); }
    if (all.length > MAX) list.appendChild(el("p", "hu-more", "+" + (all.length - MAX) + " more saved on the Train and Flight pages"));
    sec.hidden = false;
  }
  render();
  window.addEventListener("pageshow", render);
  window.addEventListener("storage", render);
})();
