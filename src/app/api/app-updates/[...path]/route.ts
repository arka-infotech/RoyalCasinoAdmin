import { NextRequest, NextResponse } from "next/server";

import { buildGameServerUrl } from "@/lib/gameServerRequest";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!path.length) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  const upstreamUrl = buildGameServerUrl(`/api/updates/${path.join("/")}`);
  if (!upstreamUrl) {
    return NextResponse.json(
      { error: "Game server URL not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(upstreamUrl, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-Upstream-Url": upstreamUrl,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    return NextResponse.json(
      { error: `Cannot reach game server: ${message}` },
      { status: 502 },
    );
  }
}
