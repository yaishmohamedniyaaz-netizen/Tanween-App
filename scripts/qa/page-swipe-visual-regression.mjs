import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
const out='outputs/swipe-qa';mkdirSync(out,{recursive:true});
const results=[];
try {
 for(const [width,height,theme] of [[390,844,'light'],[768,1024,'light'],[1024,768,'light'],[390,844,'dark'],[1024,768,'dark']]) {
  const images=[];
  for(const port of [5296,5320]) {
   const context=await browser.newContext({viewport:{width,height}}),p=await context.newPage();
   await p.addInitScript(theme=>{
    localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');
    localStorage.setItem('tanween.phrases.help.v1','seen');
    localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,theme}));
   },theme);
   await p.goto(`http://127.0.0.1:${port}/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10`);
   await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
   await p.getByRole('button',{name:'Begin judging',exact:true}).click();
   await p.locator('[data-word-hit]').first().waitFor();
   await p.evaluate(()=>document.fonts.ready);
   await p.locator('.page-nav-page').click();
   await p.getByRole('dialog',{name:'Jump to page'}).getByRole('spinbutton').fill('585');
   await p.getByRole('button',{name:'Go',exact:true}).click();
   await p.locator('[data-word-hit="80.b.0"]').waitFor();
   await p.waitForFunction(()=>!document.querySelector('.fixed-navigation-status'));
   // The fixture has no animations left after this bounded settling interval.
   await p.waitForTimeout(300);
   images.push(await p.screenshot({path:`${out}/compare-${width}-${theme}-${port===5296?'baseline':'swipe'}.png`}));
   await context.close();
  }
  const identical=images[0].equals(images[1]);
  results.push({width,height,theme,identical});
  console.log(JSON.stringify(results.at(-1)));
  assert.ok(identical,`settled ${width} ${theme} screenshot must match release baseline`);
 }
 writeFileSync(`${out}/visual-regression.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
