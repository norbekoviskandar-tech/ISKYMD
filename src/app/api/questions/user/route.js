import { NextResponse } from 'next/server';
import { getUserQuestions, resetUserQuestions } from '@/lib/db/questions.repo';

// GET /api/questions/user?userId=xxx&packageId=xxx - Get questions with user progress
// packageId can be: a number (product id), 'default' (standard qbank), or omitted (standard qbank)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId') || searchParams.get('packageId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    
    // Pass productId to filter questions by product
    const questions = await getUserQuestions(userId, productId);
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Get user questions error:', error);
    return NextResponse.json({ error: 'Failed to get questions' }, { status: 500 });
  }
}

// PUT /api/questions/user - Update user's question progress
export async function PUT(request) {
  try {
    // STRICT ARCHITECTURE:
    // Attempt is the single source of truth. This endpoint is kept for backward compatibility,
    // but does not persist any permanent status/answer/flag.
    const body = await request.json().catch(() => ({}));
    console.warn('[DEPRECATED] PUT /api/questions/user called. No-op under attempt-based architecture.', {
      userId: body?.userId,
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
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    
    await resetUserQuestions(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset user questions error:', error);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
