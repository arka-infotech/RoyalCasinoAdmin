import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/db";

const ALLOWED = new Set(["LUCKY_CARD_12"]);
/** DB timestamptz values are stored 5h30m behind the true UTC instant (IST wall clock written as UTC). */
const STORED_TIME_CORRECTION_MS = 5.5 * 60 * 60 * 1000;

function coerceUtcInstant(value: Date | string): Date {
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return new Date(`${s.replace(" ", "T")}Z`);
  }
  return new Date(s);
}

/** Match game-history IST display: correct stored offset, then format in Asia/Kolkata. */
function formatDrawTimeIst(value: Date | string | null): string {
  if (!value) return "";
  const stored = coerceUtcInstant(value);
  if (Number.isNaN(stored.getTime())) return "";
  const actualUtc = new Date(stored.getTime() + STORED_TIME_CORRECTION_MS);
  return actualUtc.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace("T", " ");
}

/**
 * Public — no admin cookie.
 * Reads game_rounds from the admin DB (same source live reports use).
 * GET /api/public/results?gameType=LUCKY_CARD_12&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const gameType = request.nextUrl.searchParams.get("gameType") || "LUCKY_CARD_12";
    if (!ALLOWED.has(gameType)) {
      return NextResponse.json({ ok: false, error: "Invalid gameType" }, { status: 400 });
    }

    const rawLimit = Number(request.nextUrl.searchParams.get("limit") || "20");
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 50);

    const result = await pool.query<{
      win_result: string;
      reward: string | number | null;
      ended_at: Date | string | null;
    }>(
      `SELECT win_result, reward, ended_at
       FROM game_rounds
       WHERE game_type = $1
         AND state = 'done'
         AND win_result IS NOT NULL
       ORDER BY ended_at DESC NULLS LAST
       LIMIT $2`,
      [gameType, limit],
    );

    const results = result.rows.map((r) => {
      const stored = r.ended_at ? coerceUtcInstant(r.ended_at) : null;
      const actualUtc =
        stored && !Number.isNaN(stored.getTime())
          ? new Date(stored.getTime() + STORED_TIME_CORRECTION_MS)
          : null;
      return {
        win_result: r.win_result,
        reward: String(r.reward ?? 0),
        ended_at: actualUtc ? actualUtc.toISOString() : null,
        draw_time: formatDrawTimeIst(r.ended_at),
      };
    });

    return NextResponse.json({ ok: true, gameType, results });
  } catch (error) {
    console.error("Public results error:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
