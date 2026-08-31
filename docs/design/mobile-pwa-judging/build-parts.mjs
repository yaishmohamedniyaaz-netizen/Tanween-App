import fs from "node:fs";
import { dc, icon, markedWords } from "./kit.mjs";
import { CHROME_CSS, header, pageNav } from "./chrome.mjs";

const W = 430, H = 1980;

const sec = (n, title, note, inner) => `
      <section style="display: flex; flex-direction: column; gap: 10px">
        <div style="display: flex; align-items: baseline; gap: 8px">
          <span class="num lbl">${n}</span><span class="lbl" style="color: var(--ink)">${title}</span>
          <span style="margin-left: auto; text-align: right; font-size: 11.5px; color: var(--ink-3)">${note}</span>
        </div>
        ${inner}
      </section>`;

const CATS = [
  ["cat-jali", "Jalī", "−2", 48, 50],
  ["cat-khafi", "Khafī", "−1", 29, 30],
  ["cat-fasaha", "Faṣāḥa", "−0.5", 9.5, 10],
  ["cat-adu", "Adu / Raagu", "−1.5", 8.5, 10],
];

/** One chip strip: n criteria, tint mode off | earned | always. */
const strip = (n, tint, clean = 0) => `<div style="display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 1px; height: 44px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden">
          ${CATS.slice(0, n).map(([cls, short, dedRaw], i) => {
            const ded = i >= n - clean ? "—" : dedRaw;
            const bg = tint === "always" || (tint === "earned" && ded !== "—") ? "var(--c-wash)" : "var(--surface)";
            const dot = tint === "off" ? `<i style="width: 6px; height: 9px; border-radius: 2px; background: var(--c); flex: 0 0 auto"></i>` : "";
            return `<div class="${cls}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-width: 0; padding: 0 4px; background: ${bg}">
              <span style="display: inline-flex; align-items: center; gap: 4px; max-width: 100%; font-size: 11px; line-height: 1.1; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${dot}${short}</span>
              <span class="num" style="font-size: 14px; font-weight: 500; line-height: 1.1; color: var(--ink)">${ded}</span>
            </div>`;
          }).join("")}
        </div>`;

const scoreInstrument = `<div style="border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest); padding: 14px 14px 12px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 9px; border-bottom: 1px solid var(--line-2)">
            <span class="lbl">Score</span>
            <span style="display: inline-flex; align-items: baseline">
              <span class="num" style="font-size: 30px; font-weight: 550; letter-spacing: -0.02em; line-height: 1">95</span>
              <span class="num" style="font-size: 13px; color: var(--ink-3)">/100</span>
            </span>
          </div>
          ${CATS.map(([cls, short, ded, score, max], i) => {
            const name = ["Laḥn Jalī", "Laḥn Khafī", "Faṣāḥa", "Adu / Raagu"][i];
            const value = i === 3
              ? `<button type="button" class="num" style="justify-self: end; width: 78px; min-height: 44px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface); color: var(--ink); font-size: 15px; font-weight: 500">${score}<span style="font-size: 12px; font-weight: 400; color: var(--ink-3)">/${max}</span></button>`
              : `<span class="num" style="text-align: center; white-space: nowrap"><span style="font-size: 15px; font-weight: 500">${score}</span><span style="font-size: 12px; color: var(--ink-3)">/${max}</span></span>`;
            return `<div class="${cls}" style="display: grid; grid-template-columns: 9px minmax(0, 1fr) 46px 78px; align-items: center; gap: 8px; min-height: 44px; padding: 4px 0; border-bottom: 1px solid var(--line)">
              <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c)"></span>
              <span style="font-size: 14px">${name}</span>
              <span class="num" style="font-size: 12px; font-weight: 500; text-align: right; color: var(--ink-2)">${ded}</span>
              ${value}
            </div>`;
          }).join("")}
        </div>`;

/* Adu / Raagu ruler — geometry from .mark-ruler in global.css */
const RW = 382;
const ticks = Array.from({ length: 21 }, (_, i) => {
  const whole = i % 2 === 0;
  const label = whole ? `<i style="position: absolute; top: 25px; left: 50%; transform: translateX(-50%); color: var(--ink-3); font-size: 12px; font-weight: 570; font-style: normal; line-height: 1; font-variant-numeric: tabular-nums">${i / 2}</i>` : "";
  return `<span style="position: absolute; z-index: 2; top: 50%; left: ${(i / 20) * 100}%; width: ${whole ? 2 : 1}px; height: ${whole ? 16 : 8}px; transform: translate(-${whole ? 1 : 0.5}px, -50%); background: ${whole ? "var(--ink-3)" : "var(--line-2)"}">${label}</span>`;
}).join("");

