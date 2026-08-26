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
    name: "Under 14 · Nubalaa",
    ageGroup: "Under 14",
    category: "memorisation",
    quranPortion: { kind: "juz-range", startJuz: 30, endJuz: 30 },
  },
  {
    id: "sample-under-14-baliagen",
    name: "Under 14 · Balaigen",
    ageGroup: "Under 14",
    category: "mushaf-reading",
    quranPortion: { kind: "full-quran" },
  },
  {
    id: "sample-under-16-hifz",
    name: "Under 16 · Nubalaa",
    ageGroup: "Under 16",
    category: "memorisation",
    quranPortion: { kind: "juz-range", startJuz: 29, endJuz: 30 },
  },
  {
    id: "sample-under-16-baliagen",
    name: "Under 16 · Balaigen",
    ageGroup: "Under 16",
    category: "mushaf-reading",
    quranPortion: { kind: "full-quran" },
  },
];

const SAMPLE_PARTICIPANTS: Omit<RosterEntry, "judged">[] = [
  { id: "sample-participant-01", number: "01", name: "Ahmed Rasheed", ageGroup: "Under 14", category: "memorisation", muqarrar: "starting-side", phone: "", institution: "Hiriya School" },
  { id: "sample-participant-02", number: "02", name: "Mariyam Aisha", ageGroup: "Under 14", category: "memorisation", muqarrar: "ending-side", phone: "", institution: "Independent" },
  { id: "sample-participant-03", number: "03", name: "Mohamed Zayan", ageGroup: "Under 14", category: "mushaf-reading", muqarrar: "starting-side", phone: "", institution: "Noor Quran Class" },
  { id: "sample-participant-04", number: "04", name: "Aishath Zaina", ageGroup: "Under 14", category: "mushaf-reading", muqarrar: "ending-side", phone: "", institution: "Aminiya School" },
  { id: "sample-participant-05", number: "05", name: "Ibrahim Nimal", ageGroup: "Under 16", category: "memorisation", muqarrar: "starting-side", phone: "", institution: "Noor Quran Class" },
  { id: "sample-participant-06", number: "06", name: "Fathimath Raniya", ageGroup: "Under 16", category: "memorisation", muqarrar: "ending-side", phone: "", institution: "Independent" },
  { id: "sample-participant-07", number: "07", name: "Abdulla Ihsan", ageGroup: "Under 16", category: "mushaf-reading", muqarrar: "starting-side", phone: "", institution: "Majeediyya School" },
  { id: "sample-participant-08", number: "08", name: "Hawwa Sameeha", ageGroup: "Under 16", category: "mushaf-reading", muqarrar: "ending-side", phone: "", institution: "Noor Quran Class" },
];

const STRESS_GIVEN_NAMES = [
  "Mohamed",
  "Ahmed",
  "Ibrahim",
  "Abdulla",
  "Ali",
  "Ismail",
  "Yoosuf",
  "Hassan",
  "Mariyam",
  "Aishath",
  "Fathimath",
  "Hawwa",
  "Aminath",
  "Shifza",
  "Zainab",
  "Thasneem",
] as const;

const STRESS_FAMILY_NAMES = ["Naseer", "Shareef", "Waheed", "Nazeer"] as const;

const STRESS_GROUPS = [
  { ageGroup: "Under 14", category: "memorisation" },
  { ageGroup: "Under 14", category: "mushaf-reading" },
  { ageGroup: "Under 16", category: "memorisation" },
  { ageGroup: "Under 16", category: "mushaf-reading" },
] as const;

const STRESS_INSTITUTIONS = [
  "Hiriya School",
  "Amilla faraathun",
  "Noor Quran Class",
  "Aminiya School",
  "Majeediyya School",
] as const;

const STRESS_PARTICIPANTS: Omit<RosterEntry, "judged">[] =
  STRESS_FAMILY_NAMES.flatMap((familyName) =>
    STRESS_GIVEN_NAMES.map((givenName) => `${givenName} ${familyName}`),
  ).map((name, index) => {
    const participantNumber = index + SAMPLE_PARTICIPANTS.length + 1;
    const group = STRESS_GROUPS[index % STRESS_GROUPS.length];
    return {
      id: `sample-participant-${String(participantNumber).padStart(2, "0")}`,
      number: String(participantNumber).padStart(2, "0"),
      name,
      ageGroup: group.ageGroup,
      category: group.category,
      muqarrar: Math.floor(index / STRESS_GROUPS.length) % 2 === 0
        ? "starting-side"
        : "ending-side",
      phone: "",
      institution: STRESS_INSTITUTIONS[index % STRESS_INSTITUTIONS.length],
    };
  });

const ALL_SAMPLE_PARTICIPANTS = [
  ...SAMPLE_PARTICIPANTS,
  ...STRESS_PARTICIPANTS,
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
  return ALL_SAMPLE_PARTICIPANTS.map((participant) => ({
    ...participant,
    judged: false,
  }));
}

export function refreshSampleRoster(roster: RosterEntry[]): RosterEntry[] {
  const existingById = new Map(roster.map((entry) => [entry.id, entry]));
  return createSampleRoster().map((sample) => ({
    ...sample,
    judged: existingById.get(sample.id)?.judged ?? false,
  }));
}
