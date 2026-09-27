import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
const out='outputs/swipe-qa';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try {
 for(const [width,height] of [[320,568],[390,700],[430,760]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');
   localStorage.setItem('tanween.phrases.help.v1','seen');
  });
  await p.goto(`${base}/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10`);
  await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await p.getByRole('button',{name:'Begin judging',exact:true}).click();
  await p.locator('[data-word-hit]').first().waitFor();
  await p.locator('.page-nav-page').click();
  await p.getByRole('dialog',{name:'Jump to page',exact:true}).getByRole('spinbutton').fill('585');
  await p.getByRole('button',{name:'Go',exact:true}).click();
  await p.locator('[data-word-hit="80.b.0"]').waitFor();
  const cdp=await context.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  for(const target of [586,587,588]) {
   await p.waitForFunction(target=>document.querySelector(`[data-swipe-view="${target}"] [data-presentation-ready="true"]`),target);
   // Inspect every presentation frame, not just the final bounding box. A
   // ResizeObserver correction on the next frame must fail this regression.
   await p.evaluate(()=>{
    window.scaleFrames=[];window.traceScale=true;
    const capture=()=>{
     const host=document.querySelector('.mushaf-shell'),layer=document.querySelector('.mushaf-swipe-layer');
     const img=document.querySelector('.page-fixed-mushaf > img');
     if(img && getComputedStyle(layer).visibility==='hidden') {
      const r=img.getBoundingClientRect();
      window.scaleFrames.push({page:Number(img.parentElement.dataset.page),phase:host.dataset.pageSwipeState,x:r.x,y:r.y,w:r.width,h:r.height});
     }
     if(window.traceScale) requestAnimationFrame(capture);
    };requestAnimationFrame(capture);
   });
   const start=await p.locator('.page-fixed-mushaf').first().evaluate(e=>{
    const r=e.getBoundingClientRect();return {x:r.left+2,y:r.top+r.height*.4};
   });
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
   for(const dx of [30,80,130]) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+dx,y:start.y,id:1}]});
    await p.waitForTimeout(40);
   }
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await p.waitForFunction(target=>document.querySelector('.mushaf-shell')?.dataset.pageSwipeState==='idle' &&
    document.querySelector('.mushaf-composition')?.dataset.visiblePages===String(target),target);
   // Keep sampling after handover to expose any deferred size correction.
   await p.waitForTimeout(200);
   const frames=await p.evaluate(()=>{window.traceScale=false;return window.scaleFrames;});
   const visible=frames.filter(f=>f.page===target),last=visible.at(-1);
   assert.ok(visible.length>=2,'must sample the first visible frame and later frames');
   const maxChange=Math.max(...visible.flatMap(f=>['x','y','w','h'].map(axis=>Math.abs(f[axis]-last[axis]))));
   results.push({width,height,target,maxChange,frames:visible});
   writeFileSync(`${out}/scale-handover-results.json`,JSON.stringify(results,null,2));
   assert.ok(maxChange<0.1,`${width}px page ${target} changed after handover by ${maxChange}px`);
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(JSON.stringify(results.map(({frames,...result})=>result),null,2));
}finally{await browser.close();}
