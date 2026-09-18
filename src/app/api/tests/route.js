import { NextResponse } from 'next/server';
import { getUserTests, saveTest, deleteTest, clearUserTests } from '@/lib/db/tests.repo';
import { getEligiblePool, getUniverseSize, getQuestionById } from '@/lib/db/questions.repo';
import { requireUser } from '@/lib/auth';

// GET /api/tests?userId=xxx - Get all tests for a user
export async function GET(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const packageId = searchParams.get('packageId');
    
    // Users can only view their own tests
    if (userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (!userId || !packageId) {
      return NextResponse.json({ error: 'userId and packageId required' }, { status: 400 });
    }
    
    const tests = await getUserTests(userId, packageId);
    return NextResponse.json(tests);
  } catch (error) {
    console.error('Get tests error:', {
      message: error.message,
      stack: error.stack,
      userId: new URL(request.url).searchParams.get('userId'),
      packageId: new URL(request.url).searchParams.get('packageId')
    });
    return NextResponse.json({ error: 'Failed to get tests: ' + error.message }, { status: 500 });
  }
}

// POST /api/tests - Assemble and Save a test
export async function POST(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await request.json();
    
    // Users can only create tests for themselves
    if (data.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (!data.userId || !data.packageId) {
      return NextResponse.json({ error: 'userId and packageId required' }, { status: 400 });
    }

    // 1. Check if we need to ASSEMBLE the test on the server (Preferred)
    let questions = data.questions;
    let universeSize = data.universeSize;
    let eligiblePoolSize = data.eligiblePoolSize;

    if (!questions && data.poolLogic && data.count) {
      // ASSEMBLY ENGINE TRIGGERED
      console.log('Test Assembly Engine: Creating new block...', data.poolLogic);
      
      universeSize = await getUniverseSize(data.packageId);
      const eligibleIds = await getEligiblePool(data.userId, data.packageId, data.poolLogic, data.count);
      eligiblePoolSize = eligibleIds.length;
      
      if (eligiblePoolSize === 0) {
        return NextResponse.json({ error: 'No questions matching these filters are available in your universe.' }, { status: 400 });
      }

      // Snapshot the IDs into the question list
      questions = [];
      for (const id of eligibleIds) {
        const q = await getQuestionById(id);
        if (q) questions.push(q);
      }
      
      // Adjust count if universe was smaller than requested
      if (questions.length < data.count) {
        console.warn(`Requested ${data.count} but only found ${questions.length}`);
      }
    }

    if (!questions || !data.testId) {
      return NextResponse.json({ error: 'testId and question list (or assembly logic) required' }, { status: 400 });
    }

    const testToSave = {
      ...data,
      questions,
      universeSize,
      eligiblePoolSize,
      poolLogic: data.poolLogic || {},
      createdAt: new Date().toISOString()
    };
    
    const saved = await saveTest(testToSave);

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Save test error:', error);
    return NextResponse.json({ error: 'Failed to create test: ' + error.message }, { status: 500 });
  }
}

// DELETE /api/tests - Delete a test or clear all user tests
export async function DELETE(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { testId, userId, clearAll } = await request.json();
    
    // Users can only delete their own tests
    if (userId && userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (clearAll && userId) {
      await clearUserTests(userId);
    } else if (testId) {
      // Verify the test belongs to the user
      const { getTestById } = await import('@/lib/db/tests.repo');
      const test = await getTestById(testId, 'all');
      if (test && test.userId !== auth.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      await deleteTest(testId);
    } else {
      return NextResponse.json({ error: 'testId or userId+clearAll required' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
