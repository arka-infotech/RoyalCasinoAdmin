import { NextRequest } from 'next/server';
import { buildQuery, proxyToBackend } from '@/lib/backendProxy';

export async function GET(req: NextRequest) {
  return proxyToBackend(`/api/users${buildQuery(req)}`);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return proxyToBackend('/api/users', { method: 'POST', body });
}
