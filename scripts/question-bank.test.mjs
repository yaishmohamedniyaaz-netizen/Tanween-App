import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  createQuestionIndexLookup,
  resolveQuestionRange,
} from "../src/lib/questionBank.ts";
import {
  buildSampleQuestionDrafts,
  createQuestionDraft,
  firstAyahForPortion,
  juzForAyah,
  normalizeQuestionDraft,
  questionDraftIssues,
  rangeIsWithinPortion,
} from "../src/lib/questionDrafts.ts";
import { createSampleCompetition } from "../src/lib/sampleCompetition.ts";
import { createSampleRoster } from "../src/lib/sampleCompetition.ts";
import {
  assignmentFromDraft,
  eligibleQuestionDrafts,
  questionAssignmentIsValid,
} from "../src/lib/reciterQuestions.ts";

const asset = JSON.parse(fs.readFileSync("public/question-index.json", "utf8"));
const lookup = createQuestionIndexLookup(asset);

test("all 604 pages produce one stable boundary for every ayah", () => {
  assert.equal(asset.pageCount, 604);
  assert.equal(asset.entryCount, 6236);
  assert.equal(asset.entries.length, 6236);
  assert.equal(new Set(asset.entries.map((entry) => `${entry[0]}:${entry[1]}`)).size, 6236);
  assert.equal(lookup.byKey.get("2:181")?.endMarkerId, "2.181.14");

  const page27 = JSON.parse(fs.readFileSync("public/pages/p27.json", "utf8"));
  const marker = page27.lines
    .flatMap((line) => line.words ?? [])
    .find((word) => word.wid === "2.181.14");
  assert.equal(marker?.role, "ayah-end");
});

test("seven printed lines resolve to the first complete ayah ending", () => {
  const fatiha = resolveQuestionRange(lookup, { surah: 1, ayah: 1 }, 7);
  assert.equal(fatiha.ok, true);
  assert.deepEqual(fatiha.ok && fatiha.range.endAyah, { surah: 1, ayah: 7 });
  assert.equal(fatiha.ok && fatiha.range.resolvedLines, 7);
  assert.equal(fatiha.ok && fatiha.range.extensionLines, 0);

  const page27 = resolveQuestionRange(lookup, { surah: 2, ayah: 177 }, 7);
  assert.equal(page27.ok, true);
  assert.deepEqual(page27.ok && page27.range.endAyah, { surah: 2, ayah: 177 });
  assert.equal(page27.ok && page27.range.endMarkerId, "2.177.51");
});

test("the resolver crosses pages and reports extensions without hiding them", () => {
  const crossPage = resolveQuestionRange(lookup, { surah: 2, ayah: 180 }, 7);
  assert.equal(crossPage.ok, true);
  assert.ok(crossPage.ok && crossPage.range.endPage > crossPage.range.startPage);
  assert.ok(crossPage.ok && crossPage.range.resolvedLines >= 7);

  const extendedStart = lookup.ayahs.find((start, startOrdinal) => {
    const targetLine = start.startGlobalLine + 6;
    const end = lookup.ayahs
      .slice(startOrdinal)
      .find((ayah) => ayah.endGlobalLine >= targetLine);
    return end && end.endGlobalLine > targetLine;
  });
  assert.ok(extendedStart);
  const extended = resolveQuestionRange(lookup, extendedStart, 7);
  assert.equal(extended.ok, true);
  assert.ok(extended.ok && extended.range.extensionLines > 0);
});

test("invalid and Quran-end starts fail explicitly", () => {
  assert.deepEqual(resolveQuestionRange(lookup, { surah: 1, ayah: 1 }, 0), {
    ok: false,
    reason: "invalid-target",
  });
  assert.deepEqual(resolveQuestionRange(lookup, { surah: 115, ayah: 1 }, 7), {
    ok: false,
    reason: "start-not-found",
  });
  const finalAyah = resolveQuestionRange(lookup, { surah: 114, ayah: 6 }, 7);
  assert.equal(finalAyah.ok, false);
  assert.equal(!finalAyah.ok && finalAyah.reason, "insufficient-lines");
  assert.equal(!finalAyah.ok && finalAyah.availableLines, 1);
});

test("every possible seven-line start resolves deterministically or reports the Quran end", () => {
  for (const start of lookup.ayahs) {
    const result = resolveQuestionRange(lookup, start, 7);
    const availableLines = asset.recitationLineCount - start.startGlobalLine;
    if (availableLines < 7) {
      assert.equal(result.ok, false, `${start.surah}:${start.ayah}`);
      assert.equal(!result.ok && result.reason, "insufficient-lines");
      continue;
    }
    assert.equal(result.ok, true, `${start.surah}:${start.ayah}`);
    assert.ok(result.ok && result.range.resolvedLines >= 7);
    assert.equal(result.ok && result.range.startWordId, start.firstWordId);
    assert.match(result.ok ? result.range.layoutHash : "", /^sha256:/);
  }
});

