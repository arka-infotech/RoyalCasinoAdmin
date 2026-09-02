import { NextRequest, NextResponse } from "next/server";

import { normalizeGameServerBaseUrl } from "@/lib/gameServerBaseUrl";
import { withGameServerBasePath } from "@/lib/gameServerBasePath";
import { requireAdminRole } from "@/lib/auth";
import { clientForwardHeaders, getAuthToken } from "@/lib/backendProxy";

function resolveBaseUrl() {
  return normalizeGameServerBaseUrl(
    process.env.LUCKY_GAME_SERVER_URL ??
      process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL ??
      process.env.NEXT_PUBLIC_GAME_SOCKET_URL,
  );
}

/** Must match status / manual-result / win-percentage routes (server env-only prefix is common in prod). */
function gameServerBasePath() {
  return process.env.LUCKY_GAME_BASE_PATH ?? process.env.NEXT_PUBLIC_LUCKY_GAME_BASE_PATH;
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

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
    const body = await request.json();
    const endpoint = withGameServerBasePath(
      "/api/admin/lucky-card/reset-balance",
      gameServerBasePath(),
    );
    const token = await getAuthToken();
    const forwarded = await clientForwardHeaders();
    const res = await fetch(`${base}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...forwarded,
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

    const trimmed = text.trimStart();
    if (trimmed.toLowerCase().startsWith("<!doctype") || trimmed.toLowerCase().startsWith("<html")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Game server returned HTML instead of JSON (wrong path or nginx SPA fallback). Ensure LUCKY_GAME_BASE_PATH matches other lucky-game routes and the upstream URL is the Node API.",
        },
        { status: 502 },
      );
    }

    let json: object;
    try {
      json = JSON.parse(text) as object;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid JSON";
      return NextResponse.json(
        { ok: false, error: `Cannot reach game server: ${msg}` },
        { status: 502 },
      );
    }

    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      { ok: false, error: `Cannot reach game server: ${msg}` },
      { status: 502 },
    );
  }
}
