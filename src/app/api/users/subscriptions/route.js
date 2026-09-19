import { NextResponse } from 'next/server';
import { getUserSubscriptions, createUserSubscription, activateSubscription, getActiveSubscriptionByUserAndProduct, extendSubscription } from '@/lib/db/users.repo';
import { getProductById, getSubscriptionPackageById } from '@/lib/db/products.repo';
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

// POST /api/users/subscriptions
export async function POST(request) {
  const isSandbox = process.env.PAYMENTS_SANDBOX === "true";
  
  // In sandbox mode, allow any logged-in user; otherwise, authors only
  const auth = isSandbox ? await requireUser() : await requireRole('author');
  if (auth instanceof NextResponse) return auth;

  try {
    const { userId, productId, durationDays, productName, amount, paymentToken } = await request.json();

    // Non-authors must use their own userId
    const targetUserId = (auth.role === 'author' && userId) ? userId : auth.userId;

    if (!targetUserId || !productId) {
      return NextResponse.json({ error: 'userId and productId are required' }, { status: 400 });
    }

    console.log(`[API] Creating/extending subscription for user ${targetUserId}, product ${productId}`);

    // Resolve product ID from potential "<productId>-<days>" format
    const rawId = String(productId);
    let actualProductId = rawId;
    let requestedDays = null;
    if (rawId.includes('-')) {
      const lastDashIndex = rawId.lastIndexOf('-');
      actualProductId = Number(rawId.substring(0, lastDashIndex));
      requestedDays = parseInt(rawId.substring(lastDashIndex + 1), 10);
    } else {
      actualProductId = Number(rawId);
    }

    // For non-authors, look up product details from products table (primary) or subscription_packages (fallback)
    let packageDuration, packageName, packageAmount;
    if (auth.role !== 'author') {
      // Try products table first
      const product = await getProductById(actualProductId);
      if (product && product.isActive && !product.isDeleted && product.is_published) {
        packageName = product.name;
        
        // Check if there's a matching plan in the plans JSON
        if (product.plans && Array.isArray(product.plans) && requestedDays) {
          const matchingPlan = product.plans.find(plan => plan.days === requestedDays);
          if (matchingPlan) {
            packageDuration = matchingPlan.days;
            packageAmount = matchingPlan.price;
          } else {
            // Use default product values
            packageDuration = product.duration_days;
            packageAmount = product.price;
          }
        } else {
          // Use default product values
          packageDuration = product.duration_days;
          packageAmount = product.price;
        }
      } else {
        // Fallback to subscription_packages table
        const pkg = await getSubscriptionPackageById(String(actualProductId));
        if (!pkg) {
          return NextResponse.json({ error: 'Package not found' }, { status: 404 });
        }
        packageDuration = pkg.duration_days;
        packageName = pkg.name;
        packageAmount = pkg.price;
      }
    } else {
      // Authors can provide custom values
      packageDuration = durationDays || requestedDays;
      packageName = productName || 'Medical QBank';
      packageAmount = amount || 0;
    }

    // Check for existing active subscription
    const existingSubscription = await getActiveSubscriptionByUserAndProduct(targetUserId, String(actualProductId));
    
    if (existingSubscription) {
      console.log(`[API] Found existing active subscription ${existingSubscription.id}, extending duration by ${packageDuration} days`);
      
      // Extend existing subscription
      const extendedSub = await extendSubscription(existingSubscription.id, packageDuration);
      
      return NextResponse.json({
        ...extendedSub,
        message: 'Subscription extended successfully',
        action: 'extended'
      });
    }

    // No existing subscription, create new one
    console.log(`[API] No existing subscription found, creating new subscription`);
    
    const activeSub = await createUserSubscription({
      userId: targetUserId,
      packageId: String(actualProductId),
      productId: String(actualProductId),
      durationDays: Number(packageDuration),
      productName: packageName,
      amount: Number(packageAmount),
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
