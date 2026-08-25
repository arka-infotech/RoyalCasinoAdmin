"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

import {
  calcTripleChanceExpectedPayment,
  digitsToTripleWinCard,
  fetchLiveResultStatus,
  formatAdminMoney,
  formatTripleChanceHistoryEntry,
  getLuckyTimerLabel,
  getManualSaveButtonTitle,
  postAddLiveBalance,
  postManualLuckyResult,
  postResetLuckyBalance,
  tripleChanceCellDisplayStake,
  tripleWinCardToDigits,
  TRIPLE_CHANCE_GAME_TYPE,
  useLiveResultAdminSocket,
  useLuckyLiveDisplaySeconds,
  type LuckyGameStatusOk,
} from "@/lib/luckyGameAdmin";

const GAME_TYPE = TRIPLE_CHANCE_GAME_TYPE;

/** Precompute 10 groups of 100 outcomes: 000–099 … 900–999 */
const HUNDRED_GROUPS: Array<{ label: string; cards: string[] }> = (() => {
  const groups: Array<{ label: string; cards: string[] }> = [];
  for (let h = 0; h <= 9; h++) {
    const cards: string[] = [];
    for (let t = 0; t <= 9; t++) {
      for (let u = 0; u <= 9; u++) {
        cards.push(`${h}-${t}-${u}`);
      }
    }
    groups.push({
      label: `${h}00-${h}99`,
      cards,
    });
  }
  return groups;
})();

