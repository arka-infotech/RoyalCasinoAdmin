"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import { sortRowsByKey, type SortDir } from "@/lib/tableSort";

type CommissionPayoutReportRow = {
  no: number;
  username: string;
  role: "Super Distributor" | "Distributor" | "Retailer";
  oldCommission: number;
  amount: number;
  newCommission: number;
  createdAt: string;
};

const demoRows: CommissionPayoutReportRow[] = [];

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function CommissionPayoutReportViewPage() {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const requestSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    },
    [sortKey]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return demoRows.filter((r) => {
      if (!q) return true;
      return (
        String(r.no).includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        String(r.oldCommission).includes(q) ||
        String(r.amount).includes(q) ||
        String(r.newCommission).includes(q) ||
        r.createdAt.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return sortRowsByKey(filteredRows, sortKey as keyof CommissionPayoutReportRow, sortDir);
  }, [filteredRows, sortKey, sortDir]);

  const totalEntries = sortedRows.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [entriesPerPage, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = sortedRows.slice(startIndex, endIndex);

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(endIndex, totalEntries);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-800">Commission Payout Report</h1>
      </div>

      <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(parseInt(e.target.value, 10))}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>entries</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Search:</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              <SortableTh
                columnKey="no"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                NO
              </SortableTh>
              <SortableTh
                columnKey="username"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                USERNAME
              </SortableTh>
              <SortableTh
                columnKey="role"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                ROLE
              </SortableTh>
              <SortableTh
                columnKey="oldCommission"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                OLD COMMISSION
              </SortableTh>
              <SortableTh
                columnKey="amount"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                AMOUNT
              </SortableTh>
              <SortableTh
                columnKey="newCommission"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                NEW COMMISSION
              </SortableTh>
              <SortableTh
                columnKey="createdAt"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                CREATED
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {currentEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-600"
                >
                  No data available in table
                </td>
              </tr>
            ) : (
              currentEntries.map((row) => (
                <tr key={`${row.no}-${row.username}-${row.createdAt}`} className="text-gray-700">
                  <td className="border border-gray-200 px-3 py-3">{row.no}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.username}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.role}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    {formatNumber(row.oldCommission)}
                  </td>
                  <td className="border border-gray-200 px-3 py-3">{formatNumber(row.amount)}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    {formatNumber(row.newCommission)}
                  </td>
                  <td className="border border-gray-200 px-3 py-3">{row.createdAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePaginationFooter
        showingFrom={showingFrom}
        showingTo={showingTo}
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </section>
  );
}

