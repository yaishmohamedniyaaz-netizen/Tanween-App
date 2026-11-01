import { chromium } from 'playwright';
const OUT=process.argv[2]||'.';
const PICK=[['1.1.0','س','khafi'],['1.1.2','ح','jali'],['1.6.2','ق','jali'],['1.7.0','ص','fasaha'],['1.7.2','ع','khafi'],['1.7.3','ه','jali']];
const b = await chromium.launch();
for (const t of ['light','dark']) {
  const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2}); const m=await ctx.newPage();
  await m.addInitScript((t)=>{localStorage.setItem('tahqeeq.hintSeen.assignedRail.v1','1');localStorage.setItem('tanween.phrases.help.v1','seen');localStorage.setItem('tahqeeq:devicePreferences.v5',JSON.stringify({version:5,theme:t,judgeRailSide:'left'}));},t);
  await m.goto(`http://127.0.0.1:5320/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=1&qaAyah=1&qaLines=7`);
  await m.getByRole('button',{name:'Load prepared mobile sample'}).click(); await m.waitForTimeout(600);
  await m.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Begin judging/.test(b.textContent))?.click());
  await m.waitForFunction(()=>window.providerQA?.state?.sessionActive); await m.waitForTimeout(2000);
  await m.mouse.move(5,890); await m.waitForTimeout(800);
  const rect = async()=> m.evaluate(()=>{const ps=[...document.querySelectorAll('.mushaf-scroll .page')].filter(p=>p.offsetParent&&p.getBoundingClientRect().width>0);return ps.map(p=>{const r=p.getBoundingClientRect();const img=p.querySelector('img');const ir=img?img.getBoundingClientRect():null;return {x:r.x,y:r.y,w:r.width,h:r.height,num:p.dataset.page||p.getAttribute('data-page'),img:ir&&{x:ir.x,y:ir.y,w:ir.width,h:ir.height,src:img.getAttribute('src')}}})});
  const r0=await rect(); console.log(t,'pages',JSON.stringify(r0));
  await m.screenshot({path:`${OUT}/clean-${t}.png`});
  const added = await m.evaluate(async (PICK)=>{
    const {loadPage}=await import('/src/lib/page.ts'); const J=await import('/src/lib/judgingUnits.ts');
    const {state,dispatch}=window.providerQA; const page=await loadPage(1);
    const words=page.lines.flatMap(l=>"words" in l?l.words:[]);
    const out=[];
    PICK.forEach(([wid,g,cat],i)=>{
      const word=words.find(w=>w.wid===wid); if(!word){out.push('miss '+wid);return;}
      const units=J.judgingTargetsOf(word.text,word.role,word.wid); const unit=units.find(u=>u.primaryGlyph===g)||units[0];
      dispatch({type:'ADD_MISTAKE',mistake:{id:`hl:${unit.tid}`,tid:unit.tid,wordId:word.wid,wordText:word.text,surah:word.surah,ayah:word.ayah,page:1,glyph:unit.fullGlyph,primaryGlyph:unit.primaryGlyph,fullGlyph:unit.fullGlyph,sourceStart:unit.start,sourceEnd:unit.end,targetVersion:2,sourceVersion:J.TARGET_SOURCE_VERSION,ruleVersion:J.TARGET_RULE_VERSION,label:`${word.surah}:${word.ayah}`,category:cat,amount:state.config[cat]?.step??1,ts:Date.now()+i}});
      out.push(`${word.text} ${unit.primaryGlyph} ${cat}`);
    });
    return out;
  }, PICK);
  console.log(t, added.join(' | '));
  await m.mouse.move(5,890); await m.waitForTimeout(1500);
  await m.screenshot({path:`${OUT}/marked-${t}.png`});
  const marks = await m.evaluate(()=>[...document.querySelectorAll('.glyph-ink.marked')].map(e=>{const r=e.getBoundingClientRect();return {cls:e.className,x:r.x,y:r.y,w:r.width,h:r.height}}));
  console.log(JSON.stringify(marks));
  await ctx.close();
}
await b.close();
