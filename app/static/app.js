const CATALOG = [
  {id:"crossing", group:"Railway (US, GCOR 5.8.2)", pattern:"- - o -", meaning:"Approaching a public grade crossing; prolong or repeat the last sound until the locomotive occupies the crossing (49 CFR 222.21)."},
  {id:"proceed", group:"Railway (US, GCOR 5.8.2)", pattern:"- -", meaning:"Release brakes, proceed."},
  {id:"applied", group:"Railway (US, GCOR 5.8.2)", pattern:"o", meaning:"When stopped: air brakes applied, pressure equalized."},
  {id:"acknowledge", group:"Railway (US, GCOR 5.8.2)", pattern:"o o", meaning:"Acknowledge any signal not otherwise provided for."},
  {id:"back-up", group:"Railway (US, GCOR 5.8.2)", pattern:"o o o", meaning:"When stopped: back up."},
  {id:"request", group:"Railway (US, GCOR 5.8.2)", pattern:"o o o o", meaning:"Request a signal to be given or repeated."},
  {id:"emergency", group:"Railway (US, GCOR 5.8.2)", pattern:"o o o o o o o o", meaning:"Succession of short sounds: emergency, persons or livestock on the track."},
  {id:"starboard", group:"Marine (COLREGS Rule 34)", pattern:"o", meaning:"I am altering my course to starboard.", long:5000},
  {id:"port", group:"Marine (COLREGS Rule 34)", pattern:"o o", meaning:"I am altering my course to port.", long:5000},
  {id:"astern", group:"Marine (COLREGS Rule 34)", pattern:"o o o", meaning:"I am operating astern propulsion.", long:5000},
  {id:"danger", group:"Marine (COLREGS Rule 34)", pattern:"o o o o o", meaning:"Doubt or danger: at least five short and rapid blasts.", long:5000},
  {id:"bend", group:"Marine (COLREGS Rule 34)", pattern:"-", meaning:"Approaching a bend or obscured area.", long:5000},
  {id:"fog-way", group:"Marine (COLREGS Rule 35)", pattern:"-", meaning:"Power-driven vessel making way in restricted visibility, at intervals of not more than 2 minutes.", long:5000},
  {id:"fog-stopped", group:"Marine (COLREGS Rule 35)", pattern:"- -", meaning:"Power-driven vessel underway but stopped, every 2 minutes or less.", long:5000},
];
const $ = id => document.getElementById(id);
let ctx, stopAt = 0, timers = [];

