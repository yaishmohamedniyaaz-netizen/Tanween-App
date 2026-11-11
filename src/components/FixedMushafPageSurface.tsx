import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { MushafPageSurfaceProps } from "./MushafPageSurface.tsx";
import type { FixedPageGeometry } from "../lib/fixedMushafGeometry.ts";
import { MUSHAF_REFERENCE_WIDTH } from "../lib/mushafGeometry.ts";
import "./fixedMushaf.css";
import { useCompactMushafPaper, useCalibratedPaperWidth } from './MushafViewport';
import { fixedPaperPresentation } from '../lib/mobileMushafPresentation';
import { calibratedMobilePaper } from '../lib/mobileCalibration';
import { printedBasmalaWords, regularBasmalaPlacements, useBasmalaStyle } from '../lib/printedBasmala';
import { dkPageGeometry, useDkPage, usePageDrawing } from '../lib/digitalKhattPages';
import { DkHeaderStrips, DkMarkedLetters, DkPageInk } from './DigitalKhattPage';

const INSET = 12, TOP = 16, BOTTOM = 12;
const ART_SCALE = (MUSHAF_REFERENCE_WIDTH - INSET * 2) / 1920;
export const FIXED_PAGE_HEIGHT = TOP + 3106 * ART_SCALE + BOTTOM;
export const FIXED_PAGE_ASPECT_RATIO = MUSHAF_REFERENCE_WIDTH / FIXED_PAGE_HEIGHT;

