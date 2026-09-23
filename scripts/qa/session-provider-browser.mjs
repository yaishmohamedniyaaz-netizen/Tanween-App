import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
const url=`${base}/scripts/qa/mobile-paper.html?phraseHeader=1&sessionStorage=3`;
mkdirSync('outputs/phrase-header/provider',{recursive:true});
const results=[];
const saved=p=>p.waitForFunction(()=>window.providerQA?.status?.phase==='saved');
try {
  for(const width of [390,1400]) {
    const c=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
    const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
    p.on('dialog',d=>d.accept());
    await p.addInitScript(()=>localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1'));
    await p.goto(url);await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
    await p.getByRole('button',{name:'Begin judging',exact:true}).click();
    await p.locator('[data-word-hit]').first().waitFor();await saved(p);
    await p.evaluate(()=>window.providerQA.addFindings(12));
    await p.waitForFunction(()=>window.providerQA.state.mistakes.length===12);await saved(p);
    assert.equal(await p.evaluate(()=>localStorage.getItem('tahqeeq.session.v1')),null,'new provider must never mirror its state into the old key');
    await p.reload();await p.locator('[data-word-hit]').first().waitFor();await saved(p);
    assert.equal(await p.evaluate(()=>window.providerQA.state.mistakes.length),12);
    const more=p.getByRole('button',{name:'More actions and view controls',exact:true});
    await more.click();await p.getByText('Saved on this device',{exact:true}).waitFor();await p.waitForTimeout(400);
    await p.screenshot({path:`outputs/phrase-header/provider/saved-${width}.png`});
    await p.evaluate(()=>{
      const digest=crypto.subtle.digest.bind(crypto.subtle);window.qaOriginalDigest=digest;
      crypto.subtle.digest=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,100));return digest(...args);};
      window.providerQA.dispatch({type:'SET_NOTES',notes:'Pending save check'});
    });
    await p.getByText('Saving…',{exact:true}).waitFor();await saved(p);await p.evaluate(()=>{crypto.subtle.digest=window.qaOriginalDigest;});
    await p.keyboard.press('Escape');
    const geometry=()=>p.locator('.mushaf-composition').boundingBox();await p.waitForTimeout(300);const before=await geometry();
    await p.evaluate(()=>{
      window.qaOriginalPut=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(value,key){if(this.name==='snapshots'&&key==='current')throw new DOMException('Injected full device','QuotaExceededError');return window.qaOriginalPut.call(this,value,key);};
      window.providerQA.dispatch({type:'SET_NOTES',notes:'Unsaved note retained during storage failure'});
    });
    await p.getByRole('button',{name:'Retry saving',exact:true}).waitFor();
    assert.deepEqual(await geometry(),before,'save failure notice must not resize or move the Mushaf');
    const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'Download this tab’s work',exact:true}).click();
    const download=await downloadPromise;const stream=await download.createReadStream();let body='';for await(const chunk of stream)body+=chunk;
    assert.equal(JSON.parse(body).state.notes,'Unsaved note retained during storage failure');
    assert.equal(JSON.parse(body).schema,'state-backup-v1');
    await p.screenshot({path:`outputs/phrase-header/provider/failed-${width}.png`});
    await p.evaluate(()=>{IDBObjectStore.prototype.put=window.qaOriginalPut;});
    await p.getByRole('button',{name:'Retry saving',exact:true}).click();await saved(p);
    await p.reload();await p.waitForFunction(()=>window.providerQA?.state.notes==='Unsaved note retained during storage failure');
    await saved(p);
    const second=await c.newPage();await second.goto(url);await saved(second);
    await second.locator('[data-word-hit]').first().waitFor();
    await p.evaluate(()=>window.providerQA.dispatch({type:'SET_NOTES',notes:'Newer work in first tab'}));
    await p.waitForFunction(()=>window.providerQA.state.notes==='Newer work in first tab');await saved(p);
    await p.waitForFunction(async()=>{const s=await window.providerQA.repository.inspect();return s.kind==='ready'&&s.current.state.notes==='Newer work in first tab';});
    await second.bringToFront();await second.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await second.locator('.session-save-notice').waitFor();
    assert.equal(await second.evaluate(()=>window.providerQA.state.notes),'Unsaved note retained during storage failure');
    await second.screenshot({path:`outputs/phrase-header/provider/conflict-${width}.png`});await second.close();
    // Complete the existing sample through the real reducer, then change reciter.
    await p.evaluate(()=>{
      const q=window.providerQA;
      if(q.state.activeAssignment.categories.includes('adu-raagu'))q.dispatch({type:'SET_IMPRESSION',category:'adu-raagu',awarded:q.state.config['adu-raagu'].start});
      q.dispatch({type:'FINISH_SESSION'});
    });
    await p.waitForFunction(()=>window.providerQA.state.history.length===1);await saved(p);
    const result=await p.evaluate(()=>({id:window.providerQA.state.history[0].id,total:window.providerQA.state.history[0].total,mistakes:window.providerQA.state.history[0].mistakes.length}));
    await p.evaluate(()=>window.providerQA.dispatch({type:'SET_PARTICIPANT',patch:{name:'Next practice reciter'}}));
    await p.waitForFunction(()=>window.providerQA.state.participant.name==='Next practice reciter');await saved(p);
    await p.reload();await p.waitForFunction(()=>window.providerQA?.state.participant.name==='Next practice reciter');
    assert.deepEqual(await p.evaluate(()=>({id:window.providerQA.state.history[0].id,total:window.providerQA.state.history[0].total,mistakes:window.providerQA.state.history[0].mistakes.length})),result);
    // Corrupt only this isolated browser context's database; verify real recovery UI.
    await p.evaluate(async()=>{
      const db=await new Promise(resolve=>{const r=indexedDB.open('tanween-session-v3',1);r.onsuccess=()=>resolve(r.result);});
      await new Promise(resolve=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put('{damaged','current');tx.oncomplete=resolve;});db.close();
    });
    await p.reload();await p.getByRole('heading',{name:'A previous saved copy is available'}).waitFor();
    assert.equal(await p.locator('.app-header').count(),0,'judging must not mount until recovery is reviewed');
    assert.equal(await p.getByRole('button',{name:'Restore previous copy'}).isDisabled(),true);
    await p.screenshot({path:`outputs/phrase-header/provider/recovery-${width}.png`});
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width===390) {
      await p.setViewportSize({width:320,height:568});await p.evaluate(()=>{document.documentElement.dataset.theme='dark';});await p.waitForTimeout(400);
      await p.getByRole('button',{name:'Check again',exact:true}).scrollIntoViewIfNeeded();
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await p.screenshot({path:'outputs/phrase-header/provider/recovery-dark-320.png',fullPage:true});
      await p.setViewportSize({width,height:900});await p.evaluate(()=>{document.documentElement.dataset.theme='light';});
    }
    await p.getByRole('checkbox').check();await p.getByRole('button',{name:'Restore previous copy'}).click();
    await p.waitForFunction(()=>Boolean(window.providerQA));await saved(p);
    assert.equal(await p.evaluate(()=>window.providerQA.state.history[0].mistakes.length),12);
    const quarantined=await p.evaluate(async()=>Object.keys((await window.providerQA.repository.recoveryCopies()).quarantined).length);
    assert.equal(quarantined,1);assert.deepEqual(errors,[]);results.push({width,findings:12,historyPreserved:true,quotaRetry:true,conflict:true,recovered:true});
    await c.close();
  }
  for(const mode of ['invalid-legacy','future','legacy-conflict']) {
    const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();
    if(mode==='invalid-legacy')await p.addInitScript(()=>localStorage.setItem('tahqeeq.session.v1','{broken legacy'));
    await p.goto(url);
    if(mode!=='invalid-legacy') {
      await p.getByRole('button',{name:'Load prepared mobile sample'}).waitFor();await saved(p);
      if(mode==='future')await p.evaluate(async()=>{
        const db=await new Promise(resolve=>{const r=indexedDB.open('tanween-session-v3',1);r.onsuccess=()=>resolve(r.result);});
        await new Promise(resolve=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(JSON.stringify({schema:'future',minimumReaderVersion:99}),'current');tx.oncomplete=resolve;});db.close();
      });else await p.evaluate(()=>localStorage.setItem('tahqeeq.session.v1','older-tab-work'));
      await p.reload();
    }
    await p.getByRole('heading',{name:mode==='legacy-conflict'?'Two copies need review':'Your saved session needs attention'}).waitFor();
    assert.equal(await p.getByRole('button',{name:'Load prepared mobile sample'}).count(),0);
    assert.equal(await p.locator('.app-header').count(),0);
    if(mode==='future')await p.getByText(/newer version of Tanween/).waitFor();
    const pending=p.waitForEvent('download');await p.getByRole('button',{name:'Download saved copies'}).click();
    const download=await pending;const stream=await download.createReadStream();let body='';for await(const chunk of stream)body+=chunk;
    const copies=JSON.parse(body).copies;
    if(mode==='invalid-legacy')assert.equal(copies.legacyNow,'{broken legacy');
    if(mode==='legacy-conflict')assert.equal(copies.legacyNow,'older-tab-work');
    if(mode==='future')assert.equal(JSON.parse(copies.current).minimumReaderVersion,99);
    await p.screenshot({path:`outputs/phrase-header/provider/boot-${mode}.png`});
    results.push({mode,judgingBlocked:true,copiesDownloaded:true});await c.close();
  }
  {
    const c=await browser.newContext({viewport:{width:390,height:844},permissions:['microphone']}),p=await c.newPage();
    await p.addInitScript(()=>{
      window.micCalls=0;const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia=(...args)=>{window.micCalls++;return get(...args);};
    });
    await p.goto(url);await p.getByRole('button',{name:'Load prepared mobile sample'}).click();
    await p.getByRole('checkbox',{name:'Record this practice recitation'}).check();
    await p.getByRole('button',{name:'Begin judging',exact:true}).click();
    await p.getByRole('button',{name:/Pause recording at/}).waitFor();await saved(p);
    await p.evaluate(()=>{
      window.qaOriginalPut=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(value,key){if(this.name==='snapshots'&&key==='current')throw new DOMException('Injected full device','QuotaExceededError');return window.qaOriginalPut.call(this,value,key);};
      window.providerQA.dispatch({type:'SET_NOTES',notes:'Recording continues during save failure'});
    });
    await p.locator('.session-save-notice').waitFor();assert.equal(await p.evaluate(()=>window.micCalls),1);
    await p.getByRole('button',{name:/Pause recording at/}).click();
    await p.getByRole('button',{name:/Resume recording at/}).waitFor();
    await p.evaluate(()=>{IDBObjectStore.prototype.put=window.qaOriginalPut;});
    await p.getByRole('button',{name:'Retry saving'}).click();await saved(p);
    results.push({recording:'fake audio through actual recorder',pauseReachableDuringFailure:true,microphoneCalls:1});await c.close();
  }
  writeFileSync('outputs/phrase-header/provider/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
} finally {await browser.close();}
