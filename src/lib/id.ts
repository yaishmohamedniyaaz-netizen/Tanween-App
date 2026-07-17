let counter = 0;

/** Short unique id for mistakes. */
export function uid(prefix = "m"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
