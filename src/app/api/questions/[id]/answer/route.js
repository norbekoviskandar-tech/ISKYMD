import { NextResponse } from 'next/server';
import { getQuestionById, updateUserQuestion } from '@/lib/db/questions.repo';
import { requireSubscription } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { choice, testId } = body;

    if (choice === undefined || choice === null) {
      return NextResponse.json({ error: 'choice is required' }, { status: 400 });
    }

    const question = await getQuestionById(id);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const auth = await requireSubscription(question.productId || question.packageId);
    if (auth instanceof NextResponse) return auth;

    // Record the answer for the user
    await updateUserQuestion({
      userId: auth.userId,
      questionId: id,
      productId: question.productId || question.packageId,
      selectedAnswer: choice,
      newStatus: choice === question.correct ? 'correct' : 'incorrect',
      timeSpent: 0
    });

    // Return answer details
    const isCorrect = choice === question.correct;
    return NextResponse.json({
      correct: question.correct,
      isCorrect,
      explanationCorrect: question.explanationCorrect,
      explanationWrong: question.explanationWrong,
      summary: question.summary
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}
