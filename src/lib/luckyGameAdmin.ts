"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

import { normalizeGameServerBaseUrl } from "@/lib/gameServerBaseUrl";
import { withGameServerBasePath } from "@/lib/gameServerBasePath";

/** Admin UI suit → backend single-letter suit (see sai-lucky-backend game.config.js). */
export type UiSuit = "heart" | "spade" | "diamond" | "club";

export type LuckyGameVariant = "12" | "16";

export const LUCKY_GAME_TYPE: Record<LuckyGameVariant, string> = {
  "12": "LUCKY_CARD_12",
  "16": "LUCKY_CARD_16",
};

const SUIT_TO_BACKEND: Record<UiSuit, string> = {
  club: "c",
  diamond: "f",
  spade: "k",
  heart: "l",
};

const RANK_TO_BACKEND_12: Record<string, string> = {
  J: "11",
  Q: "12",
  K: "13",
};

const RANK_TO_BACKEND_16: Record<string, string> = {
  J: "11",
  Q: "12",
  K: "13",
  A: "14",
};

export function selectionKeyToWinCard(
  key: string,
  variant: LuckyGameVariant,
): string | null {
  const [suit, rank] = key.split("-") as [UiSuit, string];
  const bs = SUIT_TO_BACKEND[suit];
  const rankMap = variant === "12" ? RANK_TO_BACKEND_12 : RANK_TO_BACKEND_16;
  const br = rankMap[rank];
  if (!bs || !br) return null;
  return `${bs}-${br}`;
}

const BACKEND_SUIT_TO_UI: Record<string, UiSuit> = {
  c: "club",
  f: "diamond",
  k: "spade",
  l: "heart",
};

/** Parse `win_result|reward` history line from the game server. */
export function parseHistoryEntry(entry: string): {
  suit: UiSuit;
  rankLabel: string;
  multiplierLabel: string;
} | null {
  const [cardPart, multRaw] = entry.split("|");
  if (!cardPart || !cardPart.includes("-")) return null;
  const [bs, br] = cardPart.split("-");
  const suit = BACKEND_SUIT_TO_UI[bs];
  if (!suit) return null;
  let rankLabel: string;
  switch (br) {
    case "11":
      rankLabel = "J";
      break;
    case "12":
      rankLabel = "Q";
      break;
    case "13":
      rankLabel = "K";
      break;
    case "14":
      rankLabel = "A";
      break;
    default:
      return null;
  }
  const m = multRaw != null && multRaw !== "" ? String(multRaw) : "0";
  return { suit, rankLabel, multiplierLabel: `${m}X` };
}

const UI_SUITS: UiSuit[] = ["heart", "spade", "diamond", "club"];

/**
 * Maps backend `bet_totals_by_key` (e.g. k-13 → spade King) into the admin grid.
 * Only individual card keys are read; row/column keys (All_*) are ignored here.
 */
export function betTotalsToBoardValues(
  totals: Record<string, number> | undefined,
  variant: LuckyGameVariant,
): Record<string, Record<UiSuit, number>> {
  const ranks =
    variant === "12" ? (["K", "Q", "J"] as const) : (["A", "K", "Q", "J"] as const);
  const rankMap = variant === "12" ? RANK_TO_BACKEND_12 : RANK_TO_BACKEND_16;

  const board: Record<string, Record<UiSuit, number>> = {};
  for (const rank of ranks) {
    board[rank] = { heart: 0, spade: 0, diamond: 0, club: 0 };
  }
  if (!totals) return board;

  for (const suit of UI_SUITS) {
    const bs = SUIT_TO_BACKEND[suit];
    for (const rank of ranks) {
      const br = rankMap[rank];
      if (!br) continue;
      const key = `${bs}-${br}`;
      if (Object.prototype.hasOwnProperty.call(totals, key)) {
        board[rank][suit] = totals[key];
      }
    }
  }
  return board;
}

