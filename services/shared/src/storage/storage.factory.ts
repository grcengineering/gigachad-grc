import { StorageProvider, StorageConfig, StorageType } from './storage.interface';
import { LocalStorageProvider } from './local.storage';
import { S3StorageProvider } from './s3.storage';
import { AzureBlobStorage } from './azure-blob.storage';

/**
 * Factory function to create the appropriate storage provider
 * 
 * Supported types:
 * - 'local': Local filesystem storage
 * - 's3': Amazon S3 or S3-compatible storage (RustFS, MinIO)
 * - 'minio': Legacy alias for S3-compatible storage (uses S3StorageProvider)
 * - 'azure': Azure Blob Storage
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.type) {
    case 'local':
      return new LocalStorageProvider(config);
    
    case 'minio':
    case 's3':
      // Both 'minio' and 's3' use the S3StorageProvider
      // RustFS is the recommended S3-compatible storage (Apache 2.0 licensed)
      return new S3StorageProvider(config);
    
    case 'azure':
      return new AzureBlobStorage(config);
    
    default:
      throw new Error(`Unsupported storage type: ${config.type}`);
  }
}

export function getStorageConfigFromEnv(): StorageConfig {
  const type = (process.env.STORAGE_TYPE || 'local') as StorageType;

  if (type === 'local') {
    return {
      type: 'local',
      localPath: process.env.LOCAL_STORAGE_PATH || './storage',
      localBaseUrl: process.env.LOCAL_STORAGE_BASE_URL || '/files',
    };
  }

  if (type === 'azure') {
    return {
      type: 'azure',
      azureConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      azureAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      azureAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
      azureSasToken: process.env.AZURE_STORAGE_SAS_TOKEN,
      azureContainerName: process.env.AZURE_STORAGE_CONTAINER || 'gigachad-grc',
    };
  }

  // S3-compatible storage (RustFS, MinIO, or AWS S3)
  // Prefers S3_* env vars, falls back to MINIO_* for backwards compatibility
  const useSSL =
    process.env.S3_USE_SSL !== undefined
      ? process.env.S3_USE_SSL === 'true'
      : process.env.MINIO_USE_SSL === 'true';

  return {
    type,
    endpoint: process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.S3_PORT || process.env.MINIO_PORT || '9000', 10),
    useSSL,
    accessKey: process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'grc-storage',
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
  };
}

// NestJS module for dependency injection
import { Module, DynamicModule, Global } from '@nestjs/common';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

@Global()
@Module({})
export class StorageModule {
  static forRoot(config?: StorageConfig): DynamicModule {
    const storageConfig = config || getStorageConfigFromEnv();

    return {
      module: StorageModule,
      providers: [
        {
          provide: STORAGE_PROVIDER,
          useFactory: () => createStorageProvider(storageConfig),
        },
      ],
      exports: [STORAGE_PROVIDER],
    };
  }
}



