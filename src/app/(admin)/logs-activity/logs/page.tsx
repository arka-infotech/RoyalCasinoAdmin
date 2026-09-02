"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLogs } from "@/hooks/useGames";
import { useStableReportTotal } from "@/hooks/useStableReportTotal";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import { sortRowsByKey, type SortDir } from "@/lib/tableSort";

type ApiLog = {
  id: string;
  subject: string;
  url: string;
  method: string;
  ip: string | null;
  created_at: string;
  username: string;
};

function toISODateInputValue(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch { return dateStr; }
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-slate-100 text-slate-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-indigo-100 text-indigo-700",
  DELETE: "bg-rose-100 text-rose-700",
};

export default function LogsPage() {
  useRequireAdmin();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [entriesPerPage, setEntriesPerPage] = useState(50);
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

  useEffect(() => {
    setSelectedDate(toISODateInputValue(new Date()));
  }, []);

  const apiParams = useMemo(() => ({
    ...(selectedDate && { from_date: selectedDate, to_date: selectedDate }),
    ...(searchQuery.trim() && { search: searchQuery.trim() }),
    page: currentPage,
    limit: entriesPerPage,
  }), [selectedDate, searchQuery, currentPage, entriesPerPage]);

  const reportScopeKey = useMemo(
    () =>
      JSON.stringify({
        selectedDate,
        search: searchQuery.trim(),
        limit: entriesPerPage,
      }),
    [selectedDate, searchQuery, entriesPerPage]
  );

  const { data, isLoading, error, isPlaceholderData } = useLogs(apiParams);

  useEffect(() => { if (error) toast.error("Failed to load logs"); }, [error]);
  useEffect(() => { setCurrentPage(1); }, [entriesPerPage, searchQuery, selectedDate]);

  const rows: ApiLog[] = ((data?.data as unknown) as { logs?: ApiLog[] } | undefined)?.logs ?? [];
  const rawTotal = ((data?.data as unknown) as { total?: number } | undefined)?.total;
  const totalEntries = useStableReportTotal(rawTotal, reportScopeKey, !isPlaceholderData);
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  useEffect(() => {
    if (isPlaceholderData) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages, isPlaceholderData]);

  const showingFrom = totalEntries === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(currentPage * entriesPerPage, totalEntries);
  // sortKey/sortDir wired to headers for UI; server-side data is already paginated
  void sortKey; void sortDir; void sortRowsByKey;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-900">LOG ACTIVITIES</h1>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-700">Select Date :</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-2 h-9 rounded border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Show</span>
          <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(parseInt(e.target.value, 10))} className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none">
            <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
          </select>
          <span>entries</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Search:</span>
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 w-56 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none" />
        </label>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              <SortableTh columnKey="no" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">No</SortableTh>
              <SortableTh columnKey="username" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">UserName</SortableTh>
              <SortableTh columnKey="subject" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Subject</SortableTh>
              <SortableTh columnKey="url" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">URL</SortableTh>
              <SortableTh columnKey="method" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Method</SortableTh>
              <SortableTh columnKey="ip" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Ip</SortableTh>
              <SortableTh columnKey="created_at" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Created</SortableTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j} className="border border-gray-200 px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-200" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-500">No data available in table</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="text-gray-700">
                  <td className="border border-gray-200 px-3 py-3">{showingFrom + idx}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.username}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.subject}</td>
                  <td className="border border-gray-200 px-3 py-3 break-all text-green-600">{row.url}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${METHOD_COLORS[row.method] ?? "bg-gray-100 text-gray-700"}`}>{row.method}</span>
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-red-500">{row.ip || "-"}</td>
                  <td className="border border-gray-200 px-3 py-3">{formatDateTime(row.created_at)}</td>
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
