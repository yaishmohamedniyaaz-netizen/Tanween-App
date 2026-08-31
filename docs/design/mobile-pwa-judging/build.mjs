import fs from "node:fs";
import { dc, mushafPage, icon, markedWords } from "./kit.mjs";
import {
  CHROME_CSS, header, pageNav, scoreRows, scoreTotal, judgeLine,
  aduReason, actionsRow, mistakeRows, scrim, grabber, MODEL,
} from "./chrome.mjs";
import { reviewScreen, nextReciter } from "./screens.mjs";

const PROPS = (extra = "") =>
  `{"dark":{"editor":"boolean","default":false,"section":"View"}${extra},"$preview":{"width":393,"height":852}}`;

/* Fluid root: never wider than its frame, so nothing scrolls sideways. */
const frame = (inner) =>
  `<div class="f" data-t="{{ theme }}" style="position: relative; width: 100%; max-width: 393px; height: 852px; margin-inline: auto; display: flex; flex-direction: column; overflow: hidden; background: var(--bg)">
    ${inner}
  </div>`;

/* Status bar and home indicator: reserved, background paints through. */
const safeTop = `<div style="height: 59px; flex: 0 0 auto"></div>`;
const safeBottom = `<div style="height: 34px; flex: 0 0 auto"></div>`;

const stage = `<div style="flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 8px">
      ${mushafPage(377, { nav: pageNav })}
    </div>`;

const sheet = (inner) =>
  `<div style="position: absolute; left: 0; right: 0; bottom: 0; z-index: 50; background: var(--surface); border-top: 1px solid var(--line); border-radius: 20px 20px 0 0; box-shadow: var(--shadow-float); padding: 12px 16px 46px">
      ${inner}
    </div>`;

const scoreSheet = sheet(`${grabber}${judgeLine}${scoreTotal}${scoreRows}${aduReason}${actionsRow("{{ openReview }}")}`);

const marksSheet = sheet(`${grabber}
      <div style="display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 10px">
        <span class="lbl">Mistakes <span class="num" style="letter-spacing: 0">{{ markCount }}</span></span>
        <button type="button" style="border: 0; background: transparent; color: var(--ink-3); font-size: 11px; font-weight: 500">History</button>
      </div>
      ${mistakeRows}
      <p style="margin: 12px 0 0; font-size: 11.5px; color: var(--ink-3); line-height: 1.45">Tap a mistake to reopen it on the page, change its weight, or undo it.</p>`);

const LOGIC = (state, extra = "") => `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = ${state};
  }
${MODEL}
  base() {
    const u = this.state.undone;
    const chip = this.props.chip ?? "deduction";
    return {
      theme: this.props.dark ? "dark" : "light",
      rows: this.rows(u),
      total: this.total(u),
      totalMax: this.totalMax(u),
      criteriaLabel: this.criteriaLabel(u),
      marks: this.markList(u),
      markCount: this.markList(u).length,
      markWord: this.markList(u).length === 1 ? "mistake" : "mistakes",
      dedTotal: this.dedTotal(u),
      chips: this.criteria(u).map((c) => ({ ...c, val: chip === "score" ? c.score : c.ded })),
      blocked: false,
      notBlocked: true,
      undo: () => this.setState({ undone: true, lastVisible: false }),
      close: () => this.setState({ sheet: "none" }),
      openScore: () => this.setState({ sheet: "score" }),
      openMarks: () => this.setState({ sheet: "marks" }),
    };
  }
  renderVals() {
    const b = this.base();
    ${extra}
    return b;
  }
}`;

/* ───────────────────────────  A · status dock  ─────────────────────────── */

const chipStrip = `<div style="display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 1px; height: 44px; background: var(--line)">
          <sc-for list="{{ chips }}" as="c" hint-placeholder-count="4">
            <div class="{{ c.cls }}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-width: 0; padding: 0 4px; background: {{ c.bg }}">
              <span style="display: inline-flex; align-items: center; gap: 4px; max-width: 100%; font-size: 11px; line-height: 1.1; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                <sc-if value="{{ c.dot }}" hint-placeholder-val="{{ false }}"><i style="width: 6px; height: 9px; border-radius: 2px; background: var(--c); flex: 0 0 auto"></i></sc-if>
                {{ c.short }}
              </span>
              <span class="num" style="font-size: 14px; font-weight: 500; line-height: 1.1; color: var(--ink)">{{ c.val }}</span>
            </div>
          </sc-for>
        </div>`;

