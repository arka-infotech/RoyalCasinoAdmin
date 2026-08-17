"use client";

import { useMemo } from "react";
import { buildPagination } from "@/lib/pagination";

export type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const mid =
  "min-h-9 min-w-9 shrink-0 border-y border-l border-gray-300 px-2 py-1.5 text-center text-xs tabular-nums sm:min-w-10 sm:px-3 sm:text-sm";

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const pageItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center sm:inline-flex sm:flex-nowrap sm:justify-end">
      <button
        type="button"
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className={`rounded-l border border-gray-300 bg-gray-100 px-2 py-1.5 text-xs text-gray-500 disabled:opacity-60 sm:px-3 sm:text-sm`}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        <span className="sm:hidden">Prev</span>
        <span className="hidden sm:inline">Previous</span>
      </button>
      {pageItems.map((item, idx) =>
        item === "..." ? (
          <span
            key={`dots-${idx}`}
            className={`${mid} select-none bg-white text-gray-500`}
            aria-hidden
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={
              item === currentPage
                ? `${mid} border-indigo-500 bg-indigo-500 text-white`
                : `${mid} bg-white text-indigo-600 hover:bg-gray-50`
            }
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        className={`rounded-r border border-gray-300 bg-gray-100 px-2 py-1.5 text-xs text-gray-500 disabled:opacity-60 sm:px-3 sm:text-sm`}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        Next
      </button>
    </div>
  );
}
