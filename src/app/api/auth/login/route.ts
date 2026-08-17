import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';
import { backendFetch } from '@/lib/backendProxy';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await backendFetch('/api/auth/login', {
      method: 'POST',
      token: null,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({
      success: false,
      message: 'Invalid backend response',
    }));

    if (!res.ok || !data.success) {
      return NextResponse.json(data, { status: res.status || 401 });
    }

    const token = data.data?.token as string | undefined;
    const user = data.data?.user;

    if (!token || !user) {
      return NextResponse.json(
        { success: false, message: 'Login response missing token' },
        { status: 502 },
      );
    }

    // Normalize field names for existing AuthProvider UI
    const response = NextResponse.json({
      success: true,
      message: data.message || 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          chips: user.chips,
          creditBalance: user.creditBalance ?? user.credit_balance ?? 0,
          commissionRate: user.commissionRate ?? user.commission_rate ?? 0,
        },
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Backend unavailable. Is RoyalCasinoBackend running on port 3000?' },
      { status: 503 },
    );
  }
}
