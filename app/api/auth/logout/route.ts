import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    let username = 'unknown';

    // Get username for logging
    if (sessionToken) {
      const session = getSession(sessionToken);
      if (session) {
        username = session.username;
      }
    }

    const response = NextResponse.json({ success: true });

    // Clear the session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    logger.info('Logout successful', { username });

    return response;
  } catch (error) {
    logger.error('Logout error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
