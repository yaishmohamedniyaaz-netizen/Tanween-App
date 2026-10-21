import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.QUESTION_REVEAL_URL||'http://127.0.0.1:5352/';
const out=process.env.QUESTION_REVEAL_OUT||'outputs/question-reveal-fix';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({ignoreDefaultArgs:['--hide-scrollbars']});const results=[];
const read=()=>{
 const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
 return {t:performance.now(),covered:!!document.querySelector('dialog[open]'),
  expected:Number(document.querySelector('.prepared-sidebar-question-summary-full')?.textContent?.match(/page (\d+)/)?.[1]),
  pages:[...document.querySelectorAll('.mushaf-scroll > .mushaf-composition .page-fixed-mushaf')].filter(e=>!e.closest('.mushaf-swipe-layer')).map(e=>({page:Number(e.dataset.page),box:box(e),image:box(e.querySelector('img'))})),
  returnVisible:!!document.querySelector('.question-return-bubble'),
  focus:document.activeElement?.textContent, pending:!!document.querySelector('.question-opening-status')};
};
try{for(const [width,height,motion,network] of process.argv.includes('--slow')?[[1191,668,'no-preference','slow']]:process.argv.includes('--recovery')?[[768,1024,'no-preference','failure']]:process.argv.includes('--pilot')?[[1191,668,'no-preference','normal']]:[[1191,668,'no-preference','normal'],[1400,900,'no-preference','normal'],[768,1024,'no-preference','normal'],[1024,768,'no-preference','normal'],[870,668,'no-preference','normal'],[390,844,'no-preference','normal'],[1191,668,'reduce','normal'],[768,1024,'reduce','normal'],[1191,668,'no-preference','slow'],[768,1024,'no-preference','failure']]){
 const key=`${width}-${motion}-${network}`,context=await browser.newContext({viewport:{width,height},hasTouch:width<=1024,reducedMotion:motion,serviceWorkers:network==='normal'?'allow':'block'});const page=await context.newPage();page.setDefaultTimeout(18000);const run={key,errors:[],reveals:[]};results.push(run);page.on('pageerror',e=>run.errors.push(e.message));
 let intercept=network==='failure',fail=network==='failure';
 if(network!=='normal')await page.route(/\/mushaf\/.*\/p\d+\.png$/,async route=>{if(intercept){if(fail)return route.abort();await new Promise(r=>setTimeout(r,900));}await route.continue()});
 const cdp=await context.newCDPSession(page);let film=null,last=0,index=0;
 cdp.on('Page.screencastFrame',async frame=>{try{await cdp.send('Page.screencastFrameAck',{sessionId:frame.sessionId})}catch{return}if(film&&Date.now()-last>35){last=Date.now();writeFileSync(`${out}/${key}-${film}-${String(index++).padStart(3,'0')}.jpg`,Buffer.from(frame.data,'base64'))}});
 const choose=async(number,label)=>{
  await page.evaluate(src=>{const read=(0,eval)(`(${src})`);window.revealFrames=[];window.revealStop=false;function tick(){window.revealFrames.push(read());if(!window.revealStop)requestAnimationFrame(tick)}tick()},String(read));
  film=label;last=0;index=0;await cdp.send('Page.startScreencast',{format:'jpeg',quality:85,everyNthFrame:1});
  await page.getByRole('button',{name:`Number ${number}`,exact:true}).click();
  if(fail){await page.getByText('The question page could not load.',{exact:true}).waitFor();assert.equal(await page.locator('dialog[open]').count(),1);await page.screenshot({path:`${out}/${key}-retry.png`});fail=false;await page.locator('.question-opening-status').getByRole('button',{name:'Retry',exact:true}).click()}
  await page.locator('dialog[open]').waitFor({state:'hidden'});await page.waitForTimeout(500);
  await page.evaluate(()=>window.revealStop=true);const frames=await page.evaluate(()=>window.revealFrames);await cdp.send('Page.stopScreencast');film=null;
  const exposed=frames.filter(f=>!f.covered&&f.expected);assert.ok(exposed.length,'Prepared page exposed');
  for(const f of exposed){assert.ok(f.pages.some(p=>p.page===f.expected),'Only the selected question is uncovered');assert.equal(f.returnVisible,false,'No false Return to question flash');}
  let drift=0;const first=exposed[0];for(const f of exposed)for(let i=0;i<first.pages.length;i++)for(const dim of ['w','h'])drift=Math.max(drift,Math.abs(first.pages[i].box[dim]-f.pages[i].box[dim]));assert.ok(drift<0.5,`No exposed Fit change: ${drift}px`);
  assert.equal(await page.getByRole('button',{name:'Begin judging',exact:true}).evaluate(e=>e===document.activeElement),true,'Focus returns to Begin');
  run.reveals.push({label,drift,frames});await page.screenshot({path:`${out}/${key}-${label}.png`});console.log(`PASS ${key} ${label} (${drift}px size drift)`);
 };
 try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/Open competition setup/}).click();await page.getByRole('button',{name:'Start competition',exact:true}).click();await page.getByRole('button',{name:'Reciter queue',exact:true}).click();await page.locator('.next-reciter-main').click();await page.evaluate(()=>document.fonts.ready);intercept=true;
 await choose(1,'first-question');intercept=false;
 await page.getByRole('button',{name:'Change question',exact:true}).click();await choose(2,'change-question');
 await page.getByRole('button',{name:'Begin judging',exact:true}).click();
 if(width>600){await page.getByRole('spinbutton',{name:'Adu / Raagu marks',exact:true}).focus();await page.keyboard.press('End');await page.getByRole('button',{name:'Finish recitation',exact:true}).click();await page.getByRole('button',{name:'Save and select next reciter',exact:true}).click();await page.locator('.next-reciter-main').click();await choose(3,'next-reciter');}
 assert.deepEqual(run.errors,[]);
 }catch(error){run.failure=String(error.stack||error);await page.screenshot({path:`${out}/${key}-failure.png`});console.log(`FAIL ${key}: ${error.message}`)}
 finally{writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));await context.close()}
}}finally{await browser.close()}
assert.ok(results.every(r=>!r.failure),'All question reveal cases pass');
