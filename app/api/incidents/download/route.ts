import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAccessToken } from '@/lib/token-manager';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    logger.info({ documentId }, 'Downloading document');

    // Get access token (uses cache if not expired)
    const accessToken = await getAccessToken();

    const response = await fetch(
      `https://threatintel.phishlabs.com/api/external/file/document/${documentId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ errorText, status: response.status, documentId }, 'File download failed');
      return NextResponse.json(
        { error: 'Failed to download file', details: errorText },
        { status: response.status }
      );
    }

    // Return the raw file content for the frontend to parse
    const fileContent = await response.text();
    logger.info({ documentId, contentLength: fileContent.length }, 'File downloaded successfully');

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Download error');
    return NextResponse.json(
      { error: 'Internal server error during file download' },
      { status: 500 }
    );
  }
}
