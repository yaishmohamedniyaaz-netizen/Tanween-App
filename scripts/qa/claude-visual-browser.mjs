import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url),
  {
    chromium,
  } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const out = "outputs/claude-completion/visual";
mkdirSync(out, { recursive: true });
const b = await chromium.launch(),
  results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 740],
  ])
    for (const theme of ["light", "dark"]) {
      const c = await b.newContext({
          viewport: { width, height },
          hasTouch: width <= 1024,
          isMobile: width < 600,
          reducedMotion: theme === "dark" ? "reduce" : "no-preference",
        }),
        p = await c.newPage(),
        r = { key: `${width}-${theme}` };
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
        await p
          .getByRole("button", { name: "Begin judging", exact: true })
          .click();
        await p.evaluate(async () => {
          await window.providerQA.addFindings(5);
        });
        await p.waitForTimeout(200);
        const mark = p.getByRole("spinbutton", {
          name: "Adu / Raagu marks",
          exact: true,
        });
        if (await mark.isVisible()) {
          await mark.focus();
          await mark.press("End");
        }
        r.fonts = await p.evaluate(() => ({
          body: getComputedStyle(document.body).fontFamily,
          numbers: getComputedStyle(
            document.querySelector(".sc-total-num") ||
              document.querySelector(".t-num"),
          ).fontFamily,
          loaded: [...document.fonts]
            .filter((f) => f.status === "loaded")
            .map((f) => f.family),
        }));
        assert(r.fonts.loaded.includes("Manrope"));
        assert(r.fonts.loaded.includes("Nunito Sans"));
        r.targets = [];
        for (const target of await p
          .locator(
            ".app-header .reciter-chip,.app-header .view-toggle,.app-header .btn-icon,.page-nav-btn,.page-nav-page,.log-view-all",
          )
          .all()) {
          if (!(await target.isVisible())) continue;
          await target.scrollIntoViewIfNeeded();
          r.targets.push(
            await target.evaluate((e) => {
              const a = e.getBoundingClientRect(),
                s = getComputedStyle(e, "::after");
              let x = a.x,
                y = a.y,
                w = a.width,
                h = a.height;
              if (s.content !== "none" && s.content !== "normal") {
                const l = parseFloat(s.left) || 0,
                  t = parseFloat(s.top) || 0,
                  right = parseFloat(s.right) || 0,
                  bottom = parseFloat(s.bottom) || 0;
                x += l;
                y += t;
                w = Math.max(w - l - right, parseFloat(s.minWidth) || 0);
                h = Math.max(h - t - bottom, parseFloat(s.minHeight) || 0);
              }
              const points = [
                [x + 2, y + h / 2],
                [x + w - 2, y + h / 2],
                [x + w / 2, y + 2],
                [x + w / 2, y + h - 2],
              ];
              return {
                class: e.className,
                x,
                y,
                w,
                h,
                edgeHits: points.map(([x, y]) => {
                  const hit = document.elementFromPoint(x, y);
                  return hit === e || e.contains(hit);
                }),
              };
            }),
          );
        }
        await p.evaluate(() => window.scrollTo(0, 0));
        for (const t of r.targets) {
          assert(t.w >= 43.9 && t.h >= 43.9, `${t.class}: ${t.w}x${t.h}`);
          assert(
            t.edgeHits.every(Boolean),
            `${t.class}: edge intercepted ${t.edgeHits}`,
          );
        }
        r.layout = await p.evaluate(() => {
          const box = (s) => {
            const e = document.querySelector(s);
            if (!e) return null;
            const b = e.getBoundingClientRect();
            return {
              width: b.width,
              height: b.height,
              padding: getComputedStyle(e).padding,
              gap: getComputedStyle(e).gap,
              radius: getComputedStyle(e).borderRadius,
            };
          };
          return {
            header: box(".app-header"),
            rail: box(".sidebar"),
            row: box(".sc-row"),
            panel: box(".scorecard"),
            workspace: box(".workspace"),
            cards: box(".log"),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert(!r.layout.overflow);
        await p.screenshot({ path: `${out}/${r.key}-judge.png` });
        if (width < 600) {
          await p.locator(".mobile-mistakes-action").click();
          await p.waitForTimeout(200);
        }
        const toggle = p.locator(".log-row:visible").first();
        if (await toggle.count()) {
          await toggle.click();
          await p.waitForTimeout(180);
        }
        await p.screenshot({ path: `${out}/${r.key}-mistakes.png` });
        if (theme === "dark") {
          r.holdProgress = await p.evaluate(() => {
            const probe = document.createElement("div");
            probe.className = "selector-undo holding";
            probe.innerHTML = '<span class="selector-undo-progress"></span>';
            document.body.append(probe);
            const style = getComputedStyle(probe.firstElementChild);
            const result = { duration: style.transitionDuration, property: style.transitionProperty, timing: style.transitionTimingFunction };
            probe.remove();
            return result;
          });
          assert.equal(r.holdProgress.duration, "0.7s");
          assert.equal(r.holdProgress.property, "transform");
          assert.match(r.holdProgress.timing, /steps\(3/);
          r.animations = await p.evaluate(() =>
            document
              .getAnimations()
              .filter(
                (a) =>
                  !a.effect?.target?.classList.contains(
                    "selector-undo-progress",
                  ),
              )
              .map((a) => ({
                state: a.playState,
                frames: a.effect.getKeyframes(),
              })),
          );
          assert(
            r.animations.every((a) => a.state === "finished"),
            "Reduced motion has no decorative animation",
          );
        }
        await p.emulateMedia({ forcedColors: "active" });
        const focus = width < 600 ? p.locator(".mobile-sheet-close:visible") : p.locator(".app-header .btn-icon").last();
        if (await focus.isVisible()) {
          await p.keyboard.press("Tab");
          await focus.focus();
          assert.equal(
            await focus.evaluate((e) => getComputedStyle(e).outlineStyle),
            "solid",
          );
        }
        r.pass = true;
        console.log("PASS visual " + r.key);
      } catch (e) {
        r.failure = String(e.stack || e);
        await p.screenshot({ path: `${out}/${r.key}-failure.png` });
        throw e;
      } finally {
        await c.close();
        writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
      }
    }
} finally {
  await b.close();
}
