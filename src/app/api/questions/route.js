import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAllQuestions, updateQuestion, createQuestion, deleteQuestion, getQuestionById } from '@/lib/db/questions.repo';
import { execute } from '@/lib/pg';
import { requireSubscription } from '@/lib/auth';

// GET /api/questions?packageId=xxx - Get questions
export async function GET(request) {
  const auth = await requireSubscription();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') || searchParams.get('packageId');
    const includeUnpublished = searchParams.get('includeUnpublished') !== 'false';

    const questions = await getAllQuestions(productId, includeUnpublished);
    
    // Remove correct answers from questions before sending to client
    const sanitizedQuestions = questions.map(q => {
      const { correctAnswer, ...sanitized } = q;
      return sanitized;
    });
    
    return NextResponse.json(sanitizedQuestions);
  } catch (error) {
    console.error('Question GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/questions - Create a new question
export async function POST(req) {
  let body;

  try {
    body = await req.json();
  } catch (e) {
    console.error('Question POST invalid JSON:', e);
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { id, stem, choices, system, subject, topic, packageId, productId, status, tags, conceptId } = body;

    const effectiveProductId = productId || packageId;
    if (!effectiveProductId) {
      console.error('Question POST error: Missing productId/packageId');
      return NextResponse.json({ success: false, error: "Missing productId/packageId - questions must belong to a product" }, { status: 400 });
    }

    if (!stem) {
      console.error('Question POST error: Missing stem');
      return NextResponse.json({ success: false, error: "Missing stem" }, { status: 400 });
    }

    if (!Array.isArray(choices)) {
      console.error('Question POST error: Choices not an array');
      return NextResponse.json({ success: false, error: "Choices must be an array" }, { status: 400 });
    }

    if (!system) {
      console.error('Question POST error: Missing system');
      return NextResponse.json({ success: false, error: "Missing system" }, { status: 400 });
    }

    if (!subject) {
      console.error('Question POST error: Missing subject');
      return NextResponse.json({ success: false, error: "Missing subject" }, { status: 400 });
    }

    const questionId = id || crypto.randomUUID();

    // Check for existing question with the same ID to prevent duplicates
    const existing = await getQuestionById(questionId);
    if (existing) {
      console.warn(`Question POST: ID ${questionId} already exists`);
      return NextResponse.json(
        {
          success: false,
          error: `A question with ID "${questionId}" already exists. Each question must have a unique ID.`
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const effectiveConceptId = conceptId || `concept_${questionId}`;

    // Ensure concept exists
    try {
      await execute(`
        INSERT INTO "question_concepts" (id, "productId", "packageId", system, subject, topic, tags, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [
        effectiveConceptId,
        effectiveProductId.toString(),
        effectiveProductId.toString(),
        system,
        subject,
        topic || 'Mixed',
        JSON.stringify(tags || []),
        now
      ]);
    } catch (conceptErr) {
      console.warn('Concept creation warning:', conceptErr.message);
    }

    // Create the question record
    console.log(`DB: Creating question ${questionId} in product ${effectiveProductId}`);
    await createQuestion({
      ...body,
      id: questionId,
      conceptId: effectiveConceptId,
      createdAt: now,
      updatedAt: now,
      productId: effectiveProductId.toString(),
      packageId: effectiveProductId.toString()
    });

    // Log governance
    try {
      await execute(`
        INSERT INTO "governance_history" ("versionId", "conceptId", "fromState", "toState", "performedBy", "performedAt", notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        questionId,
        effectiveConceptId,
        null,
        status || 'draft',
        'author',
        now,
        'Author manual entry'
      ]);
    } catch (govErr) {
      console.warn('Governance log warning:', govErr.message);
    }

    return NextResponse.json({ 
      success: true, 
      id: questionId,
      conceptId: effectiveConceptId
    }, { status: 201 });

  } catch (err) {
    console.error('Question POST fatal error:', err);

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// PUT /api/questions - Update a question
export async function PUT(request) {
  let body;

  try {
    body = await request.json();
  } catch (e) {
    console.error('Question PUT invalid JSON:', e);
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (!body.id) throw new Error("Missing id for update");
    if (!body.packageId) throw new Error("Missing packageId");
    if (!body.system) throw new Error("Missing system");
    if (!body.subject) throw new Error("Missing subject");

    const updated = await updateQuestion(body.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Question not found or update failed" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...updated });

  } catch (err) {
    console.error('Question PUT error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// DELETE /api/questions - Delete a question
export async function DELETE(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
    }

    await deleteQuestion(id);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Question DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
