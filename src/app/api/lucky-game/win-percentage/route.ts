import { NextRequest, NextResponse } from "next/server";

import { normalizeGameServerBaseUrl } from "@/lib/gameServerBaseUrl";
import { withGameServerBasePath } from "@/lib/gameServerBasePath";
import { getAdminFromCookies } from "@/lib/auth";
import { writeActivityLog } from "@/lib/activityLog";
import { getAuthToken } from "@/lib/backendProxy";

function resolveBaseUrl() {
  return normalizeGameServerBaseUrl(
    process.env.LUCKY_GAME_SERVER_URL ??
      process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL ??
      process.env.NEXT_PUBLIC_GAME_SOCKET_URL,
  );
}

export async function GET(request: NextRequest) {
  const gameType = request.nextUrl.searchParams.get("gameType");
  const base = resolveBaseUrl();

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

  if (!gameType) {
    return NextResponse.json({ ok: false, error: "gameType required" }, { status: 400 });
  }

  try {
    const url = new URL(
      withGameServerBasePath("/api/admin/lucky-card/win-percentage", process.env.LUCKY_GAME_BASE_PATH ?? process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH),
      base,
    );
    url.searchParams.set("gameType", gameType);

    const token = await getAuthToken();
    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: `Game server returned empty body (${res.status})` },
        { status: 502 },
      );
    }
    const json = JSON.parse(text) as { ok: boolean; winRatePct?: number; [key: string]: unknown };
    // DB stores the actual game win rate. Convert to admin display value: adminValue = 100 - backendValue
    if (json.ok && typeof json.winRatePct === "number") {
      json.winRatePct = 100 - json.winRatePct;
    }
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      { ok: false, error: `Cannot reach game server at ${base}: ${msg}` },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const base = resolveBaseUrl();
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

  try {
    const body = await request.json() as { gameType?: string; winRatePct?: number; [key: string]: unknown };
    const adminValue = typeof body.winRatePct === "number" ? body.winRatePct : Number(body.winRatePct);

    if (!Number.isFinite(adminValue) || adminValue < 0 || adminValue > 100) {
      return NextResponse.json({ ok: false, error: "winRatePct must be between 0 and 100" }, { status: 400 });
    }

    // Convert admin display value to backend storage value: backendValue = 100 - adminValue
    const backendValue = 100 - adminValue;

    const endpoint = withGameServerBasePath(
      "/api/admin/lucky-card/win-percentage",
      process.env.LUCKY_GAME_BASE_PATH ?? process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH,
    );
    const token = await getAuthToken();
    const res = await fetch(`${base}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...body, winRatePct: backendValue }),
      cache: "no-store",
    });
    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: `Game server returned empty body (${res.status})` },
        { status: 502 },
      );
    }

    if (res.ok) {
      const admin = await getAdminFromCookies();
      if (admin) {
        const gameType = body.gameType || 'unknown';
        await writeActivityLog(request, admin, `Admin Win Percentage (${gameType}) set to ${adminValue}% (backend: ${backendValue}%) by ${admin.username}`);
      }
    }

    const json = JSON.parse(text) as { ok: boolean; winRatePct?: number; [key: string]: unknown };
    // Return admin display value (not the backend storage value)
    if (json.ok && typeof json.winRatePct === "number") {
      json.winRatePct = adminValue;
    }
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      { ok: false, error: `Cannot reach game server at ${base}: ${msg}` },
      { status: 502 },
    );
  }
}
