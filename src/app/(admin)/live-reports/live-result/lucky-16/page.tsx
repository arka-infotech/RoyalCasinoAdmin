"use client";

import Image, { type StaticImageData } from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

import allclubs from "@/assets/lucky16/allclubs.png";
import allDiamonds from "@/assets/lucky16/allDiamonds.png";
import allHeart from "@/assets/lucky16/allHeart.png";
import allspades from "@/assets/lucky16/allspades.png";
import iconB from "@/assets/lucky16/iconB.png";
import iconC from "@/assets/lucky16/iconC.png";
import iconF from "@/assets/lucky16/iconF.png";
import iconL from "@/assets/lucky16/iconL.png";

import {
  betTotalsToBoardValues,
  fetchLuckyGameStatus,
  formatAdminMoney,
  getManualSaveButtonTitle,
  getLuckyTimerLabel,
  LUCKY_GAME_TYPE,
  parseHistoryEntry,
  postManualLuckyResult,
  postResetLuckyBalance,
  selectionKeyToWinCard,
  useLuckyAdminLiveSocket,
  useLuckyLiveDisplaySeconds,
  type LuckyGameStatusOk,
} from "@/lib/luckyGameAdmin";

type Suit = "heart" | "spade" | "diamond" | "club";
type Rank = "A" | "K" | "Q" | "J";

type ResultEntry = {
  suit: Suit;
  rank: Rank;
  multiplier: string;
};

type Lucky16Payload = {
  timerLabel: string;
  timerValue: number | null;
  totalExpectedCollection: number;
  totalExpectedPayment?: number | null;
  boardValues: Record<Rank, Record<Suit, number>>;
  dailySummaryRows: Array<{ label: string; value: string }>;
  recentResults: ResultEntry[];
};

const SUITS: Array<{
  suit: Suit;
  label: string;
  headerSrc: StaticImageData;
  iconSrc: StaticImageData;
  color: "red" | "black";
}> = [
  {
    suit: "heart",
    label: "All Heart",
    headerSrc: allHeart,
    iconSrc: iconL,
    color: "red",
  },
  {
    suit: "spade",
    label: "All Spade",
    headerSrc: allspades,
    iconSrc: iconB,
    color: "black",
  },
  {
    suit: "diamond",
    label: "All Diamond",
    headerSrc: allDiamonds,
    iconSrc: iconC,
    color: "red",
  },
  {
    suit: "club",
    label: "All Club",
    headerSrc: allclubs,
    iconSrc: iconF,
    color: "black",
  },
];

/** Maps UI suit to standard card suffix (e.g. heart → H for AH). */
const SUIT_CARD_SUFFIX: Record<Suit, string> = {
  spade: "S",
  club: "C",
  diamond: "D",
  heart: "H",
};

function cardCodeFromSelectionKey(key: string): string {
  const [suit, rank] = key.split("-") as [Suit, Rank | undefined];
  if (!suit || !rank) return key;
  const suffix = SUIT_CARD_SUFFIX[suit];
  return suffix ? `${rank}${suffix}` : key;
}

const VARIANT = "16" as const;
const INDIVIDUAL_PAYOUT = 14;

