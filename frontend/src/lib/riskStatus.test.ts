import { describe, expect, it } from 'vitest';
import { riskStatusVariant } from './riskStatus';

describe('riskStatusVariant', () => {
  it.each([
    ['open', 'danger'],
    ['closed', 'neutral'],
    ['mitigation in progress', 'success'],
    ['pending review', 'warning'],
    ['risk identified', 'info'],
  ] as const)('maps %s to the %s badge', (status, expected) => {
    expect(riskStatusVariant(status)).toBe(expected);
  });

  it('uses a neutral badge for absent or unknown statuses', () => {
    expect(riskStatusVariant(null)).toBe('neutral');
    expect(riskStatusVariant('unexpected')).toBe('neutral');
  });
});
