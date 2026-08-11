import type {
  MuqarrarSide,
  Participant,
  ParticipantCategory,
  RosterEntry,
} from "../types";

export const PARTICIPANT_CATEGORY_LABELS: Record<
  Exclude<ParticipantCategory, "">,
  string
> = {
  baliagen: "Baliagen · Tarteel / reading",
  nubalaa: "Nubalaa · Memorisation",
};

export const MUQARRAR_LABELS: Record<Exclude<MuqarrarSide, "">, string> = {
  "feshey-kolhu": "Feshey kolhu · Starting side",
  "nimey-kolhu": "Nimey kolhu · Ending side",
};

export const EMPTY_PARTICIPANT: Participant = {
  id: "",
  number: "",
  name: "",
  ageGroup: "",
  category: "",
  muqarrar: "",
  phone: "",
  institution: "",
};

const key = (value: string) =>
  value.trim().toLowerCase().replace(/[\s_.\-/()]+/g, "");

export function normalizeParticipantCategory(
  value: unknown,
): ParticipantCategory | null {
  const normalized = key(String(value ?? ""));
  if (!normalized) return "";
  if (["baliagen", "bali", "tarteel", "tartil", "reading"].includes(normalized)) {
    return "baliagen";
  }
  if (
    [
      "nubalaa",
      "nubala",
      "memorisation",
      "memorization",
      "memorising",
      "memorizing",
      "hifz",
      "hifdh",
    ].includes(normalized)
  ) {
    return "nubalaa";
  }
  return null;
}

export function normalizeMuqarrarSide(value: unknown): MuqarrarSide | null {
  const normalized = key(String(value ?? ""));
  if (!normalized) return "";
  if (
    [
      "fesheykolhu",
      "starting",
      "start",
      "startingside",
      "beginning",
      "beginningside",
    ].includes(normalized)
  ) {
    return "feshey-kolhu";
  }
  if (
    [
      "nimeykolhu",
      "ending",
      "end",
      "endingside",
      "finishing",
      "finishingside",
    ].includes(normalized)
  ) {
    return "nimey-kolhu";
  }
  return null;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function participantIdFor(
  participant: Pick<
    Participant,
    "number" | "name" | "ageGroup" | "category" | "phone"
  >,
): string {
  const identity = [
    participant.number,
    participant.name,
    participant.ageGroup,
    participant.category,
    participant.phone,
  ]
    .map((value) => value.trim().toLowerCase())
    .join("\u241f");
  return `participant-${stableHash(identity || "unnamed")}`;
}

export function normalizeParticipant(
  value: Partial<Participant> & { group?: string } = {},
): Participant {
  const category = normalizeParticipantCategory(value.category) ?? "";
  const muqarrar = normalizeMuqarrarSide(value.muqarrar) ?? "";
  const participant: Participant = {
    id: String(value.id ?? "").trim(),
    number: String(value.number ?? "").trim(),
    name: String(value.name ?? "").trim(),
    ageGroup: String(value.ageGroup ?? "").trim(),
    category,
    muqarrar,
    phone: String(value.phone ?? "").trim(),
    institution: String(value.institution ?? value.group ?? "").trim(),
  };
  if (!participant.id) participant.id = participantIdFor(participant);
  return participant;
}

export function normalizeRosterEntry(
  value: Partial<RosterEntry> & { group?: string },
): RosterEntry {
  return {
    ...normalizeParticipant(value),
    judged: Boolean(value.judged),
  };
}

export function participantCategoryLabel(category: ParticipantCategory): string {
  return category ? PARTICIPANT_CATEGORY_LABELS[category] : "Not set";
}

export function muqarrarLabel(muqarrar: MuqarrarSide): string {
  return muqarrar ? MUQARRAR_LABELS[muqarrar] : "Not set";
}
