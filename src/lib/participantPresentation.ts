import type { CompetitionDivision, Participant } from "../types";
import {
  muqarrarLabel,
  normalizeMuqarrarSide,
  normalizeParticipantCategory,
  participantCategoryLabel,
} from "./participants.ts";

function categoryLabel(participant: Participant): string {
  const category = normalizeParticipantCategory(participant.category);
  return category ? participantCategoryLabel(category) : "";
}

function sideLabel(participant: Participant): string {
  const side = normalizeMuqarrarSide(participant.muqarrar);
  return side ? muqarrarLabel(side) : "";
}

const normalized = (value: string) => value.trim().toLocaleLowerCase();

export function divisionLabel(division: CompetitionDivision): string {
  const normalizedCategory = normalizeParticipantCategory(division.category);
  const category = normalizedCategory
    ? participantCategoryLabel(normalizedCategory)
    : "Category";
  const name = division.name
    .trim()
    .replace(/\s*(?:(?:·|—|-)\s*)?(?:hifz|nubalaa|baliagen|balaigen)\s*$/i, "")
    .trim();
  if (!name) return category;
  return normalized(name).includes(normalized(category))
    ? name
    : `${name} · ${category}`;
}

/**
 * Present ordinary numeric participant numbers consistently without changing
 * the stored competition identity. Existing alphanumeric values are evidence
 * from an older or externally numbered roster, so they are shown verbatim.
 */
export function participantNumberLabel(
  value: string,
  _participantCount = 0,
): string {
  const raw = value.trim();
  if (!raw) return "—";
  if (!/^\d+$/.test(raw)) return raw;

  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < 1) return raw;

  return String(number).padStart(2, "0");
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