function liveHistoryToResults(entries: string[]): ResultEntry[] {
  const out: ResultEntry[] = [];
  for (const e of entries) {
    const p = parseHistoryEntry(e);
    if (!p) continue;
    out.push({
      suit: p.suit,
      rank: p.rankLabel as Rank,
      multiplier: p.multiplierLabel,
    });
    if (out.length >= 10) break;
  }
  return out;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SuitHeader({ src, alt }: { src: StaticImageData; alt: string }) {
  return (
    <div className="flex items-center justify-center bg-white">
      <Image
        src={src}
        alt={alt}
        width={110}
        height={90}
        className="h-[72px] w-auto object-contain"
        priority
      />
    </div>
  );
}

function CardTile({
  rank,
  suitIconSrc,
  color,
  selected,
  onSelect,
  name,
  ariaLabel,
  showSelector,
}: {
  rank: Rank;
  suitIconSrc: StaticImageData;
  color: "red" | "black";
  selected: boolean;
  onSelect: () => void;
  name: string;
  ariaLabel: string;
  showSelector: boolean;
}) {
  return (
    <label className="group flex h-[92px] w-full cursor-pointer items-center justify-center bg-white">
      <div className="relative h-[76px] w-[62px] rounded-[2px] border border-gray-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        {showSelector ? (
          <input
            type="radio"
            name={name}
            checked={selected}
            onChange={onSelect}
            className="absolute left-[4px] top-[4px] z-10 h-[14px] w-[14px] accent-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={ariaLabel}
          />
        ) : null}

        <div
          className="absolute right-[4px] top-[5px] flex items-center gap-[2px] text-[11px] font-semibold leading-none text-gray-900"
        >
          <span>{rank}</span>
          <Image
            src={suitIconSrc}
            alt=""
            width={11}
            height={11}
            className="h-[11px] w-[11px] object-contain"
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center pt-[6px]">
          <Image
            src={suitIconSrc}
            alt=""
            width={34}
            height={34}
            className="h-[34px] w-[34px] object-contain"
          />
        </div>
      </div>
    </label>
  );
}

