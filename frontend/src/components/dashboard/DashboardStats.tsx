/**
 * Dashboard Stats Component
 * 
 * Displays the main statistics cards at the top of the dashboard.
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface DashboardStatsData {
  controls: {
    total: number;
    implemented: number;
    inProgress: number;
  };
  evidence: {
    total: number;
    expiringSoon: number;
  };
  risks: {
    total: number;
    high: number;
    critical: number;
  };
  frameworks: {
    total: number;
    avgCompliance: number;
  };
  policies: {
    total: number;
    active: number;
    pendingReview: number;
  };
}

interface StatCardProps {
  title: string;
  value: number | string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  href: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    iconBg: 'bg-blue-500',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    iconBg: 'bg-green-500',
  },
  yellow: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-600',
    iconBg: 'bg-yellow-500',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    iconBg: 'bg-red-500',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    iconBg: 'bg-purple-500',
  },
};

const StatCard = memo(function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  color,
  href,
}: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <Link
      to={href}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all hover:border-gray-300 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue && (
            <p className={clsx('text-sm mt-1', colors.text)}>{subValue}</p>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', colors.bg)}>
          <Icon className={clsx('w-6 h-6', colors.text)} />
        </div>
      </div>
      <div className="mt-3 flex items-center text-sm text-gray-500 group-hover:text-indigo-600 transition-colors">
        <span>View details</span>
        <ChevronRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
});

interface DashboardStatsProps {
  data: DashboardStatsData;
  isVisible?: boolean;
}

export const DashboardStats = memo(function DashboardStats({
  data,
  isVisible = true,
}: DashboardStatsProps) {
  if (!isVisible) {
    return null;
  }

  const controlsImplemented = data.controls.total > 0
    ? Math.round((data.controls.implemented / data.controls.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <StatCard
        title="Controls"
        value={data.controls.total}
        subValue={`${controlsImplemented}% implemented`}
        icon={ShieldCheckIcon}
        color="blue"
        href="/controls"
      />
      <StatCard
        title="Evidence"
        value={data.evidence.total}
        subValue={data.evidence.expiringSoon > 0 ? `${data.evidence.expiringSoon} expiring soon` : undefined}
        icon={FolderOpenIcon}
        color="green"
        href="/evidence"
      />
      <StatCard
        title="Risks"
        value={data.risks.total}
        subValue={data.risks.high + data.risks.critical > 0 ? `${data.risks.high + data.risks.critical} high/critical` : 'No high risks'}
        icon={ExclamationTriangleIcon}
        color={data.risks.high + data.risks.critical > 0 ? 'red' : 'yellow'}
        href="/risks"
      />
      <StatCard
        title="Frameworks"
        value={data.frameworks.total}
        subValue={`${data.frameworks.avgCompliance}% avg compliance`}
        icon={CheckCircleIcon}
        color="purple"
        href="/frameworks"
      />
      <StatCard
        title="Policies"
        value={data.policies.total}
        subValue={data.policies.pendingReview > 0 ? `${data.policies.pendingReview} pending review` : `${data.policies.active} active`}
        icon={DocumentTextIcon}
        color="blue"
        href="/policies"
      />
    </div>
  );
});
