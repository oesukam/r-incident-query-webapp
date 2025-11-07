import { logger } from '@/lib/logger';
import { createHmac } from 'crypto';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Verifies username and password against environment variables
 */
export function verifyCredentials(username: string, password: string): boolean {
  const validUsername = process.env.AUTH_USERNAME;
  const validPassword = process.env.AUTH_PASSWORD;

  if (!validUsername || !validPassword) {
    logger.error('Auth credentials not configured in environment variables');
    return false;
  }

  const isValid = username === validUsername && password === validPassword;

  if (isValid) {
    logger.info('Successful authentication', { username });
  } else {
    logger.warn('Failed authentication attempt', { username });
  }

  return isValid;
}

/**
 * Gets or generates a secret key for signing sessions
 */
function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET || 'default-secret-change-in-production';
  if (secret === 'default-secret-change-in-production' && process.env.NODE_ENV === 'production') {
    logger.warn('Using default session secret in production - please set SESSION_SECRET');
  }
  return secret;
}

/**
 * Creates a signed session token containing username and expiration
 */
export function createSession(username: string): string {
  const expiresAt = Date.now() + SESSION_DURATION;
  const payload = JSON.stringify({ username, expiresAt });
  const signature = createHmac('sha256', getSecretKey()).update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${signature}`).toString('base64');

  logger.info('Session created', { username, expiresAt: new Date(expiresAt).toISOString() });
  return token;
}

/**
 * Validates a session token and checks expiration
 */
export function validateSession(token: string): boolean {
  try {
    if (!token) {
      return false;
    }

    // Decode token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [payload, signature] = decoded.split('.');

    if (!payload || !signature) {
      logger.debug('Invalid token format', { hasPayload: !!payload, hasSignature: !!signature });
      return false;
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', getSecretKey()).update(payload).digest('hex');
    if (signature !== expectedSignature) {
      logger.warn('Invalid token signature');
      return false;
    }

    // Parse payload and check expiration
    const data = JSON.parse(payload);
    const now = Date.now();

    if (now > data.expiresAt) {
      logger.info('Session expired', { username: data.username, expiresAt: data.expiresAt, now });
      return false;
    }

    logger.debug('Session validated', { username: data.username });
    return true;
  } catch (error) {
    logger.error('Session validation error', { error, token: token?.substring(0, 20) });
    return false;
  }
}

/**
 * Gets session information from token
 */
export function getSession(token: string): { username: string; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [payload] = decoded.split('.');

    if (!payload) {
      return null;
    }

    const data = JSON.parse(payload);

    // Check if expired
    if (Date.now() > data.expiresAt) {
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Get session error', { error });
    return null;
  }
}
