import { NextResponse } from 'next/server';
import { reviseQuestion } from '@/lib/db/questions.repo';
import { requireAdmin } from '@/lib/auth';

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { versionId, userId, notes } = await request.json();
    if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });

    const newDraft = await reviseQuestion(versionId, userId, notes);
    return NextResponse.json(newDraft);
  } catch (error) {
    console.error('Revise question error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
