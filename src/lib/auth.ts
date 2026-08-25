import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'royal-casino-dev-secret-change-in-production';
const COOKIE_NAME = 'admin_token';

export interface AdminTokenPayload {
  id: string;
  username: string;
  role: string;
  email?: string;
}

export function signToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export async function getAdminFromCookies(): Promise<AdminTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getAdminFromRequest(req: NextRequest): AdminTokenPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Verifies the caller is logged in AND has the `admin` role. Use at the top of any
 * API route restricted to admin-only sections (Game, Live Reports, Logs Activity) —
 * the middleware only checks that a panel session exists, not which role it is.
 * Returns the admin payload on success, or a ready-to-return 401/403 NextResponse.
 */
export async function requireAdminRole(): Promise<
  { ok: true; admin: AdminTokenPayload } | { ok: false; status: 401 | 403; error: string }
> {
  const admin = await getAdminFromCookies();
  if (!admin) return { ok: false, status: 401, error: 'Unauthorized' };
  if (admin.role !== 'admin') return { ok: false, status: 403, error: 'Admin access required' };
  return { ok: true, admin };
}

export { COOKIE_NAME };
