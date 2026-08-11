import type { TokenRole } from "../types";
import { graphemesOf, isNonRecitationWord } from "./tokenize.ts";

export const TARGET_SCHEMA_VERSION = 2 as const;
export const TARGET_RULE_VERSION = "qpc-hafs-v1-targets-2.0.0";
export const TARGET_SOURCE_VERSION = "qpc-hafs-v1-1405-r1";

export type JudgingUnitKind = "letter" | "hamza" | "allah-lam";
export type OrthographyRole =
  | "independent"
  | "hamza-carrier"
  | "madd-support"
  | "silent-plural-alif"
  | "allah-ligature";
export type JudgingFeature =
  | "fatha"
  | "damma"
  | "kasra"
  | "tanwin"
  | "shadda"
  | "sukun"
  | "dagger-alif"
  | "small-waw"
  | "small-ya"
  | "madd-sign"
  | "hamzat-wasl"
  | "pause-mark"
  | "madd-alif"
  | "silent-plural-alif";

/**
 * A source-faithful recitation target.
 *
 * `primaryGlyph` is deliberately clean and is the only glyph shown in the
 * compact target rail. `fullGlyph` preserves the exact QPC source span for
 * evidence, logs, exports and future scholarly review.
 */
export interface JudgingUnit {
  start: number;
  end: number;
  primaryGlyph: string;
  fullGlyph: string;
  /** @deprecated Use fullGlyph. Kept for callers saved against V1. */
  glyph: string;
  base: string;
  kind: JudgingUnitKind;
  orthographyRole: OrthographyRole;
  carrier?: "alif" | "waw" | "ya" | "tatweel";
  features: JudgingFeature[];
  ruleId: string;
  /** Product-policy rules remain identifiable until a qualified review. */
  reviewStatus: "source" | "policy";
  /** V1 grapheme indices absorbed by this target. */
  legacyGraphemeIndices: number[];
}

export interface JudgingTarget extends JudgingUnit {
  /** Stable V2 identity anchored to the source offset, not visual order. */
  tid: string;
  /** Every V1 unit/grapheme id that must continue to resolve to this target. */
  aliases: string[];
}

const PRECOMPOSED_HAMZA_CARRIER: Record<
  string,
  JudgingUnit["carrier"]
> = {
  "أ": "alif",
  "إ": "alif",
  "ؤ": "waw",
  "ئ": "ya",
};

const isOrdinaryArabicLetter = (character: string): boolean => {
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x0621 && codePoint <= 0x063a) ||
    (codePoint >= 0x0641 && codePoint <= 0x064a) ||
    codePoint === 0x0671
  );
};

function ordinaryBase(cluster: string): string | null {
  return [...cluster].find(isOrdinaryArabicLetter) ?? null;
}

/** KFGQPC encodes a visually standalone hamza as tatweel + combining hamza. */
function isEncodedStandaloneHamza(cluster: string): boolean {
  return (
    !ordinaryBase(cluster) &&
    cluster.includes("\u0640") &&
    cluster.includes("\u0654")
  );
}

function featuresOf(glyph: string): JudgingFeature[] {
  const features = new Set<JudgingFeature>();
  if (/[\u064E]/u.test(glyph)) features.add("fatha");
  if (/[\u064F]/u.test(glyph)) features.add("damma");
  if (/[\u0650]/u.test(glyph)) features.add("kasra");
  if (/[\u064B-\u064D]/u.test(glyph)) features.add("tanwin");
  if (glyph.includes("\u0651")) features.add("shadda");
  if (/[\u0652\u06E1]/u.test(glyph)) features.add("sukun");
  if (glyph.includes("\u0670")) features.add("dagger-alif");
  if (glyph.includes("\u06E5")) features.add("small-waw");
  if (/[\u06E6\u06E7]/u.test(glyph)) features.add("small-ya");
  if (/[\u0653\u06E4]/u.test(glyph)) features.add("madd-sign");
  if (glyph.includes("\u0671")) features.add("hamzat-wasl");
  if (/[\u06D6-\u06DC\u06E2\u06E8\u06EA-\u06ED]/u.test(glyph)) {
    features.add("pause-mark");
  }
  return [...features];
}

