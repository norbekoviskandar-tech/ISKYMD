import { NextResponse } from 'next/server';
import { getGlobalStats, getEngagementData } from '@/lib/db/products.repo';
import { queryOne } from '@/lib/pg';
import { requireSubscription } from '@/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'dashboard';
  const packageId = searchParams.get('packageId');

  // Enforce product-scoping for all analytics (no global stats allowed)
  if (!packageId) {
    return NextResponse.json({ error: 'packageId required - analytics must be product-scoped' }, { status: 400 });
  }

  if (type === 'engagement') {
    const auth = await requireSubscription(packageId);
    if (auth instanceof NextResponse) return auth;
    
    const data = await getEngagementData(packageId);
    return NextResponse.json(data);
  }

  if (type === 'cognition') {
    const auth = await requireSubscription(packageId);
    if (auth instanceof NextResponse) return auth;
    
    // Non-authors must use session.userId, ignore userId from URL
    const userId = (auth.role === 'author' && searchParams.get('userId')) 
      ? searchParams.get('userId') 
      : auth.userId;
    
    if (!userId || !packageId) return NextResponse.json({ error: 'Missing userId or packageId' }, { status: 400 });
    
    const profile = await queryOne('SELECT * FROM "student_cognition_profiles" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT) AND CAST("packageId" AS TEXT) = CAST($2 AS TEXT)',
      [userId, packageId.toString()]);
    
    return NextResponse.json(profile || { readinessScore: 0, overthinkingIndex: 0, impulsivityIndex: 0, fatigueFactor: 0 });
  }

  // Default to dashboard stats
  const auth = await requireSubscription(packageId);
  if (auth instanceof NextResponse) return auth;
  
  const stats = await getGlobalStats(packageId);
  return NextResponse.json(stats);
}
