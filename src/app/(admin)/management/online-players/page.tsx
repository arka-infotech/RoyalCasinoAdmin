"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useOnlineUsersLive } from "@/hooks/useOnlineUsersLive";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import { sortRowsByKey, type SortDir } from "@/lib/tableSort";

type OnlinePlayerRow = {
  no: number;
  username: string;
  uniqueId: string;
  points: number;
  playPoints: number;
  winPoints: number;
  claimPoints: number;
  endPoints: number;
  netProfitPoints: number;
  isOnline: boolean;
  lastLogin: string;
};

type ApiOnlineUserRow = {
  id: string;
  username: string;
  unique_id?: string | null;
  chips?: string | number | null;
  commission_rate?: string | number | null;
  is_online?: boolean | null;
  last_login?: string | null;
  play_points?: string | number | null;
  win_points?: string | number | null;
  claimed_win_points?: string | number | null;
  unclaimed_win_points?: string | number | null;
  claim_points?: string | number | null;
  retailer_commission_amount?: string | number | null;
  distributor_commission_amount?: string | number | null;
  super_commission_amount?: string | number | null;
};

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN");
  } catch {
    return dateStr;
  }
}

function toNumber(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function OnlinePlayersPage() {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { users, isLoading, error } = useOnlineUsersLive();

  useEffect(() => {
    if (error) toast.error("Failed to load online players");
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

  const onlinePlayerRows = useMemo<OnlinePlayerRow[]>(() => {
    const apiUsers: ApiOnlineUserRow[] = users as ApiOnlineUserRow[];

    return apiUsers.map((user, index) => {
      const playPoints = toNumber(user.play_points);
      const claimedWinPoints = toNumber(user.claimed_win_points ?? user.claim_points);
      const unclaimedWinPoints = toNumber(user.unclaimed_win_points);
      const winPoints = claimedWinPoints + unclaimedWinPoints;
      const claimPoints = claimedWinPoints;
      const points = toNumber(user.chips);
      const endPoints = playPoints - winPoints;
      const retailerCommission = toNumber(user.retailer_commission_amount);
      const distributorCommission = toNumber(user.distributor_commission_amount);
      const superCommission = toNumber(user.super_commission_amount);
      const totalCommission = retailerCommission + distributorCommission + superCommission;
      const netProfitPoints = endPoints - totalCommission;

      return {
        no: index + 1,
        username: user.username,
        uniqueId: user.unique_id ?? "—",
        points,
        playPoints,
        winPoints,
        claimPoints,
        endPoints,
        netProfitPoints,
        isOnline: Boolean(user.is_online),
        lastLogin: formatDateTime(user.last_login),
      };
    });
  }, [users]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return onlinePlayerRows;

    return onlinePlayerRows.filter((r) => {
      return (
        r.username.toLowerCase().includes(q) ||
        r.uniqueId.toLowerCase().includes(q) ||
        String(r.points).includes(q) ||
        String(r.playPoints).includes(q) ||
        String(r.winPoints).includes(q) ||
        String(r.claimPoints).includes(q) ||
        String(r.endPoints).includes(q) ||
        String(r.netProfitPoints).includes(q) ||
        r.lastLogin.toLowerCase().includes(q) ||
        (r.isOnline ? "online" : "offline").includes(q)
      );
    });
  }, [searchQuery, onlinePlayerRows]);

  const onlineFilteredRows = useMemo(
    () => filteredRows.filter((row) => row.isOnline),
    [filteredRows]
  );

  const offlineFilteredRows = useMemo(
    () => filteredRows.filter((row) => !row.isOnline && row.playPoints > 0),
    [filteredRows]
  );

  const sortedOnlineRows = useMemo(() => {
    if (!sortKey) return onlineFilteredRows;
    return sortRowsByKey(onlineFilteredRows, sortKey as keyof OnlinePlayerRow, sortDir);
  }, [onlineFilteredRows, sortKey, sortDir]);

  const sortedOfflineRows = useMemo(() => {
    if (!sortKey) return offlineFilteredRows;
    return sortRowsByKey(offlineFilteredRows, sortKey as keyof OnlinePlayerRow, sortDir);
  }, [offlineFilteredRows, sortKey, sortDir]);

  const totalEntries = sortedOnlineRows.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [entriesPerPage, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = sortedOnlineRows.slice(startIndex, endIndex);

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(endIndex, totalEntries);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-3">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
          Online Players
        </h1>
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
              <SortableTh columnKey="username" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">User Name</SortableTh>
              <SortableTh columnKey="uniqueId" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Unique ID</SortableTh>
              <SortableTh columnKey="points" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Points</SortableTh>
              <SortableTh columnKey="playPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Play Points</SortableTh>
              <SortableTh columnKey="winPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Win Points</SortableTh>
              <SortableTh columnKey="claimPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Claim Points</SortableTh>
              <SortableTh columnKey="endPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">End Points</SortableTh>
              <SortableTh columnKey="netProfitPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Net Profit Points</SortableTh>
              <SortableTh columnKey="isOnline" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Is Online</SortableTh>
              <SortableTh columnKey="lastLogin" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Last Login</SortableTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`loading-${i}`}>
                  {Array.from({ length: 11 }).map((__, j) => (
                    <td key={`loading-cell-${j}`} className="border border-gray-200 px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : currentEntries.length === 0 ? (
              <tr>
                <td colSpan={11} className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-500">
                  No data available in table
                </td>
              </tr>
            ) : (
              currentEntries.map((row) => (
                <tr key={`${row.uniqueId}-${row.no}`} className="text-gray-700">
                  <td className="border border-gray-200 px-3 py-3">{row.no}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.username}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.uniqueId}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.points}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.playPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.winPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.claimPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.endPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.netProfitPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    <span className={`inline-flex min-w-[64px] justify-center rounded px-3 py-1 text-xs font-semibold text-white ${row.isOnline ? "bg-green-500" : "bg-rose-500"}`}>
                      {row.isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="border border-gray-200 px-3 py-3">{row.lastLogin}</td>
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

      <div className="mb-3 mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
          Offline Players (Played Today)
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              <SortableTh columnKey="no" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">No</SortableTh>
              <SortableTh columnKey="username" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">User Name</SortableTh>
              <SortableTh columnKey="uniqueId" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Unique ID</SortableTh>
              <SortableTh columnKey="points" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Points</SortableTh>
              <SortableTh columnKey="playPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Play Points</SortableTh>
              <SortableTh columnKey="winPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Win Points</SortableTh>
              <SortableTh columnKey="claimPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Claim Points</SortableTh>
              <SortableTh columnKey="endPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">End Points</SortableTh>
              <SortableTh columnKey="netProfitPoints" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Net Profit Points</SortableTh>
              <SortableTh columnKey="isOnline" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Is Online</SortableTh>
              <SortableTh columnKey="lastLogin" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Last Login</SortableTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`offline-loading-${i}`}>
                  {Array.from({ length: 11 }).map((__, j) => (
                    <td key={`offline-loading-cell-${j}`} className="border border-gray-200 px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedOfflineRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-500">
                  No offline players with play points today
                </td>
              </tr>
            ) : (
              sortedOfflineRows.map((row, index) => (
                <tr key={`offline-${row.uniqueId}-${row.no}`} className="text-gray-700">
                  <td className="border border-gray-200 px-3 py-3">{index + 1}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.username}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.uniqueId}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.points}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.playPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.winPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.claimPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.endPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.netProfitPoints}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    <span className="inline-flex min-w-[64px] justify-center rounded bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                      Offline
                    </span>
                  </td>
                  <td className="border border-gray-200 px-3 py-3">{row.lastLogin}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
