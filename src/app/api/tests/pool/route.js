import { NextResponse } from 'next/server';
import { getEligiblePool, getUniverseSize } from '@/lib/db/questions.repo';
import { requireSubscription } from '@/lib/auth';

/**
 * GET /api/tests/pool?userId=...&packageId=...&filters=...
 * Real-time calculation of eligible question pool before test creation.
 */
export async function POST(request) {
  try {
    const { userId, packageId, filters } = await request.json();
    
    if (!userId || !packageId) {
      return NextResponse.json({ error: 'userId and packageId required' }, { status: 400 });
    }

    const auth = await requireSubscription(packageId);
    if (auth instanceof NextResponse) return auth;

    const universeSize = getUniverseSize(packageId);
    const pool = getEligiblePool(userId, packageId, filters);
    
    return NextResponse.json({
      universeSize,
      eligiblePoolSize: pool.length,
      pool: pool // Return the IDs so the client can preview if needed, or just for count
    });
  } catch (error) {
    console.error('Pool calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate pool' }, { status: 500 });
  }
}
