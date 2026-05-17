/**
 * Demo-mode token overlap helpers for AI mapping suggestions.
 *
 * Locked formulas from PR-B-ai contract §5. Do not modify without updating
 * the contract document — these constants and functions are referenced by
 * snapshot tests that protect determinism.
 */

export const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'for',
  'with',
  'on',
  'at',
  'by',
  'as',
  'is',
  'are',
  'be',
  'will',
  'shall',
  'must',
  'should',
  'may',
  'can',
  'any',
  'all',
  'such',
  'that',
  'this',
  'these',
  'those',
  'its',
  'their',
  'our',
  'your',
  'it',
  'from',
  'if',
  'than',
  'then',
  'also',
  'not',
  'no',
  'have',
  'has',
  'had',
  'do',
  'does',
  'system',
  'systems',
  'data',
  'information',
  'organization',
  'organizations',
  'process',
  'processes',
  'control',
  'controls',
  'procedure',
  'procedures',
]);

export const MIN_TOKEN_LENGTH = 3;

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(t))
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/**
 * Compute shared tokens between two sets, sorted alphabetically.
 */
export function sharedTokens(a: Set<string>, b: Set<string>): string[] {
  const shared: string[] = [];
  for (const t of a) if (b.has(t)) shared.push(t);
  return shared.sort();
}

/**
 * Build a deterministic rationale string for a demo-mode suggestion.
 *
 * - If there are shared tokens: lists up to the first three alphabetically.
 * - If there are zero shared tokens: returns the locked fallback sentence.
 */
export function buildRationale(shared: string[]): string {
  if (shared.length === 0) {
    return 'No shared terms; suggestion ranked by absence of overlap.';
  }
  const top = shared.slice(0, 3).join(', ');
  return `Matched on ${shared.length} shared terms: ${top}.`;
}
