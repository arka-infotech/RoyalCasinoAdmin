import { NextRequest } from 'next/server';
import { getAdminFromCookies } from '@/lib/auth';
import { proxyToBackend } from '@/lib/backendProxy';
import { writeActivityLog } from '@/lib/activityLog';

export async function GET() {
  return proxyToBackend('/api/admin/game-settings');
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    updates?: Array<{ gameId: string; winRatePct: number }>;
  };

  const res = await proxyToBackend('/api/admin/game-settings/bulk', {
    method: 'POST',
    body: JSON.stringify({ updates: body.updates ?? [] }),
  });

  if (res.status >= 200 && res.status < 300 && body.updates?.length) {
    const admin = await getAdminFromCookies();
    if (admin) {
      const summary = body.updates
        .map((u) => `${u.gameId}=${u.winRatePct}%`)
        .join(', ');
      await writeActivityLog(
        req,
        admin,
        `Game win rates updated (${summary}) by ${admin.username}`,
      );
    }
  }

  return res;
}
