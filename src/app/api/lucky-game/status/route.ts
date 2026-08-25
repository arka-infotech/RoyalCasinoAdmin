import { NextRequest, NextResponse } from "next/server";

import { normalizeGameServerBaseUrl } from "@/lib/gameServerBaseUrl";
import { withGameServerBasePath } from "@/lib/gameServerBasePath";
import { getAuthToken } from "@/lib/backendProxy";
import { requireAdminRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const gameType = request.nextUrl.searchParams.get("gameType");
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

  if (!gameType) {
    return NextResponse.json({ ok: false, error: "gameType required" }, { status: 400 });
  }

  const url = new URL(
    withGameServerBasePath("/api/admin/lucky-card/status", process.env.LUCKY_GAME_BASE_PATH ?? process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH),
    base,
  );
  url.searchParams.set("gameType", gameType);

  try {
    const token = await getAuthToken();
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    return NextResponse.json(data as object, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      {
        ok: false,
        error: `Cannot reach game server at ${base}: ${msg}. Use a full URL with http:// or https://.`,
      },
      { status: 502 },
    );
  }
}
