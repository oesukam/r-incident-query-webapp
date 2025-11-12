import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAccessToken } from '@/lib/token-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('CreatedDateFrom');
    const endDate = searchParams.get('CreatedDateTo');
    const brandName = searchParams.get('BrandNames');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '10';
    const threatType = searchParams.get('ThreatTypeCodes');

    logger.info('Searching incidents', {
      startDate,
      endDate,
      brandName,
      threatType,
      page,
      pageSize,
    });

    // Get access token (uses cache if not expired)
    const accessToken = await getAccessToken();

    const apiUrl = new URL('https://threatintel.phishlabs.com/api/external/incident/search');
    if (startDate) {
      apiUrl.searchParams.set('CreatedDateFrom', startDate);
    }
    if (endDate) {
      apiUrl.searchParams.set('CreatedDateTo', endDate);
    }
    if (brandName && brandName !== 'All Brands') {
      apiUrl.searchParams.append('BrandNames', brandName);
    }
    if (threatType && threatType !== 'All Thread Types') {
      apiUrl.searchParams.append('ThreatTypeCodes', threatType);
    }
    apiUrl.searchParams.set('page', page);
    apiUrl.searchParams.set('pageSize', pageSize);

    logger.debug({ url: apiUrl.toString() }, 'Making API request');

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ errorText, status: response.status }, 'Search request failed');
      return NextResponse.json(
        { error: 'Failed to search incidents', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.info('Search results retrieved', {
      totalCount: data?.totalCount || data?.items?.length || 0,
    });
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Search error');
    return NextResponse.json({ error: 'Internal server error during search' }, { status: 500 });
  }
}
