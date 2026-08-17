"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useHierarchyStats } from "@/hooks/useUsers";
import { useGameStats } from "@/hooks/useGames";
import { useAdminSocket } from "@/hooks/useAdminSocket";

function StatCard({
  title,
  count,
  icon,
  onClick,
}: {
  title: string;
  count: number | string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-24 w-full items-center justify-between rounded-lg border border-[#d7e5ff] bg-white px-6 text-left transition hover:-translate-y-0.5 hover:border-[#2563eb] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
    >
      <div>
        <p className="text-[11px] font-semibold tracking-[0.15em] text-gray-500">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-[#2563eb]">{count}</p>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e5ff] text-[#2563eb]">
        {icon}
      </div>
    </button>
  );
}

function UsersIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11h3v4h-3a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function GameBetIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <ellipse cx="12" cy="8" rx="8" ry="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8v4c0 1.66 3.58 3 8 3s8-1.34 8-3V8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4" />
    </svg>
  );
}

const STAT_CONFIGS = [
  {
    key: "totalRetailers" as const,
    title: "RETAILERS",
    icon: <UsersIcon />,
  },
  {
    key: "totalChips" as const,
    title: "WALLET'S",
    icon: <WalletIcon />,
  },
  {
    key: "totalGameBet" as const,
    title: "GAME BET",
    icon: <GameBetIcon />,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, error } = useHierarchyStats();
  const { data: gameStatsData, refetch: refetchGameStats } = useGameStats();
  const [showError, setShowError] = useState(false);
  const { socket } = useAdminSocket();

  useEffect(() => {
    if (error) setShowError(true);
  }, [error]);

  // Refetch game stats whenever the backend signals a game history update
  useEffect(() => {
    const handleHistoryUpdated = () => {
      void refetchGameStats();
    };
    const handleLuckyStatus = () => {
      void refetchGameStats();
    };

    socket.on("res", (msg: { en: string }) => {
      if (msg.en === "ADMIN_GAME_HISTORY_UPDATED") handleHistoryUpdated();
      if (msg.en === "ADMIN_LUCKY_STATUS") handleLuckyStatus();
    });

    // Subscribe to both game types for live status
    socket.emit("admin_subscribe", { gameType: "LUCKY_CARD_12" });
    socket.emit("admin_subscribe", { gameType: "LUCKY_CARD_16" });
    socket.emit("admin_history_subscribe");

    return () => {
      socket.off("res");
      socket.emit("admin_unsubscribe", { gameType: "LUCKY_CARD_12" });
      socket.emit("admin_unsubscribe", { gameType: "LUCKY_CARD_16" });
      socket.emit("admin_history_unsubscribe");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const stats = data?.data ?? null;

  const totalGameBet =
    gameStatsData?.data?.stats?.reduce((sum, s) => {
      const value = Number((s as any)?.total_bets);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0) ?? 0;

  return (
    <section className="flex min-h-screen w-full flex-col bg-[#f5f7fb] px-6 pt-6">
      <h1 className="text-lg font-semibold text-gray-800 md:text-xl">Welcome to Dashboard</h1>

      {showError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load stats. Please refresh the page.
        </div>
      )}

      <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
            ))
          : STAT_CONFIGS.map((cfg) => (
              <StatCard
                key={cfg.key}
                title={cfg.title}
                count={
                  cfg.key === "totalChips"
                    ? Number((stats as any)?.totalChips ?? 0).toLocaleString()
                    : cfg.key === "totalGameBet"
                    ? totalGameBet.toLocaleString()
                    : (stats as any)?.[cfg.key] ?? 0
                }
                icon={cfg.icon}
                onClick={() => {
                  if (cfg.key === "totalRetailers") router.push("/management/retailer");
                  else if (cfg.key === "totalChips") router.push("/management/users-wallet");
                  else if (cfg.key === "totalGameBet") router.push("/game/game-history");
                }}
              />
            ))}
      </div>
    </section>
  );
}