export type GameRoundSnapshot = {
  id: string;
  state: string | null;
  win_result: string | null;
  reward: string | null;
  started_at: string | null;
  pot_accounted: boolean;
  pot_day_key: string | null;
  pot_collected_added: number | null;
  pot_consumed_added: number | null;
};

export type DailyPotSnapshot = {
  day_key: string;
  collected_pot: number;
  consumed_payout: number;
  game_balance: number;
  win_rate_pct: number;
  available_for_round_display: number;
};

export type LuckyGameStatusOk = {
  ok: true;
  gameType: string;
  round_id: string | null;
  phase: string;
  timer_seconds: number;
  game_state: string;
  last_win_cards: string[];
  win_card: string | null;
  reward: string;
  /** Sum of amounts per `bet_details` key for all players in the current round */
  bet_totals_by_key?: Record<string, number>;
  /** Sum of each player’s `total_bet` for the round (table collection) */
  round_stake_total?: number;
  bet_limits?: { min_per_play: number; max_per_play: number };
  game_round?: GameRoundSnapshot | null;
  daily_pot?: DailyPotSnapshot | null;
  pending_manual?: { win_card: string; reward: string } | null;
};

/** Header text for the live timer panel (matches legacy admin labels). */
/** Tooltip for the manual-result SAVE button (always clickable except while saving). */
export function getManualSaveButtonTitle(
  live: LuckyGameStatusOk | null,
  saveBusy: boolean,
): string {
  if (saveBusy) return "Saving…";
  if (!live) {
    return "Save manual result — needs live status from the game server; server accepts only during betting.";
  }
  if (live.phase !== "betting") {
    return `Save may fail — server accepts manual result only during betting (current: ${live.phase}).`;
  }
  return "Save this card as the manual result for the current round when the spin runs (pot cap bypassed).";
}

export function getLuckyTimerLabel(live: LuckyGameStatusOk | null): string {
  if (live?.game_state === "start_spin") return "start_spin";
  if (
    live?.phase === "init" ||
    live?.phase === "waiting" ||
    live?.game_state === "init"
  ) {
    return "init_game";
  }
  return "game_timer_start";
}

/**
 * Seconds to show for the countdown, ticking every second between status polls
 * while staying aligned whenever `timer_seconds` updates from the server.
 * `null` when there is no live snapshot yet (avoid showing a fake 0).
 */
