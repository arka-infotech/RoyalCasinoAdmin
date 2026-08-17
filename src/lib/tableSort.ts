export type SortDir = "asc" | "desc";

export function compareForSort(a: unknown, b: unknown, dir: SortDir): number {
  const mult = dir === "asc" ? 1 : -1;
  if (a === b) return 0;
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1 * mult;
    if (Number.isNaN(b)) return -1 * mult;
    return (a - b) * mult;
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    if (a === b) return 0;
    return ((a ? 1 : 0) - (b ? 1 : 0)) * mult;
  }
  const sa = String(a ?? "");
  const sb = String(b ?? "");
  return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" }) * mult;
}

export function sortRowsByKey<T>(rows: T[], sortKey: keyof T, sortDir: SortDir): T[] {
  return [...rows].sort((a, b) => compareForSort(a[sortKey], b[sortKey], sortDir));
}
