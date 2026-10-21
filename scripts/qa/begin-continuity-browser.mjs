import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.SETUP_QA_URL||'http://127.0.0.1:5346';
const before=process.argv.includes('--before');
const out='outputs/begin-continuity-fix';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});const results=[];
const read=()=>{
 const shell=document.querySelector('.mushaf-shell'),composition=document.querySelector('.mushaf-scroll > .mushaf-composition');
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
 return{pages:[...composition.querySelectorAll('.page-fixed-mushaf')].map(e=>e.dataset.page),paper:box(composition.querySelector('.page-fixed-mushaf')),image:box(composition.querySelector('.page-fixed-mushaf > img')),scroll:{x:shell.scrollLeft,y:shell.scrollTop,document:scrollY},zoom:JSON.parse(localStorage.getItem('tahqeeq:devicePreferences.v5')).mushafZoom,active:window.providerQA.state.sessionActive};
};
try{for(const[width,height,zoom,recording]of before?[[1024,768,100,false],[390,844,100,false]]:[[1400,900,100,false],[1024,768,100,false],[768,1024,100,false],[390,844,100,false],[320,740,100,false],[1024,768,125,false],[390,844,125,false],[1024,768,100,true],[390,844,100,true]]){
 for(const reducedMotion of before?['no-preference']:['no-preference','reduce']){
  const key=`${width}-${zoom}-${recording?'recording':'plain'}-${reducedMotion}`;
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<901,isMobile:width<600,reducedMotion,permissions:['microphone']});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(zoom=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,mushafZoom:zoom}));},zoom);
  await p.goto(`${origin}/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10`,{waitUntil:'domcontentloaded'});
  await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await p.locator('.mushaf-composition .page-fixed-mushaf').first().waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(250);
  const openingPages=(await p.evaluate(read)).pages;
  await p.getByRole('button',{name:/^next (two pages|page)$/}).click();await p.waitForFunction(start=>{const page=document.querySelector('.mushaf-scroll > .mushaf-composition .page-fixed-mushaf');return page&&page.dataset.page!==start;},openingPages[0]);await p.waitForTimeout(300);
  const begin=p.getByRole('button',{name:'Begin judging',exact:true});await begin.scrollIntoViewIfNeeded();
  if(recording)await p.getByRole('checkbox',{name:'Record this practice recitation'}).check();
  // Exercise an actual panned viewport where zoom permits it.
  await p.locator('.mushaf-shell').first().evaluate(e=>{e.scrollTop=Math.min(67,e.scrollHeight-e.clientHeight);e.scrollLeft=Math.min(29,e.scrollWidth-e.clientWidth);});await p.waitForTimeout(200);
  const prepared=await p.evaluate(read);const evidence=width!==768&&zoom===100&&!recording&&reducedMotion==='no-preference';
  if(evidence)await p.screenshot({path:`${out}/${before?'before':'after'}-prepared-${width}.png`});
  await p.evaluate(readSource=>{window.continuityFrames=[];window.continuityDone=false;const read=(0,eval)(`(${readSource})`),start=performance.now();function frame(){window.continuityFrames.push({t:performance.now()-start,...read()});if(performance.now()-start<1100)requestAnimationFrame(frame);else window.continuityDone=true;}frame();},String(read));
  await begin.click();await p.waitForFunction(()=>window.providerQA.state.sessionActive);await p.waitForFunction(()=>window.continuityDone);const live=await p.evaluate(read),frames=await p.evaluate(()=>window.continuityFrames);
  if(evidence)await p.screenshot({path:`${out}/${before?'before':'after'}-live-${width}.png`});
  if(!before){
   for(const f of frames){assert.deepEqual(f.pages,prepared.pages,`${key}: Begin must not reopen the page`);for(const s of ['paper','image'])for(const k of ['x','y','w','h'])assert.ok(Math.abs(f[s][k]-prepared[s][k])<0.5,`${key}: ${s} ${k} moved`);}
   assert.deepEqual(live.scroll,prepared.scroll,`${key}: scroll remains fixed`);assert.equal(live.zoom,prepared.zoom);
   const session=await p.evaluate(()=>({id:window.providerQA.state.activeSessionId,events:window.providerQA.state.events,question:window.providerQA.state.activeQuestion}));
   assert.equal(session.events.filter(e=>e.type==='session_started').length,1,'Exactly one start event');
   await p.reload({waitUntil:'domcontentloaded'});await p.locator('.mushaf-composition .page-fixed-mushaf').first().waitFor();await p.waitForTimeout(350);
   assert.deepEqual((await p.evaluate(read)).pages,live.pages,'Refresh must retain the live page');assert.equal(await p.evaluate(()=>window.providerQA.state.activeSessionId),session.id);
   // Explicit return remains available and uses the original question opening.
   const back=p.getByRole('button',{name:/Return to selected question on page/});if(await back.count()){await back.click();await p.waitForFunction(start=>document.querySelector('.mushaf-scroll > .mushaf-composition .page-fixed-mushaf')?.dataset.page===start,openingPages[0]);}
  }
  assert.deepEqual(errors,[]);results.push({key,openingPages,prepared,live,frames,errors});await context.close();console.log(`${before?'CAPTURE':'PASS'} ${key}`);writeFileSync(`${out}/${before?'before':'after'}.json`,JSON.stringify(results,null,2));
 }
}}finally{await browser.close();writeFileSync(`${out}/${before?'before':'after'}.json`,JSON.stringify(results,null,2));}
