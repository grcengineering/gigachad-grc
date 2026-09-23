import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { CombinedAuthGuard } from './jwt.guard';
import { isDevelopmentAuthEnvironment } from './auth-environment';

export { isDevelopmentAuthEnvironment } from './auth-environment';

export const DEVELOPMENT_AUTH_GUARD = 'GIGACHAD_DEVELOPMENT_AUTH_GUARD';

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
