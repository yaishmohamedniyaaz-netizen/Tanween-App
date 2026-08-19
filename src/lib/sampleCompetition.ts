import type {
  CompetitionConfig,
  CompetitionDivision,
  JudgePanelConfig,
  RosterEntry,
  ScoreConfig,
} from "../types.ts";
import { DEFAULT_CONFIG, enabledCategories } from "../config.ts";
import { DEFAULT_QUESTION_POLICY } from "./competition.ts";
import { createPanelPreset } from "./judgeAssignments.ts";

export const SAMPLE_COMPETITION_ID = "competition-tahqeeq-sample-v1";
export const SAMPLE_COMPETITION_NAME = "Falaah Quran Mubaaraai";
export const SAMPLE_COMPETITION_EDITION = "1448";
export const SAMPLE_JUDGE_NAME = "Hassan Yoonus";

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
  { id: "sample-participant-01", number: "01", name: "Ahmed Rasheed", ageGroup: "Under 14", category: "nubalaa", muqarrar: "feshey-kolhu", phone: "", institution: "Hiriya School" },
  { id: "sample-participant-02", number: "02", name: "Mariyam Aisha", ageGroup: "Under 14", category: "nubalaa", muqarrar: "nimey-kolhu", phone: "", institution: "Independent" },
  { id: "sample-participant-03", number: "03", name: "Mohamed Zayan", ageGroup: "Under 14", category: "baliagen", muqarrar: "feshey-kolhu", phone: "", institution: "Noor Quran Class" },
  { id: "sample-participant-04", number: "04", name: "Aishath Zaina", ageGroup: "Under 14", category: "baliagen", muqarrar: "nimey-kolhu", phone: "", institution: "Aminiya School" },
  { id: "sample-participant-05", number: "05", name: "Ibrahim Nimal", ageGroup: "Under 16", category: "nubalaa", muqarrar: "feshey-kolhu", phone: "", institution: "Noor Quran Class" },
  { id: "sample-participant-06", number: "06", name: "Fathimath Raniya", ageGroup: "Under 16", category: "nubalaa", muqarrar: "nimey-kolhu", phone: "", institution: "Independent" },
  { id: "sample-participant-07", number: "07", name: "Abdulla Ihsan", ageGroup: "Under 16", category: "baliagen", muqarrar: "feshey-kolhu", phone: "", institution: "Majeediyya School" },
  { id: "sample-participant-08", number: "08", name: "Hawwa Sameeha", ageGroup: "Under 16", category: "baliagen", muqarrar: "nimey-kolhu", phone: "", institution: "Noor Quran Class" },
];

export function createSampleCompetition(): CompetitionConfig {
  return {
    version: 2,
    isSample: true,
    id: SAMPLE_COMPETITION_ID,
    name: SAMPLE_COMPETITION_NAME,
    edition: SAMPLE_COMPETITION_EDITION,
    status: "draft",
    setupRevision: 1,
    participantNumbering: "supplied",
    participantEntrySettings: {
      institutions: ["Hiriya School", "Amilla faraathun", "Noor Quran Class", "Aminiya School", "Majeediyya School"],
      defaultMuqarrar: "",
      defaultInstitution: "",
    },
    divisions: SAMPLE_DIVISIONS.map((division) => ({
      ...division,
      quranPortion: { ...division.quranPortion },
    })),
    questionPolicy: { ...DEFAULT_QUESTION_POLICY },
    liveSnapshot: null,
  };
}

export function withSampleJudgeName(panel: JudgePanelConfig): JudgePanelConfig {
  return {
    ...panel,
    seats: panel.seats.map((seat, index) =>
      index === 0 ? { ...seat, name: SAMPLE_JUDGE_NAME } : { ...seat },
    ),
  };
}

export function createSampleJudgePanel(
  config: ScoreConfig = DEFAULT_CONFIG,
): JudgePanelConfig {
  return withSampleJudgeName(
    createPanelPreset("all", enabledCategories(config)),
  );
}

export function createSampleRoster(): RosterEntry[] {
  return SAMPLE_PARTICIPANTS.map((participant) => ({
    ...participant,
    judged: false,
  }));
}
