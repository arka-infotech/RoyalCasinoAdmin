"use client";

import Image, { type StaticImageData } from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

import allclubs from "@/assets/lucky12/allclubs.png";
import allDiamonds from "@/assets/lucky12/allDiamonds.png";
import allHeart from "@/assets/lucky12/allHeart.png";
import allspades from "@/assets/lucky12/allspades.png";
import iconB from "@/assets/lucky12/iconB.png";
import iconC from "@/assets/lucky12/iconC.png";
import iconF from "@/assets/lucky12/iconF.png";
import iconL from "@/assets/lucky12/iconL.png";

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
  type UiSuit,
} from "@/lib/luckyGameAdmin";

type Rank = "K" | "Q" | "J";

type ResultEntry = {
  suit: UiSuit;
  rank: Rank;
  multiplier: string;
};

type Lucky12Payload = {
  timerLabel: string;
  timerValue: number | null;
  totalExpectedCollection: number;
  totalExpectedPayment?: number | null;
  boardValues: Record<Rank, Record<UiSuit, number>>;
  dailySummaryRows: Array<{ label: string; value: string }>;
  recentResults: ResultEntry[];
};

const SUITS: Array<{
  suit: UiSuit;
  label: string;
  headerSrc: StaticImageData;
  iconSrc: StaticImageData;
  color: "red" | "black";
}> = [
  { suit: "heart", label: "All Heart", headerSrc: allHeart, iconSrc: iconL, color: "red" },
  { suit: "spade", label: "All Spade", headerSrc: allspades, iconSrc: iconB, color: "black" },
  { suit: "diamond", label: "All Diamond", headerSrc: allDiamonds, iconSrc: iconC, color: "red" },
  { suit: "club", label: "All Club", headerSrc: allclubs, iconSrc: iconF, color: "black" },
];

/** Cosmetic preview only (e.g. KH) — unrelated to the backend win_card encoding. */
const SUIT_CARD_SUFFIX: Record<UiSuit, string> = {
  spade: "S",
  club: "C",
  diamond: "D",
  heart: "H",
};

function cardCodeFromSelectionKey(key: string): string {
  const [suit, rank] = key.split("-") as [UiSuit, Rank | undefined];
  if (!suit || !rank) return key;
  const suffix = SUIT_CARD_SUFFIX[suit];
  return suffix ? `${rank}${suffix}` : key;
}

const VARIANT = "12" as const;
const INDIVIDUAL_PAYOUT = 10;

