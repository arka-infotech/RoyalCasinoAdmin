import { NextRequest } from 'next/server';
import { buildQuery, proxyToBackend } from '@/lib/backendProxy';

export async function GET(req: NextRequest) {
  return proxyToBackend(`/api/reports/transactions${buildQuery(req)}`);
}
