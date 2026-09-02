import { backendFetch } from '@/lib/backendProxy';

/** Record a Next-only panel action on the backend audit log. Never throws. */
export async function recordPanelActivity(
  action: string,
  extra?: {
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
  },
) {
  try {
    const res = await backendFetch('/api/admin/activity-logs', {
      method: 'POST',
      body: JSON.stringify({
        action,
        targetType: extra?.targetType,
        targetId: extra?.targetId,
        details: extra?.details,
      }),
    });
    if (!res.ok) {
      console.error('[activity-log] record failed:', res.status);
    }
  } catch (err) {
    console.error('[activity-log] record failed:', err instanceof Error ? err.message : err);
  }
}
