import {
  MIN_TOKEN_LENGTH,
  STOPWORDS,
  buildRationale,
  jaccard,
  sharedTokens,
  tokenize,
} from './token-overlap';

describe('token-overlap (locked formula)', () => {
  describe('STOPWORDS', () => {
    it('is a frozen-by-convention set of low-signal words', () => {
      expect(STOPWORDS.has('the')).toBe(true);
      expect(STOPWORDS.has('control')).toBe(true);
      expect(STOPWORDS.has('controls')).toBe(true);
      // Confirm a meaningful term is NOT a stopword
      expect(STOPWORDS.has('access')).toBe(false);
      expect(STOPWORDS.has('encryption')).toBe(false);
    });
  });

  describe('MIN_TOKEN_LENGTH', () => {
    it('is 3', () => {
      expect(MIN_TOKEN_LENGTH).toBe(3);
    });
  });

  describe('tokenize', () => {
    it('lowercases, strips punctuation, drops short tokens and stopwords', () => {
      const tokens = tokenize('The Quick BROWN fox-jumps over a lazy dog!');
      expect([...tokens].sort()).toEqual(['brown', 'dog', 'fox', 'jumps', 'lazy', 'over', 'quick']);
    });

    it('drops tokens shorter than MIN_TOKEN_LENGTH', () => {
      const tokens = tokenize('A b c1 def');
      expect(tokens.has('a')).toBe(false);
      expect(tokens.has('b')).toBe(false);
      expect(tokens.has('def')).toBe(true);
    });

    it('treats hyphens and underscores as whitespace', () => {
      const tokens = tokenize('role-based access_control review');
      expect([...tokens].sort()).toEqual(['access', 'based', 'review', 'role']);
    });

    it('returns an empty set for empty input', () => {
      expect(tokenize('')).toEqual(new Set());
    });
  });

  describe('jaccard', () => {
    it('returns 0 for two empty sets', () => {
      expect(jaccard(new Set(), new Set())).toBe(0);
    });

    it('returns 0 when one set is empty and the other is not', () => {
      expect(jaccard(new Set(['a', 'b']), new Set())).toBe(0);
      expect(jaccard(new Set(), new Set(['a']))).toBe(0);
    });

    it('returns 1 for two identical non-empty sets', () => {
      expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
    });

    it('returns intersect/union for partial overlap', () => {
      // intersect = {b}; union = {a, b, c} → 1/3
      expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3, 5);
    });
  });

  describe('sharedTokens', () => {
    it('returns the intersection sorted alphabetically', () => {
      const a = new Set(['zebra', 'apple', 'mango']);
      const b = new Set(['mango', 'apple', 'banana']);
      expect(sharedTokens(a, b)).toEqual(['apple', 'mango']);
    });

    it('returns an empty array when there is no overlap', () => {
      expect(sharedTokens(new Set(['a']), new Set(['b']))).toEqual([]);
    });
  });

  describe('buildRationale', () => {
    it('includes the top-3 alphabetical shared tokens', () => {
      const shared = ['access', 'audit', 'authentication', 'review'];
      expect(buildRationale(shared)).toBe(
        'Matched on 4 shared terms: access, audit, authentication.'
      );
    });

    it('lists fewer than three when fewer overlap', () => {
      expect(buildRationale(['access'])).toBe('Matched on 1 shared terms: access.');
    });

    it('uses the locked fallback sentence for zero overlap', () => {
      expect(buildRationale([])).toBe('No shared terms; suggestion ranked by absence of overlap.');
    });
  });

  describe('determinism', () => {
    // Demo determinism: same input twice → byte-identical output.
    it('tokenize twice returns equal sets', () => {
      const input = 'Encryption at rest for protected data assets.';
      expect(tokenize(input)).toEqual(tokenize(input));
    });

    it('jaccard is stable across re-runs', () => {
      const a = tokenize('Encryption of data at rest using approved algorithms.');
      const b = tokenize('Approved encryption algorithms protect data at rest.');
      const first = jaccard(a, b);
      const second = jaccard(a, b);
      expect(first).toEqual(second);
    });

    it('buildRationale is byte-identical across runs', () => {
      const shared = ['access', 'authentication', 'review'];
      expect(buildRationale(shared)).toEqual(buildRationale(shared));
    });
  });
});
