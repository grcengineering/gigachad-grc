import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  HomeIcon,
  CalendarDaysIcon,
  BellIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  AcademicCapIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { controlsApi, policiesApi, risksApi, vendorsApi } from '@/lib/api';
import { useBrandingConfig } from '@/contexts/BrandingContext';
import { CommandMenu, type CommandMenuGroup } from '@/components/ui';

type Category = 'navigation' | 'actions' | 'search' | 'settings';

interface CommandData {
  action: () => void;
  category: Category;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const branding = useBrandingConfig();
  const [query, setQuery] = useState('');

  const { data: searchResults } = useQuery({
    queryKey: ['command-search', query],
    queryFn: async () => {
      if (query.length < 2) return { controls: [], policies: [], risks: [], vendors: [] };

      const [controls, policies, risks, vendors] = await Promise.all([
        controlsApi
          .list({ search: query, limit: 5 })
          .then((r) => r.data?.data || [])
          .catch(() => []),
        policiesApi
          .list({ search: query, limit: 5 })
          .then((r) => r.data?.data || [])
          .catch(() => []),
        risksApi
          .list({ search: query, limit: 5 })
          .then((r) => r.data?.risks || [])
          .catch(() => []),
        vendorsApi
          .list({ search: query, limit: 5 })
          .then((r) => r.data?.data || [])
          .catch(() => []),
      ]);

      return { controls, policies, risks, vendors };
    },
    enabled: query.length >= 2,
  });

