import fs from "node:fs";
import { dc, icon } from "./kit.mjs";
import { scoreRows, scoreTotal, aduReason, MODEL } from "./chrome.mjs";

const W = 430, H = 1540;

const sec = (n, title, note, inner) => `
      <section style="display: flex; flex-direction: column; gap: 10px">
        <div style="display: flex; align-items: baseline; gap: 8px">
          <span class="num lbl" style="color: var(--ink-3)">${n}</span>
          <span class="lbl" style="color: var(--ink)">${title}</span>
          <span style="font-size: 11.5px; color: var(--ink-3); margin-left: auto; text-align: right">${note}</span>
        </div>
        ${inner}
      </section>`;

const CATS = [
  ["cat-jali", "Laḥn Jalī", "كَرَّتَيۡنِ", "−2", "1:09 · 67:4"],
  ["cat-khafi", "Laḥn Khafī", "لَهَا", "−1", "1:52 · 67:7"],
  ["cat-fasaha", "Faṣāḥa", "نَذِيرٞ", "−0.5", "2:14 · 67:8"],
  ["cat-adu", "Adu / Raagu", "—", "−1.5", "set once"],
];

const strips = CATS.map(([cls, name, glyph, amt, meta]) => `
          <div class="${cls}" style="display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 4px 0 10px; background: var(--c-wash); border: 1px solid var(--line); border-radius: 8px">
            <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c); flex: 0 0 auto"></span>
            <span style="font-family: var(--quran); font-size: 19px; line-height: 1; color: var(--ink); min-width: 62px">${glyph}</span>
            <span style="font-size: 12px; color: var(--ink-2)">${name} · ${meta}</span>
            <span class="num" style="margin-left: auto; font-size: 14px; font-weight: 550">${amt}</span>
            <button type="button" style="display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 10px; border: 0; background: transparent; color: var(--c-strong); font-size: 13px; font-weight: 550">${icon.undo}Undo</button>
          </div>`).join("");

/* Adu / Raagu ruler — geometry copied from .mark-ruler in global.css */
const RW = 382;
const ticks = Array.from({ length: 21 }, (_, i) => {
  const whole = i % 2 === 0;
  const pct = (i / 20) * 100;
  const label = whole
    ? `<i style="position: absolute; top: 25px; left: 50%; transform: translateX(-50%); color: var(--ink-3); font-size: 12px; font-weight: 570; font-style: normal; line-height: 1; font-variant-numeric: tabular-nums">${i / 2}</i>`
    : "";
  return `<span style="position: absolute; z-index: 2; top: 50%; left: ${pct}%; width: ${whole ? 2 : 1}px; height: ${whole ? 16 : 8}px; transform: translate(-${whole ? 1 : 0.5}px, -50%); background: ${whole ? "var(--ink-3)" : "var(--line-2)"}">${label}</span>`;
}).join("");

const ruler = `<div class="cat-adu" style="position: relative; width: ${RW}px; height: 116px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface); box-shadow: var(--shadow-float)">
          <div style="position: absolute; inset: 58px 32px 30px">
            <span style="position: absolute; top: 50%; right: 0; left: 0; height: 4px; transform: translateY(-50%); border-radius: 2px; background: var(--line-2)"></span>
            <span style="position: absolute; z-index: 1; top: 50%; left: 0; width: 85%; height: 4px; transform: translateY(-50%); border-radius: 2px 0 0 2px; background: color-mix(in srgb, var(--c) 46%, var(--line-2))"></span>
            ${ticks}
            <span style="position: absolute; left: 85%; bottom: calc(100% + 10px); display: grid; place-items: center; width: 60px; height: 42px; transform: translateX(-50%); border: 1px solid var(--line-2); border-radius: 12px; background: var(--surface); box-shadow: 0 3px 12px color-mix(in srgb, var(--ink) 18%, transparent); color: var(--ink)">
              <span class="num" style="font-size: 19px; font-weight: 550; line-height: 1">8.5</span>
            </span>
          </div>
        </div>`;

const audit = [
  ["Header buttons · back, pause, more", "44 × 44"],
  ["Page selector · previous, next", "44 × 44"],
  ["Dock zones · score, marks, Finish", "48 high"],
  ["Last-action Undo", "44 high"],
  ["Adu / Raagu picker in the score sheet", "78 × 44"],
  ["Mistake row in the sheet", "46 high"],
  ["Finish recitation", "48 high"],
].map(([k, v], i) => `
          <div style="display: flex; align-items: center; gap: 12px; min-height: 30px; ${i ? "border-top: 1px solid var(--line);" : ""} padding: 4px 0">
            <span style="font-size: 13px; color: var(--ink-2); min-width: 0">${k}</span>
            <span class="num" style="margin-left: auto; font-size: 13px; font-weight: 500">${v}</span>
          </div>`).join("");

const closedRow = `<button type="button" class="cat-jali" style="display: grid; grid-template-columns: 8px 36px 52px minmax(0, 1fr) 14px; align-items: center; gap: 8px; width: 100%; min-height: 46px; padding: 4px 9px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); text-align: left">
            <span style="width: 8px; height: 10px; border-radius: 3px; background: var(--c)"></span>
            <span style="font-family: var(--quran); font-size: 21px; line-height: 1; text-align: center">كَرَّتَيۡنِ</span>
            <span class="num" style="font-size: 13px; font-weight: 500; color: var(--ink-2)">−2</span>
            <span style="font-size: 12px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">Laḥn Jalī · 67:4 · 1:09</span>
            <span style="display: grid; place-items: center; color: var(--ink-3)">${icon.chevR}</span>
          </button>`;