const ruler = `<div class="cat-adu" style="position: relative; width: ${RW}px; height: 116px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface); box-shadow: var(--shadow-float)">
          <div style="position: absolute; inset: 58px 32px 30px">
            <span style="position: absolute; top: 50%; right: 0; left: 0; height: 4px; transform: translateY(-50%); border-radius: 2px; background: var(--line-2)"></span>
            <span style="position: absolute; z-index: 1; top: 50%; left: 0; width: 85%; height: 4px; transform: translateY(-50%); border-radius: 2px 0 0 2px; background: color-mix(in srgb, var(--c) 46%, var(--line-2))"></span>
            ${ticks}
            <span style="position: absolute; left: 85%; bottom: calc(100% + 10px); display: grid; place-items: center; width: 60px; height: 42px; transform: translateX(-50%); border: 1px solid var(--line-2); border-radius: 12px; background: var(--surface); box-shadow: 0 3px 12px color-mix(in srgb, var(--ink) 18%, transparent)">
              <span class="num" style="font-size: 19px; font-weight: 550; line-height: 1">8.5</span>
            </span>
          </div>
        </div>`;

const stepper = `<div class="cat-adu" style="display: flex; align-items: center; gap: 10px; width: ${RW}px; padding: 8px 10px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface)">
          <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c)"></span>
          <span style="font-size: 13px; color: var(--ink-2)">Adu / Raagu</span>
          <button type="button" aria-label="Subtract 0.5 marks" style="margin-left: auto; width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--line-2); border-radius: 8px; background: transparent; color: var(--ink-2)">${icon("minus", 17)}</button>
          <span class="num" style="min-width: 46px; text-align: center; font-size: 17px; font-weight: 550">8.5</span>
          <button type="button" aria-label="Add 0.5 marks" style="width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--line-2); border-radius: 8px; background: transparent; color: var(--ink-2)">${icon("plus", 17)}</button>
        </div>`;

const closedRow = `<button type="button" class="cat-jali" style="display: grid; grid-template-columns: 8px 76px 52px minmax(0, 1fr) 14px; align-items: center; gap: 8px; width: 100%; min-height: 46px; padding: 4px 9px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); text-align: left">
            <span style="width: 8px; height: 10px; border-radius: 3px; background: var(--c)"></span>
            <span style="font-family: var(--quran); font-size: 19px; line-height: 1.4; text-align: center">${markedWords.jali}</span>
            <span class="num" style="font-size: 13px; font-weight: 500; color: var(--ink-2)">−2</span>
            <span style="font-size: 12px; color: var(--ink-3)">Laḥn Jalī · 67:4 · 1:52</span>
            <span style="display: grid; place-items: center; color: var(--ink-3)">${icon("chevron", 14)}</span>
          </button>`;

const openRow = `<div class="cat-khafi" style="border: 1px solid var(--line); border-radius: 8px; background: var(--surface); overflow: hidden">
            <div style="display: grid; grid-template-columns: 8px 76px 52px minmax(0, 1fr) 14px; align-items: center; gap: 8px; min-height: 46px; padding: 4px 9px">
              <span style="width: 8px; height: 10px; border-radius: 3px; background: var(--c)"></span>
              <span style="font-family: var(--quran); font-size: 19px; line-height: 1.4; text-align: center">${markedWords.khafi}</span>
              <span class="num" style="font-size: 13px; font-weight: 500; color: var(--ink-2)">−1</span>
              <span style="font-size: 12px; color: var(--ink-3)">Laḥn Khafī · 67:3 · 1:09</span>
              <span style="display: grid; place-items: center; color: var(--ink-3)">${icon("chevron", 14, "transform: rotate(90deg)")}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 0 9px 10px 25px">
              <span style="font-family: var(--quran); font-size: 18px; line-height: 1.4; padding-right: 4px">مِن ${markedWords.khafi}</span>
              <button type="button" aria-label="Less" style="margin-left: auto; width: 44px; height: 44px; border: 1px solid var(--line-2); background: transparent; color: var(--ink-2); border-radius: 8px; display: grid; place-items: center">${icon("minus", 16)}</button>
              <span class="num" style="font-size: 14px; font-weight: 500; min-width: 34px; text-align: center">1.0</span>
              <button type="button" aria-label="More" style="width: 44px; height: 44px; border: 1px solid var(--line-2); background: transparent; color: var(--ink-2); border-radius: 8px; display: grid; place-items: center">${icon("plus", 16)}</button>
              <button type="button" style="height: 44px; padding: 0 10px; border: 0; background: transparent; color: var(--ink-2); font-size: 13px; font-weight: 500">Undo</button>
            </div>
          </div>`;

