import { CATEGORY_BY_ID } from "../config";
import type { JudgingState, SavedSession } from "../types";
import { computeScores } from "./scoring";
import { assignmentLabel, judgeDisplayName } from "./judgeAssignments";

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize a judging session to a structured JSON payload — the foundation for
 *  the future cross-island/class statistics layer. */
export function buildSessionPayload(state: JudgingState) {
  const { byCategory, total, totalMax } = computeScores(state);
  const assignment = state.activeAssignment;
  const assignedCategories = assignment?.categories ?? ["jali", "khafi", "fasaha"];
  const assignedScores = Object.fromEntries(
    Object.entries(byCategory).filter(([category]) =>
      assignedCategories.includes(category as "jali" | "khafi" | "fasaha"),
    ),
  );
  return {
    app: "tahqeeq",
    schema: 3,
    exportedAt: new Date().toISOString(),
    participant: state.participant,
    config: state.config,
    judgeAssignment: assignment
      ? {
          seatId: assignment.judgeSeatId,
          judge: judgeDisplayName(assignment),
          categories: assignment.categories,
          label: assignmentLabel(assignment.categories),
        }
      : null,
    score: {
      kind: "judge-section",
      total,
      max: totalMax,
      byCategory: assignedScores,
    },
    notes: state.notes,
    judgingHistory: state.events.map((event) => ({
      ...event,
      at: new Date(event.at).toISOString(),
    })),
    mistakes: state.mistakes.map((m) => ({
      surah: m.surah,
      ayah: m.ayah,
      glyph: m.glyph,
      location: m.label,
      category: m.category,
      judgeSeatId: m.judgeSeatId,
      deduction: m.amount,
      at: new Date(m.ts).toISOString(),
    })),
  };
}

function slug(s: string): string {
  return s.trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

/** Trigger a browser download of the session JSON. */
export function downloadSessionJSON(state: JudgingState) {
  const json = JSON.stringify(buildSessionPayload(state), null, 2);
  const who =
    slug(state.participant.number || state.participant.name || "") || "session";
  downloadBlob(
    json,
    "application/json",
    `tahqeeq-${who}-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

/** Export the whole records history as one CSV row per mistake (sessions with no
 *  mistakes get a single row), for analysis in a spreadsheet. */
export function downloadRecordsCSV(history: SavedSession[]) {
  const headers = [
    "reciter",
    "number",
    "island_class",
    "date",
    "judge_seat",
    "judge_name",
    "assigned_section",
    "score_kind",
    "total",
    "max",
    "surah",
    "ayah",
    "letter",
    "location",
    "category",
    "deduction",
  ];
  const rows = [headers.join(",")];
  for (const s of history) {
    const base = [
      s.participant.name,
      s.participant.number,
      s.participant.group,
      new Date(s.savedAt).toISOString().slice(0, 10),
      s.assignment?.judgeSeatId ?? "judge-1",
      s.assignment ? judgeDisplayName(s.assignment) : "Judge 1",
      s.assignment ? assignmentLabel(s.assignment.categories) : "Jali + Khafi + Fasaha",
      s.scoreKind ?? "judge-section",
      s.total,
      s.totalMax,
    ];
    if (s.mistakes.length === 0) {
      rows.push([...base, "", "", "", "", "", ""].map(csvCell).join(","));
    } else {
      for (const m of s.mistakes) {
        rows.push(
          [
            ...base,
            m.surah,
            m.ayah ?? "",
            m.glyph,
            m.label,
            CATEGORY_BY_ID[m.category].label,
            m.amount,
          ]
            .map(csvCell)
            .join(","),
        );
      }
    }
  }
  // BOM so Excel renders the Arabic letters correctly
  downloadBlob(
    "﻿" + rows.join("\r\n"),
    "text/csv;charset=utf-8",
    `tahqeeq-records-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
