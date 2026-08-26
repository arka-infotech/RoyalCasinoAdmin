"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

import {
  calcRouletteMiniExpectedPayment,
  countRouletteMiniUsersWinning,
  fetchLiveResultStatus,
  formatAdminMoney,
  getLuckyTimerLabel,
  getManualSaveButtonTitle,
  isRouletteMiniNumber,
  postAddLiveBalance,
  postManualLuckyResult,
  postResetLuckyBalance,
  rouletteMiniPocketExposure,
  rouletteMiniPocketTone,
  ROULETTE_MINI_GREEN_GAME_TYPE,
  useLiveResultAdminSocket,
  useLuckyLiveDisplaySeconds,
  type LuckyGameStatusOk,
} from "@/lib/luckyGameAdmin";

const GAME_TYPE = ROULETTE_MINI_GREEN_GAME_TYPE;

/** Rows match the reference Live Result screenshot: 0–9 / 10–19 / 20–29 / 30–36 */
const BOARD_ROWS: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
  [30, 31, 32, 33, 34, 35, 36],
];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatStake(n: number): string {
  if (!n) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

/** Screenshot history style: `11 | 0X` */
function formatHistoryEntry(entry: string): string {
  const [card, rewardRaw] = entry.split("|");
  const cardPart = (card ?? "").trim() || entry;
  const reward =
    rewardRaw != null && String(rewardRaw).trim() !== ""
      ? String(rewardRaw).trim()
      : "0";
  return `${cardPart} | ${reward}X`;
}

/** Number label color — 0 green, reds red, blacks black (matches European pockets). */
function numberToneClass(tone: "green" | "red" | "black"): string {
  if (tone === "green") return "text-emerald-600";
  if (tone === "red") return "text-red-600";
  return "text-gray-900";
}

/** Amount box fill — same pocket colors as Roulette Mini. */
function pocketBoxClass(tone: "green" | "red" | "black"): string {
  if (tone === "green") return "border-emerald-600 bg-emerald-500 text-white";
  if (tone === "red") return "border-red-700 bg-red-600 text-white";
  return "border-gray-800 bg-gray-900 text-white";
}

export default function ThirtySixRouletteLiveResultPage() {
  useRequireAdmin();
  const [selected, setSelected] = useState<string>("");
  const [resultInput, setResultInput] = useState<string>("");
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
      setResultInput("");
      setMultiplier("1");
    }
    lastRoundIdRef.current = currentRoundId;
  }, [live?.round_id]);

  const displaySeconds = useLuckyLiveDisplaySeconds(live);
  const canSelect = live?.phase === "betting";

  const selectNumber = useCallback((n: string) => {
    if (!isRouletteMiniNumber(n)) return;
    setSelected(n);
    setResultInput(n);
  }, []);

  const payload = useMemo(() => {
    const timerLabel = getLuckyTimerLabel(live);
    const timerValue = displaySeconds;
    const totals = live?.bet_totals_by_key ?? {};
    const usersByKey = live?.bet_users_by_key ?? {};
    const userIdsByKey = live?.bet_user_ids_by_key;
    const previewCard = selected || live?.pending_manual?.win_card || "";

    const totalExpectedPayment = previewCard
      ? calcRouletteMiniExpectedPayment(totals, previewCard)
      : null;
    const totalUsersWinning = previewCard
      ? countRouletteMiniUsersWinning(previewCard, totals, usersByKey, userIdsByKey)
      : 0;

    const dp = live?.daily_pot;
    const liveCollection = dp?.collected_pot ?? null;
    const livePayment = dp?.consumed_payout ?? null;
    const gameBalance = dp?.game_balance ?? null;
    const potBalance =
      liveCollection == null || livePayment == null
        ? null
        : Math.round((liveCollection - livePayment + Number.EPSILON) * 100) / 100;

    const recentResults = (live?.last_win_cards ?? [])
      .slice(-5)
      .reverse()
      .map(formatHistoryEntry);

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
  }, [live, displaySeconds, selected]);

  async function handleSave() {
    setSaveMsg(null);
    const winCard = selected || (isRouletteMiniNumber(resultInput) ? String(Number(resultInput)) : "");
    if (!winCard) {
      setSaveMsg("Select or enter a number (0–36)");
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
        <h1 className="text-[14px] font-medium text-gray-900">36 Roulette</h1>
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
          <div className="overflow-hidden rounded-[3px] border border-[#7BA3C9] bg-white">
            {BOARD_ROWS.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className={cn(
                  "grid border-b border-[#7BA3C9] last:border-b-0",
                  row.length === 10 ? "grid-cols-10" : "grid-cols-7",
                )}
              >
                {row.map((n) => {
                  const key = String(n);
                  const stake = rouletteMiniPocketExposure(payload.totals, n);
                  const isSelected = selected === key;
                  const tone = rouletteMiniPocketTone(n);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!canSelect}
                      onClick={() => selectNumber(key)}
                      className={cn(
                        "flex min-w-0 flex-col items-center border-r border-[#7BA3C9] px-1.5 py-2 last:border-r-0 sm:px-2 sm:py-2.5",
                        "outline-none focus:outline-none focus-visible:outline-none",
                        isSelected
                          ? "bg-orange-300 ring-1 ring-inset ring-orange-500"
                          : stake > 0
                            ? "bg-orange-200"
                            : "bg-white",
                        !canSelect && "cursor-default",
                      )}
                      title={
                        canSelect
                          ? `Select ${n}${stake > 0 ? ` (exposure ${formatStake(stake)})` : ""}`
                          : String(n)
                      }
                    >
                      <span
                        className={cn(
                          "text-[15px] font-semibold tabular-nums sm:text-[17px]",
                          numberToneClass(tone),
                        )}
                      >
                        {n}
                      </span>
                      <span
                        className={cn(
                          "mt-1 flex h-[18px] min-w-[22px] items-center justify-center rounded-[2px] border px-1 text-[10px] font-semibold tabular-nums sm:h-[20px] sm:min-w-[26px] sm:text-[11px]",
                          pocketBoxClass(tone),
                          stake > 0 && "ring-1 ring-orange-400",
                        )}
                      >
                        {formatStake(stake)}
                      </span>
                    </button>
                  );
                })}
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
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={resultInput}
              disabled={!canSelect}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 2);
                setResultInput(next);
                if (isRouletteMiniNumber(next)) {
                  setSelected(String(Number(next)));
                } else {
                  setSelected("");
                }
              }}
              placeholder="0–36"
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
          placeholder="Enter your Balance"
          className="h-9 min-w-0 w-full flex-1 rounded-[3px] border border-gray-300 bg-white px-3 text-[13px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={addBusy}
          onClick={() => void handleAddBalance()}
          className="h-9 w-full shrink-0 rounded-[3px] bg-[#5A73F2] px-5 text-[13px] font-semibold text-white shadow-sm outline-none hover:bg-[#4a64eb] focus:outline-none disabled:opacity-50 sm:w-auto"
        >
          {addBusy ? "Adding..." : "Add Balance"}
        </button>
      </div>
    </section>
  );
}
