import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
try {
 for(const width of [320,390,430,740,900,1024,1400]) {
  const c=await browser.newContext({viewport:{width,height:844}});const p=await c.newPage();
  for(const status of ['idle','recording','paused','interrupted','error']) {
   await p.goto(`http://127.0.0.1:5320/scripts/qa/phrase-header-states.html?phraseHeader=1&status=${status}`);
   await p.locator('.phrase-header-trigger').waitFor();
   const boxes=await p.locator('.app-header').evaluate(header=>{
    const r=header.getBoundingClientRect();
    return {header:{x:r.x,y:r.y,w:r.width,h:r.height},overflow:document.documentElement.scrollWidth>innerWidth,
     children:[...header.children].filter(e=>getComputedStyle(e).position!=='absolute' && e.getBoundingClientRect().width>0)
      .map(e=>{const b=e.getBoundingClientRect();return {name:e.className,x:b.x,y:b.y,w:b.width,h:b.height};})};
   });
   assert(!boxes.overflow,JSON.stringify({width,status,boxes}));
   for(const b of boxes.children) assert(b.y>=boxes.header.y && b.y+b.h<=boxes.header.y+boxes.header.h+1,`Single header row ${width} ${status}`);
   const phrase=await p.locator('.phrase-header-trigger').boundingBox();assert(phrase.height>=44);
   if(status!=='idle') assert(await p.locator('.recording-header-control').isVisible());
   if(width<600) assert((await p.locator('.header-context').boundingBox()).width>=96,'Reciter retains usable width');
   if(status==='error') await p.screenshot({path:`outputs/phrase-header/error-long-name-${width}.png`});
   if(width===320 && status==='recording') {
    await p.goto(`http://127.0.0.1:5320/scripts/qa/phrase-header-states.html?phraseHeader=1&status=recording&return=1`);
    await p.locator('.mobile-question-return').waitFor();
    await p.screenshot({path:'outputs/phrase-header/return-long-name-320.png'});
   }
  }
  console.log(`PASS header states ${width}`);await c.close();
 }
}finally{await browser.close();}
