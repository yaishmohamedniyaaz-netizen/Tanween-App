import type { CompetitionConfig } from "../types";

export const EMPTY_COMPETITION: CompetitionConfig = {
  version: 1,
  id: "competition-local",
  name: "",
  edition: "",
};

function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
}

export function competitionIdFor(name: string, edition: string): string {
  const source = `${name.trim().toLowerCase()}\u241f${edition.trim().toLowerCase()}`;
  return source === "\u241f" ? "competition-local" : `competition-${hash(source)}`;
}

export function normalizeCompetition(
  value?: Partial<CompetitionConfig>,
): CompetitionConfig {
  const name = String(value?.name ?? "").trim();
  const edition = String(value?.edition ?? "").trim();
  return {
    version: 1,
    id: String(value?.id ?? "").trim() || competitionIdFor(name, edition),
    name,
    edition,
  };
}
