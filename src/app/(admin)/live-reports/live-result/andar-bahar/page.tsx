"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ANDAR_BAHAR_EXACT_RANK_KEYS,
  ANDAR_BAHAR_GAME_TYPE,
  ANDAR_BAHAR_MAIN_KEYS,
  ANDAR_BAHAR_RANGE_KEYS,
  ANDAR_BAHAR_SUIT_KEYS,
  calcAndarBaharExpectedPayment,
  fetchLiveResultStatus,
  formatAdminMoney,
  formatAndarBaharHistoryEntry,
  getLuckyTimerLabel,
  postAddLiveBalance,
  postResetLuckyBalance,
  useLiveResultAdminSocket,
  useLuckyLiveDisplaySeconds,
  type LuckyGameStatusOk,
} from "@/lib/luckyGameAdmin";

const GAME_TYPE = ANDAR_BAHAR_GAME_TYPE;

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatStake(n: number): string {
  if (!n) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

export default function AndarBaharLiveResultPage() {
  const [previewSide, setPreviewSide] = useState<"andar" | "bahar" | "">("");
  const [balanceInput, setBalanceInput] = useState<string>("");
  const [live, setLive] = useState<LuckyGameStatusOk | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const lastRoundIdRef = useRef<string | number | null>(null);

  const refreshLive = useCallback(async () => {
    try {
      const data = await fetchLiveResultStatus(GAME_TYPE);
      setLive(data.ok ? data : null);
    } catch {
      setLive(null);
    }
  }, []);

  const applyLive = useCallback((data: LuckyGameStatusOk) => {
    setLive(data);
  }, []);

  const { connected: socketConnected } = useLiveResultAdminSocket(GAME_TYPE, applyLive);

  useEffect(() => {
    void refreshLive();
  }, [refreshLive]);

  useEffect(() => {
    if (socketConnected) return;
    const t = setInterval(() => void refreshLive(), 3000);
    return () => clearInterval(t);
  }, [socketConnected, refreshLive]);

  useEffect(() => {
    const currentRoundId = live?.round_id ?? null;
    if (currentRoundId == null) return;

    if (lastRoundIdRef.current !== null && lastRoundIdRef.current !== currentRoundId) {
      setPreviewSide("");
    }
    lastRoundIdRef.current = currentRoundId;
  }, [live?.round_id]);

  const displaySeconds = useLuckyLiveDisplaySeconds(live);

  const payload = useMemo(() => {
    const timerLabel = getLuckyTimerLabel(live);
    const timerValue = displaySeconds;
    const totals = live?.bet_totals_by_key ?? {};
    const usersByKey = live?.bet_users_by_key ?? {};

    const totalExpectedPayment = previewSide
      ? calcAndarBaharExpectedPayment(totals, previewSide)
      : null;

    const previewKey = previewSide === "andar" ? ANDAR_BAHAR_MAIN_KEYS.andar : ANDAR_BAHAR_MAIN_KEYS.bahar;
    const totalUsersWinning = previewSide ? (usersByKey[previewKey] ?? 0) : 0;

    const dp = live?.daily_pot;
    const liveCollection = dp?.collected_pot ?? null;
    const livePayment = dp?.consumed_payout ?? null;
    const gameBalance = dp?.game_balance ?? null;
    const potBalance =
      liveCollection == null || livePayment == null
        ? null
        : Math.round((liveCollection - livePayment + Number.EPSILON) * 100) / 100;

    const recentResults = (live?.last_win_cards ?? [])
      .slice(0, 12)
      .map(formatAndarBaharHistoryEntry);

    return {
      timerLabel,
      timerValue,
      totalExpectedCollection: live?.live_stake_total ?? live?.round_stake_total ?? 0,
      totalExpectedPayment,
      totalUsersWinning,
      totals,
      dailySummaryRows: [
        { label: "TOTAL Game Balance:", value: formatAdminMoney(gameBalance) },
        { label: "TOTAL COLLECTION:", value: formatAdminMoney(liveCollection) },
        { label: "TOTAL PAYMENT:", value: formatAdminMoney(livePayment) },
        { label: "BALANCE:", value: formatAdminMoney(potBalance) },
      ],
      recentResults,
    };
  }, [live, displaySeconds, previewSide]);

  async function handleResetBalance() {
    if (resetBusy) return;
    setSaveMsg(null);
    setResetBusy(true);
    try {
      const res = await postResetLuckyBalance({ gameType: GAME_TYPE });
      if (res.ok) {
        setSaveMsg("Game balance reset to 0.");
        void refreshLive();
      } else {
        setSaveMsg(res.error ?? "Reset balance failed");
      }
    } finally {
      setResetBusy(false);
    }
  }

  async function handleAddBalance() {
    if (addBusy) return;
    setSaveMsg(null);
    const amount = Number(balanceInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSaveMsg("Enter a positive balance amount");
      return;
    }
    setAddBusy(true);
    try {
      const res = await postAddLiveBalance({ gameType: GAME_TYPE, amount });
      if (res.ok) {
        setSaveMsg(`Added ${amount} to game balance.`);
        setBalanceInput("");
        void refreshLive();
      } else {
        setSaveMsg(res.error ?? "Add balance failed");
      }
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <section className="w-full min-w-0 overflow-x-hidden rounded-xl border bg-white p-2 shadow-sm sm:p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <h1 className="text-[14px] font-medium text-gray-900">Andar Bahar</h1>
        <button
          type="button"
          disabled={resetBusy}
          onClick={() => void handleResetBalance()}
          className="shrink-0 rounded-[3px] bg-[#5A73F2] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm outline-none hover:bg-[#4a64eb] focus:outline-none disabled:opacity-50 sm:px-4"
        >
          {resetBusy ? "Resetting..." : "Reset Balance"}
        </button>
      </div>

      <div className="mt-2 rounded-[3px] border border-gray-200 bg-gray-50 px-3 py-2 text-center text-[11px] text-gray-600 sm:text-[12px]">
        Andar Bahar&apos;s winner is decided by live card-matching, not an admin pick — this
        game has no manual-result control. Use the cards below (click Andar/Bahar) only to
        preview expected payout; live totals, timer, and balance controls below are fully live.
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] xl:items-start xl:gap-6">
        <div className="order-2 min-w-0 space-y-4 xl:order-1">
          {/* Main Andar / Bahar totals */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { side: "andar" as const, key: ANDAR_BAHAR_MAIN_KEYS.andar, label: "Andar (Under)" },
                { side: "bahar" as const, key: ANDAR_BAHAR_MAIN_KEYS.bahar, label: "Bahar" },
              ] satisfies Array<{ side: "andar" | "bahar"; key: string; label: string }>
            ).map(({ side, key, label }) => {
              const stake = payload.totals[key] ?? 0;
              const isSelected = previewSide === side;
              return (
                <button
                  key={side}
                  type="button"
                  onClick={() => setPreviewSide(isSelected ? "" : side)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-[3px] border bg-white px-3 py-4 text-center shadow-sm outline-none",
                    isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300",
                  )}
                  title={`Preview payout if ${label} wins`}
                >
                  <span className="text-[14px] font-semibold text-gray-900 sm:text-[16px]">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "mt-2 flex h-7 min-w-[64px] items-center justify-center rounded-[2px] border border-[#7BA3C9] px-2 text-[12px] font-medium tabular-nums",
                      stake > 0 ? "bg-orange-300/80 text-gray-800" : "bg-white text-gray-600",
                    )}
                  >
                    {formatStake(stake)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Suit side bets */}
          <div className="overflow-hidden rounded-[3px] border border-gray-200 bg-[#EBF1F5]">
            <div className="border-b border-gray-200/70 bg-[#EBF1F5] py-1.5 text-center text-[12px] font-semibold tracking-wide text-gray-800 sm:text-[13px]">
              Suit Side Bets (Joker Card)
            </div>
            <div className="grid grid-cols-2 gap-1 p-1.5 sm:grid-cols-4 sm:gap-2 sm:p-2">
              {ANDAR_BAHAR_SUIT_KEYS.map(({ key, label }) => {
                const stake = payload.totals[key] ?? 0;
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center rounded-sm bg-white px-1 py-1.5 text-center"
                  >
                    <span className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">
                      {label}
                    </span>
                    <span
                      className={cn(
                        "mt-1 flex h-5 w-full items-center justify-center rounded-[1px] border border-[#7BA3C9] text-[10px] tabular-nums sm:text-[11px]",
                        stake > 0 ? "bg-orange-300/80 text-gray-800" : "bg-white text-gray-500",
                      )}
                    >
                      {formatStake(stake)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Range side bets */}
          <div className="overflow-hidden rounded-[3px] border border-gray-200 bg-[#EBF1F5]">
            <div className="border-b border-gray-200/70 bg-[#EBF1F5] py-1.5 text-center text-[12px] font-semibold tracking-wide text-gray-800 sm:text-[13px]">
              Rank Range Side Bets (Joker Card)
            </div>
            <div className="grid grid-cols-3 gap-1 p-1.5 sm:gap-2 sm:p-2">
              {ANDAR_BAHAR_RANGE_KEYS.map(({ key, label }) => {
                const stake = payload.totals[key] ?? 0;
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center rounded-sm bg-white px-1 py-1.5 text-center"
                  >
                    <span className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">
                      {label}
                    </span>
                    <span
                      className={cn(
                        "mt-1 flex h-5 w-full items-center justify-center rounded-[1px] border border-[#7BA3C9] text-[10px] tabular-nums sm:text-[11px]",
                        stake > 0 ? "bg-orange-300/80 text-gray-800" : "bg-white text-gray-500",
                      )}
                    >
                      {formatStake(stake)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exact rank side bets */}
          <div className="overflow-hidden rounded-[3px] border border-gray-200 bg-[#EBF1F5]">
            <div className="border-b border-gray-200/70 bg-[#EBF1F5] py-1.5 text-center text-[12px] font-semibold tracking-wide text-gray-800 sm:text-[13px]">
              Exact Rank Side Bets (Joker Card)
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.6rem,1fr))] gap-1 p-1.5 sm:gap-1.5 sm:p-2">
              {ANDAR_BAHAR_EXACT_RANK_KEYS.map(({ key, label }) => {
                const stake = payload.totals[key] ?? 0;
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center rounded-sm bg-white px-1 py-1 text-center"
                  >
                    <span className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">
                      {label}
                    </span>
                    <span
                      className={cn(
                        "mt-1 flex h-5 w-full items-center justify-center rounded-[1px] border border-[#7BA3C9] text-[10px] tabular-nums sm:text-[11px]",
                        stake > 0 ? "bg-orange-300/80 text-gray-800" : "bg-white text-gray-500",
                      )}
                    >
                      {formatStake(stake)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="order-1 flex min-w-0 flex-col xl:order-2">
          <div className="text-center">
            <div className="break-all text-[13px] font-semibold tracking-wide text-gray-900 sm:text-[20px]">
              {payload.timerLabel}
            </div>
            <div className="mt-0.5 text-[26px] font-semibold leading-none text-gray-900 tabular-nums sm:text-[34px]">
              {payload.timerValue ?? "—"}
            </div>
            <div className="mt-2 space-y-0.5 break-words text-[11px] leading-snug text-gray-700 sm:text-[14px]">
              <div>
                Total Expected Collection:{" "}
                {Number(payload.totalExpectedCollection).toFixed(2)}
              </div>
              <div>
                Total Expected Payment (Andar/Bahar preview):
                {payload.totalExpectedPayment == null
                  ? " —"
                  : ` ${payload.totalExpectedPayment}`}
              </div>
              <div>Total Users Winning: {payload.totalUsersWinning}</div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[3px] border border-gray-200">
            <div className="border-b border-gray-200 bg-white py-2 text-center text-[12px] font-medium text-gray-800">
              Daily Collection &amp; Results
            </div>
            <div className="grid grid-cols-2 bg-white text-[10px] sm:text-[12px]">
              {payload.dailySummaryRows.map((row) => (
                <div key={row.label} className="contents">
                  <div className="border-b border-r border-gray-200 px-1.5 py-2 text-center break-words text-gray-700 sm:px-3">
                    {row.label}
                  </div>
                  <div className="border-b border-gray-200 px-1.5 py-2 text-right tabular-nums text-gray-900 sm:px-3">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {saveMsg ? (
            <p className="mt-2 text-center text-[11px] text-gray-600">{saveMsg}</p>
          ) : null}

          <div className="mt-3 overflow-x-auto rounded-[3px] border border-gray-200 bg-white px-2 py-2 sm:px-3">
            {payload.recentResults.length === 0 ? (
              <p className="py-1 text-center text-[12px] text-gray-500">No recent results</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12px] font-medium tabular-nums text-gray-800 sm:text-[13px]">
                {payload.recentResults.map((line, idx) => (
                  <span key={`${idx}-${line}`} className="whitespace-nowrap">
                    {line}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-2 rounded-[3px] border border-gray-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:gap-3">
        <input
          type="number"
          min={0}
          step="any"
          value={balanceInput}
          onChange={(e) => setBalanceInput(e.target.value)}
          placeholder="Enter your Balance."
          className="h-9 min-w-0 w-full flex-1 rounded-[3px] border border-gray-300 bg-white px-3 text-[13px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={addBusy}
          onClick={() => void handleAddBalance()}
          className="h-9 w-full shrink-0 rounded-[3px] bg-[#5A73F2] px-5 text-[13px] font-semibold text-white shadow-sm outline-none hover:bg-[#4a64eb] focus:outline-none disabled:opacity-50 sm:w-auto"
        >
          {addBusy ? "Adding..." : "Add Balance."}
        </button>
      </div>
    </section>
  );
}
