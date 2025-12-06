import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service || 'grc'}] ${level}: ${message}`;
  
  if (Object.keys(metadata).length > 0 && metadata.stack === undefined) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  if (metadata.stack) {
    msg += `\n${metadata.stack}`;
  }
  
  return msg;
});

// Create base logger configuration
function createLoggerConfig(serviceName: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      isProduction ? winston.format.json() : combine(colorize(), logFormat)
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console(),
    ],
  };
}

// Logger instance cache
const loggers: Map<string, winston.Logger> = new Map();

/**
 * Get or create a logger for a specific service
 */
export function getLogger(serviceName: string): winston.Logger {
  if (!loggers.has(serviceName)) {
    loggers.set(serviceName, winston.createLogger(createLoggerConfig(serviceName)));
  }
  return loggers.get(serviceName)!;
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  parentLogger: winston.Logger,
  context: Record<string, unknown>
): winston.Logger {
  return parentLogger.child(context);
}

// Pre-configured loggers for each service
export const controlsLogger = getLogger('controls');
export const frameworksLogger = getLogger('frameworks');
export const integrationsLogger = getLogger('integrations');
export const policiesLogger = getLogger('policies');
export const mcpLogger = getLogger('mcp');

// Audit logging helper
export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  organizationId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event
 */
export function logAudit(logger: winston.Logger, entry: AuditLogEntry): void {
  logger.info(`AUDIT: ${entry.action} on ${entry.entityType}:${entry.entityId}`, {
    audit: true,
    ...entry,
  });
}

// Request logging helper
export interface RequestLogEntry {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  organizationId?: string;
  error?: string;
}

/**
 * Log an HTTP request
 */
export function logRequest(logger: winston.Logger, entry: RequestLogEntry): void {
  const level = entry.statusCode >= 500 ? 'error' : entry.statusCode >= 400 ? 'warn' : 'info';
  
  logger.log(level, `${entry.method} ${entry.path} ${entry.statusCode} ${entry.duration}ms`, {
    request: true,
    ...entry,
  });
}

// Export winston types for consumers
export { Logger } from 'winston';



