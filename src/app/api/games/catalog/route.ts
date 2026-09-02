import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';
import { withoutHiddenGames } from '@/lib/hiddenGames';

export async function GET() {
  const res = await proxyToBackend('/api/games');
  const payload = await res.json();
  const games = withoutHiddenGames(payload?.data?.games ?? []);
  return NextResponse.json({ ...payload, data: { ...payload?.data, games } }, { status: res.status });
}