/** Image and semantic regions share one immutable reference-space transform. */
export function FixedMushafPageSurface({
  fixed, data, pageRef, beforeLines, afterLines, renderWord, lineClassName,
  onGeometryChange, qcfReady: _qcfReady, className = "", letterMarks, ...props
}: MushafPageSurfaceProps & { fixed: FixedPageGeometry }) {
  // DigitalKhatt drawing (prototype): same words and ids, own boxes and ink.
  // The printed artwork stays until the page's DigitalKhatt data has loaded.
  const drawing = usePageDrawing();
  const basmala = useBasmalaStyle();
  const dk = useDkPage(drawing === "digitalkhatt" ? data.page : null);
  const dkGeometry = useMemo(() => {
    if (!dk) return null;
    try { return dkPageGeometry(fixed, data, dk); } catch { return null; }
  }, [dk, fixed, data]);
  const compact = useCompactMushafPaper();
  const calibratedWidth = useCalibratedPaperWidth();
  const paper = calibratedWidth ? calibratedMobilePaper(calibratedWidth, data.page) : fixedPaperPresentation(compact);
  const { inset: INSET, top: TOP, artScale: ART_SCALE } = paper;
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  // Portrait Fit already supplies the exact frame width. Use it in this render;
  // waiting for ResizeObserver would paint a new page at the previous scale.
  const renderedScale = calibratedWidth ? calibratedWidth / paper.width : scale;
  useLayoutEffect(() => {
    if (calibratedWidth) return;
    const element = frame.current;
    if (!element) return;
    const update = () => setScale(element.clientWidth / paper.width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [paper.width, calibratedWidth]);
  useLayoutEffect(() => { if (renderedScale) onGeometryChange?.(); }, [renderedScale, data, dkGeometry, basmala, onGeometryChange]);
  const lines = new Map(data.lines.map(line => [line.n, line]));
  const words = dkGeometry ? dkGeometry.words
    : [...fixed.words, ...printedBasmalaWords(data, basmala)].sort((a, b) => a.line - b.line || b.region[0] - a.region[0]);
  const openingOffset = !dkGeometry && data.page <= 2 && fixed.contentBounds
    ? (fixed.height - fixed.contentBounds[1] - fixed.contentBounds[3]) / 2 * ART_SCALE : 0;
  // Ornament emphasis follows its surah's opening, including ornaments on
  // the preceding page. Printed Basmalas now have ordinary selectable rows.
  const contextGaps: Array<[number, number]> = [];
  let rowBottom = 0;
  const hasQuestionOpening = (after: number, before: number) => data.lines.some(line =>
    line.type === "surah-header" && line.n > after && line.n < before &&
    !lineClassName?.(line)?.includes("question-context-line"));
  for (const word of [...words].sort((a, b) => a.region[1] - b.region[1])) {
    const [, top, , bottom] = word.region;
    if (top > rowBottom) {
      const previousLine = Math.max(0, ...words.filter(w => w.region[3] <= rowBottom).map(w => w.line));
      if (!hasQuestionOpening(previousLine, word.line)) contextGaps.push([rowBottom, top]);
    }
    rowBottom = Math.max(rowBottom, bottom);
  }
  if (rowBottom < fixed.height && !hasQuestionOpening(Math.max(0, ...words.map(w => w.line)), Infinity)) {
    contextGaps.push([rowBottom, fixed.height]);
  }
  return <div ref={frame} className={`mushaf-page-frame fixed-page-frame ${className}`}
    style={{ aspectRatio: paper.aspectRatio }}>
    <div {...props} ref={pageRef} className={`page page-fixed-mushaf ${className}`}
      data-page={data.page} data-font-ready="true" data-fixed-page="true"
      data-page-drawing={dkGeometry ? "digitalkhatt" : "print"}
      data-reference-width={paper.width}
      style={{ ...props.style, width: paper.width, height: paper.height,
        transform: `scale(${renderedScale || 1})`, visibility: renderedScale ? undefined : "hidden",
        "--mark-wash-pad-top": "0px", "--mark-wash-pad-bottom": "0px" } as CSSProperties}>
      {dk && dkGeometry ? <>
        <DkPageInk dk={dk} place={{ left: INSET, top: TOP, scale: ART_SCALE }} />
        <DkHeaderStrips dk={dk} place={{ left: INSET, top: TOP, scale: ART_SCALE }} image={fixed.image} />
      </> : <>
        <img src={fixed.image} alt={`Mushaf page ${data.page}`} draggable={false}
          style={{ left: INSET, top: TOP + openingOffset, width: 1920 * ART_SCALE, height: 3106 * ART_SCALE,
            clipPath: basmalaHoles(regularBasmalaPlacements(data.page, basmala).map(place => place.row), ART_SCALE) }} />
        {/* The regular Basmala (Al-Fatiha 1:1 of the same print) over each cut-out stamp row. */}
        {regularBasmalaPlacements(data.page, basmala).map(place => <img key={place.top} src={place.image} alt=""
          aria-hidden="true" draggable={false} data-regular-basmala="true"
          style={{ left: INSET + place.left * ART_SCALE, top: TOP + openingOffset + place.top * ART_SCALE,
            width: place.width * ART_SCALE, height: place.height * ART_SCALE }} />)}
      </>}
      <div className="mushaf-lines">
        {contextGaps.map(([top, bottom]) => <div key={top}
          className="fixed-artwork-context" aria-hidden="true"
          style={{ left: INSET, top: TOP + openingOffset + top * ART_SCALE,
            width: fixed.width * ART_SCALE, height: (bottom - top) * ART_SCALE }} />)}
        {beforeLines}
        {words.map((word, index) => {
          const line = lines.get(word.line)!;
          const [x0, y0, x1, y1] = word.region;
          return <div key={word.wid} className={`fixed-word ${lineClassName?.(line) ?? ""}`}
            data-fixed-line={word.line}
            style={{ left: INSET + x0 * ART_SCALE, top: TOP + openingOffset + y0 * ART_SCALE,
              width: (x1 - x0) * ART_SCALE, height: (y1 - y0) * ART_SCALE,
              // Fade reaches the artwork edges; selection/hit regions do not.
              '--context-right': words[index - 1]?.line !== word.line ? `${-(fixed.width - x1) * ART_SCALE}px` : '0px',
              '--context-left': words[index + 1]?.line !== word.line ? `${-x0 * ART_SCALE}px` : '0px',
            } as CSSProperties}>
            {renderWord(word, line)}
          </div>;
        })}
      </div>
      {afterLines}
      {dk && dkGeometry && letterMarks && letterMarks.size > 0 &&
        <DkMarkedLetters dk={dk} place={{ left: INSET, top: TOP, scale: ART_SCALE }} marks={letterMarks} />}
    </div>
  </div>;
}

/**
 * Clip the page artwork so the printed Basmala stamp rows are cut out; the
 * regular Basmala is drawn there instead. Each hole is the stamp row with a
 * small margin (no other ink is that close to a stamp).
 */
function basmalaHoles(rows: readonly (readonly number[])[], scale: number): string | undefined {
  if (!rows.length) return undefined;
  const W = 1920 * scale, H = 3106 * scale, pad = 6;
  const hole = ([x0, y0, x1, y1]: readonly number[]) =>
    `M${(x0 - pad) * scale} ${(y0 - pad) * scale}H${(x1 + pad) * scale}V${(y1 + pad) * scale}H${(x0 - pad) * scale}Z`;
  return `path(evenodd, "M0 0H${W}V${H}H0Z${rows.map(hole).join("")}")`;
}
