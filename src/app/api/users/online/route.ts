import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backendProxy';

/** All retailer/user rows with live is_online flag (client filters online vs offline). */
export async function GET() {
  try {
    const res = await backendFetch('/api/users?role=retailer,user&limit=500');
    const data = await res.json();
    if (!res.ok || !data.success) {
      return NextResponse.json(data, { status: res.status });
    }

    const users = data.data?.users ?? [];

    return NextResponse.json({ success: true, data: { users } });
  } catch (error) {
    console.error('Online users proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Backend unavailable' },
      { status: 503 },
    );
  }
}
