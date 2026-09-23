import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch();
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
const output = 'outputs/phrase-header/tray-fix';
mkdirSync(output, { recursive: true });

async function checkTray(page, label) {
  await page.locator('.drag-menu').waitFor();
  await page.waitForTimeout(200);
  const result = await page.locator('.drag-menu').evaluate(menu => {
    const rect = el => { const r = el.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, height:r.height }; };
    const stack = menu.querySelector('.category-stack');
    const options = [...stack.querySelectorAll('[data-pill]')];
    const reachable = el => { const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)); };
    return {
      menu:rect(menu), width:innerWidth, height:innerHeight,
      scroll:stack.scrollHeight-stack.clientHeight,
      duplicate:!!menu.querySelector('.phrase-selector-source'),
      options:options.map(el=>({rect:rect(el),reachable:reachable(el)})),
      undo:menu.querySelector('.selector-undo') ? reachable(menu.querySelector('.selector-undo')) : null,
    };
  });
  assert.equal(result.duplicate,false,label);
  assert(result.scroll<=1,`${label}: criteria must not scroll`);
  assert.equal(result.options.length,3,label);
  for(const item of result.options) {
    assert(item.rect.height>=44,`${label}: full-height criteria`);
    assert(item.reachable,`${label}: criterion hidden or covered`);
  }
  assert(result.menu.top>=0 && result.menu.bottom<=result.height,`${label}: vertical viewport bounds`);
  assert(result.menu.left>=0 && result.menu.right<=result.width,`${label}: horizontal viewport bounds`);
  if(result.undo!==null) assert(result.undo,`${label}: undo reachable`);
}

try {
  for(const [width,height] of [[320,568],[390,844],[627,580],[740,360],[1400,900]]) {
    if(process.env.QA_WIDTH && width!==Number(process.env.QA_WIDTH)) continue;
    const context=await browser.newContext({viewport:{width,height}});
    const page=await context.newPage();
    await page.addInitScript(()=>{
      localStorage.setItem('tanween.phrases.help.v1','seen');
      localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');
    });
    await page.goto(`${base}/scripts/qa/mobile-paper.html?phraseHeader=1&sessionStorage=3`);
    await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
    await page.getByRole('button',{name:'Begin judging',exact:true}).click();
    await page.locator('[data-word-hit]').first().waitFor();
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.locator('.phrase-header-trigger').click();
    const words=page.locator('.phrase-word');
    await words.first().waitFor();
    assert.equal(await words.count(),12);
    for(let index=0;index<12;index++) {
      // In landscape, reveal lower phrases before starting the gesture.
      // A scroll deliberately cancels any in-flight letter selection.
      await words.nth(index).scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await words.nth(index).click();
      await checkTray(page,`${width} word ${index}`);
      if(index===0 || index===11) await page.screenshot({path:`${output}/tray-${width}-${index}.png`});
      await page.keyboard.press('Escape');
    }
    // Reopen a saved letter: every criterion, the current amount, and undo
    // must remain visible together, with no nested criteria scroller.
    await words.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await words.first().click();
    await page.locator('[data-unit-tid]').first().click();
    await page.locator('[data-pill="jali"]').click();
    await words.first().click();
    await page.locator('[data-unit-tid]').first().click();
    await page.getByRole('button',{name:/Hold to undo/i}).waitFor();
    await checkTray(page,`${width} correction`);
    await page.screenshot({path:`${output}/correction-${width}.png`});
    const undo=await page.getByRole('button',{name:/Hold to undo/i}).boundingBox();
    await page.mouse.move(undo.x+undo.width/2,undo.y+undo.height/2);
    await page.mouse.down();await page.waitForTimeout(1000);await page.mouse.up();
    await page.waitForFunction(()=>window.providerQA.state.mistakes.length===0);
    // The continuous Quran-style gesture must still work when the tray
    // extends beyond the phrase card: word -> letter -> criterion -> release.
    const source=await words.first().boundingBox();
    await page.mouse.move(source.x+source.width/2,source.y+source.height/2);
    await page.mouse.down();
    await page.locator('[data-unit-tid]').first().waitFor();
    const letter=await page.locator('[data-unit-tid]').first().boundingBox();
    await page.mouse.move(letter.x+letter.width/2,letter.y+letter.height/2,{steps:5});
    const criterion=page.locator('[data-pill="khafi"]');
    await criterion.waitFor();
    const choice=await criterion.boundingBox();
    await page.mouse.move(choice.x+choice.width/2,choice.y+choice.height/2,{steps:5});
    await page.mouse.up();
    await page.waitForFunction(()=>window.providerQA.state.mistakes.length===1);
    assert.equal(await page.evaluate(()=>window.providerQA.state.mistakes[0].category),'khafi');
    await page.getByRole('button',{name:'Close starting and ending',exact:true}).click();
    assert.equal(await page.locator('.drag-menu').count(),0);
    console.log(`PASS ${width}x${height}: all phrase words, full criteria, correction, undo and drag gesture`);
    await context.close();
  }
} finally { await browser.close(); }
