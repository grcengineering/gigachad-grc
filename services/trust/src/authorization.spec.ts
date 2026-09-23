import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, UserContext } from '@gigachad-grc/shared';
import { TrustAiController } from './ai/trust-ai.controller';
import { AuditService } from './common/audit.service';
import { PrismaService } from './common/prisma.service';
import { TrustConfigController } from './config/trust-config.controller';
import { KnowledgeBaseController } from './knowledge-base/knowledge-base.controller';
import { QuestionnairesController } from './questionnaires/questionnaires.controller';
import { TemplatesController } from './templates/templates.controller';
import { TemplatesService } from './templates/templates.service';
import { CreateTrustCenterContentDto } from './trust-center/dto/create-content.dto';
import { TrustCenterController } from './trust-center/trust-center.controller';
import { TrustCenterService } from './trust-center/trust-center.service';

const authenticatedUser: UserContext = {
  userId: 'user-a',
  keycloakId: 'keycloak-a',
  email: 'user-a@example.com',
  organizationId: 'org-a',
  role: 'admin',
  permissions: [],
};

function viewerContext(controller: object, method: string): ExecutionContext {
  return {
    switchToHttp: () =>
      ({
        getRequest: () => ({ user: { ...authenticatedUser, role: 'viewer' } }),
      }) as ReturnType<ExecutionContext['switchToHttp']>,
    getHandler: () => Object.getPrototypeOf(controller)[method],
    getClass: () => controller.constructor,
  } as ExecutionContext;
}

describe('Trust authorization boundaries', () => {
  it('derives creation tenants from the authenticated user', () => {
    const trustCenterService = { createContent: jest.fn() };
    const templatesService = { create: jest.fn() };
    const contentController = new TrustCenterController(trustCenterService as never);
    const templateController = new TemplatesController(templatesService as never);
    const content = {
      organizationId: 'org-attacker',
      section: 'security',
      title: 'Security',
      content: 'Published content',
    } as CreateTrustCenterContentDto;
    const template = {
      organizationId: 'org-attacker',
      title: 'Standard answer',
      content: 'Approved answer',
    } as unknown as Parameters<TemplatesController['create']>[0];

    contentController.createContent(content, authenticatedUser);
    templateController.create(template, authenticatedUser);

    expect(trustCenterService.createContent).toHaveBeenCalledWith('org-a', content, 'user-a');
    expect(templatesService.create).toHaveBeenCalledWith('org-a', template, 'user-a');
  });

  it('cannot persist a body-injected tenant', async () => {
    const prisma = {
      trustCenterContent: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 'content-1', ...data })),
      },
      answerTemplate: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 'template-1', ...data })),
      },
    };
    const audit = { log: jest.fn() };
    const contentService = new TrustCenterService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService
    );
    const templateService = new TemplatesService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService
    );

    await contentService.createContent(
      'org-a',
      {
        organizationId: 'org-attacker',
        section: 'security',
        title: 'Security',
        content: 'Published content',
      } as CreateTrustCenterContentDto,
      'user-a'
    );
    await templateService.create(
      'org-a',
      {
        organizationId: 'org-attacker',
        title: 'Standard answer',
        content: 'Approved answer',
      } as unknown as Parameters<TemplatesService['create']>[1],
      'user-a'
    );

    expect(prisma.trustCenterContent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-a' }) })
    );
    expect(prisma.answerTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-a' }) })
    );
  });

  it('keeps public reads tenant-resolved and published-only', async () => {
    const prisma = {
      trustCenterConfig: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'config-1',
          organizationId: 'org-a',
          isEnabled: true,
          companyName: 'Org A',
        }),
      },
      trustCenterContent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new TrustCenterService(
      prisma as unknown as PrismaService,
      { log: jest.fn() } as unknown as AuditService
    );

    await service.getPublicTrustCenter('org-a');

    expect(prisma.trustCenterContent.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-a', isPublished: true },
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    });
  });

  it.each([
    [TrustCenterController, 'createContent'],
    [TemplatesController, 'create'],
    [QuestionnairesController, 'create'],
    [KnowledgeBaseController, 'create'],
    [TrustConfigController, 'updateConfiguration'],
    [TrustAiController, 'draftAnswer'],
  ])('denies viewer mutation on %s.%s with 403', (Controller, method) => {
    const guard = new RolesGuard(new Reflector());
    const controller = Object.create(Controller.prototype);

    expect(() => guard.canActivate(viewerContext(controller, method))).toThrow(ForbiddenException);
    try {
      guard.canActivate(viewerContext(controller, method));
    } catch (error) {
      expect((error as ForbiddenException).getStatus()).toBe(403);
    }
  });

  it('registers suggestion routes before the dynamic id route', () => {
    const methods = Object.getOwnPropertyNames(QuestionnairesController.prototype);
    const idRouteIndex = methods.indexOf('findOne');
    expect(methods.indexOf('findSimilarQuestions')).toBeLessThan(idRouteIndex);
    expect(methods.indexOf('getAnswerSuggestions')).toBeLessThan(idRouteIndex);
  });
});
