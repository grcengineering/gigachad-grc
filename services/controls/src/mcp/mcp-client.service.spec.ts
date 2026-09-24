import { ConfigService } from '@nestjs/config';
import { MCPClientService } from './mcp-client.service';

describe('MCPClientService process contracts', () => {
  it('rejects immediately when a child exits before MCP initialization', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const service = new MCPClientService(new ConfigService());
    await service.onModuleInit();

    const state = service.getServerStatus('grc-evidence')!;
    const originalArgs = state.config.args;
    const originalRetries = state.config.maxRetries;
    state.config.args = ['definitely-does-not-exist.js'];
    state.config.maxRetries = 0;

    const startedAt = Date.now();
    try {
      await expect(service.startServer('grc-evidence')).rejects.toThrow(
        /exited before initialization/
      );
      expect(Date.now() - startedAt).toBeLessThan(2000);
    } finally {
      state.config.args = originalArgs;
      state.config.maxRetries = originalRetries;
      process.env.NODE_ENV = previousNodeEnv;
      await service.onModuleDestroy();
    }
  });

  it('turns MCP isError tool responses into thrown failures', () => {
    const service = new MCPClientService(new ConfigService());

    expect(() =>
      (service as any).normalizeToolResult('server', 'tool', {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'upstream denied the request' }),
          },
        ],
      })
    ).toThrow(/upstream denied the request/);
  });
});
