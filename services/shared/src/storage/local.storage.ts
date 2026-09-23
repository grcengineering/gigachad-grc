import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { StorageProvider, UploadOptions, FileMetadata, StorageConfig } from './storage.interface';

const mkdir = promisify(fs.mkdir);
const lstat = promisify(fs.lstat);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const copyFile = promisify(fs.copyFile);
const access = promisify(fs.access);

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor(config: StorageConfig) {
    this.basePath = path.resolve(config.localPath || './storage');
    this.baseUrl = config.localBaseUrl || '/files';
  }

  /**
   * SECURITY: Get full path with path traversal protection
   * Ensures the resolved path is within the base storage directory
   */
  private getFullPath(relativePath: string): string {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    let decodedPath = normalizedPath;
    try {
      decodedPath = decodeURIComponent(normalizedPath);
    } catch {
      // Malformed percent sequences are literal filesystem characters. They
      // are safe unless the original path itself contains traversal segments.
    }

    if (decodedPath.includes('\0') || decodedPath.split('/').includes('..')) {
      throw new Error('SECURITY: Path traversal detected - access denied');
    }

    // Resolve the full path
    const fullPath = path.resolve(this.basePath, relativePath);

    // SECURITY: Ensure the resolved path is within the base path
    // This prevents path traversal attacks like "../../../etc/passwd"
    if (!fullPath.startsWith(this.basePath + path.sep) && fullPath !== this.basePath) {
      throw new Error('SECURITY: Path traversal detected - access denied');
    }

    return fullPath;
  }

  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });
  }

  async upload(
    file: Buffer | Readable,
    storagePath: string,
    _options?: UploadOptions
  ): Promise<string> {
    const fullPath = this.getFullPath(storagePath);
    await this.ensureDir(fullPath);

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(fullPath);

      writeStream.on('finish', () => resolve(storagePath));
      writeStream.on('error', reject);

      if (Buffer.isBuffer(file)) {
        writeStream.write(file);
        writeStream.end();
      } else {
        file.pipe(writeStream);
      }
    });
  }

  async download(storagePath: string): Promise<Readable> {
    const fullPath = this.getFullPath(storagePath);

    if (!(await this.exists(storagePath))) {
      throw new Error(`File not found: ${storagePath}`);
    }

    // SECURITY: Prevent symlink attacks - deny access to symbolic links
    const stats = await lstat(fullPath);
    if (stats.isSymbolicLink()) {
      throw new Error('SECURITY: Symlink access denied');
    }

    return fs.createReadStream(fullPath);
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = this.getFullPath(storagePath);

    try {
      // SECURITY: Prevent symlink attacks - deny deletion of symbolic links
      const stats = await lstat(fullPath);
      if (stats.isSymbolicLink()) {
        throw new Error('SECURITY: Symlink access denied');
      }

      await unlink(fullPath);
    } catch (error: unknown) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(storagePath);

    try {
      await access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(storagePath: string, _expiresIn?: number): Promise<string> {
    // Local storage doesn't support signed URLs
    // Return a simple URL path instead
    return `${this.baseUrl}/${storagePath}`;
  }

  async getMetadata(storagePath: string): Promise<FileMetadata | null> {
    const fullPath = this.getFullPath(storagePath);

    try {
      // SECURITY: Use lstat to detect symlinks without following them
      const stats = await lstat(fullPath);

      // SECURITY: Prevent symlink attacks - deny access to symbolic links
      if (stats.isSymbolicLink()) {
        throw new Error('SECURITY: Symlink access denied');
      }

      return {
        path: storagePath,
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error: unknown) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<FileMetadata[]> {
    const fullPath = this.getFullPath(prefix);
    const results: FileMetadata[] = [];

    try {
      const entries = await readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(prefix, entry.name);

        if (entry.isFile()) {
          const metadata = await this.getMetadata(entryPath);
          if (metadata) {
            results.push(metadata);
          }
        } else if (entry.isDirectory()) {
          // Recursively list subdirectories
          const subResults = await this.list(entryPath);
          results.push(...subResults);
        }
      }
    } catch (error: unknown) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code !== 'ENOENT') {
        throw error;
      }
    }

    return results;
  }

  async copy(sourcePath: string, destPath: string): Promise<string> {
    const sourceFullPath = this.getFullPath(sourcePath);
    const destFullPath = this.getFullPath(destPath);

    // SECURITY: Prevent symlink attacks - deny copy of symbolic links
    const stats = await lstat(sourceFullPath);
    if (stats.isSymbolicLink()) {
      throw new Error('SECURITY: Symlink access denied');
    }

    await this.ensureDir(destFullPath);
    await copyFile(sourceFullPath, destFullPath);

    return destPath;
  }
}
