import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCurrentOrgId, secureStorage, STORAGE_KEYS } from './secureStorage';

/**
 * Note: the global test setup (src/test/setup.ts) replaces window.localStorage
 * with a vi.fn-backed mock — direct assignment via setItem does not persist.
 * Use vi.mocked(localStorage.getItem).mockReturnValue(...) to stub reads.
 * sessionStorage (used by secureStorage internally) is the real jsdom impl.
 */
describe('getCurrentOrgId', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(localStorage.getItem).mockReset();
    vi.mocked(localStorage.getItem).mockReturnValue(null);
  });

  it('returns the secureStorage value when both are set (secureStorage wins)', () => {
    secureStorage.set(STORAGE_KEYS.ORGANIZATION_ID, 'org-from-secure');
    vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
      key === 'organizationId' ? 'org-from-legacy' : null
    );

    expect(getCurrentOrgId()).toBe('org-from-secure');
  });

  it('falls back to localStorage when secureStorage returns null', () => {
    // secureStorage is empty; legacy key still set (e.g. by dev-login).
    vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
      key === 'organizationId' ? 'org-from-legacy' : null
    );

    expect(getCurrentOrgId()).toBe('org-from-legacy');
  });

  it('returns null when both are empty', () => {
    expect(getCurrentOrgId()).toBeNull();
  });
});
