import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { JudgingProvider, useJudging } from '../../src/state/store';
import { RecitationEvidenceSpan } from '../../src/components/RecitationEvidenceSpan';
import { loadQuestionIndex, resolveQuestionRange, QUESTION_INDEX_VERSION } from '../../src/lib/questionBank';
import { MUSHAF_LAYOUT } from '../../src/lib/page';
import type { RecitationRangeSnapshot } from '../../src/types';
import '../../src/styles/global.css';
if (location.hostname !== '127.0.0.1' || location.port !== '5295') throw new Error('Local QA only');
function EvidenceCheck() {
  const { state } = useJudging();
  const [range, setRange] = useState<RecitationRangeSnapshot | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [replay, setReplay] = useState<string | null>(null);
  const [wordIds, setWordIds] = useState<Set<string> | null>(null);
  useEffect(() => { void loadQuestionIndex().then(index => {
    const params = new URLSearchParams(location.search);
    const explicit = params.get('start')?.split(':').map(Number);
    const start = explicit?.length === 2 ? { surah: explicit[0], ayah: explicit[1] }
      : state.activeQuestion?.version === 2 ? state.activeQuestion.range?.startAyah : null;
    if (!start) return;
    const result = resolveQuestionRange(index, start, Number(new URLSearchParams(location.search).get('lines')) || 20);
    if (result.ok) setRange({ version: 1, ...result.range, mushafLayout: MUSHAF_LAYOUT, questionIndexVersion: QUESTION_INDEX_VERSION });
  }); }, []);
  const mistakes = useMemo(() => state.mistakes.map((mistake, i) => ({ key: `test-${i}`, mistake,
    sessionId: 'fixed-preview', sessionRevision: 1, judgeSeatId: 'test', judgeName: 'Test judge' })), [state.mistakes]);
  return <main style={{ maxWidth: 1100, margin: 'auto', padding: 12 }}>
    {range && <RecitationEvidenceSpan range={range} mistakes={mistakes} activeMistakeKey={selected}
      focusActiveWord onMistakeSelect={setSelected} onReplayWordSelect={setReplay} onWordIdsReady={setWordIds} replayWordId={replay} />}
    <output id="evidence-check">{JSON.stringify({ selected, replay, wordCount: wordIds?.size })}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<JudgingProvider><EvidenceCheck /></JudgingProvider>);
