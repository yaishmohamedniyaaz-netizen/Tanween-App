import test from 'node:test';
import assert from 'node:assert/strict';
import { createMushafPageGesture, swipeReleaseDistance } from '../src/lib/mushafPageGesture.ts';
const start = { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true,
  clientX: 100, clientY: 100, width: 390, generation: '581' };
const at = (x, y = 100, id = 1) => ({pointerId: id, clientX: x, clientY: y});

for (const type of ['touch', 'pen']) for (const direction of [-1, 1]) {
  test(`${type}: ${direction > 0 ? 'right advances' : 'left goes back'}, once on release`, () => {
    const g = createMushafPageGesture();
    assert.equal(g.begin({...start, pointerType: type}), true);
    assert.equal(g.move(at(100 + 15 * direction), '581').horizontal, true);
    assert.equal(g.active(), true);
    assert.equal(g.end(at(100 + 80 * direction), '581'), direction);
    assert.equal(g.end(at(100 + 100 * direction), '581'), null);
  });
}
for (const change of [{pointerType:'mouse'}, {pointerType:''}, {pointerType:'unknown'},
  {button:2}, {button:5}, {button:-1}, {isPrimary:false}, {width:0}]) {
  test(`ineligible input ${JSON.stringify(change)} never begins`, () => {
    const g = createMushafPageGesture();
    assert.equal(g.begin({...start,...change}), false);
    assert.equal(g.end(at(200), '581'), null);
  });
}
test('tap, small drift and reversal below release distance do nothing', () => {
  for (const endX of [100, 104, 147]) {
    const g = createMushafPageGesture(); g.begin(start); g.move(at(220),'581');
    assert.equal(g.end(at(endX),'581'),null);
  }
});
test('vertical and diagonal intent cannot later become a page turn', () => {
  for (const p of [at(100,125), at(115,115)]) {
    const g = createMushafPageGesture(); g.begin(start); g.move(p,'581');
    assert.equal(g.move(at(250),'581').horizontal,false);
    assert.equal(g.end(at(250),'581'),null);
  }
});
test('final diagonal release rejects a previously horizontal drag', () => {
  const g=createMushafPageGesture();g.begin(start);g.move(at(125),'581');
  assert.equal(g.end(at(180,200),'581'),null);
});
test('stale page, zoom or session generation cannot navigate', () => {
  const g=createMushafPageGesture();g.begin(start);g.move(at(125),'581');
  assert.equal(g.end(at(250),'582'),null);
});
test('another pointer cannot move, end or replace the owner', () => {
  const g=createMushafPageGesture();g.begin(start);
  assert.equal(g.begin({...start,pointerId:2}),false);
  assert.equal(g.move(at(250,100,2),'581'),null);
  assert.equal(g.end(at(250,100,2),'581'),null);
  assert.equal(g.owns(1),true);g.cancel();
  assert.equal(g.end(at(250),'581'),null);
  assert.equal(g.begin({...start,pointerId:2}),true);
});
test('threshold is in screen pixels and bounded for phone and wide spreads', () => {
  assert.equal(swipeReleaseDistance(320),48);
  assert.equal(swipeReleaseDistance(600),72);
  assert.equal(swipeReleaseDistance(1400),96);
  const g=createMushafPageGesture();g.begin({...start,width:1400});
  assert.equal(g.end(at(180),'581'),null);
  g.begin({...start,width:1400});assert.equal(g.end(at(196),'581'),1);
});
