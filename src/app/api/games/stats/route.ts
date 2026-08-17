import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: { totalRounds: 0, totalBets: 0, totalWins: 0, byGame: [] },
  });
}
