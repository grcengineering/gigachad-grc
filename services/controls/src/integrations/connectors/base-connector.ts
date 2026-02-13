import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { URL } from 'url';
import * as net from 'net';
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';

/**
 * HTTP request result type.
 */
export interface HttpResult<T> {
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Standard connection test result type.
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Standard sync result type for entity collections.
 */
export interface SyncCollectionResult<T> {
  total: number;
  items: T[];
}

/**
 * Standard sync response type.
 */
export interface SyncResult {
  collectedAt: string;
  errors: string[];
  [key: string]: SyncCollectionResult<unknown> | string | string[];
}

/**
 * Base configuration type for connectors.
 */
export interface BaseConnectorConfig {
  baseUrl?: string;
  apiKey?: string;
  apiToken?: string;
  username?: string;
  password?: string;
  organization?: string;
  timeout?: number;
}

/**
 * Extract error message from unknown error type.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Request failed';
}

// =============================================================================
// SSRF Protection
// =============================================================================

/**
 * Check if an IPv4 address is in a blocked range (private, loopback, link-local, etc.).
 */
function isBlockedIPv4(ip: string): string | null {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) return null;

  if (octets[0] === 10) return 'private IP range (10.x.x.x)';
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return 'private IP range (172.16-31.x.x)';
  if (octets[0] === 192 && octets[1] === 168) return 'private IP range (192.168.x.x)';
  if (octets[0] === 127) return 'loopback address';
  if (octets[0] === 169 && octets[1] === 254) return 'link-local address';
  if (octets.every((o) => o === 0)) return 'unspecified address';
  return null;
}

/**
 * Parse an IPv6 address string into 16 bytes. Returns null if not valid IPv6.
 */
function parseIPv6Bytes(ip: string): number[] | null {
  // Handle IPv6-mapped IPv4 (e.g., ::ffff:127.0.0.1)
  const mappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch) {
    const v4octets = mappedMatch[1].split('.').map(Number);
    if (v4octets.length === 4 && v4octets.every((o) => o >= 0 && o <= 255)) {
      return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff, ...v4octets];
    }
  }

  // Expand :: notation
  const halves = ip.split('::');
  if (halves.length > 2) return null;

  const expandGroup = (s: string): number[] => {
    if (!s) return [];
    return s.split(':').flatMap((g) => {
      const val = parseInt(g, 16);
      if (isNaN(val) || val < 0 || val > 0xffff) return [NaN, NaN];
      return [(val >> 8) & 0xff, val & 0xff];
    });
  };

  let bytes: number[];
  if (halves.length === 2) {
    const left = expandGroup(halves[0]);
    const right = expandGroup(halves[1]);
    const pad = 16 - left.length - right.length;
    if (pad < 0) return null;
    bytes = [...left, ...new Array(pad).fill(0), ...right];
  } else {
    bytes = expandGroup(halves[0]);
  }

  if (bytes.length !== 16 || bytes.some((b) => isNaN(b))) return null;
  return bytes;
}

/**
 * Check if an IPv6 address is in a blocked range.
 */
function isBlockedIPv6(ip: string): string | null {
  const bytes = parseIPv6Bytes(ip);
  if (!bytes) return null;

  // ::1 (loopback)
  if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) {
    return 'IPv6 loopback address';
  }

  // :: (unspecified)
  if (bytes.every((b) => b === 0)) {
    return 'IPv6 unspecified address';
  }

  // ::ffff:0:0/96 (IPv6-mapped IPv4) — check the embedded IPv4
  if (
    bytes.slice(0, 10).every((b) => b === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff
  ) {
    const embeddedIPv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    const v4Reason = isBlockedIPv4(embeddedIPv4);
    if (v4Reason) return `IPv6-mapped IPv4: ${v4Reason}`;
  }

  // fc00::/7 (Unique Local Address — includes fd00::/8)
  if ((bytes[0] & 0xfe) === 0xfc) {
    return 'IPv6 unique local address (fc00::/7)';
  }

  // fe80::/10 (link-local)
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) {
    return 'IPv6 link-local address (fe80::/10)';
  }

  return null;
}

/**
 * Validate a resolved IP address is not in a blocked range.
 * Throws if the IP is private, loopback, link-local, etc.
 */
