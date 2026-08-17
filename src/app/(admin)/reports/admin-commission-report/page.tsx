"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminCommissionReport } from "@/hooks/useGames";
import { useAuth } from "@/hooks/useAuth";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import { sortRowsByKey, type SortDir } from "@/lib/tableSort";

type QuickRangeKey =
  | "last6Months"
  | "currentMonth"
  | "lastMonth"
  | "lastWeek"
  | "currentWeek"
  | "yesterday"
  | "today"
  | "dateRange";

type AdminCommissionRow = {
  id: string;
  gameName: string;
  commissionAmount: number;
  totalBetPoint: number;
  totalWonPoint: number;
  createdDate: string;
};

type ApiAdminCommissionRow = {
  game_name: string | null;
  total_bet_point: string | number;
  total_won_point: string | number;
  commission_amount: string | number;
};

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatPillDate(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toISODateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Week starts Monday (matches most admin dashboards).
function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = (day + 6) % 7; // Mon->0, Tue->1, ... Sun->6
  const res = new Date(d);
  res.setDate(d.getDate() - diff);
  return startOfDay(res);
}

function toSqlDateTime(d: Date) {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

const quickRanges: Array<{ key: QuickRangeKey; label: string }> = [
  { key: "last6Months", label: "Last 6 Months" },
  { key: "currentMonth", label: "Current Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "lastWeek", label: "Last Week" },
  { key: "currentWeek", label: "Current Week" },
  { key: "yesterday", label: "Yesterday" },
  { key: "today", label: "Today" },
  { key: "dateRange", label: "Date Range" },
];

export default function AdminCommissionReportPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const [selectedRange, setSelectedRange] = useState<QuickRangeKey>("today");
  const [fromDate, setFromDate] = useState<string>(() => toISODateInputValue(new Date()));
  const [toDate, setToDate] = useState<string>(() => toISODateInputValue(new Date()));
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

  const now = useMemo(() => new Date(), []);

  const computedRange = useMemo(() => {
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    switch (selectedRange) {
      case "today":
        return { from: today, to: todayEnd };
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: endOfDay(y) };
      }
      case "currentWeek": {
        const from = startOfWeekMonday(now);
        return { from, to: todayEnd };
      }
      case "lastWeek": {
        const startThisWeek = startOfWeekMonday(now);
        const from = new Date(startThisWeek);
        from.setDate(from.getDate() - 7);
        const to = new Date(startThisWeek);
        to.setMilliseconds(to.getMilliseconds() - 1); // end of previous day
        return { from: startOfDay(from), to: endOfDay(to) };
      }
      case "currentMonth": {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: startOfDay(from), to: todayEnd };
      }
      case "lastMonth": {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0); // last day prev month
        return { from: startOfDay(from), to: endOfDay(to) };
      }
      case "last6Months": {
        // From first day of the month, 5 months ago, through today.
        const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return { from: startOfDay(from), to: todayEnd };
      }
      case "dateRange": {
        const from =
          fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)
            ? startOfDay(new Date(`${fromDate}T00:00:00`))
            : today;
        const to =
          toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate)
            ? endOfDay(new Date(`${toDate}T00:00:00`))
            : todayEnd;
        return { from, to };
      }
    }
  }, [fromDate, now, selectedRange, toDate]);

  const pillLabel = useMemo(() => {
    const fromLabel = formatPillDate(computedRange.from);
    const toLabel = formatPillDate(computedRange.to);
    if (fromLabel === toLabel) return fromLabel;
    return `${fromLabel} - ${toLabel}`;
  }, [computedRange.from, computedRange.to]);

  const apiParams = useMemo(
    () => ({
      from_date: toSqlDateTime(computedRange.from),
      to_date: toSqlDateTime(computedRange.to),
    }),
    [computedRange.from, computedRange.to]
  );

  const { data, isLoading, error } = useAdminCommissionReport(apiParams);

  useEffect(() => {
    if (error) toast.error("Failed to load admin commission report");
  }, [error]);

  const allRows = useMemo<AdminCommissionRow[]>(() => {
    const raw = (data?.data?.report ?? []) as ApiAdminCommissionRow[];
    return raw.map((r, index) => ({
      id: `${r.game_name ?? "unknown"}-${index}`,
      gameName: r.game_name ?? "Unknown",
      commissionAmount: Number(r.commission_amount) || 0,
      totalBetPoint: Number(r.total_bet_point) || 0,
      totalWonPoint: Number(r.total_won_point) || 0,
      createdDate: "",
    }));
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => {
      return (
        r.gameName.toLowerCase().includes(q) ||
        String(r.commissionAmount).includes(q) ||
        String(r.totalBetPoint).includes(q) ||
        String(r.totalWonPoint).includes(q)
      );
    });
  }, [allRows, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return sortRowsByKey(filteredRows, sortKey as keyof AdminCommissionRow, sortDir);
  }, [filteredRows, sortKey, sortDir]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.commission += r.commissionAmount;
        acc.bet += r.totalBetPoint;
        acc.won += r.totalWonPoint;
        return acc;
      },
      { commission: 0, bet: 0, won: 0 }
    );
  }, [filteredRows]);

  const totalEntries = sortedRows.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (effectiveCurrentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = sortedRows.slice(startIndex, endIndex);

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(endIndex, totalEntries);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2">
            <div className="w-full overflow-x-auto md:overflow-visible">
              <div className="inline-flex min-w-max flex-nowrap overflow-hidden rounded-md border border-gray-200 bg-white">
                {quickRanges.map((r) => {
                  const active = r.key === selectedRange;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        setSelectedRange(r.key);
                        setCurrentPage(1);
                      }}
                      className={`shrink-0 border-r border-gray-200 px-3 py-1.5 text-xs font-medium ${
                        active
                          ? "bg-teal-500 text-white"
                          : "bg-white text-teal-500 hover:bg-gray-50"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="inline-flex w-fit items-center rounded bg-green-500 px-3 py-1.5 text-xs font-semibold text-white">
              {pillLabel}
            </span>
          </div>

          {selectedRange === "dateRange" ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>
          ) : null}

          <div className="w-full overflow-x-auto">
            <div className="min-w-[520px] overflow-hidden rounded-md border border-gray-200 bg-gray-100">
              <div className="grid grid-cols-3 overflow-hidden rounded-md">
                <div className="bg-linear-to-r from-purple-600 to-indigo-500 px-4 py-2 text-center text-xs font-semibold text-white">
                  Total Commission Point
                </div>
                <div className="bg-linear-to-r from-rose-300 via-pink-500 to-rose-500 px-4 py-2 text-center text-xs font-semibold text-white">
                  Total Bet Point
                </div>
                <div className="bg-linear-to-r from-blue-600 to-blue-400 px-4 py-2 text-center text-xs font-semibold text-white">
                  Total Won Point
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px bg-gray-200">
                <div className="bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {formatNumber(totals.commission)}
                </div>
                <div className="bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {formatNumber(totals.bet)}
                </div>
                <div className="bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {formatNumber(totals.won)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-gray-800">
          Admin Commission Report
        </h2>

        <div className="mb-3 mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-56 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full border border-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                <th className="border border-gray-200 px-3 py-2">
                  No
                </th>
                <SortableTh
                  columnKey="gameName"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  Game Name
                </SortableTh>
                <SortableTh
                  columnKey="commissionAmount"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  Commission Amount
                </SortableTh>
                <SortableTh
                  columnKey="totalBetPoint"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  Total Bet Point
                </SortableTh>
                <SortableTh
                  columnKey="totalWonPoint"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  Total Won Point
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`loading-${i}`}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={`loading-cell-${j}`} className="border border-gray-200 px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : currentEntries.map((row, idx) => (
                <tr key={row.id} className="text-gray-700">
                  <td className="border border-gray-200 px-3 py-3">{startIndex + idx + 1}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    {row.gameName}
                  </td>
                  <td className="border border-gray-200 px-3 py-3">
                    {formatNumber(row.commissionAmount)}
                  </td>
                  <td className="border border-gray-200 px-3 py-3">
                    {formatNumber(row.totalBetPoint)}
                  </td>
                  <td className="border border-gray-200 px-3 py-3">
                    {formatNumber(row.totalWonPoint)}
                  </td>
                </tr>
              ))}
              {!isLoading && currentEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-500"
                  >
                    No data available in table
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <TablePaginationFooter
          showingFrom={showingFrom}
          showingTo={showingTo}
          totalEntries={totalEntries}
          currentPage={effectiveCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </section>
    </div>
  );
}
