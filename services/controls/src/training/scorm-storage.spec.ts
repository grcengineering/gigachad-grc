import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type JSZip from 'jszip';
import { persistScormPackage, removeScormPackage } from './scorm-storage';

function entry(name: string, contents = 'content'): JSZip.JSZipObject {
  return {
    name,
    dir: name.endsWith('/'),
    async: jest.fn().mockResolvedValue(Buffer.from(contents)),
  } as unknown as JSZip.JSZipObject;
}

describe('SCORM storage boundary', () => {
  let basePath: string;

  beforeEach(() => {
    basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'scorm-storage-'));
  });

  afterEach(() => {
    fs.rmSync(basePath, { recursive: true, force: true });
  });

  it('persists allowlisted nested entries beneath a server-generated directory', async () => {
    const folderName = '73f41e8a-39f5-4be5-aeb2-b62bcd0bb68d-a1b2c3d4';

    const storedPath = await persistScormPackage(
      [entry('course/'), entry('course/index.html', '<title>Course</title>')],
      basePath,
      folderName,
      {
        version: 'SCORM 1.2',
        launchPath: 'course/index.html',
        originalFileName: 'course.zip',
      }
    );

    expect(storedPath).toBe(path.join(basePath, folderName));
    expect(fs.readFileSync(path.join(storedPath, 'course/index.html'), 'utf8')).toContain('Course');
    expect(fs.existsSync(path.join(storedPath, '.scorm-metadata.json'))).toBe(true);
  });

  it.each(['../outside.txt', '/absolute.txt', 'course/../../outside.txt', 'course/file?.js'])(
    'rejects unsafe archive path %s',
    async (entryName) => {
      await expect(
        persistScormPackage(
          [entry(entryName)],
          basePath,
          '73f41e8a-39f5-4be5-aeb2-b62bcd0bb68d-a1b2c3d4',
          {
            version: 'SCORM 2004',
            launchPath: 'index.html',
            originalFileName: 'course.zip',
          }
        )
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fs.existsSync(path.resolve(basePath, '..', 'outside.txt'))).toBe(false);
    }
  );

  it('ignores unsafe persisted paths during cleanup', async () => {
    const outside = path.resolve(basePath, '..', 'outside-scorm');
    fs.mkdirSync(outside, { recursive: true });

    await removeScormPackage(basePath, '../outside-scorm');

    expect(fs.existsSync(outside)).toBe(true);
    fs.rmSync(outside, { recursive: true, force: true });
  });
});
