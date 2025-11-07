import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const clientId = process.env.PHISHLABS_CLIENT_ID;
    const clientSecret = process.env.PHISHLABS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            'Missing API credentials. Please configure PHISHLABS_CLIENT_ID and PHISHLABS_CLIENT_SECRET.',
        },
        { status: 500 }
      );
    }

    const response = await fetch('https://login.phishlabs.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ errorText, status: response.status }, 'Token request failed');
      return NextResponse.json(
        { error: 'Failed to authenticate with Phishlabs API', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error({ error }, 'Token error');
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
