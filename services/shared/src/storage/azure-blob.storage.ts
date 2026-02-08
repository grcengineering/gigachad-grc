import { Readable } from 'stream';
import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';
import { StorageProvider, UploadOptions, FileMetadata, StorageConfig } from './storage.interface';

/**
 * Azure Blob Storage Provider
 *
 * Supports multiple authentication methods:
 * 1. Connection string (recommended for development)
 * 2. Account name + account key
 * 3. Account name + SAS token
 */
export class AzureBlobStorage implements StorageProvider {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;
  private accountName?: string;
  private accountKey?: string;

  constructor(config: StorageConfig) {
    this.containerName = config.azureContainerName || 'gigachad-grc';

    // Initialize based on available credentials
    if (config.azureConnectionString) {
      // Connection string authentication
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.azureConnectionString);
    } else if (config.azureAccountName && config.azureAccountKey) {
      // Account key authentication
      const credential = new StorageSharedKeyCredential(
        config.azureAccountName,
        config.azureAccountKey
      );
      const url = `https://${config.azureAccountName}.blob.core.windows.net`;
      this.blobServiceClient = new BlobServiceClient(url, credential);
      this.accountName = config.azureAccountName;
      this.accountKey = config.azureAccountKey;
    } else if (config.azureAccountName && config.azureSasToken) {
      // SAS token authentication
      const url = `https://${config.azureAccountName}.blob.core.windows.net?${config.azureSasToken}`;
      this.blobServiceClient = new BlobServiceClient(url);
      this.accountName = config.azureAccountName;
    } else {
      throw new Error(
        'Azure Blob Storage requires either azureConnectionString, ' +
          'or azureAccountName with azureAccountKey, ' +
          'or azureAccountName with azureSasToken'
      );
    }

    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  /**
   * Ensure the container exists, creating it if necessary
   * SECURITY: Container is created as private by default
   */
  async ensureContainer(): Promise<void> {
    const exists = await this.containerClient.exists();
    if (!exists) {
      // SECURITY: Do NOT set public access - containers should be private
      // Use signed URLs for temporary access when needed
      await this.containerClient.create();
    }
  }

  /**
   * SECURITY: Validate and sanitize storage path to prevent path traversal
   */
  private validatePath(path: string): string {
    // Remove null bytes
    let sanitized = path.replace(/\0/g, '');
    // Normalize path separators
    sanitized = sanitized.replace(/\\/g, '/');
    // Remove path traversal sequences - loop until no more matches
    // This prevents bypass via patterns like '....//'' which becomes '../' after one pass
    let previousLength: number;
    do {
      previousLength = sanitized.length;
      // codeql[js/incomplete-multi-character-sanitization] suppressed: Uses iterative sanitization loop that repeats until no matches remain
      sanitized = sanitized.replace(/\.\.\//g, '').replace(/^\.\.$/, '');
    } while (sanitized.length !== previousLength);
    // Remove leading slashes
    sanitized = sanitized.replace(/^\/+/, '');
    // Ensure path doesn't start with dangerous patterns
    if (sanitized.startsWith('../') || sanitized === '..') {
      throw new Error('Invalid storage path: path traversal detected');
    }
    return sanitized;
  }

  async upload(file: Buffer | Readable, path: string, options?: UploadOptions): Promise<string> {
    // SECURITY: Validate path to prevent path traversal
    const safePath = this.validatePath(path);
    await this.ensureContainer();

    const blockBlobClient = this.containerClient.getBlockBlobClient(safePath);

    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: options?.contentType || 'application/octet-stream',
      },
      metadata: options?.metadata,
    };

    if (Buffer.isBuffer(file)) {
      await blockBlobClient.uploadData(file, uploadOptions);
    } else {
      // Convert readable stream to buffer for upload
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      await blockBlobClient.uploadData(buffer, uploadOptions);
    }

