import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Admin commission report coming soon',
    data: { report: [] },
  });
}
