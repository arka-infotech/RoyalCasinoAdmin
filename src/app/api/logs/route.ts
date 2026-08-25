import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth';

export async function GET() {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json({ success: false, message: guard.error }, { status: guard.status });
  }

  return NextResponse.json({
    success: true,
    message: 'Activity logs coming soon',
    data: { logs: [] },
  });
}
