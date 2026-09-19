import { NextResponse } from 'next/server';
import { getQuestionById } from '@/lib/db/questions.repo';
import { requireUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeAnswers = searchParams.get('includeAnswers') === 'true';
    
    const question = await getQuestionById(id);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // PHASE 2: Hide answers unless explicitly requested (for review mode)
    // Remove correct and explanation fields for active tests
    if (!includeAnswers) {
      const { correct, explanationCorrect, explanationWrong, summary, references, ...sanitizedQuestion } = question;
      return NextResponse.json(sanitizedQuestion, {
        headers: {
          'Cache-Control': 'private, max-age=300'
        }
      });
    }

    // Return full question data including correct and explanation (for review mode)
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
