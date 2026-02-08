import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';
import { safeFetch, SSRFProtectionError } from '@gigachad-grc/shared';
import {
  CreateCollectorDto,
  UpdateCollectorDto,
  TestCollectorDto,
  TestResultDto,
} from './dto/collector.dto';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { CollectorRunStatus, EvidenceStatus, Prisma } from '@prisma/client';

@Injectable()
export class CollectorsService {
  private readonly logger = new Logger(CollectorsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
    @InjectMetric('collectors_runs_total') private readonly collectorsRunsCounter: Counter<string>
  ) {}

  /**
   * Get all collectors for a control
   */
  async findAllForControl(controlId: string, implementationId: string, organizationId: string) {
    const collectors = await this.prisma.controlEvidenceCollector.findMany({
      where: {
        controlId,
        implementationId,
        organizationId,
      },
      include: {
        integration: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return collectors.map((c) => ({
      ...c,
      authConfig: this.maskAuthConfig(c.authType, c.authConfig as Record<string, unknown>),
    }));
  }

  /**
   * Get a single collector
   */
  async findOne(id: string, organizationId: string) {
    const collector = await this.prisma.controlEvidenceCollector.findFirst({
      where: { id, organizationId },
      include: {
        integration: {
          select: { id: true, name: true, type: true, config: true },
        },
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }

    return {
      ...collector,
      authConfig: this.maskAuthConfig(
        collector.authType,
        collector.authConfig as Record<string, unknown>
      ),
    };
  }

  /**
   * Create a new collector
   */
  async create(
    controlId: string,
    implementationId: string,
    organizationId: string,
    userId: string,
    dto: CreateCollectorDto
  ) {
    // Verify the implementation exists and belongs to this control
    const implementation = await this.prisma.controlImplementation.findFirst({
      where: { id: implementationId, controlId, organizationId },
      include: { control: true },
    });

    if (!implementation) {
      throw new NotFoundException('Control implementation not found');
    }

    // If integration mode, verify the integration exists
    if (dto.mode === 'integration' && dto.integrationId) {
      const integration = await this.prisma.integration.findFirst({
        where: { id: dto.integrationId, organizationId },
      });
      if (!integration) {
        throw new NotFoundException('Integration not found');
      }
    }

    // Calculate next run time if schedule enabled
    let nextRunAt: Date | null = null;
    if (dto.scheduleEnabled && dto.scheduleFrequency) {
      nextRunAt = this.calculateNextRunTime(dto.scheduleFrequency);
    }

    const collector = await this.prisma.controlEvidenceCollector.create({
      data: {
        controlId,
        implementationId,
        organizationId,
        name: dto.name,
        description: dto.description,
        mode: dto.mode,
        integrationId: dto.integrationId,
        baseUrl: dto.baseUrl,
        endpoint: dto.endpoint,
        method: dto.method || 'GET',
        headers: dto.headers as any,
        queryParams: dto.queryParams as any,
        body: dto.body as any,
        authType: dto.authType,
        authConfig: dto.authConfig as any,
        responseMapping: dto.responseMapping as any,
        evidenceTitle: dto.evidenceTitle,
        evidenceType: dto.evidenceType || 'automated',
        scheduleEnabled: dto.scheduleEnabled || false,
        scheduleFrequency: dto.scheduleFrequency,
        scheduleCron: dto.scheduleCron,
        nextRunAt,
        createdBy: userId,
      },
      include: {
        integration: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'created',
      entityType: 'evidence_collector',
      entityId: collector.id,
      entityName: collector.name,
      description: `Created evidence collector "${collector.name}" for control "${implementation.control.title}"`,
      changes: { after: collector },
    });

    return {
      ...collector,
      authConfig: this.maskAuthConfig(
        collector.authType,
        collector.authConfig as Record<string, unknown>
      ),
    };
  }

  /**
   * Update a collector
   */
  async update(id: string, organizationId: string, userId: string, dto: UpdateCollectorDto) {
    const existing = await this.prisma.controlEvidenceCollector.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Collector not found');
    }

    // If switching to integration mode, verify integration exists
    if (dto.mode === 'integration' && dto.integrationId) {
      const integration = await this.prisma.integration.findFirst({
        where: { id: dto.integrationId, organizationId },
      });
      if (!integration) {
        throw new NotFoundException('Integration not found');
      }
    }

    // Calculate next run time if schedule changed
    let nextRunAt = existing.nextRunAt;
    if (dto.scheduleEnabled !== undefined || dto.scheduleFrequency !== undefined) {
      const scheduleEnabled = dto.scheduleEnabled ?? existing.scheduleEnabled;
      const scheduleFrequency = dto.scheduleFrequency ?? existing.scheduleFrequency;
      if (scheduleEnabled && scheduleFrequency) {
        nextRunAt = this.calculateNextRunTime(scheduleFrequency);
      } else {
        nextRunAt = null;
      }
    }

    const collector = await this.prisma.controlEvidenceCollector.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        mode: dto.mode,
        integrationId: dto.integrationId,
        baseUrl: dto.baseUrl,
        endpoint: dto.endpoint,
        method: dto.method,
        headers: dto.headers as any,
        queryParams: dto.queryParams as any,
        body: dto.body as any,
        authType: dto.authType,
        authConfig: dto.authConfig as any,
        responseMapping: dto.responseMapping as any,
        evidenceTitle: dto.evidenceTitle,
        evidenceType: dto.evidenceType,
        scheduleEnabled: dto.scheduleEnabled,
        scheduleFrequency: dto.scheduleFrequency,
        scheduleCron: dto.scheduleCron,
        isActive: dto.isActive,
        nextRunAt,
      },
      include: {
        integration: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'updated',
      entityType: 'evidence_collector',
      entityId: collector.id,
      entityName: collector.name,
      description: `Updated evidence collector "${collector.name}"`,
      changes: { before: existing, after: collector },
    });

    return {
      ...collector,
      authConfig: this.maskAuthConfig(
        collector.authType,
        collector.authConfig as Record<string, unknown>
      ),
    };
  }

  /**
   * Delete a collector
   */
  async delete(id: string, organizationId: string, userId: string) {
    const collector = await this.prisma.controlEvidenceCollector.findFirst({
      where: { id, organizationId },
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }

    await this.prisma.controlEvidenceCollector.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'deleted',
      entityType: 'evidence_collector',
      entityId: id,
      entityName: collector.name,
      description: `Deleted evidence collector "${collector.name}"`,
      changes: { before: collector },
    });

    return { success: true };
  }

  /**
   * Test a collector configuration
   */
  async test(
    id: string,
    organizationId: string,
    userId: string,
    dto?: TestCollectorDto
  ): Promise<TestResultDto> {
    const collector = await this.prisma.controlEvidenceCollector.findFirst({
      where: { id, organizationId },
      include: {
        integration: {
          select: { id: true, name: true, type: true, config: true },
        },
      },
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }

    const startTime = Date.now();

    try {
      const result = await this.executeApiCall(collector, dto);

      return {
        success: true,
        message: 'Connection successful',
        statusCode: result.statusCode,
        responseTime: Date.now() - startTime,
        data: result.data,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Test failed',
        responseTime: Date.now() - startTime,
        error: message,
      };
    }
  }

  /**
   * Run a collector manually
   */
  async run(id: string, organizationId: string, userId: string) {
    const collector = await this.prisma.controlEvidenceCollector.findFirst({
      where: { id, organizationId },
      include: {
        integration: {
          select: { id: true, name: true, type: true, config: true },
        },
        control: true,
        implementation: true,
      },
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }

    // Create a run record
    const run = await this.prisma.collectorRun.create({
      data: {
        collectorId: collector.id,
        triggeredBy: 'manual',
        triggeredByUser: userId,
        status: CollectorRunStatus.running,
        logs: [{ timestamp: new Date().toISOString(), message: 'Starting collector run...' }],
      },
    });

    try {
      // Execute the API call
      const result = await this.executeApiCall(collector);

      // Create evidence from the result
      const evidence = await this.createEvidenceFromResult(collector, result.data, userId);

      // Update run record
      await this.prisma.collectorRun.update({
        where: { id: run.id },
        data: {
          status: CollectorRunStatus.success,
          completedAt: new Date(),
          evidenceCreated: 1,
          evidenceId: evidence.id,
          responseCode: result.statusCode,
          logs: [
            ...(run.logs as any[]),
            {
              timestamp: new Date().toISOString(),
              message: `API call successful (${result.statusCode})`,
            },
            { timestamp: new Date().toISOString(), message: `Created evidence: ${evidence.title}` },
          ],
        },
      });

      // Update collector stats
      await this.prisma.controlEvidenceCollector.update({
        where: { id: collector.id },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: CollectorRunStatus.success,
          lastRunError: null,
          totalRuns: { increment: 1 },
          successfulRuns: { increment: 1 },
          nextRunAt:
            collector.scheduleEnabled && collector.scheduleFrequency
              ? this.calculateNextRunTime(collector.scheduleFrequency)
              : null,
        },
      });

      // Audit log
      await this.auditService.log({
        organizationId,
        userId,
        action: 'executed',
        entityType: 'evidence_collector',
        entityId: collector.id,
        entityName: collector.name,
        description: `Executed evidence collector "${collector.name}" - created evidence "${evidence.title}"`,
        metadata: { runId: run.id, evidenceId: evidence.id },
      });

      // Notify on success (configurable per user preferences)
      await this.notificationsService.create({
        organizationId,
        userId: collector.createdBy,
        type: NotificationType.COLLECTOR_SUCCESS,
        title: 'Evidence Collected',
        message: `Collector "${collector.name}" successfully collected evidence for control ${collector.control?.controlId || 'unknown'}`,
        entityType: 'control',
        entityId: collector.controlId,
        severity: NotificationSeverity.SUCCESS,
        metadata: {
          collectorId: collector.id,
          collectorName: collector.name,
          evidenceId: evidence.id,
          evidenceTitle: evidence.title,
        },
      });

      return {
        success: true,
        runId: run.id,
        evidenceId: evidence.id,
        message: `Successfully collected evidence: ${evidence.title}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Update run record with error
      await this.prisma.collectorRun.update({
        where: { id: run.id },
        data: {
          status: CollectorRunStatus.error,
          completedAt: new Date(),
          errorMessage: errorMessage,
          logs: [
            ...((run.logs as Prisma.InputJsonValue[]) || []),
            {
              timestamp: new Date().toISOString(),
              message: `Error: ${errorMessage}`,
              level: 'error',
            },
          ] as Prisma.InputJsonValue,
        },
      });

      // Update collector stats
      await this.prisma.controlEvidenceCollector.update({
        where: { id: collector.id },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: CollectorRunStatus.error,
          lastRunError: errorMessage,
          totalRuns: { increment: 1 },
          nextRunAt:
            collector.scheduleEnabled && collector.scheduleFrequency
              ? this.calculateNextRunTime(collector.scheduleFrequency)
              : null,
        },
      });

      this.logger.error(`Collector ${collector.id} run failed: ${errorMessage}`);

      // Notify on failure
      await this.notificationsService.create({
        organizationId,
        userId: collector.createdBy,
        type: NotificationType.COLLECTOR_FAILED,
        title: 'Evidence Collection Failed',
        message: `Collector "${collector.name}" failed: ${errorMessage}`,
        entityType: 'control',
        entityId: collector.controlId,
        severity: NotificationSeverity.ERROR,
        metadata: {
          collectorId: collector.id,
          collectorName: collector.name,
          error: errorMessage,
          runId: run.id,
        },
      });

      return {
        success: false,
        runId: run.id,
        message: `Collection failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Get run history for a collector
   */
  async getRuns(collectorId: string, organizationId: string, limit = 20) {
    const collector = await this.prisma.controlEvidenceCollector.findFirst({
      where: { id: collectorId, organizationId },
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }

    return this.prisma.collectorRun.findMany({
      where: { collectorId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Execute the API call for a collector
   */
  private async executeApiCall(
    collector: any,
    overrides?: TestCollectorDto & { timeoutMs?: number; maxRetries?: number }
  ): Promise<{ statusCode: number; data: any }> {
    const timeoutMs =
      overrides?.timeoutMs ??
      collector.timeoutMs ??
      Number(process.env.COLLECTOR_REQUEST_TIMEOUT_MS || 30000);
    const maxRetries =
      overrides?.maxRetries ??
      collector.maxRetries ??
      Number(process.env.COLLECTOR_MAX_RETRIES || 2);

    let baseUrl = overrides?.baseUrl || collector.baseUrl;
    let authConfig = overrides?.authConfig || collector.authConfig;

    // If using integration mode, get auth from integration
    if (collector.mode === 'integration' && collector.integration) {
      const integrationConfig = collector.integration.config as Record<string, any>;
      // Use integration's base URL if not overridden in collector
      if (!baseUrl && integrationConfig.serverUrl) {
        baseUrl = integrationConfig.serverUrl;
      }
      // Use integration's auth
      authConfig = integrationConfig;
    }

    if (!baseUrl) {
      throw new BadRequestException('Base URL is required');
    }

    const endpoint = collector.endpoint || '';
    const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((collector.headers as Record<string, string>) || {}),
    };

    // Add authentication
    if (collector.authType && authConfig) {
      const authHeaders = await this.getAuthHeaders(
        collector.authType,
        authConfig,
        collector.integration
      );
      Object.assign(headers, authHeaders);
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: collector.method || 'GET',
      headers,
    };

    // Add query params
    let finalUrl = url;
    if (collector.queryParams) {
      const params = new URLSearchParams(collector.queryParams as Record<string, string>);
      finalUrl = `${url}?${params.toString()}`;
    }

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(collector.method) && collector.body) {
      fetchOptions.body = JSON.stringify(collector.body);
    }

    this.logger.debug(
      `Executing collector API call: ${collector.method} ${finalUrl} (timeout=${timeoutMs}ms, retries=${maxRetries})`
    );

    // codeql[js/resource-exhaustion] suppressed: Response size limited by MAX_RESPONSE_SIZE with streaming validation
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    (fetchOptions as any).signal = controller.signal;

    // Resource exhaustion protection: limit response size
    const maxResponseSizeBytes = Number(
      process.env.COLLECTOR_MAX_RESPONSE_SIZE_BYTES || 10 * 1024 * 1024
    ); // 10MB default

    let response: Response;
    try {
      // SECURITY: Use safeFetch to prevent SSRF attacks
      response = await this.retryWithBackoff(() => safeFetch(finalUrl, fetchOptions), maxRetries);
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof SSRFProtectionError) {
        throw new BadRequestException(`SSRF protection blocked request: ${error.message}`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    // SECURITY: Check content-length header to prevent resource exhaustion
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxResponseSizeBytes) {
      throw new BadRequestException(
        `Response too large: ${contentLength} bytes exceeds limit of ${maxResponseSizeBytes} bytes`
      );
    }

    // Read response with size limit to prevent resource exhaustion (CWE-400)
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalSize += value.length;
        if (totalSize > maxResponseSizeBytes) {
          reader.cancel();
          throw new BadRequestException(
            `Response exceeded maximum size of ${maxResponseSizeBytes} bytes`
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const responseText = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const result = new Uint8Array(acc.length + chunk.length);
        result.set(acc);
        result.set(chunk, acc.length);
        return result;
      }, new Uint8Array())
    );

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      this.collectorsRunsCounter.inc({ status: 'failure' });
      throw new Error(
        `API returned ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`
      );
    }

    this.collectorsRunsCounter.inc({ status: 'success' });
    return { statusCode: response.status, data };
  }

  /**
   * Simple retry wrapper with exponential backoff for collector calls
   */
  private async retryWithBackoff(
    fn: () => Promise<Response>,
    maxRetries: number
  ): Promise<Response> {
    let attempt = 0;
    let lastError: any;

    while (attempt <= maxRetries) {
      try {
        const res = await fn();
        // Retry only on 5xx or network-level errors (handled by catch)
        if (!res.ok && res.status >= 500) {
          throw new Error(`Upstream error ${res.status}`);
        }
        return res;
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries) {
          break;
        }
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        this.logger.warn(
          `Collector call failed (attempt ${attempt + 1}/${maxRetries + 1}): ${
            (error as any)?.message || error
          } – retrying in ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }

    throw lastError;
  }

  /**
   * Get authentication headers
   */
  private async getAuthHeaders(
    authType: string,
    authConfig: Record<string, unknown>,
    integration?: { type?: string; config?: Record<string, unknown> }
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    switch (authType) {
      case 'api_key':
        if (authConfig.location === 'header') {
          const keyName = authConfig.keyName as string;
          // Validate header name format (alphanumeric, hyphens, underscores only)
          if (!/^[A-Za-z0-9_-]+$/.test(keyName)) {
            throw new BadRequestException(`Invalid header name: "${keyName}"`);
          }
          headers[keyName] = authConfig.keyValue as string;
        }
        break;

      case 'oauth2':
        try {
          const token = await this.getOAuth2Token(authConfig, integration);
          headers['Authorization'] = `Bearer ${token}`;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`OAuth2 token fetch failed: ${message}`);
          throw error;
        }
        break;

      case 'bearer':
        if (authConfig.token) {
          headers['Authorization'] = `Bearer ${authConfig.token as string}`;
        }
        break;

      case 'basic':
        if (authConfig.username && authConfig.password) {
          const credentials = Buffer.from(
            `${authConfig.username as string}:${authConfig.password as string}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
    }

    return headers;
  }

  /**
   * Get OAuth 2.0 access token
   */
  private async getOAuth2Token(
    authConfig: Record<string, unknown>,
    integration?: { type?: string; config?: Record<string, unknown> }
  ): Promise<string> {
    // Check if using Jamf-style auth from integration
    if (integration?.type === 'jamf' && authConfig.clientId && authConfig.clientSecret) {
      const serverUrl =
        (authConfig.serverUrl as string) || (integration?.config?.serverUrl as string);
      const tokenUrl = `${serverUrl}/api/oauth/token`;

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: authConfig.clientId as string,
        client_secret: authConfig.clientSecret as string,
      });

      // SECURITY: Use safeFetch to prevent SSRF via malicious tokenUrl
      const response = await safeFetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OAuth2 token request failed: ${error}`);
      }

      const data = await response.json();
      return data.access_token;
    }

    // Standard OAuth2 flow
    const { tokenUrl, clientId, clientSecret, scope } = authConfig as {
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope?: string;
    };

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    if (scope) {
      params.append('scope', scope);
    }

    // SECURITY: Use safeFetch to prevent SSRF via malicious tokenUrl
    const response = await safeFetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth2 token request failed: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Create evidence from API result
   */
  private async createEvidenceFromResult(collector: any, data: any, userId: string) {
    // Generate evidence title
    let title = collector.evidenceTitle || `${collector.name} - ${new Date().toLocaleDateString()}`;

    // Simple template interpolation
    title = title.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
      return this.extractValue(data, key) || key;
    });

    // Extract description if mapping provided
    let description = collector.description || `Evidence collected by "${collector.name}"`;
    if (collector.responseMapping?.descriptionField) {
      const extracted = this.extractValue(data, collector.responseMapping.descriptionField);
      if (extracted) description = String(extracted);
    }

    // Extract specific data if mapping provided
    let evidenceData = data;
    if (collector.responseMapping?.dataField) {
      evidenceData = this.extractValue(data, collector.responseMapping.dataField) || data;
    }

    const jsonData = JSON.stringify(evidenceData, null, 2);
    const timestamp = Date.now();
    const storagePath = `collectors/${collector.id}/${timestamp}.json`;

    // Save to storage
    await this.storage.upload(Buffer.from(jsonData, 'utf-8'), storagePath, {
      contentType: 'application/json',
    });

    // Create evidence record
    const evidence = await this.prisma.evidence.create({
      data: {
        organizationId: collector.organizationId,
        title,
        description,
        type: collector.evidenceType || 'automated',
        source: 'collector',
        status: EvidenceStatus.approved,
        filename: `${collector.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`,
        mimeType: 'application/json',
        size: Buffer.byteLength(jsonData, 'utf-8'),
        storagePath,
        metadata: {
          collectorId: collector.id,
          collectorName: collector.name,
          controlId: collector.controlId,
        },
        collectedAt: new Date(),
        validFrom: new Date(),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Link evidence to the control
    await this.prisma.evidenceControlLink.create({
      data: {
        evidenceId: evidence.id,
        controlId: collector.controlId,
        implementationId: collector.implementationId,
        linkedBy: userId,
        notes: `Auto-collected by evidence collector "${collector.name}"`,
      },
    });

    return evidence;
  }

  /**
   * Calculate next run time based on schedule frequency
   */
  private calculateNextRunTime(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return addDays(now, 1);
      case 'weekly':
        return addWeeks(now, 1);
      case 'monthly':
        return addMonths(now, 1);
      default:
        return addDays(now, 1);
    }
  }

  /**
   * Extract value from nested object using dot notation
   */
  private extractValue(obj: any, path: string): any {
    if (!path) return undefined;

    const parts = path.replace(/^\$\.?/, '').split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;

      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Mask sensitive auth config values
   */
  private maskAuthConfig(
    authType: string | null,
    authConfig: Record<string, unknown> | null
  ): Record<string, unknown> | null {
    if (!authConfig) return null;

    const masked = { ...authConfig };
    const sensitiveFields = ['keyValue', 'clientSecret', 'password', 'token', 'apiKey'];

    for (const field of sensitiveFields) {
      if (masked[field]) {
        const value = String(masked[field]);
        masked[field] = value.length > 4 ? '••••••••' + value.slice(-4) : '••••••••';
      }
    }

    return masked;
  }

  /**
   * Get collectors that are due to run (for scheduler)
   */
  async getDueCollectors(): Promise<any[]> {
    return this.prisma.controlEvidenceCollector.findMany({
      where: {
        isActive: true,
        scheduleEnabled: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
      include: {
        integration: {
          select: { id: true, name: true, type: true, config: true },
        },
        control: true,
        implementation: true,
      },
    });
  }
}