function liveHistoryToResults(entries: string[]): ResultEntry[] {
  const out: ResultEntry[] = [];
  for (const entry of entries) {
    const parsed = parseHistoryEntry(entry);
    if (!parsed || parsed.rankLabel === "A") continue;
    out.push({
      suit: parsed.suit,
      rank: parsed.rankLabel as Rank,
      multiplier: parsed.multiplierLabel,
    });
    if (out.length >= 5) break;
  }
  return out;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SuitHeader({ src, alt }: { src: StaticImageData; alt: string }) {
  return (
    <div className="flex items-center justify-center overflow-hidden bg-[#f3f3f3] py-1">
      <Image
        src={src}
        alt={alt}
        width={110}
        height={90}
        className="h-[65px] w-auto max-w-full object-contain md:h-[44px] lg:h-[70px]"
        priority
      />
    </div>
  );
}

function CardTile({
  rank,
  suitIconSrc,
  selected,
  onSelect,
  name,
  ariaLabel,
  showSelector,
}: {
  rank: Rank;
  suitIconSrc: StaticImageData;
  selected: boolean;
  onSelect: () => void;
  name: string;
  ariaLabel: string;
  showSelector: boolean;
}) {
  return (
    <label className="group flex h-[73px] w-full cursor-pointer items-center justify-start bg-transparent pl-0.5 md:h-[92px] md:justify-center md:pl-0">
      <div className="relative h-[75px] w-[66px] rounded-[2px] border border-gray-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] md:h-[76px] md:w-[62px]">
        {showSelector ? (
          <input
            type="radio"
            name={name}
            checked={selected}
            onChange={onSelect}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 h-[14px] w-[14px] accent-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={ariaLabel}
          />
        ) : null}

        <div className="absolute right-[3px] top-[3px] flex items-center gap-px text-[14px] font-semibold leading-none text-gray-900 md:right-[4px] md:top-[5px] md:gap-[2px] md:text-[11px]">
          <span>{rank}</span>
          <Image
            src={suitIconSrc}
            alt=""
            width={14}
            height={14}
            className="h-[13px] w-[13px] object-contain md:h-[11px] md:w-[11px]"
          />
        </div>

        <div className="absolute left-0 right-0 bottom-0 top-[15px] flex items-center justify-center md:inset-0 md:pt-[6px]">
          <Image
            src={suitIconSrc}
            alt=""
            width={54}
            height={54}
            className="h-[51px] w-[51px] object-contain md:h-[28px] md:w-[28px] lg:h-[34px] lg:w-[34px]"
          />
        </div>
      </div>
    </label>
  );
}

function ValueBar({ value, tone }: { value: number; tone: "orange" | "gray" }) {
  return (
    <div className="bg-[#f3f3f3] p-[2px]">
      <div
        className={cn(
          "flex h-[18px] items-center justify-center rounded-[2px] border border-gray-200 px-0.5 text-[9px] font-medium tabular-nums sm:h-[28px] sm:justify-start sm:px-2 sm:text-[12px]",
          tone === "orange" ? "bg-orange-300/80 text-gray-800" : "bg-white text-gray-600",
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
  suitIconSrc,
}: {
  rank: Rank;
  multiplier: string;
  suitIconSrc: StaticImageData;
}) {
  return (
    <div className="flex items-end gap-0.5 sm:gap-1">
      <div className="relative h-[64px] w-[49px] rounded-[2px] border border-gray-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:h-[56px] sm:w-[44px]">
        <div className="absolute left-[3px] top-[2px] flex items-center gap-px text-[9px] font-semibold leading-none text-gray-900 sm:left-[5px] sm:top-[4px] sm:text-[11px]">
          <span>{rank}</span>
          <Image
            src={suitIconSrc}
            alt=""
            width={11}
            height={11}
            className="h-[9px] w-[9px] object-contain sm:h-[11px] sm:w-[11px]"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pt-[7px] sm:pt-[8px]">
          <Image
            src={suitIconSrc}
            alt=""
            width={24}
            height={24}
            className="h-[22px] w-[22px] object-contain sm:h-[24px] sm:w-[24px]"
          />
        </div>
      </div>
      <div className="pb-px text-[11px] font-semibold text-gray-900 sm:text-[13px]">{multiplier}</div>
    </div>
  );
}

export default function Lucky12Page() {
  useRequireAdmin();
  const [selected, setSelected] = useState<string>("");
  const [multiplier, setMultiplier] = useState<string>("1");
  const [live, setLive] = useState<LuckyGameStatusOk | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const lastRoundIdRef = useRef<string | number | null>(null);

  const refreshLive = useCallback(async () => {
    try {
      const data = await fetchLuckyGameStatus(VARIANT);
      setLive(data.ok ? data : null);
    } catch {
      setLive(null);
    }
  }, []);

  const applyLive = useCallback((data: LuckyGameStatusOk) => {
    setLive(data);
  }, []);

  const { connected: socketConnected } = useLuckyAdminLiveSocket(VARIANT, applyLive);

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

  const payload = useMemo((): Lucky12Payload => {
    const timerLabel = getLuckyTimerLabel(live);
    const timerValue = displaySeconds;
    const recentResults = live?.last_win_cards?.length
      ? liveHistoryToResults(live.last_win_cards)
      : [];

    const boardValues = betTotalsToBoardValues(live?.bet_totals_by_key, VARIANT) as Record<
      Rank,
      Record<UiSuit, number>
    >;

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
    const liveCollection = dp?.collected_pot ?? null;
    const livePayment = dp?.consumed_payout ?? null;
    const gameBalance = dp?.game_balance ?? null;
    const potBalance =
      liveCollection == null || livePayment == null
        ? null
        : Math.round((liveCollection - livePayment + Number.EPSILON) * 100) / 100;

    return {
      timerLabel,
      timerValue,
      totalExpectedCollection: live?.round_stake_total ?? 0,
      totalExpectedPayment,
      boardValues,
      dailySummaryRows: [
        { label: "TOTAL Game Balance:", value: formatAdminMoney(gameBalance) },
        { label: "TOTAL COLLECTION:", value: formatAdminMoney(liveCollection) },
        { label: "TOTAL PAYMENT :", value: formatAdminMoney(livePayment) },
        { label: "BALANCE :", value: formatAdminMoney(potBalance) },
      ],
      recentResults:
        recentResults.length > 0
          ? recentResults
          : [{ suit: "spade", rank: "K", multiplier: "—" }],
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
      const res = await postResetLuckyBalance({ gameType: LUCKY_GAME_TYPE[VARIANT] });
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

  return (
    <section className="rounded-xl border bg-white p-2 shadow-sm md:p-4">
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-[14px] font-medium text-gray-900">Lucky Card 12</h1>
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

      <div className="mt-1.5 grid grid-cols-1 gap-2 sm:mt-2 sm:gap-4 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)] lg:gap-8">
        {/* Left board */}
        <div className="min-w-0 overflow-x-auto rounded-[3px] border border-gray-200 bg-[#f3f3f3] p-[8px] md:overflow-x-hidden md:p-0">
          <div className="flex flex-nowrap justify-center gap-x-[4px] gap-y-[8px] md:grid md:grid-cols-4 md:gap-x-0">
            {SUITS.map((s) => (
              <div key={s.suit} className="w-[70px] shrink-0 border-b-2 border-white md:w-auto md:shrink">
                <SuitHeader src={s.headerSrc} alt={s.label} />
              </div>
            ))}
          </div>

          {(["K", "Q", "J"] as Rank[]).map((rank) => (
            <div key={rank} className="mb-[8px] last:mb-0 md:mb-0">
              <div className="flex flex-nowrap justify-center gap-x-[4px] gap-y-[4px] md:grid md:grid-cols-4 md:gap-x-0">
                {SUITS.map((s) => {
                  const key = `${s.suit}-${rank}`;
                  return (
                    <div
                      key={key}
                      className="w-[70px] shrink-0 border-b-2 border-white bg-[#f3f3f3] md:w-auto md:shrink"
                    >
                      <CardTile
                        rank={rank}
                        suitIconSrc={s.iconSrc}
                        selected={selected === key}
                        onSelect={() => setSelected(key)}
                        name="lucky12-selection"
                        ariaLabel={`Select ${s.label} ${rank}`}
                        showSelector={live?.phase === "betting"}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-nowrap justify-center gap-x-[4px] gap-y-[4px] md:grid md:grid-cols-4 md:gap-x-0">
                {SUITS.map((s) => (
                  <div
                    key={`${s.suit}-${rank}-val`}
                    className="flex w-[70px] shrink-0 justify-center bg-[#f3f3f3] md:block md:w-auto md:shrink"
                  >
                    <div className="w-full max-w-[66px] md:max-w-none">
                      <ValueBar
                        value={payload.boardValues[rank][s.suit]}
                        tone={payload.boardValues[rank][s.suit] > 0 ? "orange" : "gray"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="flex min-w-0 flex-col">
          <div className="text-center">
            <div className="text-[11px] font-semibold tracking-wide text-gray-900 sm:text-[22px]">
              {payload.timerLabel}
            </div>
            <div className="mt-0.5 text-[18px] font-semibold leading-none text-gray-900 tabular-nums sm:mt-1 sm:text-[34px]">
              {payload.timerValue ?? "—"}
            </div>
            <div className="mt-1 text-[10px] leading-snug text-gray-700 sm:mt-2 sm:text-[14px]">
              <div>Total Expected Collection: {payload.totalExpectedCollection}</div>
              <div>
                Total Expected Payment:
                {payload.totalExpectedPayment == null ? "" : ` ${payload.totalExpectedPayment}`}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center sm:mt-3">
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="h-[28px] w-full rounded-[3px] border border-gray-300 bg-white px-2 text-[11px] text-gray-900 shadow-sm outline-none focus:border-blue-500 sm:h-[34px] sm:text-[12px]"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {live?.pending_manual ? (
            <div className="mt-2 rounded-[3px] border border-amber-200 bg-amber-50 px-2 py-1.5 text-center text-[10px] text-amber-900 sm:mt-3 sm:px-3 sm:py-2 sm:text-[11px]">
              Locked manual winner:{" "}
              <span className="font-semibold">{live.pending_manual.win_card}</span> (reward{" "}
              {live.pending_manual.reward}) — applied at spin; ignores pot selection.
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-center gap-2 sm:mt-3 sm:gap-3">
            <input
              type="text"
              disabled
              value={cardCodeFromSelectionKey(selected)}
              title={selectionKeyToWinCard(selected, VARIANT) ?? ""}
              className="h-[28px] w-[56px] rounded-[3px] border border-gray-300 bg-[#E9ECEF] px-1.5 text-center text-[11px] font-semibold text-gray-900 shadow-sm outline-none disabled:cursor-default disabled:opacity-100 sm:h-[34px] sm:w-[62px] sm:px-2 sm:text-[12px]"
            />
            <button
              type="button"
              disabled={saveBusy}
              title={getManualSaveButtonTitle(live, saveBusy)}
              onClick={() => void handleSave()}
              className="h-[28px] w-[56px] rounded-[2px] bg-[#2DB45D] text-[11px] font-semibold text-white shadow-sm hover:bg-[#25a354] disabled:cursor-not-allowed disabled:opacity-50 sm:h-[34px] sm:w-[62px] sm:text-[12px]"
            >
              {saveBusy ? "…" : "SAVE"}
            </button>
          </div>
          {saveMsg ? (
            <p className="mt-1 text-center text-[10px] text-gray-600 sm:text-[11px]">{saveMsg}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap justify-center gap-1.5 overflow-x-hidden sm:mt-3 sm:gap-2">
            {payload.recentResults.map((r, idx) => {
              const suitMeta = SUITS.find((s) => s.suit === r.suit);
              if (!suitMeta) return null;
              return (
                <MiniResultCard
                  key={`${idx}-${r.suit}-${r.rank}-${r.multiplier}`}
                  suitIconSrc={suitMeta.iconSrc}
                  rank={r.rank}
                  multiplier={r.multiplier}
                />
              );
            })}
          </div>

          <div className="mt-2 overflow-hidden rounded-[3px] border border-gray-200 sm:mt-3">
            <div className="border-b border-gray-200 bg-white py-1 text-center text-[11px] font-medium text-gray-800 sm:py-2 sm:text-[12px]">
              Daily Collection &amp; Results
            </div>
            <div className="grid grid-cols-2 bg-white text-[11px] sm:text-[12px]">
              {payload.dailySummaryRows.map((row) => (
                <div key={row.label} className="contents">
                  <div className="border-b border-r border-gray-200 px-2 py-1 text-center text-gray-700 sm:px-3 sm:py-2">
                    {row.label}
                  </div>
                  <div className="border-b border-gray-200 px-2 py-1 text-right text-gray-900 sm:px-3 sm:py-2">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
