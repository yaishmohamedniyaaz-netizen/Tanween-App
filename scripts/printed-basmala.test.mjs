import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {printedBasmalaWords} from '../src/lib/printedBasmala.ts';
import {rangeDisplayForPage} from '../src/lib/recitationRangeLayout.ts';
import {createQuestionIndexLookup,resolveQuestionRange} from '../src/lib/questionBank.ts';
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const descriptor=load('src/data/fixedMushafPackage.json');
const measurements=load('src/data/printedBasmalaRegions.json');
const lookup=createQuestionIndexLookup(load('public/question-index.json'));
const page=p=>load(`public/pages/p${p}.json`);

test('all 112 printed Basmalas retain their exact per-surah addresses and artwork',()=>{
  assert.equal(measurements.rows.length,112);
  for(const row of measurements.rows) {
    const data=page(row.page), words=printedBasmalaWords(data).filter(w=>w.line===row.line);
    assert.equal(words.length,4);
    assert.equal(createHash('sha256').update(fs.readFileSync(`public/mushaf/${descriptor.version}/p${row.page}.png`)).digest('hex'),row.imageSha256);
    words.forEach((w,i)=>{
      assert.equal(w.wid,`${row.surah}.b.${i}`);
      assert.equal(w.ayah,null);
      assert(w.region[0]<w.region[2] && w.region[1]<w.region[3]);
      if(i) assert.equal(w.region[2],words[i-1].region[0]);
    });
  }
  assert.equal(printedBasmalaWords(page(1)).length,0,'Al-Fatiha uses its existing numbered ayah');
  assert.equal(measurements.rows.some(r=>r.surah===9),false,'No Basmala invented for At-Tawbah');
});

test('wrong semantic identity disables supplemental input',()=>{
  const data=page(585);
  data.lines[0].words[0].wid='wrong';
  assert.deepEqual(printedBasmalaWords(data),[]);
});

test('surah ornaments follow opening ayah, including the preceding page',()=>{
  const resolved=resolveQuestionRange(lookup,{surah:79,ayah:33},10);
  assert(resolved.ok);
  assert.equal(rangeDisplayForPage(page(584),resolved.range).lineStates.get(15),'question');
  assert(rangeDisplayForPage(page(585),resolved.range).selectedWordIds.has('80.b.0'));
  const startsAtOpening=resolveQuestionRange(lookup,{surah:80,ayah:1},5);
  assert(startsAtOpening.ok);
  assert.equal(rangeDisplayForPage(page(584),startsAtOpening.range).lineStates.get(15),'question');
  const startsLater=resolveQuestionRange(lookup,{surah:80,ayah:2},5);
  assert(startsLater.ok);
  assert.equal(rangeDisplayForPage(page(584),startsLater.range).lineStates.get(15),'context');
  assert.equal(rangeDisplayForPage(page(585),startsLater.range).selectedWordIds.has('80.b.0'),false);
});
