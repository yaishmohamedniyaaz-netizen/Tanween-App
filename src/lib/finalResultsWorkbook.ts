import { CATEGORY_BY_ID } from "../config.ts";
import type { CategoryId, CompetitionConfig, FinalizedResult } from "../types";
import {
  muqarrarLabel,
  participantCategoryLabel,
} from "./participants.ts";
import { placeFinalizedResults } from "./finalResults.ts";

const LEADING_HEADERS = [
  "Place",
  "Participant Number",
  "Name",
  "Age Group",
  "Category",
  "Muqarrar start",
  "Phone Number",
  "Institution",
] as const;

const TRAILING_HEADERS = [
  "Total",
  "Maximum",
  "Result Revision",
  "Revision Reason",
  "Verification Manifest",
] as const;

const COLUMN_HEADINGS: Record<CategoryId, string> = {
  jali: "Jali",
  khafi: "Khafi",
  fasaha: "Fasaha",
  "adu-raagu": "Adu / Raagu",
};

/** Only the criteria a competition actually judged become score columns. */
export function finalResultsCategories(results: FinalizedResult[]): CategoryId[] {
  const used = new Set<CategoryId>();
  for (const result of results) {
    for (const category of Object.keys(result.byCategory) as CategoryId[]) {
      if (result.byCategory[category]) used.add(category);
    }
  }
  return (Object.keys(CATEGORY_BY_ID) as CategoryId[]).filter((category) =>
    used.has(category),
  );
}

export function finalResultsHeaders(results: FinalizedResult[]): string[] {
  return [
    ...LEADING_HEADERS,
    ...finalResultsCategories(results).map((category) => COLUMN_HEADINGS[category]),
    ...TRAILING_HEADERS,
  ];
}

export async function buildFinalResultsWorkbook(
  results: FinalizedResult[],
  competition: CompetitionConfig,
): Promise<ArrayBuffer> {
  const { utils, write } = await import("xlsx");
  const placed = placeFinalizedResults(results);
  const categories = finalResultsCategories(results);
  const headers = finalResultsHeaders(results);
  const rows = placed.map((result) => [
    result.place,
    result.participant.number,
    result.participant.name,
    result.participant.ageGroup,
    participantCategoryLabel(result.participant.category),
    muqarrarLabel(result.participant.muqarrar),
    result.participant.phone,
    result.participant.institution,
    ...categories.map((category) => result.byCategory[category]?.score ?? ""),
    result.total,
    result.totalMax,
    result.revision,
    result.revisionReason ?? "",
    result.manifest,
  ]);
  const resultSheet = utils.aoa_to_sheet([headers, ...rows]);
  resultSheet["!cols"] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 28 },
    { wch: 16 },
    { wch: 26 },
    { wch: 28 },
    { wch: 18 },
    { wch: 28 },
    ...categories.map(() => ({ wch: 14 })),
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 34 },
    { wch: 24 },
  ];
  resultSheet["!autofilter"] = {
    ref: `A1:${utils.encode_col(headers.length - 1)}${Math.max(1, rows.length + 1)}`,
  };

  const verificationRows = [
    ["Tahqeeq results verification"],
    ["Competition", competition.name || "Not set"],
    ["Edition", competition.edition || "Not set"],
    ["Competition ID", competition.id],
    ["Record type", competition.isSample ? "SAMPLE TEST DATA — NOT OFFICIAL" : "Official competition data"],
    ["Exported at", new Date().toISOString()],
    ["Finalized result count", results.length],
    ["Ranking groups", new Set(placed.map((result) => result.rankGroup)).size],
    ["Tie rule", "Equal percentages remain tied"],
    ["Criteria judged", categories.map((category) => COLUMN_HEADINGS[category]).join(", ") || "None"],
    ["Calculation", "Tahqeeq fixed values; spreadsheet formulas are not the source of truth"],
  ];
  const verificationSheet = utils.aoa_to_sheet(verificationRows);
  verificationSheet["!cols"] = [{ wch: 28 }, { wch: 76 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, resultSheet, "Results");
  utils.book_append_sheet(workbook, verificationSheet, "Verification");
  workbook.Props = {
    Title: `${competition.name || "Tahqeeq"} Results`,
    Subject: competition.isSample
      ? "Sample test results — not official"
      : "Verified competition results",
    Author: "Tahqeeq",
  };
  return write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  }) as ArrayBuffer;
}

export async function verifyFinalResultsWorkbook(
  buffer: ArrayBuffer,
  results: FinalizedResult[],
): Promise<void> {
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  if (workbook.SheetNames.join("|") !== "Results|Verification") {
    throw new Error("The exported workbook is missing a required sheet.");
  }
  const rows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Results, {
    defval: "",
    raw: false,
  });
  if (rows.length !== results.length) {
    throw new Error("The exported workbook result count does not match.");
  }
  const expected = new Map(results.map((result) => [result.manifest, result]));
  for (const row of rows) {
    const manifest = String(row["Verification Manifest"] ?? "");
    const result = expected.get(manifest);
    if (!result) throw new Error("The exported workbook contains an unknown result.");
    if (
      Number(row.Total) !== result.total ||
      Number(row.Maximum) !== result.totalMax ||
      String(row["Participant Number"]) !== result.participant.number
    ) {
      throw new Error("A result changed during workbook export.");
    }
  }
}

export async function downloadFinalResultsWorkbook(
  results: FinalizedResult[],
  competition: CompetitionConfig,
): Promise<void> {
  const buffer = await buildFinalResultsWorkbook(results, competition);
  await verifyFinalResultsWorkbook(buffer, results);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = competition.isSample
    ? "Tahqeeq-sample-results-NOT-OFFICIAL.xlsx"
    : "Tahqeeq-final-results.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
