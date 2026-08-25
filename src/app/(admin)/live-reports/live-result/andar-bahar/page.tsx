"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

import iconSpade from "@/assets/lucky12/iconB.png";
import iconDiamond from "@/assets/lucky12/iconC.png";
import iconClub from "@/assets/lucky12/iconF.png";
import iconHeart from "@/assets/lucky12/iconL.png";

import {
  ANDAR_BAHAR_EXACT_RANK_KEYS,
  ANDAR_BAHAR_GAME_TYPE,
  ANDAR_BAHAR_MAIN_KEYS,
  andarBaharJokerFromSelection,
  andarBaharRankDisplayStake,
  andarBaharRankLabel,
  andarBaharSuitDisplayStake,
  andarBaharSuitLabel,
  calcAndarBaharExpectedPayment,
  fetchLiveResultStatus,
  formatAdminMoney,
  getLuckyTimerLabel,
  getManualSaveButtonTitle,
  parseAndarBaharHistoryCard,
  postAddLiveBalance,
  postManualLuckyResult,
  postResetLuckyBalance,
  useLiveResultAdminSocket,
  useLuckyLiveDisplaySeconds,
  type LuckyGameStatusOk,
} from "@/lib/luckyGameAdmin";

const GAME_TYPE = ANDAR_BAHAR_GAME_TYPE;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * ONLY NUMBERS uses UnderBahar Spade faces (`card2/k-*`), same deck style as the
 * reference Live Result screenshot (clean white Spade A–K).
 * COLOR'S reuses Lucky 12 suit icons (gold-rim Spade/Diamond/Club/Heart) — Lucky 12
 * does not use full card faces, only these suit icons + header banners.
 */
const RANK_ROWS = [
  ANDAR_BAHAR_EXACT_RANK_KEYS.slice(0, 7),
  ANDAR_BAHAR_EXACT_RANK_KEYS.slice(7),
] as const;

/** Keys must match Unity UndeBahar AllBox_LIST names (`l`/`c`/`k`/`f`), not parent `1Card`..`4Card`. */
const SUIT_ICONS = [
  { key: "k", label: "Spades", icon: iconSpade },
  { key: "c", label: "Diamonds", icon: iconDiamond },
  { key: "f", label: "Clubs", icon: iconClub },
  { key: "l", label: "Hearts", icon: iconHeart },
] as const;

function spadeCardImg(rank: string): string {
  return `${BASE}/andar-bahar/cards/k-${rank}.png`;
}

