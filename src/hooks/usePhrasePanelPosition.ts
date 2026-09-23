import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

/** Position the overlay without feeding its dimensions into the page-fit calculation. */
export function usePhrasePanelPosition(open: boolean, trigger: RefObject<HTMLElement>) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const place = () => {
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
      const rightEdge = leftEdge + (viewport?.width ?? innerWidth) - 16;
      const bottomEdge = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - 8;
      const header = document.querySelector(".app-header")?.getBoundingClientRect();
      const anchor = trigger.current?.getBoundingClientRect();
      const workspace = document.querySelector(".stage")?.getBoundingClientRect();
      let top = Math.max((viewport?.offsetTop ?? 0) + 8, (header?.bottom ?? 0) + 8);
      let bottom = bottomEdge;
      const workspaceLeft = Math.max(leftEdge, workspace?.left ?? leftEdge);
      const workspaceRight = Math.min(rightEdge, workspace?.right ?? rightEdge);
      const width = Math.min(380, workspaceRight - workspaceLeft);
      const left = rightEdge - leftEdge <= 584 ? (leftEdge + rightEdge - width) / 2
        : Math.max(workspaceLeft, Math.min((anchor?.right ?? workspaceRight) - width, workspaceRight - width));
      // Desktop navigation is above the page; on phones it can be below it.
      // Keep both navigation and the judge deck outside the panel's usable space.
      for (const element of document.querySelectorAll(".mushaf-shared-nav, .page-nav, .mobile-judge-deck")) {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.right <= left || rect.left >= left + width ||
            rect.bottom <= top || rect.top >= bottom) continue;
        if (!element.matches(".mobile-judge-deck") && rect.top - top < Math.min(360, bottom - rect.bottom)) top = rect.bottom + 8;
        else bottom = Math.min(bottom, rect.top - 8);
      }
      setStyle({ visibility: "visible", position: "fixed", width, left, top,
        maxHeight: Math.max(0, Math.min(640, bottom - top)) });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    place();
    const observer = new ResizeObserver(schedule);
    for (const element of document.querySelectorAll(".app-header, .mushaf-shared-nav, .page-nav, .mobile-judge-deck")) observer.observe(element);
    // Page controls can mount after artwork loading without resizing the header.
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.querySelector(".stage") ?? document.body, {childList: true, subtree: true});
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); mutations.disconnect();
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [open, trigger]);
  return style;
}
