"use client";

import Image, { type StaticImageData } from "next/image";
import { useCallback, useEffect, useState } from "react";

import iconB from "@/assets/lucky12/iconB.png";
import iconC from "@/assets/lucky12/iconC.png";
import iconF from "@/assets/lucky12/iconF.png";
import iconL from "@/assets/lucky12/iconL.png";
import { LUCKY_GAME_TYPE, type UiSuit } from "@/lib/luckyGameAdmin";

type PublicResultRow = {
  win_result: string;
  reward: string;
  ended_at: string | null;
  draw_time: string;
};

type PublicResultsOk = {
  ok: true;
  gameType: string;
  results: PublicResultRow[];
};

const SUIT_ICON: Record<UiSuit, StaticImageData> = {
  heart: iconL,
  spade: iconB,
  diamond: iconC,
  club: iconF,
};

/** Lucky 12 live UI suit codes. */
const LUCKY_12_SUIT: Record<string, UiSuit> = {
  l: "heart",
  k: "spade",
  c: "diamond",
  f: "club",
};

const POLL_MS = 4000;

/** Shown when the API is unreachable or returns no rows — for local preview. */
const DUMMY_RESULTS: PublicResultRow[] = [
  {
    win_result: "l-13",
    reward: "2",
    ended_at: "2026-07-14T07:45:12.000Z",
    draw_time: "2026-07-14 13:15:12",
  },
  {
    win_result: "k-12",
    reward: "1",
    ended_at: "2026-07-14T07:44:10.000Z",
    draw_time: "2026-07-14 13:14:10",
  },
  {
    win_result: "c-11",
    reward: "3",
    ended_at: "2026-07-14T07:43:05.000Z",
    draw_time: "2026-07-14 13:13:05",
  },
  {
    win_result: "f-13",
    reward: "1",
    ended_at: "2026-07-14T07:42:00.000Z",
    draw_time: "2026-07-14 13:12:00",
  },
  {
    win_result: "l-11",
    reward: "5",
    ended_at: "2026-07-14T07:40:55.000Z",
    draw_time: "2026-07-14 13:10:55",
  },
];

function splitDrawTime(drawTime: string): { date: string; time: string } {
  const trimmed = (drawTime || "").trim();
  if (!trimmed) return { date: "—", time: "—" };
  const [datePart, timePart] = trimmed.split(/\s+/);
  return {
    date: datePart || "—",
    time: timePart || "—",
  };
}

function parseLucky12Result(
  winResult: string,
  reward: string,
): { suit: UiSuit; rankLabel: string; multiplierLabel: string } | null {
  if (!winResult.includes("-")) return null;
  const [bs, br] = winResult.split("-");
  const suit = LUCKY_12_SUIT[bs];
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
    default:
      return null;
  }
  const m = reward != null && reward !== "" ? String(reward) : "0";
  return { suit, rankLabel, multiplierLabel: `${m}X` };
}

function ResultCard({
  suit,
  rankLabel,
}: {
  suit: UiSuit;
  rankLabel: string;
}) {
  const icon = SUIT_ICON[suit];
  return (
    <div className="relative mx-auto h-[88px] w-[68px] shrink-0 rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 text-[15px] font-semibold leading-none text-slate-900">
        <span>{rankLabel}</span>
        <Image src={icon} alt="" width={14} height={14} className="h-[14px] w-[14px] object-contain" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pt-3">
        <Image src={icon} alt="" width={34} height={34} className="h-[34px] w-[34px] object-contain" />
      </div>
    </div>
  );
}

export default function PublicResultPage() {
  const [rows, setRows] = useState<PublicResultRow[]>(DUMMY_RESULTS);
  const [usingDummy, setUsingDummy] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const gameType = LUCKY_GAME_TYPE["12"];
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(
        `${base}/api/public/results?gameType=${encodeURIComponent(gameType)}&limit=20`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as PublicResultsOk | { ok: false; error?: string };
      if (res.ok && data.ok && data.results?.length) {
        setRows(data.results);
        setUsingDummy(false);
      } else {
        setRows(DUMMY_RESULTS);
        setUsingDummy(true);
      }
      setUpdatedAt(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch {
      setRows(DUMMY_RESULTS);
      setUsingDummy(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResults();
    const t = setInterval(() => void fetchResults(), POLL_MS);
    return () => clearInterval(t);
  }, [fetchResults]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-stone-50 to-amber-50/40 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Lucky 12</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Results
          </h1>
          <p className="mt-2 text-sm text-slate-600">Winning card, multiplier, and draw time</p>
        </header>

        {usingDummy ? (
          <p className="mb-4 text-center text-xs font-medium text-amber-700">
            Showing sample data
          </p>
        ) : null}

        {updatedAt ? (
          <p className="mb-4 text-center text-xs text-slate-500">Updated {updatedAt}</p>
        ) : null}

        {loading && rows.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Loading results…</p>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-3 text-left">No</th>
                <th className="border-b border-r border-slate-200 px-3 py-3 text-center">Result</th>
                <th className="border-b border-r border-slate-200 px-3 py-3 text-center">Multiplier</th>
                <th className="border-b border-r border-slate-200 px-3 py-3 text-left">Date</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const parsed = parseLucky12Result(row.win_result, row.reward);
                const { date, time } = splitDrawTime(row.draw_time);
                return (
                  <tr
                    key={`${row.ended_at ?? i}-${row.win_result}-${row.reward}`}
                    className="odd:bg-white even:bg-slate-50/60"
                  >
                    <td className="border-b border-r border-slate-200 px-3 py-3 align-middle tabular-nums text-slate-700">
                      {i + 1}
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-3 align-middle">
                      {parsed ? (
                        <ResultCard suit={parsed.suit} rankLabel={parsed.rankLabel} />
                      ) : (
                        <span className="block text-center font-medium text-slate-800">
                          {row.win_result}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-3 align-middle text-center text-base font-semibold tabular-nums text-slate-900">
                      {parsed?.multiplierLabel ?? `${row.reward}X`}
                    </td>
                    <td className="border-b border-r border-slate-200 px-3 py-3 align-middle tabular-nums text-slate-700">
                      <time dateTime={row.ended_at ?? undefined}>{date}</time>
                    </td>
                    <td className="border-b border-slate-200 px-3 py-3 align-middle tabular-nums text-slate-700">
                      <time dateTime={row.ended_at ?? undefined}>{time}</time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
