import { NextResponse } from 'next/server';
import { getUserProductStats } from '@/lib/db/users.repo';
import { requireUser } from '@/lib/auth';

// GET /api/student/stats?userId=xxx&packageId=xxx
export async function GET(request) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const packageId = searchParams.get('packageId');

    // Users can only view their own stats
    if (userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!userId || !packageId) {
      return NextResponse.json({ error: 'userId and packageId are required' }, { status: 400 });
    }

    const stats = await getUserProductStats(userId, packageId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get student stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch student statistics' }, { status: 500 });
  }
}
