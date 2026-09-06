/** Development QA for the actual judging renderer, on a separate storage origin. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { JudgingProvider, useJudging } from "../../src/state/store";
import { Mushaf } from "../../src/components/Mushaf";
import { MushafViewport } from "../../src/components/MushafViewport";
import { PageNav } from "../../src/components/PageNav";
import { MistakeLog } from "../../src/components/MistakeLog";
import { legacyAssignment } from "../../src/lib/judgeAssignments";
import { seedLedgerEvents } from "../../src/lib/judgingLedger";
import { fitMushafLine, measureMushafGlyph, mushafPageScale } from "../../src/lib/mushafGeometry";
import { loadPage } from "../../src/lib/page";
import { loadQcfPageFont, qcfFontFamily } from "../../src/lib/qcfFont";
import "../../src/styles/global.css";
let disposed = false;

if (location.hostname !== "127.0.0.1" || location.port !== "5198") throw new Error("Use the isolated QA origin on port 5198.");

function App() {
  const { state, dispatch } = useJudging();
  const [page, setPage] = useState(589);
  const [width, setWidth] = useState(1064);
  const [zoom, setZoom] = useState(100);
  const [report, setReport] = useState<object | null>(null);
  const [corpus, setCorpus] = useState<object | null>(null);
  const [pixelCheck, setPixelCheck] = useState(false);
  async function checkCorpus() {
    const result = {completed:0,words:0,lines:0,failures:[] as string[],minFont:Infinity,maxFont:0,large:[] as object[]};
    let next = 1;
    const worker = async () => {
      while(!disposed && next <= 604) {
        const p = next++;
        try {
          const [data] = await Promise.all([loadPage(p),loadQcfPageFont(p)]);
          for (const line of data.lines) {
            if(line.type !== 'ayah') continue;
            const metrics = line.words.map(w=>measureMushafGlyph(w.glyph ?? w.text,`"${qcfFontFamily(p)}"`));
            if(metrics.some(m=>!m)) { result.failures.push(`Unavailable glyph metrics ${p}:${line.n}`); continue; }
            result.words += metrics.length; result.lines++;
            if (line.centered) continue;
            const fit = fitMushafLine(460,metrics as NonNullable<typeof metrics[number]>[]);
            if(!fit || !Number.isFinite(fit.fontSize)) result.failures.push(`Invalid line ${p}:${line.n}`);
            else {
              result.minFont=Math.min(result.minFont,fit.fontSize);result.maxFont=Math.max(result.maxFont,fit.fontSize);
              if(fit.fontSize>45||fit.fontSize<24) result.large.push({page:p,line:line.n,font:fit.fontSize});
            }
          }
        } catch(error) { result.failures.push(`${p}: ${String(error)}`); }
        result.completed++;
        if(result.completed%20===0) setCorpus({...result,failures:[...result.failures]});
      }
    };
    setCorpus({completed:0});
    await Promise.all([worker(),worker(),worker()]);
    setCorpus({...result});
  }
  function start() {
    const participant = { ...state.participant, name: "Geometry QA fixture" };
    const assignment = legacyAssignment(state.config);
    dispatch({ type: "LOAD", state: { ...state, participant, sessionActive: true,
      activeSessionId: "qa-geometry", activeStartedAt: Date.now(), activeAssignment: assignment,
      activeQuestion: null, mistakes: [], impressions: [],
      events: seedLedgerEvents({ sessionId: "qa-geometry", participant, startedAt: Date.now(), mistakes: [], assignment }),
    }});
  }
  function inspect() {
    const pages = [...document.querySelectorAll<HTMLElement>(".page[data-font-ready='true']")].map(p => {
      const pr = p.getBoundingClientRect(), scale = mushafPageScale(p);
      const words = [...p.querySelectorAll<HTMLElement>(".m-word[data-role='letter']")].map(w => {
        const r = w.getBoundingClientRect(), s = getComputedStyle(w), fs = parseFloat(s.fontSize);
        const m = measureMushafGlyph(w.firstChild?.textContent ?? "", s.fontFamily, fs)!;
        const b = w.querySelector(".m-word-baseline")!.getBoundingClientRect().top;
        const h = p.querySelector<HTMLElement>(`[data-word-hit="${w.dataset.wid}"]`);
        const hr = h?.getBoundingClientRect();
        const visual = h ? getComputedStyle(h, "::before") : null;
        const ink = { left:r.left+m.left*fs*scale, right:r.left+m.right*fs*scale,
          top:b-m.ascent*fs*scale, bottom:b+m.descent*fs*scale };
        const overlay = hr && visual ? { left:hr.left+parseFloat(visual.left)*scale,
          top:hr.top+parseFloat(visual.top)*scale, width:parseFloat(visual.width)*scale, height:parseFloat(visual.height)*scale } : null;
        const miss = overlay ? Math.max(overlay.left-ink.left, overlay.top-ink.top,
          ink.right-overlay.left-overlay.width, ink.bottom-overlay.top-overlay.height, 0) : -1;
        const cx=(ink.left+ink.right)/2, cy=(ink.top+ink.bottom)/2;
        const topHit = document.elementFromPoint(cx,cy)?.closest<HTMLElement>("[data-word-hit]");
        const canvas = document.createElement('canvas'), pad = Math.ceil(fs*3), raster=4;
        canvas.width=pixelCheck?Math.ceil((r.width/scale+pad*2)*raster):1;canvas.height=pixelCheck?Math.ceil((fs+pad*2)*raster):1;
        const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
        ctx.scale(raster,raster);ctx.font=`${s.fontWeight} ${fs}px ${s.fontFamily}`;ctx.direction='rtl';ctx.textAlign='left';ctx.textBaseline='alphabetic';
        ctx.fillText(w.firstChild?.textContent ?? '',pad,pad+(b-r.top)/scale);
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let rasterMiss=0,painted=0;
        const missedPoints:object[]=[];
        for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
          if(pixels[(y*canvas.width+x)*4+3]<32)continue;
          painted++;
          if(!overlay)continue;
          const px=r.left+((x+.5)/raster-pad)*scale,py=r.top+((y+.5)/raster-pad)*scale;
          const radius=parseFloat(visual?.borderTopLeftRadius ?? '0')*scale;
          const cornerX=Math.min(Math.max(px,overlay.left+radius),overlay.left+overlay.width-radius);
          const cornerY=Math.min(Math.max(py,overlay.top+radius),overlay.top+overlay.height-radius);
          if(px<overlay.left||px>overlay.left+overlay.width||py<overlay.top||py>overlay.top+overlay.height||(px-cornerX)**2+(py-cornerY)**2>radius**2+.001) {
            rasterMiss++;
            if(missedPoints.length<4)missedPoints.push({left:overlay.left-px,right:px-overlay.left-overlay.width,top:overlay.top-py,bottom:py-overlay.top-overlay.height});
          }
        }
        return { id:w.dataset.wid, glyph:w.firstChild?.textContent, font:fs, line:w.closest('[data-mline]')?.getAttribute('data-mline'), rasterMiss, painted, missedPoints,
          box:[(r.x-pr.x)/pr.width,(r.y-pr.y)/pr.width,r.width/pr.width,r.height/pr.width],
          ink, overlay, miss, hit:topHit?.dataset.wordHit,
          onscreen:cx>=0&&cy>=0&&cx<innerWidth&&cy<innerHeight };
      });
      return {page:p.dataset.page,width:pr.width,height:pr.height,scale,words};
    });
    setReport({viewport:[innerWidth,innerHeight],width,zoom,pixelCheck,pages,misses:pages.flatMap(p=>p.words).filter(w=>w.miss>.15),
      wrongHit:pages.flatMap(p=>p.words).filter(w=>w.onscreen&&w.hit!==w.id),mistakes:state.mistakes});
  }
  return <><header style={{ display:"flex", gap:12,padding:8,alignItems:"center",flexWrap:"wrap" }}>
    <button onClick={start}>Start disposable judging fixture</button>
    <label>Page <input aria-label="QA page" type="number" value={page} onChange={e=>setPage(+e.target.value)} /></label>
    <label>Width <input aria-label="QA width" type="number" value={width} onChange={e=>setWidth(+e.target.value)} /></label>
    <label>Zoom <select aria-label="QA zoom" value={zoom} onChange={e=>setZoom(+e.target.value)}>{[100,110,125,150].map(v=><option key={v}>{v}</option>)}</select></label>
    <label><input type="checkbox" checked={pixelCheck} onChange={e=>setPixelCheck(e.target.checked)} />Pixel check</label>
    <button onClick={()=>setTimeout(inspect,0)}>Measure geometry</button><output aria-label="Mistake count">{state.mistakes.length}</output>
    <button onClick={checkCorpus}>Check all 604 fonts</button>
  </header><style>{`.geometry-qa > .mushaf-viewport { height:100%; } .geometry-qa .mushaf-shell { height:100%; }`}</style>
  <main className="app view-judge geometry-qa" style={{width, maxWidth:"100%", height:1180, display:"block", margin:"auto"}}>
    <MushafViewport layout="spread" zoomPercent={zoom} contentKey={`${page}`}>
      <Mushaf page={page} pageLayout="spread" questionRange={null} questionFocusMode="off" onPageChange={setPage}
        headerControls={(pages,compact)=><PageNav page={page} visiblePages={pages} layout="spread" compact={compact} onChange={setPage}/>} />
    </MushafViewport>
  </main><pre id="geometry-report" style={{maxHeight:150,overflow:"auto",fontSize:10}}>{JSON.stringify(report)}</pre>
  <pre id="corpus-report">{JSON.stringify(corpus)}</pre><div style={{maxWidth:400,margin:'auto'}}><MistakeLog /></div></>;
}
const root = createRoot(document.getElementById("root")!);
import.meta.hot?.dispose(() => { disposed = true; root.unmount(); });
root.render(<JudgingProvider><App/></JudgingProvider>);
