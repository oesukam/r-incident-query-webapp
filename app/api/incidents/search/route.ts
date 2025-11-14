import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAccessToken } from '@/lib/token-manager';

export const dynamic = 'force-dynamic';
export const revalidate = false; // Disable caching to allow proper pagination

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const brandName = searchParams.get('brandName');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '10';
    const threatType = searchParams.get('threatType');

    logger.info('Searching incidents', {
      fromDate,
      toDate,
      brandName,
      threatType,
      page,
      pageSize,
    });

    // Get access token (uses cache if not expired)
    const accessToken = await getAccessToken();

    const apiUrl = new URL('https://threatintel.phishlabs.com/api/external/incident/search');
    if (fromDate) {
      apiUrl.searchParams.set('CreatedDateFrom', fromDate);
    }
    if (toDate) {
      apiUrl.searchParams.set('CreatedDateTo', toDate);
    }
    if (brandName && brandName !== 'All Brands') {
      apiUrl.searchParams.append('BrandNames', brandName);
    }
    if (threatType && threatType !== 'All Thread Types') {
      apiUrl.searchParams.append('ThreatTypeCodes', threatType);
    }
    apiUrl.searchParams.set('PageNumber', page);
    apiUrl.searchParams.set('PageSize', pageSize);

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
    logger.info('Search request successful', { status: response.status });

    const data = await response.json();
    const incidentIds = data?.items?.map((item: any) => item.id || item.incidentId) || [];
    logger.info('Search results retrieved', {
      totalCount: data?.totalCount || data?.items?.length || 0,
      page,
      pageSize,
      incidentIds: incidentIds.slice(0, 5), // Log first 5 IDs to verify different pages
      url: apiUrl.toString(),
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
