/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Base connector class with common HTTP functionality
 * All integration connectors should extend this for consistent behavior
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
   * Make an authenticated GET request
   */
  protected async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<{ data?: T; error?: string }> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      if (response.status >= 400) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      return { data: response.data };
    } catch (error: any) {
      this.logger.error(`GET ${url} failed:`, error.message);
      return {
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Make an authenticated POST request
   */
  protected async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<{ data?: T; error?: string }> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      if (response.status >= 400) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      return { data: response.data };
    } catch (error: any) {
      this.logger.error(`POST ${url} failed:`, error.message);
      return {
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Make an authenticated PUT request
   */
  protected async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<{ data?: T; error?: string }> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      if (response.status >= 400) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      return { data: response.data };
    } catch (error: any) {
      this.logger.error(`PUT ${url} failed:`, error.message);
      return {
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Make an authenticated DELETE request
   */
  protected async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<{ data?: T; error?: string }> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      if (response.status >= 400) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      return { data: response.data };
    } catch (error: any) {
      this.logger.error(`DELETE ${url} failed:`, error.message);
      return {
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Set default headers (Authorization, Content-Type, etc.)
   */
  protected setHeaders(headers: Record<string, string>): void {
    this.axiosInstance.defaults.headers.common = {
      ...this.axiosInstance.defaults.headers.common,
      ...headers,
    };
  }

  /**
   * Set base URL for all requests
   */
  protected setBaseURL(baseURL: string): void {
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  /**
   * Abstract methods that must be implemented by subclasses
   */
  abstract testConnection(config: any): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }>;

  abstract sync(config: any): Promise<any>;
}

