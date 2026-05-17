// NOTE: Jest is not yet wired for the `policies` service. This spec is
// authored to mirror the controls/frameworks pattern and will be picked up
// once PR-4 adds Jest configuration to this service. Do not attempt to run
// it directly until then.

import { BadRequestException } from '@nestjs/common';
import {
  POLICY_MAX_BYTES,
  POLICY_MIME_ALLOWLIST,
  policyFileFilter,
} from './policies.controller';

describe('policyFileFilter', () => {
  function runFilter(mimetype: string) {
    return new Promise<{ err: Error | null; accepted: boolean }>((resolve) => {
      policyFileFilter({} as unknown, { mimetype }, (err, accepted) =>
        resolve({ err, accepted }),
      );
    });
  }

  it.each(POLICY_MIME_ALLOWLIST)(
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
    expect(POLICY_MAX_BYTES).toBe(25 * 1024 * 1024);
  });
});
