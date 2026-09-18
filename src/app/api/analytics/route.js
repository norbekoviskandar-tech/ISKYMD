import { NextResponse } from 'next/server';
import { getGlobalStats, getEngagementData } from '@/lib/db/products.repo';
import { queryOne } from '@/lib/pg';
import { requireSubscription } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireSubscription();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    const packageId = searchParams.get('packageId');

    // Enforce product-scoping for all analytics (no global stats allowed)
    if (!packageId) {
      return NextResponse.json({ error: 'packageId required - analytics must be product-scoped' }, { status: 400 });
    }

    if (type === 'engagement') {
      const data = await getEngagementData(packageId);
      return NextResponse.json(data);
    }

    if (type === 'cognition') {
      const userId = searchParams.get('userId');
      if (!userId || !packageId) return NextResponse.json({ error: 'Missing userId or packageId' }, { status: 400 });
      
      const profile = await queryOne('SELECT * FROM "student_cognition_profiles" WHERE "userId" = $1 AND "packageId" = $2',
        [userId, packageId.toString()]);
      
      return NextResponse.json(profile || { readinessScore: 0, overthinkingIndex: 0, impulsivityIndex: 0, fatigueFactor: 0 });
    }

    // Default to dashboard stats
    const stats = await getGlobalStats(packageId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
