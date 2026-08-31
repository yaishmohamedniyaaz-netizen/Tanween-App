import { icon, markedWords } from "./kit.mjs";

export const SAFE_TOP = 59, SAFE_BOTTOM = 34;

/* App chrome recreated from Header.tsx and the phone block at global.css:9878,
   and from PageNav.tsx / .mushaf-shared-nav. Class-based because these are
   reproductions of app chrome, not surfaces a viewer should restyle. */
export const CHROME_CSS = `
.hdr{display:grid;grid-template-columns:auto minmax(0,1fr) 44px 44px 44px;align-items:center;gap:4px;
  padding:5px 10px;background:var(--surface);border-bottom:1px solid var(--line);flex:0 0 auto}
.hdr.is-tall{padding:10px}
.brand-mark{font-family:var(--quran);font-size:23px;line-height:1;color:var(--ink)}
.chip{position:relative;isolation:isolate;display:flex;align-items:center;width:100%;height:44px;min-width:0;
  padding:0 10px;border:0;background:transparent;color:var(--ink);white-space:nowrap;overflow:hidden}
.chip::before{content:"";position:absolute;inset:5px 0;z-index:0;border:1px solid var(--line-2);border-radius:8px}
.chip>span{position:relative;z-index:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:13px;font-weight:500}
.hbtn{position:relative;isolation:isolate;display:grid;place-items:center;width:44px;height:44px;
  border:0;background:transparent;color:var(--ink-2);padding:0}
.hbtn::before{content:"";position:absolute;inset:5px;z-index:0;border:1px solid var(--line-2);border-radius:8px}
.hbtn>svg{position:relative;z-index:1}

.dock{container-type:inline-size}
@container (max-width: 312px){.dock-sub{display:none}}
.err{color:#9e2820}
.f[data-t="dark"] .err{color:#e17c73}
.pnav{position:absolute;top:4px;left:8px;right:8px;z-index:12;display:grid;
  grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;height:44px;pointer-events:none}
.pnav-in{grid-column:2;display:flex;align-items:center;justify-content:center;gap:4px;pointer-events:auto}
.pbtn,.ppage{height:44px;border:0;background:transparent;padding:0;display:grid;place-items:center}
.pbtn{width:44px}
.pbtn i,.ppage i{display:grid;place-items:center;height:28px;font-style:normal;line-height:1;
  border:1px solid var(--line-2);background:color-mix(in srgb,var(--page-paper) 88%,transparent)}
.pbtn i{width:28px;border-radius:999px;color:var(--ink-2);font-size:17px}
.ppage i{min-width:52px;padding:0 9px;border-radius:8px;color:var(--ink);font-size:12px;font-weight:500;font-variant-numeric:tabular-nums}
`;

/** Real header: wordmark, reciter chip (name only on phone), Results, theme, more. */
export const header = (tall = false) => `<header class="hdr${tall ? " is-tall" : ""}">
      <span class="brand-mark" aria-hidden="true">تَحْقِيق</span>
      <button type="button" class="chip" title="Finish or change reciter"><span>Hassan Yoonus</span></button>
      <button type="button" class="hbtn" aria-label="Results">${icon("fileCheck", 15)}</button>
      <button type="button" class="hbtn" aria-label="Switch to dark mode">${icon("moon", 17)}</button>
      <button type="button" class="hbtn" aria-label="More actions and view controls">${icon("dots", 17)}</button>
    </header>`;

/** Page selector, floating in the page's own centre marginalia slot.
    ‹ is next and › is previous — the Mushaf reads right to left. */
export const pageNav = `<div class="pnav">
        <div class="pnav-in">
          <button type="button" class="pbtn" aria-label="next page"><i>‹</i></button>
          <button type="button" class="ppage" aria-label="Pages 562. Jump to page."><i>562</i></button>
          <button type="button" class="pbtn" aria-label="previous page"><i>›</i></button>
        </div>
      </div>`;

