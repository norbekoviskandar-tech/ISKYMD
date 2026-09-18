import { NextResponse } from 'next/server';
import { updateAttemptAnswer, updateAttemptFlag, snapshotAttempt, finishAttempt, updateAttemptReviewMetadata, getTestAttempt } from '@/lib/db/tests.repo';
import { requireUser } from '@/lib/auth';

export async function PATCH(request, { params }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { type, questionId, selectedOption, isFlagged, reviewMetadata, secondsToAdd } = body;

    // Verify the attempt belongs to the user
    const attempt = await getTestAttempt(id);
    if (attempt && attempt.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (type === 'review') {
      await updateAttemptReviewMetadata(id, reviewMetadata);
      return NextResponse.json({ success: true });
    }

    if (type === 'answer') {
      if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 });
      await updateAttemptAnswer(id, questionId, selectedOption);
      return NextResponse.json({ success: true });
    }

    if (type === 'flag') {
      if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 });
      await updateAttemptFlag(id, questionId, isFlagged);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid update type' }, { status: 400 });
  } catch (error) {
    console.error('Update attempt error:', error);
    return NextResponse.json({ error: 'Failed to update attempt' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { type, snapshot } = body || {};

    // Verify the attempt belongs to the user
    const attempt = await getTestAttempt(id);
    if (attempt && attempt.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (type === 'snapshot') {
      if (!snapshot) return NextResponse.json({ error: 'snapshot required' }, { status: 400 });
      await snapshotAttempt(id, snapshot);
      return NextResponse.json({ success: true });
    }

    if (type === 'finish') {
      if (!snapshot) {
        return NextResponse.json({ error: 'snapshot required before finish' }, { status: 400 });
      }

      try {
        await snapshotAttempt(id, snapshot);
      } catch (error) {
        const message = String(error?.message || '');
        if (!message.toLowerCase().includes('already finished')) {
          throw error;
        }
      }

      try {
        await finishAttempt(id);
      } catch (error) {
        const message = String(error?.message || '');
        if (!message.toLowerCase().includes('already')) {
          throw error;
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  } catch (error) {
    console.error('Post attempt error:', error);
    return NextResponse.json({ error: 'Failed to process attempt operation' }, { status: 500 });
  }
}