function sourceUnit(
  word: string,
  start: number,
  end: number,
  base: string,
  legacyGraphemeIndices: number[],
  encodedHamza = false,
): JudgingUnit {
  const fullGlyph = word.slice(start, end);
  const carrier = encodedHamza
    ? "tatweel"
    : PRECOMPOSED_HAMZA_CARRIER[base];
  const isHamza = base === "ء" || Boolean(carrier);
  return {
    start,
    end,
    primaryGlyph: isHamza ? "ء" : base,
    fullGlyph,
    glyph: fullGlyph,
    base: isHamza ? "ء" : base,
    kind: isHamza ? "hamza" : "letter",
    orthographyRole: isHamza && carrier ? "hamza-carrier" : "independent",
    carrier,
    features: featuresOf(fullGlyph),
    ruleId: isHamza ? "hamza-locus-v2" : "source-letter-v2",
    reviewStatus: "source",
    legacyGraphemeIndices,
  };
}

function refreshSpan(word: string, unit: JudgingUnit): JudgingUnit {
  const fullGlyph = word.slice(unit.start, unit.end);
  return {
    ...unit,
    fullGlyph,
    glyph: fullGlyph,
    features: [...new Set([...unit.features, ...featuresOf(fullGlyph)])],
  };
}

/** Base/source pass shared by V1 aliases and V2 policy grouping. */
function sourceUnitsOf(word: string, wordRole: TokenRole): JudgingUnit[] {
  if (wordRole !== "letter" || isNonRecitationWord(word)) return [];

  const graphemes = graphemesOf(word, wordRole);
  const units: JudgingUnit[] = [];
  const leadingIndices: number[] = [];
  let leadingStart: number | null = null;

  graphemes.forEach((grapheme, graphemeIndex) => {
    const rawBase = ordinaryBase(grapheme.glyph);
    const encodedHamza = isEncodedStandaloneHamza(grapheme.glyph);
    if (rawBase || encodedHamza) {
      const start = leadingStart ?? grapheme.start;
      units.push(
        sourceUnit(
          word,
          start,
          grapheme.end,
          rawBase ?? "ء",
          [...leadingIndices, graphemeIndex],
          encodedHamza,
        ),
      );
      leadingIndices.length = 0;
      leadingStart = null;
      return;
    }

    const previous = units[units.length - 1];
    if (previous) {
      previous.end = grapheme.end;
      previous.legacyGraphemeIndices.push(graphemeIndex);
      units[units.length - 1] = refreshSpan(word, previous);
    } else {
      leadingStart ??= grapheme.start;
      leadingIndices.push(graphemeIndex);
    }
  });

  if (!units.length && graphemes.length) {
    units.push(
      sourceUnit(
        word,
        0,
        word.length,
        word,
        graphemes.map((_, index) => index),
      ),
    );
  } else if (leadingIndices.length) {
    const first = units[0];
    first.start = leadingStart ?? first.start;
    first.legacyGraphemeIndices.unshift(...leadingIndices);
    units[0] = refreshSpan(word, first);
  }

  return units;
}

/** Exact V1 behavior, retained privately to generate compatibility aliases. */
function legacyV1UnitsOf(word: string, wordRole: TokenRole): JudgingUnit[] {
  const units = sourceUnitsOf(word, wordRole);
  // V1 only recognized Allah when the written alif/wasl began the sequence.
  for (let index = 0; index <= units.length - 4; index += 1) {
    const bases = units.slice(index, index + 4).map((unit) => unit.base);
    const beginsAllah = bases[0] === "ٱ" || bases[0] === "ا";
    if (
      beginsAllah &&
      bases[1] === "ل" &&
      bases[2] === "ل" &&
      bases[3] === "ه"
    ) {
      const firstLam = units[index + 1];
      const secondLam = units[index + 2];
      units.splice(index + 1, 2, {
        ...refreshSpan(word, {
          ...secondLam,
          start: firstLam.start,
          legacyGraphemeIndices: [
            ...firstLam.legacyGraphemeIndices,
            ...secondLam.legacyGraphemeIndices,
          ],
        }),
        primaryGlyph: "ل",
        base: "ل",
        kind: "allah-lam",
        orthographyRole: "allah-ligature",
        ruleId: "allah-lam-v1",
        reviewStatus: "policy",
      });
      index += 2;
    }
  }
  return units;
}

