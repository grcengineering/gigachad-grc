import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { URL } from 'url';
import * as net from 'net';

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

/**
 * Validate a URL is safe for server-side requests (SSRF protection).
 * Blocks private IPs, loopback, link-local, and cloud metadata endpoints.
 */
function validateUrlSafe(urlString: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost
  if (hostname === 'localhost' || hostname === '[::1]') {
    throw new Error('SSRF blocked: localhost URLs are not allowed');
  }

  // Block cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    throw new Error('SSRF blocked: cloud metadata endpoints are not allowed');
  }

  // Check if hostname is an IP address
  if (net.isIPv4(hostname)) {
    const octets = hostname.split('.').map(Number);
    // 10.0.0.0/8
    if (octets[0] === 10) {
      throw new Error('SSRF blocked: private IP range (10.x.x.x)');
    }
    // 172.16.0.0/12
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
      throw new Error('SSRF blocked: private IP range (172.16-31.x.x)');
    }
    // 192.168.0.0/16
    if (octets[0] === 192 && octets[1] === 168) {
      throw new Error('SSRF blocked: private IP range (192.168.x.x)');
    }
    // 127.0.0.0/8
    if (octets[0] === 127) {
      throw new Error('SSRF blocked: loopback address');
    }
    // 169.254.0.0/16 (link-local)
    if (octets[0] === 169 && octets[1] === 254) {
      throw new Error('SSRF blocked: link-local address');
    }
    // 0.0.0.0
    if (octets.every((o) => o === 0)) {
      throw new Error('SSRF blocked: unspecified address');
    }
  }

  // Only allow http and https schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SSRF blocked: unsupported protocol ${parsed.protocol}`);
  }
}

/**
 * Base connector class with common HTTP functionality.
 * All integration connectors should extend this for consistent behavior.
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
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });
  }

  /**
   * Create a request-scoped HTTP client with the given base URL and headers.
   * This returns a fresh AxiosInstance that is NOT shared, making it safe
   * for concurrent use in singleton NestJS services.
   *
   * Includes SSRF validation on the base URL.
   */
  protected createClient(
    baseURL: string,
    headers?: Record<string, string>,
    timeout?: number,
  ): AxiosInstance {
    validateUrlSafe(baseURL);
    return axios.create({
      timeout: timeout || 30000,
      validateStatus: (status) => status < 500,
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
   * Includes SSRF validation.
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

