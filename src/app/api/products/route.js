import { NextResponse } from 'next/server';
import * as db from '@/lib/db/index';
import { requireAdmin, requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    
    console.log(`[API Products] GET type=${type}, includeDeleted=${includeDeleted}`);
    const id = searchParams.get('id');
    
    if (id) {
      const product = includeDeleted ? await db.getProductByIdIncludeDeleted(id) : await db.getProductById(id);
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json(product);
    }
    
    let products;
    if (type === 'published') {
      products = await db.getPublishedProducts();
    } else {
      products = await db.getAllProducts();
    }
    
    console.log(`[API Products] Found ${products?.length} products`);
    return NextResponse.json(products);
  } catch (error) {
    console.error('[API Products] GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch products', 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
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
