import { NextRequest, NextResponse } from "next/server";

import { normalizeGameServerBaseUrl } from "@/lib/gameServerBaseUrl";
import { withGameServerBasePath } from "@/lib/gameServerBasePath";
import { getAdminFromCookies } from "@/lib/auth";
import { writeActivityLog } from "@/lib/activityLog";
import { getAuthToken } from "@/lib/backendProxy";

export async function POST(request: NextRequest) {
  const base = normalizeGameServerBaseUrl(
    process.env.LUCKY_GAME_SERVER_URL ??
      process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL ??
      // Backward-compatible fallback to your existing env name.
      process.env.NEXT_PUBLIC_GAME_SOCKET_URL,
  );

  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Set LUCKY_GAME_SERVER_URL / NEXT_PUBLIC_LUCKY_GAME_SERVER_URL (or NEXT_PUBLIC_GAME_SOCKET_URL) in sai-lucky-admin env (e.g. http://localhost:3001)",
      },
      { status: 500 },
    );
  }

  const body = await request.json();
  try {
    const endpoint = withGameServerBasePath(
      "/api/admin/lucky-card/manual-result",
      process.env.LUCKY_GAME_BASE_PATH ?? process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH,
    );
    const token = await getAuthToken();
    const res = await fetch(`${base}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: `Game server returned empty body (${res.status})` },
        { status: 502 },
      );
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Game server returned non-JSON response" },
        { status: 502 },
      );
    }

    if (res.ok) {
      const admin = await getAdminFromCookies();
      if (admin) {
        const gameType = body.gameType || 'unknown';
        const winCard = body.winCard || '-';
        const reward = body.reward ?? '-';
        await writeActivityLog(request, admin, `Admin Manual Result (${gameType}) = [ ${winCard} , ${reward}x ] ${admin.username}`);
      }
    }

    return NextResponse.json(data as object, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      {
        ok: false,
        error: `Cannot reach game server at ${base}: ${msg}`,
      },
      { status: 502 },
    );
  }
}
