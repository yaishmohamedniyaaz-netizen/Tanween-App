import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync} from 'node:fs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = 'outputs/continuity-restore/design';
mkdirSync(out, {recursive:true});
const browser = await chromium.launch({ignoreDefaultArgs:['--hide-scrollbars']});
const results = [];
try {
  for (const version of ['claude','restored']) {
    const cases = version === 'claude' ? [[1400,900,'light'],[768,1024,'light']]
      : [[1400,900,'light'],[1400,900,'dark'],[1024,768,'light'],[768,1024,'light'],[768,1024,'dark'],[390,844,'light']];
    for (const [width,height,theme] of cases) {
      const key = `${version}-${width}-${theme}`;
      const context = await browser.newContext({viewport:{width,height},hasTouch:width<=1024,colorScheme:theme});
      const page = await context.newPage();
      const run = {key,errors:[]}; results.push(run);
      page.on('pageerror', e => run.errors.push(e.message));
      await page.addInitScript(theme => {
        localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');
        localStorage.setItem('tanween.phrases.help.v1','seen');
        localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,theme,slimScorePanel:true}));
      },theme);
      await page.goto(`http://127.0.0.1:${version==='claude'?5296:5346}/scripts/qa/mobile-paper.html?sessionStorage=3&phraseHeader=1&qaSurah=79&qaAyah=33&qaLines=10`);
      await page.getByRole('button',{name:'Load prepared mobile sample'}).click();
      await page.getByRole('button',{name:'Begin judging',exact:true}).click();
      await page.waitForFunction(()=>window.providerQA.state.sessionActive);
      await page.evaluate(async()=>{await document.fonts.ready; await window.providerQA.addFindings(3)});
      await page.waitForTimeout(400);
      if(width<600) await page.locator('.mobile-mistakes-action').click();
      const card = page.locator('.log-row-wrap:visible').first();
      await card.scrollIntoViewIfNeeded();
      await card.locator('.log-chevron').click();
      await page.waitForTimeout(600);
      // Baseline disclosure scrolls to the Mushaf; return to the card for design comparison.
      await card.scrollIntoViewIfNeeded();
      if(width>=600 && width<=900) await page.locator('.sidebar').evaluate(e=>window.scrollBy(0,e.getBoundingClientRect().top-80));
      await page.waitForTimeout(200);
      await page.screenshot({path:`${out}/${key}-card.png`});
      run.card = await card.evaluate(e=>({background:getComputedStyle(e).backgroundColor,letter:e.querySelector('.log-glyph').textContent,headerStepper:!!e.querySelector('.log-head-adjust'),wordBelow:!!e.querySelector('.log-detail-line .log-kalimah-word')}));
      assert.ok(run.card.headerStepper && run.card.wordBelow,'Claude card composition retained');
      if(width<600) await page.keyboard.press('Escape');
      await page.getByRole('button',{name:width<600?'Finish':'Finish recitation',exact:true}).click();
      const dialog = page.locator('.finish-dialog');
      await page.waitForTimeout(250);
      assert.equal(await dialog.locator('.finish-total.is-partial').count(),1,'Running total retained');
      await page.screenshot({path:`${out}/${key}-review-pending.png`});
      await dialog.locator('textarea.notes').fill('Keep the ending clear.');
      await dialog.getByRole('spinbutton',{name:'Adu / Raagu marks'}).press('End');
      await dialog.getByRole('spinbutton',{name:'Adu / Raagu marks'}).press('ArrowLeft');
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(()=>window.providerQA.state.notes),'Keep the ending clear.');
      await page.screenshot({path:`${out}/${key}-review.png`});
      const cdp = await context.newCDPSession(page);
      let film = false, index = 0, last = 0;
      cdp.on('Page.screencastFrame', async frame=>{
        try { await cdp.send('Page.screencastFrameAck',{sessionId:frame.sessionId}); } catch {return}
        if(film && Date.now()-last>40){last=Date.now();writeFileSync(`${out}/${key}-save-${String(index++).padStart(3,'0')}.jpg`,Buffer.from(frame.data,'base64'))}
      });
      film = version==='restored' && theme==='light' && [1400,768].includes(width);
      if(film) await cdp.send('Page.startScreencast',{format:'jpeg',quality:85,everyNthFrame:1});
      await dialog.getByRole('button',{name:'Save and select next reciter',exact:true}).click();
      await page.getByRole('heading',{name:'Reciter queue',exact:true}).waitFor();
      await page.waitForTimeout(350);
      if(film){await cdp.send('Page.stopScreencast');film=false}
      await page.screenshot({path:`${out}/${key}-queue.png`});
      if(version==='restored') assert.equal(await page.locator('dialog[open]').count(),1);
      assert.equal(await page.evaluate(()=>window.providerQA.state.history[0].notes),'Keep the ending clear.');
      assert.deepEqual(run.errors,[]);
      console.log(`PASS ${key}`);
      await context.close();
      writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
    }
  }
} finally {await browser.close()}
