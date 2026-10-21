import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.env.MISTAKE_POSITION_OUT||'outputs/mistake-position-fix';mkdirSync(out,{recursive:true});
const origin=process.env.MISTAKE_POSITION_URL||'http://127.0.0.1:5352/';
const browser=await chromium.launch({ignoreDefaultArgs:['--hide-scrollbars']}),results=[];
const read=()=>{const row=document.querySelector('.log-row-wrap'),glyph=row?.querySelector('.log-glyph');const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};return {t:performance.now(),scroll:scrollY,row:rect(row),glyph:rect(glyph),adjust:rect(row?.querySelector('.log-adjust')),pages:[...document.querySelectorAll('.mushaf-scroll > .mushaf-composition .page-fixed-mushaf')].filter(e=>!e.closest('.mushaf-swipe-layer')).map(e=>e.dataset.page),calls:window.revealCalls?.slice()}};
try{for(const [width,height]of process.argv.includes('--pilot')?[[768,1024]]:[[1191,668],[1400,900],[1024,768],[768,1024],[870,668],[601,900]])for(const motion of ['no-preference','reduce']){
 const key=`${width}-${motion}`,context=await browser.newContext({viewport:{width,height},hasTouch:width<=1024,reducedMotion:motion}),page=await context.newPage();page.setDefaultTimeout(15000);const run={key,steps:[],errors:[]};results.push(run);page.on('pageerror',e=>run.errors.push(e.message));
 await page.addInitScript(()=>{window.revealCalls=[];const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(options){window.revealCalls.push({options,t:performance.now(),word:this.getAttribute('data-word-hit')});return original.call(this,options)}});
 const cdp=await context.newCDPSession(page);let film=null,index=0,last=0;
 cdp.on('Page.screencastFrame',async f=>{try{await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId})}catch{return}if(film&&Date.now()-last>40){last=Date.now();writeFileSync(`${out}/${key}-${film}-${String(index++).padStart(3,'0')}.jpg`,Buffer.from(f.data,'base64'))}});
 const step=async(name,action)=>{
  await page.evaluate(src=>{window.revealCalls=[];window.positionFrames=[];window.positionStop=false;const read=(0,eval)(`(${src})`);function f(){window.positionFrames.push(read());if(!window.positionStop)requestAnimationFrame(f)}f()},String(read));
  if(['open','collapse','locate'].includes(name)){film=name;last=0;index=0;await cdp.send('Page.startScreencast',{format:'jpeg',quality:85,everyNthFrame:1})}
  await action();await page.waitForTimeout(650);await page.evaluate(()=>window.positionStop=true);const frames=await page.evaluate(()=>window.positionFrames);if(film){await cdp.send('Page.stopScreencast');film=null}run.steps.push({name,frames});await page.screenshot({path:`${out}/${key}-${name}.png`});return frames;
 };
 try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/Open competition setup/}).click();await page.getByRole('button',{name:'Start competition',exact:true}).click();await page.getByRole('button',{name:'Reciter queue',exact:true}).click();await page.locator('.next-reciter-main').click();await page.getByRole('button',{name:'Number 1',exact:true}).click();await page.locator('dialog[open]').waitFor({state:'hidden'});await page.getByRole('button',{name:'Begin judging',exact:true}).click();
 const word=page.locator('.mushaf-scroll > .mushaf-composition [data-word-hit]').first();await word.scrollIntoViewIfNeeded();await page.waitForTimeout(180);await word.click();await page.locator('[data-unit-tid]').first().click();await page.locator('[data-pill="jali"]').click();
 const row=page.locator('.log-row').first();await row.scrollIntoViewIfNeeded();await page.waitForTimeout(200);await page.screenshot({path:`${out}/${key}-before.png`});
 const opening=await step('open',()=>width<=1024?row.locator('.log-chevron').tap():row.locator('.log-chevron').click());
 if(width<=900){assert.equal(opening.at(-1).calls.length,0,'Disclosure does not navigate the page');const scrolls=opening.map(f=>f.scroll);assert.ok(Math.max(...scrolls)-Math.min(...scrolls)<1,'Disclosure preserves document scroll');const ys=opening.map(f=>f.glyph.y);assert.ok(Math.max(...ys)-Math.min(...ys)<1,'Letter remains anchored');const end=opening.at(-1);assert.ok(end.adjust.y>=0&&end.adjust.y+end.adjust.h<=height,'Adjustment remains reachable');const locate=page.getByRole('button',{name:'Show word',exact:true});assert.ok((await locate.boundingBox()).height>=44)}else{assert.ok(opening.at(-1).calls.some(c=>c.word),'Desktop retains word reveal');assert.equal(await page.getByRole('button',{name:'Show word',exact:true}).count(),0)}
 await step('half-mark',()=>page.getByRole('button',{name:'decrease deduction',exact:true}).click());
 await step('collapse',()=>row.locator('.log-chevron').click());
 await step('reopen',()=>row.locator('.log-chevron').click());
 if(width<=900){const frames=await step('locate',()=>page.getByRole('button',{name:'Show word',exact:true}).click());assert.ok(frames.at(-1).scroll<frames[0].scroll,'Explicit navigation reveals the word');assert.equal(frames.at(-1).calls.at(-1).options.behavior,motion==='reduce'?'instant':'smooth');if(motion==='reduce'){const positions=[...new Set(frames.map(f=>f.scroll))];assert.ok(positions.length<=2,`Reduced motion has no animated intermediate positions: ${positions}`)}
 // Navigating away must not make opening the old mistake change pages.
 await page.getByRole('button',{name:'next page',exact:true}).click();await page.locator('.fixed-navigation-status').waitFor({state:'hidden'});await row.scrollIntoViewIfNeeded();await page.waitForTimeout(180);await row.locator('.log-chevron').click();await page.waitForTimeout(250);const away=await step('open-away',()=>row.locator('.log-chevron').click());assert.deepEqual(away.at(-1).pages,away[0].pages);assert.equal(away.at(-1).calls.length,0);await page.getByRole('button',{name:'Show word',exact:true}).click();await page.waitForTimeout(800);assert.notDeepEqual((await page.evaluate(read)).pages,away[0].pages,'Show word returns to its page');
 }else if(motion==='reduce')assert.ok(opening.at(-1).calls.every(c=>c.options.behavior==='instant'));
 assert.deepEqual(run.errors,[]);console.log(`PASS ${key}`);
 }catch(e){run.failure=String(e.stack||e);console.log(`FAIL ${key}: ${e.message}`);await page.screenshot({path:`${out}/${key}-failure.png`})}
 finally{film=null;writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));await context.close()}
}}finally{await browser.close()}
assert.ok(results.every(r=>!r.failure),'Mistake position cases pass');
