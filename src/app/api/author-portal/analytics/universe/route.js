import { NextResponse } from 'next/server';
import { getProductUniverseAnalytics } from '@/lib/db/products.repo';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('packageId');
    
    if (!packageId) {
      return NextResponse.json({ error: 'packageId required' }, { status: 400 });
    }
    
    const analytics = await getProductUniverseAnalytics(packageId);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Universe analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch universe analytics' }, { status: 500 });
  }
}
