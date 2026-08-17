import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isBlocked: false }),
  });
}
