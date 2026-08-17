import { AdminTokenPayload } from '@/lib/auth';

export interface SubtreeFilter {
  cte: string;       // "WITH RECURSIVE subtree AS (...)"
  inClause: string;  // "SELECT id FROM subtree" — for use in IN(...)
  params: unknown[]; // [admin.id]
  nextIdx: number;   // Next available $N (always startIdx + 1)
}

/**
 * Builds a PostgreSQL recursive CTE that selects all user IDs in the
 * logged-in admin's subtree (including themselves).
 *
 * Returns null for admin role — callers skip the filter entirely.
 *
 * Usage:
 *   const filter = buildSubtreeFilter(admin, 1);
 *   let idx = filter ? filter.nextIdx : 1;
 *   const conditions: string[] = [];
 *   const params: unknown[] = [];
 *   if (filter) conditions.push(`target_col IN (${filter.inClause})`);
 *   // add other conditions using idx...
 *   const allParams = filter ? [...filter.params, ...params] : params;
 *   const withClause = filter?.cte ?? '';
 *   const sql = `${withClause} SELECT ... WHERE ${conditions.join(' AND ')}`;
 */
export function buildSubtreeFilter(
  admin: AdminTokenPayload,
  startIdx: number = 1
): SubtreeFilter | null {
  if (admin.role === 'admin') return null;

  const cte = `
WITH RECURSIVE subtree AS (
  SELECT id FROM users WHERE id = $${startIdx}
  UNION ALL
  SELECT u.id FROM users u
  INNER JOIN subtree s ON u.parent_id = s.id
)`;

  return {
    cte,
    inClause: 'SELECT id FROM subtree',
    params: [admin.id],
    nextIdx: startIdx + 1,
  };
}
