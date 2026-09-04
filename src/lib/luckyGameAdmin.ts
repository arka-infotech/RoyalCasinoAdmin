"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

import { getBrowserSocketConfig } from "@/lib/gameServerBaseUrl";

/** Admin UI suit → backend single-letter suit (confirmed against RoyalCasino's Lucky12_Manager.cs / Lucky16_Manager.cs). */
export type UiSuit = "heart" | "spade" | "diamond" | "club";

export type LuckyGameVariant = "12" | "16";

export const LUCKY_GAME_TYPE: Record<LuckyGameVariant, string> = {
  "12": "LUCKY_CARD_12",
  "16": "LUCKY_CARD_16",
};

export const TRIPLE_CHANCE_GAME_TYPE = "TRIPLE_CHANCE";

export const SPIN_TO_WIN_GAME_TYPE = "SPIN_TO_WIN";

export const ROULETTE_MINI_GAME_TYPE = "ROULETTE_MINI";

/** Admin Live Result for Roulette Mini Green — displayed as “36 Roulette”. */
export const ROULETTE_MINI_GREEN_GAME_TYPE = "ROULETTE_MINI_GREEN";

/** Admin Live Result for Fun Roulette (`roulette_fun` / ROULETTE_ZERO) — 0–36. */
export const ROULETTE_FUN_GAME_TYPE = "ROULETTE_FUN";

/** Admin Live Result for American Roulette (`roulette` / ROULETTE) — includes 00. */
export const ROULETTE_GAME_TYPE = "ROULETTE";

/** Admin Live Result for European Roulette (`roulette_european`) — single zero 0–36. */
export const ROULETTE_EUROPEAN_GAME_TYPE = "ROULETTE_EUROPEAN";

/** gameType labels for admin game-history — must match backend `game-id.util`. */
export const ADMIN_GAME_HISTORY_GAME_TYPES = [
  "LUCKY_CARD_12",
  "LUCKY_CARD_16",
  "TRIPLE_CHANCE",
  "SPIN_TO_WIN",
  "ANDAR_BAHAR",
  "SINGLE_CHANCE_3D",
  "LUCKY_SORAT",
  "ROULETTE_MINI",
  "ROULETTE_MINI_GREEN",
  "ROULETTE_FUN",
  "ROULETTE",
  "ROULETTE_EUROPEAN",
] as const;

export type AdminGameHistoryGameType = (typeof ADMIN_GAME_HISTORY_GAME_TYPES)[number];
export type AdminGameHistoryFilter = "ALL" | AdminGameHistoryGameType;

export const ADMIN_GAME_HISTORY_LABELS: Record<AdminGameHistoryGameType, string> = {
  LUCKY_CARD_12: "Lucky 12",
  LUCKY_CARD_16: "Lucky 16",
  TRIPLE_CHANCE: "Triple Chance",
  SPIN_TO_WIN: "Spin To Win",
  ANDAR_BAHAR: "Andar Bahar",
  SINGLE_CHANCE_3D: "Fun Target",
  LUCKY_SORAT: "Titli Sorat",
  ROULETTE_MINI: "Roulette Mini",
  ROULETTE_MINI_GREEN: "36 Roulette",
  ROULETTE_FUN: "Fun Roulette",
  ROULETTE: "Roulette",
  ROULETTE_EUROPEAN: "European Roulette",
};

export function formatAdminGameHistoryGameType(gameType: string | null | undefined): string {
  if (!gameType) return "—";
  const key = gameType as AdminGameHistoryGameType;
  return ADMIN_GAME_HISTORY_LABELS[key] ?? gameType;
}

/** Spin To Win individual payout (matches backend game.config.ts). */
export const SPIN_TO_WIN_PAYOUT = 9;

export {
  ROULETTE_MINI_STRAIGHT_PAYOUT,
  ROULETTE_MINI_RED,
  isRouletteMiniNumber,
  normalizeRouletteWinCard,
  rouletteMiniPocketTone,
  calcRouletteMiniExpectedPayment,
  formatRouletteMiniHistoryEntry,
  rouletteMiniPocketExposure,
  listRouletteMiniSpecialStakes,
  countRouletteMiniUsersWinning,
  resolveRouletteMiniBetKey,
} from "@/lib/rouletteMiniLive";
export type { RouletteMiniStakeRow, RouletteMiniBetKind } from "@/lib/rouletteMiniLive";

