/**
 * Legacy EmptyState API + named presets (NoResultsEmptyState etc).
 * Internally renders @/components/ui/EmptyState so styling matches the
 * design system. The variant→icon mapping is preserved for callers.
 */
import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState as UIEmptyState } from '@/components/ui/EmptyState';
import {
  DocumentTextIcon,
  FolderOpenIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  CubeIcon,
  DocumentChartBarIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export type EmptyStateVariant =
  | 'documents'
  | 'folder'
  | 'security'
  | 'warning'
  | 'users'
  | 'checklist'
  | 'building'
  | 'cube'
  | 'chart'
  | 'book'
  | 'calendar'
  | 'bars'
  | 'settings'
  | 'search';

interface EmptyStateProps {
  title: string;
  description?: string;
  variant?: EmptyStateVariant;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantIcons: Record<EmptyStateVariant, React.ComponentType<{ className?: string }>> = {
  documents: DocumentTextIcon,
  folder: FolderOpenIcon,
  security: ShieldCheckIcon,
  warning: ExclamationTriangleIcon,
  users: UserGroupIcon,
  checklist: ClipboardDocumentListIcon,
  building: BuildingOfficeIcon,
  cube: CubeIcon,
  chart: DocumentChartBarIcon,
  book: BookOpenIcon,
  calendar: CalendarDaysIcon,
  bars: ChartBarIcon,
  settings: Cog6ToothIcon,
  search: MagnifyingGlassIcon,
};

export function EmptyState({
  title,
  description,
  variant = 'folder',
  icon,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const Icon = variantIcons[variant];
  const iconElement = icon ?? <Icon className="h-12 w-12 text-surface-500" />;

  const actionsElement =
    action || secondaryAction ? (
      <div className="flex items-center justify-center gap-3">
        {action && (
          <Button onClick={action.onClick} leftIcon={action.icon}>
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    ) : undefined;

  return (
    <div className={`bg-white border border-surface-200 rounded-lg ${className ?? ''}`}>
      <UIEmptyState
        icon={iconElement}
        title={title}
        description={description}
        action={actionsElement}
        size="lg"
      />
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function NoResultsEmptyState({
  searchTerm,
  onClear,
}: {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={
        searchTerm ? `No items match "${searchTerm}"` : 'Try adjusting your search or filters'
      }
      secondaryAction={onClear ? { label: 'Clear filters', onClick: onClear } : undefined}
    />
  );
}

export function NoDataEmptyState({
  entityName,
  onAdd,
  addLabel,
}: {
  entityName: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <EmptyState
      variant="folder"
      title={`No ${entityName} yet`}
      description={`Get started by creating your first ${entityName.toLowerCase()}`}
      action={
        onAdd
          ? {
              label: addLabel || `Add ${entityName}`,
              onClick: onAdd,
            }
          : undefined
      }
    />
  );
}

export function ComingSoonEmptyState({ feature }: { feature: string }) {
  return (
    <EmptyState
      variant="settings"
      title="Coming Soon"
      description={`${feature} is currently under development and will be available soon.`}
    />
  );
}

export function ErrorEmptyState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this content. Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="warning"
      title={title}
      description={description}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
    />
  );
}
