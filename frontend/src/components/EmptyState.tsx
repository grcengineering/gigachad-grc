import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
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
  className = '',
}: EmptyStateProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      className={`bg-surface-800 border border-surface-700 rounded-xl p-12 text-center ${className}`}
    >
      <div className="flex justify-center mb-4">
        {icon || <Icon className="w-12 h-12 text-surface-500" />}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      {description && <p className="text-surface-600 max-w-md mx-auto mb-6">{description}</p>}
      {(action || secondaryAction) && (
        <div className="flex items-center justify-center gap-3">
          {action && (
            <Button onClick={action.onClick} leftIcon={action.icon}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-surface-600 hover:text-white transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
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

export default EmptyState;
