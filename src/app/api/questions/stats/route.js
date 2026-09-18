import { NextResponse } from 'next/server';
import { updateQuestionStats } from '@/lib/db/questions.repo';
import { query } from '@/lib/pg';
import { requireSubscription } from '@/lib/auth';

// GET /api/questions/stats?packageId=xxx&ids=... - Return product-scoped per-question stats
export async function GET(request) {
  const auth = await requireSubscription();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('packageId');
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);
    if (!packageId || !ids || ids.length === 0) {
      return NextResponse.json({ error: 'packageId and ids required' }, { status: 400 });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const rows = await query(`
      SELECT 
        q.id,
        COUNT(uq.id) as attempts,
        SUM(CASE WHEN uq.status = 'correct' THEN 1 ELSE 0 END) as correct
      FROM "questions" q
      LEFT JOIN "user_questions" uq ON q.id = uq."questionId" 
        AND uq."packageId" = $${ids.length + 1} 
        AND uq."totalAttempts" > 0
      WHERE q.id IN (${placeholders}) AND q."packageId" = $${ids.length + 2}
      GROUP BY q.id
    `, [...ids, packageId.toString(), packageId.toString()]);

    const stats = {};
    rows.forEach(row => {
      stats[row.id] = {
        attempts: row.attempts,
        correct: row.correct || 0
      };
    });
    // Ensure all requested IDs have an entry (even if 0 attempts)
    ids.forEach(id => {
      if (!stats[id]) stats[id] = { attempts: 0, correct: 0 };
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { versionId, stats } = await request.json();
    if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });

    await updateQuestionStats(versionId, stats);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
