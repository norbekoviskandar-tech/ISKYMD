import { NextResponse } from 'next/server';
import { getUserQuestions, resetUserQuestions } from '@/lib/db/questions.repo';
import { requireUser } from '@/lib/auth';

// GET /api/questions/user?userId=xxx&packageId=xxx - Get questions with user progress
// packageId can be: a number (product id), 'default' (standard qbank), or omitted (standard qbank)
export async function GET(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId') || searchParams.get('packageId');
    
    // Use session userId (non-authors), or allow authors to pass userId
    const targetUserId = (auth.role === 'author' && userId) ? userId : auth.userId;
    
    // Pass productId to filter questions by product
    const questions = await getUserQuestions(targetUserId, productId);
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Get user questions error:', error);
    return NextResponse.json({ error: 'Failed to get questions' }, { status: 500 });
  }
}

// PUT /api/questions/user - Update user's question progress
export async function PUT(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    // STRICT ARCHITECTURE:
    // Attempt is the single source of truth. This endpoint is kept for backward compatibility,
    // but does not persist any permanent status/answer/flag.
    const body = await request.json().catch(() => ({}));
    
    // Ignore userId from body for non-authors, use session.userId instead
    // Authors may pass a userId
    const targetUserId = (auth.role === 'author' && body?.userId) ? body.userId : auth.userId;
    
    console.warn('[DEPRECATED] PUT /api/questions/user called. No-op under attempt-based architecture.', {
      userId: targetUserId,
      questionId: body?.questionId,
      productId: body?.productId || body?.packageId,
      hasStatus: body?.status !== undefined,
      hasAnswer: body?.userAnswer !== undefined,
      hasMark: body?.isMarked !== undefined
    });
    return NextResponse.json({ success: true, deprecated: true });
  } catch (error) {
    console.error('Update user question error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update' },
      { status: 500 }
    );
  }
}

// DELETE /api/questions/user - Reset all user question progress
export async function DELETE(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    
    // Ignore userId from body for non-authors, use session.userId instead
    // Authors may pass a userId
    const targetUserId = (auth.role === 'author' && body?.userId) ? body.userId : auth.userId;
    
    await resetUserQuestions(targetUserId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset user questions error:', error);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
