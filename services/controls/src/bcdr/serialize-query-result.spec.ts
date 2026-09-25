import { serializeQueryResult } from './serialize-query-result';

describe('serializeQueryResult', () => {
  it('converts nested PostgreSQL bigint counts into JSON-safe numbers', () => {
    expect(
      serializeQueryResult({
        total: 3n,
        nested: { active: 2n },
        rows: [{ count: 1n }],
      })
    ).toEqual({
      total: 3,
      nested: { active: 2 },
      rows: [{ count: 1 }],
    });
  });
});
