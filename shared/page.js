/* Behaviour every page shares: sound toggle (tap only, off by default), hand-drawn highlights, install button. */
(function(){
var S=window.SofA; if(!S) return;
var on=false; try{on=localStorage.getItem("sofa-sound")==="on"}catch(e){}
document.body.dataset.cuelumeEmphasis="subtle";
S.setEnabled(on); S.setVolume(1); S.setTheme("press"); S.bind();
var btn=document.querySelector("#sound");
function paint(){ if(!btn) return;
  btn.setAttribute("aria-pressed",String(on)); btn.setAttribute("aria-label",on?"Sound on":"Sound off"); btn.title=on?"Turn sound off":"Turn sound on";
  btn.innerHTML='<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 11h5l6-5v16l-6-5H5Z"/>'+(on?'<path d="M20 10q5 4 0 8m3-11q8 7 0 14"/>':'<path class="muted-line" d="m20 11 6 6m0-6-6 6"/>')+'</svg>'; }
paint();
if(btn) btn.addEventListener("click",function(){ on=!on; S.setEnabled(on); paint(); try{localStorage.setItem("sofa-sound",on?"on":"off")}catch(e){} if(on) S.w("toggle",{theme:"press",emphasis:"subtle"}); });
document.addEventListener("visibilitychange",function(){document.body.classList.toggle("paused",document.hidden)});
/* hand-drawn highlights: spans carry their stroke settings in data-rn; replace the static CSS fallback */
var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches, list=[];
document.querySelectorAll("[data-rn]").forEach(function(el){ var o=JSON.parse(el.getAttribute("data-rn")); o.animate=!reduce; o.animationDuration=700; o.multiline=true;
  el.className="rn-key"; el.removeAttribute("style"); list.push([el,o]); });
if(list.length) document.fonts.ready.then(function(){requestAnimationFrame(function(){
  var io=new IntersectionObserver(function(es){es.forEach(function(x){ if(x.isIntersecting){ x.target.__a&&x.target.__a.show(); io.unobserve(x.target);} })},{threshold:.6});
  list.forEach(function(p){ p[0].__a=S.annotate(p[0],p[1]); io.observe(p[0]); }); }); });
/* install button stays hidden until the browser offers installation */
var install=document.querySelector("#install"), offer;
if(install){
  window.addEventListener("beforeinstallprompt",function(t){t.preventDefault(); offer=t; install.hidden=false});
  install.addEventListener("click",async function(){ if(offer){ await offer.prompt(); offer=null; install.hidden=true; } });
  window.addEventListener("appinstalled",function(){install.hidden=true});
}
if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).then(function(r){r.update()}).catch(function(){});
})();

(function(){
function pick(tab,focus){
  var list=tab.closest('[role="tablist"]');if(!list)return;
  var tabs=[].slice.call(list.querySelectorAll('[role="tab"]'));
  tabs.forEach(function(t){
    var on=t===tab;
    t.setAttribute('aria-selected',on?'true':'false');
    t.tabIndex=on?0:-1;
    var p=document.getElementById(t.getAttribute('aria-controls'));
    if(p)p.hidden=!on;
  });
  if(focus)tab.focus();
}
document.addEventListener('click',function(e){
  var t=e.target.closest&&e.target.closest('[role="tab"]');
  if(t)pick(t,false);
});
document.addEventListener('keydown',function(e){
  var t=e.target.closest&&e.target.closest('[role="tab"]');
  if(!t)return;
  var tabs=[].slice.call(t.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
  var i=tabs.indexOf(t),n=null;
  if(e.key==='ArrowRight')n=tabs[(i+1)%tabs.length];
  else if(e.key==='ArrowLeft')n=tabs[(i-1+tabs.length)%tabs.length];
  else if(e.key==='Home')n=tabs[0];
  else if(e.key==='End')n=tabs[tabs.length-1];
  if(n){e.preventDefault();pick(n,true);}
});
})();

(function(){
var room=document.querySelector('.packing-room');if(!room)return;
var K='sofa-packing-v1',KN='sofa-packing-na-v1',KS='sofa-packing-sum-v1',saved={},na={};
try{saved=JSON.parse(localStorage.getItem(K)||'{}')||{}}catch(e){}
try{na=JSON.parse(localStorage.getItem(KN)||'{}')||{}}catch(e){}
var boxes=[].slice.call(room.querySelectorAll('.packing-item input[type="checkbox"]'));
var count=room.querySelector('.packing-count'),bar=room.querySelector('.packing-progress i'),status=room.querySelector('.packing-status');
function isNa(b){return !!na[b.getAttribute('data-item')]}
function show(){
  var need=boxes.filter(function(b){return !isNa(b)}),n=need.filter(function(b){return b.checked}).length,nn=boxes.length-need.length;
  if(count)count.textContent=n+' of '+need.length+' packed'+(nn?' ('+nn+' not needed)':'');
  if(bar)bar.style.width=(need.length?n/need.length*100:0)+'%';
  try{localStorage.setItem(KS,JSON.stringify({total:boxes.length,packed:n,na:nn}))}catch(e){}
}
function save(msg){
  var o={};boxes.forEach(function(b){if(b.checked)o[b.getAttribute('data-item')]=true});
  try{localStorage.setItem(K,JSON.stringify(o));localStorage.setItem(KN,JSON.stringify(na));if(status)status.textContent=msg||'Saved on this device.'}
  catch(e){if(status)status.textContent='Storage is unavailable. Ticks may not survive closing this page.'}
}
boxes.forEach(function(b){
  var it=b.getAttribute('data-item'),lab=b.closest('.packing-item');
  b.checked=!!saved[it];
  b.addEventListener('change',function(){show();save()});
  var x=document.createElement('button');x.type='button';x.className='packing-na';
  function paint(){var v=!!na[it];lab.classList.toggle('is-na',v);x.textContent=v?'Needed':'Not needed';x.setAttribute('aria-pressed',v?'true':'false');x.setAttribute('aria-label',(v?'Mark needed: ':'Mark not needed: ')+it)}
  x.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();if(na[it])delete na[it];else{na[it]=true;b.checked=false}paint();show();save()});
  lab.appendChild(x);paint();
});
var reset=room.querySelector('.packing-reset');
if(reset)reset.addEventListener('click',function(){
  boxes.forEach(function(b){b.checked=false});show();save('Unpacked. Ready for a fresh trip.');
});
show();
})();