function validateResolvedIp(hostname: string, ip: string): void {
  if (net.isIPv4(ip)) {
    const reason = isBlockedIPv4(ip);
    if (reason) {
      throw new Error(`SSRF blocked: "${hostname}" resolves to ${ip} (${reason})`);
    }
  } else if (net.isIPv6(ip)) {
    const reason = isBlockedIPv6(ip);
    if (reason) {
      throw new Error(`SSRF blocked: "${hostname}" resolves to ${ip} (${reason})`);
    }
  }
}

/**
 * Custom DNS lookup function that validates the resolved IP against SSRF blocklists.
 * Used as the `lookup` option for http.Agent/https.Agent to enforce SSRF protection
 * at connection time — preventing DNS rebinding and domain-based bypasses.
 */
const ssrfSafeLookup: dns.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err, address, family);
    try {
      validateResolvedIp(hostname, address);
    } catch (e) {
      return callback(e as NodeJS.ErrnoException, address, family);
    }
    callback(null, address, family);
  });
};

/** Shared SSRF-safe HTTP agent (connection-time IP validation). */
const ssrfSafeHttpAgent = new http.Agent({ lookup: ssrfSafeLookup });
/** Shared SSRF-safe HTTPS agent (connection-time IP validation). */
const ssrfSafeHttpsAgent = new https.Agent({ lookup: ssrfSafeLookup });

/**
 * Validate a URL is safe for server-side requests (SSRF protection).
 * Blocks private IPs, loopback, link-local, cloud metadata endpoints,
 * and IPv6 private/mapped ranges.
 *
 * This provides fast, synchronous rejection of obviously-blocked URLs.
 * DNS-resolution-time validation is handled separately by ssrfSafeLookup
 * on the HTTP agents (prevents DNS rebinding / domain-based bypasses).
 */
function validateUrlSafe(urlString: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  // Only allow http and https schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SSRF blocked: unsupported protocol ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost
  if (hostname === 'localhost') {
    throw new Error('SSRF blocked: localhost URLs are not allowed');
  }

  // Block cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    throw new Error('SSRF blocked: cloud metadata endpoints are not allowed');
  }

  // Check IPv4
  if (net.isIPv4(hostname)) {
    const reason = isBlockedIPv4(hostname);
    if (reason) throw new Error(`SSRF blocked: ${reason}`);
  }

  // Check IPv6 (URL parser strips brackets, so hostname is bare IPv6)
  if (net.isIPv6(hostname)) {
    const reason = isBlockedIPv6(hostname);
    if (reason) throw new Error(`SSRF blocked: ${reason}`);
  }
}

