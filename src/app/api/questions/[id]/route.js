import { NextResponse } from 'next/server';
import { getQuestionById } from '@/lib/db/questions.repo';
import { requireSubscription } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const question = await getQuestionById(id);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const auth = await requireSubscription(question.productId || question.packageId);
    if (auth instanceof NextResponse) return auth;

    // Remove answer fields for non-authors
    if (auth.role !== 'author') {
      const { correct, explanationCorrect, explanationWrong, summary, references, ...sanitizedQuestion } = question;
      return NextResponse.json(sanitizedQuestion, {
        headers: {
          'Cache-Control': 'private, max-age=300'
        }
      });
    }

    return NextResponse.json(question, {
      headers: {
        'Cache-Control': 'private, max-age=300'
      }
    });
  } catch (error) {
    console.error('Get question by ID error:', error);
    return NextResponse.json({ error: 'Failed to get question' }, { status: 500 });
  }
}
