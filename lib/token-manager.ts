import { logger } from '@/lib/logger';

interface TokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiration_time: number;
}

let cachedToken: TokenData | null = null;

/**
 * Gets a valid access token, fetching a new one only if the cached token is expired or doesn't exist.
 * @returns Promise<string> The access token
 * @throws Error if token fetch fails
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Check if we have a valid cached token (with 60 second buffer to avoid edge cases)
  if (cachedToken && cachedToken.expiration_time > now + 60000) {
    const timeUntilExpiry = Math.floor((cachedToken.expiration_time - now) / 1000);
    logger.debug('Using cached token', { timeUntilExpiry });
    return cachedToken.access_token;
  }

  // Token is expired or doesn't exist, fetch a new one
  logger.info('Fetching new access token', {
    reason: cachedToken ? 'expired' : 'no_cached_token',
  });

  try {
    const clientId = process.env.PHISHLABS_CLIENT_ID;
    const clientSecret = process.env.PHISHLABS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing API credentials');
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
      logger.error('Token request failed', { errorText, status: response.status });
      throw new Error(`Failed to authenticate with PhishLabs API: ${errorText}`);
    }

    const data = await response.json();

    // Cache the token with expiration time
    cachedToken = {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expiration_time: now + data.expires_in * 1000,
    };

    logger.info('New token cached', {
      expires_in: data.expires_in,
      expiration_time: new Date(cachedToken.expiration_time).toISOString(),
    });

    return cachedToken.access_token;
  } catch (error) {
    logger.error('Token fetch error', { error });
    // Clear cache on error
    cachedToken = null;
    throw error;
  }
}

/**
 * Clears the cached token. Useful for testing or forcing a token refresh.
 */
export function clearTokenCache(): void {
  logger.debug('Clearing token cache');
  cachedToken = null;
}
