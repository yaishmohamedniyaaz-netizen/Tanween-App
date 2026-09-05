import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { DragMenu, type MenuAnchor } from "../../src/components/DragMenu";
import { HoldToUndo } from "../../src/components/HoldToUndo";
import { DEFAULT_CONFIG } from "../../src/config";
import { judgingTargetsOf } from "../../src/lib/judgingUnits";
import type { CategoryId } from "../../src/types";
import "../../src/styles/global.css";
import page from "../../public/pages/p52.json";
import openingPage from "../../public/pages/p1.json";
import hamzaPage from "../../public/pages/p199.json";

const cases = [page, openingPage, hamzaPage].flatMap(page => page.lines.flatMap(line => line.words ?? [])).filter(word => ["3.17.4", "1.1.1", "9.75.4"].includes(word.wid));
const initial = [{ id: "qa-1", category: "jali" as CategoryId, amount: 2 }, { id: "qa-2", category: "khafi" as CategoryId, amount: 1 }];
function Fixture() {
  const [wordIndex, setWordIndex] = useState(0);
  const source = cases[wordIndex];
  const word = source.text;
  const units = judgingTargetsOf(word, source.role, source.wid);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(initial);
  const [result, setResult] = useState("Not run");
  const [running, setRunning] = useState(false);
  async function checkCorpus() {
    setRunning(true);
    try {
      const response = await fetch("/outputs/tashkeel-targets.json");
      if (!response.ok) throw new Error("Run scripts/qa/build-tashkeel-targets.mjs first");
      const spans: string[] = await response.json();
      await document.fonts.ready;
      const host = document.createElement("div");
      host.className = "unit-picker with-tashkeel";
      host.style.cssText = "position:fixed;left:-10000px;top:0";
      host.setAttribute("aria-hidden", "true");
      const button = document.createElement("button"); button.className = "unit-choice";
      host.append(button); document.body.append(host);
      try {
        const style = getComputedStyle(button);
        await document.fonts.load(`${style.fontSize} ${style.fontFamily}`);
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.font = `${style.fontSize} ${style.fontFamily}`;
        const failures = spans.flatMap(text => {
          const m = ctx.measureText(text);
          const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
          const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
          return inkWidth > 40 || inkHeight > 44 ? [{ text, inkWidth, inkHeight }] : [];
        });
        setResult(`${failures.length ? "REVIEW" : "PASS"}: ${spans.length} unique source spans; ${failures.length} exceed the 40×44 ink allowance. ${JSON.stringify(failures)}`);
      } finally { host.remove(); }
    } catch (error) { setResult(`FAIL: ${String(error)}`); }
    finally { setRunning(false); }
  }
  async function check() {
    setRunning(true);
    const host = document.createElement("div"); document.body.append(host);
    const root = createRoot(host); let removed = 0;
    const mount = () => flushSync(() => root.render(<HoldToUndo key={Math.random()} onUndo={() => removed++} />));
    mount();
    const button = () => host.querySelector("button")!;
    const pointer = (type: string, outside = false) => {
      const rect = button().getBoundingClientRect();
      flushSync(() => button().dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 999, isPrimary: true, button: 0, clientX: outside ? rect.right + 20 : rect.left + 10, clientY: rect.top + 10 })));
    };
    // Synthetic pointers have no browser capture; isolate only that native API.
    const prepare = () => { button().setPointerCapture = () => {}; };
    const wait = () => new Promise(resolve => setTimeout(resolve, 760));
    const passed: string[] = [];
    const expect = (condition: boolean, name: string) => { if (!condition) throw new Error(name); passed.push(name); };
    try {
      prepare(); pointer("pointerdown"); pointer("pointerup"); expect(removed === 0, "short press cancels");
      pointer("pointerdown"); await wait(); expect(removed === 0, "holding alone never removes"); pointer("pointerup"); expect(removed === 1, "full hold removes once on release");
      pointer("pointerdown"); pointer("pointermove", true); await wait(); pointer("pointerup"); expect(removed === 1, "leaving cancels even after returning");
      pointer("pointerdown"); pointer("pointercancel"); await wait(); pointer("pointerup"); expect(removed === 1, "pointer cancellation preserves finding");
      pointer("pointerdown"); window.dispatchEvent(new Event("blur")); await wait(); pointer("pointerup"); expect(removed === 1, "window blur cancels");
      pointer("pointerdown"); mount(); prepare(); await wait(); pointer("pointerup"); expect(removed === 1, "changed target cancels old hold");
      const key = (type: string) => flushSync(() => button().dispatchEvent(new KeyboardEvent(type, { key: " ", bubbles: true, cancelable: true })));
      key("keydown"); key("keyup"); expect(removed === 1, "short keyboard press cancels");
      key("keydown"); await wait(); key("keyup"); expect(removed === 2, "keyboard hold removes once");
      button().click(); expect(removed === 3, "assistive activation works");
      setResult(`PASS: ${passed.join("; ")}`);
    } catch (error) { setResult(`FAIL: ${String(error)}`); }
    finally { root.unmount(); host.remove(); setRunning(false); }
  }
  const [showTashkeel, setShowTashkeel] = useState(false);
  return <main style={{ padding: 16 }}>
    <label><input type="checkbox" checked={showTashkeel} onChange={event => setShowTashkeel(event.target.checked)} />Tashkeel (fixture setting)</label>
    <p>Actual selector component · disposable test findings</p>
    <label>Word case <select value={wordIndex} onChange={event => { setWordIndex(Number(event.target.value)); setAnchor(null); setSelected(null); }}>{cases.map((word, index) => <option key={word.wid} value={index}>{word.text}</option>)}</select></label>
    <button className="btn-ghost" disabled={running} onClick={check}>Run gesture checks</button>
    <button className="btn-ghost" disabled={running} onClick={checkCorpus}>Check all source spans</button>
    <button className="btn-ghost" onClick={() => setMistakes(Array.from({ length: 6 }, (_, index) => ({ id: `qa-${index + 1}`, category: (["jali", "khafi", "fasaha"] as CategoryId[])[Math.floor(index / 2)], amount: 1 })))}>Show six findings</button>
    <p role="status">{result}</p>
    <p>Remaining findings: {mistakes.length}</p>
    <button style={{ marginTop: 180, fontFamily: "var(--quran)", fontSize: 30 }} onClick={event => {
      const r = event.currentTarget.getBoundingClientRect(); setAnchor({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }); setSelected(null);
    }}>Open long word: {word}</button>
    {anchor && <DragMenu showTashkeel={showTashkeel} anchor={anchor} glyph={word} units={units.map((unit, i) => ({ ...unit, selected: selected === unit.tid, mistake: mistakes.find(m => m.id === `qa-${i + 1}`) }))} targetSelected={!!selected} pinned hovered={null} config={DEFAULT_CONFIG} allowedCategories={["jali", "khafi", "fasaha"]} onUnitPick={setSelected} onPick={() => setAnchor(null)} onClose={() => setAnchor(null)} onUndo={id => { setMistakes(items => items.filter(item => item.id !== id)); setAnchor(null); }} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
