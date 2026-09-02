import { NextRequest, NextResponse } from "next/server";

import { normalizeGameServerBaseUrl } from "@/lib/gameServerBaseUrl";
import { withGameServerBasePath } from "@/lib/gameServerBasePath";
import { requireAdminRole } from "@/lib/auth";
import { clientForwardHeaders, getAuthToken } from "@/lib/backendProxy";

export async function POST(request: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const base = normalizeGameServerBaseUrl(
    process.env.LUCKY_GAME_SERVER_URL ??
      process.env.NEXT_PUBLIC_LUCKY_GAME_SERVER_URL ??
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
    const forwarded = await clientForwardHeaders();
    const res = await fetch(`${base}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
        error: `Cannot reach game server at ${base}: ${msg}`,
      },
      { status: 502 },
    );
  }
}
