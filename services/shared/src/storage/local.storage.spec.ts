import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { LocalStorageProvider } from './local.storage';

describe('LocalStorageProvider', () => {
  let storage: LocalStorageProvider;
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'));
    storage = new LocalStorageProvider({
      localPath: tempDir,
      localBaseUrl: '/files',
    });
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('path traversal protection', () => {
    it('should reject path with ../ trying to escape storage directory', () => {
      expect(() => {
        // Access private method through any cast for testing
        (storage as any).getFullPath('../../../etc/passwd');
      }).toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should reject path with encoded ../ sequences', () => {
      expect(() => {
        (storage as any).getFullPath('..%2F..%2F..%2Fetc/passwd');
      }).toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should reject path starting with /', () => {
      expect(() => {
        (storage as any).getFullPath('/etc/passwd');
      }).toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should reject deeply nested traversal attempts', () => {
      expect(() => {
        (storage as any).getFullPath('valid/path/../../../../../../../etc/passwd');
      }).toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should allow valid relative paths within storage', () => {
      const fullPath = (storage as any).getFullPath('uploads/user-123/file.pdf');
      expect(fullPath).toBe(path.join(tempDir, 'uploads/user-123/file.pdf'));
    });

    it('should allow paths at the root of storage', () => {
      const fullPath = (storage as any).getFullPath('file.txt');
      expect(fullPath).toBe(path.join(tempDir, 'file.txt'));
    });

    it('should reject paths that resolve outside even with valid prefix', () => {
      expect(() => {
        (storage as any).getFullPath('contracts/../../../etc/passwd');
      }).toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should reject null byte injection attempts', () => {
      // On most systems, null bytes in paths cause issues
      // The path.resolve should handle this, but let's verify behavior
      const pathWithNull = 'file.txt\x00.exe';
      // Should either throw or resolve within base path
      try {
        const fullPath = (storage as any).getFullPath(pathWithNull);
        // If it doesn't throw, it must be within base path
        expect(fullPath.startsWith(tempDir)).toBe(true);
      } catch (error) {
        // Throwing is acceptable for malformed paths
        expect(error).toBeDefined();
      }
    });
  });

  describe('upload with path validation', () => {
    it('should reject upload to path traversal location', async () => {
      const file = Buffer.from('test content');
      
      await expect(
        storage.upload(file, '../../../etc/malicious')
      ).rejects.toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should allow upload to valid path', async () => {
      const file = Buffer.from('test content');
      const storagePath = 'contracts/vendor-123/contract.pdf';
      
      const result = await storage.upload(file, storagePath);
      
      expect(result).toBe(storagePath);
      expect(fs.existsSync(path.join(tempDir, storagePath))).toBe(true);
    });
  });

  describe('download with path validation', () => {
    it('should reject download from path traversal location', async () => {
      await expect(
        storage.download('../../../etc/passwd')
      ).rejects.toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should download valid file', async () => {
      // First create a file
      const testPath = 'test/file.txt';
      const content = 'test content';
      await storage.upload(Buffer.from(content), testPath);
      
      // Then download it
      const stream = await storage.download(testPath);
      
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      expect(Buffer.concat(chunks).toString()).toBe(content);
    });
  });

  describe('delete with path validation', () => {
    it('should reject delete of path traversal location', async () => {
      await expect(
        storage.delete('../../../etc/passwd')
      ).rejects.toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should delete valid file', async () => {
      // First create a file
      const testPath = 'test/to-delete.txt';
      await storage.upload(Buffer.from('content'), testPath);
      expect(fs.existsSync(path.join(tempDir, testPath))).toBe(true);
      
      // Then delete it
      await storage.delete(testPath);
      
      expect(fs.existsSync(path.join(tempDir, testPath))).toBe(false);
    });
  });

  describe('exists with path validation', () => {
    it('should reject exists check for path traversal location', async () => {
      await expect(
        storage.exists('../../../etc/passwd')
      ).rejects.toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should return true for existing file', async () => {
      const testPath = 'test/exists.txt';
      await storage.upload(Buffer.from('content'), testPath);
      
      const exists = await storage.exists(testPath);
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await storage.exists('non-existent.txt');
      
      expect(exists).toBe(false);
    });
  });

  describe('getMetadata with path validation', () => {
    it('should reject metadata for path traversal location', async () => {
      await expect(
        storage.getMetadata('../../../etc/passwd')
      ).rejects.toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should return metadata for valid file', async () => {
      const testPath = 'test/metadata.txt';
      const content = 'test content for metadata';
      await storage.upload(Buffer.from(content), testPath);
      
      const metadata = await storage.getMetadata(testPath);
      
      expect(metadata).not.toBeNull();
      expect(metadata?.path).toBe(testPath);
      expect(metadata?.size).toBe(content.length);
    });
  });

  describe('list with path validation', () => {
    it('should reject list for path traversal location', async () => {
      await expect(
        storage.list('../../../etc')
      ).rejects.toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should list files in valid directory', async () => {
      // Create some files
      await storage.upload(Buffer.from('file1'), 'testdir/file1.txt');
      await storage.upload(Buffer.from('file2'), 'testdir/file2.txt');
      
      const files = await storage.list('testdir');
      
      expect(files.length).toBe(2);
      expect(files.map(f => f.path)).toContain('testdir/file1.txt');
      expect(files.map(f => f.path)).toContain('testdir/file2.txt');
    });
  });

  describe('copy with path validation', () => {
    it('should reject copy from path traversal source', async () => {
      await expect(
        storage.copy('../../../etc/passwd', 'valid/dest.txt')
      ).rejects.toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should reject copy to path traversal destination', async () => {
      // First create a source file
      await storage.upload(Buffer.from('content'), 'source.txt');
      
      await expect(
        storage.copy('source.txt', '../../../etc/malicious')
      ).rejects.toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should copy file between valid paths', async () => {
      const content = 'copy test content';
      await storage.upload(Buffer.from(content), 'source/file.txt');
      
      await storage.copy('source/file.txt', 'dest/file.txt');
      
      expect(fs.existsSync(path.join(tempDir, 'dest/file.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(tempDir, 'dest/file.txt'), 'utf8')).toBe(content);
    });
  });

  describe('edge cases', () => {
    it('should handle empty path', () => {
      // Empty path should resolve to base path
      const fullPath = (storage as any).getFullPath('');
      expect(fullPath).toBe(tempDir);
    });

    it('should handle path with only dots', () => {
      expect(() => {
        (storage as any).getFullPath('..');
      }).toThrow('SECURITY: Path traversal detected - access denied');
    });

    it('should handle path with multiple slashes', () => {
      const fullPath = (storage as any).getFullPath('a//b///c');
      expect(fullPath.startsWith(tempDir)).toBe(true);
    });

    it('should handle Windows-style path separators on non-Windows', () => {
      // path.resolve normalizes these, so they should work or fail gracefully
      const fullPath = (storage as any).getFullPath('a\\b\\c');
      expect(fullPath.startsWith(tempDir)).toBe(true);
    });
  });
});