const lastStrip = `<div class="cat-fasaha" style="display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 4px 0 10px; background: var(--c-wash); border-bottom: 1px solid var(--line)">
          <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c); flex: 0 0 auto"></span>
          <span style="font-family: var(--quran); font-size: 18px; line-height: 1.4; color: var(--ink)">${markedWords.fasaha}</span>
          <span style="font-size: 12px; color: var(--ink-2); white-space: nowrap">Faṣāḥa<span class="dock-sub"> · 2:14</span></span>
          <span class="num" style="margin-left: auto; font-size: 14px; font-weight: 550">−0.5</span>
          <button type="button" onClick="{{ undo }}" style="height: 44px; padding: 0 12px; border: 0; background: transparent; color: var(--c-strong); font-size: 13px; font-weight: 550">Undo</button>
          <span style="width: 1px; height: 20px; background: var(--line-2); flex: 0 0 auto"></span>
          <button type="button" onClick="{{ dismiss }}" aria-label="Dismiss" style="width: 44px; height: 44px; display: grid; place-items: center; border: 0; background: transparent; color: var(--ink-3); flex: 0 0 auto">${icon("close", 16)}</button>
        </div>`;

const dockRow = `<div style="display: grid; grid-template-columns: 1fr 1.15fr 96px; gap: 1px; height: 48px; background: var(--line)">
          <button type="button" onClick="{{ openScore }}" style="display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; background: var(--surface); color: var(--ink)">
            <span class="lbl dock-sub">Score</span>
            <span class="num" style="font-size: 17px; font-weight: 550">{{ total }}</span>
            <span class="num" style="font-size: 12px; color: var(--ink-3)">/{{ totalMax }}</span>
          </button>
          <button type="button" onClick="{{ openMarks }}" style="display: flex; align-items: center; justify-content: center; gap: 5px; border: 0; background: var(--surface); color: var(--ink)">
            <span class="num" style="font-size: 15px; font-weight: 500">{{ markCount }}</span>
            <span style="font-size: 13px; color: var(--ink-2)">{{ markWord }}</span>
            <span style="display: grid; place-items: center; color: var(--ink-3)">${icon("chevron", 13, "transform: rotate(-90deg)")}</span>
          </button>
          <button type="button" onClick="{{ openReview }}" style="display: grid; place-items: center; border: 0; background: var(--ink); color: var(--bg); font-size: 14px; font-weight: 500">Finish</button>
        </div>`;

const A = dc({
  css: CHROME_CSS,
  props: PROPS(
    `,"tint":{"editor":"enum","options":["off","earned","always"],"default":"earned","section":"View"}` +
    `,"criteria":{"editor":"int","min":1,"max":4,"default":4,"section":"Assignment"}` +
    `,"chip":{"editor":"enum","options":["deduction","score"],"default":"deduction","section":"View"}` +
    `,"lastMark":{"editor":"enum","options":["on","off"],"default":"on","section":"View"}`,
  ),
  logic: LOGIC(`{ sheet: "none", undone: false, lastVisible: true, review: false }`, `
    b.showLast = this.state.lastVisible && !this.state.undone && (this.props.lastMark ?? "on") === "on";
    b.dismiss = () => this.setState({ lastVisible: false });
    b.showStrip = !b.showLast;
    b.sheetScore = this.state.sheet === "score";
    b.sheetMarks = this.state.sheet === "marks";
    b.anySheet = this.state.sheet !== "none";
    b.review = this.state.review;
    b.openReview = () => this.setState({ review: true, sheet: "none" });
    b.closeReview = () => this.setState({ review: false });`),
  body: frame(`${safeTop}
    ${header()}
    ${stage}
    <div style="flex: 0 0 auto; padding: 8px 8px 12px">
      <div class="dock" style="border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest); overflow: hidden">
        <sc-if value="{{ showLast }}" hint-placeholder-val="{{ true }}">${lastStrip}</sc-if>
        <sc-if value="{{ showStrip }}" hint-placeholder-val="{{ false }}">${chipStrip}</sc-if>
        ${dockRow}
      </div>
    </div>
    ${safeBottom}
    <sc-if value="{{ anySheet }}" hint-placeholder-val="{{ false }}">${scrim("{{ close }}")}</sc-if>
    <sc-if value="{{ sheetScore }}" hint-placeholder-val="{{ false }}">${scoreSheet}</sc-if>
    <sc-if value="{{ sheetMarks }}" hint-placeholder-val="{{ false }}">${marksSheet}</sc-if>
    <sc-if value="{{ review }}" hint-placeholder-val="{{ false }}">${reviewScreen("{{ closeReview }}")}</sc-if>`),
});

