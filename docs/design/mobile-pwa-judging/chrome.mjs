import { icon } from "./kit.mjs";

export const SAFE_TOP = 59, SAFE_BOTTOM = 34;

const tapBtn = (svg, label, extra = "") =>
  `<button type="button" aria-label="${label}" style="width: 44px; height: 44px; display: grid; place-items: center; border: 0; background: transparent; color: var(--ink-2); border-radius: 8px; flex: 0 0 auto; ${extra}">${svg}</button>`;

/** Empty status-bar / home-indicator reservations. Nothing is drawn in them. */
export const safeTop = `<div style="height: ${SAFE_TOP}px; flex: 0 0 auto; position: relative">
      <sc-if value="{{ guides }}" hint-placeholder-val="{{ true }}"><span class="guide" style="top: 0; height: ${SAFE_TOP}px"><i>safe area · 59</i></span></sc-if>
    </div>`;

export const safeBottom = `<div style="height: ${SAFE_BOTTOM}px; flex: 0 0 auto; position: relative">
      <sc-if value="{{ guides }}" hint-placeholder-val="{{ true }}"><span class="guide" style="top: 0; height: ${SAFE_BOTTOM}px"><i>home indicator · 34</i></span></sc-if>
    </div>`;

export const header = `<header style="display: flex; align-items: center; gap: 4px; padding: 6px 6px; background: var(--surface); border-bottom: 1px solid var(--line); flex: 0 0 auto">
      ${tapBtn(icon.back, "Back")}
      <div style="flex: 1 1 auto; min-width: 0; padding-left: 2px">
        <div style="font-size: 15px; font-weight: 550; letter-spacing: -0.02em; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">Hassan Yoonus</div>
        <div style="font-size: 11px; color: var(--ink-3); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">3 of 18 · Under 14 · Hifz</div>
      </div>
      <button type="button" style="display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 10px; border: 1px solid var(--line-2); border-radius: 8px; background: transparent; color: var(--ink); flex: 0 0 auto">
        ${icon.pause}
        <span class="num" style="font-size: 13px; font-weight: 500">12:04</span>
      </button>
      ${tapBtn(icon.more, "More")}
    </header>`;

/** Page selector, 44px — a control pressed during a live recitation. */
export const pageRail = (extra = "") =>
  `<div style="display: flex; align-items: center; justify-content: center; gap: 4px; height: 44px; flex: 0 0 auto; ${extra}">
      ${tapBtn(icon.chevL, "Previous page")}
      <span class="num" style="min-width: 76px; text-align: center; font-size: 14px; font-weight: 500; color: var(--ink-2)">562</span>
      ${tapBtn(icon.chevL, "Next page", "transform: scaleX(-1)")}
    </div>`;

export const CRITERIA = [
  { id: "jali", cls: "cat-jali", name: "Laḥn Jalī", short: "Jalī", max: 50 },
  { id: "khafi", cls: "cat-khafi", name: "Laḥn Khafī", short: "Khafī", max: 30 },
  { id: "fasaha", cls: "cat-fasaha", name: "Faṣāḥa", short: "Faṣ", max: 10 },
  { id: "adu", cls: "cat-adu", name: "Adu / Raagu", short: "Adu", max: 10 },
];

/** The score instrument: four rows in one ledger, anatomy copied from .sc-row. */
export function scoreRows() {
  return `<div style="display: flex; flex-direction: column">
        <sc-for list="{{ rows }}" as="row" hint-placeholder-count="4">
          <div class="{{ row.cls }}" style="display: grid; grid-template-columns: 9px minmax(0, 1fr) 46px 78px; align-items: center; gap: 8px; min-height: 44px; padding: 4px 0; border-bottom: 1px solid var(--line)">
            <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c)"></span>
            <span style="font-size: 14px; min-width: 0">{{ row.name }}</span>
            <span class="num" style="font-size: 12px; font-weight: 500; text-align: right; color: {{ row.dedInk }}">{{ row.ded }}</span>
            <sc-if value="{{ row.editable }}" hint-placeholder-val="{{ false }}">
              <button type="button" class="num" style="justify-self: end; width: 78px; min-height: 44px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface); color: var(--ink); font-size: 15px; font-weight: 500">{{ row.score }}<span style="font-size: 12px; font-weight: 400; color: var(--ink-3)">/{{ row.max }}</span></button>
            </sc-if>
            <sc-if value="{{ row.readonly }}" hint-placeholder-val="{{ true }}">
              <span class="num" style="text-align: center; white-space: nowrap"><span style="font-size: 15px; font-weight: 500">{{ row.score }}</span><span style="font-size: 12px; color: var(--ink-3)">/{{ row.max }}</span></span>
            </sc-if>
          </div>
        </sc-for>
      </div>`;
}

/** Total line, anatomy copied from .sc-total. */
export const scoreTotal = `<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 9px; border-bottom: 1px solid var(--line-2)">
        <span class="lbl">Score</span>
        <span style="display: inline-flex; align-items: baseline; white-space: nowrap">
          <span class="num" style="font-size: 30px; font-weight: 550; letter-spacing: -0.02em; line-height: 1">{{ total }}</span>
          <span class="num" style="font-size: 13px; color: var(--ink-3)">/100</span>
        </span>
      </div>`;

