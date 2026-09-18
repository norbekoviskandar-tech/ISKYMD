import { NextResponse } from 'next/server';

import { getUserByEmail } from '@/lib/db/users.repo';

import crypto from 'crypto';



function hashPassword(password) {

  return crypto.createHash('sha256').update(password).digest('hex');

}



export async function POST(request) {

  try {

    const { email: rawEmail, password } = await request.json();
    const email = rawEmail?.trim();
    console.log('[API Login] attempting login for:', email);



    if (!email || !password) {

      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    }



    const user = await getUserByEmail(email);

    console.log('[API Login] query result for', email, ':', user ? 'Found' : 'Not Found');

    

    if (!user) {

      // Log all users to see what's in there

      try {

        const { getAllUsers } = await import('@/lib/db/users.repo');

        const allUsers = await getAllUsers();

        console.log('[API Login] Current users in DB:', allUsers.map(u => u.email));

      } catch (e) {}

      

      return NextResponse.json({ error: 'User not found' }, { status: 404 });

    }



    const hash = hashPassword(password);

    if (hash !== user.passwordHash) {

      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

    }



    if (user.isBanned) {

        return NextResponse.json({ error: 'Access Denied: Account Suspended' }, { status: 403 });

    }



    // Don't send passwordHash to client

    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json(safeUser);

  } catch (error) {

    console.error('Login error:', error);

    return NextResponse.json({ error: 'Login failed' }, { status: 500 });

  }

}

