import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

export function getBackendBaseUrl(): string {
  return (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function backendFetch(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<Response> {
  const { token, headers, ...rest } = init;
  const authToken = token === undefined ? await getAuthToken() : token;
  const url = `${getBackendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has('Content-Type') && rest.body) {
    mergedHeaders.set('Content-Type', 'application/json');
  }
  if (authToken) {
    mergedHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  return fetch(url, {
    ...rest,
    headers: mergedHeaders,
    cache: 'no-store',
  });
}

/** Forward a Next.js API request to RoyalCasinoBackend and return the JSON response. */
export async function proxyToBackend(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<NextResponse> {
  try {
    const res = await backendFetch(path, init);
    const data = await res.json().catch(() => ({
      success: false,
      message: 'Invalid backend response',
    }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Backend proxy error:', path, error);
    return NextResponse.json(
      { success: false, message: 'Backend unavailable. Is RoyalCasinoBackend running?' },
      { status: 503 },
    );
  }
}

export function buildQuery(req: NextRequest): string {
  const qs = req.nextUrl.searchParams.toString();
  return qs ? `?${qs}` : '';
}
