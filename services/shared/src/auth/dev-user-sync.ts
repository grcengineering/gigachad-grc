import { DEV_USER } from './dev-user.constants';

/**
 * Minimal logger interface for dev user sync.
 */
interface LoggerLike {
  log: (message: string) => void;
  warn: (message: string) => void;
}

/**
 * Ensures the mock development user and organization exist in the database.
 *
 * Uses the upsert pattern to handle race conditions gracefully - if multiple
 * services start simultaneously, the first one creates the records and
 * subsequent calls become no-ops.
 *
 * @param prisma - Prisma client instance with organization and user models
 * @param logger - Logger instance for debug output
 *
 * @remarks
 * This function should be called once per guard instance on first request.
 * It's safe to call multiple times due to the upsert semantics.
 *
 * @example
 * ```typescript
 * if (!this.devUserSynced) {
 *   await ensureDevUserExists(this.prisma, this.logger);
 *   this.devUserSynced = true;
 * }
 * ```
 */
export async function ensureDevUserExists(
  prisma: { organization: any; user: any },
  logger: LoggerLike
): Promise<void> {
  try {
    // Upsert organization - creates if not exists, no-op if exists
    await prisma.organization.upsert({
      where: { id: DEV_USER.organizationId },
      update: {}, // No updates needed - just ensure it exists
      create: {
        id: DEV_USER.organizationId,
        name: 'Development Organization',
        slug: 'dev-org',
        description: 'Auto-created organization for development',
        status: 'active',
        settings: {
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
        },
      },
    });

    // Upsert user - creates if not exists, no-op if exists
    await prisma.user.upsert({
      where: { id: DEV_USER.userId },
      update: {}, // No updates needed - just ensure it exists
      create: {
        id: DEV_USER.userId,
        keycloakId: DEV_USER.keycloakId,
        email: DEV_USER.email,
        firstName: DEV_USER.firstName,
        lastName: DEV_USER.lastName,
        displayName: DEV_USER.displayName,
        organizationId: DEV_USER.organizationId,
        role: 'admin',
        status: 'active',
      },
    });

    logger.log('Dev user sync complete');
  } catch (error) {
    // Log but don't throw - the dev user might already exist via another path
    logger.warn(
      `Dev user sync warning: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
