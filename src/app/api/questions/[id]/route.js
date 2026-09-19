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
    
    // Remove correct answer before sending to client
    const { correctAnswer, ...sanitizedQuestion } = question;
    return NextResponse.json(sanitizedQuestion);
  } catch (error) {
    console.error('Get question by ID error:', error);
    return NextResponse.json({ error: 'Failed to get question' }, { status: 500 });
  }
}
