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

  const formatMessage = (level: string, messageOrContext: unknown, contextOrMessage?: unknown) => {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);

    if (typeof messageOrContext === 'string' || messageOrContext instanceof String) {
      if (contextOrMessage && typeof contextOrMessage === 'object') {
        // Message with context: logger.info('message', { key: 'value' })
        const contextStr = JSON.stringify(contextOrMessage);
        return `[${timestamp}] ${levelStr} ${messageOrContext} ${contextStr}`;
      } else {
        // Simple message: logger.info('message')
        return `[${timestamp}] ${levelStr} ${messageOrContext}`;
      }
    } else if (typeof contextOrMessage === 'string' || contextOrMessage instanceof String) {
      // Legacy: Context with message: logger.info({ key: 'value' }, 'message')
      const contextStr = JSON.stringify(messageOrContext);
      return `[${timestamp}] ${levelStr} ${contextOrMessage} ${contextStr}`;
    } else {
      // Just context: logger.info({ key: 'value' })
      const contextStr = JSON.stringify(messageOrContext);
      return `[${timestamp}] ${levelStr} ${contextStr}`;
    }
  };

  return {
    trace: (messageOrContext: unknown, contextOrMessage?: unknown) => {
      if (shouldLog('trace')) {
        console.debug(formatMessage('trace', messageOrContext, contextOrMessage));
      }
    },
    debug: (messageOrContext: unknown, contextOrMessage?: unknown) => {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', messageOrContext, contextOrMessage));
      }
    },
    info: (messageOrContext: unknown, contextOrMessage?: unknown) => {
      if (shouldLog('info')) {
        console.info(formatMessage('info', messageOrContext, contextOrMessage));
      }
    },
    warn: (messageOrContext: unknown, contextOrMessage?: unknown) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', messageOrContext, contextOrMessage));
      }
    },
    error: (messageOrContext: unknown, contextOrMessage?: unknown) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', messageOrContext, contextOrMessage));
      }
    },
    fatal: (messageOrContext: unknown, contextOrMessage?: unknown) => {
      if (shouldLog('fatal')) {
        console.error(formatMessage('fatal', messageOrContext, contextOrMessage));
      }
    },
    child: (context: Record<string, unknown>) => {
      // Simple child logger that includes parent context
      const parentLogger = createServerLogger();
      return {
        ...parentLogger,
        trace: (messageOrContext: unknown, contextOrMessage?: unknown) => {
          if (typeof messageOrContext === 'string') {
            const mergedContext = { ...context, ...(contextOrMessage as Record<string, unknown>) };
            parentLogger.trace(messageOrContext, mergedContext);
          } else {
            parentLogger.trace(
              { ...context, ...(messageOrContext as Record<string, unknown>) },
              contextOrMessage
            );
          }
        },
        debug: (messageOrContext: unknown, contextOrMessage?: unknown) => {
          if (typeof messageOrContext === 'string') {
            const mergedContext = { ...context, ...(contextOrMessage as Record<string, unknown>) };
            parentLogger.debug(messageOrContext, mergedContext);
          } else {
            parentLogger.debug(
              { ...context, ...(messageOrContext as Record<string, unknown>) },
              contextOrMessage
            );
          }
        },
        info: (messageOrContext: unknown, contextOrMessage?: unknown) => {
          if (typeof messageOrContext === 'string') {
            const mergedContext = { ...context, ...(contextOrMessage as Record<string, unknown>) };
            parentLogger.info(messageOrContext, mergedContext);
          } else {
            parentLogger.info(
              { ...context, ...(messageOrContext as Record<string, unknown>) },
              contextOrMessage
            );
          }
        },
        warn: (messageOrContext: unknown, contextOrMessage?: unknown) => {
          if (typeof messageOrContext === 'string') {
            const mergedContext = { ...context, ...(contextOrMessage as Record<string, unknown>) };
            parentLogger.warn(messageOrContext, mergedContext);
          } else {
            parentLogger.warn(
              { ...context, ...(messageOrContext as Record<string, unknown>) },
              contextOrMessage
            );
          }
        },
        error: (messageOrContext: unknown, contextOrMessage?: unknown) => {
          if (typeof messageOrContext === 'string') {
            const mergedContext = { ...context, ...(contextOrMessage as Record<string, unknown>) };
            parentLogger.error(messageOrContext, mergedContext);
          } else {
            parentLogger.error(
              { ...context, ...(messageOrContext as Record<string, unknown>) },
              contextOrMessage
            );
          }
        },
        fatal: (messageOrContext: unknown, contextOrMessage?: unknown) => {
          if (typeof messageOrContext === 'string') {
            const mergedContext = { ...context, ...(contextOrMessage as Record<string, unknown>) };
            parentLogger.fatal(messageOrContext, mergedContext);
          } else {
            parentLogger.fatal(
              { ...context, ...(messageOrContext as Record<string, unknown>) },
              contextOrMessage
            );
          }
        },
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
