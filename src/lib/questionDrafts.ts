import type {
  CompetitionConfig,
  CompetitionDivision,
  CompetitionQuestionDraft,
  CompetitionQuestionPolicy,
  QuestionMuqarrar,
  QuranPortion,
} from "../types.ts";
import {
  QUESTION_INDEX_VERSION,
  resolveQuestionRange,
  type AyahRef,
  type QuestionIndexLookup,
  type QuestionRange,
} from "./questionBank.ts";

const JUZ_STARTS: Array<AyahRef & { juz: number }> = [
  { juz: 1, surah: 1, ayah: 1 },
  { juz: 2, surah: 2, ayah: 142 },
  { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 93 },
  { juz: 5, surah: 4, ayah: 24 },
  { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 },
  { juz: 8, surah: 6, ayah: 111 },
  { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
  { juz: 11, surah: 9, ayah: 93 },
  { juz: 12, surah: 11, ayah: 6 },
  { juz: 13, surah: 12, ayah: 53 },
  { juz: 14, surah: 15, ayah: 1 },
  { juz: 15, surah: 17, ayah: 1 },
  { juz: 16, surah: 18, ayah: 75 },
  { juz: 17, surah: 21, ayah: 1 },
  { juz: 18, surah: 23, ayah: 1 },
  { juz: 19, surah: 25, ayah: 21 },
  { juz: 20, surah: 27, ayah: 56 },
  { juz: 21, surah: 29, ayah: 46 },
  { juz: 22, surah: 33, ayah: 31 },
  { juz: 23, surah: 36, ayah: 28 },
  { juz: 24, surah: 39, ayah: 32 },
  { juz: 25, surah: 41, ayah: 47 },
  { juz: 26, surah: 46, ayah: 1 },
  { juz: 27, surah: 51, ayah: 31 },
  { juz: 28, surah: 58, ayah: 1 },
  { juz: 29, surah: 67, ayah: 1 },
  { juz: 30, surah: 78, ayah: 1 },
];

const ayahOrder = (value: AyahRef) => value.surah * 1000 + value.ayah;

export function juzForAyah(value: AyahRef): number {
  const target = ayahOrder(value);
  for (let index = JUZ_STARTS.length - 1; index >= 0; index -= 1) {
    if (target >= ayahOrder(JUZ_STARTS[index])) return JUZ_STARTS[index].juz;
  }
  return 1;
}

export function firstAyahForPortion(portion: QuranPortion): AyahRef {
  if (portion.kind === "surah-range") {
    return { surah: portion.startSurah, ayah: 1 };
  }
  if (portion.kind === "juz-range") {
    const start = JUZ_STARTS[Math.max(0, Math.min(29, portion.startJuz - 1))];
    return { surah: start.surah, ayah: start.ayah };
  }
  return { surah: 1, ayah: 1 };
}

export function rangeIsWithinPortion(
  range: Pick<QuestionRange, "startAyah" | "endAyah">,
  portion: QuranPortion,
): boolean {
  if (portion.kind === "full-quran") return true;
  if (portion.kind === "surah-range") {
    return (
      range.startAyah.surah >= portion.startSurah &&
      range.endAyah.surah <= portion.endSurah
    );
  }
  return (
    juzForAyah(range.startAyah) >= portion.startJuz &&
    juzForAyah(range.endAyah) <= portion.endJuz
  );
}

export function rangeFromDraft(draft: CompetitionQuestionDraft): QuestionRange {
  return {
    startAyah: { ...draft.startAyah },
    endAyah: { ...draft.endAyah },
    requestedLines: draft.requestedLines,
    resolvedLines: draft.resolvedLines,
    extensionLines: draft.extensionLines,
    startPage: draft.startPage,
    startLine: draft.startLine,
    endPage: draft.endPage,
    endLine: draft.endLine,
    startWordId: draft.startWordId,
    endWordId: draft.endWordId,
    endMarkerId: draft.endMarkerId,
    finalPrintedLineScoring: draft.finalPrintedLineScoring,
    sourceVersion: draft.sourceVersion,
    layoutHash: draft.layoutHash,
  };
}

export function createQuestionDraft(input: {
  id: string;
  competition: CompetitionConfig;
  divisionId: string;
  muqarrar?: QuestionMuqarrar;
  range: QuestionRange;
  note?: string;
  now?: number;
  previous?: CompetitionQuestionDraft;
}): CompetitionQuestionDraft {
  const now = input.now ?? Date.now();
  return {
    version: 1,
    id: input.id,
    competitionId: input.competition.id,
    isSample: input.competition.isSample,
    divisionId: input.divisionId,
    muqarrar: input.muqarrar ?? input.previous?.muqarrar ?? "both",
    createdAt: input.previous?.createdAt ?? now,
    updatedAt: now,
    note: input.note?.trim() ?? "",
    startAyah: { ...input.range.startAyah },
    endAyah: { ...input.range.endAyah },
    requestedLines: input.range.requestedLines,
    resolvedLines: input.range.resolvedLines,
    extensionLines: input.range.extensionLines,
    startPage: input.range.startPage,
    startLine: input.range.startLine,
    endPage: input.range.endPage,
    endLine: input.range.endLine,
    startWordId: input.range.startWordId,
    endWordId: input.range.endWordId,
    endMarkerId: input.range.endMarkerId,
    finalPrintedLineScoring: input.range.finalPrintedLineScoring,
    sourceVersion: input.range.sourceVersion,
    questionIndexVersion: QUESTION_INDEX_VERSION,
    layoutHash: input.range.layoutHash,
  };
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

export function normalizeQuestionDraft(
  value: Partial<CompetitionQuestionDraft>,
): CompetitionQuestionDraft | null {
  if (
    value.version !== 1 ||
    !value.id ||
    !value.competitionId ||
    !value.divisionId ||
    !value.startAyah ||
    !value.endAyah ||
    !positiveInteger(value.startAyah.surah) ||
    !positiveInteger(value.startAyah.ayah) ||
    !positiveInteger(value.endAyah.surah) ||
    !positiveInteger(value.endAyah.ayah) ||
    !positiveInteger(value.requestedLines) ||
    !positiveInteger(value.resolvedLines) ||
    !positiveInteger(value.startPage) ||
    !positiveInteger(value.startLine) ||
    !positiveInteger(value.endPage) ||
    !positiveInteger(value.endLine) ||
    !value.startWordId ||
    !value.endWordId ||
    !value.endMarkerId ||
    !value.sourceVersion ||
    !value.questionIndexVersion ||
    !value.layoutHash
  ) {
    return null;
  }
  const requestedLines = Number(value.requestedLines);
  const resolvedLines = Number(value.resolvedLines);
  if (resolvedLines < requestedLines || value.layoutHash.startsWith("sha256:") === false) {
    return null;
  }
  return {
    version: 1,
    id: String(value.id),
    competitionId: String(value.competitionId),
    isSample: Boolean(value.isSample),
    divisionId: String(value.divisionId),
    muqarrar:
      value.muqarrar === "feshey-kolhu" || value.muqarrar === "nimey-kolhu"
        ? value.muqarrar
        : "both",
    createdAt: Number.isFinite(value.createdAt) ? Number(value.createdAt) : Date.now(),
    updatedAt: Number.isFinite(value.updatedAt) ? Number(value.updatedAt) : Date.now(),
    note: String(value.note ?? ""),
    startAyah: { surah: Number(value.startAyah.surah), ayah: Number(value.startAyah.ayah) },
    endAyah: { surah: Number(value.endAyah.surah), ayah: Number(value.endAyah.ayah) },
    requestedLines,
    resolvedLines,
    extensionLines: resolvedLines - requestedLines,
    startPage: Number(value.startPage),
    startLine: Number(value.startLine),
    endPage: Number(value.endPage),
    endLine: Number(value.endLine),
    startWordId: String(value.startWordId),
    endWordId: String(value.endWordId),
    endMarkerId: String(value.endMarkerId),
    finalPrintedLineScoring: value.finalPrintedLineScoring === "include" ? "include" : "exclude",
    sourceVersion: String(value.sourceVersion),
    questionIndexVersion: String(value.questionIndexVersion),
    layoutHash: String(value.layoutHash),
  };
}

export function normalizeQuestionDrafts(
  values: Array<Partial<CompetitionQuestionDraft>> | undefined,
): CompetitionQuestionDraft[] {
  const byId = new Map<string, CompetitionQuestionDraft>();
  for (const value of values ?? []) {
    const draft = normalizeQuestionDraft(value);
    if (draft) byId.set(draft.id, draft);
  }
  return [...byId.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function questionDraftIssues(input: {
  draft: CompetitionQuestionDraft;
  competition: CompetitionConfig;
  policy: CompetitionQuestionPolicy;
  lookup: QuestionIndexLookup;
}): string[] {
  const { draft, competition, policy, lookup } = input;
  const issues: string[] = [];
  const division = competition.divisions.find((item) => item.id === draft.divisionId);
  if (draft.competitionId !== competition.id) issues.push("This draft belongs to another competition.");
  if (!division) issues.push("Its division no longer exists.");
  if (draft.requestedLines !== policy.targetRecitationLines) issues.push("The target line rule changed.");
  if (draft.finalPrintedLineScoring !== policy.finalPrintedLineScoring) issues.push("The final-line marking rule changed.");
  if (
    draft.sourceVersion !== lookup.asset.sourceVersion ||
    draft.questionIndexVersion !== lookup.asset.version ||
    draft.layoutHash !== lookup.asset.layoutHash
  ) {
    issues.push("The Mushaf question source changed.");
  }
  if (division && !rangeIsWithinPortion(rangeFromDraft(draft), division.quranPortion)) {
    issues.push("The passage is outside this division's Quran portion.");
  }
  return issues;
}

export function buildSampleQuestionDrafts(
  lookup: QuestionIndexLookup,
  competition: CompetitionConfig,
): CompetitionQuestionDraft[] {
  const candidatesFor = (division: CompetitionDivision): Record<
    Exclude<QuestionMuqarrar, "both">,
    Array<{ start: AyahRef; note: string }>
  > => {
    if (division.quranPortion.kind === "juz-range" && division.quranPortion.startJuz === 30) {
      return {
        "feshey-kolhu": [
          { start: { surah: 78, ayah: 1 }, note: "Opening passage" },
          { start: { surah: 79, ayah: 1 }, note: "Early Juz 30 passage" },
          { start: { surah: 80, ayah: 1 }, note: "Early Juz 30 passage" },
        ],
        "nimey-kolhu": [
          { start: { surah: 107, ayah: 1 }, note: "Closing-side passage" },
          { start: { surah: 109, ayah: 1 }, note: "Closing-side passage" },
          { start: { surah: 112, ayah: 1 }, note: "Closing passage" },
        ],
      };
    }
    if (division.quranPortion.kind === "juz-range") {
      return {
        "feshey-kolhu": [
          { start: { surah: 67, ayah: 1 }, note: "Opening passage" },
          { start: { surah: 68, ayah: 1 }, note: "Early passage" },
          { start: { surah: 69, ayah: 1 }, note: "Early passage" },
        ],
        "nimey-kolhu": [
          { start: { surah: 75, ayah: 1 }, note: "Closing-side passage" },
          { start: { surah: 76, ayah: 1 }, note: "Closing-side passage" },
          { start: { surah: 77, ayah: 1 }, note: "Closing passage" },
        ],
      };
    }
    return {
      "feshey-kolhu": [
        { start: { surah: 1, ayah: 1 }, note: "Opening passage" },
        { start: { surah: 2, ayah: 179 }, note: "Cross-page passage" },
        { start: { surah: 2, ayah: 180 }, note: "Extended passage" },
      ],
      "nimey-kolhu": [
        { start: { surah: 107, ayah: 1 }, note: "Closing-side passage" },
        { start: { surah: 109, ayah: 1 }, note: "Closing-side passage" },
        { start: { surah: 112, ayah: 1 }, note: "Closing passage" },
      ],
    };
  };
  const now = 1_786_489_200_000;
  let ordinal = 0;
  return competition.divisions.flatMap((division) =>
    Object.entries(candidatesFor(division)).flatMap(([muqarrar, examples]) =>
      examples.flatMap((example) => {
        ordinal += 1;
        const resolution = resolveQuestionRange(
          lookup,
          example.start,
          competition.questionPolicy.targetRecitationLines,
          competition.questionPolicy.finalPrintedLineScoring,
        );
        if (!resolution.ok || !rangeIsWithinPortion(resolution.range, division.quranPortion)) return [];
        return [
          createQuestionDraft({
            id: `sample-question-${division.id}-${muqarrar}-${ordinal}`,
            competition,
            divisionId: division.id,
            muqarrar: muqarrar as Exclude<QuestionMuqarrar, "both">,
            range: resolution.range,
            note: example.note,
            now: now + ordinal,
          }),
        ];
      }),
    ),
  );
}

export function sampleQuestionCoverageComplete(
  drafts: CompetitionQuestionDraft[],
  competition: CompetitionConfig,
): boolean {
  if (!competition.isSample || !competition.divisions.length) return false;
  return competition.divisions.every((division) =>
    (["feshey-kolhu", "nimey-kolhu"] as const).every(
      (muqarrar) =>
        drafts.filter(
          (draft) =>
            draft.isSample &&
            draft.competitionId === competition.id &&
            draft.divisionId === division.id &&
            draft.muqarrar === muqarrar,
        ).length >= 3,
    ),
  );
}

export function divisionForDraft(
  draft: CompetitionQuestionDraft,
  divisions: CompetitionDivision[],
): CompetitionDivision | undefined {
  return divisions.find((division) => division.id === draft.divisionId);
}
