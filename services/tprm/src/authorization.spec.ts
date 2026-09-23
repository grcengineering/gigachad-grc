import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@gigachad-grc/shared';
import { AssessmentsController } from './assessments/assessments.controller';
import { TprmConfigController } from './config/tprm-config.controller';
import { ContractsController } from './contracts/contracts.controller';
import { RiskAssessmentController } from './risk-assessment/risk-assessment.controller';
import { SecurityScannerController } from './security-scanner/security-scanner.controller';
import { VendorsController } from './vendors/vendors.controller';

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

describe('TPRM authorization boundaries', () => {
  it.each([
    [VendorsController, 'create'],
    [AssessmentsController, 'create'],
    [ContractsController, 'create'],
    [TprmConfigController, 'updateConfiguration'],
    [RiskAssessmentController, 'createAssessment'],
    [SecurityScannerController, 'initiateScan'],
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
    const controller = Object.create(VendorsController.prototype);
    expect(guard.canActivate(viewerContext(controller, 'findAll'))).toBe(true);
  });
});
