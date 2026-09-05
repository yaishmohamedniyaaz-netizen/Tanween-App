import test from 'node:test';
import assert from 'node:assert/strict';
import { wordFindingCounts, wordTotalCircle } from '../src/lib/wordFindingSummary.ts';

const categories = ['jali', 'khafi', 'fasaha'];
test('counts distinct active findings, not deduction sizes or repeated aliases', () => {
  const a = { id: 'a', category: 'jali', amount: 6, judgeSeatId: 'judge-a' };
  assert.deepEqual(wordFindingCounts([a, a, { ...a, id: 'b', category: 'khafi', amount: 0.5 }], 'judge-a', categories), [
    { category: 'jali', count: 1 }, { category: 'khafi', count: 1 },
  ]);
});
test('summary follows editable judge scope, legacy ownership and pinpoint criteria', () => {
  const findings = [
    { id: 'a', category: 'jali', judgeSeatId: 'judge-b' },
    { id: 'b', category: 'khafi' },
    { id: 'c', category: 'fasaha', judgeSeatId: 'judge-a' },
    { id: 'd', category: 'adu-raagu', judgeSeatId: 'judge-a' },
  ];
  assert.deepEqual(wordFindingCounts(findings, 'judge-a', ['jali', 'khafi', 'adu-raagu']), [{ category: 'khafi', count: 1 }]);
  assert.deepEqual(wordFindingCounts(findings, undefined, categories), [{ category: 'khafi', count: 1 }]);
});
test('add, recategorise and undo update counts without modifying evidence', () => {
  const original = Object.freeze({ id: 'a', category: 'jali' });
  const second = Object.freeze({ id: 'b', category: 'khafi' });
  assert.equal(wordFindingCounts([original, second], undefined, categories).reduce((s,c)=>s+c.count,0),2);
  assert.deepEqual(wordFindingCounts([original, { ...second, category: 'jali' }], undefined, categories), [{ category: 'jali', count: 2 }]);
  assert.deepEqual(wordFindingCounts([original], undefined, categories), [{ category: 'jali', count: 1 }]);
  assert.equal(original.category, 'jali'); assert.equal(second.category, 'khafi');
  assert.deepEqual(wordFindingCounts([], undefined, categories), []);
});
test('small and later-line words keep their attached circle', () => {
  for (const w of [3,8,16,80]) for(const y of [10,100,500]) {
    const marker=wordTotalCircle({x:100,y,w,h:18},3);
    assert.ok(marker);assert.equal(marker.w,12);assert.equal(marker.h,12);
    assert.equal(marker.x+marker.w*0.4,100+w);
    assert.equal(marker.y+marker.h*0.75,y);
  }
});
test('zero and single findings have no circle', () => {
  const word={x:0,y:0,w:10,h:18};
  for(const total of [0,1,NaN]) assert.equal(wordTotalCircle(word,total),null);
});
test('multi-digit totals remain circular and grow only as needed', () => {
  const word={x:0,y:10,w:8,h:18};
  for(const total of [2,12,100]) {
    const marker=wordTotalCircle(word,total);
    assert.equal(marker.w,marker.h);assert.ok(marker.w>=12);
  }
});