/* ─────────────────────  B · collapsible score ledger  ───────────────────── */

const bPeek = `<div style="border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest); overflow: hidden">
        <button type="button" onClick="{{ toggle }}" style="display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); text-align: left">
          <span style="display: inline-flex; align-items: baseline; gap: 6px">
            <span class="lbl">Score</span>
            <span class="num" style="font-size: 21px; font-weight: 550; letter-spacing: -0.02em">{{ total }}</span>
            <span class="num" style="font-size: 12px; color: var(--ink-3)">/{{ totalMax }}</span>
          </span>
          <span style="font-size: 12px; color: var(--ink-3)"><span class="num">{{ markCount }}</span> {{ markWord }}</span>
          <span style="display: grid; place-items: center; width: 28px; height: 28px; color: var(--ink-3)">${icon("chevron", 16, "transform: rotate(-90deg)")}</span>
        </button>
        <div style="display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 1px; height: 28px; background: var(--line); border-top: 1px solid var(--line)">
          <sc-for list="{{ chips }}" as="c" hint-placeholder-count="4">
            <div class="{{ c.cls }}" style="display: flex; align-items: center; justify-content: center; gap: 5px; background: {{ c.bg }}">
              <span class="num" style="font-size: 13px; font-weight: 500">{{ c.val }}</span>
            </div>
          </sc-for>
        </div>
      </div>`;

const bLedger = `<div style="position: absolute; left: 8px; right: 8px; bottom: 46px; z-index: 50; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-float); overflow: hidden">
        <button type="button" onClick="{{ toggle }}" style="display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); text-align: left; border-bottom: 1px solid var(--line-2)">
          <span style="display: inline-flex; align-items: baseline; gap: 6px">
            <span class="lbl">Score</span>
            <span class="num" style="font-size: 21px; font-weight: 550; letter-spacing: -0.02em">{{ total }}</span>
            <span class="num" style="font-size: 12px; color: var(--ink-3)">/{{ totalMax }}</span>
          </span>
          <span style="display: grid; place-items: center; width: 28px; height: 28px; color: var(--ink-3)">${icon("chevron", 16, "transform: rotate(90deg)")}</span>
        </button>
        <div style="padding: 2px 12px 12px">${scoreRows}${aduReason}${actionsRow("{{ openReview }}")}</div>
      </div>`;

const B = dc({
  css: CHROME_CSS,
  props: PROPS(),
  logic: LOGIC(`{ open: true, undone: false, review: false }`, `
    b.open = this.state.open;
    b.review = this.state.review;
    b.toggle = () => this.setState({ open: !this.state.open });
    b.openReview = () => this.setState({ review: true, open: false });
    b.closeReview = () => this.setState({ review: false });`),
  body: frame(`${safeTop}
    ${header()}
    ${stage}
    <div style="flex: 0 0 auto; padding: 8px 8px 12px">${bPeek}</div>
    ${safeBottom}
    <sc-if value="{{ open }}" hint-placeholder-val="{{ true }}">${scrim("{{ toggle }}")}${bLedger}</sc-if>
    <sc-if value="{{ review }}" hint-placeholder-val="{{ false }}">${reviewScreen("{{ closeReview }}")}</sc-if>`),
});

