import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  computeMushafFitInlineSize,
  computeMushafRenderedInlineSize,
  STABLE_MUSHAF_STAGE_QUERY,
  type MushafPageLayout,
} from "../lib/mushafFit";

interface MushafViewportProps {
  children: ReactNode;
  layout: MushafPageLayout;
  zoomPercent: number;
}

type MushafViewportStyle = CSSProperties & {
  "--page-zoom": number;
  "--mushaf-render-inline-size"?: string;
};

function stableStageMatches(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia(STABLE_MUSHAF_STAGE_QUERY).matches;
}

export function MushafViewport({
  children,
  layout,
  zoomPercent,
}: MushafViewportProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [stableStage, setStableStage] = useState(stableStageMatches);
  const [fitInlineSize, setFitInlineSize] = useState(0);

  useEffect(() => {
    const media = window.matchMedia(STABLE_MUSHAF_STAGE_QUERY);
    const update = () => {
      setStableStage(media.matches);
      if (!media.matches) setFitInlineSize(0);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !stableStage) return;

    let animationFrame = 0;
    const measure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const next = computeMushafFitInlineSize({
          frameInlineSize: frame.clientWidth,
          frameBlockSize: frame.clientHeight,
          layout,
        });
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
  }, [layout, stableStage]);

  const renderedInlineSize = computeMushafRenderedInlineSize(
    fitInlineSize,
    zoomPercent,
  );
  const style: MushafViewportStyle = {
    "--page-zoom": zoomPercent / 100,
    ...(renderedInlineSize > 0
      ? { "--mushaf-render-inline-size": `${renderedInlineSize}px` }
      : {}),
  };

  return (
    <div
      className="mushaf-shell"
      data-stage-fit={stableStage && renderedInlineSize > 0 ? "ready" : "fallback"}
      ref={frameRef}
      style={style}
    >
      {children}
    </div>
  );
}
