import { getStorageConfigFromEnv } from '@gigachad-grc/shared';

describe('storage environment configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('lets explicit S3 settings override legacy MinIO values', () => {
    process.env.STORAGE_TYPE = 's3';
    process.env.S3_ENDPOINT = 'rustfs';
    process.env.S3_USE_SSL = 'false';
    process.env.S3_REGION = 'eu-west-1';
    process.env.MINIO_USE_SSL = 'true';

    expect(getStorageConfigFromEnv()).toMatchObject({
      type: 's3',
      endpoint: 'rustfs',
      useSSL: false,
      region: 'eu-west-1',
    });
  });
});
