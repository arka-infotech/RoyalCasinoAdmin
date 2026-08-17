"use client";

import type { ReactNode } from "react";

import type { SortDir } from "@/lib/tableSort";

export type SortGlyphDirection = SortDir | null;

export function SortGlyph({ direction }: { direction: SortGlyphDirection }) {
  return (
    <span className="inline-flex shrink-0 flex-col leading-none text-[10px]" aria-hidden>
      <span
        className={`-mb-0.5 ${direction === "asc" ? "text-gray-800" : "text-gray-400"}`}
      >
        ▲
      </span>
      <span className={direction === "desc" ? "text-gray-800" : "text-gray-400"}>▼</span>
    </span>
  );
}

type SortableThProps = {
  columnKey: string;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
  buttonClassName?: string;
  children: ReactNode;
};

export function SortableTh({
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className = "border border-gray-200 px-3 py-2",
  buttonClassName = "inline-flex w-full cursor-pointer items-center gap-2 rounded-none border-0 bg-transparent p-0 text-left text-inherit font-inherit tracking-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-0",
  children,
}: SortableThProps) {
  const active: SortGlyphDirection = sortKey === columnKey ? sortDir : null;
  return (
    <th scope="col" className={className}>
      <button type="button" className={buttonClassName} onClick={() => onSort(columnKey)}>
        {children}
        <SortGlyph direction={active} />
      </button>
    </th>
  );
}
