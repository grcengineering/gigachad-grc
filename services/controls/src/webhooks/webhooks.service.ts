import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { Prisma, WebhookSubscription } from '@prisma/client';
import { auditMutation } from '../common/audit-mutation';
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
import { parsePaginationParams, createPaginatedResponse, safeFetch } from '@gigachad-grc/shared';

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

@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const interrupted = await this.prisma.webhookDelivery.findMany({
      where: { status: { in: ['pending', 'delivering', 'retrying'] } },
      include: { subscription: true },
    });
    for (const delivery of interrupted) {
      if (!delivery.subscription.isActive) continue;
      this.sendWebhook(
        this.toRecord(delivery.subscription),
        delivery.event as WebhookEventType,
        delivery.payload as Record<string, unknown>,
        delivery.id,
      ).catch((error) => {
        this.logger.error(`Failed to resume webhook delivery ${delivery.id}: ${error.message}`);
      });
    }
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateWebhookDto,
  ): Promise<WebhookDto> {
    const webhook = await this.prisma.webhookSubscription.create({
      data: {
        organizationId,
        name: dto.name,
        url: dto.url,
        events: dto.events,
        secret: dto.secret || crypto.randomBytes(32).toString('hex'),
        isActive: dto.isActive ?? true,
        headers: dto.headers ? JSON.stringify(dto.headers) : null,
        createdBy: userId,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'WebhookSubscription',
      entityId: webhook.id,
      entityName: webhook.name,
      description: `Created webhook subscription: ${webhook.name}`,
    });
    this.logger.log(`Created webhook ${webhook.id} for org ${organizationId}`);
    return this.toDto(this.toRecord(webhook));
  }

  async findAll(organizationId: string): Promise<WebhookDto[]> {
    const webhooks = await this.prisma.webhookSubscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(webhooks.map((w) => this.toDtoWithCounts(w)));
  }

  async findOne(organizationId: string, id: string): Promise<WebhookDto> {
    const webhook = await this.prisma.webhookSubscription.findFirst({
      where: { id, organizationId },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    return this.toDtoWithCounts(webhook);
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdateWebhookDto,
  ): Promise<WebhookDto> {
    const existing = await this.prisma.webhookSubscription.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    const updated = await this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        name: dto.name,
        url: dto.url,
        secret: dto.secret,
        events: dto.events,
        isActive: dto.isActive,
        headers: dto.headers ? JSON.stringify(dto.headers) : undefined,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'WebhookSubscription',
      entityId: id,
      entityName: updated.name,
      description: `Updated webhook subscription: ${updated.name}`,
    });
    return this.toDtoWithCounts(updated);
  }

  async delete(organizationId: string, userId: string, id: string): Promise<void> {
    const webhook = await this.prisma.webhookSubscription.findFirst({
      where: { id, organizationId },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    await this.prisma.webhookSubscription.delete({ where: { id } });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'WebhookSubscription',
      entityId: id,
      entityName: webhook.name,
      description: `Deleted webhook subscription: ${webhook.name}`,
    });
    this.logger.log(`Deleted webhook ${id}`);
  }

  async testWebhook(
    organizationId: string,
    id: string,
    dto: TestWebhookDto
  ): Promise<TestWebhookResultDto> {
    const webhook = await this.prisma.webhookSubscription.findFirst({
      where: { id, organizationId },
    });
    if (!webhook) {
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

    return this.sendWebhook(
      this.toRecord(webhook),
      dto.eventType || WebhookEventType.CONTROL_UPDATED,
      testPayload
    );
  }

  async getDeliveries(organizationId: string, webhookId: string, query: WebhookDeliveryQueryDto) {
    const webhook = await this.prisma.webhookSubscription.findFirst({
      where: { id: webhookId, organizationId },
      select: { id: true },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const where: Prisma.WebhookDeliveryWhereInput = {
      subscriptionId: webhookId,
      event: query.eventType,
      status: query.successOnly === undefined
        ? undefined
        : query.successOnly ? 'delivered' : 'failed',
    };
    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);
    const results: WebhookDeliveryDto[] = deliveries.map((delivery) => ({
      id: delivery.id,
      webhookId: delivery.subscriptionId,
      eventType: delivery.event as WebhookEventType,
      payload: delivery.payload as Record<string, unknown>,
      statusCode: delivery.responseStatus ?? 0,
      success: delivery.status === 'delivered',
      error: delivery.errorMessage ?? undefined,
      duration: delivery.durationMs,
      createdAt: delivery.createdAt,
    }));
    return createPaginatedResponse(results, total, pagination);
  }

  async retryDelivery(
    organizationId: string,
    webhookId: string,
    deliveryId: string
  ): Promise<TestWebhookResultDto> {
    const webhook = await this.prisma.webhookSubscription.findFirst({
      where: { id: webhookId, organizationId },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, subscriptionId: webhookId },
    });
    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    return this.sendWebhook(
      this.toRecord(webhook),
      delivery.event as WebhookEventType,
      delivery.payload as Record<string, unknown>,
      delivery.id,
    );
  }

  // Called by other services to trigger webhooks
  async triggerEvent(
    organizationId: string,
    eventType: WebhookEventType,
    payload: Record<string, unknown>
  ): Promise<void> {
    const webhooks = await this.prisma.webhookSubscription.findMany({
      where: { organizationId, isActive: true, events: { has: eventType } },
    });

    for (const webhook of webhooks) {
      // Fire and forget - don't block the caller
      this.sendWebhook(this.toRecord(webhook), eventType, payload).catch((err) => {
        this.logger.error(`Failed to send webhook ${webhook.id}: ${err.message}`);
      });
    }
  }

  private async sendWebhook(
    webhook: WebhookRecord,
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
    existingDeliveryId?: string,
  ): Promise<TestWebhookResultDto> {
    const startTime = Date.now();
    const deliveryId = existingDeliveryId || crypto.randomUUID();
    if (existingDeliveryId) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'delivering',
          attempts: { increment: 1 },
          errorMessage: null,
        },
      });
    } else {
      await this.prisma.webhookDelivery.create({
        data: {
          id: deliveryId,
          subscriptionId: webhook.id,
          event: eventType,
          payload: payload as Prisma.InputJsonValue,
          status: 'delivering',
          attempts: 1,
        },
      });
    }

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
      const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await safeFetch(
        webhook.url,
        {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(30000), // 30 second timeout
        },
        { allowPrivateIPs: false }
      );

      const duration = Date.now() - startTime;
      const success = response.ok;
      const responseBody = await response.text().catch(() => 'Unable to read response');
      await this.prisma.$transaction([
        this.prisma.webhookSubscription.update({
          where: { id: webhook.id },
          data: {
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: success ? 'delivered' : 'failed',
            consecutiveFailures: success ? 0 : { increment: 1 },
          },
        }),
        this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: success ? 'delivered' : 'failed',
            responseStatus: response.status,
            responseBody,
            deliveredAt: success ? new Date() : null,
            errorMessage: success ? null : `HTTP ${response.status}`,
            durationMs: duration,
          },
        }),
      ]);
      await auditMutation(this.prisma, {
        organizationId: webhook.organizationId,
        action: success ? 'DELIVER' : 'DELIVERY_FAILED',
        entityType: 'WebhookDelivery',
        entityId: deliveryId,
        description: `${success ? 'Delivered' : 'Failed'} webhook event ${eventType}`,
        metadata: { webhookId: webhook.id, statusCode: response.status },
      });

      return {
        success,
        statusCode: response.status,
        response: success ? 'OK' : responseBody,
        duration,
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.$transaction([
        this.prisma.webhookSubscription.update({
          where: { id: webhook.id },
          data: {
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: 'failed',
            consecutiveFailures: { increment: 1 },
          },
        }),
        this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'failed',
            errorMessage,
            durationMs: duration,
          },
        }),
      ]);
      await auditMutation(this.prisma, {
        organizationId: webhook.organizationId,
        action: 'DELIVERY_FAILED',
        entityType: 'WebhookDelivery',
        entityId: deliveryId,
        description: `Failed webhook event ${eventType}`,
        metadata: { webhookId: webhook.id, error: errorMessage },
      });

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

  private toRecord(webhook: WebhookSubscription): WebhookRecord {
    let headers: Record<string, string> | undefined;
    if (webhook.headers) {
      try {
        headers = JSON.parse(webhook.headers) as Record<string, string>;
      } catch {
        this.logger.warn(`Ignoring invalid persisted headers for webhook ${webhook.id}`);
      }
    }
    return {
      id: webhook.id,
      organizationId: webhook.organizationId,
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      isActive: webhook.isActive,
      headers,
      status: !webhook.isActive
        ? WebhookStatus.INACTIVE
        : webhook.consecutiveFailures > 10
          ? WebhookStatus.FAILED
          : WebhookStatus.ACTIVE,
      lastTriggeredAt: webhook.lastDeliveryAt ?? undefined,
      lastError: webhook.lastDeliveryStatus === 'failed' ? 'Last delivery failed' : undefined,
      successCount: 0,
      failureCount: 0,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  private async toDtoWithCounts(webhook: WebhookSubscription): Promise<WebhookDto> {
    const [successCount, failureCount] = await Promise.all([
      this.prisma.webhookDelivery.count({
        where: { subscriptionId: webhook.id, status: 'delivered' },
      }),
      this.prisma.webhookDelivery.count({
        where: { subscriptionId: webhook.id, status: 'failed' },
      }),
    ]);
    return this.toDto({
      ...this.toRecord(webhook),
      successCount,
      failureCount,
    });
  }
}
