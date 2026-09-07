/** Compact, directly selectable result pages with non-interactive gaps. */
export function resultPageItems(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({length:total}, (_, i) => i + 1);
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter(p => p >= 1 && p <= total).sort((a,b) => a-b);
  const items: Array<number | "gap"> = [];
  for (const page of pages) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      if (page - previous === 2) items.push(previous + 1);
      else items.push("gap");
    }
    items.push(page);
  }
  return items;
}

/** Indices into the verified passage only; never extends the saved range. */
export function evidencePageWindow(index: number, count: number, spread: boolean) {
  const size = spread ? 2 : 1;
  const start = Math.floor(Math.max(0, Math.min(index, count - 1)) / size) * size;
  return {start, end:Math.min(count, start + size), size};
}
