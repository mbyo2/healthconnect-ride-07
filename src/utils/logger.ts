export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
}

import { safeLocalGet, safeLocalSet, safeLocalRemove } from './storage';

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  public info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  public warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  public error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
    };

    // Add to internal log storage
    this.logs.push(entry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with formatting
    this.consoleLog(entry);

    // In production, send to external logging service
    if (import.meta.env.PROD && level >= LogLevel.WARN) {
      this.sendToExternalService(entry);
    }
  }

  private consoleLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const logMessage = `${timestamp} ${levelName} ${contextStr} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.data);
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.data);
        break;
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // In production, integrate with services like LogRocket, Datadog, etc.
    // For now, just store for potential batch upload
    if (typeof window !== 'undefined') {
      try {
        const storedLogs = safeLocalGet('app_logs') || '[]';
        const logs = JSON.parse(storedLogs as string);
        logs.push(entry);

        // Keep only last 100 logs in localStorage
        const trimmedLogs = logs.slice(-100);
        safeLocalSet('app_logs', JSON.stringify(trimmedLogs));
      } catch (err) {
        // localStorage may be unavailable/blocked; ignore
        console.warn('Unable to persist logs to localStorage:', err);
      }
    }
  }

  public getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level !== undefined) {
      filteredLogs = this.logs.filter(log => log.level >= level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  public clearLogs(): void {
    this.logs = [];
    if (typeof window !== 'undefined') {
      try {
        safeLocalRemove('app_logs');
      } catch (err) {
        // ignore
      }
    }
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global logger instance
export const logger = Logger.getInstance();

// Utility functions for common logging scenarios
export const logApiCall = (endpoint: string, method: string, duration?: number) => {
  logger.info(`API ${method} ${endpoint}`, 'API', { duration });
};

export const logUserAction = (action: string, userId?: string, data?: any) => {
  logger.info(`User action: ${action}`, 'USER_ACTION', { userId, ...data });
};

export const logPerformance = (operation: string, duration: number, data?: any) => {
  logger.info(`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', data);
};

export const logAuthEvent = (event: string, userId?: string, data?: any) => {
  logger.info(`Auth event: ${event}`, 'AUTH', { userId, ...data });
};

// Performance monitoring wrapper
export const withPerformanceLogging = <T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T => {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logPerformance(operationName, duration);
      });
    } else {
      const duration = performance.now() - start;
      logPerformance(operationName, duration);
      return result;
    }
  }) as T;
};
