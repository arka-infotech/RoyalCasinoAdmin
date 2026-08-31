import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromCookies, requireAdminRole } from '@/lib/auth';
import { proxyToBackend } from '@/lib/backendProxy';
import { writeActivityLog } from '@/lib/activityLog';

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

  const res = await proxyToBackend('/api/admin/stop-game', {
    method: 'POST',
    body: JSON.stringify({ stopped }),
  });

  if (res.status >= 200 && res.status < 300) {
    try {
      const admin = await getAdminFromCookies();
      if (admin) {
        await writeActivityLog(
          req,
          admin,
          stopped
            ? `All games stopped by ${admin.username}`
            : `All games started by ${admin.username}`,
        );
      }
    } catch (logErr) {
      console.error('Failed to write stop-game activity log:', logErr);
    }
  }

  return res;
}
