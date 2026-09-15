import { useEffect, useState } from 'react';
import type { ReplayWord } from '../lib/recitationReplay.ts';
import { loadQcfPageFont, qcfFontFamily } from '../lib/qcfFont.ts';

/** Render an intact page glyph, not a crop of a practical hit rectangle. */
export function ReplayKalima({ word }: { word?: ReplayWord }) {
  const page = word?.presentation?.page;
  const glyph = word?.presentation?.glyph;
  const valid = Number.isInteger(page) && page! >= 1 && page! <= 604 && Boolean(glyph);
  const [loadedPage, setLoadedPage] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoadedPage(null);
    if (valid) void loadQcfPageFont(page!).then(() => {
      if (!cancelled) setLoadedPage(page!);
    }).catch(() => { /* Keep readable Arabic when the source font is unavailable. */ });
    return () => { cancelled = true; };
  }, [page, valid]);
  if (!word) return null;
  const ready = valid && loadedPage === page;
  return <bdi dir="rtl" lang="ar" role="img" aria-label={word.text} data-mushaf-glyph={ready ? 'ready' : 'fallback'}>
    <span aria-hidden="true" style={ready ? {
      fontFamily: `"${qcfFontFamily(page!)}"`, fontWeight: 400,
      fontSynthesis: 'none', lineHeight: 1.8,
    } : undefined}>{ready ? glyph : word.text}</span>
  </bdi>;
}
