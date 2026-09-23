import { BadRequestException } from '@nestjs/common';
import {
  FrameworksController,
  FRAMEWORK_IMPORT_MAX_BYTES,
  FRAMEWORK_IMPORT_MIME_ALLOWLIST,
  frameworkImportFileFilter,
} from './frameworks.controller';

describe('frameworkImportFileFilter', () => {
  function runFilter(mimetype: string) {
    return new Promise<{ err: Error | null; accepted: boolean }>((resolve) => {
      frameworkImportFileFilter({} as unknown, { mimetype }, (err, accepted) =>
        resolve({ err, accepted }),
      );
    });
  }

  it.each(FRAMEWORK_IMPORT_MIME_ALLOWLIST)(
    'accepts allowed MIME type: %s',
    async (mime) => {
      const { err, accepted } = await runFilter(mime);
      expect(err).toBeNull();
      expect(accepted).toBe(true);
    },
  );

  it.each([
    'application/x-msdownload',
    'application/javascript',
    'text/html',
    'image/svg+xml',
    'application/zip',
    'application/pdf',
    'application/json',
  ])('rejects disallowed MIME type: %s', async (mime) => {
    const { err, accepted } = await runFilter(mime);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(accepted).toBe(false);
  });

  it('exposes a 25 MB max byte ceiling', () => {
    expect(FRAMEWORK_IMPORT_MAX_BYTES).toBe(25 * 1024 * 1024);
  });
});

describe('FrameworksController uploads', () => {
  const frameworksService = { bulkUploadRequirements: jest.fn() };
  const controller = new FrameworksController(frameworksService as never);

  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing requirements file with HTTP 400', async () => {
    await expect(
      controller.bulkUploadRequirements(
        'framework-1',
        undefined as unknown as Express.Multer.File
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(frameworksService.bulkUploadRequirements).not.toHaveBeenCalled();
  });
});
