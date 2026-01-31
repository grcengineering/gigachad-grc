import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookDto,
  WebhookDeliveryDto,
  WebhookDeliveryQueryDto,
  WebhookEventType,
  WebhookStatus,
  TestWebhookDto,
  TestWebhookResultDto,
} from './dto/webhook.dto';
import { 
  parsePaginationParams, 
  createPaginatedResponse,
} from '@gigachad-grc/shared';

interface WebhookRecord {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  headers?: Record<string, string>;
  status: string;
  lastTriggeredAt?: Date;
  lastError?: string;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store for webhooks (would be in database in production)
const webhookStore = new Map<string, WebhookRecord>();
const deliveryStore: WebhookDeliveryDto[] = [];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateWebhookDto): Promise<WebhookDto> {
    const id = crypto.randomUUID();
    const now = new Date();

    const webhook: WebhookRecord = {
      id,
      organizationId,
      name: dto.name,
      url: dto.url,
      secret: dto.secret,
      events: dto.events,
      isActive: dto.isActive ?? true,
      headers: dto.headers,
      status: WebhookStatus.ACTIVE,
      successCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    webhookStore.set(id, webhook);
    this.logger.log(`Created webhook ${id} for org ${organizationId}`);

    return this.toDto(webhook);
  }

  async findAll(organizationId: string): Promise<WebhookDto[]> {
    const webhooks = Array.from(webhookStore.values())
      .filter(w => w.organizationId === organizationId);
    return webhooks.map(w => this.toDto(w));
  }

  async findOne(organizationId: string, id: string): Promise<WebhookDto> {
    const webhook = webhookStore.get(id);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    return this.toDto(webhook);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateWebhookDto,
  ): Promise<WebhookDto> {
    const webhook = webhookStore.get(id);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }

    const updated: WebhookRecord = {
      ...webhook,
      name: dto.name ?? webhook.name,
      url: dto.url ?? webhook.url,
      secret: dto.secret ?? webhook.secret,
      events: dto.events ?? webhook.events,
      isActive: dto.isActive ?? webhook.isActive,
      headers: dto.headers ?? webhook.headers,
      updatedAt: new Date(),
    };

    webhookStore.set(id, updated);
    return this.toDto(updated);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const webhook = webhookStore.get(id);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    webhookStore.delete(id);
    this.logger.log(`Deleted webhook ${id}`);
  }

  async testWebhook(
    organizationId: string,
    id: string,
    dto: TestWebhookDto,
  ): Promise<TestWebhookResultDto> {
    const webhook = webhookStore.get(id);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }

    const testPayload = {
      event: dto.eventType || WebhookEventType.CONTROL_UPDATED,
      timestamp: new Date().toISOString(),
      test: true,
      data: {
        id: 'test-id',
        message: 'This is a test webhook delivery',
      },
    };

    return this.sendWebhook(webhook, dto.eventType || WebhookEventType.CONTROL_UPDATED, testPayload);
  }

  async getDeliveries(
    organizationId: string,
    webhookId: string,
    query: WebhookDeliveryQueryDto,
  ) {
    const webhook = webhookStore.get(webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    let filtered = deliveryStore.filter(d => d.webhookId === webhookId);

    if (query.eventType) {
      filtered = filtered.filter(d => d.eventType === query.eventType);
    }

    if (query.successOnly !== undefined) {
      filtered = filtered.filter(d => d.success === query.successOnly);
    }

    const total = filtered.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const results = filtered.slice(offset, offset + pagination.limit);

    return createPaginatedResponse(results, total, pagination);
  }

  async retryDelivery(
    organizationId: string,
    webhookId: string,
    deliveryId: string,
  ): Promise<TestWebhookResultDto> {
    const webhook = webhookStore.get(webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const delivery = deliveryStore.find(d => d.id === deliveryId && d.webhookId === webhookId);
    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    return this.sendWebhook(webhook, delivery.eventType, delivery.payload);
  }

  // Called by other services to trigger webhooks
  async triggerEvent(
    organizationId: string,
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = Array.from(webhookStore.values())
      .filter(w => 
        w.organizationId === organizationId && 
        w.isActive && 
        w.events.includes(eventType)
      );

    for (const webhook of webhooks) {
      // Fire and forget - don't block the caller
      this.sendWebhook(webhook, eventType, payload).catch(err => {
        this.logger.error(`Failed to send webhook ${webhook.id}: ${err.message}`);
      });
    }
  }

  private async sendWebhook(
    webhook: WebhookRecord,
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
  ): Promise<TestWebhookResultDto> {
    const startTime = Date.now();
    const deliveryId = crypto.randomUUID();

    const body = JSON.stringify({
      id: deliveryId,
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-ID': webhook.id,
      'X-Webhook-Event': eventType,
      'X-Delivery-ID': deliveryId,
      ...webhook.headers,
    };

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const duration = Date.now() - startTime;
      const success = response.ok;

      // Update webhook stats
      webhook.lastTriggeredAt = new Date();
      if (success) {
        webhook.successCount++;
        webhook.status = WebhookStatus.ACTIVE;
        webhook.lastError = undefined;
      } else {
        webhook.failureCount++;
        webhook.lastError = `HTTP ${response.status}`;
        if (webhook.failureCount > 10) {
          webhook.status = WebhookStatus.FAILED;
        }
      }
      webhook.updatedAt = new Date();
      webhookStore.set(webhook.id, webhook);

      // Store delivery record
      const delivery: WebhookDeliveryDto = {
        id: deliveryId,
        webhookId: webhook.id,
        eventType,
        payload,
        statusCode: response.status,
        success,
        duration,
        createdAt: new Date(),
      };
      deliveryStore.unshift(delivery);

      // Keep only last 1000 deliveries per webhook
      const webhookDeliveries = deliveryStore.filter(d => d.webhookId === webhook.id);
      if (webhookDeliveries.length > 1000) {
        const toRemove = webhookDeliveries.slice(1000);
        toRemove.forEach(d => {
          const idx = deliveryStore.indexOf(d);
          if (idx > -1) deliveryStore.splice(idx, 1);
        });
      }

      return {
        success,
        statusCode: response.status,
        response: success ? 'OK' : await response.text().catch(() => 'Unable to read response'),
        duration,
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      webhook.lastTriggeredAt = new Date();
      webhook.failureCount++;
      webhook.lastError = errorMessage;
      if (webhook.failureCount > 10) {
        webhook.status = WebhookStatus.FAILED;
      }
      webhook.updatedAt = new Date();
      webhookStore.set(webhook.id, webhook);

      // Store failed delivery
      const delivery: WebhookDeliveryDto = {
        id: deliveryId,
        webhookId: webhook.id,
        eventType,
        payload,
        statusCode: 0,
        success: false,
        error: errorMessage,
        duration,
        createdAt: new Date(),
      };
      deliveryStore.unshift(delivery);

      return {
        success: false,
        statusCode: 0,
        error: errorMessage,
        duration,
      };
    }
  }

  private toDto(webhook: WebhookRecord): WebhookDto {
    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events as WebhookEventType[],
      status: webhook.status as WebhookStatus,
      isActive: webhook.isActive,
      lastTriggeredAt: webhook.lastTriggeredAt,
      lastError: webhook.lastError,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }
}
