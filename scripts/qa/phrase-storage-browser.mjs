import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/idraw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch();
const context=await browser.newContext();
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:5320';
const results=[];
async function page() {
  const p=await context.newPage();
  await p.goto(`${base}/scripts/qa/phrase-storage.html`);
  await p.waitForFunction(()=>Boolean(window.storageQA));return p;
}
async function check(name,run) {await run();results.push(name);console.log(`PASS ${name}`);}
try {
  const a=await page(),b=await page();
  const setup=await a.evaluate(async()=>{
    const q=window.storageQA;
    // Empty old session is a fixture: old code must never receive phrase data.
    const legacyState=q.phraseStateFixture(q.savedPhraseFixture([]));
    legacyState.competition.liveSnapshot=null;
    const legacy=JSON.stringify(q.normalizeLedgerState(legacyState));
    localStorage.setItem(q.STORAGE_KEY,legacy);
    window.vault=q.createSessionStorage({databaseName:'qa-phrase-storage-main'});
    const first=await window.vault.initialize(q.phraseStateFixture(),legacy);
    window.checkpoint=first.checkpoint;
    return {revision:first.checkpoint.revision,legacy,arabic:first.state.mistakes[0].wordText};
  });
  await check('migration retains the exact legacy bytes and phrase snapshot',async()=>{
    assert.equal(setup.revision,1);assert.equal(setup.arabic,'أَعُوذُ');
    assert.equal(await a.evaluate(()=>localStorage.getItem(window.storageQA.STORAGE_KEY)),setup.legacy);
  });
  await check('reload restores exact Arabic, ledger identity and score without touching legacy storage',async()=>{
    await a.reload();await a.waitForFunction(()=>Boolean(window.storageQA));
    const value=await a.evaluate(async()=>{
      window.vault=window.storageQA.createSessionStorage({databaseName:'qa-phrase-storage-main'});
      const status=await window.vault.inspect();window.checkpoint=status.current.checkpoint;
      return {kind:status.kind,total:status.current.state.history[0].total,word:status.current.state.mistakes[0].wordText,
        legacy:localStorage.getItem(window.storageQA.STORAGE_KEY)};
    });
    assert.deepEqual(value,{kind:'ready',total:98,word:'أَعُوذُ',legacy:setup.legacy});
  });
  await check('two tabs racing the same checkpoint produce exactly one successful commit',async()=>{
    await b.evaluate(async()=>{window.vault=window.storageQA.createSessionStorage({databaseName:'qa-phrase-storage-main'});window.checkpoint=(await window.vault.inspect()).current.checkpoint;});
    const run=p=>p.evaluate(async()=>{
      const state=window.storageQA.phraseStateFixture();state.notes=crypto.randomUUID();
      try {const saved=await window.vault.save(state,window.checkpoint);return {ok:true,revision:saved.checkpoint.revision};}
      catch(e){return {ok:false,code:e.code};}
    });
    const responses=await Promise.all([run(a),run(b)]);
    assert.equal(responses.filter(r=>r.ok).length,1);assert.equal(responses.find(r=>!r.ok).code,'stale');
    assert.equal(responses.find(r=>r.ok).revision,2);
  });
  await check('correction, undo and restore survive separate committed reloads without double counting',async()=>{
    for(const action of ['correct','undo','restore']) {
      const value=await a.evaluate(async action=>{
        const current=(await window.vault.inspect()).current;
        const state=current.state,session=state.history[0],mark=session.mistakes[0];
        if(action==='correct')session.events.push({id:'storage-correct',type:'mistake_recategorized',at:110,
          mistakeId:mark.id,glyph:mark.glyph,label:mark.label,from:'jali',to:'khafi',fromAmount:2,toAmount:1});
        if(action==='undo')session.events.push({id:'storage-undo',type:'mistake_undone',at:120,mistake:mark});
        if(action==='restore')session.events.push({id:'storage-restore',type:'mistake_restored',at:130,
          mistake:session.events.find(e=>e.id==='storage-undo').mistake});
        session.mistakes=window.storageQA.projectMistakes(session.events);
        state.history=[window.storageQA.normalizeSavedSession(session)];
        state.events=session.events;state.mistakes=session.mistakes;
        return (await window.vault.save(state,current.checkpoint)).legacyChanged;
      },action);assert.equal(value,false);
      await a.reload();await a.waitForFunction(()=>Boolean(window.storageQA));
      const loaded=await a.evaluate(async()=>{
        window.vault=window.storageQA.createSessionStorage({databaseName:'qa-phrase-storage-main'});
        const s=await window.vault.inspect();return {kind:s.kind,total:s.current.state.history[0].total,count:s.current.state.mistakes.length};
      });assert.deepEqual(loaded,{kind:'ready',total:action==='undo'?100:99,count:action==='undo'?0:1});
    }
  });
  await check('save detaches the caller state before awaiting storage',async()=>{
    const value=await a.evaluate(async()=>{
      const current=(await window.vault.inspect()).current;
      current.state.notes='captured before save';
      const pending=window.vault.save(current.state,current.checkpoint);
      current.state.notes='mutated after save call';await pending;
      return (await window.vault.inspect()).current.state.notes;
    });assert.equal(value,'captured before save');
  });
  await check('quota failure and transaction abort retain both committed snapshots',async()=>{
    for(const mode of ['quota','abort']) {
      const value=await a.evaluate(async mode=>{
        const before=await window.vault.recoveryCopies(),current=(await window.vault.inspect()).current;
        const original=IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put=function(value,key){
          if(this.name==='snapshots' && key==='current') {
            if(mode==='quota')throw new DOMException('Injected quota failure','QuotaExceededError');
            this.transaction.abort();throw new DOMException('Injected interrupted save','AbortError');
          }return original.call(this,value,key);
        };
        let code;try{await window.vault.save(current.state,current.checkpoint);}catch(e){code=e.code;}
        finally{IDBObjectStore.prototype.put=original;}
        return {code,unchanged:JSON.stringify(before)===JSON.stringify(await window.vault.recoveryCopies())};
      },mode);assert.equal(value.unchanged,true);assert.equal(value.code,mode==='quota'?'quota':'aborted');
    }
  });
  await check('a legacy conflict after commit reports a saved checkpoint, not a failed save',async()=>{
    const result=await b.evaluate(async()=>{
      const q=window.storageQA,results=[];
      for(const mode of ['changed','unavailable']) {
        let active=false,reads=0;
        const repo=q.createSessionStorage({databaseName:`qa-phrase-after-commit-${mode}`,legacyStorage:{getItem(){
          if(active && ++reads>1) {
            if(mode==='unavailable')throw new DOMException('Denied after commit','SecurityError');
            return 'old-tab-edited-after-commit';
          }return 'baseline';
        }}});
        const first=await repo.initialize(q.phraseStateFixture(),'baseline');
        active=true;const saved=await repo.save(first.state,first.checkpoint);active=false;
        results.push({changed:saved.legacyChanged,error:saved.legacyCheckError?.code??null,
          savedRevision:saved.checkpoint.revision,loadedRevision:(await repo.inspect()).current.checkpoint.revision});
      }return results;
    });assert.deepEqual(result,[{changed:true,error:null,savedRevision:2,loadedRevision:2},
      {changed:true,error:'unavailable',savedRevision:2,loadedRevision:2}]);
  });
  await check('valid JSON with altered evidence fails the checksum without replacing either snapshot',async()=>{
    const result=await b.evaluate(async()=>{
      const q=window.storageQA,name='qa-phrase-checksum',repo=q.createSessionStorage({databaseName:name});
      const first=await repo.initialize(q.phraseStateFixture(),localStorage.getItem(q.STORAGE_KEY));
      await repo.save(first.state,first.checkpoint);
      const before=await repo.recoveryCopies();const damaged=JSON.parse(before.current);
      const payload=JSON.parse(damaged.payload);payload.state.notes='unrecorded change';damaged.payload=JSON.stringify(payload);
      const changed=JSON.stringify(damaged);
      const db=await new Promise(resolve=>{const r=indexedDB.open(name,1);r.onsuccess=()=>resolve(r.result);});
      await new Promise(resolve=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(changed,'current');tx.oncomplete=resolve;});db.close();
      const status=await repo.inspect(),after=await repo.recoveryCopies();
      return {kind:status.kind,retained:after.current===changed,previousUnchanged:after.previous===before.previous};
    });assert.deepEqual(result,{kind:'recovery-required',retained:true,previousUnchanged:true});
  });
  await check('the recovery API cannot replace a healthy current snapshot',async()=>{
    const value=await b.evaluate(async()=>{
      const q=window.storageQA,repo=q.createSessionStorage({databaseName:'qa-phrase-no-rollback'});
      const first=await repo.initialize(q.phraseStateFixture(),localStorage.getItem(q.STORAGE_KEY));
      await repo.save({...first.state,notes:'new work'},first.checkpoint);
      const before=await repo.recoveryCopies();let code;
      try{await repo.recover({kind:'recovery-required',previous:first,damagedCurrent:before.current});}catch(e){code=e.code;}
      return {code,retained:JSON.stringify(before)===JSON.stringify(await repo.recoveryCopies())};
    });assert.deepEqual(value,{code:'stale',retained:true});
  });
  await check('an older tab can change only its old copy; new saving stops on divergence',async()=>{
    const value=await a.evaluate(async()=>{
      window.preConflict=(await window.vault.inspect()).current;
      return (await window.vault.recoveryCopies()).current;
    });
    await b.evaluate(()=>localStorage.setItem(window.storageQA.STORAGE_KEY,'older-tab-new-edit'));
    const status=await a.evaluate(async()=>{
      const s=await window.vault.inspect();let code;
      try{await window.vault.save(window.preConflict.state,window.preConflict.checkpoint);}catch(e){code=e.code;}
      return {kind:s.kind,code,raw:(await window.vault.recoveryCopies()).current,old:s.legacyNow};
    });assert.deepEqual(status,{kind:'legacy-conflict',code:'legacy-changed',raw:value,old:'older-tab-new-edit'});
    // Reset this TEST baseline only; production has no automatic reconciliation.
    await b.evaluate(legacy=>localStorage.setItem(window.storageQA.STORAGE_KEY,legacy),setup.legacy);
  });
  await check('a damaged head requires explicit recovery and is quarantined before replacement',async()=>{
    const result=await a.evaluate(async()=>{
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('qa-phrase-storage-main',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put('{damaged','current');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();
      const status=await window.vault.inspect();const before=(await window.vault.recoveryCopies()).current;
      status.previous.state.notes='caller mutation must not reach disk';
      await window.vault.recover(status);
      const recovered=await window.vault.inspect();
      const unique=JSON.parse(recovered.current.checkpoint.raw).commitId!==JSON.parse(status.previous.checkpoint.raw).commitId;
      const db2=await new Promise(resolve=>{const r=indexedDB.open('qa-phrase-storage-main',1);r.onsuccess=()=>resolve(r.result);});
      const quarantined=await new Promise(resolve=>{const tx=db2.transaction('snapshots');const r=tx.objectStore('snapshots').getAll();r.onsuccess=()=>resolve(r.result.includes('{damaged'));});db2.close();
      const exported=Object.values((await window.vault.recoveryCopies()).quarantined).includes('{damaged');
      let stale;try{await window.vault.recover(status);}catch(e){stale=e.code;}
      return {kind:status.kind,before,after:recovered.kind,quarantined,exported,unique,stale,mutated:recovered.current.state.notes==='caller mutation must not reach disk'};
    });assert.deepEqual(result,{kind:'recovery-required',before:'{damaged',after:'ready',quarantined:true,exported:true,unique:true,stale:'stale',mutated:false});
  });
  await check('future storage formats block recovery instead of downgrading',async()=>{
    const result=await a.evaluate(async()=>{
      const db=await new Promise(resolve=>{const r=indexedDB.open('qa-phrase-storage-main',1);r.onsuccess=()=>resolve(r.result);});
      const future=JSON.stringify({schema:'tanween-session-store-v9',minimumReaderVersion:99});
      await new Promise(resolve=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(future,'current');tx.oncomplete=resolve;});db.close();
      const s=await window.vault.inspect();return {kind:s.kind,code:s.error.code,untouched:(await window.vault.recoveryCopies()).current===future};
    });assert.deepEqual(result,{kind:'blocked',code:'unsupported',untouched:true});
  });
  await check('initial migration races do not replace an already initialized store',async()=>{
    const result=await b.evaluate(async()=>{
      const q=window.storageQA,repo=q.createSessionStorage({databaseName:'qa-phrase-init-race'});
      const result=await Promise.allSettled([repo.initialize(q.phraseStateFixture(),localStorage.getItem(q.STORAGE_KEY)),repo.initialize(q.phraseStateFixture(),localStorage.getItem(q.STORAGE_KEY))]);
      return {successes:result.filter(r=>r.status==='fulfilled').length,codes:result.filter(r=>r.status==='rejected').map(r=>r.reason.code)};
    });assert.deepEqual(result,{successes:1,codes:['stale']});
  });
  await check('legacy edits during migration preparation leave the database empty',async()=>{
    const result=await b.evaluate(async()=>{
      const q=window.storageQA;let reads=0;
      const repo=q.createSessionStorage({databaseName:'qa-phrase-legacy-race',legacyStorage:{getItem(){return ++reads===1?'baseline':'changed';}}});
      let code;try{await repo.initialize(q.phraseStateFixture(),'baseline');}catch(e){code=e.code;}
      return {code,kind:(await repo.inspect()).kind};
    });assert.deepEqual(result,{code:'legacy-changed',kind:'empty'});
  });
  await check('explicit migration uses the real normalizer and preserves the original legacy bytes',async()=>{
    const result=await b.evaluate(async()=>{
      const q=window.storageQA,repo=q.createSessionStorage({databaseName:'qa-phrase-normalized-migration'});
      const old=localStorage.getItem(q.STORAGE_KEY);
      const saved=await repo.migrateLegacy(q.normalizeLedgerState,q.phraseStateFixture());
      return {count:saved.state.history.length,phraseCount:saved.state.mistakes.length,
        unchanged:localStorage.getItem(q.STORAGE_KEY)===old,baseline:(await repo.recoveryCopies()).legacy===old};
    });assert.deepEqual(result,{count:1,phraseCount:0,unchanged:true,baseline:true});
  });
  await check('broken or unsupported legacy data cannot silently migrate into an empty app',async()=>{
    const result=await b.evaluate(async()=>{
      const q=window.storageQA;const results=[];
      for(const [i,raw] of ['{broken','null','{}',JSON.stringify(q.phraseStateFixture())].entries()) {
        const repo=q.createSessionStorage({databaseName:`qa-phrase-invalid-legacy-${i}`,legacyStorage:{getItem:()=>raw}});
        let code;try{await repo.migrateLegacy(q.normalizeLedgerState,q.phraseStateFixture());}catch(e){code=e.code;}
        results.push({code,kind:(await repo.inspect()).kind});
      }return results;
    });assert.deepEqual(result,Array.from({length:4},()=>({code:'invalid',kind:'empty'})));
  });
  await check('an inaccessible legacy store blocks migration without writing a snapshot',async()=>{
    const result=await b.evaluate(async()=>{
      const q=window.storageQA,repo=q.createSessionStorage({databaseName:'qa-phrase-denied',legacyStorage:{getItem(){throw new DOMException('Denied','SecurityError');}}});
      let code;try{await repo.initialize(q.phraseStateFixture(),null);}catch(e){code=e.code;}
      return {code,kind:(await repo.inspect()).kind};
    });assert.deepEqual(result,{code:'unavailable',kind:'empty'});
  });
  await check('a newer IndexedDB version is preserved and reported as unsupported',async()=>{
    const result=await b.evaluate(async()=>{
      const db=await new Promise(resolve=>{const r=indexedDB.open('qa-phrase-future-db',2);r.onupgradeneeded=()=>r.result.createObjectStore('future');r.onsuccess=()=>resolve(r.result);});db.close();
      const s=await window.storageQA.createSessionStorage({databaseName:'qa-phrase-future-db'}).inspect();
      return {kind:s.kind,code:s.error.code};
    });assert.deepEqual(result,{kind:'blocked',code:'unsupported'});
  });
  await check('a fresh browser process reopens the committed phrase snapshot',async()=>{
    const profile=mkdtempSync(join(tmpdir(),'tanween-storage-qa-'));
    let persistent;
    try {
      persistent=await chromium.launchPersistentContext(profile);
      let p=await persistent.newPage();await p.goto(`${base}/scripts/qa/phrase-storage.html`);await p.waitForFunction(()=>Boolean(window.storageQA));
      await p.evaluate(async()=>{
        const q=window.storageQA;
        await q.createSessionStorage({databaseName:'qa-phrase-cold-start'}).initialize(q.phraseStateFixture(),null);
      });
      await persistent.close();persistent=await chromium.launchPersistentContext(profile);
      p=await persistent.newPage();await p.goto(`${base}/scripts/qa/phrase-storage.html`);await p.waitForFunction(()=>Boolean(window.storageQA));
      const value=await p.evaluate(async()=>{
        const s=await window.storageQA.createSessionStorage({databaseName:'qa-phrase-cold-start'}).inspect();
        return {kind:s.kind,total:s.current.state.history[0].total,word:s.current.state.mistakes[0].wordText};
      });assert.deepEqual(value,{kind:'ready',total:98,word:'أَعُوذُ'});
    } finally {
      if(persistent)await persistent.close();
      const target=realpathSync(profile),parent=realpathSync(tmpdir());
      assert(target.startsWith(parent+sep) && resolve(target)===resolve(profile) && target.includes('tanween-storage-qa-'));
      rmSync(target,{recursive:true});
    }
  });
  mkdirSync('outputs/phrase-header/storage',{recursive:true});
  writeFileSync('outputs/phrase-header/storage/results.json',JSON.stringify({browser:'Chromium',checks:results},null,2));
} finally {await browser.close();}
