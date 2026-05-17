import {
  AnchorForPrompt,
  CandidateForPrompt,
  RESPONSE_SCHEMA,
  formatAnchor,
  formatCandidateCatalog,
} from './shared';

/**
 * Build the user-side prompt for the control → requirements direction.
 *
 * The system prompt (SYSTEM_PROMPT from shared.ts) is sent separately
 * through the controls service AI endpoint.
 */
export function buildControlToRequirementsPrompt(
  anchor: AnchorForPrompt,
  candidates: CandidateForPrompt[]
): string {
  return `Direction: control-to-requirements

You are given a single control (the anchor) and a catalog of candidate
framework requirements. Select the requirements that the control most clearly
satisfies and score each candidate's confidence in [0, 1].

Anchor control:
${formatAnchor(anchor)}

Candidate requirements (use only these ids):
${formatCandidateCatalog(candidates)}

Respond with strictly-formatted JSON matching this schema:
${RESPONSE_SCHEMA}`;
}
