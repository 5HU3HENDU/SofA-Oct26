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