function ValueBar({
  value,
  tone,
}: {
  value: number;
  tone: "orange" | "gray";
}) {
  return (
    <div className="bg-white p-[3px]">
      <div
        className={cn(
          "flex h-[30px] items-center justify-start rounded-[2px] border border-gray-200 px-3 text-[12px] font-medium",
          tone === "orange" ? "bg-orange-300/80 text-gray-800" : "bg-[#E9ECEF] text-gray-600",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function MiniResultCard({
  rank,
  multiplier,
  color,
  suitIconSrc,
}: {
  suitIconSrc: StaticImageData;
  rank: Rank;
  multiplier: string;
  color: "red" | "black";
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="relative h-[60px] w-[46px] rounded-[2px] border border-gray-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div
          className="flex items-center gap-[2px] text-[10px] font-semibold leading-none text-gray-900"
        >
          <span>{rank}</span>
          <Image
            src={suitIconSrc}
            alt=""
            width={12}
            height={12}
            className="h-[12px] w-[12px] object-contain"
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center pt-[10px]">
          <Image
            src={suitIconSrc}
            alt=""
            width={26}
            height={26}
            className="h-[26px] w-[26px] object-contain"
          />
        </div>
      </div>
      <div className="pb-[3px] text-[14px] font-semibold text-gray-900">{multiplier}</div>
    </div>
  );
}

export default function Lucky16Page() {
  useRequireAdmin();
  const [selected, setSelected] = useState<string>("");
  const [multiplier, setMultiplier] = useState<string>("0");
  const [live, setLive] = useState<LuckyGameStatusOk | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const lastRoundIdRef = useRef<string | number | null>(null);

  const refreshLive = useCallback(async () => {
    try {
      const data = await fetchLuckyGameStatus(VARIANT);
      if (data.ok) {
        setLive(data);
      } else {
        setLive(null);
      }
    } catch {
      setLive(null);
    }
  }, []);

  const applyLive = useCallback((data: LuckyGameStatusOk) => {
    setLive(data);
  }, []);

  const { connected: socketConnected } = useLuckyAdminLiveSocket(
    VARIANT,
    applyLive,
  );

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
      setMultiplier("0");
    }
    lastRoundIdRef.current = currentRoundId;
  }, [live?.round_id]);

  const displaySeconds = useLuckyLiveDisplaySeconds(live);

  const payload = useMemo((): Lucky16Payload => {
    const timerLabel = getLuckyTimerLabel(live);
    const timerValue = displaySeconds;
    const recentResults = live?.last_win_cards?.length
      ? liveHistoryToResults(live.last_win_cards)
      : [];

    const boardValues = betTotalsToBoardValues(live?.bet_totals_by_key, VARIANT) as Lucky16Payload["boardValues"];

    const pending = live?.pending_manual;
    const totalExpectedPayment = (() => {
      const previewWinCard = selectionKeyToWinCard(selected, VARIANT);
      if (previewWinCard) {
        const mult = Number(multiplier);
        if (!Number.isFinite(mult) || mult <= 0) return 0;
        const stake = live?.bet_totals_by_key?.[previewWinCard] ?? 0;
        const raw = stake * INDIVIDUAL_PAYOUT * mult;
        return Math.round((raw + Number.EPSILON) * 100) / 100;
      }

      if (pending?.win_card && pending.reward != null) {
        const mult = Number(pending.reward);
        if (!Number.isFinite(mult) || mult <= 0) return 0;
        const stake = live?.bet_totals_by_key?.[pending.win_card] ?? 0;
        const raw = stake * INDIVIDUAL_PAYOUT * mult;
        return Math.round((raw + Number.EPSILON) * 100) / 100;
      }

      return null;
    })();

    const dp = live?.daily_pot;
    const potBalance =
      dp == null
        ? null
        : Math.round((dp.collected_pot - dp.consumed_payout + Number.EPSILON) * 100) / 100;

    return {
      timerLabel,
      timerValue,
      totalExpectedCollection: live?.round_stake_total ?? 0,
      totalExpectedPayment,
      boardValues,
      dailySummaryRows: [
        { label: "TOTAL Game Balance:", value: formatAdminMoney(dp?.game_balance) },
        { label: "TOTAL COLLECTION:", value: formatAdminMoney(dp?.collected_pot) },
        { label: "TOTAL PAYMENT :", value: formatAdminMoney(dp?.consumed_payout) },
        { label: "BALANCE :", value: formatAdminMoney(potBalance) },
      ],
      recentResults:
        recentResults.length > 0
          ? recentResults
          : [
              { suit: "heart", rank: "A", multiplier: "—" },
              { suit: "spade", rank: "K", multiplier: "—" },
            ],
    };
  }, [live, displaySeconds, multiplier, selected]);

  async function handleSave() {
    setSaveMsg(null);
    const winCard = selectionKeyToWinCard(selected, VARIANT);
    if (!winCard) {
      setSaveMsg("Invalid card selection");
      return;
    }
    setSaveBusy(true);
    try {
      const res = await postManualLuckyResult({
        gameType: LUCKY_GAME_TYPE[VARIANT],
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
      const res = await postResetLuckyBalance({
        gameType: LUCKY_GAME_TYPE[VARIANT],
      });
      if (res.ok) {
        setSaveMsg("Daily pot reset to 0.");
        void refreshLive();
      } else {
        setSaveMsg(res.error ?? "Reset balance failed");
      }
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[14px] font-medium text-gray-900">Lucky Card 16</h1>
        </div>
        <button
          type="button"
          disabled={resetBusy}
          onClick={() => void handleResetBalance()}
          className="rounded-[3px] bg-[#5A73F2] px-4 py-[7px] text-[12px] font-semibold text-white shadow-sm hover:bg-[#4a64eb]"
        >
          {resetBusy ? "Resetting..." : "Reset Balance"}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        {/* Left board */}
        <div className="min-w-0 overflow-hidden rounded-[3px] bg-white">
          <div className="grid grid-cols-4">
            {SUITS.map((s) => (
              <div key={s.suit}>
                <SuitHeader src={s.headerSrc} alt={s.label} />
              </div>
            ))}
          </div>

          {(["A", "K", "Q", "J"] as Rank[]).map((rank) => (
            <div key={rank}>
              <div className="grid grid-cols-4">
                {SUITS.map((s) => {
                  const key = `${s.suit}-${rank}`;
                  return (
                    <div key={key}>
                      <CardTile
                        rank={rank}
                        suitIconSrc={s.iconSrc}
                        color={s.color}
                        selected={selected === key}
                        onSelect={() => setSelected(key)}
                        name="lucky16-selection"
                        ariaLabel={`Select ${s.label} ${rank}`}
                        showSelector={live?.phase === "betting"}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-4">
                {SUITS.map((s) => (
                  <div key={`${s.suit}-${rank}-val`}>
                    <ValueBar
                      value={payload.boardValues[rank][s.suit]}
                      tone={payload.boardValues[rank][s.suit] > 0 ? "orange" : "gray"}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="flex min-w-0 flex-col">
          <div className="text-center">
            <div className="text-[22px] font-semibold tracking-wide text-gray-900">{payload.timerLabel}</div>
            <div className="mt-1 text-[34px] font-semibold leading-none text-gray-900">
              {payload.timerValue ?? "—"}
            </div>
            <div className="mt-3 text-[14px] text-gray-700">
              <div>Total Expected Collection: {payload.totalExpectedCollection}</div>
              <div>
                Total Expected Payment:
                {payload.totalExpectedPayment == null ? "" : ` ${payload.totalExpectedPayment}`}
              </div>
            </div>
          </div>

          <div className="mt-4 flex min-w-0 items-center gap-3">
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="h-[34px] min-w-0 flex-1 rounded-[3px] border border-gray-300 bg-white px-2 text-[12px] text-gray-900 shadow-sm outline-none focus:border-blue-500"
            >
              <option value="0">0</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {live?.pending_manual ? (
            <div className="mt-3 rounded-[3px] border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] text-amber-900">
              Locked manual winner:{" "}
              <span className="font-semibold">{live.pending_manual.win_card}</span> (reward{" "}
              {live.pending_manual.reward}) — applied at spin; ignores pot selection.
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-center gap-3">
            <input
              type="text"
              disabled
              value={cardCodeFromSelectionKey(selected)}
              title={selectionKeyToWinCard(selected, VARIANT) ?? ""}
              className="h-[34px] w-[62px] rounded-[3px] border border-gray-300 bg-[#E9ECEF] px-2 text-center text-[12px] font-semibold text-gray-900 shadow-sm outline-none disabled:cursor-default disabled:opacity-100"
            />
            <button
              type="button"
              disabled={saveBusy}
              title={getManualSaveButtonTitle(live, saveBusy)}
              onClick={() => void handleSave()}
              className="h-[34px] w-[62px] rounded-[2px] bg-[#2DB45D] text-[12px] font-semibold text-white shadow-sm hover:bg-[#25a354] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveBusy ? "…" : "SAVE"}
            </button>
          </div>
          {saveMsg ? (
            <p className="mt-2 text-center text-[11px] text-gray-600">{saveMsg}</p>
          ) : null}

          <div className="mt-10 overflow-hidden rounded-[3px] border border-gray-200">
            <div className="border-b border-gray-200 bg-white py-2 text-center text-[12px] font-medium text-gray-800">
              Daily Collection &amp; Results
            </div>
            <div className="grid grid-cols-2 bg-white text-[12px]">
              {payload.dailySummaryRows.map((row) => (
                <div key={row.label} className="contents">
                  <div className="border-b border-r border-gray-200 px-3 py-2 text-center text-gray-700">
                    {row.label}
                  </div>
                  <div className="border-b border-gray-200 px-3 py-2 text-right text-gray-900">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3 sm:gap-4 overflow-x-hidden">
            {payload.recentResults.map((r, idx) => {
              const suitMeta = SUITS.find((s) => s.suit === r.suit);
              if (!suitMeta) return null;
              return (
                <MiniResultCard
                  key={`${idx}-${r.suit}-${r.rank}-${r.multiplier}`}
                  suitIconSrc={suitMeta.iconSrc}
                  rank={r.rank}
                  multiplier={r.multiplier}
                  color={suitMeta.color}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
