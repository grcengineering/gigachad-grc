import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import { resolve, join, basename } from 'path';
import {
  MCPServerConfig,
  MCP_SERVERS,
  MCP_TOOLS,
  MCPToolDefinition,
  getAutoStartServers,
} from './mcp-servers.config';

/**
 * Allowed commands for MCP servers to prevent command injection.
 * Only commands in this whitelist can be spawned.
 */
const ALLOWED_MCP_COMMANDS = ['node', 'npx', 'npm', 'python', 'python3'] as const;

/**
 * MCP Server State
 */
interface MCPServerState {
  config: MCPServerConfig;
  process: ChildProcess | null;
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  lastError?: string;
  startedAt?: Date;
  restartCount: number;
  tools?: MCPToolDefinition[];
}

/**
 * MCP Message Format (JSON-RPC 2.0)
 */
interface MCPMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP Client Service
 *
 * Manages MCP server lifecycle and communication.
 * Spawns MCP servers as child processes and communicates via stdio using JSON-RPC 2.0.
 */
@Injectable()
export class MCPClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MCPClientService.name);
  private servers: Map<string, MCPServerState> = new Map();
  private messageId = 0;
  private pendingRequests: Map<
    number,
    {
      serverId: string;
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private eventEmitter = new EventEmitter();
  private projectRoot: string;
  private mcpServersRoot: string;

  constructor(private readonly configService: ConfigService) {
    // Works from both services/controls/src and services/controls/dist.
    this.projectRoot = resolve(__dirname, '../../../..');
    this.mcpServersRoot = resolve(
      this.configService.get<string>('MCP_SERVERS_ROOT') || join(this.projectRoot, 'mcp-servers')
    );
  }

  async onModuleInit() {
    // Initialize server states
    for (const config of MCP_SERVERS) {
      this.servers.set(config.id, {
        config,
        process: null,
        status: 'stopped',
        restartCount: 0,
      });
    }

    // Auto-start configured servers in background (only in non-test environment)
    // Don't block the main app startup - run this asynchronously
    if (process.env.NODE_ENV !== 'test') {
      // Use setImmediate to not block module initialization
      setImmediate(async () => {
        const autoStartServers = getAutoStartServers();
        for (const serverConfig of autoStartServers) {
          try {
            await this.startServer(serverConfig.id);
          } catch (error) {
            this.logger.warn(
              `Failed to auto-start MCP server ${serverConfig.id}: ${error.message}`
            );
          }
        }
      });
    }
  }

  async onModuleDestroy() {
    // Stop all servers gracefully
    const stopPromises = Array.from(this.servers.keys()).map((id) =>
      this.stopServer(id).catch((err) =>
        this.logger.error(`Error stopping server ${id}: ${err.message}`)
      )
    );
    await Promise.all(stopPromises);
  }

  /**
   * Get all available servers and their status
   */
  getServers(): Array<{ id: string; name: string; status: string; description: string }> {
    return Array.from(this.servers.values()).map((state) => ({
      id: state.config.id,
      name: state.config.name,
      status: state.status,
      description: state.config.description,
    }));
  }

  /**
   * Get server status
   */
  getServerStatus(serverId: string): MCPServerState | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Start an MCP server
   */
  async startServer(serverId: string): Promise<void> {
    const state = this.servers.get(serverId);
    if (!state) {
      throw new Error(`Unknown MCP server: ${serverId}`);
    }

    if (state.status === 'running') {
      this.logger.log(`MCP server ${serverId} is already running`);
      return;
    }

    state.status = 'starting';
    state.lastError = undefined;
    const config = state.config;

    try {
      // Security: Validate command against whitelist to prevent command injection
      this.validateCommand(config.command);

      // Security: Validate args don't contain shell metacharacters
      const args = config.args || [];
      this.validateArgs(args);

      const cwd = this.resolveServerCwd(config);
      if (!existsSync(cwd)) {
        throw new Error(`MCP server directory does not exist: ${cwd}`);
      }

      const env = {
        ...process.env,
        ...config.env,
      };

      this.logger.log(`Starting MCP server ${serverId} in ${cwd}`);

      const child = spawn(config.command, args, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      state.process = child;

      const startupFailure = new Promise<never>((_, reject) => {
        child.once('error', (error) => {
          reject(new Error(`MCP server ${serverId} failed to start: ${error.message}`));
        });
        child.once('exit', (code, signal) => {
          reject(
            new Error(
              `MCP server ${serverId} exited before initialization ` +
                `(code=${code ?? 'null'}, signal=${signal ?? 'null'})`
            )
          );
        });
      });

      // Handle stdout (JSON-RPC messages)
      let buffer = '';
      child.stdout?.on('data', (data: Buffer) => {
        buffer += data.toString();
        this.processBuffer(serverId, buffer, (remaining) => {
          buffer = remaining;
        });
      });

      // Handle stderr (logs)
      child.stderr?.on('data', (data: Buffer) => {
        const message = data.toString().trim();
        if (message) {
          this.logger.debug(`[${serverId}] ${message}`);
        }
      });

      // Handle process exit
      child.on('exit', (code, signal) => {
        this.logger.log(`MCP server ${serverId} exited with code ${code}, signal ${signal}`);
        const wasStopping = state.status === 'stopping';
        state.process = null;
        state.status = wasStopping || code === 0 ? 'stopped' : 'error';
        if (!wasStopping && code !== 0) {
          state.lastError = `Process exited with code ${code}`;
        }
        this.rejectServerRequests(
          serverId,
          new Error(state.lastError || `MCP server ${serverId} stopped`)
        );

        // Attempt restart if configured
        if (
          !wasStopping &&
          state.restartCount < (config.maxRetries || 0) &&
          state.status === 'error'
        ) {
          state.restartCount++;
          this.logger.log(
            `Attempting restart ${state.restartCount}/${config.maxRetries} for ${serverId}`
          );
          setTimeout(() => this.startServer(serverId), 5000);
        }
      });

      child.on('error', (error) => {
        this.logger.error(`MCP server ${serverId} error: ${error.message}`);
        state.process = null;
        state.status = 'error';
        state.lastError = error.message;
        this.rejectServerRequests(serverId, error);
      });

      // Wait for server to be ready (send initialize request)
      await Promise.race([this.waitForReady(serverId, config.timeout || 10000), startupFailure]);

      state.status = 'running';
      state.startedAt = new Date();
      state.restartCount = 0;
      this.logger.log(`MCP server ${serverId} started successfully`);
    } catch (error) {
      if (state.process && !state.process.killed) {
        state.process.kill('SIGTERM');
      }
      state.status = 'error';
      state.lastError = error instanceof Error ? error.message : String(error);
      this.rejectServerRequests(serverId, new Error(state.lastError));
      throw error;
    }
  }

  /**
   * Stop an MCP server
   */
  async stopServer(serverId: string): Promise<void> {
    const state = this.servers.get(serverId);
    if (!state || !state.process) {
      return;
    }

    this.logger.log(`Stopping MCP server ${serverId}`);
    state.status = 'stopping';

    return new Promise((resolve) => {
      const child = state.process!;

      // Set timeout for forceful kill
      const killTimeout = setTimeout(() => {
        if (state.process) {
          state.process.kill('SIGKILL');
        }
      }, 5000);

      child.once('exit', () => {
        clearTimeout(killTimeout);
        state.process = null;
        state.status = 'stopped';
        resolve();
      });

      // Send graceful shutdown
      child.kill('SIGTERM');
    });
  }

  /**
   * Restart an MCP server
   */
  async restartServer(serverId: string): Promise<void> {
    await this.stopServer(serverId);
    await this.startServer(serverId);
  }

  /**
   * Get available tools for a server
   */
  getTools(serverId: string): unknown[] {
    return this.servers.get(serverId)?.tools || MCP_TOOLS[serverId] || [];
  }

  /**
   * Get all available tools across all servers
   */
  getAllTools(): Array<{ serverId: string; tools: unknown[] }> {
    return Array.from(this.servers.keys()).map((serverId) => ({
      serverId,
      tools: this.getTools(serverId),
    }));
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverId: string, toolName: string, params: unknown): Promise<unknown> {
    const state = this.servers.get(serverId);
    if (!state || state.status !== 'running') {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    const result = await this.sendRequest(serverId, 'tools/call', {
      name: toolName,
      arguments: params,
    });
    return this.normalizeToolResult(serverId, toolName, result);
  }

  /**
   * List resources from an MCP server
   */
  async listResources(serverId: string): Promise<unknown[]> {
    const state = this.servers.get(serverId);
    if (!state || state.status !== 'running') {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    const result = await this.sendRequest(serverId, 'resources/list', {});
    return ((result as Record<string, unknown>)?.resources as unknown[]) || [];
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverId: string, uri: string): Promise<unknown> {
    const state = this.servers.get(serverId);
    if (!state || state.status !== 'running') {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    return this.sendRequest(serverId, 'resources/read', { uri });
  }

  /**
   * Get prompts from an MCP server
   */
  async listPrompts(serverId: string): Promise<unknown[]> {
    const state = this.servers.get(serverId);
    if (!state || state.status !== 'running') {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    const result = await this.sendRequest(serverId, 'prompts/list', {});
    return ((result as Record<string, unknown>)?.prompts as unknown[]) || [];
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(
    serverId: string,
    name: string,
    args?: Record<string, unknown>
  ): Promise<unknown> {
    const state = this.servers.get(serverId);
    if (!state || state.status !== 'running') {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    return this.sendRequest(serverId, 'prompts/get', { name, arguments: args });
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Validates that a command is in the allowed whitelist.
   * Prevents command injection by only allowing known safe executables.
   */
  private validateCommand(command: string): void {
    const commandBasename = basename(command);
    if (!ALLOWED_MCP_COMMANDS.includes(commandBasename as (typeof ALLOWED_MCP_COMMANDS)[number])) {
      throw new Error(
        `Command not allowed: ${command}. Allowed commands: ${ALLOWED_MCP_COMMANDS.join(', ')}`
      );
    }
  }

  /**
   * Validates that arguments don't contain dangerous shell metacharacters.
   * Prevents shell injection attacks through command arguments.
   */
  private validateArgs(args: string[]): void {
    const dangerousChars = /[;&|`$(){}[\]<>]/;
    for (const arg of args) {
      if (dangerousChars.test(arg)) {
        throw new Error(
          `Invalid characters in argument: ${arg}. Shell metacharacters are not allowed.`
        );
      }
    }
  }

  private resolveServerCwd(config: MCPServerConfig): string {
    if (!config.cwd) {
      return this.projectRoot;
    }

    const prefix = `mcp-servers/`;
    if (config.cwd.startsWith(prefix)) {
      return join(this.mcpServersRoot, config.cwd.slice(prefix.length));
    }

    return resolve(this.projectRoot, config.cwd);
  }

  private async waitForReady(serverId: string, _timeout: number): Promise<void> {
    const state = this.servers.get(serverId);
    if (!state || !state.process) {
      throw new Error('Server not started');
    }

    // Send initialize request
    const _initResult = await this.sendRequest(serverId, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
      clientInfo: {
        name: 'gigachad-grc',
        version: '1.0.0',
      },
    });

    // Send initialized notification
    this.sendNotification(serverId, 'initialized', {});

    const toolsResult = await this.sendRequest(serverId, 'tools/list', {});
    const tools = (toolsResult as { tools?: MCPToolDefinition[] })?.tools;
    if (!Array.isArray(tools)) {
      throw new Error(`MCP server ${serverId} returned an invalid tools/list response`);
    }
    state.tools = tools;
  }

  private sendRequest(serverId: string, method: string, params: unknown): Promise<unknown> {
    const state = this.servers.get(serverId);
    if (!state || !state.process?.stdin) {
      throw new Error(`Cannot send to server ${serverId}`);
    }

    const id = ++this.messageId;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${method}`));
      }, state.config.timeout || 30000);

      this.pendingRequests.set(id, { serverId, resolve, reject, timeout });

      const messageStr = JSON.stringify(message) + '\n';
      state.process!.stdin!.write(messageStr, (error) => {
        if (!error) return;
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private sendNotification(serverId: string, method: string, params: unknown): void {
    const state = this.servers.get(serverId);
    if (!state || !state.process?.stdin) {
      return;
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const messageStr = JSON.stringify(message) + '\n';
    state.process.stdin.write(messageStr);
  }

  private processBuffer(
    serverId: string,
    buffer: string,
    setRemaining: (remaining: string) => void
  ): void {
    const lines = buffer.split('\n');

    // Keep the last incomplete line in the buffer
    setRemaining(lines.pop() || '');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line) as MCPMessage;
        this.handleMessage(serverId, message);
      } catch {
        this.logger.debug(`[${serverId}] Non-JSON output: ${line}`);
      }
    }
  }

  private handleMessage(serverId: string, message: MCPMessage): void {
    // Handle response to a request
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id as number);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id as number);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
      return;
    }

    // Handle notification
    if (message.method) {
      this.eventEmitter.emit('notification', {
        serverId,
        method: message.method,
        params: message.params,
      });
    }
  }

  private rejectServerRequests(serverId: string, error: Error): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.serverId !== serverId) continue;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(id);
      pending.reject(error);
    }
  }

  private normalizeToolResult(serverId: string, toolName: string, result: unknown): unknown {
    const response = result as {
      isError?: boolean;
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = response?.content?.find((item) => item.type === 'text')?.text;

    if (response?.isError) {
      let detail = text || 'Unknown MCP tool error';
      if (text) {
        try {
          const parsed = JSON.parse(text) as { error?: string };
          detail = parsed.error || text;
        } catch {
          // Keep the raw text for non-JSON MCP error payloads.
        }
      }
      throw new Error(`${serverId}.${toolName} failed: ${detail}`);
    }

    if (!text) {
      return result;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Subscribe to server notifications
   */
  onNotification(
    callback: (event: { serverId: string; method: string; params: unknown }) => void
  ): void {
    this.eventEmitter.on('notification', callback);
  }
}
