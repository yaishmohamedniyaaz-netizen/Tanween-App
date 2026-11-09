import json
import os
# Reads OUT/pages.json from build.py and writes OUT/letter-colour-test.html
D=os.environ.get('OUT','./out/')
pages=json.load(open(D+'pages.json'))
HTML=r'''<title>Letter Colour Test</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400&display=swap">
<style>
/* Layout: a judging-desk page. Controls on top, the Mushaf page as the one object on paper, a letter tray at the bottom. */
:root{
  --bg:#f3f2ee; --surface:#fdfcf9; --paper:#fbfaf7; --ink:#1e1a14; --ink-2:#67625c; --line:rgba(30,26,20,.10); --line-2:rgba(30,26,20,.18);
  --jali:#ca244d; --khafi:#d58e3a; --fasaha:#3358d4;
  --jali-tint:#fbe3e6; --khafi-tint:#f8ead6; --fasaha-tint:#e2e8fa;
  --focus:#1e1a14; --art-filter:none; --wash:rgba(30,26,20,.08); --on-solid:#fff;
  --ui:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#151413; --surface:#1e1e1d; --paper:#211f1c; --ink:#f0eae3; --ink-2:#a9a49d; --line:rgba(255,255,255,.10); --line-2:rgba(255,255,255,.18);
  --jali:#f07685; --khafi:#de8d18; --fasaha:#779cff;
  --jali-tint:#49282b; --khafi-tint:#442e15; --fasaha-tint:#27324d;
  --focus:#f0eae3; --art-filter:invert(1) hue-rotate(180deg) brightness(.92); --wash:rgba(255,255,255,.10); --on-solid:#1e1a14; color-scheme:dark }}
:root[data-theme="dark"]{
  --bg:#151413; --surface:#1e1e1d; --paper:#211f1c; --ink:#f0eae3; --ink-2:#a9a49d; --line:rgba(255,255,255,.10); --line-2:rgba(255,255,255,.18);
  --jali:#f07685; --khafi:#de8d18; --fasaha:#779cff;
  --jali-tint:#49282b; --khafi-tint:#442e15; --fasaha-tint:#27324d;
  --focus:#f0eae3; --art-filter:invert(1) hue-rotate(180deg) brightness(.92); --wash:rgba(255,255,255,.10); --on-solid:#1e1a14; color-scheme:dark }
*{box-sizing:border-box}
[hidden]{display:none!important}
body{background:var(--bg);color:var(--ink);font:400 15px/1.5 var(--ui);padding-block:20px 40px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.wrap{max-width:1180px;margin:0 auto;display:grid;gap:16px}
header h1{font-size:21px;font-weight:700;margin:0;text-wrap:balance}
header p{margin:4px 0 0;color:var(--ink-2);max-width:72ch}
.bar{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center}
.group{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.label{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2)}
.seg{display:inline-flex;background:var(--surface);border-radius:12px;box-shadow:0 0 0 1px var(--line);padding:3px;gap:2px}
.seg button,.plain{font:600 14px var(--ui);color:var(--ink-2);background:transparent;border:0;border-radius:9px;min-height:40px;padding:0 14px;cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
.plain{color:var(--ink);box-shadow:0 0 0 1px var(--line);background:var(--surface);border-radius:12px}
button:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.status{color:var(--ink-2);font-size:14px;font-variant-numeric:tabular-nums}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:14px;color:var(--ink-2)}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend i{width:12px;height:12px;border-radius:3px;background:var(--c)}
.stage{display:grid;gap:16px;grid-template-columns:1fr}
.stage.both{grid-template-columns:repeat(2,minmax(0,1fr))}
@media (max-width:760px){.stage.both{grid-template-columns:1fr}}
figure{margin:0;background:var(--paper);border-radius:12px;box-shadow:0 0 0 1px var(--line);padding:16px;min-width:0;display:grid;gap:8px;justify-items:center}
figcaption{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2);justify-self:start}
.dk{width:100%;max-width:560px;color:var(--ink)}
.dk svg{width:100%;height:auto;display:block}
.dk .wordhit{fill:transparent;cursor:pointer}
@media (hover:hover){.dk .wordhit:hover{fill:var(--wash)}}
.dk .wordhit.open{fill:var(--wash)}
.art{width:100%;max-width:560px;filter:var(--art-filter)}
.tray{position:fixed;z-index:20;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(560px,calc(100vw - 32px));background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line-2),0 16px 40px rgba(0,0,0,.18);padding:12px 14px 14px;display:grid;gap:12px}
.tray-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px;color:var(--ink-2)}
.x{min-width:44px;min-height:44px;border:0;background:transparent;color:var(--ink);font:600 14px var(--ui);cursor:pointer;border-radius:10px}
.bigword{display:flex;justify-content:center;color:var(--ink)}
.bigword svg{height:110px;width:auto;max-width:100%;overflow:visible}
.bigword use{cursor:pointer}
.letters{display:flex;flex-direction:row-reverse;flex-wrap:wrap;gap:8px;justify-content:center}
.letters button{min-width:52px;height:52px;border:0;border-radius:12px;background:var(--paper);box-shadow:0 0 0 1px var(--line);font:400 26px/1 "Noto Naskh Arabic","Amiri",serif;color:var(--ink);cursor:pointer;position:relative}
.letters button.sel{box-shadow:0 0 0 2px var(--ink)}
.letters button.on{color:var(--mc)}
.letters button.on::after{content:"";position:absolute;left:10px;right:10px;bottom:6px;height:3px;border-radius:2px;background:var(--mc)}
.crits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:8px}
.crit{min-height:52px;border:0;border-radius:12px;font:650 15px var(--ui);cursor:pointer;background:var(--paper);color:var(--ink);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;justify-content:center;gap:8px}
.crit i{width:12px;height:12px;border-radius:3px;background:var(--c)}
.crit.on{background:var(--c);color:var(--on-solid);box-shadow:none}
.crit.on i{background:currentColor}
.crit.rm{padding:0 14px;color:var(--ink-2)}
.notes{background:var(--surface);border-radius:12px;box-shadow:0 0 0 1px var(--line);padding:16px 18px;display:grid;gap:6px}
.notes h2{font-size:15px;margin:0}
.notes ul{margin:0;padding-left:20px;color:var(--ink-2)}
.notes li{margin:2px 0}
.spacer{height:240px}
@media (prefers-reduced-motion:no-preference){.dk use,.dk .tint{transition:fill .12s ease}}
</style>
<div class="wrap">
  <header>
    <h1>Letter colour test</h1>
    <p>This page is drawn with the free DigitalKhatt <em>old Madina</em> font, laid out line by line like your Mushaf. Tap a word, tap the letter, then tap Jali, Khafi or Fasaha. The word gets a light wash of that colour and the letter itself shows the strong colour.</p>
  </header>
  <div class="bar">
    <div class="group"><span class="label">Page</span><div class="seg" id="pages"></div></div>
    <div class="group"><span class="label">Show</span><div class="seg" id="views">
      <button type="button" data-v="both">Side by side</button><button type="button" data-v="dk">DigitalKhatt</button><button type="button" data-v="art">Your print</button></div></div>
    <div class="group"><span class="label">Examples</span>
      <button type="button" class="plain" data-preset="few">A few marks</button>
      <button type="button" class="plain" data-preset="many">Many marks</button>
      <button type="button" class="plain" data-preset="same">Same word, 3 letters</button>
      <button type="button" class="plain" id="clear">Clear page</button></div>
  </div>
  <div class="bar">
    <div class="legend"><span style="--c:var(--jali)"><i></i>Jali</span><span style="--c:var(--khafi)"><i></i>Khafi</span><span style="--c:var(--fasaha)"><i></i>Fasaha</span></div>
    <span class="status" id="status"></span>
  </div>
  <div class="stage" id="stage">
    <figure id="figDk"><figcaption>DigitalKhatt font · tap a word</figcaption><div class="dk" id="dk"></div></figure>
    <figure id="figArt"><figcaption>Your print (1405 artwork) · for comparison</figcaption><img class="art" id="art" alt="The same Mushaf page from the printed artwork"></figure>
  </div>
  <div class="tray" id="tray" hidden role="dialog" aria-label="Mark a letter in the chosen word">
    <div class="tray-head"><span id="trayHint">Choose the letter, then the criterion</span><button type="button" class="x" id="trayClose">Done</button></div>
    <div class="bigword" id="bigword"></div>
    <div class="letters" id="letters"></div>
    <div class="crits" id="crits">
      <button type="button" class="crit" data-c="jali" style="--c:var(--jali)"><i></i>Jali</button>
      <button type="button" class="crit" data-c="khafi" style="--c:var(--khafi)"><i></i>Khafi</button>
      <button type="button" class="crit" data-c="fasaha" style="--c:var(--fasaha)"><i></i>Fasaha</button>
      <button type="button" class="crit rm" id="remove">Remove</button>
    </div>
  </div>
  <section class="notes">
    <h2>What to look at</h2>
    <ul>
      <li><strong>Marks:</strong> the whole word gets a light wash, and the mistaken letter itself shows the strong colour. Use the examples to see a judged page.</li>
      <li><strong>Shapes:</strong> are the letters close enough to the print for judges?</li>
      <li><strong>Lines and words:</strong> each line starts and ends on the same words as your print. Page 3 has 127 words here and 127 in the app's own word list. Page 582 has 4 more because the basmala is counted. The spacing inside a line is different.</li>
      <li><strong>Letter names in the tray</strong> come from the font itself (for example a "beh" shape with one dot below is ب). This is how the app could link a mark to the right letter.</li>
      <li><strong>Limits of this test:</strong> letters are not yet matched to the app's own letter list, and marks are not saved.</li>
    </ul>
  </section>
  <div class="spacer" aria-hidden="true"></div>
</div>
<script>
const PAGES=__PAGES__;
const LABEL={"3":"3 · Al-Baqarah","582":"582 · An-Naba"};
const NAME={jali:"Jali",khafi:"Khafi",fasaha:"Fasaha"};
const CRITS=["jali","khafi","fasaha"];
const state={page:"3",view:"both",word:null,sel:null,marks:{}};
const $=s=>document.querySelector(s);const NS="http://www.w3.org/2000/svg";
const pagesEl=$("#pages");
Object.keys(PAGES).forEach(p=>{const b=document.createElement("button");b.type="button";b.dataset.p=p;b.textContent=LABEL[p]||p;pagesEl.appendChild(b);});
const marks=()=>state.marks[state.page]||(state.marks[state.page]={}); /* letter -> {c, t} */
const letters=()=>PAGES[state.page].letters;
const wordLetters=w=>letters().map((L,i)=>[L,i]).filter(([L])=>String(L.w)===String(w)).map(([,i])=>String(i));
function colourUses(root){const m=marks();root.querySelectorAll("use[data-l]").forEach(u=>{const k=m[u.dataset.l];u.style.fill=k?`var(--${k.c})`:"";});}
function bboxes(svg,attr){const out={};svg.querySelectorAll(`use[${attr}]`).forEach(u=>{const b=u.getBBox();if(!b.width&&!b.height)return;const k=u.getAttribute(attr);const g=out[k]||(out[k]={x0:1e9,y0:1e9,x1:-1e9,y1:-1e9});
  g.x0=Math.min(g.x0,b.x);g.y0=Math.min(g.y0,b.y);g.x1=Math.max(g.x1,b.x+b.width);g.y1=Math.max(g.y1,b.y+b.height);});return out;}
function rect(g,cls,pad){const r=document.createElementNS(NS,"rect");r.setAttribute("class",cls);r.setAttribute("rx","1.6");
  r.setAttribute("x",g.x0-pad);r.setAttribute("y",g.y0-pad);r.setAttribute("width",g.x1-g.x0+2*pad);r.setAttribute("height",g.y1-g.y0+2*pad);return r;}
function setup(svg){
  svg._wb=bboxes(svg,"data-w");svg._lb=bboxes(svg,"data-l");
  const tints=document.createElementNS(NS,"g");tints.setAttribute("class","tints");
  const defs=svg.querySelector("defs");(defs||svg.firstChild).after(tints);svg._tints=tints; /* under the ink */
  const hits=document.createElementNS(NS,"g");Object.entries(svg._wb).forEach(([w,g])=>{const r=rect(g,"wordhit",1);r.dataset.w=w;hits.appendChild(r);});
  svg.appendChild(hits); /* above the ink, for tapping */
}
function paint(){
  const svg=$("#dk svg");if(!svg)return;colourUses(svg);
  const m=marks();const byWord={};Object.entries(m).forEach(([l,k])=>{const w=letters()[l].w;if(!byWord[w]||byWord[w].t<k.t)byWord[w]=k;});
  svg._tints.replaceChildren(...Object.entries(byWord).map(([w,k])=>{const r=rect(svg._wb[w],"tint",1);r.style.fill=`var(--${k.c}-tint)`;return r;}));
  svg.querySelectorAll(".wordhit").forEach(r=>r.classList.toggle("open",r.dataset.w===String(state.word)));
  const n=Object.keys(m).length,nw=Object.keys(byWord).length;$("#status").textContent=`${letters().length} letters on this page · ${n} marked in ${nw} word${nw===1?"":"s"}`;
  renderTray();
}
function renderTray(){
  const tray=$("#tray");if(state.word===null){tray.hidden=true;return;}
  tray.hidden=false;const svg=$("#dk svg");const g=svg._wb[state.word];const pad=2;const m=marks();
  const big=document.createElementNS(NS,"svg");big.setAttribute("viewBox",`${g.x0-pad} ${g.y0-pad} ${g.x1-g.x0+2*pad} ${g.y1-g.y0+2*pad}`);big.setAttribute("aria-hidden","true");
  svg.querySelectorAll(`use[data-w="${state.word}"]`).forEach(u=>{const c=u.cloneNode();c.style.fill="";big.appendChild(c);});
  colourUses(big);if(state.sel!==null&&!m[state.sel])big.querySelectorAll(`use[data-l="${state.sel}"]`).forEach(u=>u.style.fill="var(--ink-2)");
  $("#bigword").replaceChildren(big);
  const box=$("#letters");box.replaceChildren(...wordLetters(state.word).map(i=>{const L=letters()[i];const b=document.createElement("button");b.type="button";b.textContent=L.label;b.dataset.l=i;
    b.setAttribute("aria-pressed",String(i)===String(state.sel));b.setAttribute("aria-label","Letter "+L.label+(m[i]?", marked "+NAME[m[i].c]:""));
    if(String(i)===String(state.sel))b.classList.add("sel");if(m[i]){b.classList.add("on");b.style.setProperty("--mc",`var(--${m[i].c})`);}return b;}));
  const cur=state.sel!==null?m[state.sel]:null;
  document.querySelectorAll(".crit[data-c]").forEach(b=>b.classList.toggle("on",!!cur&&cur.c===b.dataset.c));
  $("#remove").hidden=!cur;
  $("#trayHint").textContent=state.sel===null?"Choose the letter":`Letter ${letters()[state.sel].label} · choose the criterion`;
}
let clock=1;
function mark(l,c){marks()[l]={c,t:clock++};}
function openWord(w,l){state.word=w;const ls=wordLetters(w);state.sel=l!==undefined&&ls.includes(String(l))?String(l):(ls.find(i=>marks()[i])||ls[0]);paint();}
function letterAt(svg,x,y){const pt=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM().inverse());let best=null,area=1e9;
  Object.entries(svg._lb).forEach(([l,g])=>{if(pt.x>=g.x0-.5&&pt.x<=g.x1+.5&&pt.y>=g.y0-.5&&pt.y<=g.y1+.5){const a=(g.x1-g.x0)*(g.y1-g.y0);if(a<area){area=a;best=l;}}});return best;}
function render(){
  pagesEl.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.p===state.page));
  document.querySelectorAll("#views button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===state.view));
  const dk=$("#dk");
  if(dk.dataset.p!==state.page){dk.innerHTML=PAGES[state.page].svg;dk.dataset.p=state.page;const svg=dk.querySelector("svg");svg.setAttribute("role","img");svg.setAttribute("aria-label","Mushaf page "+state.page+" drawn with DigitalKhatt");setup(svg);}
  $("#art").src=PAGES[state.page].art;
  $("#stage").className="stage"+(state.view==="both"?" both":"");
  $("#figDk").hidden=state.view==="art";$("#figArt").hidden=state.view==="dk";
  paint();
}
function preset(kind){
  state.marks[state.page]={};const L=letters();const words=[...new Set(L.map(x=>x.w))];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  if(kind==="same"){const ok=words.filter(w=>wordLetters(w).length>=4);const w=pick(ok);const ls=wordLetters(w);
    [[ls[0],"jali"],[ls[Math.floor(ls.length/2)],"khafi"],[ls[ls.length-1],"fasaha"]].forEach(([l,c])=>mark(l,c));state.word=null;render();
    const r=$(`#dk .wordhit[data-w="${w}"]`);r&&r.scrollIntoView({block:"center",behavior:"smooth"});return;}
  const n=kind==="few"?6:24;const used=new Set();
  while(used.size<n){const w=pick(words);if(used.has(w))continue;used.add(w);const ls=wordLetters(w);mark(pick(ls),pick(CRITS));if(Math.random()<.15&&ls.length>2)mark(pick(ls),pick(CRITS));}
  state.word=null;render();
}
pagesEl.addEventListener("click",e=>{const b=e.target.closest("button");if(b){state.page=b.dataset.p;state.word=null;render();}});
$("#views").addEventListener("click",e=>{const b=e.target.closest("button");if(b){state.view=b.dataset.v;render();}});
document.querySelectorAll("[data-preset]").forEach(b=>b.addEventListener("click",()=>preset(b.dataset.preset)));
$("#clear").addEventListener("click",()=>{state.marks[state.page]={};state.word=null;paint();});
$("#dk").addEventListener("click",e=>{const w=e.target.closest(".wordhit");if(!w)return;
  if(state.word===w.dataset.w&&!e.detail){state.word=null;paint();return;}
  const svg=$("#dk svg");openWord(w.dataset.w,letterAt(svg,e.clientX,e.clientY)??undefined);});
$("#letters").addEventListener("click",e=>{const b=e.target.closest("button");if(b){state.sel=b.dataset.l;paint();}});
$("#bigword").addEventListener("click",e=>{const u=e.target.closest("use[data-l]");if(u){state.sel=u.dataset.l;paint();}});
$("#crits").addEventListener("click",e=>{const b=e.target.closest(".crit");if(!b||state.sel===null)return;
  if(b.id==="remove"){delete marks()[state.sel];paint();return;}
  const cur=marks()[state.sel];if(cur&&cur.c===b.dataset.c)delete marks()[state.sel];else mark(state.sel,b.dataset.c);paint();});
$("#trayClose").addEventListener("click",()=>{state.word=null;paint();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&state.word!==null){state.word=null;paint();}});
try{if(window.matchMedia("(max-width:760px)").matches)state.view="dk";}catch(e){}
render();preset("few");
</script>'''
open(D+'letter-colour-test.html','w').write(HTML.replace('__PAGES__',json.dumps(pages,ensure_ascii=False)))
