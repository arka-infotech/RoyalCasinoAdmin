import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: true, data: { rounds: [], total: 0 } });
}
