import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { THROTTLER_LIMIT, THROTTLER_TTL } from '@nestjs/throttler/dist/throttler.constants';
import { MappingSuggestionsController } from './mapping-suggestions.controller';
import { MappingSuggestionsService } from './mapping-suggestions.service';

describe('MappingSuggestionsController', () => {
  let controller: MappingSuggestionsController;
  let reflector: Reflector;
  const serviceMock = { suggest: jest.fn() };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MappingSuggestionsController],
      providers: [Reflector, { provide: MappingSuggestionsService, useValue: serviceMock }],
    }).compile();
    controller = moduleRef.get(MappingSuggestionsController);
    reflector = moduleRef.get(Reflector);
    jest.clearAllMocks();
  });

  // ------------------------------------------------------------
  // RBAC metadata — RolesGuard reads `roles` reflector key
  // ------------------------------------------------------------
  it('restricts POST /api/mappings/suggest to admin and compliance_manager', () => {
    const roles = reflector.get<string[]>('roles', controller.suggest);
    expect(roles).toEqual(expect.arrayContaining(['admin', 'compliance_manager']));
  });

  it('does NOT include auditor in the role list', () => {
    const roles = reflector.get<string[]>('roles', controller.suggest);
    expect(roles).not.toContain('auditor');
  });

  it('does NOT include viewer in the role list', () => {
    const roles = reflector.get<string[]>('roles', controller.suggest);
    expect(roles).not.toContain('viewer');
  });

  it('does NOT include control_owner in the role list', () => {
    const roles = reflector.get<string[]>('roles', controller.suggest);
    expect(roles).not.toContain('control_owner');
  });

  // ------------------------------------------------------------
  // Throttle metadata — @Throttle({ default: { limit: 10, ttl: 60000 } })
  // is applied to the handler. The ThrottlerGuard reads the same constants.
  // ------------------------------------------------------------
  it('applies @Throttle limit=10 / ttl=60000 to the suggest handler', () => {
    const limit = Reflect.getMetadata(`${THROTTLER_LIMIT}default`, controller.suggest);
    const ttl = Reflect.getMetadata(`${THROTTLER_TTL}default`, controller.suggest);
    expect(limit).toBe(10);
    expect(ttl).toBe(60000);
  });

  // ------------------------------------------------------------
  // Plumbing
  // ------------------------------------------------------------
  it('delegates to MappingSuggestionsService.suggest with user context', async () => {
    serviceMock.suggest.mockResolvedValue({
      direction: 'requirement-to-controls',
      suggestions: [],
      isMockMode: true,
    });
    await controller.suggest({ frameworkId: 'fw', requirementId: 'req' }, {
      userId: 'u1',
      organizationId: 'org1',
      email: 'x@y.z',
      role: 'admin',
    } as never);
    expect(serviceMock.suggest).toHaveBeenCalledWith(
      { frameworkId: 'fw', requirementId: 'req' },
      'u1',
      'org1'
    );
  });
});