    return path;
  }

  async download(path: string): Promise<Readable> {
    // SECURITY: Validate path to prevent path traversal
    const safePath = this.validatePath(path);
    const blobClient = this.containerClient.getBlobClient(safePath);

    const exists = await blobClient.exists();
    if (!exists) {
      throw new Error(`File not found: ${safePath}`);
    }

    const downloadResponse = await blobClient.download();

    if (!downloadResponse.readableStreamBody) {
      throw new Error(`Failed to download file: ${safePath}`);
    }

    // Convert Node.js web stream to Readable
    return Readable.from(downloadResponse.readableStreamBody as AsyncIterable<Buffer>);
  }

  async delete(path: string): Promise<void> {
    // SECURITY: Validate path to prevent path traversal
    const safePath = this.validatePath(path);
    const blobClient = this.containerClient.getBlobClient(safePath);
    await blobClient.deleteIfExists({
      deleteSnapshots: 'include',
    });
  }

  async exists(path: string): Promise<boolean> {
    // SECURITY: Validate path to prevent path traversal
    const safePath = this.validatePath(path);
    const blobClient = this.containerClient.getBlobClient(safePath);
    return blobClient.exists();
  }

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const blobClient = this.containerClient.getBlobClient(path);

    // If we have account credentials, generate a SAS URL
    if (this.accountName && this.accountKey) {
      const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
      const startsOn = new Date();
      const expiresOn = new Date(startsOn.getTime() + expiresIn * 1000);

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.containerName,
          blobName: path,
          permissions: BlobSASPermissions.parse('r'), // Read only
          startsOn,
          expiresOn,
          protocol: SASProtocol.Https,
        },
        credential
      ).toString();

      return `${blobClient.url}?${sasToken}`;
    }

    // If using connection string or SAS token, try to get URL directly
    // Note: This may fail if the SAS doesn't have appropriate permissions
    return blobClient.url;
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    const blobClient = this.containerClient.getBlobClient(path);

    try {
      const properties = await blobClient.getProperties();

      return {
        path,
        size: properties.contentLength || 0,
        contentType: properties.contentType,
        lastModified: properties.lastModified || new Date(),
        etag: properties.etag,
        metadata: properties.metadata as Record<string, string>,
      };
    } catch (error: unknown) {
      const blobError = error as { statusCode?: number };
      if (blobError.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    // List blobs with the given prefix
    const iter = this.containerClient.listBlobsFlat({
      prefix,
    });

    for await (const blob of iter) {
      files.push({
        path: blob.name,
        size: blob.properties.contentLength || 0,
        contentType: blob.properties.contentType,
        lastModified: blob.properties.lastModified || new Date(),
        etag: blob.properties.etag,
        metadata: blob.metadata as Record<string, string>,
      });
    }

    return files;
  }

  async copy(sourcePath: string, destPath: string): Promise<string> {
    const _sourceBlob = this.containerClient.getBlobClient(sourcePath);
    const destBlob = this.containerClient.getBlobClient(destPath);

    // Get a URL with SAS for the source (required for cross-container copies)
    const sourceUrl = await this.getSignedUrl(sourcePath, 3600);

    // Start the copy operation
    const copyPoller = await destBlob.beginCopyFromURL(sourceUrl);
    await copyPoller.pollUntilDone();

    return destPath;
  }

  /**
   * Get the public URL for a blob (if container allows public access)
   */
  getPublicUrl(path: string): string {
    const blobClient = this.containerClient.getBlobClient(path);
    return blobClient.url;
  }

  /**
   * Get container properties
   */
  async getContainerProperties(): Promise<{
    exists: boolean;
    lastModified?: Date;
    leaseState?: string;
    metadata?: Record<string, string>;
  }> {
    try {
      const exists = await this.containerClient.exists();
      if (!exists) {
        return { exists: false };
      }

      const properties = await this.containerClient.getProperties();
      return {
        exists: true,
        lastModified: properties.lastModified,
        leaseState: properties.leaseState,
        metadata: properties.metadata as Record<string, string>,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Delete all blobs with a given prefix
   */
  async deletePrefix(prefix: string): Promise<number> {
    let deleted = 0;

    const iter = this.containerClient.listBlobsFlat({ prefix });

    for await (const blob of iter) {
      await this.containerClient.deleteBlob(blob.name);
      deleted++;
    }

    return deleted;
  }
}
