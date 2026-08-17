import { NextResponse } from 'next/server';

/** Stub — credit transfer not yet on RoyalCasinoBackend. Use adjust-chips for funding. */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'Credit transfer will be enabled after wallet transfer API is added. Use Adjust Chips for now.',
    },
    { status: 501 },
  );
}
