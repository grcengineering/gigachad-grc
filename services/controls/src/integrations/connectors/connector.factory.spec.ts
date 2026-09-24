import { ConnectorFactory } from './connector.factory';

describe('ConnectorFactory contracts', () => {
  let factory: ConnectorFactory;

  beforeEach(() => {
    factory = new ConnectorFactory();
  });

  it('uses the canonical Notion type from the enum and catalog', () => {
    expect(factory.hasConnector('notion_km')).toBe(true);
    expect(factory.hasConnector('notion')).toBe(false);
  });

  it('reports unsupported connection types as failures', async () => {
    await expect(factory.testConnection('unsupported_type', {})).resolves.toEqual(
      expect.objectContaining({
        success: false,
        details: { supported: false },
      })
    );
  });

  it('throws instead of fabricating an unsupported sync result', async () => {
    await expect(factory.sync('unsupported_type', {})).rejects.toThrow(/not supported/);
  });
});
