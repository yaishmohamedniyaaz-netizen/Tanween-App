import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = 'outputs/tray-even-spacing';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [width, height] of [[1191,668], [1024,768], [390,844], [320,740]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 600 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');
      localStorage.setItem('tanween.phrases.help.v1','seen');
      localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,slimScorePanel:true,judgeRailSide:'left'}));
    });
    await page.goto('http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10');
    await page.getByRole('button', {name:'Load prepared mobile sample'}).click();
    await page.getByRole('button', {name:'Begin judging',exact:true}).click();
    await page.waitForFunction(() => window.providerQA?.state.sessionActive);
    await page.evaluate(async () => { await window.providerQA.addFindings(8); });
    await page.waitForFunction(() => window.providerQA.state.mistakes.length === 8);
    // Include a real long-word target from the Mushaf, not fabricated text.
    await page.evaluate(async () => {
      const { loadPage } = await import('/src/lib/page.ts');
      const { judgingTargetsOf, TARGET_RULE_VERSION, TARGET_SOURCE_VERSION } = await import('/src/lib/judgingUnits.ts');
      const data = await loadPage(604);
      const word = data.lines.flatMap(line => 'words' in line ? line.words : []).filter(w=>w.role==='letter').sort((a,b)=>b.text.length-a.text.length)[0];
      const unit = judgingTargetsOf(word.text,word.role,word.wid)[0];
      window.providerQA.dispatch({type:'ADD_MISTAKE',mistake:{id:'qa-long-word',tid:unit.tid,wordId:word.wid,wordText:word.text,surah:word.surah,ayah:word.ayah,page:604,glyph:unit.fullGlyph,primaryGlyph:unit.primaryGlyph,fullGlyph:unit.fullGlyph,sourceStart:unit.start,sourceEnd:unit.end,targetVersion:2,sourceVersion:TARGET_SOURCE_VERSION,ruleVersion:TARGET_RULE_VERSION,label:`${word.surah}:${word.ayah}`,category:'khafi',amount:1,ts:1}});
    });
    await page.waitForFunction(() => window.providerQA.state.mistakes.length === 9);
    if (width < 600) await page.locator('.mobile-mistakes-action').click();
    await page.locator('.log-row:visible').first().click();
    const row = page.locator('.log-row-wrap.open:visible');
    await row.locator('.log-adjust').waitFor();
    const sizes = [];
    for (let i=0;i<3;i++) {
      await row.getByRole('button',{name:'increase deduction',exact:true}).click();
      await page.waitForTimeout(180);
      sizes.push(await row.evaluate(el => {
        const box = el.getBoundingClientRect();
        const cells = [...el.querySelector('.log-adjust').children].map(c => ({width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,overflow:c.scrollWidth>c.clientWidth}));
        return {height:box.height,amount:el.querySelector('.step-val').textContent,cells};
      }));
    }
    assert.ok(sizes.every(s => s.height === sizes[0].height), 'Decimal changes must not reflow the card');
    assert.ok(sizes.every(s => s.cells.every(c => c.width === 44 && c.height === 44 && !c.overflow)), 'Equal cells must fit the amount');
    assert.ok(await row.evaluate(el => {
      const letter=el.querySelector('.log-tile').getBoundingClientRect();
      const control=el.querySelector('.log-adjust').getBoundingClientRect();
      const word=el.querySelector('.log-kalimah-word').getBoundingClientRect();
      return Math.abs((letter.top+letter.bottom)/2-(word.top+word.bottom)/2)<1
        && control.top>=letter.bottom && control.right<=el.getBoundingClientRect().right;
    }), 'Kalimah sits beside letter with controls below');
    assert.ok(await row.evaluate(el => {
      const card = el.getBoundingClientRect();
      const tile = el.querySelector('.log-tile').getBoundingClientRect();
      const control = el.querySelector('.log-adjust').getBoundingClientRect();
      const header = el.querySelector('.log-row').getBoundingClientRect();
      const undo = el.querySelector('.log-undo').getBoundingClientRect();
      const topGap = tile.top - card.top;
      const bottomGap = card.bottom - (control.bottom - 8);
      return Math.abs(topGap - bottomGap) < 1 && header.height >= 44
        && undo.height >= 44 && undo.width >= 44 && control.top >= header.bottom;
    }), 'Even visual end spacing with separate, full-size touch areas');
    const tileBefore = await row.locator('.log-tile').boundingBox();
    await row.locator('.log-row').click();
    const collapsed = page.locator('.log-row:visible').first();
    await page.waitForTimeout(240);
    assert.equal(await collapsed.getAttribute('aria-expanded'), 'false');
    assert.equal((await collapsed.locator('.log-tile').boundingBox()).x, tileBefore.x);
    assert.ok(await collapsed.locator('.log-chevron').isVisible());
    await collapsed.press('Enter');
    await page.waitForTimeout(240);
    assert.equal(await row.locator('.log-row').getAttribute('aria-expanded'), 'true');
    assert.ok(await row.locator('.log-chevron').isVisible());
    await page.screenshot({path:`${out}/editing-${width}.png`});
    await page.screenshot({path:`${out}/current-${width}.png`});
    if (width === 1191) {
      await page.evaluate(() => document.documentElement.setAttribute('data-theme','dark'));
      await page.waitForTimeout(350);
      await page.screenshot({path:`${out}/current-dark.png`});
      await page.evaluate(() => document.documentElement.setAttribute('data-theme','light'));
      await page.waitForTimeout(350);
      const list = page.locator('.log:visible');
      const before = (await list.boundingBox()).width;
      await page.mouse.move(1100,10);
      await list.evaluate(el => { el.scrollTop += 30; });
      await page.waitForFunction(() => document.querySelector('.log.is-scrolling'));
      await page.waitForFunction(() => !document.querySelector('.log.is-scrolling'));
      assert.equal((await list.boundingBox()).width,before,'Fading the grip must not shift layout');
    }
    await page.locator('.log-row:visible').last().click();
    const longRow = page.locator('.log-row-wrap.open:visible');
    await page.waitForTimeout(240);
    const longHeight = (await longRow.boundingBox()).height;
    await longRow.getByRole('button',{name:'increase deduction',exact:true}).click();
    await page.waitForTimeout(180);
    assert.equal((await longRow.boundingBox()).height,longHeight);
    assert.ok(await longRow.evaluate(el => [...el.querySelectorAll('.log-kalimah-word,.log-detail-actions')].every(c=> {
      const a=el.getBoundingClientRect(),b=c.getBoundingClientRect();return b.left>=a.left && b.right<=a.right;
    })), 'Long words and controls must remain inside the card');
    assert.ok(await longRow.evaluate(el => {
      const a=el.querySelector('.log-kalimah-word').getBoundingClientRect();
      const b=el.querySelector('.log-tile').getBoundingClientRect();
      return Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<1;
    }), 'Long kalimah and letter must occupy the same line');
    await page.screenshot({path:`${out}/long-word-${width}.png`});
    if (width === 1191) await page.locator('.sidebar').screenshot({path:`${out}/selected-desktop.png`});
    if (width === 320) await page.locator('.mistake-panel.is-mobile-sheet').screenshot({path:`${out}/selected-mobile.png`});
    await page.locator('.log-row:visible').first().click();
    // Undo and restore through the real ledger-backed controls.
    await row.getByRole('button',{name:'Undo',exact:true}).click();
    if (width >= 600) await page.getByRole('button',{name:'View all',exact:true}).click();
    await page.getByRole(width < 600 ? 'button' : 'tab',{name:/^History/}).click();
    const history = page.locator('.history-list');
    await history.waitFor();
    assert.equal(await history.locator('.history-item').filter({hasText:'Deduction adjusted'}).locator('.history-glyph').count(),4);
    await page.screenshot({path:`${out}/history-${width}.png`});
    await history.getByRole('button',{name:'Restore',exact:true}).click();
    await page.waitForFunction(() => window.providerQA.state.mistakes.length === 9);
    await page.getByRole('button',{name:width<600?'Close mistakes':'Close',exact:true}).click();
    if (width<600) await page.locator('.mobile-score-action').click();
    assert.equal(await page.locator('.impression-reason input:visible').count(),0);
    if (width < 600) await page.getByRole('button',{name:'Notes',exact:true}).click();
    await page.getByRole('textbox',{name:'Notes for improvement',exact:true}).fill('Pacing needs attention');
    await page.waitForFunction(() => window.providerQA.state.notes === 'Pacing needs attention');
    assert.equal(await page.locator('.scorecard .impression-reason, .scorecard .sc-reason').count(),0);
    await page.screenshot({path:`${out}/reason-${width}.png`});
    assert.deepEqual(errors,[]);
    results.push({width,height,sizes,undoRestore:true,notesSaved:true,errors});
    await context.close();
  }
  writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
