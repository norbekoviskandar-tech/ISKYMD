import { NextResponse } from "next/server";
import { getTestById } from "@/lib/db/tests.repo";
import { requireAdmin } from "@/lib/auth";

export async function GET(req, { params }) {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id: testId } = await params;
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || searchParams.get('packageId');

    if (!productId) {
        return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    try {
        const test = await getTestById(testId, 'author');
        if (!test) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // Forensics Replay requires the sessionState logs
        const logs = test.sessionState?.logs || [];

        // Enrich logs with question content if needed for replay
        const forensicData = {
            testId: test.testId,
            userId: test.userId,
            packageName: test.packageName,
            mode: test.mode,
            createdAt: test.createdAt,
            totalTime: test.elapsedTime,
            logs: logs,
            questions: test.questions.map(q => ({
                id: q.id,
                correct: q.correct,
                subject: q.subject,
                system: q.system
            }))
        };

        return NextResponse.json(forensicData);
    } catch (e) {
        console.error("Forensics API Error:", e);
        return NextResponse.json({ error: "Failed to fetch forensic data" }, { status: 500 });
    }
}
