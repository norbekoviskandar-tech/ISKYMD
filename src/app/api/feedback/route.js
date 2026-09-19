import { NextResponse } from 'next/server';
import { createNotification, createUserFeedback, getFeedback, getUserById, getUserFeedback, getUserUsageSummary } from '@/lib/db/users.repo';
import { requireUser, requireRole } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = Number(searchParams.get('limit') || (userId ? 100 : 200));

    if (userId) {
      // Allow access if userId matches session userId or if caller is author
      if (auth.role !== 'author' && userId !== auth.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      const feedback = await getUserFeedback(userId, limit);
      const usage = await getUserUsageSummary(userId);
      return NextResponse.json({ feedback, usage });
    }

    // List all feedback - authors only
    if (auth.role !== 'author') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const feedback = await getFeedback(limit);
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Feedback GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { userId, message, source = 'portal', questionId = null, testId = null, page = null } = body || {};

    // Users can only submit feedback for themselves
    if (userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cleanMessage = String(message || '').trim();

    if (!userId || !cleanMessage) {
      return NextResponse.json({ error: 'userId and message are required' }, { status: 400 });
    }

    if (cleanMessage.length > 500) {
      return NextResponse.json({ error: 'Feedback is limited to 500 characters' }, { status: 400 });
    }

    const feedback = await createUserFeedback({
      userId,
      message: cleanMessage,
      source,
      questionId,
      testId,
      page
    });

    const user = await getUserById(userId);
    const sourceLabel = source === 'test_session' ? 'Test Session' : source === 'create_test' ? 'Create Test' : 'Portal';
    const questionSuffix = questionId ? ` [QID: ${questionId}]` : '';

    await createNotification(
      'feedback',
      `New feedback from ${user?.name || 'Student'} (${user?.email || userId}) via ${sourceLabel}${questionSuffix}`,
      userId,
      {
        source,
        questionId: questionId ? String(questionId) : null,
        testId: testId ? String(testId) : null,
        page: page || null,
        snippet: cleanMessage.slice(0, 160)
      }
    );

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (error) {
    console.error('Feedback POST error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
