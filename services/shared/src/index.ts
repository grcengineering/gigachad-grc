// Types - Primary type definitions
export * from './types';

// Authentication - Export with renamed conflicts
export {
  // JWT
  JwtPayload,
  JwtAuthGuard,
  ApiKeyAuthGuard,
  CombinedAuthGuard,
  // Roles
  ROLES_KEY,
  Roles,
  PERMISSIONS_KEY,
  RequirePermissions,
  RolesGuard,
  PermissionsGuard,
  RolesOrPermissionsGuard,
  // User decorators
  CurrentUser,
  OrganizationId,
  // Keycloak
  KeycloakUser,
  CreateKeycloakUserDto,
  KeycloakAdminService,
  // Dev auth
  DEV_USER,
  DevUser,
  ensureDevUserExists,
  DevAuthGuard,
  // Token blacklist
  TokenBlacklistService,
  RevokedToken,
  // Note: User decorator is renamed to avoid conflict with User type
  User as UserDecorator,
  // Note: UserContext from auth is renamed - use type from ./types instead
  UserContext as AuthUserContext,
} from './auth';

// Storage
export * from './storage';

// Events
export * from './events';

// Search
export * from './search';

// Utilities - Export with renamed conflicts
export {
  // crypto
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateApiKey,
  verifyApiKey,
  generateToken,
  hashToken,
  generateWebhookSecret,
  signWebhookPayload,
  verifyWebhookSignature,
  // helpers
  generateId,
  sleep,
  retry,
  chunk,
  unique,
  groupBy,
  pick,
  omit,
  deepClone,
  isEmpty,
  formatDate,
  slugify,
  // validation
  isValidEmail,
  isValidUrl,
  isValidUuid,
  sanitizeString,
  sanitizeObject,
  validatePathWithinBase,
  MAX_BATCH_LIMITS,
  clampArrayForIteration,
  // pagination
  createPaginatedResponse,
  parsePaginationParams,
  getPrismaSkipTake,
  // sanitize
  sanitizeFilename,
  sanitizeFilenameStrict,
  escapeHtml,
  sanitizeInput,
  SanitizeLevel,
  // error-handler - some renamed to avoid conflicts with types
  ErrorDetails,
  DomainError,
  isDomainError,
  isPrismaError,
  isAxiosError,
  getStatusCode,
  toErrorDetails,
  handleError,
  withErrorHandling,
  safeAsync,
  retryAsync,
  createApiErrorResponse,
  CatchErrorsOptions,
  CatchErrors,
  CatchErrorsClass,
  // Renamed exports to avoid conflicts
  ApiErrorResponse as UtilsApiErrorResponse,
  isError as utilsIsError,
  getErrorCode as utilsGetErrorCode,
  getErrorMessage as utilsGetErrorMessage,
} from './utils';

// Logger - Export with renamed conflicts
export {
  getLogger,
  createChildLogger,
  controlsLogger,
  frameworksLogger,
  integrationsLogger,
  policiesLogger,
  mcpLogger,
  logAudit,
  logRequest,
  RequestLogEntry,
  Logger,
  // Renamed to avoid conflict with types
  AuditLogEntry as LoggerAuditLogEntry,
  // Sanitizer utilities for safe logging
  sanitizeForLogging,
  sanitizeError,
  maskEmail,
  safeUserId,
} from './logger';

// Health checks
export * from './health';

// Caching
export * from './cache';

// Middleware
export * from './middleware';

// Filters
export * from './filters';

// Reports
export * from './reports';

// Watermarking
export * from './watermark';

// Resilience (Circuit Breaker, Retry)
export * from './resilience';

// Decorators (sanitization, transforms)
export * from './decorators';

// Services (service registry)
export * from './services';

// Guards
export * from './guards';

// Session
export * from './session';

// Security (Rate Limiting and SSRF protection)
export * from './security';

// Secrets (Infisical integration)
export * from './secrets';
