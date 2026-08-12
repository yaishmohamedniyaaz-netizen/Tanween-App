import type {
  CompetitionConfig,
  CompetitionDivision,
  RosterEntry,
} from "../types.ts";
import { DEFAULT_QUESTION_POLICY } from "./competition.ts";

export const SAMPLE_COMPETITION_ID = "competition-tahqeeq-sample-v1";

export const SAMPLE_DIVISIONS: CompetitionDivision[] = [
  {
    id: "sample-under-14-hifz",
    name: "Under 14 · Hifz",
    ageGroup: "Under 14",
    category: "nubalaa",
    quranPortion: { kind: "juz-range", startJuz: 30, endJuz: 30 },
  },
  {
    id: "sample-under-14-baliagen",
    name: "Under 14 · Baliagen",
    ageGroup: "Under 14",
    category: "baliagen",
    quranPortion: { kind: "full-quran" },
  },
  {
    id: "sample-under-16-hifz",
    name: "Under 16 · Hifz",
    ageGroup: "Under 16",
    category: "nubalaa",
    quranPortion: { kind: "juz-range", startJuz: 29, endJuz: 30 },
  },
  {
    id: "sample-under-16-baliagen",
    name: "Under 16 · Baliagen",
    ageGroup: "Under 16",
    category: "baliagen",
    quranPortion: { kind: "full-quran" },
  },
];

const SAMPLE_PARTICIPANTS: Omit<RosterEntry, "judged">[] = [
  { id: "sample-participant-01", number: "T001", name: "Sample Participant 01", ageGroup: "Under 14", category: "nubalaa", muqarrar: "feshey-kolhu", phone: "0000001", institution: "Sample School" },
  { id: "sample-participant-02", number: "T002", name: "Sample Participant 02", ageGroup: "Under 14", category: "nubalaa", muqarrar: "nimey-kolhu", phone: "0000002", institution: "Amilla faraathun" },
  { id: "sample-participant-03", number: "T003", name: "Sample Participant 03", ageGroup: "Under 14", category: "baliagen", muqarrar: "feshey-kolhu", phone: "0000003", institution: "Sample Quran Class" },
  { id: "sample-participant-04", number: "T004", name: "Sample Participant 04", ageGroup: "Under 14", category: "baliagen", muqarrar: "nimey-kolhu", phone: "0000004", institution: "Sample School" },
  { id: "sample-participant-05", number: "T005", name: "Sample Participant 05", ageGroup: "Under 16", category: "nubalaa", muqarrar: "feshey-kolhu", phone: "0000005", institution: "Sample Quran Class" },
  { id: "sample-participant-06", number: "T006", name: "Sample Participant 06", ageGroup: "Under 16", category: "nubalaa", muqarrar: "nimey-kolhu", phone: "0000006", institution: "Amilla faraathun" },
  { id: "sample-participant-07", number: "T007", name: "Sample Participant 07", ageGroup: "Under 16", category: "baliagen", muqarrar: "feshey-kolhu", phone: "0000007", institution: "Sample School" },
  { id: "sample-participant-08", number: "T008", name: "Sample Participant 08", ageGroup: "Under 16", category: "baliagen", muqarrar: "nimey-kolhu", phone: "0000008", institution: "Sample Quran Class" },
];

export function createSampleCompetition(): CompetitionConfig {
  return {
    version: 2,
    isSample: true,
    id: SAMPLE_COMPETITION_ID,
    name: "Tahqeeq Test Competition",
    edition: "Sample 2026",
    status: "draft",
    setupRevision: 1,
    divisions: SAMPLE_DIVISIONS.map((division) => ({
      ...division,
      quranPortion: { ...division.quranPortion },
    })),
    questionPolicy: { ...DEFAULT_QUESTION_POLICY },
    liveSnapshot: null,
  };
}

export function createSampleRoster(): RosterEntry[] {
  return SAMPLE_PARTICIPANTS.map((participant) => ({
    ...participant,
    judged: false,
  }));
}
