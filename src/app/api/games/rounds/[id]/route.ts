import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAdminFromCookies } from '@/lib/auth';
import { buildSubtreeFilter } from '@/lib/hierarchy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const roundResult = await pool.query('SELECT * FROM game_rounds WHERE id = $1', [id]);
    if (roundResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Round not found' }, { status: 404 });
    }

    const filter = buildSubtreeFilter(admin, 1);
    const subtreeCondition = filter
      ? `AND pb.user_id IN (${filter.inClause})`
      : '';
    const withClause = filter?.cte ?? '';
    const betsParams: unknown[] = filter ? [...filter.params, id] : [id];
    const roundIdIdx = filter ? filter.nextIdx : 1;

    const betsResult = await pool.query(
      `${withClause}
       SELECT pb.id, pb.bet_details, pb.total_bet, pb.win_amount, pb.claimed, pb.created_at,
              u.username
       FROM player_bets pb
       JOIN users u ON u.id = pb.user_id
       WHERE pb.round_id = $${roundIdIdx}
       ${subtreeCondition}
       ORDER BY pb.created_at DESC`,
      betsParams
    );

    return NextResponse.json({
      success: true,
      data: { round: roundResult.rows[0], bets: betsResult.rows },
    });
  } catch (error) {
    console.error('Game round detail error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
