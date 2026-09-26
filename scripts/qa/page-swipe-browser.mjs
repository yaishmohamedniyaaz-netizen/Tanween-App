import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
const out='outputs/swipe-qa';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();
const results=[];

async function fixture(width,height,reducedMotion='no-preference',preferences={},begin=true) {
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion});
 const p=await context.newPage();const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript((preferences)=>{
  window.swipeTrace=[];
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']) document.addEventListener(type,e=>{
   window.swipeTrace.push({type:e.type,input:e.pointerType,id:e.pointerId,button:e.button,primary:e.isPrimary,x:e.clientX,y:e.clientY,target:e.target.className,
    phase:document.querySelector('.mushaf-shell')?.dataset.pageSwipeState,
    mode:document.querySelector('.mushaf-shell')?.dataset.pageSwipeMode,
    touchAction:e.target instanceof Element?getComputedStyle(e.target).touchAction:null,
    enabled:document.querySelector('.page-fixed-mushaf')?.dataset.judgingEnabled});
   if(window.swipeTrace.length>35)window.swipeTrace.shift();
  },true);
  localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');
  localStorage.setItem('tanween.phrases.help.v1','seen');
  localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,...preferences}));
 },preferences);
 await p.goto(`${base}/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10`);
 await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
 if(begin) await p.getByRole('button',{name:'Begin judging',exact:true}).click();
 await p.locator('.page-fixed-mushaf [data-wid]').first().waitFor();
 await p.locator('.page-nav-page').click();
 await p.getByRole('dialog',{name:'Jump to page',exact:true}).getByRole('spinbutton').fill('585');
 await p.getByRole('button',{name:'Go',exact:true}).click();
 await p.locator('.page-fixed-mushaf [data-wid="80.b.0"]').waitFor();
 await idle(p);
 return {context,p,errors,cdp:await context.newCDPSession(p)};
}
async function idle(p) {
 await p.waitForFunction(()=>{
  const host=document.querySelector('.mushaf-shell');
  return host?.dataset.pageSwipeState==='idle' && !document.querySelector('.fixed-navigation-status');
 });
 // Prepared reading has semantic regions but no enabled judging buttons.
 await p.locator('.page-fixed-mushaf [data-wid]').first().waitFor();
}
async function pages(p) {return p.locator('.mushaf-composition').getAttribute('data-visible-pages');}
async function jump(p,page) {
 await p.locator('.page-nav-page').click();
 await p.getByRole('dialog',{name:'Jump to page',exact:true}).getByRole('spinbutton').fill(String(page));
 await p.getByRole('button',{name:'Go',exact:true}).click();
}
async function state(p) {return p.evaluate(()=>({mistakes:window.providerQA.state.mistakes,events:window.providerQA.state.events}));}
async function paperStart(p,side='left') {
 return p.locator('.page-fixed-mushaf').first().evaluate((el,side)=>{
  const r=el.getBoundingClientRect();
  // Existing paper margin, not a Quran target or a control.
  return {x:side==='left'?r.left+2:r.right-2,y:Math.min(innerHeight-130,r.top+r.height*.4)};
 },side);
}
async function stroke(cdp,p,type,start,dx,dy=0,{cancel=false,backtrack=false}={}) {
 const move=async(x,y,phase)=>{
  if(type==='touch') await cdp.send('Input.dispatchTouchEvent',{type:phase==='down'?'touchStart':phase==='up'?'touchEnd':phase==='cancel'?'touchCancel':'touchMove',
   touchPoints:phase==='up'||phase==='cancel'?[]:[{x,y,id:1,radiusX:2,radiusY:2,force:1}]});
  else await cdp.send('Input.dispatchMouseEvent',{type:phase==='down'?'mousePressed':phase==='up'?'mouseReleased':'mouseMoved',
   x,y,button:phase==='move'?'none':'left',buttons:phase==='up'?0:1,clickCount:phase==='move'?0:1,pointerType:type});
 };
 await move(start.x,start.y,'down');
 for(let i=1;i<=8;i++) await move(start.x+dx*i/8,start.y+dy*i/8,'move');
 if(backtrack) await move(start.x+2,start.y+1,'move');
 const end=backtrack?{x:start.x+2,y:start.y+1}:{x:start.x+dx,y:start.y+dy};
 if(cancel && type!=='touch') throw Error('Native cancellation case uses touch');
 await move(end.x,end.y,cancel?'cancel':'up');
 await idle(p);
}

