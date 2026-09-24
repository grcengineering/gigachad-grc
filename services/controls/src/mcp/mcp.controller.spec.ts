import { NotFoundException } from '@nestjs/common';
import { MCPController } from './mcp.controller';

describe('MCPController tenant process isolation', () => {
  const user = {
    userId: 'user-a',
    organizationId: 'org-a',
    email: 'admin@example.com',
    role: 'admin',
    name: 'Admin',
  } as any;

  it('returns 404 for an unknown server status', () => {
    const client = { getServerStatus: jest.fn().mockReturnValue(undefined) } as any;
    const controller = new MCPController(client, {} as any);
    expect(() => controller.getServerStatus('unknown', user)).toThrow(NotFoundException);
    expect(client.getServerStatus).toHaveBeenCalledWith('unknown', 'org-a');
  });

  it('starts and calls tools in the caller organization process', async () => {
    const client = {
      startServer: jest.fn().mockResolvedValue(undefined),
      callTool: jest.fn().mockResolvedValue({ ok: true }),
    } as any;
    const controller = new MCPController(client, {} as any);

    await controller.startServer('grc-evidence', user);
    await controller.callTool(
      'grc-evidence',
      { toolName: 'capture_screenshot', params: { url: 'https://example.com' } },
      user
    );

    expect(client.startServer).toHaveBeenCalledWith('grc-evidence', 'org-a');
    expect(client.callTool).toHaveBeenCalledWith(
      'grc-evidence',
      'capture_screenshot',
      { url: 'https://example.com' },
      'org-a'
    );
  });

  it('stores encrypted credentials for the caller organization', async () => {
    const client = {
      getServerStatus: jest.fn().mockReturnValue({
        status: 'stopped',
        config: { id: 'grc-evidence', name: 'Evidence MCP' },
      }),
    } as any;
    const credentials = { storeCredentials: jest.fn().mockResolvedValue(undefined) } as any;
    const controller = new MCPController(client, credentials);

    await controller.storeCredentials(
      'grc-evidence',
      { env: { GITHUB_TOKEN: 'secret-value' } },
      user
    );

    expect(credentials.storeCredentials).toHaveBeenCalledWith(
      'org-a',
      'grc-evidence',
      'grc-evidence',
      'Evidence MCP',
      { GITHUB_TOKEN: 'secret-value' },
      [],
      'user-a'
    );
  });
});
