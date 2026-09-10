import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  computeMushafFitInlineSize,
  computeMushafRenderedBlockSize,
  computeMushafRenderedInlineSize,
  MUSHAF_SPREAD_NAV_BLOCK_SIZE,
  STABLE_MUSHAF_STAGE_QUERY,
  type MushafPageLayout,
} from "../lib/mushafFit";
import { MUSHAF_ZOOM_FIT } from "../lib/devicePreferences";
import { mobileMushafFit, boundedMobileZoom } from '../lib/mobileMushafPresentation';

export interface MushafViewportProps {
  children: ReactNode;
  layout: MushafPageLayout;
  zoomPercent: number;
  contentKey: string;
  overlay?: ReactNode;
  forceStableStage?: boolean;
  forceCompactPages?: boolean;
  pageAspectRatio?: number;
  navigationBlockSize?: number;
  mobilePresentation?: boolean;
  onZoomConstrained?: (constrained: boolean) => void;
}

type MushafViewportStyle = CSSProperties & {
  "--page-zoom": number;
  "--mushaf-fit-inline-size"?: string;
  "--mushaf-render-inline-size"?: string;
  "--mushaf-render-block-size"?: string;
  "--mushaf-stage-block-size"?: string;
};

const MushafViewportContext = createContext({
  renderScale: 1,
  stableStage: false,
  compactPages: true,
  compactPaper: false,
});

export function useCompactMushafPaper(): boolean {
  return useContext(MushafViewportContext).compactPaper;
}

export function useMushafRenderScale(): number {
  return useContext(MushafViewportContext).renderScale;
}

export function useStableMushafStage(): boolean {
  return useContext(MushafViewportContext).stableStage;
}

export function useCompactMushafPages(): boolean {
  return useContext(MushafViewportContext).compactPages;
}

function stableStageMatches(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia(STABLE_MUSHAF_STAGE_QUERY).matches;
}

