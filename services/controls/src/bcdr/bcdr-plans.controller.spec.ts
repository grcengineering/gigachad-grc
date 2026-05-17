import { BadRequestException } from '@nestjs/common';
import {
  BCDR_PLAN_MAX_BYTES,
  BCDR_PLAN_MIME_ALLOWLIST,
  bcdrPlanFileFilter,
} from './bcdr-plans.controller';

describe('bcdrPlanFileFilter', () => {
  function runFilter(mimetype: string) {
    return new Promise<{ err: Error | null; accepted: boolean }>((resolve) => {
      bcdrPlanFileFilter({} as unknown, { mimetype }, (err, accepted) =>
        resolve({ err, accepted }),
      );
    });
  }

  it.each(BCDR_PLAN_MIME_ALLOWLIST)(
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
    'video/mp4',
  ])('rejects disallowed MIME type: %s', async (mime) => {
    const { err, accepted } = await runFilter(mime);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(accepted).toBe(false);
  });

  it('exposes a 25 MB max byte ceiling', () => {
    expect(BCDR_PLAN_MAX_BYTES).toBe(25 * 1024 * 1024);
  });
});
