import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      appName: process.env.NEXT_PUBLIC_APP_NAME || 'Balaji Admin',
      gamesEnabled: false,
    },
  });
}
