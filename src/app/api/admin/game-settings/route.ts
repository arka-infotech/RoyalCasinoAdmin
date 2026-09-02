import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth';
import { proxyToBackend } from '@/lib/backendProxy';
import { isHiddenGameId, withoutHiddenGames } from '@/lib/hiddenGames';

export async function GET() {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const res = await proxyToBackend('/api/admin/game-settings');
  const payload = await res.json();
  const settings = withoutHiddenGames(payload?.settings ?? []);
  return NextResponse.json({ ...payload, settings }, { status: res.status });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const body = (await req.json()) as {
    updates?: Array<{ gameId: string; winRatePct: number }>;
  };

  const updates = (body.updates ?? []).filter((u) => !isHiddenGameId(u.gameId));

  return proxyToBackend('/api/admin/game-settings/bulk', {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
}
