import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { ScimController } from './scim.controller';
import { ScimService } from './scim.service';

describe('ScimController conformance CRUD', () => {
  let app: INestApplication;
  let baseUrl: string;
  const organizationId = 'a17a0371-4e0a-4eac-a834-88b8af1bc9e5';
  const authHeader = 'Bearer tenant-scim-token';

  const user = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: 'b17a0371-4e0a-4eac-a834-88b8af1bc9e5',
    userName: 'user@example.com',
    active: true,
    meta: {
      resourceType: 'User',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
  };
  const group = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: 'c17a0371-4e0a-4eac-a834-88b8af1bc9e5',
    displayName: 'Security',
    members: [],
    meta: {
      resourceType: 'Group',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
  };

  const scimService = {
    isConfigured: jest.fn(),
    authenticateToken: jest.fn(),
    listUsers: jest.fn(),
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    patchUser: jest.fn(),
    deleteUser: jest.fn(),
    listGroups: jest.fn(),
    getGroup: jest.fn(),
    createGroup: jest.fn(),
    updateGroup: jest.fn(),
    patchGroup: jest.fn(),
    deleteGroup: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    scimService.isConfigured.mockResolvedValue(true);
    scimService.authenticateToken.mockResolvedValue(organizationId);

    const moduleRef = await Test.createTestingModule({
      controllers: [ScimController],
      providers: [{ provide: ScimService, useValue: scimService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  const call = (
    path: string,
    method = 'GET',
    body?: Record<string, unknown>,
    authorization = authHeader
  ) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  it('implements authenticated User list/get/create/replace/patch/delete', async () => {
    const list = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 1,
      startIndex: 1,
      itemsPerPage: 1,
      Resources: [user],
    };
    scimService.listUsers.mockResolvedValue(list);
    scimService.getUser.mockResolvedValue(user);
    scimService.createUser.mockResolvedValue(user);
    scimService.updateUser.mockResolvedValue(user);
    scimService.patchUser.mockResolvedValue(user);
    scimService.deleteUser.mockResolvedValue(undefined);

    let response = await call('/scim/v2/Users');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(list);
    response = await call(`/scim/v2/Users/${user.id}`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(user);
    response = await call('/scim/v2/Users', 'POST', {
      schemas: user.schemas,
      userName: user.userName,
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(user);
    response = await call(`/scim/v2/Users/${user.id}`, 'PUT', {
      schemas: user.schemas,
      userName: user.userName,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(user);
    response = await call(`/scim/v2/Users/${user.id}`, 'PATCH', {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{ op: 'replace', path: 'active', value: false }],
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(user);
    response = await call(`/scim/v2/Users/${user.id}`, 'DELETE');
    expect(response.status).toBe(204);

    expect(scimService.authenticateToken).toHaveBeenCalledWith('tenant-scim-token');
    expect(scimService.createUser).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({ userName: user.userName })
    );
  });

  it('implements authenticated Group list/get/create/replace/patch/delete', async () => {
    const list = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 1,
      startIndex: 1,
      itemsPerPage: 1,
      Resources: [group],
    };
    scimService.listGroups.mockResolvedValue(list);
    scimService.getGroup.mockResolvedValue(group);
    scimService.createGroup.mockResolvedValue(group);
    scimService.updateGroup.mockResolvedValue(group);
    scimService.patchGroup.mockResolvedValue(group);
    scimService.deleteGroup.mockResolvedValue(undefined);

    let response = await call('/scim/v2/Groups');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(list);
    response = await call(`/scim/v2/Groups/${group.id}`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(group);
    response = await call('/scim/v2/Groups', 'POST', {
      schemas: group.schemas,
      displayName: group.displayName,
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(group);
    response = await call(`/scim/v2/Groups/${group.id}`, 'PUT', {
      schemas: group.schemas,
      displayName: group.displayName,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(group);
    response = await call(`/scim/v2/Groups/${group.id}`, 'PATCH', {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{ op: 'replace', path: 'displayName', value: 'Security' }],
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(group);
    response = await call(`/scim/v2/Groups/${group.id}`, 'DELETE');
    expect(response.status).toBe(204);

    expect(scimService.createGroup).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({ displayName: group.displayName })
    );
  });

  it('rejects unknown tokens without invoking tenant CRUD', async () => {
    scimService.authenticateToken.mockResolvedValue(null);

    const response = await call('/scim/v2/Users', 'GET', undefined, 'Bearer unknown');
    expect(response.status).toBe(401);
    expect(scimService.listUsers).not.toHaveBeenCalled();
  });

  it('fails discovery closed when no organization has SCIM enabled', async () => {
    scimService.isConfigured.mockResolvedValue(false);

    const response = await call('/scim/v2/ServiceProviderConfig', 'GET', undefined, '');
    expect(response.status).toBe(503);
  });
});
