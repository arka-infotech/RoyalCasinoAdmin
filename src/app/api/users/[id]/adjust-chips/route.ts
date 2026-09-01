import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const password = body.password ?? body.adminPassword;
  return proxyToBackend(`/api/users/${id}/adjust-chips`, {
    method: 'POST',
    body: JSON.stringify({
      amount: body.amount,
      type: body.type,
      note: body.note,
      password,
      adminPassword: password,
    }),
  });
}
