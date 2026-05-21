import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  color: string;
  shortcut?: string;
}

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'new-control',
      label: 'New Control',
      description: 'Create a custom control',
      icon: ShieldCheckIcon,
      action: () => navigate('/controls/new'),
      color: 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20',
    },
    {
      id: 'new-risk',
      label: 'New Risk',
      description: 'Register a risk',
      icon: ExclamationTriangleIcon,
      action: () => navigate('/risks/new'),
      color: 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20',
    },
    {
      id: 'upload-evidence',
      label: 'Upload Evidence',
      description: 'Add evidence files',
      icon: ArrowUpTrayIcon,
      action: () => navigate('/evidence/new'),
      color: 'text-blue-600 bg-blue-500/10 hover:bg-blue-500/20',
    },
    {
      id: 'new-vendor',
      label: 'New Vendor',
      description: 'Add a vendor',
      icon: BuildingOfficeIcon,
      action: () => navigate('/vendors/new'),
      color: 'text-purple-600 bg-purple-500/10 hover:bg-purple-500/20',
    },
    {
      id: 'new-policy',
      label: 'New Policy',
      description: 'Create a policy',
      icon: DocumentTextIcon,
      action: () => navigate('/policies/new'),
      color: 'text-cyan-600 bg-cyan-500/10 hover:bg-cyan-500/20',
    },
  ];

  return (
    <div className={clsx('bg-white rounded-xl border border-surface-200 p-4', className)}>
      <h3 className="font-medium text-white mb-4 flex items-center gap-2">
        <PlusIcon className="w-5 h-5 text-brand-400" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={clsx(
              'flex flex-col items-center p-3 rounded-lg transition-all',
              action.color,
              'border border-transparent hover:border-surface-300'
            )}
          >
            <action.icon className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium text-white">{action.label}</span>
            {action.shortcut && (
              <span className="text-xs text-surface-500 mt-1">{action.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Horizontal version for dashboard
export function QuickActionsBar() {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'new-control',
      label: 'Control',
      icon: ShieldCheckIcon,
      action: () => navigate('/controls/new'),
    },
    {
      id: 'new-risk',
      label: 'Risk',
      icon: ExclamationTriangleIcon,
      action: () => navigate('/risks/new'),
    },
    {
      id: 'upload',
      label: 'Evidence',
      icon: ArrowUpTrayIcon,
      action: () => navigate('/evidence/new'),
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarDaysIcon,
      action: () => navigate('/compliance-calendar'),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: ChartBarIcon,
      action: () => navigate('/risk-reports'),
    },
  ];

  return (
    <div className="flex items-center gap-2 bg-white/50 rounded-lg p-1">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.action}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-surface-600 hover:text-white hover:bg-surface-200 transition-colors"
          title={action.label}
        >
          <action.icon className="w-4 h-4" />
          <span className="text-sm hidden md:inline">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

// Mini floating action button
export function FloatingQuickAction({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette: () => void;
}) {
  return (
    <button
      onClick={onOpenCommandPalette}
      className="fixed bottom-6 right-6 p-4 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40"
      title="Quick Actions (⌘K)"
    >
      <PlusIcon className="w-6 h-6" />
    </button>
  );
}

export default QuickActions;
