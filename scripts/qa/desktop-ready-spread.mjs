import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
const url='http://127.0.0.1:5296/scripts/qa/mobile-paper.html';
async function jump(p,n){await p.getByRole('button',{name:/Pages .*Jump to page/}).click();await p.getByRole('dialog',{name:'Jump to page'}).getByRole('spinbutton').fill(String(n));await p.getByRole('button',{name:'Go',exact:true}).click();}
async function ready(p,n){await p.waitForFunction(n=>[...document.querySelectorAll('.page-fixed-mushaf')].map(e=>+e.dataset.page).join(':')===`${n}:${n+1}`,n);await p.waitForTimeout(350);}
try {
 for (const [width,height] of [[1024,768],[1280,800],[1400,900]]) {
  const shots=[];
  for(const legacy of [true,false]){
   const c=await browser.newContext({viewport:{width,height}});const p=await c.newPage();
   await p.goto(url+(legacy?'?desktopReadyPages=0':''));
   await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await ready(p,603);
   shots.push(await p.locator('.workspace').screenshot({path:`outputs/desktop-spread-${width}-${legacy?'before':'after'}.png`}));
   await c.close();
  }
  assert.ok(shots[0].equals(shots[1]),`settled workspace differs at ${width}`);
  console.log(width,'settled workspace screenshot identical');
 }
 const c=await browser.newContext({viewport:{width:1280,height:800}});const p=await c.newPage();
 await c.addInitScript(()=>{const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
   window.qaAssets={live:new Set(),peak:0};URL.createObjectURL=b=>{const u=create(b);window.qaAssets.live.add(u);window.qaAssets.peak=Math.max(window.qaAssets.peak,window.qaAssets.live.size);return u;};
   URL.revokeObjectURL=u=>{window.qaAssets.live.delete(u);return revoke(u);};});
 const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(url);await p.getByRole('button',{name:'Load prepared mobile sample'}).click();await ready(p,603);
 await p.getByRole('button',{name:'Begin judging',exact:true}).click();await p.waitForTimeout(350);
 await p.evaluate(()=>{window.pageFrames=[];window.qaObserver=new MutationObserver(()=>window.pageFrames.push({
   loading:!!document.querySelector('.fixed-mushaf-loading,.mushaf-loading'),
   pages:[...document.querySelectorAll('.page-fixed-mushaf')].map(e=>+e.dataset.page)
 }));window.qaObserver.observe(document.querySelector('.workspace'),{subtree:true,childList:true,attributes:true});});
 await p.route('**/mushaf/**',async route=>{await new Promise(resolve=>setTimeout(resolve,120));await route.continue();});
 await jump(p,100);
 assert.equal(await p.locator('.page-fixed-mushaf').first().getAttribute('data-page'),'603');
 assert.equal(await p.locator('.page-fixed-mushaf').first().getAttribute('data-judging-enabled'),'false');
 assert.match(await p.locator('.page-nav-page').getAttribute('aria-label'),/603.*604/);
 await ready(p,100);
 await jump(p,200);await jump(p,300);await ready(p,300);
 const frames=await p.evaluate(()=>window.pageFrames);
 assert.ok(frames.every(f=>!f.loading && f.pages.length===2 && f.pages[1]===f.pages[0]+1));
 await p.unroute('**/mushaf/**');
 await p.route('**/mushaf/**',route=>route.abort());
 await jump(p,400);await p.getByRole('button',{name:'Retry',exact:true}).waitFor();
 assert.equal(await p.locator('.page-fixed-mushaf').first().getAttribute('data-page'),'300');
 await p.unroute('**/mushaf/**');await p.getByRole('button',{name:'Retry',exact:true}).click();await ready(p,400);
 await p.locator('[data-word-hit]').first().click();await p.locator('[data-unit-tid]').first().click();await p.locator('[data-pill="jali"]').click();
 const marked=await p.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')));
 assert.equal(marked.mistakes.at(-1).page,400);
 const resources=await p.evaluate(()=>({current:window.qaAssets.live.size,peak:window.qaAssets.peak}));
 assert.ok(resources.current>=2&&resources.current<=6);assert.ok(resources.peak<=6,JSON.stringify(resources));
 assert.deepEqual(errors,[]);
 console.log('Slow navigation, rapid latest destination, atomic spread, failed load retention and Retry passed');
 await c.close();
} finally {await browser.close();}
