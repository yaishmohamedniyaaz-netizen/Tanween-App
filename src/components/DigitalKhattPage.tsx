import { memo, useMemo, type CSSProperties } from "react";
import type { CategoryId } from "../types";
import { dkGlyphUnits, type DkLine, type DkPage } from "../lib/digitalKhattPages.ts";

const ART_W = 1920, ART_H = 3106;
const lineTransform = (line: DkLine) => `translate(${line.right} ${line.base}) scale(${line.sx} ${-line.sy})`;

interface Placement { left: number; top: number; scale: number }

/** All ink of a DigitalKhatt page, in the artwork frame. Pure: redraws only when the page changes. */
export const DkPageInk = memo(function DkPageInk({ dk, place }: { dk: DkPage; place: Placement }) {
  return (
    <svg className="dk-page-ink" viewBox={`0 0 ${ART_W} ${ART_H}`} role="img" aria-label={`Mushaf page ${dk.page}`} focusable="false"
      style={{ left: place.left, top: place.top, width: ART_W * place.scale, height: ART_H * place.scale }}>
      {dk.lines.map((line) => (
        <g key={line.n} transform={lineTransform(line)}>
          {line.g.map((glyph, index) => <use key={index} href={`#dkg${glyph[0]}`} x={glyph[1]} y={glyph[2]} />)}
        </g>
      ))}
    </svg>
  );
});

/**
 * Marked letters drawn again on top in the criterion's strong colour: the
 * letter body with its dots and harakat. Above the question fade, so a mark
 * outside the question stays bright.
 */
export function DkMarkedLetters({ dk, place, marks }: {
  dk: DkPage; place: Placement; marks: ReadonlyMap<string, CategoryId>;
}) {
  const lines = useMemo(() => dk.lines.map((line) => ({
    line,
    glyphs: line.g.flatMap((glyph, index) => {
      const category = dkGlyphUnits(dk, glyph).map((tid) => marks.get(tid)).find(Boolean);
      return category ? [{ glyph, index, category }] : [];
    }),
  })).filter((entry) => entry.glyphs.length), [dk, marks]);
  if (!lines.length) return null;
  return (
    <svg className="dk-marked-letters" viewBox={`0 0 ${ART_W} ${ART_H}`} aria-hidden="true" focusable="false"
      style={{ left: place.left, top: place.top, width: ART_W * place.scale, height: ART_H * place.scale }}>
      {lines.map(({ line, glyphs }) => (
        <g key={line.n} transform={lineTransform(line)}>
          {glyphs.map(({ glyph, index, category }) => (
            <use key={index} className={`dk-mark cat-${category}`} data-dk-mark={dkGlyphUnits(dk, glyph).join(" ")}
              href={`#dkg${glyph[0]}`} x={glyph[1]} y={glyph[2]} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Surah header lines: the strip of that line cut from the printed artwork. */
export function DkHeaderStrips({ dk, place, image }: { dk: DkPage; place: Placement; image: string }) {
  return <>
    {dk.headers.map((header) => {
      const slotHeight = (header.slot[1] - header.slot[0]) * place.scale;
      const ratio = (header.slot[1] - header.slot[0]) / (header.art[1] - header.art[0]);
      return (
        <div key={header.n} className="dk-header-strip" aria-hidden="true"
          style={{ left: place.left, top: place.top + header.slot[0] * place.scale, width: ART_W * place.scale, height: slotHeight }}>
          <img src={image} alt="" draggable={false}
            style={{ left: 0, top: -header.art[0] * place.scale * ratio, width: ART_W * place.scale, height: ART_H * place.scale * ratio }} />
        </div>
      );
    })}
  </>;
}

/**
 * The tray's big word: the word's own DigitalKhatt glyphs. The chosen letter
 * is lit; marked letters keep their criterion colour.
 */
export function DkWordArt({ dk, wid, selectedTid, marks, preview }: {
  dk: DkPage; wid: string; selectedTid: string | null;
  marks: ReadonlyMap<string, CategoryId>;
  /** Criterion being previewed for the chosen letter (hover or armed). */
  preview?: CategoryId | null;
}) {
  const index = dk.words.findIndex((word) => word.wid === wid);
  if (index < 0) return null;
  const word = dk.words[index];
  const [x0, y0, x1, y1] = word.body;
  const pad = (y1 - y0) * 0.12;
  const line = dk.lines.find((entry) => entry.n === word.line);
  if (!line) return null;
  const glyphs = line.g.filter((glyph) => glyph[3] === index);
  return (
    <svg className="dk-word-art" viewBox={`${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`}
      aria-hidden="true" focusable="false"
      style={{ aspectRatio: `${x1 - x0 + pad * 2} / ${y1 - y0 + pad * 2}` } as CSSProperties}>
      <g transform={lineTransform(line)}>
        {glyphs.map((glyph, i) => {
          const units = dkGlyphUnits(dk, glyph);
          const selected = selectedTid !== null && units.includes(selectedTid);
          const category = selected && preview ? preview : units.map((tid) => marks.get(tid)).find(Boolean);
          const className = category ? `dk-mark cat-${category}` : selected ? "dk-selected" : undefined;
          return <use key={i} className={className} href={`#dkg${glyph[0]}`} x={glyph[1]} y={glyph[2]} />;
        })}
      </g>
    </svg>
  );
}
