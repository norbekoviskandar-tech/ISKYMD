import { NextResponse } from 'next/server';
import * as db from '@/lib/db/index';
import { requireAdmin, getSession } from '@/lib/auth';
import { queryOne } from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // The product catalog is public (the /products page is visible without logging in).
  // Hidden products are only returned to authors.
  let session = null;
  try { session = await getSession(); } catch { session = null; }
  const isAuthor = session?.role === 'author';

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const includeDeleted = searchParams.get('includeDeleted') === 'true' && isAuthor;
    const id = searchParams.get('id');

    if (id) {
      const product = includeDeleted ? await db.getProductByIdIncludeDeleted(id) : await db.getProductById(id);
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

      if (!isAuthor && !(product.isActive && product.is_published)) {
        // Hidden product: only people who already have an active subscription may still load it.
        let allowed = false;
        if (session?.userId) {
          const sub = await queryOne(
            `SELECT id FROM "subscriptions"
             WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT) AND status = 'active' AND "expiresAt" > $2
               AND (CAST("productId" AS TEXT) = CAST($3 AS TEXT) OR CAST("packageId" AS TEXT) = CAST($3 AS TEXT))
             LIMIT 1`,
            [session.userId, new Date().toISOString(), String(id)]
          );
          allowed = !!sub;
        }
        if (!allowed) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(product);
    }

    const products = (type === 'published' || !isAuthor)
      ? await db.getPublishedProducts()
      : await db.getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error('[API Products] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    console.log('[API Products] POST body:', body);
    const product = await db.createProduct(body);
    return NextResponse.json(product);
  } catch (error) {
    console.error('[API Products] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    console.log('[API Products] PUT body:', body);
    const product = await db.updateProduct(body);
    return NextResponse.json(product);
  } catch (error) {
    console.error('[API Products] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await request.json();
    console.log('[API Products] DELETE id:', id);
    const success = await db.deleteProduct(id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('[API Products] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