function historyImg(cardId: string): string {
  return `${BASE}/andar-bahar/history/${cardId}.png`;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatStake(n: number): string {
  if (!n) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function StakeBar({ value }: { value: number }) {
  return (
    <div
      className={cn(
        "mt-1 flex h-[22px] w-full items-center justify-center rounded-[2px] border border-gray-300 bg-[#E9ECEF] text-[11px] font-medium tabular-nums text-gray-700 sm:h-[26px] sm:text-[12px]",
        value > 0 && "bg-orange-200/90 text-gray-900",
      )}
    >
      {formatStake(value)}
    </div>
  );
}

export default function AndarBaharLiveResultPage() {
  useRequireAdmin();
  const [selectedRank, setSelectedRank] = useState<string>("");
  const [selectedSuit, setSelectedSuit] = useState<string>("k");
  const [selectedSide, setSelectedSide] = useState<"andar" | "bahar" | "">("");
  const [reward, setReward] = useState<string>("1");
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
      setSelectedRank("");
      setSelectedSuit("k");
      setSelectedSide("");
      setReward("1");
    }
    lastRoundIdRef.current = currentRoundId;
  }, [live?.round_id]);

  const displaySeconds = useLuckyLiveDisplaySeconds(live);
  const canSelect = live?.phase === "betting";

  const jokerPreview = useMemo(
    () => (selectedRank ? andarBaharJokerFromSelection(selectedSuit || "k", selectedRank) : null),
    [selectedRank, selectedSuit],
  );

  const payload = useMemo(() => {
    const timerLabel = getLuckyTimerLabel(live);
    const timerValue = displaySeconds;
    const totals = live?.bet_totals_by_key ?? {};
    const totalExpectedPayment =
      selectedSide || jokerPreview
        ? calcAndarBaharExpectedPayment(totals, selectedSide, jokerPreview)
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
      .slice(0, 5)
      .map((entry) => parseAndarBaharHistoryCard(entry))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

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
  }, [live, displaySeconds, selectedSide, jokerPreview]);

  async function handleSave() {
    setSaveMsg(null);
    const winCard =
      jokerPreview ||
      (selectedSide === "andar" || selectedSide === "bahar" ? selectedSide : "");
    if (!winCard) {
      setSaveMsg("Select a rank (and suit) for the joker, or Andar/Bahar");
      return;
    }
    setSaveBusy(true);
    try {
      const res = await postManualLuckyResult({
        gameType: GAME_TYPE,
        winCard,
        ...(reward.trim() ? { reward: reward.trim() } : {}),
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

  const sideLabel =
    selectedSide === "andar" ? "Under" : selectedSide === "bahar" ? "Bahar" : "";
  const rankLabel = selectedRank ? andarBaharRankLabel(selectedRank) : "";
  // Suit only matters when forcing a joker (rank + suit).
  const suitLabel = selectedRank ? andarBaharSuitLabel(selectedSuit) : "";

  return (
    <section className="w-full min-w-0 overflow-x-hidden rounded-xl border bg-white p-2 shadow-sm sm:p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[14px] font-medium text-gray-900">Andar Bahar</h1>
        <button
          type="button"
          disabled={resetBusy}
          onClick={() => void handleResetBalance()}
          className="shrink-0 rounded-[3px] bg-[#5A73F2] px-4 py-[7px] text-[12px] font-semibold text-white shadow-sm outline-none hover:bg-[#4a64eb] focus:outline-none disabled:opacity-50"
        >
          {resetBusy ? "Resetting..." : "Reset Balance"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,320px)] lg:items-start lg:gap-6 xl:gap-8">
        {/* LEFT — matches screenshot sections */}
        <div className="order-2 min-w-0 space-y-5 lg:order-1">
          {/* ONLY NUMBERS */}
          <div>
            <div className="mb-2 text-center text-[13px] font-semibold tracking-wide text-gray-800">
              ONLY NUMBERS
            </div>
            <div className="space-y-3">
              {RANK_ROWS.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="grid grid-cols-4 gap-x-1 gap-y-2 min-[380px]:grid-cols-7 sm:gap-x-2"
                >
                  {row.map(({ key, label }) => {
                    const stake = andarBaharRankDisplayStake(payload.totals, key);
                    const isSelected = selectedRank === key;
                    return (
                      <label
                        key={key}
                        className={cn(
                          "flex min-w-0 cursor-pointer flex-col items-center",
                          !canSelect && "cursor-default",
                        )}
                      >
                        {canSelect ? (
                          <input
                            type="radio"
                            name="ab-rank"
                            checked={isSelected}
                            onChange={() => setSelectedRank(key)}
                            className="mb-1 h-3.5 w-3.5 accent-blue-600"
                            aria-label={`Select rank ${label}`}
                          />
                        ) : (
                          <span className="mb-1 h-3.5" />
                        )}
                        <div
                          className={cn(
                            "flex w-full max-w-[58px] justify-center rounded-[2px] bg-transparent p-0.5",
                            isSelected && "ring-2 ring-blue-500 ring-offset-1",
                          )}
                        >
                          <Image
                            src={spadeCardImg(key)}
                            alt={label}
                            width={52}
                            height={68}
                            unoptimized
                            className="h-auto w-full object-contain"
                          />
                        </div>
                        <StakeBar value={stake} />
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* COLOR'S — Lucky 12 suit icons (same style as screenshot) */}
          <div>
            <div className="mb-2 text-center text-[13px] font-semibold tracking-wide text-gray-800">
              COLOR&apos;S
            </div>
            <div className="mx-auto grid max-w-[420px] grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {SUIT_ICONS.map(({ key, label, icon }) => {
                const stake = andarBaharSuitDisplayStake(payload.totals, key);
                const isSelected = selectedSuit === key;
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex min-w-0 cursor-pointer flex-col items-center",
                      !canSelect && "cursor-default",
                    )}
                    title={label}
                  >
                    {canSelect ? (
                      <input
                        type="radio"
                        name="ab-suit"
                        checked={isSelected}
                        onChange={() => setSelectedSuit(key)}
                        className="mb-1 h-3.5 w-3.5 accent-blue-600"
                        aria-label={`Select ${label}`}
                      />
                    ) : (
                      <span className="mb-1 h-3.5" />
                    )}
                    <div
                      className={cn(
                        "flex aspect-square w-full max-w-[88px] items-center justify-center rounded-[2px] bg-transparent p-1",
                        isSelected && "ring-2 ring-blue-500 ring-offset-1",
                      )}
                    >
                      <Image
                        src={icon}
                        alt={label}
                        width={64}
                        height={64}
                        className="h-[72%] w-[72%] object-contain"
                      />
                    </div>
                    <StakeBar value={stake} />
                  </label>
                );
              })}
            </div>
          </div>

          {/* ANDAR BAHAR */}
          <div>
            <div className="mb-2 text-center text-[13px] font-semibold tracking-wide text-gray-800">
              ANDAR BAHAR
            </div>
            <div className="mx-auto grid max-w-[420px] grid-cols-2 gap-4 sm:gap-6">
              {(
                [
                  { side: "andar" as const, key: ANDAR_BAHAR_MAIN_KEYS.andar, label: "Andar" },
                  { side: "bahar" as const, key: ANDAR_BAHAR_MAIN_KEYS.bahar, label: "Bahar" },
                ] as const
              ).map(({ side, key, label }) => {
                const stake = payload.totals[key] ?? 0;
                const isSelected = selectedSide === side;
                return (
                  <label
                    key={side}
                    className={cn(
                      "flex min-w-0 cursor-pointer flex-col items-center",
                      !canSelect && "cursor-default",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-[56px] w-full items-center justify-center gap-2 rounded-[2px] sm:h-[64px]",
                        isSelected && "ring-2 ring-blue-500 ring-offset-1",
                      )}
                    >
                      {canSelect ? (
                        <input
                          type="radio"
                          name="ab-side"
                          checked={isSelected}
                          onChange={() => setSelectedSide(side)}
                          className="h-3.5 w-3.5 shrink-0 accent-blue-600"
                          aria-label={`Select ${label}`}
                        />
                      ) : null}
                      <span className="text-[18px] font-semibold text-gray-900 sm:text-[20px]">
                        {label}
                      </span>
                    </div>
                    <StakeBar value={stake} />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="order-1 flex min-w-0 flex-col lg:order-2">
          <div className="text-center">
            <div className="break-all text-[16px] font-semibold tracking-wide text-gray-900 sm:text-[22px]">
              {payload.timerLabel}
            </div>
            <div className="mt-1 text-[32px] font-semibold leading-none text-[#1e3a8a] tabular-nums sm:text-[36px]">
              {payload.timerValue ?? "—"}
            </div>
            <div className="mt-2 text-[12px] text-gray-700 sm:text-[14px]">
              Total Expected Collection:{" "}
              {Number(payload.totalExpectedCollection).toFixed(2)}
            </div>
            {payload.totalExpectedPayment != null ? (
              <div className="text-[12px] text-gray-700 sm:text-[14px]">
                Total Expected Payment: {payload.totalExpectedPayment}
              </div>
            ) : null}
          </div>

          <div className="mt-3">
            <select
              value={reward}
              disabled={!canSelect}
              onChange={(e) => setReward(e.target.value)}
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
            <div className="mt-2 rounded-[3px] border border-amber-200 bg-amber-50 px-2 py-1.5 text-center text-[11px] text-amber-900">
              Locked: <span className="font-semibold">{live.pending_manual.win_card}</span>{" "}
              (reward {live.pending_manual.reward})
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex h-9 min-w-[44px] flex-1 items-center justify-center rounded-[3px] border border-gray-300 bg-[#E9ECEF] px-2 text-[12px] font-semibold text-gray-900">
              {rankLabel}
            </div>
            <div className="flex h-9 min-w-[44px] flex-1 items-center justify-center rounded-[3px] border border-gray-300 bg-[#E9ECEF] px-2 text-[12px] font-semibold text-gray-900">
              {suitLabel}
            </div>
            <div className="flex h-9 min-w-[56px] flex-1 items-center justify-center rounded-[3px] border border-gray-300 bg-[#E9ECEF] px-2 text-[12px] font-semibold text-gray-900">
              {sideLabel}
            </div>
            <button
              type="button"
              disabled={saveBusy}
              title={getManualSaveButtonTitle(live, saveBusy)}
              onClick={() => void handleSave()}
              className="h-9 shrink-0 rounded-[2px] bg-[#2DB45D] px-5 text-[12px] font-semibold text-white shadow-sm outline-none hover:bg-[#25a354] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="grid grid-cols-2 bg-white text-[11px] sm:text-[12px]">
              {payload.dailySummaryRows.map((row) => (
                <div key={row.label} className="contents">
                  <div className="border-b border-r border-gray-200 px-2 py-2 text-center text-gray-700 sm:px-3">
                    {row.label}
                  </div>
                  <div className="border-b border-gray-200 px-2 py-2 text-right tabular-nums text-gray-900 sm:px-3">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent joker results — card | NX (reward from round / historyXValue) */}
          <div className="mt-3 overflow-x-auto rounded-[3px] border border-gray-200 bg-white px-2 py-2 sm:px-3">
            {payload.recentResults.length === 0 ? (
              <p className="py-1 text-center text-[12px] text-gray-500">No recent results</p>
            ) : (
              <div className="flex flex-nowrap items-center justify-start gap-3 sm:flex-wrap sm:justify-center">
                {payload.recentResults.map((r, idx) => (
                  <div
                    key={`${idx}-${r.cardId}`}
                    className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-gray-800"
                  >
                    <Image
                      src={historyImg(r.cardId)}
                      alt={r.cardId}
                      width={36}
                      height={48}
                      unoptimized
                      className="h-[48px] w-auto object-contain"
                    />
                    <span className="tabular-nums whitespace-nowrap">| {r.rewardLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:items-center sm:gap-3">
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
          className="h-9 w-full shrink-0 rounded-[3px] bg-[#5A73F2] px-6 text-[13px] font-semibold text-white shadow-sm outline-none hover:bg-[#4a64eb] focus:outline-none disabled:opacity-50 sm:w-auto"
        >
          {addBusy ? "Adding..." : "Add Balance."}
        </button>
      </div>
    </section>
  );
}
