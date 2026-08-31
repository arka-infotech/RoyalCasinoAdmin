"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCommissionReport } from "@/hooks/useGames";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import { sortRowsByKey, type SortDir } from "@/lib/tableSort";

type CommissionPayoutReportRow = {
  no: number;
  username: string;
  role: string;
  commissionRate: number;
  totalBet: number;
  commissionEarned: number;
};

const ROLE_LABELS: Record<string, string> = {
  super_distributor: "Super Distributor",
  distributor: "Distributor",
  retailer: "Retailer",
  user: "User",
};

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function CommissionPayoutReportViewPage() {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, isLoading, error } = useCommissionReport();

  useEffect(() => {
    if (error) toast.error("Failed to load commission payout report");
  }, [error]);

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

  const rawRows = useMemo<CommissionPayoutReportRow[]>(() => {
    const report = (data?.data?.report ?? []) as Array<{
      username: string;
      role: string;
      commission_rate: string | number;
      total_bet: string | number;
      commission_earned: string | number;
    }>;

    return report.map((row, index) => ({
      no: index + 1,
      username: row.username,
      role: row.role,
      commissionRate: Number(row.commission_rate) || 0,
      totalBet: Number(row.total_bet) || 0,
      commissionEarned: Number(row.commission_earned) || 0,
    }));
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rawRows;
    return rawRows.filter((r) => {
      return (
        r.username.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        String(r.commissionRate).includes(q) ||
        String(r.totalBet).includes(q) ||
        String(r.commissionEarned).includes(q)
      );
    });
  }, [rawRows, searchQuery]);

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
                columnKey="commissionRate"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                COMMISSION %
              </SortableTh>
              <SortableTh
                columnKey="totalBet"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                TOTAL BET
              </SortableTh>
              <SortableTh
                columnKey="commissionEarned"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="border border-gray-200 px-3 py-2"
              >
                COMMISSION EARNED
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="border border-gray-200 px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : currentEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-600"
                >
                  No data available in table
                </td>
              </tr>
            ) : (
              currentEntries.map((row, idx) => (
                <tr key={`${row.username}-${row.role}`} className="text-gray-700">
                  <td className="border border-gray-200 px-3 py-3">{startIndex + idx + 1}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.username}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    {ROLE_LABELS[row.role] ?? row.role}
                  </td>
                  <td className="border border-gray-200 px-3 py-3">
                    {formatNumber(row.commissionRate)}%
                  </td>
                  <td className="border border-gray-200 px-3 py-3">{formatNumber(row.totalBet)}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    {formatNumber(row.commissionEarned)}
                  </td>
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
