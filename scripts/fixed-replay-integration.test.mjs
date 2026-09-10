import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evidencePageWindow} from '../src/lib/reviewNavigation.ts';
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');

test('fixed review loads exactly its displayed page window', () => {
  const source=read('src/components/RecitationEvidenceSpan.tsx');
  assert.match(source,/rangePages\.slice\(pageWindow.start, pageWindow.end\)/);
  assert.match(source,/paginated \? spread && \(!fixedReview \|\| !compact\)/);
  assert.deepEqual(evidencePageWindow(2,3,true),{start:2,end:3,size:2});
  assert.deepEqual(evidencePageWindow(1,3,false),{start:1,end:2,size:1});
});

test('artwork and review share ratio, breakpoint and single marked-word action', () => {
  const workspace=read('src/components/ParticipantReviewWorkspace.tsx');
  const evidence=read('src/components/RecitationEvidenceSpan.tsx');
  assert.match(workspace,/fixedReview \? "\(max-width: 900px\)"/);
  assert.match(workspace,/fixedReview \? FIXED_PAGE_ASPECT_RATIO/);
  assert.match(evidence,/onClick=\{\(\) => onMistakeSelect\(firstMistake.key\)\}/);
  assert.match(evidence,/focusedRequest.current === requestKey/);
  assert.match(evidence,/if \(!target \|\| !target.getClientRects\(\).length\) return/);
});

test('integration retains new live renderer and existing preference default', () => {
  const app=read('src/App.tsx');
  assert.match(app,/fixedReview \? ConnectedFixedMushaf : Mushaf/);
  assert.match(app,/<RecordsView pageLayout=\{preferences.mushafLayout\}/);
  assert.match(read('src/lib/devicePreferences.ts'),/slimScorePanel: false/);
});

test('docking moves only the controls, not the audio element or playback owner', () => {
  const player=read('src/components/RecitationReplayPlayer.tsx');
  const workspace=read('src/components/ParticipantReviewWorkspace.tsx');
  assert.match(player, /<ReplayTransportSlot target=\{toolsOpen \? toolsTransport : context.transportTarget\}>/);
  assert.ok(player.indexOf('</ReplayTransportSlot>') < player.indexOf('<audio ref={audioRef}'));
  const segment = player.slice(player.indexOf('function ReviewSegment('));
  assert.ok(segment.indexOf('</ReplayTransportSlot>') < segment.indexOf('className="replay-direct"'));
  assert.match(player, /target \? createPortal\(children, target\) : children/);
  assert.equal((player.match(/<audio /g)||[]).length, 1);
  assert.match(workspace, /const docked = replayPrototype && dockFits/);
  assert.match(workspace, /transportTarget: docked \? transportTarget : null/);
  assert.match(workspace, /hidden=\{!docked\}/);
  assert.match(workspace, /observer\.disconnect\(\)/);
});
