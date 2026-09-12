import test from 'node:test';
import assert from 'node:assert/strict';
import {watchRecordingInterruption} from '../src/lib/recordingInterruption.ts';

function fixture() {
  const track = Object.assign(new EventTarget(), {readyState:'live'});
  const foreground = new EventTarget();
  let calls = 0;
  const watch = watchRecordingInterruption([track], foreground, () => calls++);
  return {track, foreground, watch, count:()=>calls};
}
test('mute, quiet input and visibility changes alone do not interrupt', () => {
  const f=fixture();f.track.dispatchEvent(new Event('mute'));
  f.foreground.dispatchEvent(new Event('visibilitychange'));f.watch.check();
  assert.equal(f.count(),0);f.watch.dispose();
});
test('ended stream reports once, even with duplicate events and foreground check', () => {
  const f=fixture();f.track.readyState='ended';
  f.track.dispatchEvent(new Event('ended'));f.track.dispatchEvent(new Event('ended'));
  f.foreground.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.count(),1);f.watch.dispose();
});
test('foreground catches a missed ended event', () => {
  const f=fixture();f.track.readyState='ended';
  f.foreground.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.count(),1);f.watch.dispose();
});
test('disposed segment cannot interrupt a later recording', () => {
  const f=fixture();f.watch.dispose();f.track.readyState='ended';
  f.track.dispatchEvent(new Event('ended'));f.foreground.dispatchEvent(new Event('visibilitychange'));f.watch.check();
  assert.equal(f.count(),0);
});
