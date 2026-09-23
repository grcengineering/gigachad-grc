export function isDevelopmentAuthEnvironment(
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return nodeEnv === 'development' || nodeEnv === 'test';
}
