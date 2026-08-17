"use client";

import { useRef } from "react";

/**
 * Keeps a stable `total` for server-paginated lists while React Query is showing
 * placeholder data or the response briefly omits `total`. Resets when `scopeKey`
 * changes (filters / page size — not current page).
 */
export function useStableReportTotal(
  rawTotal: number | undefined,
  scopeKey: string,
  snapshotReady: boolean
): number {
  const scopeRef = useRef(scopeKey);
  const lastRef = useRef(0);

  if (scopeRef.current !== scopeKey) {
    scopeRef.current = scopeKey;
    lastRef.current = 0;
  }

  if (!snapshotReady) {
    return lastRef.current;
  }

  if (typeof rawTotal === "number" && Number.isFinite(rawTotal) && rawTotal >= 0) {
    lastRef.current = rawTotal;
    return rawTotal;
  }

  return lastRef.current;
}
