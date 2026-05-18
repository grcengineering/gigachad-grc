/**
 * Shared AI prompt assets for mapping suggestions.
 *
 * Locked verbatim from PR-B-ai contract §4.1 and §4.2.
 */

export const SYSTEM_PROMPT = `You are a compliance-mapping expert. You match controls to compliance-framework
requirements by analyzing semantic overlap of objectives, scope, and language.
You output strictly-formatted JSON with no prose, no markdown, no code fences.
You never invent candidate IDs — every id in your response must appear in the
provided candidate catalog. You assign a confidence score in [0, 1] expressing
how strongly the candidate satisfies the anchor. A short rationale (one
sentence, ≤ 280 characters) explains the match.`;

export const RESPONSE_SCHEMA = `{
  "suggestions": [
    { "candidateId": "<one of the provided candidate ids>", "confidence": 0.0, "rationale": "≤ 280 chars" }
  ]
}`;

/**
 * Minimal shape of catalog entries used when building prompts.
 *
 * Both directions can be reduced to: a stable id, a human-readable reference,
 * a title, and a description. The prompt does not include candidate categories
 * or guidance — those are reserved for the demo-mode anchor text instead.
 */
export interface CandidateForPrompt {
  id: string;
  reference: string;
  title: string;
  description: string;
}

/**
 * Anchor passed into the prompt builder. Both requirements and controls share
 * the same shape after normalization.
 */
export interface AnchorForPrompt {
  reference: string;
  title: string;
  description: string;
  guidance?: string | null;
}

/**
 * Format the candidate catalog as a JSON array suitable for an LLM prompt.
 * Stable string output so prompt snapshots are deterministic.
 */
export function formatCandidateCatalog(candidates: CandidateForPrompt[]): string {
  return JSON.stringify(
    candidates.map((c) => ({
      id: c.id,
      reference: c.reference,
      title: c.title,
      description: c.description,
    })),
    null,
    2
  );
}

/**
 * Format an anchor (requirement or control) as a JSON object for the prompt.
 */
export function formatAnchor(anchor: AnchorForPrompt): string {
  return JSON.stringify(
    {
      reference: anchor.reference,
      title: anchor.title,
      description: anchor.description,
      guidance: anchor.guidance ?? null,
    },
    null,
    2
  );
}
