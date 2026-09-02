import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth';
import { proxyToBackend } from '@/lib/backendProxy';

export async function GET() {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  return proxyToBackend('/api/admin/stop-game');
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const body = (await req.json()) as { stopped?: boolean };
  const stopped = Boolean(body.stopped);

  return proxyToBackend('/api/admin/stop-game', {
    method: 'POST',
    body: JSON.stringify({ stopped }),
  });
}
