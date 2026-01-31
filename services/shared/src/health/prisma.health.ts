import { Injectable } from '@nestjs/common';

// Interface for any PrismaService implementation
interface IPrismaClient {
  $queryRaw: <T = unknown>(query: TemplateStringsArray) => Promise<T>;
}

export interface HealthIndicatorResult {
  [key: string]: {
    status: 'up' | 'down';
    message?: string;
  } & Record<string, unknown>;
}

@Injectable()
export class PrismaHealthIndicator {
  private prisma: IPrismaClient | null = null;

  /**
   * Set the Prisma client to use for health checks
   * This should be called during module initialization
   */
  setPrismaClient(prisma: IPrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get status helper
   */
  protected getStatus(
    key: string,
    isHealthy: boolean,
    data?: Record<string, unknown>,
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...data,
      },
    };
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.prisma) {
      // If no prisma client is set, assume healthy (for services without DB)
      return this.getStatus(key, true, { message: 'No database configured' });
    }

    try {
      // Execute a simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.getStatus(key, false, { message: errorMessage });
    }
  }
}
