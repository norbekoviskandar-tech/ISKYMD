import { NextResponse } from 'next/server';
import { publishQuestion } from '@/lib/db/questions.repo';
import { requireAdmin } from '@/lib/auth';

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { versionId } = await request.json();
    if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });

    await publishQuestion(versionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Publish question error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