function formatBetAmount(n: number): string {
  if (!n) return "00";
  if (Number.isInteger(n)) return String(n).padStart(2, "0");
  return n.toFixed(2);
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function TripleChanceLiveResultPage() {
  useRequireAdmin();
  const [selected, setSelected] = useState<string>("");
  const [resultInput, setResultInput] = useState<string>("");
  const [balanceInput, setBalanceInput] = useState<string>("");
  const [live, setLive] = useState<LuckyGameStatusOk | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const lastRoundIdRef = useRef<string | number | null>(null);
  const selectedCellRef = useRef<HTMLButtonElement | null>(null);

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
      setResultInput("");
    }
    lastRoundIdRef.current = currentRoundId;
  }, [live?.round_id]);

  useEffect(() => {
    if (selected) {
      selectedCellRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selected]);

  const displaySeconds = useLuckyLiveDisplaySeconds(live);

  const selectWinCard = useCallback((winCard: string) => {
    setSelected(winCard);
    setResultInput(tripleWinCardToDigits(winCard));
  }, []);

  const payload = useMemo(() => {
    const timerLabel = getLuckyTimerLabel(live);
    const timerValue = displaySeconds;
    const totals = live?.bet_totals_by_key ?? {};
    const previewCard = selected || live?.pending_manual?.win_card || "";
    const rewardNum = Number(live?.pending_manual?.reward ?? live?.reward ?? 1);
    const totalExpectedPayment = previewCard
      ? calcTripleChanceExpectedPayment(totals, previewCard, rewardNum)
      : null;

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
      .map(formatTripleChanceHistoryEntry);

    return {
      timerLabel,
      timerValue,
      totalExpectedCollection: live?.live_stake_total ?? live?.round_stake_total ?? 0,
      totalExpectedPayment,
      totals,
      dailySummaryRows: [
        { label: "TOTAL Game Balance:", value: formatAdminMoney(gameBalance) },
        { label: "TOTAL COLLECTION:", value: formatAdminMoney(liveCollection) },
        { label: "TOTAL PAYMENT:", value: formatAdminMoney(livePayment) },
        { label: "BALANCE:", value: formatAdminMoney(potBalance) },
      ],
      recentResults,
    };
  }, [live, displaySeconds, selected]);

  async function handleSave() {
    setSaveMsg(null);
    const fromInput = digitsToTripleWinCard(resultInput);
    const winCard = selected || fromInput;
    if (!winCard) {
      setSaveMsg("Select or enter a result (0–999)");
      return;
    }
    setSaveBusy(true);
    try {
      const res = await postManualLuckyResult({
        gameType: GAME_TYPE,
        winCard,
        reward: "1",
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

  const canSelect = live?.phase === "betting";

  return (
    <section className="w-full min-w-0 overflow-x-hidden rounded-xl border bg-white p-2 shadow-sm sm:p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <h1 className="text-[14px] font-medium text-gray-900">Triple Chance</h1>
        <button
          type="button"
          disabled={resetBusy}
          onClick={() => void handleResetBalance()}
          className="shrink-0 rounded-[3px] bg-[#5A73F2] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm outline-none hover:bg-[#4a64eb] focus:outline-none disabled:opacity-50 sm:px-4"
        >
          {resetBusy ? "Resetting..." : "Reset Balance"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,300px)] xl:items-start xl:gap-5">
        <div className="order-2 min-w-0 xl:order-1">
          <div className="mb-2 text-center text-[15px] font-semibold text-gray-900 sm:text-[18px]">
            Bet Details
          </div>
          <div className="max-h-[min(62vh,780px)] space-y-3 overflow-auto overscroll-contain pr-0.5 sm:max-h-[min(70vh,860px)] sm:space-y-4">
            {HUNDRED_GROUPS.map((group) => (
              <div
                key={group.label}
                className="overflow-hidden rounded-[3px] border border-gray-200 bg-[#EBF1F5]"
              >
                <div className="sticky top-0 z-10 border-b border-gray-200/70 bg-[#EBF1F5] py-1.5 text-center text-[13px] font-semibold tracking-wide text-gray-800 sm:text-[15px]">
                  {group.label}
                </div>
                <div className="grid w-full gap-x-0 gap-y-1 p-1 [grid-template-columns:repeat(auto-fill,minmax(2.45rem,1fr))] sm:gap-y-1.5 sm:p-1.5 sm:[grid-template-columns:repeat(auto-fill,minmax(2.9rem,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(3.1rem,1fr))]">
                  {group.cards.map((card) => {
                    const stake = tripleChanceCellDisplayStake(payload.totals, card);
                    const isSelected = selected === card;
                    return (
                      <button
                        key={card}
                        type="button"
                        ref={isSelected ? selectedCellRef : undefined}
                        disabled={!canSelect}
                        onClick={() => selectWinCard(card)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Spacebar") {
                            e.preventDefault();
                            if (canSelect) selectWinCard(card);
                          }
                        }}
                        className={cn(
                          "tc-bet-cell flex min-w-0 flex-col items-center rounded-sm bg-[#EBF1F5] px-0 py-0.5 text-center",
                          "border border-transparent outline-none ring-0",
                          "focus:border-transparent focus:outline-none focus:ring-0",
                          "focus-visible:outline-none active:outline-none",
                          isSelected && "is-selected !border-blue-500 bg-blue-100/80",
                          !canSelect && "cursor-default",
                        )}
                        title={canSelect ? `Select ${card}` : card}
                      >
                        <span className="max-w-full truncate text-[10px] font-semibold leading-none text-gray-800 sm:text-[12px] md:text-[13px]">
                          {card}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 flex h-[14px] w-[18px] shrink-0 items-center justify-center rounded-[1px] border border-[#7BA3C9] text-[9px] leading-none tabular-nums sm:h-[17px] sm:w-[24px] sm:text-[11px]",
                            stake > 0
                              ? "bg-orange-300/80 text-gray-800"
                              : "bg-white text-gray-500",
                          )}
                        >
                          {formatBetAmount(stake)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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
              <div>Total Expected Collection: {payload.totalExpectedCollection}</div>
              <div>
                Total Expected Payment:
                {payload.totalExpectedPayment == null ? "" : ` ${payload.totalExpectedPayment}`}
              </div>
            </div>
          </div>

          {live?.pending_manual ? (
            <div className="mt-3 rounded-[3px] border border-amber-200 bg-amber-50 px-2 py-2 text-center text-[11px] text-amber-900 sm:px-3">
              Locked manual winner:{" "}
              <span className="font-semibold">{live.pending_manual.win_card}</span> (reward{" "}
              {live.pending_manual.reward}) — applied at spin.
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={resultInput}
              disabled={!canSelect}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 3);
                setResultInput(next);
                const card = digitsToTripleWinCard(next);
                setSelected(card ?? "");
              }}
              placeholder="0–999"
              className="h-9 w-[72px] rounded-[3px] border border-gray-300 bg-white px-2 text-center text-[13px] font-semibold text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:outline-none disabled:bg-[#E9ECEF]"
            />
            <button
              type="button"
              disabled={saveBusy}
              title={getManualSaveButtonTitle(live, saveBusy)}
              onClick={() => void handleSave()}
              className="h-9 w-[72px] rounded-[2px] bg-[#2DB45D] text-[12px] font-semibold text-white shadow-sm outline-none hover:bg-[#25a354] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveBusy ? "…" : "SAVE"}
            </button>
            <div
              className="flex h-9 min-w-[72px] max-w-full items-center justify-center rounded-[3px] border border-gray-300 bg-[#E9ECEF] px-2 text-center text-[12px] font-semibold text-gray-900"
              title={selected}
            >
              {selected || "—"}
            </div>
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

          <div className="mt-3 max-h-[140px] overflow-y-auto rounded-[3px] border border-gray-200 bg-white px-3 py-2 sm:max-h-[220px]">
            {payload.recentResults.length === 0 ? (
              <p className="py-2 text-center text-[12px] text-gray-500">No recent results</p>
            ) : (
              <ul className="space-y-1 text-center text-[12px] font-medium tabular-nums text-gray-800 sm:text-[13px]">
                {payload.recentResults.map((line, idx) => (
                  <li key={`${idx}-${line}`}>{line}</li>
                ))}
              </ul>
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
          className="h-9 w-full shrink-0 rounded-[3px] bg-[#0d6efd] px-5 text-[13px] font-semibold text-white shadow-sm outline-none hover:bg-[#0b5ed7] focus:outline-none disabled:opacity-50 sm:w-auto"
        >
          {addBusy ? "Adding..." : "Add Balance."}
        </button>
      </div>
    </section>
  );
}
