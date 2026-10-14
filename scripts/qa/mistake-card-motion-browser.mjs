import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='outputs/card-motion-preview';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results=[];
async function record(page,row,action){
 await row.evaluate(el=>{
  window.cardMotion=[];window.cardMotionDone=false;const started=performance.now();
  const read=()=>{
   const box=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
   const tile=el.querySelector('.log-tile'),glyph=el.querySelector('.log-glyph');
   window.cardMotion.push({t:performance.now()-started,tile:box(tile),glyph:box(glyph),font:getComputedStyle(glyph).fontSize});
   if(performance.now()-started<500)requestAnimationFrame(read);else window.cardMotionDone=true;
  };read();
 });
 await action();await page.waitForFunction(()=>window.cardMotionDone);
 const frames=await page.evaluate(()=>window.cardMotion);
 const ranges=Object.fromEntries(['tile','glyph'].map(kind=>[kind,Object.fromEntries(['x','y','w','h'].map(k=>[k,Math.max(...frames.map(f=>f[kind][k]))-Math.min(...frames.map(f=>f[kind][k]))]))]));
 assert.ok(Object.values(ranges).every(r=>Object.values(r).every(v=>v<.05)),JSON.stringify(ranges));
 assert.ok(frames.every(f=>f.font==='27px'));
 return{frames:frames.length,ranges};
}
try{
 for(const [width,height,reduced] of [[1191,668,false],[1024,768,false],[390,844,false],[320,740,false],[1191,668,true],[390,844,true]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,reducedMotion:reduced?'reduce':'no-preference',deviceScaleFactor:2});
  await page.addInitScript(()=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,slimScorePanel:true,judgeRailSide:'left'}));});
  await page.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10');
  await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
  await page.getByRole('button',{name:'Begin judging',exact:true}).click();
  await page.waitForFunction(()=>window.providerQA?.state.sessionActive);
  await page.evaluate(()=>window.providerQA.addFindings(8));
  await page.evaluate(()=>document.fonts.ready);
  if(width<600)await page.locator('.mobile-mistakes-action').click();
  await page.waitForTimeout(250);
  const button=page.locator('.log-row:visible').first();const row=page.locator('.log-row-wrap:visible').first();
  assert.ok(await button.evaluate(el=>{
    const summary=el.querySelector('.log-summary').getBoundingClientRect();
    const chevron=el.querySelector('.log-chevron').getBoundingClientRect();
    const r=el.getBoundingClientRect();
    return summary.width>80 && chevron.right>=r.right-13 && summary.right<=chevron.left;
  }), 'Collapsed summary and chevron keep their full header columns');
  const eventsBefore=await page.evaluate(()=>window.providerQA.state.events.length);
  const open=await record(page,row,()=>button.evaluate(el=>el.click()));
  await page.screenshot({path:`${out}/expanded-${width}${reduced?'-reduced':''}.png`});
  if(reduced)assert.equal(await row.locator('.log-expand').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  const close=await record(page,row,()=>button.evaluate(el=>el.click()));
  const rapid=await record(page,row,async()=>{for(let i=0;i<4;i++){await button.evaluate(el=>el.click());await page.waitForTimeout(40);}});
  assert.equal(await button.getAttribute('aria-expanded'),'false');
  assert.equal(await row.locator('.log-expand').getAttribute('aria-hidden'),'true');
  assert.equal(await page.evaluate(()=>window.providerQA.state.events.length),eventsBefore,'Disclosure must not change scoring history');
  results.push({width,reduced,open,close,rapid});
  if(!reduced && [1191,390].includes(width)){
   const kind=width>600?'desktop':'mobile';const folder=`${out}/${kind}-frames`;mkdirSync(folder,{recursive:true});
   const panel=page.locator(width>600?'.sidebar':'.mistake-panel.is-mobile-sheet');
   const clip=await panel.boundingBox();const frames=[];
   async function capture(duration=50){const file=`${folder}/${String(frames.length).padStart(3,'0')}.png`;await page.screenshot({path:file,clip});frames.push({file,duration});}
   await capture(600);
   for(const state of ['open','closed']){
    await button.evaluate(el=>el.click());
    const start=Date.now();
    do{await capture(50);await page.waitForTimeout(25);}while(Date.now()-start<280);
    await page.waitForTimeout(100);await capture(700);
    if(state==='open')await panel.screenshot({path:`${out}/${kind}.png`});
   }
   writeFileSync(`${out}/${kind}-frames.json`,JSON.stringify(frames));
  }
  await page.close();
 }
 writeFileSync(`${out}/motion-results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
