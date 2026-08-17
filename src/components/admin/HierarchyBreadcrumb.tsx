"use client";

import Link from "next/link";

type Props = {
  parentName: string;
  returnTo?: string | null;
  resetTo?: string;
};

export default function HierarchyBreadcrumb({ parentName, returnTo, resetTo }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {returnTo && (
        <Link
          href={returnTo}
          className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </Link>
      )}
      {resetTo && (
        <Link
          href={resetTo}
          className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset
        </Link>
      )}
      <p className="text-sm text-gray-600">
        Under <strong className="text-gray-900">{parentName}</strong>
      </p>
    </div>
  );
}
