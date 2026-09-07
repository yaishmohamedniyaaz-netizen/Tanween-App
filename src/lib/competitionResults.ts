import { CATEGORY_BY_ID, enabledCategories } from "../config.ts";
import type { CategoryId, JudgingState, Participant } from "../types.ts";
import { buildParticipantResultPreview, hasCompleteFinalizationIdentity } from "./finalResults.ts";
import { buildResultsReviewItems, type ResultsReviewItem } from "./resultsReview.ts";
import { missingRequiredImpressionCategories } from "./scoring.ts";

export type ResultSourceSelection = Partial<Record<CategoryId, string>>;
export type ResultSelections = Record<string, ResultSourceSelection>;

/** Presentation only. Never substitutes a stored official total for viewed sources. */
export function selectedResultView(item: ResultsReviewItem, choice: ResultSourceSelection = {}) {
  const selected = Object.fromEntries(item.candidate.categories.map(category => {
    const options = item.candidate.byCategory[category];
    const manual = choice[category];
    const prior = item.activeFinal?.byCategory[category];
    // An invalid deliberate selection stays unresolved, rather than silently falling back.
    const id = manual !== undefined ? manual
      : prior && options.some(s => s.id === prior.sessionId && (s.revision ?? 1) === prior.sessionRevision)
        ? prior.sessionId : options.length === 1 ? options[0].id : "";
    return [category, options.some(s => s.id === id) ? id : ""];
  })) as Record<CategoryId, string>;
  const missingMark = item.candidate.categories.some(category => {
    const source = item.candidate.byCategory[category].find(s => s.id === selected[category]);
    return source && missingRequiredImpressionCategories(source.config, source.impressions ?? [], [category]).length > 0;
  });
  const preview = item.candidate.categories.length && !missingMark
    ? buildParticipantResultPreview(item.candidate, selected) : null;
  const official = item.activeFinal;
  const matchesOfficial = Boolean(preview && official &&
    preview.total === official.total && preview.totalMax === official.totalMax &&
    item.candidate.categories.every(category => {
      const a = preview.byCategory[category], b = official.byCategory[category];
      return a && b && a.sessionId === b.sessionId && a.sessionRevision === b.sessionRevision &&
        a.score === b.score && a.max === b.max;
    }));
  return { selected, preview, official, matchesOfficial };
}

export interface CompetitionResultRow {
  participant: Participant;
  item?: ResultsReviewItem;
  absent: boolean;
  needsAttention: boolean;
  reasons: string[];
  complete: boolean;
  received: number;
  required: number;
  view: ReturnType<typeof selectedResultView> | null;
}

/** A read-only projection, deliberately not an approval or export certificate. */
export function buildCompetitionResults(
  state: Pick<JudgingState, "competition" | "roster" | "history" | "finalizedResults" | "config">,
  selections: ResultSelections = {},
) {
  const { competition } = state;
  const snapshot = competition.liveSnapshot;
  const categories = enabledCategories(snapshot?.scoreConfig ?? state.config);
  const roster = snapshot?.roster ?? state.roster;
  const ids = new Set(roster.map(p => p.id));
  const sameCompetition = state.history.filter(s => s.competitionId === competition.id);
  const eligible = sameCompetition.filter(s => ids.has(s.participant.id) &&
    (!snapshot || s.competitionVersionId === snapshot.versionId) &&
    Boolean(s.isSample) === competition.isSample &&
    (!snapshot || Boolean(s.assignment && snapshot.panel.seats.some(seat =>
      seat.id === s.assignment?.judgeSeatId && s.assignment.categories.length > 0 &&
      s.assignment.categories.every(category => seat.categories.includes(category)),
    ))));
  const excluded = sameCompetition.filter(s => !eligible.includes(s));
  const finals = state.finalizedResults.filter(f => f.competitionId === competition.id &&
    (!snapshot || f.competitionVersionId === snapshot.versionId) &&
    Boolean(f.isSample) === competition.isSample);
  const items = buildResultsReviewItems(eligible, finals, competition.id, categories);
  const byId = new Map(items.map(item => [item.candidate.participant.id, item]));
  const currentRoster = new Map(state.roster.map(p => [p.id, p]));
  const identityFields = ["name", "number", "ageGroup", "category", "muqarrar"] as const;
  const rows: CompetitionResultRow[] = roster.map(participant => {
    const item = byId.get(participant.id);
    const view = item ? selectedResultView(item, selections[participant.id]) : null;
    const absent = Boolean(currentRoster.get(participant.id)?.absent);
    const reasons: string[] = [];
    if (!hasCompleteFinalizationIdentity(participant)) reasons.push("Participant details incomplete");
    if (!categories.length) reasons.push("No scoring criteria configured");
    if (excluded.some(s => s.participant.id === participant.id)) reasons.push("Record identity or competition version needs checking");
    if (item?.candidate.sessions.some(s => identityFields.some(key => s.participant[key] !== participant[key]))) {
      reasons.push("Participant details differ from the roster");
    }
    if (!item) reasons.push("Awaiting judge results");
    else {
      const missing = categories.filter(c => !item.candidate.byCategory[c].length);
      const unresolved = categories.filter(c => item.candidate.byCategory[c].length && !view?.selected[c]);
      if (missing.length) reasons.push(`Awaiting ${missing.map(c => CATEGORY_BY_ID[c].label).join(", ")}`);
      if (unresolved.length) reasons.push(`Choose source: ${unresolved.map(c => CATEGORY_BY_ID[c].label).join(", ")}`);
      for (const category of categories) {
        const source = item.candidate.byCategory[category].find(s => s.id === view?.selected[category]);
        if (!source) continue;
        if (missingRequiredImpressionCategories(source.config, source.impressions ?? [], [category]).length) {
          reasons.push(`${CATEGORY_BY_ID[category].label} mark has not been entered`);
        }
        const expected = snapshot?.scoreConfig[category];
        const actual = source.config[category];
        if (expected && (expected.start !== actual.start || expected.step !== actual.step || expected.enabled !== actual.enabled)) {
          reasons.push(`${CATEGORY_BY_ID[category].label} configuration differs from competition setup`);
        }
      }
      if (view?.official && !view.matchesOfficial) reasons.push("Current sources differ from the official result");
      if (item.reasons.some(r => r.code === "newer-source-available")) reasons.push("Newer judge result available");
    }
    const absentWithResults = absent && Boolean(item || finals.some(f => f.participant.id === participant.id));
    if (absentWithResults) reasons.unshift("Marked absent, but saved results exist");
    return { participant, item, absent, reasons, view,
      needsAttention: absent ? absentWithResults : reasons.length > 0 || !view?.preview,
      complete: !absent && !reasons.length && Boolean(view?.preview),
      received: categories.filter(c => item?.candidate.byCategory[c].length).length,
      required: categories.length };
  });
  rows.sort((a, b) => Number(a.absent) - Number(b.absent) ||
    a.participant.number.localeCompare(b.participant.number, undefined, { numeric: true }) ||
    a.participant.id.localeCompare(b.participant.id));
  return { rows, items, excluded, rosterFrozen: Boolean(snapshot),
    total: rows.length, complete: rows.filter(r => r.complete).length,
    attention: rows.filter(r => r.needsAttention).length,
    absent: rows.filter(r => r.absent).length };
}
