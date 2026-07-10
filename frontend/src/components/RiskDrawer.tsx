import { useNavigate } from 'react-router-dom';
import { ExternalLink, Folder, User, Calendar, Tag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, Badge, Drawer, type BadgeVariant } from '@/components/ui';

const RISK_LEVEL_DOT: Record<string, string> = {
  very_low: 'bg-emerald-600',
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  very_high: 'bg-red-600',
  critical: 'bg-red-500',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  risk_identified: 'brand',
  not_a_risk: 'neutral',
  actual_risk: 'info',
  risk_analysis_in_progress: 'info',
  risk_analyzed: 'info',
  open: 'danger',
  in_treatment: 'warning',
  accepted: 'info',
  mitigated: 'success',
  closed: 'neutral',
};

export interface RiskItem {
  id: string;
  riskId: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  likelihood: string;
  impact: string;
  inherentRisk: string;
  residualRisk?: string;
  likelihoodPct?: number;
  impactValue?: number;
  annualLossExp?: number;
  treatmentPlan?: string;
  ownerName?: string;
  reviewFrequency?: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  tags?: string[];
  assetCount?: number;
  controlCount?: number;
  scenarioCount?: number;
  createdAt?: string;
}

interface RiskDrawerProps {
  risk: RiskItem | null;
  open: boolean;
  onClose: () => void;
}

export function RiskDrawer({ risk, open, onClose }: RiskDrawerProps) {
  const navigate = useNavigate();
  if (!risk) return null;

  const openFullPage = () => {
    onClose();
    navigate(`/risks/${risk.id}`);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-brand-700 text-small">{risk.riskId}</span>
          <span className="text-surface-500">·</span>
          <span className="truncate">{risk.title}</span>
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button leftIcon={<ExternalLink className="h-4 w-4" />} onClick={openFullPage}>
            Open full page
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2">
          {risk.status ? (
            <Badge variant={STATUS_VARIANT[risk.status] ?? 'neutral'} dot size="md">
              {risk.status.replace(/_/g, ' ')}
            </Badge>
          ) : (
            <Badge variant="neutral" size="md">
              No status
            </Badge>
          )}
        </div>

        {/* Risk score panel */}
        <div className="grid grid-cols-2 gap-3">
          <RiskLevelCard label="Inherent" level={risk.inherentRisk} />
          <RiskLevelCard label="Residual" level={risk.residualRisk} />
        </div>

        {/* Description */}
        {risk.description && (
          <div>
            <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-body text-surface-800 whitespace-pre-wrap">{risk.description}</p>
          </div>
        )}

        {/* Key facts */}
        <div className="grid grid-cols-2 gap-4">
          <MetaField
            icon={<Folder className="h-3.5 w-3.5" />}
            label="Category"
            value={<span className="capitalize">{risk.category || '—'}</span>}
          />
          <MetaField
            icon={<Tag className="h-3.5 w-3.5" />}
            label="Likelihood / Impact"
            value={
              <span className="capitalize">
                {risk.likelihood ? risk.likelihood.replace(/_/g, ' ') : '—'} /{' '}
                {risk.impact ? risk.impact.replace(/_/g, ' ') : '—'}
              </span>
            }
          />
          {risk.ownerName && (
            <MetaField
              icon={<User className="h-3.5 w-3.5" />}
              label="Owner"
              value={risk.ownerName}
            />
          )}
          {risk.nextReviewDue && (
            <MetaField
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Next review"
              value={
                <span
                  className={
                    new Date(risk.nextReviewDue) < new Date() ? 'text-red-600' : 'text-surface-800'
                  }
                >
                  {new Date(risk.nextReviewDue).toLocaleDateString()}
                </span>
              }
            />
          )}
        </div>

        {/* Relationships */}
        {(risk.assetCount !== undefined ||
          risk.controlCount !== undefined ||
          risk.scenarioCount !== undefined) && (
          <div>
            <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
              Relationships
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Assets" value={risk.assetCount ?? 0} />
              <Stat label="Controls" value={risk.controlCount ?? 0} />
              <Stat label="Scenarios" value={risk.scenarioCount ?? 0} />
            </div>
          </div>
        )}

        {/* Treatment */}
        {risk.treatmentPlan && (
          <div>
            <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
              Treatment Plan
            </h3>
            <Badge variant="info" className="capitalize">
              {String(risk.treatmentPlan).replace(/_/g, ' ')}
            </Badge>
          </div>
        )}

        {/* Tags */}
        {risk.tags && risk.tags.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {risk.tags.map((tag) => (
                <Badge key={tag} variant="neutral" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function RiskLevelCard({ label, level }: { label: string; level?: string }) {
  if (!level) {
    return (
      <div className="rounded-md border border-surface-200 bg-white/40 p-3">
        <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-small text-surface-500">Not assessed</p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-surface-200 bg-white/40 p-3">
      <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className={cn('h-2.5 w-2.5 rounded-full', RISK_LEVEL_DOT[level] || 'bg-surface-500')}
        />
        <span className="text-body text-surface-900 capitalize font-medium">
          {String(level).replace(/_/g, ' ')}
        </span>
      </div>
    </div>
  );
}

function MetaField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-surface-500 uppercase tracking-wider mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-body text-surface-800">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-100/60 rounded-md p-2.5 text-center">
      <p className="text-h2 text-surface-900 tabular-nums">{value}</p>
      <p className="text-xs text-surface-500">{label}</p>
    </div>
  );
}
