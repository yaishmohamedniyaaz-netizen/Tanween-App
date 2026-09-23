import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { phraseFixture, savedPhraseFixture, phraseTestCompetition, phraseStateFixture as stateFixture } from './qa/phrase-evidence-fixtures.ts';
import { RECITATION_PHRASES } from '../src/lib/recitationPhrases.ts';
import { judgingTargetsOf } from '../src/lib/judgingUnits.ts';
import { isPhraseMistakeSnapshot, hasNonQuranEvidence, hasPhraseEvidence } from '../src/lib/phraseEvidence.ts';
import { projectMistakes } from '../src/lib/judgingLedger.ts';
import { buildJudgeResultPackage, parseJudgeResultPackage, buildStateBackup, parseStateBackup, readJudgeResultFile, readStateBackupFile } from '../src/lib/resultPackages.ts';
import { computeCategoryScores } from '../src/lib/scoring.ts';
import { buildTargetMigrationPatches } from '../src/state/migrateTargets.ts';
import { mistakeLocationReference } from '../src/lib/mistakeDisplay.ts';
import { buildJudgeRecordsWorkbook, verifyJudgeRecordsWorkbook } from '../src/lib/judgeRecordsWorkbook.ts';
import { buildCompetitionResults } from '../src/lib/competitionResults.ts';

const temporary = mkdtempSync(join(tmpdir(),'tanween-phrase-readers-'));
const compiled = join(temporary,'readers.cjs');
const oldCompiled = join(temporary,'old-readers.cjs');
buildSync({entryPoints:['scripts/qa/phrase-evidence-entry.ts'],outfile:compiled,bundle:true,
  platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},logLevel:'silent'});
