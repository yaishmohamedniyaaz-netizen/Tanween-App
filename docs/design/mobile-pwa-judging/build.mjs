import fs from "node:fs";
import { dc, mushafPage, icon } from "./kit.mjs";
import {
  safeTop, safeBottom, header, pageRail, scoreRows, scoreTotal,
  aduReason, actionsRow, mistakeRows, scrim, grabber, MODEL,
} from "./chrome.mjs";

const PROPS = (extra = "") =>
  `{"dark":{"editor":"boolean","default":false,"section":"Theme"},"guides":{"editor":"boolean","default":true,"section":"Theme"}${extra},"$preview":{"width":393,"height":852}}`;

const frame = (inner) =>
  `<div class="f" data-t="{{ theme }}" style="position: relative; width: 393px; height: 852px; display: flex; flex-direction: column; overflow: hidden; background: var(--bg)">
    ${inner}
  </div>`;

const stage = (w) =>
  `<div style="flex: 1 1 auto; min-height: 0; display: flex; align-items: flex-start; justify-content: center; padding: 0 ${(393 - w) / 2}px">
      ${mushafPage(w)}
    </div>`;

const sheet = (inner, pad = "12px 16px") =>
  `<div style="position: absolute; left: 0; right: 0; bottom: 0; z-index: 50; background: var(--surface); border-top: 1px solid var(--line); border-radius: 20px 20px 0 0; box-shadow: var(--shadow-float); padding: ${pad}; padding-bottom: 46px">
      ${inner}
    </div>`;

const sheetHead = (title) =>
  `<div style="display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 10px">
        <span class="lbl">${title} <span class="num" style="letter-spacing: 0">{{ markCount }}</span></span>
        <button type="button" style="border: 0; background: transparent; color: var(--ink-3); font-size: 11px; font-weight: 500">History</button>
      </div>`;

const scoreSheet = (close) => sheet(`${grabber}
      ${scoreTotal}
      ${scoreRows()}
      ${aduReason}
      ${actionsRow()}`);

const marksSheet = () => sheet(`${grabber}
      ${sheetHead("Mistakes")}
      ${mistakeRows}
      <p style="margin: 12px 0 0; font-size: 11.5px; color: var(--ink-3); line-height: 1.45">Tap a mistake to reopen it on the page, change its weight, or undo it.</p>`);

const LOGIC = (state, extraVals = "") => `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = ${state};
  }
${MODEL}
  base() {
    const u = this.state.undone;
    return {
      theme: this.props.dark ? "dark" : "light",
      guides: this.props.guides !== false,
      rows: this.rows(u),
      total: this.total(u),
      marks: this.markList(u),
      markCount: this.markList(u).length,
      chips: this.criteria(u),
      undone: u,
      undo: () => this.setState({ undone: true, lastVisible: false }),
      close: () => this.setState({ sheet: "none" }),
      openScore: () => this.setState({ sheet: "score" }),
      openMarks: () => this.setState({ sheet: "marks" }),
    };
  }
  renderVals() {
    const b = this.base();
    ${extraVals}
    return b;
  }
}`;

/* ─────────────────────────────  A · status dock  ───────────────────────────── */

