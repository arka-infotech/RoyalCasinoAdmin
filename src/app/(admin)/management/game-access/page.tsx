"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

type GameAccessRow = {
  gameId: string;
  displayName: string;
  category: string | null;
  enabled: boolean;
  minBet: number;
  maxBet: number;
};

type UserOption = { id: string; username: string; role: string };

export default function GameAccessPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userId, setUserId] = useState("");
  const [games, setGames] = useState<GameAccessRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get("/api/users", { params: { role: "retailer,user", limit: 500 } })
      .then((res) => {
        const list = (res.data?.data?.users ?? []) as UserOption[];
        setUsers(list);
        if (list[0]) setUserId(list[0].id);
      })
      .catch((e) => toast.error(e.message || "Failed to load users"));
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiClient
      .get(`/api/users/${userId}/games`)
      .then((res) => setGames(res.data?.data?.games ?? []))
      .catch((e) => toast.error(e.message || "Failed to load game access"))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggle = (gameId: string) => {
    setGames((prev) =>
      prev.map((g) => (g.gameId === gameId ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const enabledIds = games.filter((g) => g.enabled).map((g) => g.gameId);
      const disabledIds = games.filter((g) => !g.enabled).map((g) => g.gameId);

      if (enabledIds.length) {
        await apiClient.put(`/api/users/${userId}/games`, {
          gameIds: enabledIds,
          enabled: true,
        });
      }
      if (disabledIds.length) {
        await apiClient.put(`/api/users/${userId}/games`, {
          gameIds: disabledIds,
          enabled: false,
        });
      }
      toast.success("Game access saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Game Access</h1>
        <p className="text-sm text-muted-foreground">
          Provision which games a retailer / mobile user can play.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Player
          <select
            className="min-w-[240px] rounded border px-3 py-2"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.role})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={!userId || saving || loading}
          className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save access"}
        </button>
      </div>

      {loading ? (
        <p>Loading games...</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <label
              key={g.gameId}
              className="flex cursor-pointer items-center gap-3 rounded border p-3"
            >
              <input
                type="checkbox"
                checked={g.enabled}
                onChange={() => toggle(g.gameId)}
              />
              <span>
                <span className="block font-medium">{g.displayName}</span>
                <span className="text-xs text-muted-foreground">{g.gameId}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
