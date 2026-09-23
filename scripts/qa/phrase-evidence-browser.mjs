import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
mkdirSync('outputs/phrase-header/readers',{recursive:true});
const results=[];
try {
  for(const [width,height] of [[390,844],[1400,900]]) {
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/scripts/qa/phrase-evidence.html`);
    await page.getByRole('heading',{name:'01 Phrase reader sample',exact:true}).waitFor();
    const before=await page.evaluate(()=>JSON.stringify(localStorage));
    const findings=page.locator('.rw-finding');
    assert.equal(await findings.count(),3);
    for(let i=0;i<3;i++) {
      await findings.nth(i).click();
      await page.waitForTimeout(100);
      const text=await page.locator('body').innerText();
      assert(!text.includes('undefined:') && !text.includes('Location not verified in this recorded passage'));
      assert.equal(await page.locator('.rw-selected-finding [lang="ar"]').count(),1);
      assert.equal(await page.locator('.recitation-evidence-page').count(),0);
      await page.screenshot({path:`outputs/phrase-header/readers/review-${width}-${i}.png`});
      const close=page.getByRole('button',{name:'Close',exact:true});
      if(await close.isVisible()) await close.click();
    }
    assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),before);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
    await findings.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({path:`outputs/phrase-header/readers/review-dark-${width}.png`});
    await page.goto(`${base}/scripts/qa/phrase-evidence.html?passage=1`);
    await page.locator('.recitation-evidence-pages[data-active-page]').waitFor();
    await page.waitForTimeout(500);
    const activePage=await page.locator('.recitation-evidence-pages').getAttribute('data-active-page');
    for(let i=0;i<3;i++) {
      await page.locator('.rw-finding').nth(i).click();
      assert.equal(await page.locator('.recitation-evidence-pages').getAttribute('data-active-page'),activePage);
      assert.equal(await page.locator('.evidence-marked-word,.evidence-replay-word.is-active').count(),0);
      await page.getByRole('button',{name:'Close',exact:true}).click();
    }
    await page.screenshot({path:`outputs/phrase-header/readers/with-passage-${width}.png`,fullPage:true});
    await page.goto(`${base}/scripts/qa/phrase-evidence.html?mode=print`);
    await page.emulateMedia({media:'print'});
    await page.locator('.rs-total').waitFor();
    assert.match(await page.locator('.rs-total').innerText(),/94\s*\/\s*100/);
    const text=await page.locator('.result-sheet').innerText();
    assert(text.includes('Starting phrase') && text.includes('Ending phrase') && text.includes('صَدَقَ'));
    assert(!text.includes('undefined') && !text.includes('Basmala'));
    await page.screenshot({path:`outputs/phrase-header/readers/print-${width}.png`,fullPage:true});
    assert.deepEqual(errors,[]);results.push({width,height,findings:3,printTotal:94,errors});
    await page.close();
  }
  writeFileSync('outputs/phrase-header/readers/results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally {await browser.close();}