export function useLuckyLiveDisplaySeconds(
  live: LuckyGameStatusOk | null,
): number | null {
  const [display, setDisplay] = useState<number | null>(null);
  const syncRef = useRef({ server: 0, at: 0 });

  useEffect(() => {
    if (!live) {
      syncRef.current = { server: 0, at: Date.now() };
      setDisplay(null);
      return;
    }
    const server = Math.max(0, Math.floor(Number(live.timer_seconds) || 0));
    syncRef.current = { server, at: Date.now() };
    setDisplay(server);
  }, [live?.timer_seconds, live?.phase, live?.game_state, live?.round_id]);

  useEffect(() => {
    const id = setInterval(() => {
      setDisplay((prev) => {
        if (prev === null) return null;
        const { server, at } = syncRef.current;
        const elapsed = Math.floor((Date.now() - at) / 1000);
        return Math.max(0, server - elapsed);
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return display;
}

type ResPayload = {
  en: string;
  err?: boolean;
  msg?: string;
  data?: unknown;
};

/**
 * Real-time admin status via Socket.IO `ADMIN_LUCKY_STATUS` (open subscribe).
 * Uses NEXT_PUBLIC_LUCKY_GAME_SERVER_URL (browser → game server).
 */
export function useLuckyAdminLiveSocket(
  variant: LuckyGameVariant,
  onStatus: (data: LuckyGameStatusOk) => void,
): { connected: boolean; error: string | null } {
  const gameType = LUCKY_GAME_TYPE[variant];
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl =
      typeof window !== "undefined"
        ? normalizeGameServerBaseUrl(process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL)
        : null;

    const baseUrlFallback =
      typeof window !== "undefined"
        ? normalizeGameServerBaseUrl(process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL ?? process.env.NEXT_PUBLIC_GAME_SOCKET_URL)
        : null;

    const finalBaseUrl = baseUrlFallback ?? baseUrl;
    const socketPath = withGameServerBasePath(
      "/socket.io",
      process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH,
    );

    if (!finalBaseUrl) {
      setError(null);
      setConnected(false);
      return;
    }

    const socket = io(finalBaseUrl, {
      // Start with polling (more reliable through Nginx proxy) then upgrade to websocket.
      transports: ["polling", "websocket"],
      path: socketPath,
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("admin_subscribe", { gameType });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (...args: unknown[]) => {
      const e = args[0] as { message?: string } | undefined;
      setError(e?.message ?? "Socket connection failed");
      setConnected(false);
    });

    socket.on("res", (...args: unknown[]) => {
      const msg = args[0] as ResPayload;
      if (msg.en !== "ADMIN_LUCKY_STATUS") return;
      if (msg.err) {
        setError(msg.msg ?? "Admin status error");
        return;
      }
      const d = msg.data as LuckyGameStatusOk | undefined;
      if (d?.ok) {
        setError(null);
        onStatusRef.current(d);
      }
    });

    return () => {
      socket.emit("admin_unsubscribe", { gameType });
      socket.disconnect();
    };
  }, [gameType]);

  return { connected, error };
}

export type AdminGameHistoryRow = {
  created_at: string | null;
  username: string;
  game_type: string | null;
  game_id: string | null;
  ticket_id: string | null;
  play_point: number;
  won_point: number;
  end_point: number;
  result_card: string | null;
  status: "win" | "loss" | "claimed" | "not claim" | "Not Result Declare";
  bet_details: Record<string, unknown>;
};

export type AdminGameHistoryOk = {
  rows: AdminGameHistoryRow[];
};

export function useAdminGameHistorySocket(params: {
  gameType: "LUCKY_CARD_12" | "LUCKY_CARD_16" | "ALL";
  fromISO: string;
  toISO: string;
  take?: number;
  onRows: (rows: AdminGameHistoryRow[]) => void;
}): { connected: boolean; error: string | null } {
  const onRowsRef = useRef(params.onRows);
  onRowsRef.current = params.onRows;
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl =
      typeof window !== "undefined"
        ? normalizeGameServerBaseUrl(process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL)
        : null;

    const baseUrlFallback =
      typeof window !== "undefined"
        ? normalizeGameServerBaseUrl(process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL ?? process.env.NEXT_PUBLIC_GAME_SOCKET_URL)
        : null;

    const finalBaseUrl = baseUrlFallback ?? baseUrl;
    const socketPath = withGameServerBasePath(
      "/socket.io",
      process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH,
    );

    if (!finalBaseUrl) {
      setError(null);
      setConnected(false);
      return;
    }

    const socket = io(finalBaseUrl, {
      // Start with polling (more reliable through Nginx proxy) then upgrade to websocket.
      transports: ["polling", "websocket"],
      path: socketPath,
    });
    let lastRefetchAt = 0;
    let trailingTimer: ReturnType<typeof setTimeout> | null = null;

    const request = () => {
      socket.emit("admin_history", {
        gameType: params.gameType,
        from: params.fromISO,
        to: params.toISO,
        take: params.take ?? 200,
      });
    };

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("admin_history_subscribe");
      request();
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (...args: unknown[]) => {
      const e = args[0] as { message?: string } | undefined;
      setError(e?.message ?? "Socket connection failed");
      setConnected(false);
    });

    socket.on("res", (...args: unknown[]) => {
      const msg = args[0] as ResPayload;
      if (msg.en === "ADMIN_GAME_HISTORY_UPDATED") {
        // Coalesce bursts: do an immediate refetch (max 1/800ms) AND guarantee a trailing refetch
        // so a "round_settled" update won't get dropped if it arrives right after "place_bet".
        const now = Date.now();
        const elapsed = now - lastRefetchAt;

        if (elapsed >= 800) {
          lastRefetchAt = now;
          request();
        } else if (!trailingTimer) {
          trailingTimer = setTimeout(() => {
            trailingTimer = null;
            lastRefetchAt = Date.now();
            request();
          }, 800 - elapsed);
        }
        return;
      }

      if (msg.en !== "ADMIN_GAME_HISTORY") return;
      if (msg.err) {
        setError(msg.msg ?? "Admin history error");
        return;
      }
      const d = msg.data as AdminGameHistoryOk | undefined;
      const rows = d?.rows;
      if (Array.isArray(rows)) {
        setError(null);
        onRowsRef.current(rows);
      }
    });

    return () => {
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      socket.emit("admin_history_unsubscribe");
      socket.disconnect();
    };
  }, [params.gameType, params.fromISO, params.toISO, params.take]);

  return { connected, error };
}

export function formatAdminMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function fetchLuckyGameStatus(
  variant: LuckyGameVariant,
): Promise<LuckyGameStatusOk | { ok: false; error?: string }> {
  const gameType = LUCKY_GAME_TYPE[variant];
  let res: Response;
  try {
    res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lucky-game/status?gameType=${encodeURIComponent(gameType)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error loading status",
    };
  }

  let text: string;
  try {
    text = await res.text();
  } catch {
    return { ok: false, error: "Failed to read status response body" };
  }

  if (!text.trim()) {
    return { ok: false, error: `Empty response from admin API (${res.status})` };
  }

  try {
    return JSON.parse(text) as LuckyGameStatusOk | { ok: false; error?: string };
  } catch {
    return {
      ok: false,
      error: `Invalid JSON from admin status API (${res.status}, ${text.slice(0, 80)}…)`,
    };
  }
}

export async function postManualLuckyResult(body: {
  gameType: string;
  winCard: string;
  reward?: string;
  roundId?: string;
}): Promise<{ ok: true } | { ok: false; error?: string }> {
  const requestManual = async (
    payload: typeof body,
  ): Promise<{ ok: true } | { ok: false; error?: string }> => {
    let res: Response;
    try {
      res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lucky-game/manual-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Network error saving manual result",
      };
    }

    let text: string;
    try {
      text = await res.text();
    } catch {
      return { ok: false, error: "Failed to read manual-result response body" };
    }

    if (!text.trim()) {
      return { ok: false, error: `Empty response from admin API (${res.status})` };
    }

    try {
      return JSON.parse(text) as { ok: true } | { ok: false; error?: string };
    } catch {
      return { ok: false, error: "Invalid JSON from manual-result API" };
    }
  };

  const first = await requestManual(body);
  if (first.ok) return first;

  // Round can change in the short gap between status poll and save click.
  // Retry once without roundId so backend binds to the current active round.
  const err = String(first.error ?? "");
  const shouldRetryWithoutRoundId =
    Boolean(body.roundId) &&
    (err.includes("Round is not active") || err.includes("roundId does not match current server round"));

  if (!shouldRetryWithoutRoundId) return first;

  const { roundId: _ignoredRoundId, ...retryBody } = body;
  return requestManual(retryBody);
}

export async function postResetLuckyBalance(body: {
  gameType: string;
}): Promise<{ ok: true } | { ok: false; error?: string }> {
  let res: Response;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lucky-game/reset-balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error resetting balance",
    };
  }

  let text: string;
  try {
    text = await res.text();
  } catch {
    return { ok: false, error: "Failed to read reset-balance response body" };
  }

  if (!text.trim()) {
    return { ok: false, error: `Empty response from admin API (${res.status})` };
  }

  try {
    return JSON.parse(text) as { ok: true } | { ok: false; error?: string };
  } catch {
    return { ok: false, error: "Invalid JSON from reset-balance API" };
  }
}