  type Item = {
    id: string;
    label: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }>;
    shortcut?: string;
    data: CommandData;
  };

  const baseCommands: Item[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        icon: HomeIcon,
        data: { action: () => navigate('/'), category: 'navigation', keywords: ['home'] },
      },
      {
        id: 'nav-controls',
        label: 'Go to Controls',
        icon: ShieldCheckIcon,
        data: { action: () => navigate('/controls'), category: 'navigation' },
      },
      {
        id: 'nav-risks',
        label: 'Go to Risks',
        icon: ExclamationTriangleIcon,
        data: { action: () => navigate('/risks'), category: 'navigation' },
      },
      {
        id: 'nav-policies',
        label: 'Go to Policies',
        icon: DocumentTextIcon,
        data: { action: () => navigate('/policies'), category: 'navigation' },
      },
      {
        id: 'nav-evidence',
        label: 'Go to Evidence',
        icon: FolderOpenIcon,
        data: { action: () => navigate('/evidence'), category: 'navigation' },
      },
      {
        id: 'nav-vendors',
        label: 'Go to Vendors',
        icon: BuildingOfficeIcon,
        data: {
          action: () => navigate('/vendors'),
          category: 'navigation',
          keywords: ['tprm', 'third party'],
        },
      },
      {
        id: 'nav-frameworks',
        label: 'Go to Frameworks',
        icon: ChartBarIcon,
        data: {
          action: () => navigate('/frameworks'),
          category: 'navigation',
          keywords: ['compliance', 'soc2', 'iso'],
        },
      },
      {
        id: 'nav-audits',
        label: 'Go to Audits',
        icon: ClipboardDocumentCheckIcon,
        data: { action: () => navigate('/audits'), category: 'navigation' },
      },
      {
        id: 'nav-calendar',
        label: 'Go to Calendar',
        icon: CalendarDaysIcon,
        data: {
          action: () => navigate('/compliance-calendar'),
          category: 'navigation',
          keywords: ['schedule', 'events'],
        },
      },
      {
        id: 'nav-reports',
        label: 'Go to Risk Reports',
        icon: ChartBarIcon,
        data: { action: () => navigate('/risk-reports'), category: 'navigation' },
      },
      {
        id: 'nav-training',
        label: 'Go to Training',
        icon: AcademicCapIcon,
        data: {
          action: () => navigate('/tools/awareness'),
          category: 'navigation',
          keywords: ['security awareness'],
        },
      },
      {
        id: 'nav-users',
        label: 'Go to Users',
        icon: UserGroupIcon,
        data: { action: () => navigate('/users'), category: 'navigation' },
      },

      {
        id: 'action-new-control',
        label: 'Create New Control',
        icon: PlusIcon,
        data: {
          action: () => navigate('/controls/new'),
          category: 'actions',
          keywords: ['add control'],
        },
      },
      {
        id: 'action-new-risk',
        label: 'Create New Risk',
        icon: PlusIcon,
        data: {
          action: () => navigate('/risks/new'),
          category: 'actions',
          keywords: ['add risk', 'register risk'],
        },
      },
      {
        id: 'action-upload-evidence',
        label: 'Upload Evidence',
        icon: ArrowUpTrayIcon,
        data: {
          action: () => navigate('/evidence/new'),
          category: 'actions',
          keywords: ['add evidence'],
        },
      },
      {
        id: 'action-new-vendor',
        label: 'Add New Vendor',
        icon: PlusIcon,
        data: { action: () => navigate('/vendors/new'), category: 'actions' },
      },
      {
        id: 'action-new-policy',
        label: 'Create New Policy',
        icon: PlusIcon,
        data: { action: () => navigate('/policies/new'), category: 'actions' },
      },

      {
        id: 'settings-profile',
        label: 'Profile Settings',
        icon: Cog6ToothIcon,
        data: { action: () => navigate('/settings'), category: 'settings' },
      },
      {
        id: 'settings-notifications',
        label: 'Notification Settings',
        icon: BellIcon,
        data: { action: () => navigate('/notification-settings'), category: 'settings' },
      },
      {
        id: 'settings-permissions',
        label: 'Permission Groups',
        icon: UserGroupIcon,
        data: { action: () => navigate('/permission-groups'), category: 'settings' },
      },
    ],
    [navigate]
  );

  const searchItems: Item[] = useMemo(() => {
    if (!searchResults) return [];

    const items: Item[] = [];

    searchResults.controls?.forEach((control: any) => {
      items.push({
        id: `control-${control.id}`,
        label: control.title,
        description: control.controlId,
        icon: ShieldCheckIcon,
        data: { action: () => navigate(`/controls/${control.id}`), category: 'search' },
      });
    });

    searchResults.policies?.forEach((policy: any) => {
      items.push({
        id: `policy-${policy.id}`,
        label: policy.title,
        description: policy.status,
        icon: DocumentTextIcon,
        data: { action: () => navigate(`/policies/${policy.id}`), category: 'search' },
      });
    });

    searchResults.risks?.forEach((risk: any) => {
      items.push({
        id: `risk-${risk.id}`,
        label: risk.title,
        description: risk.riskLevel,
        icon: ExclamationTriangleIcon,
        data: { action: () => navigate(`/risks/${risk.id}`), category: 'search' },
      });
    });

    searchResults.vendors?.forEach((vendor: any) => {
      items.push({
        id: `vendor-${vendor.id}`,
        label: vendor.name,
        description: vendor.tier ? `Tier ${vendor.tier}` : undefined,
        icon: BuildingOfficeIcon,
        data: { action: () => navigate(`/vendors/${vendor.id}`), category: 'search' },
      });
    });

    return items;
  }, [searchResults, navigate]);

  const filteredCommands = useMemo(() => {
    const lowerQuery = query.toLowerCase();

    if (query.length >= 2) {
      const filtered = baseCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(lowerQuery) ||
          cmd.data.keywords?.some((k) => k.toLowerCase().includes(lowerQuery))
      );
      return [...searchItems, ...filtered];
    }

    if (!query) return baseCommands;

    return baseCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.data.keywords?.some((k) => k.toLowerCase().includes(lowerQuery))
    );
  }, [query, baseCommands, searchItems]);

  const groups: CommandMenuGroup<CommandData>[] = useMemo(() => {
    const categoryOrder: Category[] = ['search', 'navigation', 'actions', 'settings'];
    const labels: Record<Category, string> = {
      search: 'Search Results',
      navigation: 'Navigation',
      actions: 'Actions',
      settings: 'Settings',
    };

    return categoryOrder
      .map((cat) => ({
        id: cat,
        label: labels[cat],
        items: filteredCommands.filter((cmd) => cmd.data.category === cat),
      }))
      .filter((g) => g.items.length > 0);
  }, [filteredCommands]);

  const handleSelect = useCallback(
    (item: { data?: CommandData }) => {
      if (!item.data) return;
      item.data.action();
      onClose();
      setQuery('');
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  return (
    <CommandMenu<CommandData>
      open={isOpen}
      onClose={onClose}
      query={query}
      onQueryChange={setQuery}
      groups={groups}
      onSelect={handleSelect}
      placeholder="Search or type a command..."
      emptyTitle="No results found"
      emptyDescription="Try searching for controls, policies, risks, or use a command"
      footer={
        <>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-800 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-800 rounded">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-800 rounded">↵</kbd>
              select
            </span>
          </div>
          <span>{branding.platformName}</span>
        </>
      }
    />
  );
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}

export default CommandPalette;
