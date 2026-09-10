import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();const results=[],errors=[];
const out='outputs/mobile-calibration-safety';mkdirSync(out,{recursive:true});
async function settle(p){await p.locator('.page-fixed-mushaf').first().waitFor();await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);}
async function fixture(w,h){const c=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,reducedMotion:'reduce'});const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?mobileCalibration=1&simulateSafeAreas=1');await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await settle(p);return {c,p};}
try {
  for(const [w,h] of [[390,844],[430,932],[320,568]]) {
    const {c,p}=await fixture(w,h);
    // Permission failure is simulated on this disposable origin only.
    await p.evaluate(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>Promise.reject(new DOMException('QA permission denied','NotAllowedError'))});});
    await p.getByRole('checkbox',{name:'Record this practice recitation'}).check();
    await p.getByRole('button',{name:'Begin judging',exact:true}).click();await p.waitForTimeout(400);
    await p.screenshot({path:`${out}/${w}-recording-denied.png`});
    results.push({test:'recording-denied',size:[w,h],text:await p.locator('.prepared-sidebar').innerText(),buttons:await p.locator('.prepared-sidebar button').evaluateAll(es=>es.map(e=>{let r=e.getBoundingClientRect();return {text:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height,reachable:r.bottom<=innerHeight&&r.right<=innerWidth}}))});
    const fallback=p.getByRole('button',{name:/Begin without recording/i});
    if(await fallback.count())await fallback.click();else {await p.getByRole('checkbox',{name:'Record this practice recitation'}).uncheck();await p.getByRole('button',{name:'Begin judging',exact:true}).click();}
    await settle(p);
    await p.getByRole('button',{name:'Finish',exact:true}).click();
    const dialog=p.getByRole('dialog').first();
    results.push({test:'finish-initial',size:[w,h],text:await dialog.innerText(),box:await dialog.boundingBox()});
    const save=dialog.getByRole('button',{name:/Save.*next|Save.*select/i});
    if(await save.count()){await save.click();results.push({test:'finish-missing-impression',size:[w,h],stillActive:await p.locator('.app[data-mobile-judge-deck="true"]').count()===1,dialogVisible:await dialog.isVisible(),text:await dialog.innerText()});}
    await p.keyboard.press('Escape');
    if(await dialog.isVisible()){const close=dialog.getByRole('button',{name:/cancel|close|back/i}).first();if(await close.count())await close.click();}
    // Preserve stored state before and after merely changing the layout flag.
    const stateBefore=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.includes('lastPage'))));
    await p.goto('http://127.0.0.1:5296/?mobileCalibration=0');await settle(p);
    const stateAfter=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.includes('lastPage'))));
    results.push({test:'flag-state-preservation',size:[w,h],equal:JSON.stringify(stateBefore)===JSON.stringify(stateAfter),changedKeys:Object.keys(stateAfter).filter(k=>stateBefore[k]!==stateAfter[k])});
    await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?mobileCalibration=1&simulateSafeAreas=1');await settle(p);
    const targets=await p.locator('.page-nav button,.mobile-dock-actions button').evaluateAll(es=>es.map(e=>{let r=e.getBoundingClientRect();return {name:e.getAttribute('aria-label')||e.textContent,w:r.width,h:r.height}}));results.push({test:'touch-targets',size:[w,h],targets});
    // Forced text-only enlargement, NOT a claim of native iOS Dynamic Type.
    await p.addStyleTag({content:'.mobile-criterion-label{font-size:24px!important}.mobile-criterion-value{font-size:28px!important}.mobile-dock-actions button{font-size:28px!important}.mobile-score-action strong{font-size:40px!important}.mobile-score-action span{font-size:22px!important}'});
    const overflows=await p.locator('.mobile-criterion-chip,.mobile-dock-actions button').evaluateAll(es=>es.map(e=>({text:e.textContent,clipped:e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1,w:e.clientWidth,h:e.clientHeight,sw:e.scrollWidth,sh:e.scrollHeight})));
    results.push({test:'forced-200-percent-text',size:[w,h],overflows});await p.screenshot({path:`${out}/${w}-text200.png`});
    await c.close();
  }
  for(const [w,h] of [[1024,768],[1280,800],[1400,900],[844,390]]) {
    const {c,p}=await fixture(w,h);
    const shots=[];
    for(const flag of ['0','0','1']) {await p.goto(`http://127.0.0.1:5296/?mobileCalibration=${flag}`);await settle(p);shots.push(await p.screenshot({path:`${out}/${w}-ready-${shots.length}-${flag}.png`,animations:'disabled'}));}
    results.push({test:'paired-ready-diff',size:[w,h],baselineRepeatIdentical:shots[0].equals(shots[1]),flagIdentical:shots[1].equals(shots[2])});
    await c.close();
  }
} catch(e){results.push({test:'runner-error',error:String(e)});process.exitCode=1;}
finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));}
