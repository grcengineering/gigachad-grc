import Redis, { RedisOptions } from 'ioredis';
import { Logger } from '@nestjs/common';
import { EventBus, GrcEvent } from './event-bus.interface';

/**
 * Redis connection resilience configuration
 */
const REDIS_RESILIENCE_CONFIG = {
  /** Maximum reconnection attempts (0 = infinite) */
  maxReconnectAttempts: 20,
  /** Initial reconnection delay (ms) */
  reconnectBaseDelay: 1000,
  /** Maximum reconnection delay (ms) */
  reconnectMaxDelay: 30000,
  /** Connection timeout (ms) */
  connectTimeout: 10000,
  /** Enable ready check to verify Redis is ready */
  enableReadyCheck: true,
  /** Keep alive interval (ms) */
  keepAlive: 30000,
};

export class RedisEventBus implements EventBus {
  private readonly logger = new Logger(RedisEventBus.name);
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, Set<(event: unknown) => void | Promise<void>>>;
  private isConnected = false;
  private subscribedChannels: Set<string> = new Set();

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    const password = process.env.REDIS_PASSWORD;

    const baseOptions: RedisOptions = {
      password: password || undefined,
      // Resilience options
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (REDIS_RESILIENCE_CONFIG.maxReconnectAttempts > 0 && 
            times > REDIS_RESILIENCE_CONFIG.maxReconnectAttempts) {
          this.logger.error(`Max reconnection attempts (${times}) reached`);
          return null; // Stop retrying
        }
        // Exponential backoff with cap
        const delay = Math.min(
          REDIS_RESILIENCE_CONFIG.reconnectBaseDelay * Math.pow(2, times - 1),
          REDIS_RESILIENCE_CONFIG.reconnectMaxDelay
        );
        this.logger.log(`Reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
      connectTimeout: REDIS_RESILIENCE_CONFIG.connectTimeout,
      enableReadyCheck: REDIS_RESILIENCE_CONFIG.enableReadyCheck,
      keepAlive: REDIS_RESILIENCE_CONFIG.keepAlive,
      // Auto-reconnect
      lazyConnect: false,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    };

    this.publisher = new Redis(url, { ...baseOptions });
    this.subscriber = new Redis(url, { ...baseOptions });
    this.handlers = new Map();

    this.setupConnectionHandlers();
  }

  /**
   * Setup connection event handlers for resilience
   */
  private setupConnectionHandlers(): void {
    // Publisher connection events
    this.setupRedisEventHandlers(this.publisher, 'Publisher');
    
    // Subscriber connection events
    this.setupRedisEventHandlers(this.subscriber, 'Subscriber');
    
    // Subscriber-specific message handling
    this.setupSubscriberMessageHandler();
  }

  /**
   * Setup event handlers for a Redis connection
   */
  private setupRedisEventHandlers(redis: Redis, name: string): void {
    redis.on('connect', () => {
      this.logger.log(`${name}: Connecting...`);
    });

    redis.on('ready', () => {
      this.logger.log(`${name}: Ready and accepting commands`);
      if (name === 'Subscriber') {
        this.isConnected = true;
        // Resubscribe to all channels after reconnection
        this.resubscribeAllChannels();
      }
    });

    redis.on('error', (error) => {
      this.logger.error(`${name} error: ${error.message}`);
    });

    redis.on('close', () => {
      this.logger.log(`${name}: Connection closed`);
      if (name === 'Subscriber') {
        this.isConnected = false;
      }
    });

    redis.on('reconnecting', (delay: number) => {
      this.logger.log(`${name}: Reconnecting in ${delay}ms...`);
    });

    redis.on('end', () => {
      this.logger.warn(`${name}: Connection ended (no more reconnection attempts)`);
      if (name === 'Subscriber') {
        this.isConnected = false;
      }
    });
  }

  /**
   * Setup the subscriber message handler
   */
  private setupSubscriberMessageHandler(): void {

    this.subscriber.on('message', async (channel, message) => {
      const handlers = this.handlers.get(channel);
      if (!handlers) return;

      try {
        const event = JSON.parse(message);
        
        // Restore Date objects
        if (event.timestamp) {
          event.timestamp = new Date(event.timestamp);
        }

        for (const handler of handlers) {
          try {
            await handler(event);
          } catch (error) {
            this.logger.error(`Error in event handler for channel ${channel}: ${error}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error parsing event from channel ${channel}: ${error}`);
      }
    });
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private async resubscribeAllChannels(): Promise<void> {
    if (this.subscribedChannels.size === 0) return;

    this.logger.log(`Resubscribing to ${this.subscribedChannels.size} channels...`);
    
    for (const channel of this.subscribedChannels) {
      try {
        await this.subscriber.subscribe(channel);
        this.logger.debug(`Resubscribed to channel '${channel}'`);
      } catch (error) {
        this.logger.error(`Failed to resubscribe to channel '${channel}': ${error}`);
      }
    }
  }

  async publish<T>(channel: string, event: T): Promise<void> {
    const message = JSON.stringify(event);
    await this.publisher.publish(channel, message);
  }

  async subscribe<T>(
    channel: string,
    handler: (event: T) => void | Promise<void>
  ): Promise<void> {
    // Add handler to map
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      // Track subscribed channels for resubscription after reconnect
      this.subscribedChannels.add(channel);
      // Subscribe to Redis channel
      await this.subscriber.subscribe(channel);
    }

    this.handlers.get(channel)!.add(handler as (event: unknown) => void | Promise<void>);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
    this.subscribedChannels.delete(channel);
    await this.subscriber.unsubscribe(channel);
  }

  async close(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
    this.isConnected = false;
  }

  /**
   * Publish a typed GRC event
   */
  async publishGrcEvent<T>(channel: string, event: GrcEvent<T>): Promise<void> {
    await this.publish(channel, event);
  }

  /**
   * Subscribe to typed GRC events
   */
  async subscribeToGrcEvents<T>(
    channel: string,
    handler: (event: GrcEvent<T>) => void | Promise<void>
  ): Promise<void> {
    await this.subscribe<GrcEvent<T>>(channel, handler);
  }

  /**
   * Check if connected to Redis
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Health check for Redis connection
   * Returns status and latency information
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    latencyMs: number;
    subscriberConnected: boolean;
    publisherConnected: boolean;
    subscribedChannels: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Ping both connections
      const [subscriberPing, publisherPing] = await Promise.all([
        this.subscriber.ping().catch(() => null),
        this.publisher.ping().catch(() => null),
      ]);
      
      const latencyMs = Date.now() - startTime;
      const subscriberConnected = subscriberPing === 'PONG';
      const publisherConnected = publisherPing === 'PONG';
      
      let status: 'healthy' | 'unhealthy' | 'degraded';
      if (subscriberConnected && publisherConnected) {
        status = 'healthy';
      } else if (subscriberConnected || publisherConnected) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      return {
        status,
        latencyMs,
        subscriberConnected,
        publisherConnected,
        subscribedChannels: this.subscribedChannels.size,
      };
    } catch {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        subscriberConnected: false,
        publisherConnected: false,
        subscribedChannels: this.subscribedChannels.size,
      };
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    isConnected: boolean;
    subscribedChannels: number;
    activeHandlers: number;
  } {
    let activeHandlers = 0;
    for (const handlers of this.handlers.values()) {
      activeHandlers += handlers.size;
    }
    
    return {
      isConnected: this.isConnected,
      subscribedChannels: this.subscribedChannels.size,
      activeHandlers,
    };
  }
}

// Singleton instance
let eventBusInstance: RedisEventBus | null = null;

export function getEventBus(): RedisEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new RedisEventBus();
  }
  return eventBusInstance;
}

export async function closeEventBus(): Promise<void> {
  if (eventBusInstance) {
    await eventBusInstance.close();
    eventBusInstance = null;
  }
}