/* ────────────────────────  C · live mode / review mode  ─────────────────── */

const C = dc({
  css: CHROME_CSS,
  props: PROPS(),
  logic: LOGIC(`{ review: false, undone: false, lastVisible: true }`, `
    b.showLast = this.state.lastVisible && !this.state.undone;
    b.showIdle = !b.showLast;
    b.review = this.state.review;
    b.openReview = () => this.setState({ review: true });
    b.closeReview = () => this.setState({ review: false });`),
  body: frame(`${safeTop}
    ${header()}
    ${stage}
    <div style="flex: 0 0 auto; padding: 8px 8px 12px">
      <sc-if value="{{ showLast }}" hint-placeholder-val="{{ true }}">
        <div class="cat-fasaha" style="display: flex; align-items: center; gap: 8px; height: 60px; padding: 0 4px 0 12px; border: 1px solid var(--line); border-radius: 12px; background: color-mix(in srgb, var(--c) 8%, var(--surface)); box-shadow: var(--shadow-rest)">
          <span style="width: 8px; height: 12px; border-radius: 3px; background: var(--c); flex: 0 0 auto"></span>
          <span style="font-family: var(--quran); font-size: 20px; line-height: 1.4; color: var(--ink)">${markedWords.fasaha}</span>
          <span style="display: flex; flex-direction: column; min-width: 0">
            <span style="font-size: 13px; font-weight: 500">Faṣāḥa</span>
            <span class="num" style="font-size: 11px; color: var(--ink-3)">2:14 · 67:5</span>
          </span>
          <span class="num" style="margin-left: auto; font-size: 17px; font-weight: 550">−0.5</span>
          <button type="button" onClick="{{ undo }}" style="height: 48px; padding: 0 14px; border: 0; background: transparent; color: var(--c-strong); font-size: 14px; font-weight: 550">Undo</button>
        </div>
      </sc-if>
      <sc-if value="{{ showIdle }}" hint-placeholder-val="{{ false }}">
        <div style="display: flex; align-items: center; gap: 10px; height: 60px; padding: 0 6px 0 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-rest)">
          <span style="font-size: 13px; color: var(--ink-3)"><span class="num">{{ markCount }}</span> {{ markWord }} recorded</span>
          <button type="button" onClick="{{ openReview }}" style="margin-left: auto; display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 16px; border: 0; border-radius: 8px; background: var(--ink); color: var(--bg); font-size: 14px; font-weight: 500">Review &amp; finish${icon("chevron", 14)}</button>
        </div>
      </sc-if>
    </div>
    ${safeBottom}
    <sc-if value="{{ review }}" hint-placeholder-val="{{ false }}">${reviewScreen("{{ closeReview }}")}</sc-if>`),
});

/* ────────────────────────  Continuation, shared by all  ─────────────────── */

const REVIEW = dc({
  css: CHROME_CSS,
  props: PROPS(`,"blocked":{"editor":"boolean","default":false,"section":"State"}`),
  logic: LOGIC(`{ undone: false }`, `
    b.blocked = this.props.blocked === true;
    b.notBlocked = !b.blocked;
    if (b.blocked) {
      b.rows = b.rows.filter((r) => !r.editable);
      b.total = b.total - 8.5;
    }`),
  body: frame(reviewScreen()),
});

const NEXT = dc({
  css: CHROME_CSS,
  props: PROPS(),
  logic: LOGIC(`{ undone: false }`),
  body: frame(nextReciter),
});

fs.writeFileSync("Main.dc.html", A);
fs.writeFileSync("DirectionB.dc.html", B);
fs.writeFileSync("DirectionC.dc.html", C);
fs.writeFileSync("Review.dc.html", REVIEW);
fs.writeFileSync("NextReciter.dc.html", NEXT);
console.log("wrote 3 directions + 2 continuation artboards");
import("./build-parts.mjs");
