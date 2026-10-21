import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.env.MOTION_OUT||'outputs/mobile-collapse/profile';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10');
 await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
 await page.getByRole('button',{name:'Begin judging',exact:true}).click();
 await page.waitForFunction(()=>window.providerQA?.state.sessionActive);
 await page.evaluate(async()=>{await window.providerQA.addFindings(20);await document.fonts.ready});
 await page.locator('.mobile-mistakes-action').click();await page.waitForTimeout(500);
 const ledgerBefore=await page.evaluate(()=>window.providerQA.state.events.length);
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.MOTION_CPU||6)});
 const results=[];
 for(const position of ['top','bottom']){
 const row=page.locator('.is-mobile-sheet .log-row-wrap')[position==='top'?'first':'last']();
 await row.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
 for(let cycle=0;cycle<3;cycle++)for(const action of ['open','close']){
  if(process.env.MOTION_SETTLED&&action==='close')await page.waitForTimeout(1500);
  await row.evaluate(el=>{window.samples=[];const run=window.motionRun=(window.motionRun||0)+1;window.collect=true;window.actionAt=0;function sample(t){if(run!==window.motionRun||!window.collect)return;const r=el.getBoundingClientRect(),g=el.querySelector('.log-glyph').getBoundingClientRect();window.samples.push({t,h:r.height,y:r.y,glyphY:g.y,scroll:el.parentElement.scrollTop});requestAnimationFrame(sample)}requestAnimationFrame(sample)});
  await cdp.send('Tracing.start',{categories:'devtools.timeline',transferMode:'ReturnAsStream'});
  await row.locator('.log-row').evaluate(el=>{window.actionAt=performance.now();el.click()});
  await page.waitForTimeout(450);
  const traceDone=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await traceDone;
  let raw='';for(;;){const chunk=await cdp.send('IO.read',{handle:stream});raw+=chunk.data;if(chunk.eof)break}await cdp.send('IO.close',{handle:stream});
  const frames=await page.evaluate(()=>{window.collect=false;return window.samples.filter(f=>f.t>=window.actionAt)});
  const events=JSON.parse(raw).traceEvents;const totals={};for(const name of ['Layout','UpdateLayoutTree','Paint']){const e=events.filter(e=>e.name===name&&e.ph==='X');totals[name]={count:e.length,ms:e.reduce((sum,e)=>sum+(e.dur||0)/1000,0)}}
  if(cycle===0)writeFileSync(`${out}/${position}-${action}-trace.json`,raw);
  const gaps=frames.slice(1).map((f,i)=>f.t-frames[i].t);results.push({position,cycle,action,totals,maxFrame:Math.max(...gaps),over33:gaps.filter(g=>g>34).length,frames});
  writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify({...results.at(-1),frames:frames.length}));
 }
 }
 assert.equal(await page.evaluate(()=>window.providerQA.state.events.length),ledgerBefore,'Disclosure never changes scoring history');
 await page.waitForTimeout(1000);
 const scrollbar=await page.locator('.is-mobile-sheet .log').evaluate(async list=>{
  list.scrollTop=0;await new Promise(resolve=>setTimeout(resolve,1000));
  const paints=[];for(let i=1;i<=10;i++){list.scrollTop=i*10;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);paints.push(list.style.getPropertyValue('--quiet-scroll-paint'))}
  const shown=list.classList.contains('is-scrolling');await new Promise(resolve=>setTimeout(resolve,1000));
  return {paints,shown,hidden:!list.classList.contains('is-scrolling'),end:list.style.getPropertyValue('--quiet-scroll-paint')};
 });
 assert.equal(new Set(scrollbar.paints).size,1,'Continuous scroll requests one scrollbar repaint');
 assert.ok(scrollbar.shown&&scrollbar.hidden,'Scrollbar shows during scroll and hides at rest');
 assert.notEqual(scrollbar.end,scrollbar.paints[0],'Hiding still repaints the scrollbar');
 writeFileSync(`${out}/scrollbar.json`,JSON.stringify(scrollbar,null,2));
 await page.screenshot({path:`${out}/mobile.png`});
}finally{await browser.close()}
