import { NextResponse } from 'next/server';
import { getUserSubscriptions, createUserSubscription, activateSubscription, getActiveSubscriptionByUserAndProduct, extendSubscription } from '@/lib/db/users.repo';
import { requireUser, requireRole } from '@/lib/auth';

// GET /api/users/subscriptions?userId=xxx
export async function GET(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Non-authors can only view their own subscriptions
    if (auth.role !== 'author' && userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If userId not provided, use session userId
    const targetUserId = userId || auth.userId;

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const subscriptions = await getUserSubscriptions(targetUserId);
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

// POST /api/users/subscriptions (authors only for now)
export async function POST(request) {
  const auth = await requireRole('author');
  if (auth instanceof NextResponse) return auth;

  try {
    const { userId, productId, durationDays, productName, amount, paymentToken } = await request.json();

    if (!userId || !productId || !durationDays) {
      return NextResponse.json({ error: 'userId, productId, and durationDays are required' }, { status: 400 });
    }

    console.log(`[API] Creating/extending subscription for user ${userId}, product ${productId}, amount ${amount}`);

    // Check for existing active subscription
    const existingSubscription = await getActiveSubscriptionByUserAndProduct(userId, productId);
    
    if (existingSubscription) {
      console.log(`[API] Found existing active subscription ${existingSubscription.id}, extending duration by ${durationDays} days`);
      
      // Extend existing subscription
      const extendedSub = await extendSubscription(existingSubscription.id, durationDays);
      
      return NextResponse.json({
        ...extendedSub,
        message: 'Subscription extended successfully',
        action: 'extended'
      });
    }

    // No existing subscription, create new one
    console.log(`[API] No existing subscription found, creating new subscription`);
    
    const activeSub = await createUserSubscription({
      userId,
      packageId: productId,
      durationDays: Number(durationDays),
      productName: productName || 'Medical QBank',
      amount: amount || 0,
      status: 'active'
    });

    // Return full subscription object (including purchaseDate) on success
    return NextResponse.json({
      ...activeSub,
      message: 'Subscription created successfully',
      action: 'created'
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json({ 
      error: 'Failed to create subscription',
      message: error.message 
    }, { status: 500 });
  }
}
