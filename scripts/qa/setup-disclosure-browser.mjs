import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.SETUP_QA_URL||'http://127.0.0.1:5346';
const out='outputs/closing-card-fix';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const[width,height]of[[1400,900],[1024,768],[768,1024],[390,844],[320,740]])for(const reduced of[false,true]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:width<700,isMobile:width<700,reducedMotion:reduced?'reduce':'no-preference'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin,{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:/Open competition setup/}).click();await p.getByRole('button',{name:/^Categories and portions,/}).click();await p.waitForTimeout(300);
 const transitions=[];
 for(const name of['Participants','Marks and criteria','Judging panel','Question rules','Competition details']){
  const current=p.locator('.setup-checklist-item.is-active .setup-checklist-trigger');const id=await current.getAttribute('aria-controls');const target=p.getByRole('button',{name:new RegExp('^'+name+',')});await target.scrollIntoViewIfNeeded();await p.waitForTimeout(60);
  await p.evaluate(id=>{window.closeProbe=[];window.closeProbeDone=false;const start=performance.now();function frame(){const e=document.getElementById(id);window.closeProbe.push({height:e?.getBoundingClientRect().height??0,inert:e?.inert??true});if(performance.now()-start<380)requestAnimationFrame(frame);else window.closeProbeDone=true;}frame();},id);
  if(width<700)await target.tap();else await target.click();await p.waitForFunction(()=>window.closeProbeDone);
  const samples=await p.evaluate(()=>window.closeProbe);assert.equal(samples.at(-1).height,0,'The closing panel finishes removed or collapsed');
  for(let i=1;i<samples.length;i++)assert.ok(samples[i].height<=samples[i-1].height+1,`Closing ${id} must never rebound: ${samples[i-1].height} -> ${samples[i].height}`);
  assert.equal(await p.locator(`#${id}`).count(),0);assert.equal(await target.getAttribute('aria-expanded'),'true');transitions.push({from:id,to:name,samples:samples.length});
 }
 for(let i=0;i<10;i++){await p.getByRole('button',{name:new RegExp('^'+(i%2?'Competition details':'Categories and portions')+',')}).evaluate(e=>e.click());await p.waitForTimeout(25);}
 await p.waitForTimeout(300);assert.equal(await p.locator('.setup-checklist-trigger[aria-expanded="true"]').count(),1);assert.equal(await p.locator('.setup-checklist-panel-shell[aria-hidden="true"]').count(),0);
 const details=p.getByRole('button',{name:/^Competition details,/});await details.evaluate(e=>e.click());await p.waitForTimeout(reduced?0:35);await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);assert.equal(await p.locator('#setup-task-panel-details').count(),0,'Live reduced-motion change completes closing cleanly');
 await details.evaluate(e=>e.click());await p.waitForTimeout(100);assert.equal(await p.locator('#setup-task-panel-details').evaluate(e=>({inert:e.inert,height:e.getBoundingClientRect().height})).then(v=>!v.inert&&v.height>0),true,'Panel reopens after cancellation');
 const fit=await p.locator('#setup-task-panel-details').evaluate(e=>{const r=e.getBoundingClientRect();return[...e.querySelectorAll('.setup-work-actions button')].every(b=>{const box=b.getBoundingClientRect();return box.left>=r.left&&box.right<=r.right&&box.bottom<=r.bottom-23;});});assert.ok(fit,'Details actions remain inside the card');assert.deepEqual(errors,[]);
 results.push({width,reduced,transitions,rapidToggles:true,liveReducedMotion:true,reopen:true,detailsActionsFit:true});await p.close();console.log(`PASS ${width}px ${reduced?'reduced':'normal'}`);
}}finally{await browser.close();writeFileSync(`${out}/browser-results.json`,JSON.stringify(results,null,2));}
