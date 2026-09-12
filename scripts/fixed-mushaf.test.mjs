import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFixedPageGeometry, assertFixedPageMatches, pickFixedWord } from '../src/lib/fixedMushafGeometry.ts';
import { computeMushafFitInlineSize, computeMushafRenderedBlockSize } from '../src/lib/mushafFit.ts';
const word = (wid, x0, x1, role='letter') => ({ wid, text:wid, role, surah:1, ayah:1, line:1, body:[x0,100,x1,180], band:[x0,90,x1,190] });
const source = words => ({ page:1, width:1920, height:3106, image:'test.png', imageSha256:'test', words });

test('tiny envelope overlap cannot move a marker boundary deep into the next word', () => {
  const page=buildFixedPageGeometry(source([word('marker',1243,1396,'ayah-end'),word('next',660,1244)]));
  assert.equal(page.words[1].region[2],1243.5);
  assert.equal(pickFixedWord(page,1200,120)?.wid,'next');
  assert.equal(pickFixedWord(page,1300,120),null);
});

test('all 604 pages retain contiguous ordered regions and word-center ownership', () => {
  for(let p=1;p<=604;p++) {
    const raw=JSON.parse(readFileSync(new URL(`../public/mushaf/1405-artwork-5a5f9f3846158475/p${p}.json`,import.meta.url),'utf8'));
    const before=JSON.stringify(raw), page=buildFixedPageGeometry(raw);
    assert.equal(JSON.stringify(raw),before,'source artwork geometry must not mutate');
    for(let i=0;i<page.words.length;i++) {
      const w=page.words[i], previous=page.words[i-1];
      if(previous?.line===w.line) assert.equal(previous.region[0],w.region[2]);
      const x=(w.body[0]+w.body[2])/2,y=(w.region[1]+w.region[3])/2;
      assert.equal(pickFixedWord(page,x,y)?.wid,w.role==='letter'?w.wid:undefined,`page ${p}: ${w.wid}`);
    }
  }
});
test('overlapping envelopes get independent regions without fragment masks', () => {
  const page=buildFixedPageGeometry(source([word('a',100,200),word('b',50,130)]));
  assert.equal(page.words[0].region[0],page.words[1].region[2]);
  assert.equal(pickFixedWord(page,150,120)?.wid,'a');
  assert.equal(pickFixedWord(page,90,120)?.wid,'b');
});
test('markers and outside-page whitespace never become word targets', () => {
  const page=buildFixedPageGeometry(source([word('a',200,300),word('marker',120,160,'ayah-end'),word('b',20,100)]));
  assert.equal(pickFixedWord(page,140,120),null);
  assert.equal(pickFixedWord(page,0,120),null);
  assert.equal(pickFixedWord(page,250,0),null);
});
test('reversed bodies and duplicate identities fail instead of losing a word', () => {
  assert.throws(()=>buildFixedPageGeometry(source([word('a',20,100),word('b',200,300)])));
  assert.throws(()=>buildFixedPageGeometry(source([word('a',200,300),word('a',20,100)])));
});
test('metadata is matched against the existing semantic page before marking', () => {
  const raw=source([word('a',200,300)]), page=buildFixedPageGeometry(raw);
  const data={page:1,font:'qcf-v1',lines:[{n:1,type:'ayah',centered:false,words:raw.words}]};
  assert.doesNotThrow(()=>assertFixedPageMatches(page,data));
  assert.throws(()=>assertFixedPageMatches(page,{...data,page:2}));
  assert.throws(()=>assertFixedPageMatches({...page,words:[{...page.words[0],text:'changed'}]},data));
});
test('fixed-page fit reserves bottom controls and preserves the requested ratio', () => {
  const ratio=532/(28+3106*508/1920);
  for(const layout of ['full','spread']) {
    const width=computeMushafFitInlineSize({frameInlineSize:1000,frameBlockSize:720,layout,pageAspectRatio:ratio,navigationBlockSize:38});
    const height=computeMushafRenderedBlockSize(width,layout,100,ratio);
    assert.ok(height+38<=720);
  }
});
