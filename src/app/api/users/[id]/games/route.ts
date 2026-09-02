import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';
import { isHiddenGameId, withoutHiddenGameIds, withoutHiddenGames } from '@/lib/hiddenGames';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await proxyToBackend(`/api/users/${id}/games`);
  const payload = await res.json();
  const games = withoutHiddenGames(payload?.data?.games ?? []);
  return NextResponse.json({ ...payload, data: { ...payload?.data, games } }, { status: res.status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { gameIds?: string[]; enabled?: boolean; maxBet?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const incomingIds = Array.isArray(body.gameIds) ? body.gameIds : [];
  const visibleIds = withoutHiddenGameIds(incomingIds);

  if (body.enabled && incomingIds.some(isHiddenGameId) && visibleIds.length === 0) {
    return NextResponse.json(
      { success: false, message: 'Crash / Aviator cannot be assigned' },
      { status: 400 },
    );
  }

  const gameIds = visibleIds.length > 0 ? visibleIds : incomingIds;
  if (gameIds.length === 0) {
    return NextResponse.json({ success: false, message: 'gameIds required' }, { status: 400 });
  }

  return proxyToBackend(`/api/users/${id}/games`, {
    method: 'PUT',
    body: JSON.stringify({ ...body, gameIds }),
  });
}