/** Adu / Raagu reason — a contained row, not a permanent one. */
export const aduReason = `<div class="cat-adu" style="display: flex; align-items: center; gap: 8px; padding-top: 10px">
        <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c); flex: 0 0 auto"></span>
        <input value="Breath control on long ayāt" style="flex: 1 1 auto; min-width: 0; font: inherit; font-size: 12px; color: var(--ink); background: transparent; border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; min-height: 34px">
      </div>`;

export function actionsRow(onFinish = "") {
  const finish = onFinish
    ? `<button type="button" onClick="${onFinish}" style="flex: 1 1 auto; min-height: 48px; border: 1px solid transparent; border-radius: 8px; background: var(--ink); color: var(--bg); font-size: 15px; font-weight: 500">Finish recitation</button>`
    : `<button type="button" style="flex: 1 1 auto; min-height: 48px; border: 1px solid transparent; border-radius: 8px; background: var(--ink); color: var(--bg); font-size: 15px; font-weight: 500">Finish recitation</button>`;
  return `<div style="display: flex; align-items: center; gap: 8px; padding-top: 12px">
        <button type="button" style="display: inline-flex; align-items: center; gap: 7px; height: 48px; padding: 0 14px; border: 1px solid var(--line-2); border-radius: 8px; background: transparent; color: var(--ink-2); font-size: 14px; font-weight: 500; flex: 0 0 auto">${icon.note}Notes</button>
        ${finish}
      </div>`;
}

/** Mistake rows, anatomy copied from .log-row / .log-row-wrap. */
export const mistakeRows = `<div style="display: flex; flex-direction: column; gap: 5px">
        <sc-for list="{{ marks }}" as="m" hint-placeholder-count="3">
          <button type="button" class="{{ m.cls }}" style="display: grid; grid-template-columns: 8px 36px 52px minmax(0, 1fr) 14px; align-items: center; gap: 8px; width: 100%; min-height: 46px; padding: 4px 9px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); text-align: left">
            <span style="width: 8px; height: 10px; border-radius: 3px; background: var(--c)"></span>
            <span style="font-family: var(--quran); font-size: 21px; line-height: 1; color: var(--ink); text-align: center">{{ m.glyph }}</span>
            <span class="num" style="font-size: 13px; font-weight: 500; color: var(--ink-2)">{{ m.amt }}</span>
            <span style="min-width: 0; font-size: 12px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ m.detail }}</span>
            <span style="display: grid; place-items: center; color: var(--ink-3)">${icon.chevR}</span>
          </button>
        </sc-for>
      </div>`;

export const scrim = (onClose) =>
  `<button type="button" aria-label="Close" onClick="${onClose}" style="position: absolute; inset: 0; z-index: 40; border: 0; background: var(--scrim)"></button>`;

export const grabber = `<div style="width: 36px; height: 4px; border-radius: 2px; background: var(--line-2); margin: 0 auto 12px"></div>`;

/** Shared score/marks model. Undoing removes the Faṣāḥa mark. */
export const MODEL = `
  criteria(undone) {
    const fasaha = undone ? 10 : 9.5;
    return [
      { id: "jali", cls: "cat-jali", name: "Laḥn Jalī", short: "Jalī", score: 48, max: 50, ded: "−2" },
      { id: "khafi", cls: "cat-khafi", name: "Laḥn Khafī", short: "Khafī", score: 29, max: 30, ded: "−1" },
      { id: "fasaha", cls: "cat-fasaha", name: "Faṣāḥa", short: "Faṣ", score: fasaha, max: 10, ded: undone ? "—" : "−0.5" },
      { id: "adu", cls: "cat-adu", name: "Adu / Raagu", short: "Adu", score: 8.5, max: 10, ded: "−1.5" },
    ];
  }
  rows(undone) {
    return this.criteria(undone).map((c) => ({
      cls: c.cls, name: c.name, ded: c.ded, score: c.score, max: c.max,
      dedInk: c.ded === "—" ? "var(--ink-3)" : "var(--ink-2)",
      editable: c.id === "adu", readonly: c.id !== "adu",
    }));
  }
  total(undone) {
    return this.criteria(undone).reduce((s, c) => s + c.score, 0);
  }
  markList(undone) {
    const all = [
      { cls: "cat-fasaha", glyph: "نَذِيرٞ", amt: "−0.5", detail: "Faṣāḥa · 67:8 · 2:14" },
      { cls: "cat-khafi", glyph: "لَهَا", amt: "−1", detail: "Laḥn Khafī · 67:7 · 1:52" },
      { cls: "cat-jali", glyph: "كَرَّتَيۡنِ", amt: "−2", detail: "Laḥn Jalī · 67:4 · 1:09" },
    ];
    return undone ? all.slice(1) : all;
  }
`;
