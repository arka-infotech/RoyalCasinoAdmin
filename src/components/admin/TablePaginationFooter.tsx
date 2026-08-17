"use client";

import { PaginationControls } from "@/components/admin/PaginationControls";

export type TablePaginationFooterProps = {
  showingFrom: number;
  showingTo: number;
  totalEntries: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Top spacing above the footer row (override when a section needs tighter spacing). */
  className?: string;
};

/**
 * Single layout + copy for table footers: “Showing X to Y of Z entries” and pager.
 */
export function TablePaginationFooter({
  showingFrom,
  showingTo,
  totalEntries,
  currentPage,
  totalPages,
  onPageChange,
  className = "mt-4",
}: TablePaginationFooterProps) {
  return (
    <div
      className={`${className} flex w-full min-w-0 flex-col gap-3 text-sm text-gray-700 md:flex-row md:items-center md:justify-between`}
    >
      <p className="min-w-0 shrink">
        Showing {showingFrom} to {showingTo} of {totalEntries.toLocaleString()} entries
      </p>
      {totalEntries > 0 ? (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );
}
