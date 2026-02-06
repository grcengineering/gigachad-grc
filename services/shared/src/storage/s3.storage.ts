import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, UploadOptions, FileMetadata, StorageConfig } from './storage.interface';

/**
 * S3-Compatible Storage Provider
 *
 * Supports:
 * - Amazon S3
 * - RustFS (https://github.com/rustfs/rustfs) - High-performance, Apache 2.0 licensed
 * - MinIO (legacy)
 * - Any S3-compatible object storage
 *
 * RustFS is the recommended self-hosted option due to:
 * - 2.3x faster performance for small object payloads
 * - Apache 2.0 license (no AGPL restrictions)
 * - 100% S3 API compatibility
 * - Memory safety via Rust
 */
export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket || 'grc-storage';

    const clientConfig: {
      region: string;
      endpoint?: string;
      forcePathStyle?: boolean;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = {
      region: config.region || 'us-east-1',
    };

    // RustFS, MinIO, or custom S3-compatible endpoint
    if (config.endpoint) {
      clientConfig.endpoint = config.useSSL
        ? `https://${config.endpoint}:${config.port || 443}`
        : `http://${config.endpoint}:${config.port || 9000}`;
      clientConfig.forcePathStyle = true; // Required for RustFS/MinIO and S3-compatible storage
    }

    // Credentials
    if (config.accessKey && config.secretKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      };
    }

    this.client = new S3Client(clientConfig);
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

  /**
   * SECURITY: Validate ACL to only allow known safe values
   */
  private validateAcl(acl?: 'private' | 'public-read'): 'private' | 'public-read' {
    // SECURITY: Default to private, only allow explicit 'private' or 'public-read'
    if (acl === 'public-read') {
      return 'public-read';
    }
    return 'private';
  }

  async upload(file: Buffer | Readable, path: string, options?: UploadOptions): Promise<string> {
    // SECURITY: Validate path to prevent path traversal
    const safePath = this.validatePath(path);
    let body: Buffer;

    if (Buffer.isBuffer(file)) {
      body = file;
    } else {
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: safePath,
      Body: body,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
      // SECURITY: Always validate and default ACL to private
      ACL: this.validateAcl(options?.acl),
    });

    await this.client.send(command);
    return path;
  }

  async download(path: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`File not found: ${path}`);
    }

    return response.Body as Readable;
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    await this.client.send(command);
  }

  async exists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });
      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (s3Error.name === 'NotFound' || s3Error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const response = await this.client.send(command);

      return {
        path,
        size: response.ContentLength || 0,
        contentType: response.ContentType,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error: unknown) {
      const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (s3Error.name === 'NotFound' || s3Error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await this.client.send(command);

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key) {
            results.push({
              path: item.Key,
              size: item.Size || 0,
              lastModified: item.LastModified || new Date(),
              etag: item.ETag,
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return results;
  }

  async copy(sourcePath: string, destPath: string): Promise<string> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourcePath}`,
      Key: destPath,
    });

    await this.client.send(command);
    return destPath;
  }

  /**
   * Get a pre-signed URL for uploading
   */
  async getUploadUrl(path: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }
}
