import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calibratedMobileFit, calibratedMobilePaper, mobileInkBounds, mobileCalibrationEnabled } from '../src/lib/mobileCalibration.ts';

test('calibration is explicit and does not replace existing presentation',()=>{
  assert.equal(mobileCalibrationEnabled(''),false);
  assert.equal(mobileCalibrationEnabled('?mobileCalibration=0'),false);
  assert.equal(mobileCalibrationEnabled('?mobileCalibration=1'),true);
});
test('all 604 pages preserve ink and share the artwork/semantic transform',()=>{
  for(let page=1;page<=604;page++) {
    const [top,bottom]=mobileInkBounds(page);
    assert.ok(top>=0 && top<bottom && bottom<=3106);
    for(const [width,height] of [[382,656],[422,732],[312,350]]) {
      const {base}=calibratedMobileFit(width,height,page);
      const paper=calibratedMobilePaper(base,page),scale=base/paper.width;
      assert.ok(base<=width);
      assert.ok(paper.height*scale+6+38<=height+.001);
      assert.ok(Math.abs((paper.top+top*paper.artScale)*scale-8)<.001);
      assert.ok(Math.abs((paper.height-paper.top-bottom*paper.artScale)*scale-8)<.001);
      assert.equal(paper.artScale,508/1920);
    }
  }
});
test('reference devices reproduce the selected page-601 fit to rounding tolerance',()=>{
  for(const [w,h,expectedW,expectedH] of [[382,622,362,578],[422,698,411,654]]) {
    const {base}=calibratedMobileFit(w,h,601),paper=calibratedMobilePaper(base,601);
    assert.ok(Math.abs(base-expectedW)<=1);
    assert.ok(Math.abs(paper.height*base/paper.width-expectedH)<=2);
  }
});
test('calibration stylesheet is portrait-only and does not edit saved state',()=>{
  const css=readFileSync('src/components/mobileCalibration.css','utf8');
  assert.match(css,/@media \(max-width: 600px\) and \(orientation: portrait\)/);
  assert.match(css,/grid-template-columns: 28.9px 26.2px 28.9px/);
  assert.match(css,/padding: 6px 0 0/);
  assert.doesNotMatch(readFileSync('src/lib/mobileCalibration.ts','utf8'),/localStorage|dispatch\(/);
});
