export function requireExplicitDemoMode(capability: string): void {
  const enabled =
    process.env.NODE_ENV !== 'production' &&
    (process.env.MCP_DEMO_MODE === 'true' || process.env.COMPLIANCE_MOCK_MODE === 'true');

  if (!enabled) {
    throw new Error(
      `${capability} requires real organization evidence and is unavailable in the standalone Compliance MCP server. ` +
        'Use the persisted Controls API workflow, or explicitly enable MCP_DEMO_MODE=true outside production for labeled sample output.'
    );
  }
}
