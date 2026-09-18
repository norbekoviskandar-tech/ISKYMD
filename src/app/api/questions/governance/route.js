import { NextResponse } from 'next/server';
import { 
    submitQuestionForReview, 
    approveQuestion, 
    publishQuestion, 
    deprecateQuestion,
    getQuestionById
} from '@/lib/db/questions.repo';
import { requireAdmin } from '@/lib/auth';

/**
 * Unified POST endpoint for all question governance state transitions.
 * Body: { action, versionId, userId, notes }
 */
export async function POST(request) {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    // ✅ Define action in outer scope so catch can safely access it
    let action = "UNKNOWN";

    try {
        const body = await request.json();
        const { versionId, userId, notes } = body;
        action = body.action;

        if (!action || !versionId) {
            return NextResponse.json(
                { error: 'action and versionId are required' }, 
                { status: 400 }
            );
        }

        // Validate userId for governance actions
        if (!userId) {
            console.warn(`Governance API: Missing userId for action '${action}' on version ${versionId}`);
            return NextResponse.json(
                { error: 'userId is required for governance actions' }, 
                { status: 400 }
            );
        }

        const question = await getQuestionById(versionId);
        if (!question) {
            return NextResponse.json(
                { error: 'Question version not found' }, 
                { status: 404 }
            );
        }

        let result = false;

        switch (action) {
            case 'submit':
                result = await submitQuestionForReview(versionId, userId, notes);
                break;

            case 'approve':
                result = await approveQuestion(versionId, userId, notes);
                break;

            case 'publish':
                result = await publishQuestion(versionId, userId, notes);
                break;

            case 'deprecate':
                result = await deprecateQuestion(versionId, userId, notes);
                break;

            case 'archive':
                return NextResponse.json(
                    { error: 'Archival is handled automatically via publication logic' }, 
                    { status: 400 }
                );

            default:
                return NextResponse.json(
                    { error: `Invalid governance action: ${action}` }, 
                    { status: 400 }
                );
        }

        // Optional safety check
        if (!result) {
            throw new Error(`Governance action failed: ${action}`);
        }

        return NextResponse.json({ 
            success: true, 
            action, 
            versionId 
        });

    } catch (error) {

        // ✅ Will never crash again
        console.error(`Governance API Error [${action}]:`, error);

        return NextResponse.json(
            { error: error.message || 'Governance API failure' }, 
            { status: 500 }
        );
    }
}
