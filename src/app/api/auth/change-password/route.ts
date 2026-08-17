import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'Change password via user edit for now. Dedicated endpoint coming soon.',
    },
    { status: 501 },
  );
}