/** Score instrument rows — anatomy from .sc-row in global.css. */
export const scoreRows = `<div style="display: flex; flex-direction: column">
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

export const scoreTotal = `<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 9px; border-bottom: 1px solid var(--line-2)">
        <span class="lbl">Score</span>
        <span style="display: inline-flex; align-items: baseline; white-space: nowrap">
          <span class="num" style="font-size: 30px; font-weight: 550; letter-spacing: -0.02em; line-height: 1">{{ total }}</span>
          <span class="num" style="font-size: 13px; color: var(--ink-3)">/{{ totalMax }}</span>
        </span>
      </div>`;

/** JudgeRoleStrip, folded into the sheet head — anatomy from .judge-role-*. */
export const judgeLine = `<div style="display: flex; align-items: center; gap: 8px; min-height: 24px; padding-bottom: 10px; color: var(--ink-2); font-size: 11.5px">
        <strong style="color: var(--ink); font-weight: 550">Judge 1</strong>
        <span style="display: flex; gap: 3px">
          <sc-for list="{{ chips }}" as="c" hint-placeholder-count="4">
            <i class="{{ c.cls }}" style="width: 7px; height: 9px; border-radius: 2px; background: var(--c)"></i>
          </sc-for>
        </span>
      </div>`;

export const aduReason = `<div class="cat-adu" style="display: flex; align-items: center; gap: 8px; padding-top: 10px">
        <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c); flex: 0 0 auto"></span>
        <input value="Breath control on long ayāt" style="flex: 1 1 auto; min-width: 0; font: inherit; font-size: 12px; color: var(--ink); background: transparent; border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; min-height: 34px">
      </div>`;

export const actionsRow = (onFinish = "") => `<div style="display: flex; align-items: center; gap: 8px; padding-top: 12px">
        <button type="button" style="display: inline-flex; align-items: center; gap: 7px; height: 48px; padding: 0 14px; border: 1px solid var(--line-2); border-radius: 8px; background: transparent; color: var(--ink-2); font-size: 14px; font-weight: 500; flex: 0 0 auto">${icon("marks", 16)}Notes</button>
        <button type="button"${onFinish ? ` onClick="${onFinish}"` : ""} style="flex: 1 1 auto; min-height: 48px; border: 0; border-radius: 8px; background: var(--ink); color: var(--bg); font-size: 15px; font-weight: 500">Finish recitation</button>
      </div>`;

/** Mistake rows — anatomy from .log-row / .log-row-wrap. */
export const mistakeRows = `<div style="display: flex; flex-direction: column; gap: 5px">
        <sc-for list="{{ marks }}" as="m" hint-placeholder-count="3">
          <button type="button" class="{{ m.cls }}" style="display: grid; grid-template-columns: 8px 76px 52px minmax(0, 1fr) 14px; align-items: center; gap: 8px; width: 100%; min-height: 46px; padding: 4px 9px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); text-align: left">
            <span style="width: 8px; height: 10px; border-radius: 3px; background: var(--c)"></span>
            <span style="font-family: var(--quran); font-size: 19px; line-height: 1.4; color: var(--ink); text-align: center; overflow: hidden; text-overflow: ellipsis">{{ m.glyph }}</span>
            <span class="num" style="font-size: 13px; font-weight: 500; color: var(--ink-2)">{{ m.amt }}</span>
            <span style="min-width: 0; font-size: 12px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ m.detail }}</span>
            <span style="display: grid; place-items: center; color: var(--ink-3)">${icon("chevron", 14)}</span>
          </button>
        </sc-for>
      </div>`;

export const scrim = (onClose) =>
  `<button type="button" aria-label="Close" onClick="${onClose}" style="position: absolute; inset: 0; z-index: 40; border: 0; background: var(--scrim)"></button>`;

export const grabber = `<div style="width: 36px; height: 4px; border-radius: 2px; background: var(--line-2); margin: 0 auto 12px"></div>`;

/** Shared model. Criterion count follows the judge's assignment (1-4). */
export const MODEL = `
  all(undone) {
    return [
      { id: "jali", cls: "cat-jali", name: "Laḥn Jalī", short: "Jalī", score: 48, max: 50, ded: "−2" },
      { id: "khafi", cls: "cat-khafi", name: "Laḥn Khafī", short: "Khafī", score: 29, max: 30, ded: "−1" },
      { id: "fasaha", cls: "cat-fasaha", name: "Faṣāḥa", short: "Faṣāḥa", score: undone ? 10 : 9.5, max: 10, ded: undone ? "—" : "−0.5" },
      { id: "adu", cls: "cat-adu", name: "Adu / Raagu", short: "Adu / Raagu", score: 8.5, max: 10, ded: "−1.5" },
    ];
  }
  criteria(undone) {
    const n = Math.min(4, Math.max(1, Math.round(this.props.criteria ?? 4)));
    const tint = this.props.tint ?? "earned";
    return this.all(undone).slice(0, n).map((c) => ({
      ...c,
      dot: tint === "off",
      bg: tint === "always" || (tint === "earned" && c.ded !== "—") ? "var(--c-wash)" : "var(--surface)",
    }));
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
  totalMax(undone) {
    return this.criteria(undone).reduce((s, c) => s + c.max, 0);
  }
  criteriaLabel(undone) {
    return this.criteria(undone).map((c) => c.name).join(" + ");
  }
  dedTotal(undone) {
    const sum = this.markList(undone).reduce((s, m) => s + Number(m.amt.replace("−", "")), 0);
    return sum === 0 ? "—" : "−" + (Math.round(sum * 10) / 10);
  }
  markList(undone) {
    const all = [
      { id: "fasaha", cls: "cat-fasaha", glyph: "${markedWords.fasaha}", amt: "−0.5", detail: "Faṣāḥa · 67:5 · 2:14" },
      { id: "jali", cls: "cat-jali", glyph: "${markedWords.jali}", amt: "−2", detail: "Jalī · 67:4 · 1:52" },
      { id: "khafi", cls: "cat-khafi", glyph: "${markedWords.khafi}", amt: "−1", detail: "Khafī · 67:3 · 1:09" },
    ];
    const owned = new Set(this.criteria(undone).map((c) => c.id));
    return all.filter((m) => owned.has(m.id) && !(undone && m.id === "fasaha"));
  }
`;