/**
 * Base connector class with common HTTP functionality.
 * All integration connectors should extend this for consistent behavior.
 *
 * SSRF protection is enforced at two layers:
 * 1. URL string validation (validateUrlSafe) — fast rejection of obvious attacks
 * 2. DNS resolution validation (ssrfSafeLookup on agents) — prevents DNS rebinding
 *
 * Redirects are disabled (maxRedirects: 0) to prevent redirect-based SSRF bypasses.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyConnector extends BaseConnector {
 *   constructor() { super('MyConnector'); }
 *
 *   async testConnection(config: MyConfig): Promise<ConnectionTestResult> {
 *     // Implementation
 *   }
 *
 *   async sync(config: MyConfig): Promise<SyncResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export abstract class BaseConnector {
  protected readonly logger: Logger;
  protected axiosInstance: AxiosInstance;

  constructor(connectorName: string) {
    this.logger = new Logger(connectorName);
    this.axiosInstance = axios.create({
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      httpAgent: ssrfSafeHttpAgent,
      httpsAgent: ssrfSafeHttpsAgent,
    });
  }

  /**
   * Create a request-scoped HTTP client with the given base URL and headers.
   * This returns a fresh AxiosInstance that is NOT shared, making it safe
   * for concurrent use in singleton NestJS services.
   *
   * Includes SSRF validation on the base URL.
   * Redirects are disabled to prevent redirect-based SSRF bypasses.
   * DNS resolution is validated at connection time via custom agents.
   */
  protected createClient(
    baseURL: string,
    headers?: Record<string, string>,
    timeout?: number,
  ): AxiosInstance {
    validateUrlSafe(baseURL);
    return axios.create({
      timeout: timeout || 30000,
      maxRedirects: 0,
      validateStatus: (status) => status < 500,
      httpAgent: ssrfSafeHttpAgent,
      httpsAgent: ssrfSafeHttpsAgent,
      baseURL,
      headers,
    });
  }

  private getClient(config?: AxiosRequestConfig & { client?: AxiosInstance }): {
    client: AxiosInstance;
    axiosConfig?: AxiosRequestConfig;
  } {
    if (config?.client) {
      const { client, ...rest } = config;
      return { client, axiosConfig: Object.keys(rest).length > 0 ? rest : undefined };
    }
    return { client: this.axiosInstance, axiosConfig: config };
  }

  /**
   * Make an authenticated GET request.
   * Pass { client } in config to use a request-scoped client.
   */
  protected async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig & { client?: AxiosInstance },
  ): Promise<HttpResult<T>> {
    try {
      const { client, axiosConfig } = this.getClient(config);
      const response = await client.get<T>(url, axiosConfig);
      if (response.status >= 400) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }
      return { data: response.data, statusCode: response.status };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`GET ${url} failed: ${message}`);
      return { error: message };
    }
  }

  /**
   * Make an authenticated POST request.
   * Pass { client } in config to use a request-scoped client.
   */
  protected async post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig & { client?: AxiosInstance },
  ): Promise<HttpResult<T>> {
    try {
      const { client, axiosConfig } = this.getClient(config);
      const response = await client.post<T>(url, data, axiosConfig);
      if (response.status >= 400) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }
      return { data: response.data, statusCode: response.status };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`POST ${url} failed: ${message}`);
      return { error: message };
    }
  }

  /**
   * Make an authenticated PUT request.
   * Pass { client } in config to use a request-scoped client.
   */
  protected async put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig & { client?: AxiosInstance },
  ): Promise<HttpResult<T>> {
    try {
      const { client, axiosConfig } = this.getClient(config);
      const response = await client.put<T>(url, data, axiosConfig);
      if (response.status >= 400) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }
      return { data: response.data, statusCode: response.status };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`PUT ${url} failed: ${message}`);
      return { error: message };
    }
  }

  /**
   * Make an authenticated DELETE request.
   * Pass { client } in config to use a request-scoped client.
   */
  protected async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig & { client?: AxiosInstance },
  ): Promise<HttpResult<T>> {
    try {
      const { client, axiosConfig } = this.getClient(config);
      const response = await client.delete<T>(url, axiosConfig);
      if (response.status >= 400) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }
      return { data: response.data, statusCode: response.status };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`DELETE ${url} failed: ${message}`);
      return { error: message };
    }
  }

  /**
   * @deprecated Use createClient() for request-scoped clients to avoid
   * shared mutable state in singleton services. This method mutates the
   * shared axiosInstance defaults and is unsafe for concurrent use.
   */
  protected setHeaders(headers: Record<string, string>): void {
    this.axiosInstance.defaults.headers.common = {
      ...this.axiosInstance.defaults.headers.common,
      ...headers,
    };
  }

  /**
   * @deprecated Use createClient() for request-scoped clients to avoid
   * shared mutable state in singleton services. This method mutates the
   * shared axiosInstance defaults and is unsafe for concurrent use.
   *
   * Includes SSRF URL validation. DNS resolution is validated at connection
   * time by the SSRF-safe agents.
   */
  protected setBaseURL(baseURL: string): void {
    validateUrlSafe(baseURL);
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  /**
   * Create a standard successful connection test result.
   */
  protected successResult(message: string, details?: Record<string, unknown>): ConnectionTestResult {
    return { success: true, message, details };
  }

  /**
   * Create a standard failed connection test result.
   */
  protected failureResult(message: string, details?: Record<string, unknown>): ConnectionTestResult {
    return { success: false, message, details };
  }

  /**
   * Create an empty sync result with errors.
   */
  protected emptySyncResult(errors: string[]): SyncResult {
    return {
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  /**
   * Create a collection result from items array.
   */
  protected toCollection<T>(items: T[]): SyncCollectionResult<T> {
    return { total: items.length, items };
  }

  /**
   * Abstract methods that must be implemented by subclasses.
   */
  abstract testConnection(config: BaseConnectorConfig): Promise<ConnectionTestResult>;
  abstract sync(config: BaseConnectorConfig): Promise<SyncResult>;
}
