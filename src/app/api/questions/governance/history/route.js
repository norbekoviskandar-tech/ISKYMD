import { NextResponse } from 'next/server';
import { getGovernanceHistory } from '@/lib/db/questions.repo';
import { requireRole } from '@/lib/auth';

export async function GET(request) {
    const auth = await requireRole('author');
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const versionId = searchParams.get('versionId');
        const conceptId = searchParams.get('conceptId');

        if (!versionId && !conceptId) {
            return NextResponse.json({ error: 'versionId or conceptId is required' }, { status: 400 });
        }

        const history = await getGovernanceHistory(versionId, conceptId);
        return NextResponse.json(history);
    } catch (error) {
        console.error('Governance History API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