const {normalizeSavedSession,normalizeImportedSavedSession,buildSessionPayload} = createRequire(import.meta.url)(compiled);
// Execute the actual pre-change reader, not an imitation of its schema check.
buildSync({stdin:{contents:execFileSync('git',['show','ca19494071c03eacab364067eb88e9a567cea83a:src/lib/resultPackages.ts'],{encoding:'utf8'}),loader:'ts',resolveDir:process.cwd()},
  outfile:oldCompiled,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const oldReader=createRequire(import.meta.url)(oldCompiled);
after(()=>{unlinkSync(compiled);unlinkSync(oldCompiled);rmdirSync(temporary);});
const clone=value=>structuredClone(value);
const pack=session=>buildJudgeResultPackage(session,phraseTestCompetition);

test('every reviewed word and letter validates against the exact Arabic catalogue',()=>{
  let count=0;
  for(const phrase of RECITATION_PHRASES) for(let wordIndex=0;wordIndex<phrase.words.length;wordIndex++) {
    const units=judgingTargetsOf(phrase.words[wordIndex],'letter','fixture');
    for(let unitIndex=0;unitIndex<units.length;unitIndex++) {
      assert.equal(isPhraseMistakeSnapshot(phraseFixture({phraseId:phrase.id,wordIndex,unitIndex})),true);count++;
    }
  }
  assert.ok(count>45);
});
test('damaged source, offset, identity, version and Quran coordinates are rejected',()=>{
  const changes=[{wordText:'اعوذ'},{sourceStart:999},{sourceEnd:999},{glyph:'ب'},{primaryGlyph:'ب'},
    {wordId:'1:1:1'},{tid:'1:1:1@u0'},{sourceVersion:'future'},{ruleVersion:'future'},
    {surah:1},{ayah:null},{page:1},{amount:-1},{amount:Infinity},{ts:NaN},{judgeSeatId:''},
    {phrase:{...phraseFixture().phrase,catalogueVersion:'future'}},
    {phrase:{...phraseFixture().phrase,occurrenceId:'\ud800'}},
    {phrase:{...phraseFixture().phrase,wordIndex:99}}];
  for(const change of changes) assert.equal(isPhraseMistakeSnapshot({...phraseFixture(),...change}),false,JSON.stringify(change));
});
test('explicit occurrences have distinct targets without inferring a repeat rule',()=>{
  assert.notEqual(phraseFixture().tid,phraseFixture({occurrenceId:'explicit-fixture-2'}).tid);
});

test('a new identity cannot stack a second active deduction on the same phrase letter',()=>{
  const first=phraseFixture(), second={...first,id:'duplicate-target-new-identity'};
  assert.throws(()=>pack(savedPhraseFixture([first,second])),/conflicting finding/);
  const session=savedPhraseFixture([first]);
  session.events.push({id:'undo-original',at:110,type:'mistake_undone',mistake:first},
    {id:'new-mark',at:120,type:'mistake_added',mistake:second},
    {id:'restore-original',at:130,type:'mistake_restored',mistake:first});
  session.mistakes=projectMistakes(session.events);
  assert.throws(()=>pack(session),/conflicting finding/);
});
test('ledger projection owns its nested target and corrects without adding a deduction',()=>{
  const session=savedPhraseFixture(), original=clone(session);
  const projected=projectMistakes(session.events);projected[0].phrase.wordIndex=99;
  assert.deepEqual(session,original);
  const mark=session.mistakes[0];
  session.events.push({id:'correct',type:'mistake_recategorized',at:110,mistakeId:mark.id,glyph:mark.glyph,label:mark.label,from:'jali',to:'khafi',fromAmount:2,toAmount:1});
  session.mistakes=projectMistakes(session.events);
  assert.equal(session.mistakes.length,1);assert.equal(computeCategoryScores(session.config,session.mistakes).total,99);
  assert.doesNotThrow(()=>pack(session));
  const corrected=clone(session.mistakes[0]);
  session.events.push({id:'undo',type:'mistake_undone',at:120,mistake:corrected});
  session.mistakes=projectMistakes(session.events);
  assert.equal(session.mistakes.length,0);assert.equal(hasPhraseEvidence(session),true);
  assert.equal(pack(session).schema,'judge-result-v2');
  session.events.push({id:'restore',type:'mistake_restored',at:130,mistake:corrected});
  session.mistakes=projectMistakes(session.events);
  assert.equal(session.mistakes.length,1);assert.equal(pack(session).session.mistakes[0].amount,1);
});
test('reader round trips preserve exact evidence, completed totals and normalization',()=>{
  const session=savedPhraseFixture([phraseFixture(),phraseFixture({phraseId:'closing'})]);
  const payload=pack(session);
  assert.deepEqual(parseJudgeResultPackage(JSON.parse(JSON.stringify(payload))).session,JSON.parse(JSON.stringify(session)));
  const normalized=normalizeImportedSavedSession(session);
  assert.equal(normalized.total,96);assert.equal(normalized.ledgerVersion,3);
  assert.deepEqual(normalized.mistakes,session.mistakes);
  assert.deepEqual(normalizeSavedSession(normalized),normalized);
  const state=stateFixture(normalized),backup=buildStateBackup(state);
  assert.equal(backup.schema,'state-backup-v2');assert.deepEqual(parseStateBackup(clone(backup)),state);
  const row=buildCompetitionResults(state).rows[0];
  assert.ok(row);assert.equal(row.view.preview.total,96);
});
test('old readers reject new files and new readers reject downgraded or disguised phrase files',()=>{
  const payload=pack(savedPhraseFixture()),backup=buildStateBackup(stateFixture());
  assert.throws(()=>oldReader.parseJudgeResultPackage(payload));assert.throws(()=>oldReader.parseStateBackup(backup));
  assert.throws(()=>parseJudgeResultPackage({...payload,schema:'judge-result-v1'}));
  assert.throws(()=>parseStateBackup({...backup,schema:'state-backup-v1'}));
  const stripped=clone(payload);stripped.schema='judge-result-v1';delete stripped.minimumReaderVersion;stripped.session.ledgerVersion=2;
  for(const mark of [stripped.session.mistakes[0],stripped.session.events[1].mistake]) {delete mark.evidenceKind;delete mark.phrase;mark.surah=1;mark.ayah=1;}
  assert.equal(hasNonQuranEvidence(stripped.session),true);assert.throws(()=>parseJudgeResultPackage(stripped));
});
test('identity conflicts, stale caches and impossible phrase corrections fail closed',()=>{
  const mutations=[
    p=>{p.session.assignment.judgeSeatId='other';},
    p=>{p.session.mistakes[0].amount=3;},
    p=>{p.minimumReaderVersion=99;},
    p=>{p.session.events.push(clone(p.session.events[1]));},
    p=>{p.session.events[0].sessionId='other';},
    p=>{p.session.assignment.categories=['fasaha'];p.session.events[0].assignment.categories=['fasaha'];},
    p=>{const m=p.session.mistakes[0];p.session.events.push({id:'bad',type:'mistake_amount_changed',at:120,mistakeId:m.id,glyph:m.glyph,label:m.label,from:999,to:3});m.amount=3;},
    p=>{const m=phraseFixture({wordIndex:1});m.id=p.session.mistakes[0].id;p.session.events.push({id:'reuse',type:'mistake_added',at:120,mistake:m});p.session.mistakes=[m];},
    p=>{p.session.events[1].type='mistake_restored';},
  ];
  for(const mutate of mutations){const p=clone(pack(savedPhraseFixture()));mutate(p);assert.throws(()=>parseJudgeResultPackage(p));}
});
test('legacy Quran formats remain readable by both generations',()=>{
  const q={id:'q1',tid:'1:1:1@u0',surah:1,ayah:1,glyph:'ب',label:'1:1',category:'jali',amount:2,ts:100};
  const session={...savedPhraseFixture([q]),ledgerVersion:2};
  const p=pack(session);assert.equal(p.schema,'judge-result-v1');assert.equal(p.minimumReaderVersion,undefined);
  assert.deepEqual(parseJudgeResultPackage(p),oldReader.parseJudgeResultPackage(p));
  const b=buildStateBackup(stateFixture(session));assert.equal(b.schema,'state-backup-v1');
  assert.deepEqual(parseStateBackup(b),oldReader.parseStateBackup(b));
  const mixed=stateFixture();mixed.history.push({...session,id:'legacy-no-ledger',events:undefined});
  assert.doesNotThrow(()=>parseStateBackup(buildStateBackup(mixed)));
});
test('file-import entry points accept validated phrase evidence and retain its targets',async()=>{
  const result=await readJudgeResultFile(new File([JSON.stringify(pack(savedPhraseFixture()))],'fixture.json'));
  assert.deepEqual(result.session.mistakes,savedPhraseFixture().mistakes);
  const state=await readStateBackupFile(new File([JSON.stringify(buildStateBackup(stateFixture()))],'fixture.json'));
  assert.deepEqual(state.mistakes,stateFixture().mistakes);
});

test('imported conflict copies retain original phrase identity through backup and reopen',()=>{
  const session=savedPhraseFixture();session.sourceSessionId=session.id;session.id+=':import:copy';session.conflictsWith=session.sourceSessionId;
  assert.doesNotThrow(()=>pack(session));
  const state=stateFixture(session);
  assert.doesNotThrow(()=>buildStateBackup({...state,mistakes:[],events:[],activeSessionId:null,sessionActive:false}));
  state.events.push({id:'reopen-copy',at:250,type:'session_reopened',sessionId:session.id,reason:'Correction'});
  assert.doesNotThrow(()=>buildStateBackup(state));
});
test('Quran migration never requests a page for phrase evidence',async()=>{
  let loads=0;
  const patches=await buildTargetMigrationPatches(stateFixture(),async()=>{loads++;throw Error('no Quran page');});
  assert.equal(loads,0);assert.deepEqual(patches,{});
});
test('JSON and workbook readers retain Arabic without invented Quran references',async()=>{
  const session=savedPhraseFixture(),m=session.mistakes[0];
  const json=buildSessionPayload(stateFixture(session));assert.equal(json.schema,4);
  assert.equal(json.mistakes[0].wordText,m.wordText);assert.equal(json.mistakes[0].surah,undefined);
  assert.equal(mistakeLocationReference(m),'Starting phrase');assert.equal(mistakeLocationReference(phraseFixture({phraseId:'closing'})),'Ending phrase');
  const buffer=await buildJudgeRecordsWorkbook([session],'sample',{competition:phraseTestCompetition});
  await verifyJudgeRecordsWorkbook(buffer,[session],'sample');
  const {read,utils}=await import('xlsx');const workbook=read(buffer,{type:'array'});
  const rows=utils.sheet_to_json(workbook.Sheets.Mistakes,{defval:'',raw:false});
  assert.equal(rows[0]['Evidence type'],'Phrase mistake');assert.equal(rows[0].Surah,'');assert.equal(rows[0].Ayah,'');
  assert.equal(rows[0].Kalimah,m.wordText);assert.equal(rows[0].Letter,m.fullGlyph);
});
