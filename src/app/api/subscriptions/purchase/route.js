import { NextResponse } from 'next/server';
import { createUserSubscription, activateSubscription, getActiveSubscriptionByUserAndProduct, extendSubscription } from '@/lib/db/users.repo';
import { getProductById, getSubscriptionPackageById } from '@/lib/db/products.repo';
import { requireUser } from '@/lib/auth';

// POST /api/subscriptions/purchase
// Body: { userId: 'xxx', cart: [{ id: packageId, title: 'Name', duration: 90, ... }] }
export async function POST(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { userId, cart } = await request.json();

    // Users can only purchase for themselves
    if (userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!userId || !cart || !Array.isArray(cart)) {
      return NextResponse.json({ error: 'userId and cart are required' }, { status: 400 });
    }

    const results = [];

    for (const item of cart) {
      const packageId = item.id;

      console.log(`[Purchase API] Processing item: packageId=${packageId}`);

      // Resolve product ID from potential "<productId>-<days>" format
      const rawId = String(packageId);
      let actualProductId = rawId;
      let requestedDays = null;
      if (rawId.includes('-')) {
        const lastDashIndex = rawId.lastIndexOf('-');
        actualProductId = Number(rawId.substring(0, lastDashIndex));
        requestedDays = parseInt(rawId.substring(lastDashIndex + 1), 10);
      } else {
        actualProductId = Number(rawId);
      }

      // Look up product details from products table (primary) or subscription_packages (fallback)
      let durationDays, productName, amount;
      const product = await getProductById(actualProductId);
      if (product && product.isActive && !product.isDeleted && product.is_published) {
        productName = product.name;
        
        // Check if there's a matching plan in the plans JSON
        if (product.plans && Array.isArray(product.plans) && requestedDays) {
          const matchingPlan = product.plans.find(plan => plan.days === requestedDays);
          if (matchingPlan) {
            durationDays = matchingPlan.days;
            amount = matchingPlan.price;
          } else {
            // Use default product values
            durationDays = product.duration_days;
            amount = product.price;
          }
        } else {
          // Use default product values
          durationDays = product.duration_days;
          amount = product.price;
        }
      } else {
        // Fallback to subscription_packages table
        const pkg = await getSubscriptionPackageById(String(actualProductId));
        if (!pkg) {
          return NextResponse.json({ error: `Package ${packageId} not found` }, { status: 404 });
        }
        durationDays = pkg.duration_days;
        productName = pkg.name;
        amount = pkg.price;
      }

      console.log(`[Purchase API] Package found: ${productName}, duration=${durationDays}, price=${amount}`);

      // Check for existing active subscription
      const existingSubscription = await getActiveSubscriptionByUserAndProduct(userId, String(actualProductId));
      
      if (existingSubscription) {
        console.log(`[Purchase API] Found existing active subscription ${existingSubscription.id}, extending`);
        
        // Extend existing subscription
        const extendedSub = await extendSubscription(existingSubscription.id, durationDays);
        results.push({
          ...extendedSub,
          action: 'extended',
          message: 'Subscription extended successfully'
        });
      } else {
        console.log(`[Purchase API] No existing subscription, creating new one`);
        
        // Create new subscription
        const sub = await createUserSubscription({
          userId,
          packageId: String(actualProductId),
          productId: String(actualProductId),
          durationDays,
          productName,
          amount
        });

        // In this sandbox environment, we activate it immediately
        const activeSub = await activateSubscription(sub.id);
        results.push({
          ...activeSub,
          action: 'created',
          message: 'Subscription created successfully'
        });
      }
    }

    return NextResponse.json({ success: true, subscriptions: results });
  } catch (error) {
    console.error('Purchase API error:', error);
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
  }
}
