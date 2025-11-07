import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const startDate = searchParams.get('CreatedDateFrom');
    const endDate = searchParams.get('CreatedDateTo');
    const brandName = searchParams.get('BrandNames');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '10';
    const threatType = searchParams.get('ThreatTypeCodes');

    logger.info(
      {
        query,
        startDate,
        endDate,
        brandName,
        threatType,
        page,
        pageSize,
      },
      'Searching incidents'
    );

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

    const apiUrl = new URL('https://threatintel.phishlabs.com/api/external/incident/search');
    if (query) {
      apiUrl.searchParams.set('query', query);
    }
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
    logger.info(
      { totalCount: data?.totalCount || data?.items?.length || 0 },
      'Search results retrieved'
    );
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
