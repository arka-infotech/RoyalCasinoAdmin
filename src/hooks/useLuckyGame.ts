"use client";

import { useState, useEffect, useRef } from "react";
import { getLuckySocket } from "@/services/luckySocketService";
import type { LuckyGameState } from "@/types/game";

type GameType = "LUCKY_CARD_12" | "LUCKY_CARD_16";

export function useLuckyGameState(gameType: GameType): LuckyGameState {
  const [state, setState] = useState<LuckyGameState>({
    phase: "init",
    timer: 0,
    winCard: null,
    roundId: null,
    lastWinCards: [],
    isConnected: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = getLuckySocket();

    const updateConnected = () => setState((s) => ({ ...s, isConnected: socket.connected }));
    socket.on("connect", updateConnected);
    socket.on("disconnect", () => setState((s) => ({ ...s, isConnected: false })));

    const handleRes = (payload: { en: string; data?: Record<string, unknown>; [key: string]: unknown }) => {
      const { en } = payload;

      if (en === `${gameType}_GAME_INFO`) {
        const d = payload as Record<string, unknown>;
        setState((s) => ({
          ...s,
          phase: String(d.game_state ?? "init") as LuckyGameState["phase"],
          timer: Number(d.timer ?? 0),
          roundId: String(d.game_id ?? ""),
          winCard: String(d.win_card ?? "") || null,
          lastWinCards: (d.last_win_cards as string[]) || [],
          isConnected: true,
        }));
        return;
      }

      if (en === `${gameType}_INIT_GAME`) {
        const d = payload as Record<string, unknown>;
        if (timerRef.current) clearInterval(timerRef.current);
        const startTimer = Number(d.time ?? 5);
        let t = startTimer;
        setState((s) => ({ ...s, phase: "init", timer: t, roundId: String(d.game_id ?? ""), winCard: null }));
        timerRef.current = setInterval(() => {
          t--;
          setState((s) => ({ ...s, timer: t }));
          if (t <= 0 && timerRef.current) clearInterval(timerRef.current);
        }, 1000);
        return;
      }

      if (en === `${gameType}_GAME_TIMER_START`) {
        const d = payload as Record<string, unknown>;
        if (timerRef.current) clearInterval(timerRef.current);
        let t = Number(d.timer ?? 40);
        setState((s) => ({ ...s, phase: "betting", timer: t }));
        timerRef.current = setInterval(() => {
          t--;
          setState((s) => ({ ...s, timer: t }));
          if (t <= 0 && timerRef.current) clearInterval(timerRef.current);
        }, 1000);
        return;
      }

      if (en === `${gameType}_START_SPIN`) {
        const d = payload as Record<string, unknown>;
        if (timerRef.current) clearInterval(timerRef.current);
        let t = Number(d.timer ?? 5);
        setState((s) => ({ ...s, phase: "spinning", timer: t, winCard: String(d.win_card ?? "") || null }));
        timerRef.current = setInterval(() => {
          t--;
          setState((s) => ({ ...s, timer: t }));
          if (t <= 0 && timerRef.current) clearInterval(timerRef.current);
        }, 1000);
        return;
      }

      if (en === `${gameType}_WINNER_DECLARE`) {
        const d = payload as Record<string, unknown>;
        if (timerRef.current) clearInterval(timerRef.current);
        setState((s) => ({
          ...s,
          phase: "done",
          timer: 0,
          winCard: String(d.win_card ?? "") || null,
          lastWinCards: (d.last_win_cards as string[]) || s.lastWinCards,
        }));
        return;
      }
    };

    socket.on("res", handleRes);

    // Request game info to join the room
    socket.emit("req", { en: `${gameType}_GAME_INFO`, data: {} });
    if (socket.connected) setState((s) => ({ ...s, isConnected: true }));

    return () => {
      socket.off("res", handleRes);
      socket.off("connect", updateConnected);
      socket.emit("req", { en: `${gameType}_CLOSE_GAME`, data: {} });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameType]);

  return state;
}
