import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@gigachad-grc/shared';
import { AuditAIController } from './ai/audit-ai.controller';
import { AnalyticsController } from './analytics/analytics.controller';
import { AuditsController } from './audits/audits.controller';
import { FindingsController } from './findings/findings.controller';
import { PlanningController } from './planning/planning.controller';
import { RemediationController } from './remediation/remediation.controller';
import { ReportsController } from './reports/reports.controller';
import { RequestsController } from './requests/requests.controller';
import { TemplatesController } from './templates/templates.controller';
import { TestProceduresController } from './test-procedures/test-procedures.controller';
import { WorkpapersController } from './workpapers/workpapers.controller';

function viewerContext(controller: object, method: string): ExecutionContext {
  return {
    switchToHttp: () =>
      ({
        getRequest: () => ({
          user: { userId: 'viewer-a', organizationId: 'org-a', role: 'viewer' },
        }),
      }) as ReturnType<ExecutionContext['switchToHttp']>,
    getHandler: () => Object.getPrototypeOf(controller)[method],
    getClass: () => controller.constructor,
  } as ExecutionContext;
}

describe('Audit authorization boundaries', () => {
  it.each([
    [AuditsController, 'create'],
    [RequestsController, 'create'],
    [FindingsController, 'create'],
    [PlanningController, 'create'],
    [RemediationController, 'createPlan'],
    [TemplatesController, 'create'],
    [TestProceduresController, 'create'],
    [WorkpapersController, 'create'],
    [AnalyticsController, 'createSnapshot'],
    [ReportsController, 'generateReport'],
    [AuditAIController, 'categorizeFinding'],
  ])('denies viewer mutation on %s.%s with 403', (Controller, method) => {
    const guard = new RolesGuard(new Reflector());
    const controller = Object.create(Controller.prototype);
    try {
      guard.canActivate(viewerContext(controller, method));
      throw new Error('Expected viewer mutation to be denied');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getStatus()).toBe(403);
    }
  });

  it('keeps viewer reads available', () => {
    const guard = new RolesGuard(new Reflector());
    const controller = Object.create(AuditsController.prototype);
    expect(guard.canActivate(viewerContext(controller, 'findAll'))).toBe(true);
  });
});