function tokens(){ return $("pattern").value.trim().split(/\s+/).filter(Boolean); }
function timing(){ return {short:+$("short").value, long:+$("long").value, gap:+$("gap").value}; }
function steps(){
  const t = timing(), out = [];
  tokens().forEach((k,i,a)=>{
    const isLong = k==="-"||k==="L"; const isShort = k==="o"||k==="S";
    if(!isLong && !isShort) return;
    out.push({on:true, ms:isLong?t.long:t.short});
    if(i<a.length-1) out.push({on:false, ms:t.gap});
  });
  return out;
}
function drawTimeline(){
  const s = steps(), total = s.reduce((a,b)=>a+b.ms,0) || 1, el = $("timeline");
  el.innerHTML = "";
  s.forEach(st=>{ const d=document.createElement("span"); d.className=st.on?"on":"off"; d.style.width=(100*st.ms/total)+"%"; el.appendChild(d); });
  $("timeline").title = (total/1000).toFixed(1)+" s";
}
function stop(){ timers.forEach(clearTimeout); timers=[]; if(ctx){ ctx.close(); ctx=null; } document.querySelectorAll(".timeline span").forEach(x=>x.classList.remove("active")); }
function play(){
  stop(); ctx = new (window.AudioContext||window.webkitAudioContext)();
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
  [311.1, 370.0, 493.9].forEach(f=>{ const o=ctx.createOscillator(); o.type="sawtooth"; o.frequency.value=f; const g=ctx.createGain(); g.gain.value=0.25; o.connect(g); g.connect(gain); o.start(); });
  const lp = ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=1800; gain.disconnect(); gain.connect(lp); lp.connect(ctx.destination);
  const vol = +$("vol").value; let t = ctx.currentTime + 0.05, ms = 0;
  const spans = [...document.querySelectorAll(".timeline span")];
  steps().forEach((st,i)=>{
    if(st.on){ gain.gain.setTargetAtTime(vol, t, 0.02); gain.gain.setTargetAtTime(0, t+st.ms/1000, 0.03);
      timers.push(setTimeout(()=>spans[i]&&spans[i].classList.add("active"), ms));
      timers.push(setTimeout(()=>spans[i]&&spans[i].classList.remove("active"), ms+st.ms)); }
    t += st.ms/1000; ms += st.ms;
  });
  timers.push(setTimeout(stop, ms+400));
}
function onset(){
  const mph = +$("mph").value; if(!(mph>0)) return;
  const v = mph*5280/3600;
  $("onset").textContent = mph>60
    ? `Start at about 1,320 ft (quarter mile): ${(1320/v).toFixed(1)} s of warning at ${mph} mph.`
    : `Start between ${Math.round(20*v).toLocaleString()} ft and ${Math.round(15*v).toLocaleString()} ft before the crossing.`;
}
function level(){
  const ref=+$("ref").value, d=+$("dist").value; if(!(d>0)) return;
  const l = ref - 20*Math.log10(d/100);
  const band = ref>=96&&ref<=110 ? "inside" : "outside";
  $("level").textContent = `${l.toFixed(1)} dB(A) at ${d.toLocaleString()} ft (reference is ${band} the 96-110 dB(A) locomotive band)`;
}
async function loadSaved(){
  const r = await fetch("api/patterns"); const items = r.ok ? await r.json() : [];
  const ul = $("saved"); ul.innerHTML = "";
  if(!items.length){ ul.innerHTML = "<li class='hint'>Nothing saved yet.</li>"; return; }
  items.forEach(it=>{
    const li=document.createElement("li");
    const a=document.createElement("a"); a.href="#"; a.textContent=`${it.name} (${it.pattern})`;
    a.onclick=e=>{e.preventDefault(); $("pattern").value=it.pattern; $("short").value=it.timing.short; $("long").value=it.timing.long; $("gap").value=it.timing.gap; $("meaning").textContent=it.note||""; drawTimeline();};
    const b=document.createElement("button"); b.className="secondary"; b.textContent="Delete";
    b.onclick=async()=>{ await fetch("api/patterns/"+it.id,{method:"DELETE"}); loadSaved(); };
    li.append(a,b); ul.appendChild(li);
  });
}
async function saveCurrent(){
  const r = await fetch("api/patterns",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:$("sname").value, note:$("snote").value, pattern:tokens().join(" "), timing:timing()})});
  if(!r.ok){ alert((await r.json()).error); return; }
  $("sname").value=""; $("snote").value=""; loadSaved();
}
function init(){
  const sel=$("catalog"); let grp, og;
  CATALOG.forEach(c=>{ if(c.group!==grp){ og=document.createElement("optgroup"); og.label=grp=c.group; sel.appendChild(og);} const o=document.createElement("option"); o.value=c.id; o.textContent=`${c.id} (${c.pattern})`; og.appendChild(o); });
  sel.onchange=()=>{ const c=CATALOG.find(x=>x.id===sel.value); $("pattern").value=c.pattern; $("long").value=c.long||3000; $("meaning").textContent=c.meaning; drawTimeline(); };
  ["pattern","short","long","gap"].forEach(id=>$(id).oninput=drawTimeline);
  $("play").onclick=play; $("stop").onclick=stop; $("save").onclick=saveCurrent;
  ["mph"].forEach(id=>$(id).oninput=onset); ["ref","dist"].forEach(id=>$(id).oninput=level);
  sel.onchange(); onset(); level(); loadSaved();
}
init();
