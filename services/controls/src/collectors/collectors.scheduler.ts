import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CollectorsService } from './collectors.service';

@Injectable()
export class CollectorsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollectorsScheduler.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Run every 5 minutes
  private readonly POLL_INTERVAL = 5 * 60 * 1000;

  constructor(private readonly collectorsService: CollectorsService) {}

  onModuleInit() {
    this.logger.log('Starting collectors scheduler...');
    this.start();
  }

  onModuleDestroy() {
    this.logger.log('Stopping collectors scheduler...');
    this.stop();
  }

  start() {
    if (this.intervalHandle) {
      return;
    }

    // Run immediately on startup, then on interval
    this.checkAndRunDueCollectors();

    this.intervalHandle = setInterval(() => {
      this.checkAndRunDueCollectors();
    }, this.POLL_INTERVAL);

    this.logger.log(`Collectors scheduler started (polling every ${this.POLL_INTERVAL / 1000}s)`);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async checkAndRunDueCollectors() {
    if (this.isRunning) {
      this.logger.debug('Scheduler already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      const dueCollectors = await this.collectorsService.getDueCollectors();

      if (dueCollectors.length === 0) {
        this.logger.debug('No collectors due to run');
        return;
      }

      this.logger.log(`Found ${dueCollectors.length} collectors due to run`);

      for (const collector of dueCollectors) {
        try {
          this.logger.log(`Running scheduled collector: ${collector.name} (${collector.id})`);
          
          // Run the collector with a system user ID
          await this.collectorsService.run(
            collector.id,
            collector.organizationId,
            'system-scheduler', // System user for scheduled runs
          );

          this.logger.log(`Completed scheduled collector: ${collector.name}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to run scheduled collector ${collector.id}: ${error.message}`,
            error.stack,
          );
        }
      }

    } catch (error: any) {
      this.logger.error(`Scheduler error: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger a check (for testing/admin purposes)
   */
  async triggerCheck() {
    await this.checkAndRunDueCollectors();
  }
}



