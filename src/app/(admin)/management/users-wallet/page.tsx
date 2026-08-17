"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTransactionReport } from "@/hooks/useGames";
import { reportService } from "@/services/game.service";
import { useStableReportTotal } from "@/hooks/useStableReportTotal";
import { useRetailers } from "@/hooks/useUsers";
import type { User } from "@/types/user";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { useAuth } from "@/providers/AuthProvider";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { sortRowsByKey, type SortDir } from "@/lib/tableSort";

type ApiTx = {
  id: string;
  type: string;
  amount: string | number;
  balance_after: string | number;
  created_at: string;
  username: string;
};

const TRANSACTION_TYPES = [
  { label: "Bet", value: "bet" },
  { label: "Win", value: "win" },
  { label: "Added", value: "admin_add" },
  { label: "Adjusted", value: "admin_adjust" },
];

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-IN");
  } catch {
    return dateStr;
  }
}

export default function UsersWalletPage() {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";
  const [transactionType, setTransactionType] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isDeleteBusy, setIsDeleteBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ from: string; to: string; count: number; token: string } | null>(null);

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

  const apiParams = useMemo(() => ({
    ...(transactionType && { type: transactionType }),
    ...(userFilter && { user_id: userFilter }),
    ...(searchQuery.trim() && { search: searchQuery.trim() }),
    ...(fromDate && { from_date: fromDate }),
    ...(toDate && { to_date: toDate }),
    page: currentPage,
    limit: entriesPerPage,
  }), [transactionType, userFilter, searchQuery, fromDate, toDate, currentPage, entriesPerPage]);

  const reportScopeKey = useMemo(
    () =>
      JSON.stringify({
        transactionType,
        userFilter,
        search: searchQuery.trim(),
        fromDate,
        toDate,
        limit: entriesPerPage,
      }),
    [transactionType, userFilter, searchQuery, fromDate, toDate, entriesPerPage]
  );

  const { data, isLoading, error, refetch, isPlaceholderData } = useTransactionReport(apiParams);
  const { data: usersData } = useRetailers();
  const { socket } = useAdminSocket();

  useEffect(() => { if (error) toast.error("Failed to load transactions"); }, [error]);
  useEffect(() => { setCurrentPage(1); }, [entriesPerPage, searchQuery, transactionType, userFilter, fromDate, toDate]);

  // Refetch when game activity results in new transactions
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

  const rows: ApiTx[] = (data?.data as { transactions?: ApiTx[] } | undefined)?.transactions ?? [];
  const rawTotal = (data?.data as { total?: number } | undefined)?.total;
  const totalEntries = useStableReportTotal(rawTotal, reportScopeKey, !isPlaceholderData);
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));

  const userOptions: User[] = usersData?.data?.users ?? [];

  useEffect(() => {
    if (isPlaceholderData) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages, isPlaceholderData]);

  const showingFrom = totalEntries === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(currentPage * entriesPerPage, totalEntries);
  // sortKey/sortDir are wired to the SortableTh headers for future client-side sort
  void sortKey; void sortDir; void sortRowsByKey;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-3">
          <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
            Wallet
          </h1>
        </div>

        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="w-full max-w-xs">
            <label className="block text-xs font-semibold text-gray-700">
              Select Transaction Type :
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="mt-2 w-full rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">--Select Transaction Type--</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="w-full max-w-xs">
            <label className="block text-xs font-semibold text-gray-700">
              Filter :
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="mt-2 w-full rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">--Select User--</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                <SortableTh columnKey="no" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">No</SortableTh>
                <SortableTh columnKey="username" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Username</SortableTh>
                <SortableTh columnKey="openBalance" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Open Balance</SortableTh>
                <SortableTh columnKey="transactionAmount" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Transaction Amount</SortableTh>
                <SortableTh columnKey="newBalance" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">New Balance</SortableTh>
                <SortableTh columnKey="tranType" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Tran_Type</SortableTh>
                <SortableTh columnKey="tranTypeMessage" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Tran Type Message</SortableTh>
                <SortableTh columnKey="createdDate" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Created Date</SortableTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="border border-gray-200 px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-500">
                    No data available in table
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const amount = Number(row.amount);
                  const balanceAfter = Number(row.balance_after);
                  const openBalance = balanceAfter - amount;
                  const typeLabel = TRANSACTION_TYPES.find((t) => t.value === row.type)?.label ?? row.type;
                  return (
                    <tr key={row.id} className="text-gray-700">
                      <td className="border border-gray-200 px-3 py-3">{showingFrom + idx}</td>
                      <td className="border border-gray-200 px-3 py-3">{row.username}</td>
                      <td className="border border-gray-200 px-3 py-3">{openBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="border border-gray-200 px-3 py-3">
                        <span className={amount < 0 ? "text-rose-600" : "text-green-600"}>
                          {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-3 py-3">{balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="border border-gray-200 px-3 py-3">{row.type}</td>
                      <td className="border border-gray-200 px-3 py-3">{typeLabel}</td>
                      <td className="border border-gray-200 px-3 py-3">{formatDateTime(row.created_at)}</td>
                    </tr>
                  );
                })
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

      {isAdmin && <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-gray-800">
          Date Wise Player Wallet Data Delete
        </h2>

        <div className="mt-4 grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="flex items-center gap-3">
            <label className="w-16 text-sm text-gray-700">From</label>
            <div className="relative w-full">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                <CalendarIcon className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-16 text-sm text-gray-700">To</label>
            <div className="relative w-full">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                <CalendarIcon className="h-4 w-4" />
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isDeleteBusy}
            className="h-10 rounded bg-indigo-500 px-10 text-sm font-semibold text-white transition hover:bg-indigo-600"
            onClick={async () => {
              if (!fromDate || !toDate) {
                toast.error("From and To dates are required");
                return;
              }
              try {
                setIsDeleteBusy(true);
                const preview = await reportService.previewDeleteRange({
                  target: "wallet",
                  from: fromDate,
                  to: toDate,
                });
                const previewCount = Number(preview.data?.previewCount ?? 0);
                const token = String(preview.data?.confirmToken ?? "");
                if (previewCount <= 0) {
                  toast.info("No records found for selected range");
                  return;
                }
                setPendingDelete({ from: fromDate, to: toDate, count: previewCount, token });
                setConfirmOpen(true);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Delete failed");
              } finally {
                setIsDeleteBusy(false);
              }
            }}
          >
            {isDeleteBusy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>}

      {isAdmin && <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Wallet Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Delete ${pendingDelete.count} wallet records from ${pendingDelete.from} to ${pendingDelete.to}? This cannot be undone.`
                : "Are you sure you want to continue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleteBusy || !pendingDelete}
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                try {
                  setIsDeleteBusy(true);
                  const res = await reportService.confirmDeleteRange({
                    target: "wallet",
                    from: pendingDelete.from,
                    to: pendingDelete.to,
                    confirmToken: pendingDelete.token,
                  });
                  toast.success(res.data?.message ?? `Deleted ${res.data?.deletedCount ?? 0} records`);
                  await refetch();
                  setConfirmOpen(false);
                  setPendingDelete(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Delete failed");
                } finally {
                  setIsDeleteBusy(false);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isDeleteBusy ? "Deleting..." : "Delete Records"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
    </div>
  );
}
