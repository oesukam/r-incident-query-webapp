import { logger } from '@/lib/logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have all log level methods', () => {
    expect(logger).toHaveProperty('trace');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('fatal');
  });

  it('should be callable without throwing errors', () => {
    expect(() => {
      logger.info('Test message');
      logger.debug({ data: 'test' }, 'Test with context');
      logger.error({ error: new Error('test') }, 'Error message');
    }).not.toThrow();
  });

  it('should support child logger creation', () => {
    expect(logger).toHaveProperty('child');
    expect(typeof logger.child).toBe('function');
  });
});
