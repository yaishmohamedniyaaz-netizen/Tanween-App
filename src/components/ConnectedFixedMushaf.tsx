import { useEffect, useState } from 'react';
import { Mushaf, type MushafProps } from './Mushaf';
import { MushafViewport, useCompactMushafPages, type MushafViewportProps } from './MushafViewport';
import { FIXED_PAGE_ASPECT_RATIO } from './FixedMushafPageSurface';
import { visibleMushafPages } from '../lib/mushafSpread';
import { useFixedMushafPages } from '../hooks/useFixedMushafPages';
import { fixedPaperPresentation } from '../lib/mobileMushafPresentation';

export function useFixedCompactPages() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return compact;
}

export function FixedMushafViewport(props: MushafViewportProps) {
  const compact = useFixedCompactPages();
  return <MushafViewport {...props} layout={compact ? 'full' : props.layout}
    forceStableStage forceCompactPages={compact}
    pageAspectRatio={props.mobilePresentation ? fixedPaperPresentation(true).aspectRatio : FIXED_PAGE_ASPECT_RATIO}
    navigationBlockSize={props.mobilePresentation ? 48 : 44} />;
}

export function ConnectedFixedMushaf(props: MushafProps) {
  const compact = useCompactMushafPages();
  const visible = visibleMushafPages(props.page, props.pageLayout, compact);
  const fixed = useFixedMushafPages(visible);
  if (!fixed.pages) return <div className="fixed-mushaf-loading">
    <div role={fixed.error ? 'alert' : 'status'}>
      {fixed.error || 'Loading Mushaf…'}
      {fixed.error && <button type="button" onClick={fixed.retry}>Retry</button>}
    </div>
    <nav aria-label="Mushaf pages">{props.headerControls(visible, compact)}</nav>
  </div>;
  return <Mushaf {...props} fixedPages={fixed.pages} fixedSemanticPages={fixed.semantic} />;
}
