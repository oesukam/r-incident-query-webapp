import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAccessToken } from '@/lib/token-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const incidentId = searchParams.get('incidentId');

    if (!incidentId) {
      return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 });
    }

    logger.info('Fetching incident details', { incidentId });

    // Get access token (uses cache if not expired)
    const accessToken = await getAccessToken();

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
      logger.error('Incident detail fetch failed', {
        errorText,
        status: response.status,
        incidentId,
      });
      return NextResponse.json(
        { error: 'Failed to fetch incident details', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.info('Incident details fetched successfully', { incidentId });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error('Error fetching incident details', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
