"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { apiPath } from "@/lib/apiPath";
import { withoutHiddenGames } from "@/lib/hiddenGames";

type GameSettingRow = {
  gameId: string;
  displayName: string;
  category: string | null;
  winRatePct: number;
  updatedAt: string;
};

type WinState = Record<string, string>;

export default function WinPercentagePage() {
  useRequireAdmin();
  const [rows, setRows] = useState<GameSettingRow[]>([]);
  const [values, setValues] = useState<WinState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(apiPath("/api/admin/game-settings"), { cache: "no-store" });
        const json = (await res.json()) as {
          ok?: boolean;
          settings?: GameSettingRow[];
          error?: string;
        };
        if (!res.ok || !json.ok || !json.settings) {
          throw new Error(json.error || "Failed to load game settings");
        }
        if (!mounted) return;
        const settings = withoutHiddenGames(json.settings);
        setRows(settings);
        const next: WinState = {};
        for (const row of settings) {
          next[row.gameId] = String(row.winRatePct);
        }
        setValues(next);
      } catch (e) {
        if (!mounted) return;
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setField = (gameId: string, value: string) => {
    setValues((prev) => ({ ...prev, [gameId]: value }));
  };

  const onSave = async () => {
    const updates: Array<{ gameId: string; winRatePct: number }> = [];
    for (const row of rows) {
      const n = Number(values[row.gameId]);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        toast.error(`${row.displayName}: win rate must be between 0 and 100`);
        return;
      }
      updates.push({ gameId: row.gameId, winRatePct: n });
    }

    setSaving(true);
    try {
      const res = await fetch(apiPath("/api/admin/game-settings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Save failed");
      }
      toast.success("Win percentages updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">Game Win Percentage</h1>
      <p className="mt-2 text-sm text-gray-500">
        Set the win rate (0–100) used by the pot engine for each game. Changes apply
        immediately to new bets and round settlement.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="px-3 py-2 font-medium">Game</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Win rate (%)</th>
              <th className="px-3 py-2 font-medium">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.gameId} className="border-b last:border-0">
                <td className="px-3 py-3">
                  <div className="font-medium text-gray-900">{row.displayName}</div>
                  <div className="text-xs text-gray-400">{row.gameId}</div>
                </td>
                <td className="px-3 py-3 capitalize text-gray-600">
                  {row.category ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={values[row.gameId] ?? ""}
                    onChange={(e) => setField(row.gameId, e.target.value)}
                    disabled={loading || saving}
                    className="h-10 w-28 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                </td>
                <td className="px-3 py-3 text-gray-500">
                  {row.updatedAt
                    ? new Date(row.updatedAt).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onSave}
          disabled={loading || saving || rows.length === 0}
          className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {saving ? "Saving..." : "Save all"}
        </button>
        {loading ? <span className="text-sm text-gray-500">Loading...</span> : null}
      </div>
    </section>
  );
}