try {
 for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[1024,768],[1180,820],[1400,900]]) {
  const f=await fixture(width,height),{p,cdp}=f;
  const before=await state(p),initial=await pages(p),step=initial.includes(':')?2:1;
  for(const type of ['touch','pen']) {
   const anchor=Number((await pages(p)).split(':')[0]);
   const start=await paperStart(p);
   const time=Date.now();await stroke(cdp,p,type,start,130);
   assert.equal(Number((await pages(p)).split(':')[0]),anchor+step,`${width} ${type} forward`);
   const elapsed=Date.now()-time;
   await stroke(cdp,p,type,await paperStart(p,'right'),-130);
   assert.equal(await pages(p),initial,`${width} ${type} reverse`);
   assert.deepEqual(await state(p),before,'navigation must not write judging evidence');
   results.push({width,height,type,step,forwardAndBack:true,observedTestElapsedMs:elapsed});
  }
  await stroke(cdp,p,'mouse',await paperStart(p),130);
  assert.equal(await pages(p),initial,'mouse must not turn');
  await p.screenshot({path:`${out}/swipe-${width}.png`});
  assert.deepEqual(f.errors,[]);
  await f.context.close();
 }
 const f=await fixture(390,844),{p,cdp}=f;
 const initial=await pages(p),before=await state(p);
 for(const [dx,dy,extra] of [[5,0,{}],[30,0,{}],[0,65,{}],[65,65,{}],[120,0,{backtrack:true}],[120,0,{cancel:true}]]) {
  await stroke(cdp,p,'touch',await paperStart(p),dx,dy,extra);
  assert.equal(await pages(p),initial,`cancelled stroke ${JSON.stringify({dx,dy,extra})}`);
 }
 const start=await paperStart(p);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+25,y:start.y,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x+25,y:start.y,id:1},{x:start.x+100,y:start.y+60,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await idle(p);assert.equal(await pages(p),initial,'second contact cancels');
 assert.deepEqual(await state(p),before);
 // Word starts remain marking, even if a long horizontal movement follows.
 const word=await p.locator('[data-word-hit="80.b.0"]').boundingBox();
 await stroke(cdp,p,'pen',{x:word.x+word.width/2,y:word.y+word.height/2},95);
 assert.equal(await pages(p),initial);
 assert.deepEqual(await state(p),before);
 // Existing deliberate mark, navigation away/back, correction, persistence and undo.
 await p.locator('[data-word-hit="80.b.0"]').click();
 await p.locator('[data-unit-tid]').first().click();await p.locator('[data-pill="jali"]').click();
 await p.waitForFunction(()=>window.providerQA.state.mistakes.length===1);
 const marked=await state(p);
 await stroke(cdp,p,'touch',await paperStart(p),130);
 await stroke(cdp,p,'pen',await paperStart(p,'right'),-130);
 assert.deepEqual(await state(p),marked);
 await p.locator('[data-word-hit="80.b.0"]').click();
 await p.locator('[data-unit-tid]').first().click();await p.locator('[data-pill="khafi"]').click();
 await p.waitForFunction(()=>window.providerQA.state.mistakes[0]?.category==='khafi');
 await p.waitForFunction(()=>window.providerQA.status.phase==='saved');
 await p.reload();await idle(p);
 assert.equal((await state(p)).mistakes[0]?.category,'khafi');
 assert.deepEqual(f.errors,[]);results.push({cancellation:true,wordOwnership:true,markCorrectionReload:true});
 await f.context.close();
 const reduced=await fixture(1024,768,'reduce');
 await stroke(reduced.cdp,reduced.p,'pen',await paperStart(reduced.p),130);
 assert.equal(await pages(reduced.p),'587:588');
 assert.equal(await reduced.p.locator('.mushaf-composition').evaluate(e=>e.getAnimations().length),0);
 await reduced.context.close();results.push({reducedMotion:true});

 // Boundaries and dark-mode controls, on the opposite rail side.
 const dark=await fixture(1180,820,'no-preference',{theme:'dark',judgeRailSide:'right',mushafLayout:'full'});
 await jump(dark.p,604);await idle(dark.p);
 await stroke(dark.cdp,dark.p,'pen',await paperStart(dark.p),130);
 assert.equal(await pages(dark.p),'604');
 await jump(dark.p,1);await idle(dark.p);
 await stroke(dark.cdp,dark.p,'touch',await paperStart(dark.p,'right'),-130);
 assert.equal(await pages(dark.p),'1');
 await dark.p.screenshot({path:`${out}/dark-boundary.png`});
 await dark.context.close();results.push({boundaries:true,darkRightRailSingle:true});

 // Native panning must remain possible before pointerdown, not only in JS.
 const zoom=await fixture(1024,768,'no-preference',{mushafZoom:150});
 await zoom.p.waitForFunction(()=>document.querySelector('.mushaf-shell')?.dataset.pageSwipeMode==='pan');
 const zoomBefore=await pages(zoom.p);
 const panPolicy=await zoom.p.locator('.page-fixed-mushaf').first().evaluate(e=>getComputedStyle(e).touchAction);
 assert.ok(panPolicy.includes('pan-x') || panPolicy.includes('manipulation'));
 const zrect=await zoom.p.locator('.mushaf-shell').boundingBox();
 const scrollBefore=await zoom.p.locator('.mushaf-shell').evaluate(e=>e.scrollLeft);
 await stroke(zoom.cdp,zoom.p,'touch',{x:zrect.x+zrect.width*.55,y:zrect.y+12},-100);
 assert.equal(await pages(zoom.p),zoomBefore);
 assert.ok(Math.abs(await zoom.p.locator('.mushaf-shell').evaluate(e=>e.scrollLeft)-scrollBefore)>10,'native horizontal pan moves enlarged page');
 await zoom.context.close();results.push({zoomPanPriority:true});

 // Failed navigation holds coherent artwork and has an explicit escape route.
 const failure=await fixture(768,1024),fp=failure.p;
 await fp.route('**/mushaf/**',route=>route.abort());
 await jump(fp,300);
 await fp.getByRole('button',{name:'Retry',exact:true}).waitFor();
 assert.equal(await pages(fp),'585');
 assert.equal(await fp.locator('.page-fixed-mushaf').getAttribute('data-judging-enabled'),'false');
 await fp.getByRole('button',{name:'Stay on this page',exact:true}).click();await idle(fp);
 assert.equal(await fp.locator('.page-fixed-mushaf').getAttribute('data-judging-enabled'),'true');
 await fp.unroute('**/mushaf/**');
 await jump(fp,300);await idle(fp);assert.equal(await pages(fp),'300');
 await failure.context.close();results.push({failureAndReturnRecovery:true});

 // Mixed pen/touch and an unexpected capture loss must never create a turn.
 const mixed=await fixture(390,844),mp=mixed.p,mc=mixed.cdp,ms=await paperStart(mp);
 await mc.send('Input.dispatchMouseEvent',{type:'mousePressed',x:ms.x,y:ms.y,button:'left',buttons:1,pointerType:'pen'});
 await mc.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:ms.x+30,y:ms.y,buttons:1,pointerType:'pen'});
 await mc.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:ms.y+55,id:1}]});
 await mc.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:ms.x+130,y:ms.y,button:'left',buttons:0,pointerType:'pen'});
 await mc.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(mp);
 assert.equal(await pages(mp),'585');assert.equal((await state(mp)).mistakes.length,0);
 await mp.evaluate(()=>document.querySelector('.mushaf-shell').addEventListener('gotpointercapture',e=>{
  e.currentTarget.releasePointerCapture(e.pointerId);
 },{once:true}));
 await stroke(mc,mp,'pen',await paperStart(mp),130);assert.equal(await pages(mp),'585');
 await mixed.context.close();results.push({mixedContacts:true,unexpectedCaptureLoss:true});

 // A breakpoint change during contact cancels intent; the next gesture works.
 const rotation=await fixture(768,1024),rp=rotation.p,rc=rotation.cdp,rs=await paperStart(rp);
 await rc.send('Input.dispatchMouseEvent',{type:'mousePressed',x:rs.x,y:rs.y,button:'left',buttons:1,pointerType:'pen'});
 await rc.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rs.x+30,y:rs.y,buttons:1,pointerType:'pen'});
 await rp.setViewportSize({width:1024,height:768});
 await rc.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rs.x+130,y:rs.y,button:'left',buttons:0,pointerType:'pen'});
 await idle(rp);assert.equal(await pages(rp),'585:586');
 const rotationBefore=await state(rp);
 for(let i=0;i<6;i++) {
  await stroke(rc,rp,i%2?'pen':'touch',await paperStart(rp),130);
  assert.equal(await pages(rp),'587:588',`forward repeat ${i}`);
  await stroke(rc,rp,i%2?'touch':'pen',await paperStart(rp,'right'),-130);
  assert.equal(await pages(rp),'585:586');
  assert.equal(await rp.locator('.page-fixed-mushaf').count(),2);
  assert.equal(await rp.locator('.mushaf-composition').evaluate(e=>e.getAnimations().length),0);
 }
 assert.deepEqual(await state(rp),rotationBefore);assert.deepEqual(rotation.errors,[]);
 await rotation.context.close();results.push({rotationCancellation:true,repeatedTurns:12});

 // Prepared recital navigation shares the interaction without starting judging.
 const prepared=await fixture(390,844,'no-preference',{},false);
 await stroke(prepared.cdp,prepared.p,'touch',await paperStart(prepared.p),130);
 assert.equal(await pages(prepared.p),'586');
 await stroke(prepared.cdp,prepared.p,'pen',await paperStart(prepared.p,'right'),-130);
 assert.equal(await pages(prepared.p),'585');
 assert.equal(await prepared.p.getByRole('button',{name:'Begin judging',exact:true}).count(),1);
 assert.equal((await state(prepared.p)).mistakes.length,0);assert.deepEqual(prepared.errors,[]);
 await prepared.context.close();results.push({preparedNavigation:true});
 writeFileSync(`${out}/browser-results.json`,JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
} catch(error) {
 for(const context of browser.contexts()) for(const p of context.pages()) {
  await p.screenshot({path:`${out}/failure.png`}).catch(()=>{});
  console.error(await p.locator('.mushaf-shell').evaluate(e=>({state:e.dataset,rect:{w:e.clientWidth,h:e.clientHeight},scroll:[e.scrollWidth,e.scrollHeight]})).catch(()=>null));
  console.error(await p.evaluate(()=>window.swipeTrace).catch(()=>null));
 }
 throw error;
} finally {await browser.close();}
