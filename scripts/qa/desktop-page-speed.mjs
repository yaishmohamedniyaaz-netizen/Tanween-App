import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
try {
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const p=await context.newPage();
 await p.route('**/mushaf/**',async route=>{await new Promise(r=>setTimeout(r,80));await route.continue();});
 await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html');
 await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
 await p.waitForFunction(()=>document.querySelector('.page-fixed-mushaf')?.getAttribute('data-page')==='603');
 await p.waitForTimeout(350);
 await p.getByRole('button',{name:/Pages .*Jump to page/}).click();
 await p.getByRole('dialog',{name:'Jump to page'}).getByRole('spinbutton').fill('100');
 await p.getByRole('button',{name:'Go',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('.page-fixed-mushaf')?.getAttribute('data-page')==='100');
 const durations=[];
 for(const target of [102,104,106]) {
  await p.waitForTimeout(1200); // Same reading pause in baseline and candidate.
  const start=performance.now();
  await p.getByRole('button',{name:'next two pages',exact:true}).click();
  await p.waitForFunction(n=>document.querySelector('.page-fixed-mushaf')?.getAttribute('data-page')===String(n),target);
  durations.push(Math.round(performance.now()-start));
 }
 console.log(JSON.stringify({requestDelayMs:80,clickToVisibleMs:durations}));
 await context.close();
} finally {await browser.close();}
