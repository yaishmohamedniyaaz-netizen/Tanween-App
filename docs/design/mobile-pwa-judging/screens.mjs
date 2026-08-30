import { icon } from "./kit.mjs";
import { scoreRows, aduReason, mistakeRows, judgeLine } from "./chrome.mjs";

/** Review and save — the real FinishDialog composition, full screen on phone.
    Copy and structure from FinishDialog.tsx; the safe-area padding is the
    proposed fix, since .finish-dialog has no env() term today. */
const OVERLAY = "position: absolute; inset: 0; z-index: 50;";
const STANDALONE = "flex: 1 1 auto; min-height: 0; width: 100%;";

export const reviewScreen = (close = "") => `<div style="${close ? OVERLAY : STANDALONE} display: flex; flex-direction: column; background: var(--bg)">
      <div style="height: 59px; flex: 0 0 auto"></div>
      <header style="display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: start; gap: 8px; padding: 10px 10px 14px; background: var(--surface); border-bottom: 1px solid var(--line); flex: 0 0 auto">
        <button type="button"${close ? ` onClick="${close}"` : ""} class="hbtn" aria-label="Keep judging" style="margin-top: 2px">${icon("back", 17)}</button>
        <div style="min-width: 0; display: grid; gap: 4px">
          <h2 style="margin: 0; font-size: 21px; font-weight: 570; letter-spacing: -0.02em">Review and save</h2>
          <p style="margin: 0; font-size: 15px; font-weight: 550">Hassan Yoonus</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; color: var(--ink-3); font-size: 11.5px">
            <span>Q · 12</span><span>Judge 1</span><span class="num">{{ markCount }} mistakes</span>
          </div>
        </div>
        <span style="display: grid; justify-items: end; gap: 2px">
          <span style="display: inline-flex; align-items: baseline">
            <span class="num" style="font-size: 30px; font-weight: 550; letter-spacing: -0.02em; line-height: 1">{{ total }}</span>
            <span class="num" style="font-size: 13px; color: var(--ink-3)">/{{ totalMax }}</span>
          </span>
          <small class="lbl">Score</small>
        </span>
      </header>
      <div style="flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px 16px 0">
        <div style="display: grid; grid-template-columns: 9px minmax(0, 1fr) 46px 78px; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--line-2)">
          <span></span><span class="lbl">Criterion</span>
          <span class="lbl" style="text-align: right">Deducted</span>
          <span class="lbl" style="text-align: center">Score</span>
        </div>
        ${scoreRows}
        <sc-if value="{{ blocked }}" hint-placeholder-val="{{ false }}">
          <div class="cat-adu" style="display: grid; grid-template-columns: 9px minmax(0, 1fr) 46px 78px; align-items: center; gap: 8px; row-gap: 8px; margin: 4px -10px 0; padding: 8px 10px 12px; border-radius: 8px; background: color-mix(in srgb, #d8453d 6%, var(--surface))">
            <span style="width: 8px; height: 11px; border-radius: 3px; background: var(--c)"></span>
            <span style="min-width: 0">
              <strong style="display: block; font-size: 14px; font-weight: 400; color: var(--c)">Adu / Raagu</strong>
              <small class="err" style="font-size: 11px">Not entered</small>
            </span>
            <span class="num" style="font-size: 12px; text-align: right; color: var(--ink-3)">—</span>
            <button type="button" class="num" aria-invalid="true" style="justify-self: end; width: 78px; min-height: 44px; border: 1px solid color-mix(in srgb, #d8453d 72%, var(--line)); box-shadow: 0 0 0 2px color-mix(in srgb, #d8453d 13%, transparent); border-radius: 8px; background: var(--surface); color: var(--ink-3); font-size: 15px; font-weight: 500">—<span style="font-size: 12px">/10</span></button>
            <p class="err" role="alert" style="grid-column: 2 / -1; margin: 0; font-size: 12px">Choose an Adu / Raagu mark to save.</p>
          </div>
        </sc-if>
        <sc-if value="{{ notBlocked }}" hint-placeholder-val="{{ true }}">${aduReason}</sc-if>
        <section style="padding: 20px 0 8px">
          <h3 class="lbl" style="margin: 0 0 10px">Remarks</h3>
          <dl style="margin: 0; display: grid; gap: 10px">
            <div><dt class="lbl" style="font-size: 10px">Notes</dt><dd style="margin: 3px 0 0; font-size: 13px; line-height: 1.5; color: var(--ink-2)">Strong opening; tempo drifted after ayah 4. Reminded of madd rules before the second attempt.</dd></div>
            <div><dt class="lbl" style="font-size: 10px">Adu / Raagu reason</dt><dd style="margin: 3px 0 0; font-size: 13px; line-height: 1.5; color: var(--ink-2)">Breath control on long ayāt.</dd></div>
          </dl>
        </section>
        <section style="padding: 4px 0 16px">
          <h3 class="lbl" style="margin: 0 0 10px">Mistakes <span class="num" style="letter-spacing: 0">{{ markCount }}</span></h3>
          ${mistakeRows}
        </section>
      </div>
      <div style="flex: 0 0 auto; display: flex; gap: 8px; padding: 10px 16px; background: var(--surface); border-top: 1px solid var(--line)">
        <button type="button"${close ? ` onClick="${close}"` : ""} style="height: 48px; padding: 0 14px; border: 1px solid var(--line-2); border-radius: 8px; background: transparent; color: var(--ink-2); font-size: 14px; font-weight: 500; flex: 0 0 auto">Keep judging</button>
        <button type="button" style="flex: 1 1 auto; min-height: 48px; border: 0; border-radius: 8px; background: var(--ink); color: var(--bg); font-size: 14px; font-weight: 500">Save and select next reciter</button>
      </div>
      <div style="height: 34px; flex: 0 0 auto"></div>
    </div>`;

