import {
  AnchorForPrompt,
  CandidateForPrompt,
  RESPONSE_SCHEMA,
  formatAnchor,
  formatCandidateCatalog,
} from './shared';

/**
 * Build the user-side prompt for the requirement → controls direction.
 *
 * The system prompt (SYSTEM_PROMPT from shared.ts) is sent separately
 * through the controls service AI endpoint.
 */
export function buildRequirementToControlsPrompt(
  anchor: AnchorForPrompt,
  candidates: CandidateForPrompt[]
): string {
  return `Direction: requirement-to-controls

You are given a single framework requirement (the anchor) and a catalog of
candidate controls. Select the controls that best satisfy the requirement and
score each candidate's confidence in [0, 1].

Anchor requirement:
${formatAnchor(anchor)}

Candidate controls (use only these ids):
${formatCandidateCatalog(candidates)}

Respond with strictly-formatted JSON matching this schema:
${RESPONSE_SCHEMA}`;
}
