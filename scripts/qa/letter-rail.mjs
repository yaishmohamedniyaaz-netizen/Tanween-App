import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch();
try {
  for (const [width, height] of [[390,844],[430,932],[1024,768],[1280,800],[1400,900]]) {
    const context = await browser.newContext({viewport:{width,height}});
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', error=>errors.push(String(error)));
    await page.goto(`${process.env.QA_BASE_URL || 'http://127.0.0.1:5296'}/scripts/qa/mobile-paper.html?qaSurah=83&qaAyah=1&qaLines=15`);
    await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
    await page.getByRole('button',{name:'Begin judging',exact:true}).click();
    await page.locator('[data-word-hit]').first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const words=await page.locator('[data-word-hit]').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('aria-label')).filter(Boolean));
    const longest=[...new Set(words)].sort((a,b)=>b.length-a.length).slice(0,5);
    if(width===390){
      const oldStyle=await page.addStyleTag({content:'.drag-menu.pinned .unit-picker-row { flex-wrap:wrap; justify-content:center; overflow:visible; touch-action:manipulation; }'});
      await page.getByRole('button',{name:longest[0],exact:true}).first().click();
      await page.waitForTimeout(180);
      const rows=await page.locator('[data-unit-tid]').evaluateAll(nodes=>new Set(nodes.map(e=>Math.round(e.getBoundingClientRect().y))).size);
      assert.ok(rows>1,'old CSS must reproduce wrapping');
      await page.screenshot({path:'outputs/letter-rail-390-before.png'});
      await page.keyboard.press('Escape');
      await oldStyle.evaluate(e=>e.remove());
      console.log('Old tap CSS reproduced the second row at 390px');
    }
    const target=await page.getByRole('button',{name:longest[0],exact:true}).first().boundingBox();
    await page.mouse.move(target.x+target.width/2,target.y+target.height/2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const held=await page.locator('.unit-picker-row').boundingBox();
    await page.mouse.up();
    await page.waitForTimeout(180);
    const tapped=await page.locator('.unit-picker-row').boundingBox();
    assert.deepEqual(tapped,held,'releasing the word must not reflow or move the rail');
    await page.keyboard.press('Escape');
    let maxUnits=0;
    for (const name of longest) {
      await page.getByRole('button',{name,exact:true}).first().click();
      await page.locator('.drag-menu.pinned').waitFor();
      await page.waitForTimeout(180);
      const before=await page.locator('.unit-picker-row').evaluate(row=>({
        x:row.getBoundingClientRect().x,y:row.getBoundingClientRect().y,
        width:row.clientWidth, scrollWidth:row.scrollWidth,
        rects:[...row.children].map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width}))
      }));
      maxUnits=Math.max(maxUnits,before.rects.length);
      assert.ok(before.rects.every(r=>Math.abs(r.y-before.rects[0].y)<0.1));
      assert.ok(before.rects.every(r=>Math.abs(r.width-44)<0.1));
      const first=page.locator('[data-unit-tid]').first();
      await first.focus();
      for(let i=1;i<before.rects.length;i++) await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(180);
      const after=await page.locator('.unit-picker-row').evaluate(row=>{
        const r=row.getBoundingClientRect(), last=row.lastElementChild.getBoundingClientRect();
        return {x:r.x,y:r.y,lastVisible:last.x>=r.x-1&&last.right<=r.right+1};
      });
      assert.ok(after.lastVisible,'last letter must be reachable');
      assert.ok(Math.abs(after.x-before.x)<0.1 && Math.abs(after.y-before.y)<0.1,'rail must not shift');
      if(name===longest[0]) await page.screenshot({path:`outputs/letter-rail-${width}.png`});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.drag-menu').count(),0);
    }
    const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('tahqeeq.session.v1')));
    assert.equal(state.mistakes.length,0,'opening and exploring must not mark');
    assert.deepEqual(errors,[]);
    console.log(`${width}x${height}: five words, up to ${maxUnits} letters, single row, stable position, 44px targets, last letter reachable, Escape, zero marks/errors`);
    await context.close();
  }
} finally { await browser.close(); }