export function MushafViewport({
  children,
  layout,
  zoomPercent,
  contentKey,
  overlay,
  forceStableStage = false,
  forceCompactPages = false,
  pageAspectRatio,
  navigationBlockSize,
  mobilePresentation = false,
  onZoomConstrained,
}: MushafViewportProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportCenterRef = useRef({ inline: 0.5, block: 0.5 });
  const restoringScrollRef = useRef(false);
  const [stableStage, setStableStage] = useState(
    () => forceStableStage || stableStageMatches(),
  );
  const [fitInlineSize, setFitInlineSize] = useState(0);
  const [frameInlineSize, setFrameInlineSize] = useState(0);
  const [mobileMaximum, setMobileMaximum] = useState(0);

  useEffect(() => {
    const media = window.matchMedia(STABLE_MUSHAF_STAGE_QUERY);
    const update = () => {
      const nextStableStage = forceStableStage || media.matches;
      setStableStage(nextStableStage);
      if (!nextStableStage) setFitInlineSize(0);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [forceStableStage]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !stableStage) return;

    let animationFrame = 0;
    const measure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const mobileFit = mobilePresentation ? mobileMushafFit(frame.clientWidth, frame.clientHeight) : null;
        const next = mobileFit?.base ?? computeMushafFitInlineSize({
          frameInlineSize: frame.clientWidth,
          frameBlockSize: frame.clientHeight,
          layout,
          pageAspectRatio,
          navigationBlockSize,
        });
        setFrameInlineSize(frame.clientWidth);
        setMobileMaximum(mobileFit?.maximum ?? 0);
        setFitInlineSize((current) => (current === next ? current : next));
      });
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => {
        window.cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", measure);
      };
    }

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [layout, stableStage, pageAspectRatio, navigationBlockSize, mobilePresentation]);

  const mobileZoom = boundedMobileZoom(fitInlineSize, mobileMaximum, zoomPercent);
  const renderedInlineSize = mobilePresentation ? mobileZoom.width : computeMushafRenderedInlineSize(
    fitInlineSize,
    zoomPercent,
  );
  const renderedBlockSize = mobilePresentation && pageAspectRatio ? Math.ceil(renderedInlineSize / pageAspectRatio) : computeMushafRenderedBlockSize(
    fitInlineSize,
    layout,
    zoomPercent,
    pageAspectRatio,
  );
  const renderScale = mobilePresentation ? mobileZoom.scale : stableStage ? zoomPercent / 100 : 1;
  useEffect(() => {
    onZoomConstrained?.(mobilePresentation && mobileZoom.constrained);
  }, [mobilePresentation, mobileZoom.constrained, onZoomConstrained]);
  const compactPages = forceCompactPages || !stableStage;
  const stageBlockSize = renderedBlockSize + (navigationBlockSize ?? (
    layout === "spread" ? MUSHAF_SPREAD_NAV_BLOCK_SIZE : 0
  ));
  const coachGutter = Math.max(0, (frameInlineSize - renderedInlineSize) / 2);
  const style: MushafViewportStyle = {
    "--page-zoom": mobilePresentation ? renderScale : zoomPercent / 100,
    ...(fitInlineSize > 0 && renderedInlineSize > 0 && renderedBlockSize > 0
      ? {
          "--mushaf-fit-inline-size": `${fitInlineSize}px`,
          "--mushaf-render-inline-size": `${renderedInlineSize}px`,
          "--mushaf-render-block-size": `${renderedBlockSize}px`,
          "--mushaf-stage-block-size": `${stageBlockSize}px`,
        }
      : {}),
  };

  const restoreViewportCenter = () => {
    const frame = frameRef.current;
    if (!frame) return;
    restoringScrollRef.current = true;
    const maxInline = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxBlock = Math.max(0, frame.scrollHeight - frame.clientHeight);
    frame.scrollLeft = maxInline * viewportCenterRef.current.inline;
    frame.scrollTop = maxBlock * viewportCenterRef.current.block;
    requestAnimationFrame(() => {
      restoringScrollRef.current = false;
    });
  };

  useLayoutEffect(() => {
    if (!stableStage || !renderedInlineSize || !renderedBlockSize) return;
    const frame = requestAnimationFrame(restoreViewportCenter);
    return () => cancelAnimationFrame(frame);
  }, [renderedBlockSize, renderedInlineSize, stableStage]);

  useLayoutEffect(() => {
    if (!stableStage) return;
    viewportCenterRef.current = { inline: 0.5, block: 0 };
    const frame = requestAnimationFrame(() => {
      const shell = frameRef.current;
      if (!shell) return;
      restoringScrollRef.current = true;
      shell.scrollLeft = Math.max(0, shell.scrollWidth - shell.clientWidth) / 2;
      shell.scrollTop = 0;
      requestAnimationFrame(() => {
        restoringScrollRef.current = false;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [contentKey, stableStage]);

  const updateViewportCenter = () => {
    if (restoringScrollRef.current) return;
    const frame = frameRef.current;
    if (!frame) return;
    const maxInline = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxBlock = Math.max(0, frame.scrollHeight - frame.clientHeight);
    viewportCenterRef.current = {
      inline: maxInline > 0 ? frame.scrollLeft / maxInline : 0.5,
      block: maxBlock > 0 ? frame.scrollTop / maxBlock : 0.5,
    };
  };

  return (
    <div
      className="mushaf-viewport"
      data-coach-space={coachGutter >= 202 ? "wide" : "compact"}
    >
      <div
        className="mushaf-shell"
        data-stage-fit={stableStage && renderedInlineSize > 0 ? "ready" : "fallback"}
        data-fit-mode={zoomPercent === MUSHAF_ZOOM_FIT ? "true" : "false"}
        data-mobile-paper={mobilePresentation ? "true" : undefined}
        ref={frameRef}
        style={style}
        onScroll={updateViewportCenter}
      >
        <MushafViewportContext.Provider
          value={{ renderScale, stableStage, compactPages, compactPaper: mobilePresentation }}
        >
          {children}
        </MushafViewportContext.Provider>
      </div>
      {overlay}
    </div>
  );
}
