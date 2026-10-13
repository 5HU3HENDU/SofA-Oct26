/* Behaviour every leaf page shares: sound toggle (tap only, off by default), hand-drawn highlights, nav cue. */
(function(){
var S=window.SofA; if(!S) return;
var on=false; try{on=localStorage.getItem("sofa-sound")==="on"}catch(e){}
document.body.dataset.cuelumeEmphasis="subtle";
S.setEnabled(on); S.setVolume(.12); S.setTheme("press"); S.bind();
var btn=document.querySelector("#sound");
function paint(){ if(!btn) return;
  btn.setAttribute("aria-pressed",String(on)); btn.setAttribute("aria-label",on?"Sound on":"Sound off"); btn.title=on?"Turn sound off":"Turn sound on";
  btn.innerHTML='<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 11h5l6-5v16l-6-5H5Z"/>'+(on?'<path d="M20 10q5 4 0 8m3-11q8 7 0 14"/>':'<path class="muted-line" d="m20 11 6 6m0-6-6 6"/>')+'</svg>'; }
paint();
var brand=document.querySelector(".brand"); if(brand) brand.addEventListener("click",function(){S.navCue("home")});
if(btn) btn.addEventListener("click",function(){ on=!on; S.setEnabled(on); paint(); try{localStorage.setItem("sofa-sound",on?"on":"off")}catch(e){} if(on) S.w("toggle",{theme:"press",emphasis:"subtle"}); });
document.addEventListener("click",function(t){ if(!on||t.defaultPrevented||t.ctrlKey||t.metaKey||t.shiftKey||t.altKey) return;
  var a=t.target.closest&&t.target.closest("a[data-cuelume-navigate]"); if(a&&a.target!=="_blank"){ t.preventDefault(); setTimeout(function(){location.href=a.href},220); } });
document.addEventListener("visibilitychange",function(){document.body.classList.toggle("paused",document.hidden)});
/* hand-drawn highlights: spans carry their stroke settings in data-rn; replace the static CSS fallback */
var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches, list=[];
document.querySelectorAll("[data-rn]").forEach(function(el){ var o=JSON.parse(el.getAttribute("data-rn")); o.animate=!reduce; o.animationDuration=700; o.multiline=true;
  el.className="rn-key"; el.removeAttribute("style"); list.push([el,o]); });
if(list.length) document.fonts.ready.then(function(){requestAnimationFrame(function(){
  var io=new IntersectionObserver(function(es){es.forEach(function(x){ if(x.isIntersecting){ x.target.__a&&x.target.__a.show(); io.unobserve(x.target);} })},{threshold:.6});
  list.forEach(function(p){ p[0].__a=S.annotate(p[0],p[1]); io.observe(p[0]); }); }); });
})();
