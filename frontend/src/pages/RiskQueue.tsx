import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { risksApi } from '../lib/api';
import { Clock, CheckCircle2, AlertTriangle, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  EmptyState,
} from '@/components/ui';

type QueueTab = 'assessments' | 'treatments' | 'approvals' | 'reviews';

interface QueueRisk {
  id: string;
  riskId: string;
  title: string;
  description: string;
  category: string;
  inherentRisk: string;
  createdAt: string;
  treatmentDueDate?: string;
}

const LEVEL_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

export default function RiskQueue() {
  const [activeTab, setActiveTab] = useState<QueueTab>('assessments');
  const userId = localStorage.getItem('userId') || '';

  const { data: assessmentQueue } = useQuery({
    queryKey: ['risk-queue', 'assessments', userId],
    queryFn: () =>
      risksApi.list({ status: 'risk_analysis_in_progress', limit: 50 }).then((r) => r.data),
  });
  const { data: treatmentQueue } = useQuery({
    queryKey: ['risk-queue', 'treatments', userId],
    queryFn: () =>
      risksApi.list({ status: 'treatment_decision_review', limit: 50 }).then((r) => r.data),
  });
  const { data: approvalQueue } = useQuery({
    queryKey: ['risk-queue', 'approvals', userId],
    queryFn: () => risksApi.list({ status: 'executive_approval', limit: 50 }).then((r) => r.data),
  });
  const { data: reviewQueue } = useQuery({
    queryKey: ['risk-queue', 'reviews', userId],
    queryFn: () => risksApi.list({ status: 'grc_approval', limit: 50 }).then((r) => r.data),
  });

  const tabs: Array<{
    key: QueueTab;
    label: string;
    count: number;
    icon: typeof Clock;
    color: string;
    bg: string;
  }> = [
    {
      key: 'assessments',
      label: 'My Assessments',
      count: assessmentQueue?.risks?.length || 0,
      icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-500/10',
    },
    {
      key: 'treatments',
      label: 'Treatment Decisions',
      count: treatmentQueue?.risks?.length || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-500/10',
    },
    {
      key: 'approvals',
      label: 'Executive Approvals',
      count: approvalQueue?.risks?.length || 0,
      icon: User,
      color: 'text-purple-600',
      bg: 'bg-purple-500/10',
    },
    {
      key: 'reviews',
      label: 'GRC Reviews',
      count: reviewQueue?.risks?.length || 0,
      icon: CheckCircle2,
      color: 'text-cyan-600',
      bg: 'bg-cyan-500/10',
    },
  ];

  const getActiveQueue = (): QueueRisk[] => {
    switch (activeTab) {
      case 'assessments':
        return assessmentQueue?.risks || [];
      case 'treatments':
        return treatmentQueue?.risks || [];
      case 'approvals':
        return approvalQueue?.risks || [];
      case 'reviews':
        return reviewQueue?.risks || [];
    }
  };

  const getActionText = () => {
    switch (activeTab) {
      case 'assessments':
        return 'Complete Assessment';
      case 'treatments':
        return 'Make Decision';
      case 'approvals':
        return 'Review & Approve';
      case 'reviews':
        return 'Review Assessment';
    }
  };

  const queue = getActiveQueue();
  const activeTabLabel = tabs.find((t) => t.key === activeTab)?.label ?? '';

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="My Risk Queue" description="Tasks and actions awaiting your attention." />

      {/* Tab cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <Card
              key={tab.key}
              interactive
              onClick={() => setActiveTab(tab.key)}
              className={cn(isActive && 'border-brand-500 bg-brand-500/5')}
            >
              <CardBody density="cozy" className="flex items-center gap-3">
                <div className={cn('p-2 rounded-md', tab.bg)}>
                  <Icon className={cn('h-5 w-5', tab.color)} />
                </div>
                <div>
                  <p className="text-h1 text-surface-900">{tab.count}</p>
                  <p className="text-xs text-surface-600">{tab.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Queue list */}
      <Card>
        <CardHeader>
          <CardTitle>{activeTabLabel}</CardTitle>
        </CardHeader>
        <div className="divide-y divide-surface-200">
          {queue.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
              title="You're all caught up"
              description="No items in this queue right now."
            />
          ) : (
            queue.map((risk) => (
              <div
                key={risk.id}
                className="p-4 hover:bg-surface-100/40 transition-colors flex items-center gap-4"
              >
                <span
                  className={cn(
                    'h-3 w-3 rounded-full shrink-0',
                    LEVEL_DOT[risk.inherentRisk] || 'bg-surface-500'
                  )}
                  aria-label={`Inherent risk: ${risk.inherentRisk}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-brand-700 font-mono text-xs">{risk.riskId}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium text-surface-900 uppercase tracking-wider',
                        LEVEL_DOT[risk.inherentRisk] || 'bg-surface-500'
                      )}
                    >
                      {risk.inherentRisk}
                    </span>
                  </div>
                  <p className="text-surface-900 font-medium mt-1 truncate">{risk.title}</p>
                  <p className="text-small text-surface-600 truncate">{risk.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-surface-500 flex-wrap">
                    <span>Category: {risk.category}</span>
                    <span>Created: {new Date(risk.createdAt).toLocaleDateString()}</span>
                    {risk.treatmentDueDate && (
                      <span className="text-amber-700">
                        Due: {new Date(risk.treatmentDueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Link to={`/risks/${risk.id}`} className="shrink-0">
                  <Button size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                    {getActionText()}
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Tips</CardTitle>
        </CardHeader>
        <CardBody density="comfy">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-small">
            <Tip n={1} tone="amber" label="Assessments">
              Complete risk analysis including likelihood, impact, and recommended treatment.
            </Tip>
            <Tip n={2} tone="orange" label="Treatments">
              Decide how to handle the risk — mitigate, accept, transfer, or avoid.
            </Tip>
            <Tip n={3} tone="purple" label="Approvals">
              Executive review required for high-risk accept/transfer/avoid decisions.
            </Tip>
            <Tip n={4} tone="cyan" label="Reviews">
              GRC team validates assessments before treatment decisions.
            </Tip>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Tip({
  n,
  tone,
  label,
  children,
}: {
  n: number;
  tone: 'amber' | 'orange' | 'purple' | 'cyan';
  label: string;
  children: React.ReactNode;
}) {
  const tones = {
    amber: 'bg-amber-500/10 text-amber-700',
    orange: 'bg-orange-500/10 text-orange-600',
    purple: 'bg-purple-500/10 text-purple-600',
    cyan: 'bg-cyan-500/10 text-cyan-600',
  };
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'h-6 w-6 rounded-full flex items-center justify-center shrink-0',
          tones[tone]
        )}
      >
        <span className="font-bold text-xs">{n}</span>
      </div>
      <p className="text-surface-600">
        <strong className="text-surface-800">{label}:</strong> {children}
      </p>
    </div>
  );
}
