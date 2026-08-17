"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTransactionReport } from "@/hooks/useGames";
import { useAuth } from "@/hooks/useAuth";
import { useStableReportTotal } from "@/hooks/useStableReportTotal";
import { useAdminSocket } from "@/hooks/useAdminSocket";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import { type SortDir } from "@/lib/tableSort";

type ApiTx = {
  id: string;
  type: string;
  amount: string | number;
  balance_after: string | number;
  created_at: string;
  username: string;
};

type QuickRangeKey =
  | "last6Months"
  | "currentMonth"
  | "lastMonth"
  | "lastWeek"
  | "currentWeek"
  | "yesterday"
  | "today"
  | "dateRange";

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

// Types where admin receives money (credit to admin)
const CREDIT_TYPES = new Set(["transfer", "bet"]);

function getDescription(type: string, username: string): string {
  switch (type) {
    case "adjust": return `Adjust Admin to user (${username})`;
    case "transfer": return `transfer user to admin (${username})`;
    case "bet": return `Bet (${username})`;
    case "win": return `Win (${username})`;
    case "claim": return `Claim (${username})`;
    case "claim_all": return `Claim All (${username})`;
    case "claim_ticket": return `Claim Ticket (${username})`;
    case "admin_add": return `Admin Add (${username})`;
    case "admin_adjust": return `Admin Adjust (${username})`;
    default: return `${type} (${username})`;
  }
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfWeekMonday(d: Date) {
  const diff = (d.getDay() + 6) % 7;
  const res = new Date(d);
  res.setDate(d.getDate() - diff);
  return startOfDay(res);
}

function toISO(d: Date) {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function toISODateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPillDate(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

const TRANSACTION_TYPES = [
  "bet", "win", "claim", "claim_all", "claim_ticket",
  "adjust", "transfer", "admin_add", "admin_adjust",
];

export default function TransactionReportPage() {
  const now = useMemo(() => new Date(), []);

  const [selectedRange, setSelectedRange] = useState<QuickRangeKey>("today");
  const [fromDate, setFromDate] = useState<string>(() => toISODateInputValue(new Date()));
  const [toDate, setToDate] = useState<string>(() => toISODateInputValue(new Date()));
  const [transactionType, setTransactionType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
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
    const todayISO = toISODateInputValue(now);
    setFromDate((v) => (v ? v : todayISO));
    setToDate((v) => (v ? v : todayISO));
  }, [now]);

  const computedRange = useMemo(() => {
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    switch (selectedRange) {
      case "today": return { from: today, to: todayEnd };
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: endOfDay(y) };
      }
      case "currentWeek": return { from: startOfWeekMonday(now), to: todayEnd };
      case "lastWeek": {
        const startThisWeek = startOfWeekMonday(now);
        const from = new Date(startThisWeek);
        from.setDate(from.getDate() - 7);
        const to = new Date(startThisWeek);
        to.setMilliseconds(to.getMilliseconds() - 1);
        return { from: startOfDay(from), to: endOfDay(to) };
      }
      case "currentMonth": {
        return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: todayEnd };
      }
      case "lastMonth": {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: startOfDay(from), to: endOfDay(to) };
      }
      case "last6Months": {
        return { from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to: todayEnd };
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
    return fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`;
  }, [computedRange.from, computedRange.to]);

  const apiParams = useMemo(() => ({
    from_date: toISO(computedRange.from),
    to_date: toISO(computedRange.to),
    ...(transactionType && { type: transactionType }),
    ...(searchQuery.trim() && { search: searchQuery.trim() }),
    page: currentPage,
    limit: entriesPerPage,
  }), [computedRange.from, computedRange.to, transactionType, searchQuery, currentPage, entriesPerPage]);

  const reportScopeKey = useMemo(
    () =>
      JSON.stringify({
        from: toISO(computedRange.from),
        to: toISO(computedRange.to),
        transactionType,
        search: searchQuery.trim(),
        limit: entriesPerPage,
        selectedRange,
      }),
    [
      computedRange.from,
      computedRange.to,
      transactionType,
      searchQuery,
      entriesPerPage,
      selectedRange,
    ]
  );

  const { data, isLoading, error, refetch, isPlaceholderData } = useTransactionReport(apiParams);
  const { socket } = useAdminSocket();

  useEffect(() => { if (error) toast.error("Failed to load transactions"); }, [error]);
  useEffect(() => { setCurrentPage(1); }, [entriesPerPage, searchQuery, transactionType, selectedRange]);

  // Refetch when a game round completes, as it generates new transactions
  useEffect(() => {
    const handler = (msg: { en: string }) => {
      if (msg.en === "ADMIN_GAME_HISTORY_UPDATED") void refetch();
    };
    socket.on("res", handler);
    socket.emit("admin_history_subscribe");
    return () => {
      socket.off("res", handler);
      socket.emit("admin_history_unsubscribe");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const rows: ApiTx[] = ((data?.data as unknown) as { transactions?: ApiTx[] } | undefined)?.transactions ?? [];
  const rawTotal = ((data?.data as unknown) as { total?: number } | undefined)?.total;
  const totalEntries = useStableReportTotal(rawTotal, reportScopeKey, !isPlaceholderData);
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  useEffect(() => {
    if (isPlaceholderData) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages, isPlaceholderData]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const amt = Number(r.amount);
        if (CREDIT_TYPES.has(r.type)) acc.credit += amt;
        else acc.debit += amt;
        return acc;
      },
      { credit: 0, debit: 0 }
    );
  }, [rows]);

  const showingFrom = totalEntries === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(currentPage * entriesPerPage, totalEntries);
  // sortKey/sortDir wired to headers for UI indicator; data is server-paginated
  void sortKey; void sortDir;

  return (
    <div className="space-y-4">
      {/* Date Range Section */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap overflow-hidden rounded-md border border-gray-200 bg-white">
              {quickRanges.map((r) => {
                const active = r.key === selectedRange;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRange(r.key)}
                    className={`border-r border-gray-200 px-3 py-1.5 text-xs font-medium ${
                      active ? "bg-teal-500 text-white" : "bg-white text-teal-500 hover:bg-gray-50"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <span className="inline-flex items-center rounded bg-green-500 px-3 py-1.5 text-xs font-semibold text-white">
              {pillLabel}
            </span>
          </div>

          {selectedRange === "dateRange" && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Table Section */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Transaction Report</h1>

        {/* Filters */}
        <div className="mt-4">
          <div className="text-sm text-gray-800"><span className="font-medium">Filter :</span></div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none sm:w-56"
            >
              <option value="">--Select Transaction Type--</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Show / Search */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => { setEntriesPerPage(parseInt(e.target.value, 10)); }}
              className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
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
              className="h-8 w-56 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>

        {/* Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                <SortableTh columnKey="no" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2 whitespace-nowrap">No</SortableTh>
                <SortableTh columnKey="username" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2 whitespace-nowrap">Name</SortableTh>
                <SortableTh columnKey="credit" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2 whitespace-nowrap">Credit</SortableTh>
                <SortableTh columnKey="debit" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2 whitespace-nowrap">Debit</SortableTh>
                <SortableTh columnKey="balance_after" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2 whitespace-nowrap">Balance After</SortableTh>
                <SortableTh columnKey="type" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2 whitespace-nowrap">Description</SortableTh>
                <SortableTh columnKey="created_at" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2 whitespace-nowrap">Created Date</SortableTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="border border-gray-200 px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-500">
                    No data available in table
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((row, idx) => {
                    const amt = Number(row.amount);
                    const isCredit = CREDIT_TYPES.has(row.type);
                    return (
                      <tr key={row.id} className="text-gray-700 hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2.5">{showingFrom + idx}</td>
                        <td className="border border-gray-200 px-3 py-2.5 font-medium">{row.username}</td>
                        <td className="border border-gray-200 px-3 py-2.5 text-green-700">
                          {isCredit ? amt.toLocaleString("en-IN") : "0"}
                        </td>
                        <td className="border border-gray-200 px-3 py-2.5 text-rose-700">
                          {!isCredit ? amt.toLocaleString("en-IN") : "0"}
                        </td>
                        <td className="border border-gray-200 px-3 py-2.5">
                          {Number(row.balance_after).toLocaleString("en-IN")}
                        </td>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-600">
                          {getDescription(row.type, row.username)}
                        </td>
                        <td className="border border-gray-200 px-3 py-2.5 whitespace-nowrap">
                          {formatDateTime(row.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-gray-50 font-semibold text-gray-800">
                    <td className="border border-gray-200 px-3 py-2.5" />
                    <td className="border border-gray-200 px-3 py-2.5 text-right">Total:</td>
                    <td className="border border-gray-200 px-3 py-2.5 text-green-700">
                      ₹{totals.credit.toLocaleString("en-IN")}{" "}
                      <span className="font-normal text-gray-500">
                        (₹{totals.credit.toLocaleString("en-IN")} total)
                      </span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-rose-700">
                      ₹{totals.debit.toLocaleString("en-IN")}{" "}
                      <span className="font-normal text-gray-500">
                        (₹{totals.debit.toLocaleString("en-IN")} total)
                      </span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5" />
                    <td className="border border-gray-200 px-3 py-2.5" />
                    <td className="border border-gray-200 px-3 py-2.5" />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePaginationFooter
          showingFrom={showingFrom}
          showingTo={showingTo}
          totalEntries={totalEntries}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </section>
    </div>
  );
}
