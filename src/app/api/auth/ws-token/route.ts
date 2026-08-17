import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, getAdminFromCookies } from '@/lib/auth';

/** Returns JWT for browser Socket.IO auth (httpOnly cookie → client handshake). */
export async function GET() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'No token' }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: { token } });
}
