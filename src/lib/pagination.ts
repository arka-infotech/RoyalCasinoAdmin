export type PaginationItem = number | "...";

/**
 * Compact page list: at most three numeric buttons (plus ellipses), always
 * includes first/last/current or immediate neighbours so long lists stay narrow
 * on small screens.
 */
export function buildPagination(currentPage: number, totalPages: number): PaginationItem[] {
  const last = Math.max(1, Math.floor(totalPages));
  if (last <= 1) return [1];
  if (last <= 3) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  const cur = Math.min(Math.max(Math.floor(currentPage), 1), last);
  const nums = new Set<number>([1, last, cur]);

  while (nums.size < 3 && nums.size < last) {
    if (cur > 1 && !nums.has(cur - 1)) {
      nums.add(cur - 1);
    } else if (cur < last && !nums.has(cur + 1)) {
      nums.add(cur + 1);
    } else {
      break;
    }
  }

  const sorted = [...nums].sort((a, b) => a - b);
  const out: PaginationItem[] = [];
  let prev: number | null = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) {
      out.push("...");
    }
    out.push(p);
    prev = p;
  }
  return out;
}
