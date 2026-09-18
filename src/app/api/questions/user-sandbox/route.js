import { NextResponse } from 'next/server';
import { getUserQuestions, resetUserQuestions } from '@/lib/db/questions.repo';
import { requireAdmin } from '@/lib/auth';

// GET /api/questions/user-sandbox?userId=xxx&packageId=xxx - Sandbox progress retrieval (admin only)
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const packageId = searchParams.get('packageId');
    
    if (!userId || !packageId) {
      return NextResponse.json({ error: 'userId and packageId required' }, { status: 400 });
    }
    
    const questions = await getUserQuestions(userId, packageId);
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Get sandbox user questions error:', error);
    return NextResponse.json({ error: 'Failed to get sandbox questions' }, { status: 500 });
  }
}

// PUT /api/questions/user-sandbox - Sandbox progress update
export async function PUT(request) {
  try {
    // STRICT ARCHITECTURE: sandbox endpoint is kept for compatibility but does not persist.
    const body = await request.json().catch(() => ({}));
    console.warn('[DEPRECATED] PUT /api/questions/user-sandbox called. No-op under attempt-based architecture.', {
      userId: body?.userId,
      questionId: body?.questionId,
      packageId: body?.packageId
    });
    return NextResponse.json({ success: true, deprecated: true });
  } catch (error) {
    console.error('Update sandbox question error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE /api/questions/user-sandbox - Sandbox progress reset (admin only)
export async function DELETE(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    
    await resetUserQuestions(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset sandbox user questions error:', error);
    return NextResponse.json({ error: 'Failed to reset sandbox' }, { status: 500 });
  }
}
