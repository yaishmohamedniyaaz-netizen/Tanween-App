import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal, flushSync } from "react-dom";
import { DragMenu, type MenuAnchor } from "./DragMenu";
import { judgingTargetsOf } from "../lib/judgingUnits";
import { RECITATION_PHRASES as phrases } from "../lib/recitationPhrases";
import { MUSHAF_SURFACE_EVENT, openMushafSurface } from "../lib/mushafSurface";
import type { CategoryId, ScoreConfig } from "../types";
import { phraseWordSummary, PHRASE_HELP_KEY, type PhraseFinding } from "../lib/phraseFindings";
import { usePhrasePanelPosition } from "../hooks/usePhrasePanelPosition";
import "./startingEnding.css";

type Selection = { phrase: number; word: number; tid: string | null };
const emptyAnchor = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
export type PhraseOpenRequest = { id: number; source: HTMLElement };

export function StartingEndingPanel({ config, categories, showTashkeel, request, findings: marks, onMark, onUndo, onOpenChange }: {
  config: ScoreConfig; categories: CategoryId[]; showTashkeel: boolean;
  request: PhraseOpenRequest | null;
  findings: PhraseFinding[];
  onMark: (finding: PhraseFinding) => void;
  onUndo: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hovered, setHovered] = useState<CategoryId | null>(null);
  const [status, setStatus] = useState("");
  const [anchor, setAnchor] = useState<MenuAnchor>(emptyAnchor);
  const [pinned, setPinned] = useState(true);
  const gesture = useRef<{ id: number; x: number; y: number; t: number; moved: boolean; tid: string | null } | null>(null);
  const invoker = useRef<HTMLElement | null>(null);
  const surface = useRef<HTMLElement | null>(null);
  const words = useRef(new Map<string, HTMLButtonElement>());
  const lastWord = useRef<string | null>(null);
  const helpButton = useRef<HTMLButtonElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const position = usePhrasePanelPosition(open, invoker);
  useEffect(() => { onOpenChange(open); }, [open, onOpenChange]);
  const restoreWord = useCallback(() => requestAnimationFrame(() => {
    if (lastWord.current) words.current.get(lastWord.current)?.focus({ preventScroll: true });
  }), []);
  const cancelSelection = useCallback((restore = true) => {
    gesture.current = null; setSelection(null); setHovered(null);
    if (restore) restoreWord();
  }, [restoreWord]);
  const close = useCallback((restore = true) => {
    gesture.current = null; setOpen(false); setHelp(false); setSelection(null); setHovered(null);

    if (restore) requestAnimationFrame(() => {
      const target = invoker.current?.isConnected ? invoker.current : null;
      target?.focus({ preventScroll: true });
    });
  }, []);
  const dismissHelp = useCallback(() => {
    setHelp(false);
    try { localStorage.setItem(PHRASE_HELP_KEY, "seen"); } catch { /* Help remains usable without storage. */ }
    requestAnimationFrame(() => helpButton.current?.focus({ preventScroll: true }));

  }, []);

  useEffect(() => {
    if (!request) return;
    if (openRef.current) { close(); return; }
    invoker.current = request.source;
    openMushafSurface("phrases");
    setSelection(null); setHovered(null); setOpen(true);
    let seen = false;
    try { seen = localStorage.getItem(PHRASE_HELP_KEY) === "seen"; } catch { /* Show help once for this opening. */ }
    setHelp(!seen);
    requestAnimationFrame(() => {
      surface.current?.querySelector<HTMLElement>(!seen ? ".phrase-help-dismiss" : ".phrase-word")?.focus({ preventScroll: true });
    });
  }, [request, close]);

  useEffect(() => {
    const switchSurface = (event: Event) => {
      if ((event as CustomEvent).detail !== "phrases" && openRef.current) close(false);
    };
    const cancel = () => cancelSelection(false);
    window.addEventListener(MUSHAF_SURFACE_EVENT, switchSurface);
    window.addEventListener("resize", cancel); window.addEventListener("blur", cancel);
    // Cancel before a moving viewport can leave an old word anchor under a finger.
    window.visualViewport?.addEventListener("scroll", cancel);
    return () => {
      window.removeEventListener(MUSHAF_SURFACE_EVENT, switchSurface);
      window.removeEventListener("resize", cancel); window.removeEventListener("blur", cancel);
      window.visualViewport?.removeEventListener("scroll", cancel);
    };
  }, [close, cancelSelection]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      if (help) dismissHelp(); else if (selection) cancelSelection(); else close();
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || surface.current?.contains(event.target) ||
          event.target.closest("[data-phrase-entry]")) return;
      const hitsPage = !!event.target.closest(".mushaf-composition");
      if (hitsPage) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
      close(hitsPage);
    };
    const outsideFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || surface.current?.contains(event.target) ||
          event.target.closest("[data-phrase-entry]")) return;
      close(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outsideFocus);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outsideFocus);
    };
  }, [open, help, selection, close, cancelSelection, dismissHelp]);

  const selectedPhrase = selection ? phrases[selection.phrase] : null;
  const wordKey = selection ? selectedPhrase!.id + ":" + selection.word : "";
  const glyph = selection ? selectedPhrase!.words[selection.word] : "";
  const units = selection ? judgingTargetsOf(glyph, "letter", "phrase:recitation:" + wordKey).map(unit => ({
    tid: unit.tid, primaryGlyph: unit.primaryGlyph, fullGlyph: unit.fullGlyph,
    selected: unit.tid === selection.tid, mistake: marks.find(mark => mark.targetId === unit.tid),
  })) : [];
  const chooseWord = (phrase: number, word: number, element: HTMLElement, pin = true) => {
    lastWord.current = phrases[phrase].id + ":" + word;
    setAnchor(element.getBoundingClientRect()); setPinned(pin);
    setSelection({ phrase, word, tid: null }); setHovered(null);

  };
  const pick = (category: CategoryId, tid?: string | null) => {
    const unit = units.find(item => tid ? item.tid === tid : item.selected);
    if (!unit || !categories.includes(category)) return;
    const mark: PhraseFinding = {
      id: "finding:" + unit.tid, targetId: unit.tid, occurrenceId: "occurrence-1",
      category, amount: config[category].step, wordKey, word: glyph, letter: unit.fullGlyph, phraseId: selectedPhrase!.id,
    };
    onMark(mark);
    setStatus("Letter marked. " + glyph + ", " + unit.fullGlyph + ".");
    cancelSelection();
  };
  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>, phrase: number, word: number) => {
    if (!event.isPrimary || gesture.current) { cancelSelection(); return; }
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: Date.now(), moved: false, tid: null };
    flushSync(() => chooseWord(phrase, word, event.currentTarget, false));
  };
  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) start.moved = true;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const tid = hit?.closest<HTMLElement>("[data-unit-tid]")?.dataset.unitTid;
    if (tid && units.some(unit => unit.tid === tid)) {
      start.tid = tid; setSelection(current => current ? { ...current, tid } : null);
    }
    const category = hit?.closest<HTMLElement>("[data-pill]")?.dataset.pill as CategoryId | undefined;
    setHovered(category && start.tid && categories.includes(category) ? category : null);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const category = hit?.closest<HTMLElement>("[data-pill]")?.dataset.pill as CategoryId | undefined;
    const finalTid = hit?.closest<HTMLElement>("[data-unit-tid]")?.dataset.unitTid;
    if (category && start.tid && categories.includes(category)) pick(category, start.tid);
    else if (categories.length === 1 && start.moved && finalTid && units.some(unit => unit.tid === finalTid)) pick(categories[0], finalTid);
    else if (!start.moved && Date.now() - start.t < 500) setPinned(true);
    else cancelSelection();
  };

  return <>
    <span className="phrase-live-status" role="status">{status}</span>
    {open && createPortal(<section ref={node => { surface.current = node; }} id="starting-ending-panel"
      className="starting-ending-panel phrase-panel" style={position}
      role="dialog" aria-modal={false} aria-labelledby="phrase-panel-title">
      <header className="phrase-panel-heading">
        <h2 id="phrase-panel-title">Starting &amp; ending</h2>
        <div className="phrase-panel-actions">
          <button ref={helpButton} type="button" className="phrase-help-button" aria-label="Phrase marking help"
            aria-expanded={help} onClick={() => {
              if (help) dismissHelp(); else { cancelSelection(false); setHelp(true); }
            }}>?</button>
          <button type="button" className="phrase-close" aria-label="Close starting and ending" onClick={() => close()}>×</button>
        </div>
      </header>
      {help ? <div className="phrase-help">
        <p>Mark these words as you mark the Mushaf. Tap a word to choose its letter and mistake type.</p>
        <button type="button" className="btn-primary phrase-help-dismiss" onClick={dismissHelp}>Got it</button>
      </div> : <div className="phrase-panel-content" onScroll={() => { if (selection) cancelSelection(false); }}>
        {(["starting", "ending"] as const).map(group =>
          <section className="phrase-group" key={group} aria-label={group === "starting" ? "Starting phrases" : "Ending phrase"}>
            {phrases.map((phrase, phraseIndex) => phrase.group !== group ? null : <div className="phrase-row" data-phrase-id={phrase.id} key={phrase.id}>
              <div className="phrase-words" dir="rtl" lang="ar">{phrase.words.map((word, wordIndex) => {
                const key = phrase.id + ":" + wordIndex;
                const summary = phraseWordSummary(marks.filter(item => item.wordKey === key), categories);
                return <button type="button" key={key} ref={node => { if (node) words.current.set(key, node); else words.current.delete(key); }}
                  className={"phrase-word " + (wordKey === key ? "is-selected " : "") + (summary.category ? "has-mark cat-" + summary.category : "")}
                  aria-label={word + (summary.total ? ", " + summary.total + (summary.total === 1 ? " finding" : " findings") : "")}
                  onPointerDown={event => pointerDown(event, phraseIndex, wordIndex)}
                  onPointerMove={pointerMove} onPointerUp={pointerUp}
                  onPointerCancel={() => cancelSelection()}
                  onLostPointerCapture={() => { if (gesture.current) cancelSelection(); }}
                  onContextMenu={event => event.preventDefault()}
                  onClick={event => { if (event.detail === 0) chooseWord(phraseIndex, wordIndex, event.currentTarget); }}>
                  <span className="phrase-word-ink">{word}</span>
                  {summary.total >= 2 && <span className="phrase-word-count" aria-hidden="true">{summary.total}</span>}
                </button>;
              })}</div>
            </div>)}
          </section>)}
      </div>}
      {selection && !help && <DragMenu anchor={anchor} portalHost={surface.current} preserveSourceContext
        reservedHeaderInlineSize={96}
        reservedHeaderBlockSize={surface.current?.querySelector(".phrase-panel-heading")?.getBoundingClientRect().height ?? 60}
        glyph={glyph} units={units}
        targetSelected={!!selection.tid} hovered={hovered} onPreview={setHovered} pinned={pinned}
        config={config} allowedCategories={categories} onPick={pick}
        onUnitPick={tid => setSelection(current => current ? { ...current, tid } : null)}
        onClose={cancelSelection} showTashkeel={showTashkeel}
        onUndo={id => {
          onUndo(id); setStatus("Mark removed.");
          cancelSelection();
        }} />}
    </section>, document.body)}
  </>;
}
