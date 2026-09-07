import test from 'node:test';
import assert from 'node:assert/strict';
import { resultPageItems, evidencePageWindow } from '../src/lib/reviewNavigation.ts';

test('short result lists expose every page',()=>{
  assert.deepEqual(resultPageItems(2,3),[1,2,3]);
  assert.deepEqual(resultPageItems(1,1),[1]);
});
test('long result lists keep endpoints and neighbours without duplicate pages',()=>{
  assert.deepEqual(resultPageItems(10,20),[1,'gap',9,10,11,'gap',20]);
  assert.deepEqual(resultPageItems(1,20),[1,2,'gap',20]);
  assert.deepEqual(resultPageItems(20,20),[1,'gap',19,20]);
  assert.deepEqual(resultPageItems(4,8),[1,2,3,4,5,'gap',8]);
});
test('two recorded pages share one spread, but remain separately navigable in single view',()=>{
  assert.deepEqual(evidencePageWindow(1,2,true),{start:0,end:2,size:2});
  assert.deepEqual(evidencePageWindow(1,2,false),{start:1,end:2,size:1});
});
test('long passages keep every page reachable including an odd last page',()=>{
  assert.deepEqual(evidencePageWindow(2,5,true),{start:2,end:4,size:2});
  assert.deepEqual(evidencePageWindow(4,5,true),{start:4,end:5,size:2});
  assert.deepEqual(evidencePageWindow(0,1,true),{start:0,end:1,size:2});
});
