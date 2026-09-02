import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth';
import { buildQuery, proxyToBackend } from '@/lib/backendProxy';

export async function GET(req: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ success: false, message: guard.error }, { status: guard.status });
  }

  return proxyToBackend(`/api/admin/activity-logs${buildQuery(req)}`);
}
