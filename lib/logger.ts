// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Determine the log level based on environment
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.LOG_LEVEL || 'info';
  }
  return process.env.LOG_LEVEL || 'debug';
};

// Simple custom logger for server-side (no worker threads, no pino-pretty)
const createServerLogger = () => {
  const logLevel = getLogLevel();
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  const currentLevelIndex = levels.indexOf(logLevel);

  const shouldLog = (level: string) => {
    return levels.indexOf(level) >= currentLevelIndex;
  };

  const formatMessage = (level: string, contextOrMessage: unknown, message?: string) => {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);

    if (typeof contextOrMessage === 'string' || contextOrMessage instanceof String) {
      // Simple message: logger.info('message')
      return `[${timestamp}] ${levelStr} ${contextOrMessage}`;
    } else if (message) {
      // Context with message: logger.info({ key: 'value' }, 'message')
      const contextStr = JSON.stringify(contextOrMessage);
      return `[${timestamp}] ${levelStr} ${message} ${contextStr}`;
    } else {
      // Just context: logger.info({ key: 'value' })
      const contextStr = JSON.stringify(contextOrMessage);
      return `[${timestamp}] ${levelStr} ${contextStr}`;
    }
  };

  return {
    trace: (contextOrMessage: unknown, message?: string) => {
      if (shouldLog('trace')) {
        console.debug(formatMessage('trace', contextOrMessage, message));
      }
    },
    debug: (contextOrMessage: unknown, message?: string) => {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', contextOrMessage, message));
      }
    },
    info: (contextOrMessage: unknown, message?: string) => {
      if (shouldLog('info')) {
        console.info(formatMessage('info', contextOrMessage, message));
      }
    },
    warn: (contextOrMessage: unknown, message?: string) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', contextOrMessage, message));
      }
    },
    error: (contextOrMessage: unknown, message?: string) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', contextOrMessage, message));
      }
    },
    fatal: (contextOrMessage: unknown, message?: string) => {
      if (shouldLog('fatal')) {
        console.error(formatMessage('fatal', contextOrMessage, message));
      }
    },
    child: (context: Record<string, unknown>) => {
      // Simple child logger that includes parent context
      const parentLogger = createServerLogger();
      return {
        ...parentLogger,
        trace: (msg: unknown, m?: string) =>
          parentLogger.trace(
            { ...context, ...(typeof msg === 'object' ? msg : {}) },
            m || (typeof msg === 'string' ? msg : '')
          ),
        debug: (msg: unknown, m?: string) =>
          parentLogger.debug(
            { ...context, ...(typeof msg === 'object' ? msg : {}) },
            m || (typeof msg === 'string' ? msg : '')
          ),
        info: (msg: unknown, m?: string) =>
          parentLogger.info(
            { ...context, ...(typeof msg === 'object' ? msg : {}) },
            m || (typeof msg === 'string' ? msg : '')
          ),
        warn: (msg: unknown, m?: string) =>
          parentLogger.warn(
            { ...context, ...(typeof msg === 'object' ? msg : {}) },
            m || (typeof msg === 'string' ? msg : '')
          ),
        error: (msg: unknown, m?: string) =>
          parentLogger.error(
            { ...context, ...(typeof msg === 'object' ? msg : {}) },
            m || (typeof msg === 'string' ? msg : '')
          ),
        fatal: (msg: unknown, m?: string) =>
          parentLogger.fatal(
            { ...context, ...(typeof msg === 'object' ? msg : {}) },
            m || (typeof msg === 'string' ? msg : '')
          ),
      };
    },
  };
};

// Browser-compatible logger fallback
const createBrowserLogger = () => {
  const logLevel = getLogLevel();
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  const currentLevelIndex = levels.indexOf(logLevel);

  const shouldLog = (level: string) => {
    return levels.indexOf(level) >= currentLevelIndex;
  };

  return {
    trace: (...args: unknown[]) => {
      if (shouldLog('trace')) console.debug('[TRACE]', ...args);
    },
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) console.debug('[DEBUG]', ...args);
    },
    info: (...args: unknown[]) => {
      if (shouldLog('info')) console.info('[INFO]', ...args);
    },
    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) console.warn('[WARN]', ...args);
    },
    error: (...args: unknown[]) => {
      if (shouldLog('error')) console.error('[ERROR]', ...args);
    },
    fatal: (...args: unknown[]) => {
      if (shouldLog('fatal')) console.error('[FATAL]', ...args);
    },
    child: () => createBrowserLogger(),
  };
};

// Export the appropriate logger based on environment
export const logger = isBrowser ? createBrowserLogger() : createServerLogger();

// Type-safe logger interface for TypeScript
export type Logger = typeof logger;

// Helper to create child loggers with context
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};
