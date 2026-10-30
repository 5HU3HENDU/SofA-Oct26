/* Homepage folders only: tap a folder, its subtopics pop up, growing out of the folder.
   Subtopic taps are real links (built in the popup); this script only opens and closes. */
(function () {
  var dataEl = document.getElementById("folder-data");
  var sheet = document.getElementById("sheet");
  if (!dataEl || !sheet) return;
  var DATA = JSON.parse(dataEl.textContent);
  var box = sheet.querySelector(".sheetbox");
  var grid = document.getElementById("sheetGrid");
  var title = document.getElementById("sheetTitle");
  var count = document.getElementById("sheetCount");
  var back = document.getElementById("sheetBack");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) sheet.classList.add("reduce");

  function icon(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function openFolder(topic, tileEl) {
    title.innerHTML = icon(topic.icon) + '<a href="' + topic.href + '">' + esc(topic.name) + "</a>";
    count.textContent = topic.subs.length + " subtopics";
    grid.innerHTML = "";
    topic.subs.forEach(function (s, i) {
      var a = document.createElement("a");
      a.className = "app" + (s.soon ? " soon" : "");
      a.style.animationDelay = (i * 30) + "ms";
      a.href = s.href;
      if (s.blank) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      a.innerHTML = s.pill ? '<span class="pill">' + esc(s.name) + "</span>"
        : '<span class="chipicon">' + icon(s.icon) + "</span><span>" + esc(s.name) +
          (s.soon ? '<span class="soon-tag">Soon</span>' : "") + "</span>";
      grid.appendChild(a);
    });
    if (reduce) { sheet.classList.add("open"); return; }
    /* Grow from the tapped folder: measure the popup at its final spot,
       then animate transform from the tile's rect to the final rect. */
    box.style.transition = "none";
    box.style.transform = "translate(-50%, -50%) scale(1)";
    sheet.classList.add("open");
    var r = box.getBoundingClientRect();
    var t = tileEl.getBoundingClientRect();
    var s = Math.max(0.15, Math.min(1, t.width / r.width));
    var dx = (t.left + t.width / 2) - (r.left + r.width / 2);
    var dy = (t.top + t.height / 2) - (r.top + r.height / 2);
    box.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(" + s + ")";
    void box.offsetWidth;
    box.style.transition = "";
    requestAnimationFrame(function () {
      box.style.transform = "translate(-50%, -50%) scale(1)";
    });
    box.addEventListener("transitionend", function h(ev) {
      if (ev.propertyName !== "transform") return;
      box.removeEventListener("transitionend", h);
      box.style.transform = "";
    });
  }

  function closeFolder() {
    box.style.transform = "";
    sheet.classList.remove("open");
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  document.querySelectorAll(".folder").forEach(function (tile) {
    tile.addEventListener("click", function () {
      var slug = tile.getAttribute("data-topic");
      var topic = null;
      for (var i = 0; i < DATA.length; i++) { if (DATA[i].slug === slug) { topic = DATA[i]; break; } }
      if (topic) openFolder(topic, tile);
    });
  });
  back.addEventListener("click", closeFolder);
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && sheet.classList.contains("open")) closeFolder();
  });
})();
