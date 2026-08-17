import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(`/api/users/${id}`);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  // Map admin form fields → backend PATCH shape
  const payload: Record<string, unknown> = {};
  if (body.email !== undefined) payload.email = body.email;
  if (body.password) payload.password = body.password;
  if (body.commissionRate !== undefined) payload.commissionRate = body.commissionRate;
  if (body.creditBalance !== undefined) payload.creditBalance = body.creditBalance;
  if (body.isBlocked !== undefined) payload.isBlocked = body.isBlocked;

  return proxyToBackend(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return PUT(req, ctx);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Soft-delete via block until hard delete exists on backend
  return proxyToBackend(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isBlocked: true }),
  });
}
