import { useMemo } from "react";
import { CATEGORIES } from "../config";
import { computeScores } from "../lib/scoring";
import surahData from "../data/surahs.json";
import { useJudging } from "../state/store";
import type { Mistake } from "../types";

/** Print-only summary — the transparent record of a reciter's session.
 *  Marks are grouped under the āyah they fall on, with the āyah text for context
 *  (avoids overlay misalignment that a reflowed printed page would cause). */
export function ResultSheet() {
  const { state } = useJudging();
  const { byCategory, total, totalMax } = computeScores(state);
  const p = state.participant;

  const ayahText = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of surahData.surahs) {
      map.set(`${s.number}:b`, s.basmala);
      for (const a of s.ayahs) map.set(`${s.number}:${a.no}`, a.text);
    }
    return map;
  }, []);

  const groups = useMemo(() => {
    const g = new Map<string, { surah: number; ayah: number | null; marks: Mistake[] }>();
    for (const m of state.mistakes) {
      const key = `${m.surah}:${m.ayah === null ? "b" : m.ayah}`;
      let entry = g.get(key);
      if (!entry) {
        entry = { surah: m.surah, ayah: m.ayah, marks: [] };
        g.set(key, entry);
      }
      entry.marks.push(m);
    }
    return [...g.values()].sort((a, b) =>
      a.surah !== b.surah ? a.surah - b.surah : (a.ayah ?? 0) - (b.ayah ?? 0),
    );
  }, [state.mistakes]);

  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="result-sheet" aria-hidden="true">
      <div className="rs-head">
        <div>
          <div className="rs-title">Tahqeeq — recitation result</div>
          <div className="rs-sub">{date}</div>
        </div>
        <div className="rs-total">
          {total}
          <span> / {totalMax}</span>
        </div>
      </div>

      <table className="rs-meta">
        <tbody>
          <tr>
            <th>Reciter</th>
            <td>{p.name || "—"}</td>
            <th>No.</th>
            <td>{p.number || "—"}</td>
            <th>Island / class</th>
            <td>{p.group || "—"}</td>
          </tr>
        </tbody>
      </table>

      <table className="rs-scores">
        <thead>
          <tr>
            <th>Category</th>
            <th>Start</th>
            <th>Deducted</th>
            <th>Score</th>
            <th>Marks</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((c) => {
            const s = byCategory[c.id];
            return (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td>{s.start}</td>
                <td>−{s.deducted}</td>
                <td>{s.score}</td>
                <td>{s.count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="rs-section-title">
        Pinpointed mistakes ({state.mistakes.length})
      </div>
      {groups.length === 0 ? (
        <p className="rs-empty">No mistakes recorded.</p>
      ) : (
        <div className="rs-ayahs">
          {groups.map((g) => {
            const ref = g.ayah === null ? "Basmala" : `${g.surah}:${g.ayah}`;
            const text = ayahText.get(`${g.surah}:${g.ayah === null ? "b" : g.ayah}`);
            return (
              <div className="rs-ayah" key={ref}>
                <div className="rs-ayah-head">
                  <span className="rs-ayah-ref">{ref}</span>
                  {text && (
                    <span className="rs-ayah-text" dir="rtl">
                      {text}
                    </span>
                  )}
                </div>
                <table className="rs-mistakes">
                  <tbody>
                    {g.marks.map((m) => (
                      <tr key={m.id}>
                        <td className="rs-glyph">{m.glyph}</td>
                        <td>{m.label}</td>
                        <td>{CATEGORIES.find((c) => c.id === m.category)?.label}</td>
                        <td>−{m.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {state.notes.trim() && (
        <>
          <div className="rs-section-title">Notes — faṣāḥa · voice &amp; melody</div>
          <p className="rs-notes">{state.notes}</p>
        </>
      )}
    </div>
  );
}
