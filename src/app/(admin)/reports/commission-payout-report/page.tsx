"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCommissionReport } from "@/hooks/useGames";
import { useAuth } from "@/hooks/useAuth";

const ROLE_HIERARCHY: Record<string, string[]> = {
  admin:             ["super_distributor", "distributor", "retailer"],
  super_distributor: ["distributor", "retailer"],
  distributor:       ["retailer"],
  retailer:          [],
};

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import { sortRowsByKey, type SortDir } from "@/lib/tableSort";

type ApiCommissionRow = {
  id: string;
  username: string;
  role: string;
  commission_rate: string | number;
  total_bet: string | number;
  commission_earned: string | number;
};

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function roleLabel(role: string) {
  switch (role) {
    case "super_distributor": return "Super Distributor";
    case "distributor": return "Distributor";
    case "retailer": return "Retailer";
    default: return role;
  }
}

export default function CommissionPayoutReportPage() {
  const { user } = useAuth();
  const allowedRoles = ROLE_HIERARCHY[user?.role ?? "admin"] ?? [];
  const [selectedRole, setSelectedRole] = useState<string>("");
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

  const { data, isLoading, error } = useCommissionReport();

  useEffect(() => { if (error) toast.error("Failed to load commission report"); }, [error]);

  const allRows: ApiCommissionRow[] = ((data?.data?.report ?? []) as ApiCommissionRow[])
    .filter((r) => allowedRoles.includes(r.role));

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((r) => {
      if (selectedRole && r.role !== selectedRole) return false;
      if (!q) return true;
      return (
        r.username.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        String(r.commission_rate).includes(q) ||
        String(r.commission_earned).includes(q)
      );
    });
  }, [allRows, searchQuery, selectedRole]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return sortRowsByKey(filteredRows, sortKey as keyof ApiCommissionRow, sortDir);
  }, [filteredRows, sortKey, sortDir]);

  const totalEntries = sortedRows.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  useEffect(() => { setCurrentPage(1); }, [entriesPerPage, searchQuery, selectedRole]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = sortedRows.slice(startIndex, endIndex);

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(endIndex, totalEntries);
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-sm font-semibold text-gray-800">Pending Commission</h1>
          <Link
            href="/reports/commission-payout-report/view"
            className="inline-flex items-center justify-center rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            View Commission Payout Report
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-700">Select Role :</label>
          <div className="max-w-xs">
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none">
              <option value="">--Select Role--</option>
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>Show</span>
            <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(parseInt(e.target.value, 10))} className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none">
              <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
            </select>
            <span>entries</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>Search:</span>
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-56 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                <SortableTh columnKey="no" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">No</SortableTh>
                <SortableTh columnKey="username" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Username</SortableTh>
                <SortableTh columnKey="role" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Role</SortableTh>
                <SortableTh columnKey="commission_rate" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Commission %</SortableTh>
                <SortableTh columnKey="total_bet" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Total Bet</SortableTh>
                <SortableTh columnKey="commission_earned" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Commission Earned</SortableTh>
                <th className="border border-gray-200 px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j} className="border border-gray-200 px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-200" /></td>)}</tr>
                ))
              ) : currentEntries.length === 0 ? (
                <tr><td colSpan={7} className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-600">No data available in table</td></tr>
              ) : (
                currentEntries.map((row, idx) => (
                  <tr key={row.id} className="text-gray-700">
                    <td className="border border-gray-200 px-3 py-3">{startIndex + idx + 1}</td>
                    <td className="border border-gray-200 px-3 py-3">{row.username}</td>
                    <td className="border border-gray-200 px-3 py-3">{roleLabel(row.role)}</td>
                    <td className="border border-gray-200 px-3 py-3">{formatNumber(Number(row.commission_rate))}%</td>
                    <td className="border border-gray-200 px-3 py-3">{formatNumber(Number(row.total_bet))}</td>
                    <td className="border border-gray-200 px-3 py-3">
                      {formatNumber(Number(row.commission_earned))}
                    </td>
                    <td className="border border-gray-200 px-3 py-3">
                      <Link
                        href={{
                          pathname: "/reports/commission-payout-report/edit",
                          query: {
                            username: row.username,
                            commission: String(row.commission_earned),
                          },
                        }}
                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Edit
                      </Link>
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
      </div>
    </section>
  );
}