const openRow = `<div class="cat-khafi" style="border: 1px solid var(--line); border-radius: 8px; background: var(--surface); overflow: hidden">
            <div style="display: grid; grid-template-columns: 8px 36px 52px minmax(0, 1fr) 14px; align-items: center; gap: 8px; min-height: 46px; padding: 4px 9px">
              <span style="width: 8px; height: 10px; border-radius: 3px; background: var(--c)"></span>
              <span style="font-family: var(--quran); font-size: 21px; line-height: 1; text-align: center">لَهَا</span>
              <span class="num" style="font-size: 13px; font-weight: 500; color: var(--ink-2)">−1</span>
              <span style="font-size: 12px; color: var(--ink-3)">Laḥn Khafī · 67:7 · 1:52</span>
              <span style="display: grid; place-items: center; color: var(--ink-3); transform: rotate(90deg)">${icon.chevR}</span>
            </div>
            <div style="padding-left: 25px">
              <div style="display: flex; align-items: center; gap: 6px; padding: 0 9px 10px 0">
                <span style="font-family: var(--quran); font-size: 19px; line-height: 1; padding-right: 4px">سَمِعُواْ لَهَا</span>
                <button type="button" aria-label="Less" style="width: 44px; height: 44px; border: 1px solid var(--line-2); background: transparent; color: var(--ink-2); border-radius: 8px; display: grid; place-items: center; font-size: 17px">−</button>
                <span class="num" style="font-size: 14px; font-weight: 500; min-width: 34px; text-align: center">1.0</span>
                <button type="button" aria-label="More" style="width: 44px; height: 44px; border: 1px solid var(--line-2); background: transparent; color: var(--ink-2); border-radius: 8px; display: grid; place-items: center; font-size: 17px">+</button>
                <button type="button" style="margin-left: auto; display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 10px; border: 0; background: transparent; color: var(--ink-2); font-size: 13px; font-weight: 500">${icon.undo}Undo</button>
              </div>
            </div>
          </div>`;

const dockDemo = `<div style="width: 361px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest); overflow: hidden">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; height: 44px; background: var(--line)">
            <sc-for list="{{ chips }}" as="c" hint-placeholder-count="4">
              <div class="{{ c.cls }}" style="display: flex; align-items: center; justify-content: center; gap: 5px; background: var(--surface)">
                <span style="width: 6px; height: 10px; border-radius: 2px; background: var(--c)"></span>
                <span style="font-size: 11px; color: var(--ink-3)">{{ c.short }}</span>
                <span class="num" style="font-size: 14px; font-weight: 500">{{ c.score }}</span>
              </div>
            </sc-for>
          </div>
          <div style="display: grid; grid-template-columns: 1.05fr 0.95fr 104px; gap: 1px; height: 48px; background: var(--line)">
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--surface)">
              <span class="lbl">Score</span>
              <span class="num" style="font-size: 17px; font-weight: 550">{{ total }}</span>
              <span class="num" style="font-size: 12px; color: var(--ink-3)">/100</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; background: var(--surface)">
              <span class="num" style="font-size: 15px; font-weight: 500">3</span>
              <span style="font-size: 13px; color: var(--ink-2)">marks</span>
              <span style="display: grid; place-items: center; color: var(--ink-3)">${icon.chevUp}</span>
            </div>
            <div style="display: grid; place-items: center; background: var(--ink); color: var(--bg); font-size: 14px; font-weight: 500">Finish</div>
          </div>
        </div>`;

const body = `<div class="f" data-t="{{ theme }}" style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: var(--bg); padding: 24px; display: flex; flex-direction: column; gap: 26px">
      <div>
        <div style="font-size: 21px; font-weight: 550; letter-spacing: -0.02em">Shared parts</div>
        <div style="font-size: 13px; color: var(--ink-3); line-height: 1.5; max-width: 340px">Drawn at 1:1 from the tokens in <span style="font-family: ui-monospace, monospace; font-size: 12px">src/styles/global.css</span>. Whichever direction wins, these pieces stay the same.</div>
      </div>
      ${sec("01", "Status dock", "92 high · A and D", dockDemo)}
      ${sec("02", "Last-action strip", "44 high · one per verdict colour", `<div style="display: flex; flex-direction: column; gap: 6px">${strips}</div>`)}
      ${sec("03", "Score instrument", "one ledger, not four cards", `<div style="border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest); padding: 14px 14px 12px">${scoreTotal}${scoreRows()}${aduReason}</div>`)}
      ${sec("04", "Mistake row", "closed, and opened for adjustment", `<div style="display: flex; flex-direction: column; gap: 8px">${closedRow}${openRow}</div>`)}
      ${sec("05", "Adu / Raagu ruler", "unchanged control, new placement", ruler)}
      ${sec("06", "Live target audit", "floor is 44", `<div>${audit}</div>`)}
    </div>`;

const logic = `class Component extends DCLogic {
${MODEL}
  renderVals() {
    return {
      theme: this.props.dark ? "dark" : "light",
      chips: this.criteria(false),
      rows: this.rows(false),
      total: this.total(false),
    };
  }
}`;

fs.writeFileSync("Parts.dc.html", dc({
  props: `{"dark":{"editor":"boolean","default":false,"section":"Theme"},"$preview":{"width":${W},"height":${H}}}`,
  logic,
  body,
}));
console.log("wrote Parts.dc.html", W, "x", H);