function mergeMaddAlifs(word: string, source: JudgingUnit[]): JudgingUnit[] {
  const units: JudgingUnit[] = [];
  for (const unit of source) {
    const previous = units[units.length - 1];
    // In QPC Hafs semantic text, an internal bare alif is the support for the
    // preceding sound. Initial/glottal forms are separately encoded and stay
    // independent. This is a judge-interface policy, not a source rewrite.
    if (unit.base === "ا" && previous) {
      const silentPlural =
        previous.base === "و" && unit.end === word.length;
      const alifFeature: JudgingFeature = silentPlural
        ? "silent-plural-alif"
        : "madd-alif";
      units[units.length - 1] = refreshSpan(word, {
        ...previous,
        end: unit.end,
        orthographyRole: silentPlural
          ? "silent-plural-alif"
          : "madd-support",
        features: [
          ...new Set([
            ...previous.features,
            ...unit.features,
            alifFeature,
          ]),
        ],
        ruleId: silentPlural
          ? "silent-plural-alif-v2"
          : "madd-alif-host-v2",
        reviewStatus: "policy",
        legacyGraphemeIndices: [
          ...previous.legacyGraphemeIndices,
          ...unit.legacyGraphemeIndices,
        ],
      });
      continue;
    }
    units.push(unit);
  }
  return units;
}

function mergeAllahLams(word: string, source: JudgingUnit[]): JudgingUnit[] {
  const units = [...source];
  for (let index = 0; index <= units.length - 3; index += 1) {
    const bases = units.slice(index, index + 4).map((unit) => unit.base);
    const standardForm =
      (bases[0] === "ٱ" || bases[0] === "ا") &&
      bases[1] === "ل" &&
      bases[2] === "ل" &&
      bases[3] === "ه";
    const prefixedLamForm =
      bases[0] === "ل" &&
      bases[1] === "ل" &&
      bases[2] === "ل" &&
      bases[3] === "ه";
    const maddEntryForm =
      index > 0 &&
      units[index - 1].orthographyRole === "madd-support" &&
      units[index - 1].fullGlyph.includes("ا") &&
      bases[0] === "ل" &&
      bases[1] === "ل" &&
      bases[2] === "ه";
    if (!standardForm && !prefixedLamForm && !maddEntryForm) continue;

    const firstLamIndex = maddEntryForm ? index : index + 1;
    const firstLam = units[firstLamIndex];
    const secondLam = units[firstLamIndex + 1];
    units.splice(firstLamIndex, 2, {
      ...refreshSpan(word, {
        ...secondLam,
        start: firstLam.start,
        legacyGraphemeIndices: [
          ...firstLam.legacyGraphemeIndices,
          ...secondLam.legacyGraphemeIndices,
        ],
      }),
      primaryGlyph: "ل",
      base: "ل",
      kind: "allah-lam",
      orthographyRole: "allah-ligature",
      ruleId: maddEntryForm
        ? "allah-lam-madd-entry-v2"
        : prefixedLamForm
          ? "allah-lam-prefixed-v2"
          : "allah-lam-v2",
      reviewStatus: "policy",
    });
    index += 1;
  }
  return units;
}

/** Convert QPC Hafs semantic text into ordered, source-covering V2 targets. */
export function judgingUnitsOf(
  word: string,
  wordRole: TokenRole,
): JudgingUnit[] {
  return mergeAllahLams(
    word,
    mergeMaddAlifs(word, sourceUnitsOf(word, wordRole)),
  );
}

/** Stable V2 id; start offset is invariant when neighbouring targets merge. */
export function judgingTargetId(wordId: string, unit: JudgingUnit): string {
  return `${wordId}@r${unit.start}`;
}

/** @deprecated V1 ordinal id. Used only for compatibility aliases. */
export function judgingUnitId(wordId: string, unitIndex: number): string {
  return `${wordId}@u${unitIndex}`;
}

export function judgingTargetsOf(
  word: string,
  wordRole: TokenRole,
  wordId: string,
): JudgingTarget[] {
  const targets = judgingUnitsOf(word, wordRole);
  const legacyUnits = legacyV1UnitsOf(word, wordRole);
  return targets.map((target) => {
    const aliases = new Set<string>();
    legacyUnits.forEach((legacy, index) => {
      if (legacy.start < target.end && legacy.end > target.start) {
        aliases.add(judgingUnitId(wordId, index));
        for (const graphemeIndex of legacy.legacyGraphemeIndices) {
          aliases.add(`${wordId}#${graphemeIndex}`);
        }
      }
    });
    return {
      ...target,
      tid: judgingTargetId(wordId, target),
      aliases: [...aliases],
    };
  });
}

export function resolvesTargetId(target: JudgingTarget, tid: string): boolean {
  return target.tid === tid || target.aliases.includes(tid);
}
