import test from 'node:test';
import assert from 'node:assert/strict';
import { fitMushafLine, pickMushafWord, mushafPageScale, MUSHAF_WORD_GAP_EM } from '../src/lib/mushafGeometry.ts';

test('page scale uses compact surface reference without changing desktop geometry', () => {
  for (const reference of [512, 516, 532]) {
    for (const scale of [.5, .65, 1, 1.1]) {
      const page = {dataset:{referenceWidth:String(reference)}, getBoundingClientRect:()=>({width:reference*scale})};
      assert.ok(Math.abs(mushafPageScale(page)-scale)<1e-10);
      for (const point of [0, 40, 500, 820]) {
        assert.ok(Math.abs(point*scale/mushafPageScale(page)-point)<1e-9);
      }
    }
  }
  for (const value of [undefined, '', 'invalid', '-1']) {
    assert.equal(mushafPageScale({dataset:{referenceWidth:value},getBoundingClientRect:()=>({width:266})}),.5);
  }
});

test('line fitting accounts for ink beyond both sides of advance boxes', () => {
  const words = [
    {advance:1,left:-.2,right:1.3,ascent:.8,descent:.3},
    {advance:2,left:.15,right:1.7,ascent:1.1,descent:.5},
  ];
  const fit = fitMushafLine(460, words);
  assert.ok(fit);
  const span = words.reduce((n,w) => n + (w.right-w.left)*fit.fontSize, 0) + fit.gap;
  assert.ok(Math.abs(span-460)<1e-9);
  assert.equal(fit.gap / fit.fontSize, MUSHAF_WORD_GAP_EM);
  const small = fitMushafLine(230, words);
  assert.equal(small.fontSize, fit.fontSize/2);
  assert.equal(small.gap, fit.gap/2);
  assert.equal(words[0].advance, 1, 'source metrics are not rewritten');
});

test('empty and unavailable geometry does not create invalid CSS', () => {
  assert.equal(fitMushafLine(0, []), null);
  assert.equal(fitMushafLine(460, []), null);
  assert.equal(fitMushafLine(NaN, []), null);
});

test('a short word wins over neighboring touch padding, with forgiving gap taps', () => {
  const short={id:'short',x:0,y:0,w:8,h:20,hx:-3,hy:-5,hw:14,hh:30};
  const long={id:'long',x:10,y:0,w:70,h:20,hx:7,hy:-5,hw:76,hh:30};
  assert.equal(pickMushafWord([short,long],7.5,10)?.id,'short');
  assert.equal(pickMushafWord([short,long],11,10)?.id,'long');
  assert.equal(pickMushafWord([short,long],-2,10)?.id,'short');
  assert.equal(pickMushafWord([short,long],100,100),null);
});
