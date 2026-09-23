import { BadRequestException } from '@nestjs/common';
import {
  EvidenceController,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME_ALLOWLIST,
  evidenceFileFilter,
} from './evidence.controller';

describe('evidenceFileFilter', () => {
  function runFilter(mimetype: string) {
    return new Promise<{ err: Error | null; accepted: boolean }>((resolve) => {
      evidenceFileFilter({} as unknown, { mimetype }, (err, accepted) =>
        resolve({ err, accepted }),
      );
    });
  }

  it.each(EVIDENCE_MIME_ALLOWLIST)(
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
  ])('rejects disallowed MIME type: %s', async (mime) => {
    const { err, accepted } = await runFilter(mime);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(accepted).toBe(false);
  });

  it('exposes a 50 MB max byte ceiling', () => {
    expect(EVIDENCE_MAX_BYTES).toBe(50 * 1024 * 1024);
  });
});

describe('EvidenceController uploads and deletion', () => {
  const evidenceService = {
    upload: jest.fn(),
    delete: jest.fn(),
  };
  const controller = new EvidenceController(evidenceService as never);
  const user = { organizationId: 'org-1', userId: 'user-1' } as never;

  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing upload with HTTP 400', async () => {
    await expect(
      controller.upload(user, undefined as unknown as Express.Multer.File, {} as never)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(evidenceService.upload).not.toHaveBeenCalled();
  });

  it('passes the authenticated user ID when deleting evidence', async () => {
    evidenceService.delete.mockResolvedValue({ success: true });
    await controller.delete('evidence-1', user);
    expect(evidenceService.delete).toHaveBeenCalledWith('evidence-1', 'org-1', 'user-1');
  });
});
