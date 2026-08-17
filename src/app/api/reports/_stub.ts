import { NextResponse } from 'next/server';

function stub(message: string) {
  return NextResponse.json({ success: false, message, data: { report: [], rows: [], logs: [] } }, { status: 200 });
}

export async function GET() {
  return stub('This report is not wired to RoyalCasinoBackend yet. Use Turnover Report for now.');
}

export async function POST() {
  return stub('Not available yet.');
}
