import Redis from 'ioredis';
import { EventBus, GrcEvent } from './event-bus.interface';

export class RedisEventBus implements EventBus {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, Set<(event: any) => void | Promise<void>>>;
  private isConnected = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    const password = process.env.REDIS_PASSWORD;

    const options: any = {};
    if (password) {
      options.password = password;
    }

    this.publisher = new Redis(url, options);
    this.subscriber = new Redis(url, options);
    this.handlers = new Map();

    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    this.subscriber.on('connect', () => {
      this.isConnected = true;
    });

    this.subscriber.on('error', (error) => {
      console.error('Redis subscriber error:', error);
    });

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
            console.error(`Error in event handler for channel ${channel}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error parsing event from channel ${channel}:`, error);
      }
    });
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
      // Subscribe to Redis channel
      await this.subscriber.subscribe(channel);
    }

    this.handlers.get(channel)!.add(handler);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
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



