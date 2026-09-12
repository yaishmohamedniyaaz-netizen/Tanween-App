import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
try {
  for(const width of [1280,390]) {
    const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
    const p=await context.newPage();
    await p.goto('http://127.0.0.1:5296/scripts/qa/mobile-paper.html?qaSurah=81&qaAyah=3&qaLines=3');
    await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
    await p.getByRole('button',{name:'Begin judging',exact:true}).click();
    await p.locator('.page-fixed-mushaf').first().waitFor();
    await p.getByRole('button',{name:'More actions and view controls'}).click();
    await p.getByRole('radio',{name:'Fade',exact:true}).check();
    await p.getByRole('button',{name:'More actions and view controls'}).click();
    for(const dark of [false,true]) {
      if(dark) await p.getByRole('button',{name:'Switch to dark mode'}).click();
      await p.waitForTimeout(350);
      const coverage=await p.locator('.page-fixed-mushaf').evaluateAll(pages=>pages.flatMap(page=>{
        const rows=new Map();
        for(const w of page.querySelectorAll('.fixed-word')) {
          const row=rows.get(w.dataset.fixedLine)||[];row.push(w);rows.set(w.dataset.fixedLine,row);
        }
        return [...rows.values()].flatMap(row=>[row[0],row.at(-1)].filter(w=>w.classList.contains('question-context-line')||w.querySelector('.question-context-word')).map(w=>{
          const pseudo=getComputedStyle(w,'::before');
          const isRight=w===row[0];
          return {page:page.dataset.page,edge:isRight?'right':'left',extension:parseFloat(isRight?pseudo.right:pseudo.left),opacity:pseudo.opacity};
        }));
      }));
      assert.ok(coverage.length>0);
      assert.ok(coverage.every(c=>c.extension<0 && c.opacity==='0.65'));
      await p.screenshot({path:`outputs/fade-runtime-${width}-${dark?'dark':'light'}.png`});
      console.log(width,dark?'dark':'light','outer context masks extended',coverage.length);
    }
    await context.close();
  }
} finally {await browser.close();}