const audit = [
  ["Header buttons · Results, theme, more", "44 × 44 hit · 34 visible"],
  ["Reciter chip", "44 high"],
  ["Page selector · next, page, previous", "44 × 44 hit · 28 visible"],
  ["Dock zones · score, mistakes, Finish", "48 high"],
  ["Last-action Undo", "44 high"],
  ["Adu / Raagu picker in the score sheet", "78 × 44"],
  ["Adu / Raagu step buttons", "44 × 44"],
  ["Mistake row", "46 high"],
  ["Review actions · Keep judging, Save", "48 high"],
].map(([k, v], i) => `<div style="display: flex; align-items: center; gap: 12px; min-height: 30px; ${i ? "border-top: 1px solid var(--line);" : ""} padding: 4px 0">
            <span style="font-size: 13px; color: var(--ink-2)">${k}</span>
            <span class="num" style="margin-left: auto; font-size: 12.5px; font-weight: 500; white-space: nowrap">${v}</span>
          </div>`).join("");

const navDemo = `<div style="position: relative; height: 60px; border: 1px dashed var(--line-2); border-radius: 12px; background: var(--page-paper)">
          <div style="display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center; gap: 8px; padding: 12px 24px 0; color: var(--ink-2); font-size: 10px">
            <span>Juz 29</span><span style="min-width: 52px"></span>
            <span style="font-family: var(--quran); font-size: 1.35em; text-align: right; justify-self: end">الملك</span>
          </div>
          ${pageNav}
        </div>`;

const body = `<div class="f" data-t="{{ theme }}" style="position: relative; width: 100%; max-width: ${W}px; height: ${H}px; margin-inline: auto; overflow: hidden; background: var(--bg); padding: 24px; display: flex; flex-direction: column; gap: 24px">
      <div>
        <div style="font-size: 21px; font-weight: 570; letter-spacing: -0.02em">Shared parts</div>
        <div style="font-size: 13px; color: var(--ink-3); line-height: 1.5; max-width: 340px">Recreated at 1:1 from <span style="font-family: ui-monospace, monospace; font-size: 12px">Header.tsx</span>, <span style="font-family: ui-monospace, monospace; font-size: 12px">PageNav.tsx</span> and <span style="font-family: ui-monospace, monospace; font-size: 12px">global.css</span>.</div>
      </div>
      ${sec("01", "Header", "the page is width-capped, so the reclaimed 44 goes here", `<div style="display: flex; flex-direction: column; gap: 14px">
        <div style="display: grid; gap: 5px"><span class="num lbl" style="font-size: 10px">55 · today</span><div style="border: 1px solid var(--line); border-radius: 12px; overflow: hidden">${header()}</div></div>
        <div style="display: grid; gap: 5px"><span class="num lbl" style="font-size: 10px">64 · proposed</span><div style="border: 1px solid var(--line); border-radius: 12px; overflow: hidden">${header(true)}</div></div>
      </div>`)}
      ${sec("02", "Page selector", "floats in the page's own centre slot", navDemo)}
      ${sec("03", "Criterion strip", "a judge is assigned 1–4 criteria", `<div style="display: flex; flex-direction: column; gap: 8px">${strip(4, "off")}${strip(3, "off")}${strip(2, "off")}${strip(1, "off")}</div>`)}
      ${sec("04", "Colour treatment", "off · earned · always, early in a recitation", `<div style="display: flex; flex-direction: column; gap: 8px">${strip(4, "off", 3)}${strip(4, "earned", 3)}${strip(4, "always", 3)}</div>`)}
      ${sec("05", "Score instrument", "one ledger, not four cards", scoreInstrument)}
      ${sec("06", "Mistake row", "closed, and opened for adjustment", `<div style="display: flex; flex-direction: column; gap: 8px">${closedRow}${openRow}</div>`)}
      ${sec("07", "Adu / Raagu · Horizontal", "aduRaaguInputMode = ruler", ruler)}
      ${sec("08", "Adu / Raagu · Step buttons", "aduRaaguInputMode = stepper", stepper)}
      ${sec("09", "Live target audit", "floor is 44", `<div>${audit}</div>`)}
    </div>`;

fs.writeFileSync("Parts.dc.html", dc({
  css: CHROME_CSS,
  props: `{"dark":{"editor":"boolean","default":false,"section":"View"},"$preview":{"width":${W},"height":${H}}}`,
  logic: `class Component extends DCLogic {
  renderVals() {
    return { theme: this.props.dark ? "dark" : "light" };
  }
}`,
  body,
}));
console.log("wrote Parts.dc.html", W, "x", H);
