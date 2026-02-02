/**
 * Status Badge Component
 * 
 * A reusable badge component for displaying status with consistent styling.
 */

import { memo } from 'react';
import clsx from 'clsx';

// Status configuration type
export interface StatusConfig {
  label: string;
  color: 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'indigo' | 'orange';
  icon?: React.ComponentType<{ className?: string }>;
}

// Predefined status configurations
export const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // Control statuses
  implemented: { label: 'Implemented', color: 'green' },
  in_progress: { label: 'In Progress', color: 'yellow' },
  not_started: { label: 'Not Started', color: 'gray' },
  not_applicable: { label: 'N/A', color: 'gray' },
  
  // Risk statuses
  open: { label: 'Open', color: 'red' },
  mitigated: { label: 'Mitigated', color: 'green' },
  accepted: { label: 'Accepted', color: 'blue' },
  transferred: { label: 'Transferred', color: 'purple' },
  
  // Evidence statuses
  valid: { label: 'Valid', color: 'green' },
  expired: { label: 'Expired', color: 'red' },
  expiring_soon: { label: 'Expiring Soon', color: 'yellow' },
  pending_review: { label: 'Pending Review', color: 'yellow' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  
  // Vendor statuses
  active: { label: 'Active', color: 'green' },
  inactive: { label: 'Inactive', color: 'gray' },
  under_review: { label: 'Under Review', color: 'yellow' },
  terminated: { label: 'Terminated', color: 'red' },
  
  // Audit statuses
  planned: { label: 'Planned', color: 'blue' },
  in_progress_audit: { label: 'In Progress', color: 'yellow' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'gray' },
  
  // Priority levels
  critical: { label: 'Critical', color: 'red' },
  high: { label: 'High', color: 'orange' },
  medium: { label: 'Medium', color: 'yellow' },
  low: { label: 'Low', color: 'green' },
  
  // Policy statuses
  draft: { label: 'Draft', color: 'gray' },
  published: { label: 'Published', color: 'green' },
  archived: { label: 'Archived', color: 'gray' },
  
  // Task statuses
  todo: { label: 'To Do', color: 'gray' },
  done: { label: 'Done', color: 'green' },
  blocked: { label: 'Blocked', color: 'red' },
};

const colorClasses = {
  gray: 'bg-gray-100 text-gray-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  orange: 'bg-orange-100 text-orange-800',
};

const dotColorClasses = {
  gray: 'bg-gray-400',
  green: 'bg-green-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
  indigo: 'bg-indigo-400',
  orange: 'bg-orange-400',
};

interface StatusBadgeProps {
  /** Status key from STATUS_CONFIGS or custom config */
  status: string;
  /** Custom status config (overrides STATUS_CONFIGS) */
  config?: StatusConfig;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show a dot indicator before the label */
  showDot?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const StatusBadge = memo(function StatusBadge({
  status,
  config,
  size = 'md',
  showDot = false,
  className,
}: StatusBadgeProps) {
  // Normalize status key (lowercase, replace spaces with underscores)
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  
  // Get config from props or predefined configs
  const statusConfig = config || STATUS_CONFIGS[normalizedStatus] || {
    label: status,
    color: 'gray' as const,
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        colorClasses[statusConfig.color],
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span
          className={clsx(
            'rounded-full',
            dotColorClasses[statusConfig.color],
            dotSizeClasses[size]
          )}
        />
      )}
      {statusConfig.icon && (
        <statusConfig.icon className="w-4 h-4" />
      )}
      {statusConfig.label}
    </span>
  );
});

/**
 * Get status config for a given status string
 */
export function getStatusConfig(status: string): StatusConfig {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_CONFIGS[normalizedStatus] || { label: status, color: 'gray' };
}

/**
 * Get status color class for a given status string
 */
export function getStatusColor(status: string): StatusConfig['color'] {
  return getStatusConfig(status).color;
}