const chipStrip = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; height: 44px; background: var(--line)">
          <sc-for list="{{ chips }}" as="c" hint-placeholder-count="4">
            <div class="{{ c.cls }}" style="display: flex; align-items: center; justify-content: center; gap: 5px; background: var(--surface)">
              <span style="width: 6px; height: 10px; border-radius: 2px; background: var(--c); flex: 0 0 auto"></span>
              <span style="font-size: 11px; color: var(--ink-3)">{{ c.short }}</span>
              <span class="num" style="font-size: 14px; font-weight: 500">{{ c.score }}</span>
            </div>
          </sc-for>
        </div>`;

const lastStrip = `<div class="cat-fasaha" style="display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 4px 0 10px; background: var(--c-wash); border-bottom: 1px solid var(--line)">
          <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c); flex: 0 0 auto"></span>
          <span style="font-family: var(--quran); font-size: 19px; line-height: 1; color: var(--ink)">نَذِيرٞ</span>
          <span style="font-size: 12px; color: var(--ink-2)">Faṣāḥa · 2:14</span>
          <span class="num" style="margin-left: auto; font-size: 14px; font-weight: 550">−0.5</span>
          <button type="button" onClick="{{ undo }}" style="display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 10px; border: 0; background: transparent; color: var(--c-strong); font-size: 13px; font-weight: 550">${icon.undo}Undo</button>
        </div>`;

const dockRow = `<div style="display: grid; grid-template-columns: 1.05fr 0.95fr 104px; gap: 1px; height: 48px; background: var(--line)">
          <button type="button" onClick="{{ openScore }}" style="display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; background: var(--surface); color: var(--ink)">
            <span class="lbl">Score</span>
            <span class="num" style="font-size: 17px; font-weight: 550; letter-spacing: -0.01em">{{ total }}</span>
            <span class="num" style="font-size: 12px; color: var(--ink-3)">/100</span>
          </button>
          <button type="button" onClick="{{ openMarks }}" style="display: flex; align-items: center; justify-content: center; gap: 5px; border: 0; background: var(--surface); color: var(--ink)">
            <span class="num" style="font-size: 15px; font-weight: 500">{{ markCount }}</span>
            <span style="font-size: 13px; color: var(--ink-2)">marks</span>
            <span style="display: grid; place-items: center; color: var(--ink-3)">${icon.chevUp}</span>
          </button>
          <button type="button" style="display: grid; place-items: center; border: 0; background: var(--ink); color: var(--bg); font-size: 14px; font-weight: 500">Finish</button>
        </div>`;

const A = dc({
  props: PROPS(),
  logic: LOGIC(`{ sheet: "none", undone: false, lastVisible: true }`, `
    b.showLast = this.state.lastVisible && !this.state.undone;
    b.showStrip = !b.showLast;
    b.sheetScore = this.state.sheet === "score";
    b.sheetMarks = this.state.sheet === "marks";
    b.anySheet = this.state.sheet !== "none";`),
  body: frame(`${safeTop}
    ${header}
    ${pageRail()}
    ${stage(361)}
    <div style="flex: 0 0 auto; padding: 8px 16px 12px">
      <div style="border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest); overflow: hidden">
        <sc-if value="{{ showLast }}" hint-placeholder-val="{{ true }}">${lastStrip}</sc-if>
        <sc-if value="{{ showStrip }}" hint-placeholder-val="{{ false }}">${chipStrip}</sc-if>
        ${dockRow}
      </div>
    </div>
    ${safeBottom}
    <sc-if value="{{ anySheet }}" hint-placeholder-val="{{ false }}">${scrim("{{ close }}")}</sc-if>
    <sc-if value="{{ sheetScore }}" hint-placeholder-val="{{ false }}">${scoreSheet()}</sc-if>
    <sc-if value="{{ sheetMarks }}" hint-placeholder-val="{{ false }}">${marksSheet()}</sc-if>`),
});

/* ───────────────────────  B · collapsible score ledger  ─────────────────────── */

const bPeek = `<div style="border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest); overflow: hidden">
        <button type="button" onClick="{{ toggle }}" style="display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); text-align: left">
          <span style="display: inline-flex; align-items: baseline; gap: 6px">
            <span class="lbl">Score</span>
            <span class="num" style="font-size: 21px; font-weight: 550; letter-spacing: -0.02em">{{ total }}</span>
            <span class="num" style="font-size: 12px; color: var(--ink-3)">/100</span>
          </span>
          <span style="font-size: 12px; color: var(--ink-3)"><span class="num">{{ markCount }}</span> marks</span>
          <span style="display: grid; place-items: center; width: 28px; height: 28px; color: var(--ink-3)">${icon.chevUp}</span>
        </button>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; height: 28px; background: var(--line); border-top: 1px solid var(--line)">
          <sc-for list="{{ chips }}" as="c" hint-placeholder-count="4">
            <div class="{{ c.cls }}" style="display: flex; align-items: center; justify-content: center; gap: 5px; background: var(--surface)">
              <span style="width: 6px; height: 9px; border-radius: 2px; background: var(--c)"></span>
              <span class="num" style="font-size: 13px; font-weight: 500">{{ c.score }}</span>
            </div>
          </sc-for>
        </div>
      </div>`;

/* Expanded, the ledger rises OVER the lower page — the Mushaf never resizes. */
const bLedger = `<div style="position: absolute; left: 8px; right: 8px; bottom: 46px; z-index: 50; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-float); overflow: hidden">
        <button type="button" onClick="{{ toggle }}" style="display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); text-align: left; border-bottom: 1px solid var(--line-2)">
          <span style="display: inline-flex; align-items: baseline; gap: 6px">
            <span class="lbl">Score</span>
            <span class="num" style="font-size: 21px; font-weight: 550; letter-spacing: -0.02em">{{ total }}</span>
            <span class="num" style="font-size: 12px; color: var(--ink-3)">/100</span>
          </span>
          <span style="display: grid; place-items: center; width: 28px; height: 28px; color: var(--ink-3)">${icon.chevDown}</span>
        </button>
        <div style="padding: 2px 12px 12px">
          ${scoreRows()}
          ${aduReason}
          ${actionsRow()}
        </div>
      </div>`;

const B = dc({
  props: PROPS(),
  logic: LOGIC(`{ open: true, undone: false, sheet: "none" }`, `
    b.open = this.state.open;
    b.toggle = () => this.setState({ open: !this.state.open });`),
  body: frame(`${safeTop}
    ${header}
    ${pageRail()}
    ${stage(377)}
    <div style="flex: 0 0 auto; padding: 8px 8px 12px">
      ${bPeek}
    </div>
    ${safeBottom}
    <sc-if value="{{ open }}" hint-placeholder-val="{{ true }}">${scrim("{{ toggle }}")}${bLedger}</sc-if>`),
});

/* ─────────────────────────  C · live mode / review mode  ────────────────────── */

const reviewScreen = `<div style="position: absolute; inset: 0; z-index: 50; display: flex; flex-direction: column; background: var(--bg)">
      <div style="height: 59px; flex: 0 0 auto"></div>
      <div style="display: flex; align-items: center; gap: 4px; padding: 6px 6px; background: var(--surface); border-bottom: 1px solid var(--line); flex: 0 0 auto">
        <button type="button" onClick="{{ closeReview }}" aria-label="Back to page" style="width: 44px; height: 44px; display: grid; place-items: center; border: 0; background: transparent; color: var(--ink-2); border-radius: 8px">${icon.close}</button>
        <div style="flex: 1 1 auto; min-width: 0">
          <div style="font-size: 15px; font-weight: 550; letter-spacing: -0.02em">Review recitation</div>
          <div style="font-size: 11px; color: var(--ink-3)">Hassan Yoonus · 12:04 · Al-Mulk 1–12</div>
        </div>
      </div>
      <div style="flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px 16px 0">
        <div style="border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest); padding: 14px 14px 6px">
          ${scoreTotal}
          ${scoreRows()}
          ${aduReason}
        </div>
        <div style="padding: 18px 0 8px">
          ${sheetHead("Mistakes")}
          ${mistakeRows}
        </div>
        <div style="padding: 10px 0 16px">
          <span class="lbl">Notes</span>
          <p style="margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: var(--ink-2)">Strong opening; tempo drifted after ayah 7. Reminded of madd rules before the second attempt.</p>
        </div>
      </div>
      <div style="flex: 0 0 auto; padding: 10px 16px; background: var(--surface); border-top: 1px solid var(--line)">
        ${actionsRow()}
      </div>
      <div style="height: 34px; flex: 0 0 auto"></div>
    </div>`;

const C = dc({
  props: PROPS(),
  logic: LOGIC(`{ review: false, undone: false, lastVisible: true }`, `
    b.showLast = this.state.lastVisible && !this.state.undone;
    b.showIdle = !b.showLast;
    b.review = this.state.review;
    b.openReview = () => this.setState({ review: true });
    b.closeReview = () => this.setState({ review: false });`),
  body: frame(`${safeTop}
    ${header}
    ${pageRail()}
    ${stage(377)}
    <div style="flex: 0 0 auto; padding: 8px 8px 12px">
      <sc-if value="{{ showLast }}" hint-placeholder-val="{{ true }}">
        <div class="cat-fasaha" style="display: flex; align-items: center; gap: 8px; height: 60px; padding: 0 4px 0 12px; border: 1px solid var(--line); border-radius: 12px; background: color-mix(in srgb, var(--c) 8%, var(--surface)); box-shadow: var(--shadow-rest)">
          <span style="width: 8px; height: 12px; border-radius: 3px; background: var(--c); flex: 0 0 auto"></span>
          <span style="font-family: var(--quran); font-size: 21px; line-height: 1; color: var(--ink)">نَذِيرٞ</span>
          <span style="display: flex; flex-direction: column; min-width: 0">
            <span style="font-size: 13px; font-weight: 500">Faṣāḥa</span>
            <span class="num" style="font-size: 11px; color: var(--ink-3)">2:14 · 67:8</span>
          </span>
          <span class="num" style="margin-left: auto; font-size: 17px; font-weight: 550">−0.5</span>
          <button type="button" onClick="{{ undo }}" style="display: inline-flex; align-items: center; gap: 6px; height: 48px; padding: 0 12px; border: 0; background: transparent; color: var(--c-strong); font-size: 14px; font-weight: 550">${icon.undo}Undo</button>
        </div>
      </sc-if>
      <sc-if value="{{ showIdle }}" hint-placeholder-val="{{ false }}">
        <div style="display: flex; align-items: center; gap: 10px; height: 60px; padding: 0 6px 0 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest)">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--ink-3); flex: 0 0 auto"></span>
          <span style="font-size: 13px; color: var(--ink-3)"><span class="num">{{ markCount }}</span> marks recorded</span>
          <button type="button" onClick="{{ openReview }}" style="margin-left: auto; display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 16px; border: 0; border-radius: 8px; background: var(--ink); color: var(--bg); font-size: 14px; font-weight: 500">Review &amp; finish${icon.chevR}</button>
        </div>
      </sc-if>
    </div>
    ${safeBottom}
    <sc-if value="{{ review }}" hint-placeholder-val="{{ false }}">${reviewScreen}</sc-if>`),
});

/* ─────────────────────────────  D · bento deck  ────────────────────────────── */

const bentoCell = `<sc-for list="{{ chips }}" as="c" hint-placeholder-count="4">
              <div class="{{ c.cls }}" style="display: flex; flex-direction: column; justify-content: center; gap: 3px; background: var(--surface); padding: 0 10px">
                <span style="display: inline-flex; align-items: center; gap: 5px">
                  <span style="width: 6px; height: 9px; border-radius: 2px; background: var(--c)"></span>
                  <span style="font-size: 11.5px; color: var(--ink-3)">{{ c.short }}</span>
                </span>
                <span style="display: inline-flex; align-items: baseline; gap: 1px">
                  <span class="num" style="font-size: 19px; font-weight: 550; letter-spacing: -0.01em">{{ c.score }}</span>
                  <span class="num" style="font-size: 11px; color: var(--ink-3)">/{{ c.max }}</span>
                </span>
              </div>
            </sc-for>`;

const D = dc({
  props: PROPS(),
  logic: LOGIC(`{ sheet: "none", undone: false }`, `
    b.sheetMarks = this.state.sheet === "marks";
    b.anySheet = this.state.sheet !== "none";`),
  body: frame(`${safeTop}
    ${header}
    ${pageRail()}
    ${stage(263)}
    <div style="flex: 0 0 auto; padding: 8px 8px 12px">
      <div style="border: 1px solid var(--line); border-radius: 12px; background: var(--line); box-shadow: var(--shadow-rest); overflow: hidden; display: grid; gap: 1px">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 12px; height: 36px; background: var(--surface)">
          <span class="lbl">Score</span>
          <span style="display: inline-flex; align-items: baseline">
            <span class="num" style="font-size: 19px; font-weight: 550; letter-spacing: -0.02em">{{ total }}</span>
            <span class="num" style="font-size: 12px; color: var(--ink-3)">/100</span>
          </span>
        </div>
        <div style="display: grid; grid-template-columns: 62fr 38fr; gap: 1px">
          <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 66px 66px; gap: 1px">
            ${bentoCell}
          </div>
          <div style="display: flex; flex-direction: column; background: var(--surface); padding: 8px 10px">
            <span class="lbl" style="font-size: 10px">Mistakes</span>
            <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 6px; flex: 1 1 auto">
              <sc-for list="{{ marks }}" as="m" hint-placeholder-count="3">
                <span class="{{ m.cls }}" style="display: flex; align-items: center; gap: 6px; min-width: 0">
                  <span style="width: 5px; height: 9px; border-radius: 2px; background: var(--c); flex: 0 0 auto"></span>
                  <span style="font-family: var(--quran); font-size: 15px; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ m.glyph }}</span>
                  <span class="num" style="margin-left: auto; font-size: 11.5px; color: var(--ink-2)">{{ m.amt }}</span>
                </span>
              </sc-for>
            </div>
            <button type="button" onClick="{{ openMarks }}" style="border: 0; background: transparent; color: var(--ink-3); font-size: 11px; text-align: left; min-height: 28px">View all</button>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--surface)">
          <button type="button" style="display: inline-flex; align-items: center; gap: 7px; height: 44px; padding: 0 12px; border: 1px solid var(--line-2); border-radius: 8px; background: transparent; color: var(--ink-2); font-size: 13px; font-weight: 500">${icon.note}Notes</button>
          <button type="button" style="flex: 1 1 auto; min-height: 44px; border: 0; border-radius: 8px; background: var(--ink); color: var(--bg); font-size: 14px; font-weight: 500">Finish recitation</button>
        </div>
      </div>
    </div>
    ${safeBottom}
    <sc-if value="{{ anySheet }}" hint-placeholder-val="{{ false }}">${scrim("{{ close }}")}</sc-if>
    <sc-if value="{{ sheetMarks }}" hint-placeholder-val="{{ false }}">${marksSheet()}</sc-if>`),
});

fs.writeFileSync("Main.dc.html", A);
fs.writeFileSync("DirectionB.dc.html", B);
fs.writeFileSync("DirectionC.dc.html", C);
fs.writeFileSync("DirectionD.dc.html", D);
console.log("wrote 4 direction artboards");
import("./build-parts.mjs");
