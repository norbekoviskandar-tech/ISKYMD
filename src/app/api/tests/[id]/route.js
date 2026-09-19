import { NextResponse } from 'next/server';
import { getTestById } from '@/lib/db/tests.repo';
import { requireUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('packageId');

    // 1. Try to fetch as a Test Attempt first (New behavior)
    const { getTestAttempt } = await import('@/lib/db/tests.repo');
    const attempt = await getTestAttempt(id, auth.role);
    if (attempt) {
      // Authors are exempt from ownership check
      if (auth.role !== 'author' && attempt.userId !== auth.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      console.log(`[API] Returning test attempt ${id}`);
      return NextResponse.json(attempt);
    }

    // 2. Fallback to standard test lookup
    const test = await getTestById(id, auth.role);

    if (!test) {
      return NextResponse.json({ error: 'Test or Attempt not found' }, { status: 404 });
    }

    // Authors are exempt from ownership check
    if (auth.role !== 'author' && test.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error('Get test error:', error);
    return NextResponse.json({ error: 'Failed to get test' }, { status: 500 });
  }
}
