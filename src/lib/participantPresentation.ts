import type { CompetitionDivision, Participant } from "../types";

function categoryLabel(participant: Participant): string {
  if (participant.category === "nubalaa") return "Hifz";
  if (participant.category === "baliagen") return "Baliagen";
  return "";
}

function sideLabel(participant: Participant): string {
  if (participant.muqarrar === "feshey-kolhu") return "Starting side";
  if (participant.muqarrar === "nimey-kolhu") return "Ending side";
  return "";
}

const normalized = (value: string) => value.trim().toLocaleLowerCase();

export function divisionLabel(division: CompetitionDivision): string {
  const name = division.name.trim();
  const category = division.category === "nubalaa" ? "Hifz" : "Baliagen";
  if (!name) return category;
  return normalized(name).includes(normalized(category))
    ? name
    : `${name} — ${category}`;
}

/**
 * Present ordinary numeric participant numbers consistently without changing
 * the stored competition identity. Existing alphanumeric values are evidence
 * from an older or externally numbered roster, so they are shown verbatim.
 */
export function participantNumberLabel(
  value: string,
  participantCount = 0,
): string {
  const raw = value.trim();
  if (!raw) return "—";
  if (!/^\d+$/.test(raw)) return raw;

  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < 1) return raw;

  const width = Math.max(
    2,
    String(Math.max(number, Math.floor(participantCount))).length,
  );
  return String(number).padStart(width, "0");
}

/** One compact, non-repeating context line shared by every participant card. */
export function participantContextLabel(
  participant: Participant,
  division?: CompetitionDivision,
): string {
  const category = categoryLabel(participant);
  const values = [
    participant.institution.trim(),
    division ? divisionLabel(division) : category,
    sideLabel(participant),
  ].filter(Boolean);

  return values
    .filter(
      (value, index) =>
        values.findIndex((candidate) => normalized(candidate) === normalized(value)) ===
        index,
    )
    .join(" \u00b7 ");
}
