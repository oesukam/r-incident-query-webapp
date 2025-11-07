import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const incidentId = searchParams.get('incidentId');

    if (!incidentId) {
      return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 });
    }

    logger.info({ incidentId }, 'Fetching incident details');

    // Get access token
    const tokenResponse = await fetch(`${request.nextUrl.origin}/api/auth/token`, {
      method: 'POST',
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.json(
        { error: 'Failed to authenticate', details: error },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch incident details from Phishlabs API
    const response = await fetch(
      `https://threatintel.phishlabs.com/api/external/incident/${incidentId}/details`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { errorText, status: response.status, incidentId },
        'Incident detail fetch failed'
      );
      return NextResponse.json(
        { error: 'Failed to fetch incident details', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.info({ incidentId }, 'Incident details fetched successfully');

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching incident details');
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
