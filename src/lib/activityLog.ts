import pool from '@/lib/db';
import { AdminTokenPayload } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function writeActivityLog(
  req: NextRequest,
  admin: AdminTokenPayload,
  subject: string,
) {
  try {
    const rawIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '';
    // Normalize IPv6 loopback to IPv4
    const ip = rawIp === '::1' ? '127.0.0.1' : rawIp || null;
    const url = req.url;
    const method = req.method;

    await pool.query(
      `INSERT INTO admin_activity_logs (admin_id, username, subject, url, method, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [admin.id, admin.username, subject, url, method, ip],
    );
  } catch (err) {
    // Non-blocking — log errors to console but never fail the request
    console.error('[activity-log] write error:', (err as Error)?.message ?? err);
  }
}
