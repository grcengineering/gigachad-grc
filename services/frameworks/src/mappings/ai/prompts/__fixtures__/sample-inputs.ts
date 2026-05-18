import { AnchorForPrompt, CandidateForPrompt } from '../shared';

/**
 * Deterministic prompt-builder fixtures used by snapshot tests.
 *
 * These fixtures are intentionally tiny and do not represent real data.
 */

export const sampleRequirementAnchor: AnchorForPrompt = {
  reference: 'CC6.1',
  title: 'Logical Access Controls',
  description:
    'The entity implements logical access security software, infrastructure, and architectures over protected information assets.',
  guidance: 'Consider role-based access, least privilege, and periodic reviews of access rights.',
};

export const sampleControlCandidates: CandidateForPrompt[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    reference: 'AC-001',
    title: 'Role-Based Access Control',
    description: 'Access to systems is granted on a least-privilege basis and aligned to job role.',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    reference: 'AC-002',
    title: 'Quarterly Access Review',
    description:
      'Owners review user access on a quarterly cadence and remove unneeded entitlements.',
  },
];

export const sampleControlAnchor: AnchorForPrompt = {
  reference: 'AC-001',
  title: 'Role-Based Access Control',
  description: 'Access to systems is granted on a least-privilege basis and aligned to job role.',
  guidance: null,
};

export const sampleRequirementCandidates: CandidateForPrompt[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    reference: 'CC6.1',
    title: 'Logical Access Controls',
    description:
      'The entity implements logical access security software, infrastructure, and architectures over protected information assets.',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    reference: 'CC6.3',
    title: 'Access Removal',
    description:
      'The entity removes access to protected information assets when no longer required.',
  },
];