export {
  isRouletteAmericanNumber,
  normalizeRouletteAmericanWinCard,
  rouletteAmericanPocketTone,
  rouletteAmericanPocketExposure,
  calcRouletteAmericanExpectedPayment,
  countRouletteAmericanUsersWinning,
} from "@/lib/rouletteAmericanLive";

/** Triple Chance payout multipliers (matches backend game.config.ts). */
export const TRIPLE_CHANCE_PAYOUT = {
  single: 9,
  double: 90,
  triple: 900,
} as const;

// Backend letter codes don't match the obvious guess — confirmed against the
// player client's own mapping (Lucky12_Manager.cs / Lucky16_Manager.cs): 'c' is
// Diamond and 'f' is Club.
const SUIT_TO_BACKEND: Record<UiSuit, string> = {
  club: "f",
  diamond: "c",
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
  c: "diamond",
  f: "club",
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
  /** Unique players with a positive stake on each bet key */
  bet_users_by_key?: Record<string, number>;
  /** User ids per bet key (for accurate “users winning” across multi-number bets) */
  bet_user_ids_by_key?: Record<string, string[]>;
  /** Pre-bet (Redis draft) amounts — also folded into bet_totals_by_key for Spin/Triple */
  draft_totals_by_key?: Record<string, number>;
  draft_users_by_key?: Record<string, number>;
  /** Sum of each player’s `total_bet` for the round (table collection, placed only) */
  round_stake_total?: number;
  /** Placed + draft stake (live expected collection while betting is open) */
  live_stake_total?: number;
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
  if (live?.phase === "done") return "finish_state";
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
export function useLiveResultAdminSocket(
  gameType: string,
  onStatus: (data: LuckyGameStatusOk) => void,
): { connected: boolean; error: string | null } {
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { origin, path } = getBrowserSocketConfig();

    const socket = io(origin, {
      transports: ["polling", "websocket"],
      path,
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

export function useLuckyAdminLiveSocket(
  variant: LuckyGameVariant,
  onStatus: (data: LuckyGameStatusOk) => void,
): { connected: boolean; error: string | null } {
  return useLiveResultAdminSocket(LUCKY_GAME_TYPE[variant], onStatus);
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
  gameType: AdminGameHistoryFilter;
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
    const { origin, path } = getBrowserSocketConfig();

    const socket = io(origin, {
      transports: ["polling", "websocket"],
      path,
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

export async function fetchLiveResultStatus(
  gameType: string,
): Promise<LuckyGameStatusOk | { ok: false; error?: string }> {
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

export async function fetchLuckyGameStatus(
  variant: LuckyGameVariant,
): Promise<LuckyGameStatusOk | { ok: false; error?: string }> {
  return fetchLiveResultStatus(LUCKY_GAME_TYPE[variant]);
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

export async function postAddLiveBalance(body: {
  gameType: string;
  amount: number;
}): Promise<{ ok: true; game_balance?: number } | { ok: false; error?: string }> {
  let res: Response;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/lucky-game/add-balance`, {
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
      error: e instanceof Error ? e.message : "Network error adding balance",
    };
  }

  let text: string;
  try {
    text = await res.text();
  } catch {
    return { ok: false, error: "Failed to read add-balance response body" };
  }

  if (!text.trim()) {
    return { ok: false, error: `Empty response from admin API (${res.status})` };
  }

  try {
    return JSON.parse(text) as
      | { ok: true; game_balance?: number }
      | { ok: false; error?: string };
  } catch {
    return { ok: false, error: "Invalid JSON from add-balance API" };
  }
}

/** Format Triple Chance history entry for the Live Result list (`H-T-U | reward`). */
export function formatTripleChanceHistoryEntry(entry: string): string {
  const [card, rewardRaw] = entry.split("|");
  const cardPart = (card ?? "").trim() || entry;
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== ""
      ? String(rewardRaw).trim()
      : "0";
  return `${cardPart} | ${reward}`;
}

/** Expected payout if `winCard` (H-T-U) is declared for the current round. */
export function calcTripleChanceExpectedPayment(
  totals: Record<string, number> | undefined,
  winCard: string,
  reward: number = 1,
): number {
  if (!totals || !winCard) return 0;
  const r = Number.isFinite(reward) && reward > 0 ? reward : 1;
  const parts = winCard.split("-");
  if (parts.length !== 3) return 0;
  const units = parts[2] ?? "";
  const doubleWin = `${parts[1]}-${parts[2]}`;

  let total = 0;
  for (const [key, raw] of Object.entries(totals)) {
    const amt = Number(raw) || 0;
    if (!amt) continue;
    if (/^\d-\d-\d$/.test(key) && key === winCard) {
      total += amt * TRIPLE_CHANCE_PAYOUT.triple;
    } else if (/^\d-\d$/.test(key) && key === doubleWin) {
      total += amt * TRIPLE_CHANCE_PAYOUT.double;
    } else if (/^\d$/.test(key) && key === units) {
      total += amt * TRIPLE_CHANCE_PAYOUT.single;
    }
  }
  return Math.round((total * r + Number.EPSILON) * 100) / 100;
}

/**
 * Display stake on a Triple Chance admin cell `H-T-U`.
 * Combines exact triple + matching double (`T-U`) + matching single (`U`)
 * so all pre-bets show in the same 000–999 grid.
 */
export function tripleChanceCellDisplayStake(
  totals: Record<string, number> | undefined,
  card: string,
): number {
  if (!totals || !card) return 0;
  const parts = card.split("-");
  if (parts.length !== 3) return Number(totals[card]) || 0;
  const [, t, u] = parts;
  const triple = Number(totals[card]) || 0;
  const double = Number(totals[`${t}-${u}`]) || 0;
  const single = Number(totals[u ?? ""]) || 0;
  return triple + double + single;
}

/** Split live totals into single / double / triple maps. */
export function splitTripleChanceBetTotals(totals: Record<string, number> | undefined): {
  singles: Record<string, number>;
  doubles: Record<string, number>;
  triples: Record<string, number>;
} {
  const singles: Record<string, number> = {};
  const doubles: Record<string, number> = {};
  const triples: Record<string, number> = {};
  if (!totals) return { singles, doubles, triples };
  for (const [key, raw] of Object.entries(totals)) {
    const amt = Number(raw) || 0;
    if (!amt) continue;
    if (/^\d$/.test(key)) singles[key] = (singles[key] ?? 0) + amt;
    else if (/^\d-\d$/.test(key)) doubles[key] = (doubles[key] ?? 0) + amt;
    else if (/^\d-\d-\d$/.test(key)) triples[key] = (triples[key] ?? 0) + amt;
  }
  return { singles, doubles, triples };
}

/** Convert 0–999 (or "043") into backend win card `H-T-U`. */
export function digitsToTripleWinCard(raw: string): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isInteger(n) || n < 0 || n > 999) return null;
  const padded = String(n).padStart(3, "0");
  return `${padded[0]}-${padded[1]}-${padded[2]}`;
}

export function tripleWinCardToDigits(winCard: string): string {
  const parts = winCard.split("-");
  if (parts.length !== 3) return "";
  return `${parts[0]}${parts[1]}${parts[2]}`;
}

/** Format Spin To Win history for Live Result (`N | RX`). */
export function formatSpinToWinHistoryEntry(entry: string): string {
  const [card, rewardRaw] = entry.split("|");
  const cardPart = (card ?? "").trim() || entry;
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== ""
      ? String(rewardRaw).trim()
      : "0";
  return `${cardPart} | ${reward}X`;
}

/** Expected payout if digit `winCard` wins for the current round. */
export function calcSpinToWinExpectedPayment(
  totals: Record<string, number> | undefined,
  winCard: string,
  reward: number = 1,
): number {
  if (!totals || !winCard) return 0;
  const r = Number.isFinite(reward) && reward > 0 ? reward : 1;
  const stake = Number(totals[winCard]) || 0;
  if (!stake) return 0;
  return Math.round((stake * SPIN_TO_WIN_PAYOUT * r + Number.EPSILON) * 100) / 100;
}

export function isSpinToWinDigit(raw: string): boolean {
  return /^[0-9]$/.test(String(raw ?? "").trim());
}

export const ANDAR_BAHAR_GAME_TYPE = "ANDAR_BAHAR";

export const FUN_TARGET_GAME_TYPE = "SINGLE_CHANCE_3D";

export const TITLI_SORAT_GAME_TYPE = "LUCKY_SORAT";

/** Fun Target individual payout (matches backend game.config.ts). */
export const FUN_TARGET_PAYOUT = 9;

/** Titli Sorat individual payout (matches backend game.config.ts). */
export const TITLI_SORAT_PAYOUT = 11;

/**
 * Andar Bahar payout multipliers (matches backend game.config.ts).
 * Unlike Triple Chance's single/double/triple scheme, each bet family here
 * has its own independent multiplier.
 */
export const ANDAR_BAHAR_PAYOUT = {
  andar: 1.9,
  bahar: 2.0,
  suit: 4.0,
  color: 2.0,
  rangeLow: 2.0,
  rangeMiddle: 12.0,
  rangeHigh: 2.0,
  exactRank: 12.0,
} as const;

/** Must match Unity Sorat.unity AllBox_LIST GameObject names exactly (backend TITLI_SORAT_SYMBOLS). */
export const TITLI_SORAT_SYMBOLS = [
  "Amrela",
  "Ball",
  "Sun",
  "Lamp",
  "Cow",
  "WatterDoll",
  "Kite",
  "Gariyo",
  "Rose",
  "Butterfly",
  "Egle",
  "Rebit",
] as const;

export type TitliSoratSymbol = (typeof TITLI_SORAT_SYMBOLS)[number];

/** Andar Bahar main-outcome keys (backend `andar-bahar.engine.ts` cellMultiplier). */
export const ANDAR_BAHAR_MAIN_KEYS = { andar: "Under", bahar: "Bahar" } as const;

/**
 * Suit side-bet keys — Unity UndeBahar AllBox_LIST GameObject names (`l`/`f`/`k`/`c`).
 * Parent containers are named `1Card`..`4Card` but those are NOT the bet keys.
 */
export const ANDAR_BAHAR_SUIT_KEYS: Array<{ key: string; label: string }> = [
  { key: "l", label: "Hearts" },
  { key: "f", label: "Clubs" },
  { key: "k", label: "Spades" },
  { key: "c", label: "Diamonds" },
];

/** Unity color-pair keys (ColorIcons panel): red ♦♥ / black ♣♠. */
export const ANDAR_BAHAR_COLOR_PAIR_KEYS = {
  red: "cl",
  black: "fk",
} as const;

/** Rank-range side-bet keys (matches backend `cellMultiplier`: A-6 low, 7 middle, 8-K high). */
export const ANDAR_BAHAR_RANGE_KEYS: Array<{ key: string; label: string }> = [
  { key: "A_To_6", label: "A to 6" },
  { key: "7", label: "7" },
  { key: "8_To_K", label: "8 to K" },
];

/** Exact-rank side-bet keys '1'..'13' (Ace..King), matches backend `cellMultiplier`. */
export const ANDAR_BAHAR_EXACT_RANK_KEYS: Array<{ key: string; label: string }> = [
  { key: "1", label: "A" },
  { key: "2", label: "2" },
  { key: "3", label: "3" },
  { key: "4", label: "4" },
  { key: "5", label: "5" },
  { key: "6", label: "6" },
  { key: "7", label: "7" },
  { key: "8", label: "8" },
  { key: "9", label: "9" },
  { key: "10", label: "10" },
  { key: "11", label: "J" },
  { key: "12", label: "Q" },
  { key: "13", label: "K" },
];

/**
 * ONLY NUMBERS cell stake: exact rank + matching range bet.
 * - 1..6 ← `A_To_6`
 * - 7    ← key `7` (Unity already merges exact + range-middle)
 * - 8..13 ← `8_To_K`
 */
export function andarBaharRankDisplayStake(
  totals: Record<string, number> | undefined,
  rankKey: string,
): number {
  if (!totals) return 0;
  const exact = Number(totals[rankKey]) || 0;
  const rank = Number.parseInt(rankKey, 10);
  if (!Number.isFinite(rank)) return exact;
  if (rank >= 1 && rank <= 6) return exact + (Number(totals.A_To_6) || 0);
  if (rank >= 8 && rank <= 13) return exact + (Number(totals["8_To_K"]) || 0);
  return exact;
}

/**
 * COLOR'S cell stake: single suit + matching color-pair.
 * - Hearts (`l`) / Diamonds (`c`) ← `cl` (red)
 * - Clubs (`f`) / Spades (`k`) ← `fk` (black)
 */
export function andarBaharSuitDisplayStake(
  totals: Record<string, number> | undefined,
  suitKey: string,
): number {
  if (!totals) return 0;
  const suit = Number(totals[suitKey]) || 0;
  if (suitKey === "l" || suitKey === "c") {
    return suit + (Number(totals[ANDAR_BAHAR_COLOR_PAIR_KEYS.red]) || 0);
  }
  if (suitKey === "f" || suitKey === "k") {
    return suit + (Number(totals[ANDAR_BAHAR_COLOR_PAIR_KEYS.black]) || 0);
  }
  return suit;
}

/**
 * Expected payout for the admin selection.
 * - Side only → Under/Bahar main bets
 * - Joker card (`k-7`) → exact rank, suit, color-pair (`cl`/`fk`), and range bets
 */
export function calcAndarBaharExpectedPayment(
  totals: Record<string, number> | undefined,
  winningSide?: "andar" | "bahar" | "",
  jokerCard?: string | null,
): number {
  if (!totals) return 0;
  let total = 0;

  if (winningSide === "andar" || winningSide === "bahar") {
    const mainKey =
      winningSide === "andar" ? ANDAR_BAHAR_MAIN_KEYS.andar : ANDAR_BAHAR_MAIN_KEYS.bahar;
    const mult = winningSide === "andar" ? ANDAR_BAHAR_PAYOUT.andar : ANDAR_BAHAR_PAYOUT.bahar;
    total += (Number(totals[mainKey]) || 0) * mult;
  }

  const joker = String(jokerCard ?? "").trim();
  if (/^[cfkl]-(?:[1-9]|1[0-3])$/.test(joker)) {
    const [suit, rankStr] = joker.split("-");
    const rank = Number(rankStr);

    // Exact rank (Unity key "7" also covers range-middle — same 12x, count once)
    total += (Number(totals[rankStr!]) || 0) * ANDAR_BAHAR_PAYOUT.exactRank;

    // Single suit
    total += (Number(totals[suit!]) || 0) * ANDAR_BAHAR_PAYOUT.suit;

    // Color pair: cl = ♦♥, fk = ♣♠
    if (suit === "c" || suit === "l") {
      total += (Number(totals[ANDAR_BAHAR_COLOR_PAIR_KEYS.red]) || 0) * ANDAR_BAHAR_PAYOUT.color;
    } else if (suit === "f" || suit === "k") {
      total += (Number(totals[ANDAR_BAHAR_COLOR_PAIR_KEYS.black]) || 0) * ANDAR_BAHAR_PAYOUT.color;
    }

    if (rank >= 1 && rank <= 6) {
      total += (Number(totals.A_To_6) || 0) * ANDAR_BAHAR_PAYOUT.rangeLow;
    } else if (rank >= 8 && rank <= 13) {
      total += (Number(totals["8_To_K"]) || 0) * ANDAR_BAHAR_PAYOUT.rangeHigh;
    }
  }

  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export function andarBaharSuitLabel(suitKey: string): string {
  switch (suitKey) {
    case "l":
    case "1Card":
      return "Hearts";
    case "f":
    case "2Card":
      return "Clubs";
    case "k":
    case "3Card":
      return "Spades";
    case "c":
    case "4Card":
      return "Diamonds";
    default:
      return "";
  }
}

/**
 * Map suit side-bet key → backend suit letter.
 * Accepts Unity letter keys and legacy `1Card`..`4Card` aliases.
 */
export const ANDAR_BAHAR_SUIT_LETTER: Record<string, "c" | "f" | "k" | "l"> = {
  l: "l",
  f: "f",
  k: "k",
  c: "c",
  "1Card": "l",
  "2Card": "f",
  "3Card": "k",
  "4Card": "c",
};

export function andarBaharRankLabel(rank: string): string {
  switch (rank) {
    case "1":
      return "A";
    case "11":
      return "J";
    case "12":
      return "Q";
    case "13":
      return "K";
    default:
      return rank;
  }
}

/** Build joker win card from suit key + rank (`k` + `7` → `k-7`). */
export function andarBaharJokerFromSelection(
  suitKey: string,
  rank: string,
): string | null {
  const suit = ANDAR_BAHAR_SUIT_LETTER[suitKey];
  if (!suit || !/^(?:[1-9]|1[0-3])$/.test(rank)) return null;
  return `${suit}-${rank}`;
}

/** Format Andar Bahar history entry (`<suit>-<rank>|reward`) for display with sprites. */
export function parseAndarBaharHistoryCard(entry: string): {
  cardId: string;
  rankLabel: string;
  rewardLabel: string;
} | null {
  const [card, rewardRaw] = entry.split("|");
  const cardId = (card ?? "").trim();
  if (!/^[cfkl]-(?:[1-9]|1[0-3])$/.test(cardId)) return null;
  const [, rank] = cardId.split("-");
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== ""
      ? String(rewardRaw).trim()
      : "0";
  return {
    cardId,
    rankLabel: andarBaharRankLabel(rank ?? ""),
    rewardLabel: `${reward}X`,
  };
}

/** Format Andar Bahar history entry (`<suit>-<rank>|reward`, e.g. `l-7|0`) for the Live Result list. */
export function formatAndarBaharHistoryEntry(entry: string): string {
  const parsed = parseAndarBaharHistoryCard(entry);
  if (parsed) return `${parsed.cardId} | ${parsed.rewardLabel}`;
  const [card, rewardRaw] = entry.split("|");
  const cardPart = (card ?? "").trim() || entry;
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== "" ? String(rewardRaw).trim() : "0";
  return `${cardPart} | ${reward}`;
}

/** Format Fun Target history entry (`<digit>|<rewardX>`) for the Live Result list. */
export function formatFunTargetHistoryEntry(entry: string): string {
  const [card, rewardRaw] = entry.split("|");
  const cardPart = (card ?? "").trim() || entry;
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== "" ? String(rewardRaw).trim() : "0";
  return `${cardPart} | ${reward}X`;
}

/** Format Titli Sorat history entry (`<symbol>|<rewardX>`) for the Live Result list. */
export function formatTitliSoratHistoryEntry(entry: string): string {
  const [card, rewardRaw] = entry.split("|");
  const cardPart = (card ?? "").trim() || entry;
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== "" ? String(rewardRaw).trim() : "0";
  return `${cardPart} | ${reward}X`;
}

/** Expected payout if digit `winCard` wins for the current round (Fun Target, flat 9x). */
export function calcFunTargetExpectedPayment(
  totals: Record<string, number> | undefined,
  winCard: string,
  reward: number = 1,
): number {
  if (!totals || !winCard) return 0;
  const r = Number.isFinite(reward) && reward > 0 ? reward : 1;
  const stake = Number(totals[winCard]) || 0;
  if (!stake) return 0;
  return Math.round((stake * FUN_TARGET_PAYOUT * r + Number.EPSILON) * 100) / 100;
}

/** Expected payout if symbol `winCard` wins for the current round (Titli Sorat, flat 11x). */
export function calcTitliSoratExpectedPayment(
  totals: Record<string, number> | undefined,
  winCard: string,
  reward: number = 1,
): number {
  if (!totals || !winCard) return 0;
  const r = Number.isFinite(reward) && reward > 0 ? reward : 1;
  const stake = Number(totals[winCard]) || 0;
  if (!stake) return 0;
  return Math.round((stake * TITLI_SORAT_PAYOUT * r + Number.EPSILON) * 100) / 100;
}

export function isFunTargetDigit(raw: string): boolean {
  return /^[0-9]$/.test(String(raw ?? "").trim());
}

export function isTitliSoratSymbol(raw: string): raw is TitliSoratSymbol {
  return (TITLI_SORAT_SYMBOLS as readonly string[]).includes(String(raw ?? "").trim());
}
