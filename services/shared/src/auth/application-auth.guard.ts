import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { CombinedAuthGuard } from './jwt.guard';

export const DEVELOPMENT_AUTH_GUARD = 'GIGACHAD_DEVELOPMENT_AUTH_GUARD';

export function isDevelopmentAuthEnvironment(
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return nodeEnv === 'development' || nodeEnv === 'test';
}

/**
 * Uses seeded development authentication only in explicit non-production
 * environments. Every other environment validates a JWT or persisted API key.
 */
@Injectable()
export class ApplicationAuthGuard implements CanActivate {
  constructor(
    @Inject(DEVELOPMENT_AUTH_GUARD)
    private readonly developmentGuard: CanActivate,
    private readonly productionGuard: CombinedAuthGuard
  ) {}

  canActivate(context: ExecutionContext): ReturnType<CanActivate['canActivate']> {
    if (isDevelopmentAuthEnvironment()) {
      return this.developmentGuard.canActivate(context);
    }
    return this.productionGuard.canActivate(context);
  }
}
