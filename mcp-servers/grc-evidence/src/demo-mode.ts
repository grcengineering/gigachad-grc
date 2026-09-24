export function useExplicitDemoFallback<T>(reason: string, factory: () => T): T {
  const enabled = process.env.NODE_ENV !== 'production' && process.env.MCP_DEMO_MODE === 'true';
  if (!enabled) {
    throw new Error(reason);
  }
  console.warn(`MCP evidence demo mode enabled: ${reason}`);
  return factory();
}
