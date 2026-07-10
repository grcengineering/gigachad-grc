import type { BadgeVariant } from '@/components/ui';

// Single source of truth for risk status → Badge variant. Use this everywhere
// risk status renders so Risk Register, Drawer, Dashboard, and Detail stay aligned.
export function riskStatusVariant(status: string | undefined | null): BadgeVariant {
  if (!status) return 'neutral';
  const s = status.toLowerCase();
  if (
    s.includes('mitigat') ||
    s.includes('accept') ||
    s.includes('avoid') ||
    s.includes('transfer')
  ) return 'success';
  if (s === 'closed') return 'neutral';
  if (s === 'open') return 'danger';
  if (s.includes('progress') || s.includes('review') || s.includes('approval')) return 'warning';
  if (s.includes('identified') || s.includes('analysis') || s.includes('analyzed') || s.includes('actual')) return 'info';
  return 'neutral';
}
