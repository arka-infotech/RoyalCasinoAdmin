"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

import {
  calcTitliSoratExpectedPayment,
  fetchLiveResultStatus,
  formatAdminMoney,
  formatTitliSoratHistoryEntry,
  getLuckyTimerLabel,
  getManualSaveButtonTitle,
  isTitliSoratSymbol,
  postAddLiveBalance,
  postManualLuckyResult,
  postResetLuckyBalance,
  TITLI_SORAT_GAME_TYPE,
  TITLI_SORAT_SYMBOLS,
  useLiveResultAdminSocket,
  useLuckyLiveDisplaySeconds,
  type LuckyGameStatusOk,
} from "@/lib/luckyGameAdmin";

const GAME_TYPE = TITLI_SORAT_GAME_TYPE;

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatStake(n: number): string {
  if (!n) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

export default function TitliSoratLiveResultPage() {
  useRequireAdmin();
  const [selected, setSelected] = useState<string>("");
  const [multiplier, setMultiplier] = useState<string>("1");
  const [balanceInput, setBalanceInput] = useState<string>("");
  const [live, setLive] = useState<LuckyGameStatusOk | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
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
      setSelected("");
      setMultiplier("1");
    }
    lastRoundIdRef.current = currentRoundId;
  }, [live?.round_id]);

  const displaySeconds = useLuckyLiveDisplaySeconds(live);
  const canSelect = live?.phase === "betting";

  const selectSymbol = useCallback((symbol: string) => {
    if (!isTitliSoratSymbol(symbol)) return;
    setSelected(symbol);
  }, []);

  const payload = useMemo(() => {
    const timerLabel = getLuckyTimerLabel(live);
    const timerValue = displaySeconds;
    const totals = live?.bet_totals_by_key ?? {};
    const usersByKey = live?.bet_users_by_key ?? {};
    const previewCard = selected || live?.pending_manual?.win_card || "";
    const rewardNum = Number(
      selected
        ? multiplier
        : (live?.pending_manual?.reward ?? live?.reward ?? multiplier),
    );
    const safeReward = Number.isFinite(rewardNum) && rewardNum > 0 ? rewardNum : 1;

    const totalExpectedPayment = previewCard
      ? calcTitliSoratExpectedPayment(totals, previewCard, safeReward)
      : null;

    const totalUsersWinning = previewCard ? (usersByKey[previewCard] ?? 0) : 0;

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
      .map(formatTitliSoratHistoryEntry);

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
  }, [live, displaySeconds, selected, multiplier]);

  async function handleSave() {
    setSaveMsg(null);
    const winCard = selected;
    if (!winCard) {
      setSaveMsg("Select a symbol to declare as the result");
      return;
    }
    setSaveBusy(true);
    try {
      const res = await postManualLuckyResult({
        gameType: GAME_TYPE,
        winCard,
        ...(multiplier.trim() ? { reward: multiplier.trim() } : {}),
        ...(live?.round_id ? { roundId: live.round_id } : {}),
      });
      if (res.ok) {
        setSaveMsg(null);
        void refreshLive();
      } else {
        setSaveMsg(res.error ?? "Save failed");
      }
    } finally {
      setSaveBusy(false);
    }
  }

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
        <h1 className="text-[14px] font-medium text-gray-900">Titli Sorat</h1>
        <button
          type="button"
          disabled={resetBusy}
          onClick={() => void handleResetBalance()}
          className="shrink-0 rounded-[3px] bg-[#5A73F2] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm outline-none hover:bg-[#4a64eb] focus:outline-none disabled:opacity-50 sm:px-4"
        >
          {resetBusy ? "Resetting..." : "Reset Balance"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] xl:items-start xl:gap-6">
        <div className="order-2 min-w-0 xl:order-1">
          <div className="mx-auto w-full max-w-[760px] overflow-hidden rounded-[3px] border border-gray-200 bg-[#F3F3F3] p-1.5 sm:p-3 md:p-4">
            <div className="grid grid-cols-3 gap-1.5 min-[400px]:gap-2 sm:grid-cols-4 sm:gap-3 md:gap-4">
              {TITLI_SORAT_SYMBOLS.map((symbol) => {
                const stake = payload.totals[symbol] ?? 0;
                const isSelected = selected === symbol;
                return (
                  <div key={symbol} className="min-w-0">
                    <label
                      className={cn(
                        "relative flex aspect-square w-full min-h-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-[2px] border bg-white p-1 text-center shadow-[0_1px_0_rgba(0,0,0,0.04)]",
                        isSelected ? "border-blue-500" : "border-gray-300",
                        !canSelect && "cursor-default",
                      )}
                    >
                      {canSelect ? (
                        <input
                          type="radio"
                          name="titli-sorat-selection"
                          checked={isSelected}
                          onChange={() => selectSymbol(symbol)}
                          className="absolute left-1 top-1 z-10 h-3 w-3 accent-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:left-2 sm:top-2 sm:h-4 sm:w-4"
                          aria-label={`Select ${symbol}`}
                        />
                      ) : null}
                      <span className="break-words text-[clamp(0.6rem,2.6vw,0.85rem)] font-semibold leading-tight text-gray-900">
                        {symbol}
                      </span>
                    </label>
                    <div className="mt-1 rounded-[2px] border border-gray-200 bg-[#E9ECEF] px-0.5 py-0.5 sm:mt-1.5 sm:px-1 sm:py-1">
                      <div
                        className={cn(
                          "flex h-4 items-center justify-center overflow-hidden rounded-[2px] border border-gray-200 px-0.5 text-[9px] font-medium tabular-nums sm:h-6 sm:text-[12px]",
                          stake > 0
                            ? "bg-orange-300/80 text-gray-800"
                            : "bg-white text-gray-600",
                        )}
                      >
                        {formatStake(stake)}
                      </div>
                    </div>
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
                Total Expected Payment:
                {payload.totalExpectedPayment == null
                  ? ""
                  : ` ${payload.totalExpectedPayment}`}
              </div>
              <div>Total Users Winning: {payload.totalUsersWinning}</div>
            </div>
          </div>

          <div className="mt-3">
            <select
              value={multiplier}
              disabled={!canSelect}
              onChange={(e) => setMultiplier(e.target.value)}
              className="h-9 w-full rounded-[3px] border border-gray-300 bg-white px-2 text-[12px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:outline-none disabled:bg-[#E9ECEF]"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {live?.pending_manual ? (
            <div className="mt-3 rounded-[3px] border border-amber-200 bg-amber-50 px-2 py-2 text-center text-[11px] text-amber-900 sm:px-3">
              Locked manual winner:{" "}
              <span className="font-semibold">{live.pending_manual.win_card}</span> (reward{" "}
              {live.pending_manual.reward}) — applied at spin.
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <div
              className="flex h-9 min-w-[120px] max-w-full items-center justify-center rounded-[3px] border border-gray-300 bg-[#E9ECEF] px-2 text-center text-[12px] font-semibold text-gray-900"
              title={selected}
            >
              {selected || "Select a symbol"}
            </div>
            <button
              type="button"
              disabled={saveBusy}
              title={getManualSaveButtonTitle(live, saveBusy)}
              onClick={() => void handleSave()}
              className="h-9 w-[72px] rounded-[2px] bg-[#2DB45D] text-[12px] font-semibold text-white shadow-sm outline-none hover:bg-[#25a354] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveBusy ? "…" : "SAVE"}
            </button>
          </div>
          {saveMsg ? (
            <p className="mt-2 text-center text-[11px] text-gray-600">{saveMsg}</p>
          ) : null}

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
