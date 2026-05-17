import { BadRequestException } from '@nestjs/common';
import {
  TRAINING_MAX_BYTES,
  TRAINING_MIME_ALLOWLIST,
  trainingFileFilter,
} from './training.controller';

describe('trainingFileFilter', () => {
  function runFilter(mimetype: string) {
    return new Promise<{ err: Error | null; accepted: boolean }>((resolve) => {
      trainingFileFilter({} as unknown, { mimetype }, (err, accepted) =>
        resolve({ err, accepted }),
      );
    });
  }

  it.each(TRAINING_MIME_ALLOWLIST)(
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
    'application/msword',
    'text/csv',
  ])('rejects disallowed MIME type: %s', async (mime) => {
    const { err, accepted } = await runFilter(mime);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(accepted).toBe(false);
  });

  it('exposes a 100 MB max byte ceiling', () => {
    expect(TRAINING_MAX_BYTES).toBe(100 * 1024 * 1024);
  });
});