const queueRow = (num, name, inst, done) => `<button type="button" style="display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; min-height: 52px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); text-align: left">
            <span class="num" style="display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--bg); color: var(--ink-2); font-size: 11px; font-weight: 650">${num}</span>
            <span style="min-width: 0; display: grid; gap: 2px">
              <strong style="font-size: 13.5px; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${name}</strong>
              <small style="color: var(--ink-3); font-size: 9.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${inst}</small>
            </span>
            ${done ? `<span class="lbl" style="font-size: 9.5px">Done</span>` : `<span style="color: var(--ink-3)">${icon("chevron", 14)}</span>`}
          </button>`;

/** Where Finish actually lands: App.tsx:327 opens the next-reciter screen. */
export const nextReciter = `<div style="${STANDALONE} display: flex; flex-direction: column; background: var(--bg)">
      <div style="height: 59px; flex: 0 0 auto"></div>
      <div style="flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; padding: 15px 14px 0">
        <div style="display: flex; align-items: baseline; gap: 8px; padding-bottom: 12px">
          <strong style="font-size: 21px; font-weight: 570; letter-spacing: -0.02em">Next</strong>
          <span style="color: var(--ink-3); font-size: 12.5px">15 waiting</span>
        </div>
        <article style="display: grid; grid-template-columns: minmax(0, 1fr) 70px; gap: 8px; padding-bottom: 14px">
          <button type="button" style="display: grid; grid-template-columns: 38px minmax(0, 1fr); align-items: center; gap: 9px; min-height: 64px; padding: 9px 11px; border: 1px solid var(--ink); border-radius: 10px; background: var(--surface); text-align: left; box-shadow: inset 0 0 0 1px var(--ink)">
            <span class="num" style="display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; background: var(--bg); color: var(--ink-2); font-size: 12px; font-weight: 650">04</span>
            <span style="min-width: 0; display: grid; gap: 3px">
              <strong style="font-size: 17px; font-weight: 570; letter-spacing: -0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">Ahmed Rimah</strong>
              <small style="color: var(--ink-3); font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">Under 14 · Hifz · Majeediyya School</small>
            </span>
          </button>
          <button type="button" style="min-height: 64px; border: 1px solid var(--line-2); border-radius: 10px; background: transparent; color: var(--ink-2); font-size: 12.5px; font-weight: 500">Not here</button>
        </article>
        <label style="display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 11px; margin-bottom: 12px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface); color: var(--ink-3)">
          ${icon("marks", 15)}
          <input type="search" placeholder="Find by number, name or institution" style="flex: 1 1 auto; min-width: 0; border: 0; background: transparent; font: inherit; font-size: 13px; color: var(--ink)">
        </label>
        <div style="flex: 1 1 auto; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 6px; padding-bottom: 12px">
          <div class="lbl" style="padding: 4px 2px">Under 14 · Hifz</div>
          ${queueRow("05", "Yoosuf Naail", "Arabiyya School", false)}
          ${queueRow("06", "Mariyam Sana", "Majeediyya School", false)}
          ${queueRow("07", "Ibrahim Zayd", "Iskandhar School", false)}
          <div class="lbl" style="padding: 8px 2px 4px">Finished</div>
          ${queueRow("03", "Hassan Yoonus", "Majeediyya School", true)}
        </div>
      </div>
      <div style="height: 34px; flex: 0 0 auto"></div>
    </div>`;
