import { BadRequestException } from '@nestjs/common';
import { validatePathWithinBase } from '@gigachad-grc/shared';
import type JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';

interface ScormMetadata {
  version: string;
  launchPath: string;
  originalFileName: string;
}

function validateEntryPath(entryName: string): string {
  const relativePath = entryName.replace(/\\/g, '/');
  const segments = relativePath.split('/').filter(Boolean);
  if (
    !relativePath ||
    relativePath.startsWith('/') ||
    relativePath.includes('\0') ||
    segments.some(
      (segment) => segment === '.' || segment === '..' || !/^[A-Za-z0-9._ ()@+-]+$/.test(segment)
    )
  ) {
    throw new BadRequestException(`Unsafe SCORM entry: ${entryName}`);
  }
  return relativePath;
}

export async function persistScormPackage(
  entries: JSZip.JSZipObject[],
  uploadsBasePath: string,
  folderName: string,
  metadata: ScormMetadata
): Promise<string> {
  if (!/^[0-9a-f-]+$/i.test(folderName)) {
    throw new BadRequestException('Invalid SCORM storage identifier');
  }

  const uploadDirValidation = validatePathWithinBase(uploadsBasePath, folderName);
  if (!uploadDirValidation.isValid) {
    throw new BadRequestException(`Invalid upload path: ${uploadDirValidation.error}`);
  }
  const resolvedUploadDir = path.resolve(uploadDirValidation.resolvedPath);
  const resolvedBase = path.resolve(uploadsBasePath);
  if (
    !resolvedUploadDir.startsWith(resolvedBase + path.sep) &&
    resolvedUploadDir !== resolvedBase
  ) {
    throw new BadRequestException('Path traversal detected in upload directory');
  }

  try {
    await fs.promises.mkdir(resolvedUploadDir, { recursive: true });
    for (const entry of entries) {
      const relativePath = validateEntryPath(entry.name);
      const destinationValidation = validatePathWithinBase(resolvedUploadDir, relativePath);
      if (!destinationValidation.isValid) {
        throw new BadRequestException(`Unsafe SCORM entry: ${relativePath}`);
      }
      if (entry.dir) {
        await fs.promises.mkdir(destinationValidation.resolvedPath, { recursive: true });
        continue;
      }
      const contents = await entry.async('nodebuffer');
      await fs.promises.mkdir(path.dirname(destinationValidation.resolvedPath), {
        recursive: true,
      });
      await fs.promises.writeFile(destinationValidation.resolvedPath, contents, {
        mode: 0o640,
      });
    }
    await fs.promises.writeFile(
      path.join(resolvedUploadDir, '.scorm-metadata.json'),
      JSON.stringify(metadata),
      { mode: 0o640 }
    );
    return resolvedUploadDir;
  } catch (error) {
    await fs.promises.rm(resolvedUploadDir, { recursive: true, force: true });
    throw error;
  }
}

export async function removeScormPackage(
  uploadsBasePath: string,
  storedPath: string | null | undefined,
  exceptPath?: string
): Promise<void> {
  if (!storedPath || !/^[0-9a-f-]+$/i.test(storedPath)) return;
  const validated = validatePathWithinBase(uploadsBasePath, storedPath);
  if (!validated.isValid || validated.resolvedPath === exceptPath) return;
  await fs.promises.rm(validated.resolvedPath, { recursive: true, force: true });
}
