import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_PATH ||
    "playwright",
);
const out = process.env.CLAUDE_QA_OUT || "outputs/claude-completion/queue";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(),
  results = [];
const sizes = process.argv.includes("--pilot")
  ? [
      [1024, 768],
      [390, 844],
    ]
  : [
      [1440, 900],
      [1280, 800],
      [1024, 768],
      [768, 1024],
      [390, 844],
      [320, 740],
    ];
try {
  for (const [width, height] of sizes)
    for (const theme of ["light", "dark"]) {
      const key = `${width}-${theme}`,
        context = await browser.newContext({
          viewport: { width, height },
          hasTouch: width <= 1024,
          isMobile: width < 600,
          reducedMotion: theme === "dark" ? "reduce" : "no-preference",
        }),
        p = await context.newPage(),
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      const r = { key };
      results.push(r);
      try {
        await p.addInitScript(
          (theme) =>
            localStorage.setItem(
              "tahqeeq:devicePreferences.v5",
              JSON.stringify({ version: 5, theme }),
            ),
          theme,
        );
        await p.goto(
          "http://127.0.0.1:5346/scripts/qa/mobile-paper.html?sessionStorage=3&qaSurah=79&qaAyah=33&qaLines=10",
        );
        await p
          .getByRole("button", { name: "Load prepared mobile sample" })
          .click();
        await p.locator(".page-fixed-mushaf").first().waitFor();
        await p.evaluate(() => document.fonts.ready);
        await p.waitForTimeout(180);
        await p.screenshot({ path: `${out}/${key}-prepared.png` });
        const launch = p.getByRole("button", {
          name: "Change reciter",
          exact: true,
        });
        await launch.click();
        await p
          .getByRole("heading", { name: "Reciter queue", exact: true })
          .waitFor();
        const selected = () =>
          p.locator('[role="option"][aria-selected="true"]');
        assert.equal(await selected().count(), 1);
        assert.equal(
          await selected().evaluate((e) => e === document.activeElement),
          true,
          "Queue opens on selected reciter",
        );
        assert.equal(
          await p.getByRole("listbox", { name: "Reciters" }).count(),
          1,
        );
        const recommended = await selected().getAttribute("data-queue-entry");
        const before = await p.evaluate(() =>
          JSON.stringify({
            draws: window.providerQA.state.draws,
            roster: window.providerQA.state.roster,
          }),
        );
        await p.keyboard.press("ArrowDown");
        const second = await selected().getAttribute("data-queue-entry");
        assert.notEqual(second, recommended);
        assert.equal(
          await p
            .getByRole("heading", { name: "Reciter queue", exact: true })
            .isVisible(),
          true,
        );
        assert.equal(
          await p.evaluate(() =>
            JSON.stringify({
              draws: window.providerQA.state.draws,
              roster: window.providerQA.state.roster,
            }),
          ),
          before,
          "Selecting a row does not mutate judging state",
        );
        await p.keyboard.press("ArrowUp");
        assert.equal(
          await selected().getAttribute("data-queue-entry"),
          recommended,
        );
        await p.waitForTimeout(180);
        await p.screenshot({ path: `${out}/${key}-queue.png` });
        await p.locator(".queue-absence").click();
        await p.waitForFunction(
          (id) =>
            window.providerQA.state.roster.find((r) => r.id === id).absent,
          recommended,
        );
        assert.notEqual(
          await selected().getAttribute("data-queue-entry"),
          recommended,
          "Absent advances selection",
        );
        const absent = p.locator(`[data-queue-entry="${recommended}"]`);
        await absent.click();
        assert.equal(
          await p.locator(".queue-absence").innerText(),
          "Back in queue",
        );
        await p.locator(".queue-absence").click();
        await p
          .getByRole("heading", { name: "Choose a question", exact: true })
          .waitFor();
        assert.equal(
          await p.evaluate(
            (id) =>
              window.providerQA.state.roster.find((r) => r.id === id).absent,
            recommended,
          ),
          false,
        );
        await p.waitForFunction(() =>
          document.activeElement?.matches(
            ".draw-tile:not([disabled]), .draw-external:not([disabled])",
          ),
        );
        await p.waitForTimeout(180);
        await p.screenshot({ path: `${out}/${key}-draw.png` });
        await p
          .locator(".reciter-start-dialog")
          .getByRole("button", { name: "Change reciter", exact: true })
          .click();
        assert.equal(
          await selected().getAttribute("data-queue-entry"),
          recommended,
        );
        const search = p.getByRole("searchbox", { name: "Find a participant" });
        await search.fill("Naseer");
        await p.locator('[role="option"]').first().click();
        const name = await selected().locator("strong").innerText();
        await p.locator(".queue-choose").click();
        await p
          .getByRole("heading", { name: "Choose a question", exact: true })
          .waitFor();
        await p
          .locator(".reciter-start-dialog")
          .getByRole("button", { name: "Change reciter", exact: true })
          .click();
        assert.equal(await search.inputValue(), "Naseer");
        assert.equal(await selected().locator("strong").innerText(), name);
        await search.fill("NO_MATCH_987");
        assert.equal(await p.locator(".queue-choose").isDisabled(), true);
        await search.fill("");
        // Finished rows stay inspectable, at the end, without an actionable draw.
        await p.evaluate(() => {
          const q = window.providerQA;
          const row = q.state.roster.find(
            (r) => r.id !== q.state.preparedRecitation.participant.id,
          );
          window.finishedQA = row.id;
          q.dispatch({
            type: "LOAD",
            state: {
              ...q.state,
              roster: q.state.roster.map((r) =>
                r.id === row.id ? { ...r, judged: true } : r,
              ),
            },
          });
        });
        const finishedId = await p.evaluate(() => window.finishedQA);
        await search.fill(
          await p.evaluate(
            (id) =>
              window.providerQA.state.roster.find((r) => r.id === id).name,
            finishedId,
          ),
        );
        await p.locator(`[data-queue-entry="${finishedId}"]`).click();
        assert.equal(await p.locator(".queue-choose").isDisabled(), true);
        assert.equal(await p.locator(".queue-absence").isDisabled(), true);
        await p.keyboard.press("Enter");
        assert.equal(
          await p
            .getByRole("heading", { name: "Reciter queue", exact: true })
            .isVisible(),
          true,
        );
        await search.fill("");
        await p.locator(".queue-participant-button").first().focus();
        await p.keyboard.press("End");
        const reachable = await selected().evaluate((e) => {
          const b = e.getBoundingClientRect(),
            s = e.closest(".queue-scroll").getBoundingClientRect();
          return b.top >= s.top - 1 && b.bottom <= s.bottom + 1;
        });
        assert(reachable);
        const action = await p.locator(".queue-choose").boundingBox();
        assert(
          action.y + action.height <= height && action.y >= 0,
          "Action remains reachable",
        );
        const close = p
          .locator(".reciter-start-dialog")
          .getByRole("button", { name: "Close", exact: true });
        await close.focus();
        await p.keyboard.press("Shift+Tab");
        assert(
          await p
            .locator("dialog[open]")
            .evaluate((e) => e.contains(document.activeElement)),
        );
        await p.keyboard.press("Escape");
        await p.locator("dialog[open]").waitFor({ state: "hidden" });
        await p.waitForTimeout(40);
        assert(await launch.evaluate((e) => e === document.activeElement));
        await p
          .getByRole("button", { name: "Begin judging", exact: true })
          .click();
        await p
          .getByRole("button", {
            name: width < 600 ? "Finish" : "Finish recitation",
            exact: true,
          })
          .click();
        await p.locator(".finish-dialog").waitFor();
        assert(
          await p
            .locator(".finish-dialog-actions .btn-primary")
            .evaluate((e) => e === document.activeElement),
        );
        await p.waitForTimeout(180);
        await p.screenshot({ path: `${out}/${key}-review.png` });
        await p.keyboard.press("Escape");
        assert.equal(
          await p.evaluate(() => window.providerQA.state.history.length),
          0,
          "Escape never saves",
        );
        assert.deepEqual(errors, []);
        r.pass = true;
        console.log("PASS queue " + key);
      } catch (e) {
        r.failure = String(e.stack || e);
        await p.waitForTimeout(180);
        await p.screenshot({ path: `${out}/${key}-failure.png` });
        throw e;
      } finally {
        await context.close();
        writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
      }
    }
} finally {
  await browser.close();
}
