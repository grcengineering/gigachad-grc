import { BadRequestException } from '@nestjs/common';
import {
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
