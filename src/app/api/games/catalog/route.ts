import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export async function GET() {
  return proxyToBackend('/api/games');
}
