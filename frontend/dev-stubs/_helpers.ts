/**
 * Shared types + middleware factory for dev-only API stubs. Each stub
 * module exports a `StubHandler[]` and mounts via `createStubMiddleware`
 * (see vite.config.ts).
 */

import type { Connect } from 'vite';

export interface StubHandler {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Pattern relative to the prefix, e.g. `/dashboard` or `/plans/:id`. */
  path: string;
  body: (
    params: Record<string, string>,
    payload: unknown,
    url: URL,
  ) => unknown | { __status: number; body: unknown };
}

export const EMPTY_PAGED = { data: [], total: 0, totalPages: 0, page: 1, limit: 25 };

export function stubId(): string {
  return `stub-${Math.random().toString(36).slice(2, 10)}`;
}

export function now(): string {
  return new Date().toISOString();
}

function matchPattern(pattern: string, actual: string): Record<string, string> | null {
  const pParts = pattern.split('/').filter(Boolean);
  const aParts = actual.split('/').filter(Boolean);
  if (pParts.length !== aParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = decodeURIComponent(aParts[i]);
    } else if (pParts[i] !== aParts[i]) {
      return null;
    }
  }
  return params;
}

async function readBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
  });
}

/**
 * Create a Vite middleware that intercepts requests under `prefix` and
 * routes them through the handler registry. Returns 404 with a helpful
 * message if no handler matches the method+path inside the prefix; calls
 * `next()` if the request URL isn't under the prefix at all.
 */
export function createStubMiddleware(
  prefix: string,
  handlers: StubHandler[],
): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = new URL(req.url || '', 'http://localhost');
    if (!url.pathname.startsWith(prefix)) return next();

    const relative = url.pathname.slice(prefix.length) || '/';
    const method = (req.method || 'GET').toUpperCase();

    for (const h of handlers) {
      if (h.method !== method) continue;
      const params = matchPattern(h.path, relative);
      if (!params) continue;
      const payload =
        method === 'POST' || method === 'PUT' || method === 'PATCH'
          ? await readBody(req)
          : undefined;
      const result = h.body(params, payload, url);
      const wrapped =
        typeof result === 'object' && result !== null && '__status' in (result as object)
          ? (result as { __status: number; body: unknown })
          : { __status: 200, body: result };
      res.statusCode = wrapped.__status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(wrapped.body));
      return;
    }

    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ message: `stub: no handler for ${method} ${prefix}${relative}` }));
  };
}
