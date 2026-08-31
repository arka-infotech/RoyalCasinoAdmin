"use client";

import { useMemo, useState } from "react";

import {
  ADMIN_GAME_HISTORY_GAME_TYPES,
  ADMIN_GAME_HISTORY_LABELS,
  formatAdminGameHistoryGameType,
  useAdminGameHistorySocket,
  type AdminGameHistoryFilter,
  type AdminGameHistoryRow,
} from "@/lib/luckyGameAdmin";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusBadgeClass(status: AdminGameHistoryRow["status"]): string {
  switch (status) {
    case "win":
    case "claimed":
      return "bg-emerald-100 text-emerald-700";
    case "not claim":
      return "bg-amber-100 text-amber-700";
    case "Not Result Declare":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-red-100 text-red-700";
  }
}

export default function GameHistoryPage() {
  useRequireAdmin();
  const [fromDate, setFromDate] = useState(todayIsoDate());
  const [toDate, setToDate] = useState(todayIsoDate());
  const [gameType, setGameType] = useState<AdminGameHistoryFilter>("ALL");
  const [rows, setRows] = useState<AdminGameHistoryRow[]>([]);

  const fromISO = useMemo(() => new Date(`${fromDate}T00:00:00.000`).toISOString(), [fromDate]);
  const toISO = useMemo(() => new Date(`${toDate}T23:59:59.999`).toISOString(), [toDate]);

  const { connected } = useAdminGameHistorySocket({
    gameType,
    fromISO,
    toISO,
    take: 200,
    onRows: setRows,
  });

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Game History</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live bet history across all players for every implemented Royal Casino game.
          </p>
        </div>
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            connected ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              connected ? "bg-emerald-500" : "bg-gray-400",
            ].join(" ")}
          />
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          From
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          To
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Game
          <select
            value={gameType}
            onChange={(e) => setGameType(e.target.value as AdminGameHistoryFilter)}
            className="h-10 min-w-[180px] rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="ALL">All games</option>
            {ADMIN_GAME_HISTORY_GAME_TYPES.map((type) => (
              <option key={type} value={type}>
                {ADMIN_GAME_HISTORY_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Game</th>
              <th className="px-3 py-2 font-medium">Ticket</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2 text-right font-medium">Play</th>
              <th className="px-3 py-2 text-right font-medium">Won</th>
              <th className="px-3 py-2 text-right font-medium">Net</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ticket_id ?? `${row.created_at}-${row.username}`} className="border-b last:border-0">
                <td className="px-3 py-3 whitespace-nowrap text-gray-500">
                  {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-3 font-medium text-gray-900">{row.username}</td>
                <td className="px-3 py-3 text-gray-600">
                  {formatAdminGameHistoryGameType(row.game_type)}
                </td>
                <td className="px-3 py-3 text-gray-500">{row.ticket_id ?? "—"}</td>
                <td className="px-3 py-3 text-gray-600">{row.result_card ?? "—"}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-900">{row.play_point.toFixed(2)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-900">{row.won_point.toFixed(2)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-900">{row.end_point.toFixed(2)}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                  No bets in this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
