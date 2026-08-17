import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  // Backend only needs amount + type (adminPassword check skipped for now / optional later)
  return proxyToBackend(`/api/users/${id}/adjust-chips`, {
    method: 'POST',
    body: JSON.stringify({
      amount: body.amount,
      type: body.type,
      note: body.note,
    }),
  });
}
