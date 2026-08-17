import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export async function GET() {
  const res = await proxyToBackend('/api/auth/me');
  // Adapt shape if needed: backend returns { data: { user } }
  return res;
}