test("division limits use exact ayah-level juz and surah boundaries", () => {
  assert.equal(juzForAyah({ surah: 2, ayah: 141 }), 1);
  assert.equal(juzForAyah({ surah: 2, ayah: 142 }), 2);
  assert.equal(juzForAyah({ surah: 78, ayah: 1 }), 30);
  assert.deepEqual(firstAyahForPortion({ kind: "juz-range", startJuz: 30, endJuz: 30 }), { surah: 78, ayah: 1 });
  assert.equal(rangeIsWithinPortion(
    { startAyah: { surah: 78, ayah: 1 }, endAyah: { surah: 114, ayah: 6 } },
    { kind: "juz-range", startJuz: 30, endJuz: 30 },
  ), true);
  assert.equal(rangeIsWithinPortion(
    { startAyah: { surah: 77, ayah: 50 }, endAyah: { surah: 78, ayah: 2 } },
    { kind: "juz-range", startJuz: 30, endJuz: 30 },
  ), false);
  assert.equal(rangeIsWithinPortion(
    { startAyah: { surah: 2, ayah: 1 }, endAyah: { surah: 3, ayah: 1 } },
    { kind: "surah-range", startSurah: 2, endSurah: 2 },
  ), false);
});

test("drafts retain exact provenance and become stale instead of silently changing", () => {
  const competition = createSampleCompetition();
  const division = competition.divisions.find((item) => item.quranPortion.kind === "full-quran");
  assert.ok(division);
  const resolution = resolveQuestionRange(lookup, { surah: 1, ayah: 1 }, 7);
  assert.equal(resolution.ok, true);
  const draft = createQuestionDraft({
    id: "draft-1",
    competition,
    divisionId: division.id,
    range: resolution.range,
    note: "Reviewer note",
    now: 1000,
  });
  assert.equal(draft.layoutHash, asset.layoutHash);
  assert.equal(draft.questionIndexVersion, asset.version);
  assert.equal(draft.createdAt, 1000);
  assert.deepEqual(questionDraftIssues({
    draft,
    competition,
    policy: competition.questionPolicy,
    lookup,
  }), []);
  assert.match(questionDraftIssues({
    draft,
    competition,
    policy: { ...competition.questionPolicy, targetRecitationLines: 8 },
    lookup,
  })[0], /target line rule changed/);
  assert.equal(normalizeQuestionDraft({ ...draft, layoutHash: "unversioned" }), null);
});

test("the sample competition includes normal, cross-page, and extended draft fixtures", () => {
  const competition = createSampleCompetition();
  const drafts = buildSampleQuestionDrafts(lookup, competition);
  assert.equal(drafts.length, 160);
  assert.ok(drafts.some((draft) => draft.resolvedLines === 7));
  assert.ok(drafts.some((draft) => draft.endPage > draft.startPage));
  assert.ok(drafts.some((draft) => draft.extensionLines > 0));
  assert.ok(drafts.every((draft) => draft.isSample && draft.competitionId === competition.id));
  for (const division of competition.divisions) {
    const divisionDrafts = drafts.filter((draft) => draft.divisionId === division.id);
    assert.equal(divisionDrafts.length, 40);
    for (const side of ["feshey-kolhu", "nimey-kolhu"]) {
      const sideDrafts = divisionDrafts.filter((draft) => draft.muqarrar === side);
      assert.equal(sideDrafts.length, 20);
      assert.equal(
        new Set(sideDrafts.map((draft) => `${draft.startAyah.surah}:${draft.startAyah.ayah}`)).size,
        20,
      );
      assert.ok(sideDrafts.every((draft) => rangeIsWithinPortion(draft, division.quranPortion)));
    }
  }
});

test("question tiles are filtered by division and muqarrar before a session can start", () => {
  const competition = createSampleCompetition();
  const participant = createSampleRoster()[0];
  const drafts = buildSampleQuestionDrafts(lookup, competition);
  const eligible = eligibleQuestionDrafts({
    participant,
    divisions: competition.divisions,
    drafts,
    competitionId: competition.id,
  });
  assert.equal(eligible.length, 20);
  assert.ok(eligible.every((draft) => draft.muqarrar === participant.muqarrar));

  const question = assignmentFromDraft({ draft: eligible[0], participant, selectedAt: 1000 });
  assert.ok(question);
  assert.equal(question.label, `${eligible[0].startAyah.surah}:${eligible[0].startAyah.ayah}–${eligible[0].endAyah.surah}:${eligible[0].endAyah.ayah}`);
  assert.equal(questionAssignmentIsValid({
    question,
    participant,
    divisions: competition.divisions,
    drafts,
    competitionId: competition.id,
    allowManual: true,
  }), true);
  assert.equal(questionAssignmentIsValid({
    question: { ...question, muqarrar: "nimey-kolhu" },
    participant,
    divisions: competition.divisions,
    drafts,
    competitionId: competition.id,
    allowManual: true,
  }), false);
});
