import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
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
import clsx from 'clsx';

interface CommandItem {
  id: string;
  name: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: 'navigation' | 'actions' | 'search' | 'settings';
  keywords?: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const branding = useBrandingConfig();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Search for entities when query has 2+ characters
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

  // Base commands
  const baseCommands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        name: 'Go to Dashboard',
        icon: HomeIcon,
        action: () => navigate('/'),
        category: 'navigation',
        keywords: ['home'],
      },
      {
        id: 'nav-controls',
        name: 'Go to Controls',
        icon: ShieldCheckIcon,
        action: () => navigate('/controls'),
        category: 'navigation',
      },
      {
        id: 'nav-risks',
        name: 'Go to Risks',
        icon: ExclamationTriangleIcon,
        action: () => navigate('/risks'),
        category: 'navigation',
      },
      {
        id: 'nav-policies',
        name: 'Go to Policies',
        icon: DocumentTextIcon,
        action: () => navigate('/policies'),
        category: 'navigation',
      },
      {
        id: 'nav-evidence',
        name: 'Go to Evidence',
        icon: FolderOpenIcon,
        action: () => navigate('/evidence'),
        category: 'navigation',
      },
      {
        id: 'nav-vendors',
        name: 'Go to Vendors',
        icon: BuildingOfficeIcon,
        action: () => navigate('/vendors'),
        category: 'navigation',
        keywords: ['tprm', 'third party'],
      },
      {
        id: 'nav-frameworks',
        name: 'Go to Frameworks',
        icon: ChartBarIcon,
        action: () => navigate('/frameworks'),
        category: 'navigation',
        keywords: ['compliance', 'soc2', 'iso'],
      },
      {
        id: 'nav-audits',
        name: 'Go to Audits',
        icon: ClipboardDocumentCheckIcon,
        action: () => navigate('/audits'),
        category: 'navigation',
      },
      {
        id: 'nav-calendar',
        name: 'Go to Calendar',
        icon: CalendarDaysIcon,
        action: () => navigate('/compliance-calendar'),
        category: 'navigation',
        keywords: ['schedule', 'events'],
      },
      {
        id: 'nav-reports',
        name: 'Go to Risk Reports',
        icon: ChartBarIcon,
        action: () => navigate('/risk-reports'),
        category: 'navigation',
      },
      {
        id: 'nav-training',
        name: 'Go to Training',
        icon: AcademicCapIcon,
        action: () => navigate('/tools/awareness'),
        category: 'navigation',
        keywords: ['security awareness'],
      },
      {
        id: 'nav-users',
        name: 'Go to Users',
        icon: UserGroupIcon,
        action: () => navigate('/users'),
        category: 'navigation',
      },

      // Actions
      {
        id: 'action-new-control',
        name: 'Create New Control',
        icon: PlusIcon,
        action: () => navigate('/controls/new'),
        category: 'actions',
        keywords: ['add control'],
      },
      {
        id: 'action-new-risk',
        name: 'Create New Risk',
        icon: PlusIcon,
        action: () => navigate('/risks/new'),
        category: 'actions',
        keywords: ['add risk', 'register risk'],
      },
      {
        id: 'action-upload-evidence',
        name: 'Upload Evidence',
        icon: ArrowUpTrayIcon,
        action: () => navigate('/evidence/new'),
        category: 'actions',
        keywords: ['add evidence'],
      },
      {
        id: 'action-new-vendor',
        name: 'Add New Vendor',
        icon: PlusIcon,
        action: () => navigate('/vendors/new'),
        category: 'actions',
      },
      {
        id: 'action-new-policy',
        name: 'Create New Policy',
        icon: PlusIcon,
        action: () => navigate('/policies/new'),
        category: 'actions',
      },

      // Settings
      {
        id: 'settings-profile',
        name: 'Profile Settings',
        icon: Cog6ToothIcon,
        action: () => navigate('/settings'),
        category: 'settings',
      },
      {
        id: 'settings-notifications',
        name: 'Notification Settings',
        icon: BellIcon,
        action: () => navigate('/notification-settings'),
        category: 'settings',
      },
      {
        id: 'settings-permissions',
        name: 'Permission Groups',
        icon: UserGroupIcon,
        action: () => navigate('/permission-groups'),
        category: 'settings',
      },
    ],
    [navigate]
  );

  // Build search result commands
  const searchCommands: CommandItem[] = useMemo(() => {
    if (!searchResults) return [];

    const commands: CommandItem[] = [];

    searchResults.controls?.forEach((control: any) => {
      commands.push({
        id: `control-${control.id}`,
        name: control.title,
        description: control.controlId,
        icon: ShieldCheckIcon,
        action: () => navigate(`/controls/${control.id}`),
        category: 'search',
      });
    });

    searchResults.policies?.forEach((policy: any) => {
      commands.push({
        id: `policy-${policy.id}`,
        name: policy.title,
        description: policy.status,
        icon: DocumentTextIcon,
        action: () => navigate(`/policies/${policy.id}`),
        category: 'search',
      });
    });

    searchResults.risks?.forEach((risk: any) => {
      commands.push({
        id: `risk-${risk.id}`,
        name: risk.title,
        description: risk.riskLevel,
        icon: ExclamationTriangleIcon,
        action: () => navigate(`/risks/${risk.id}`),
        category: 'search',
      });
    });

    searchResults.vendors?.forEach((vendor: any) => {
      commands.push({
        id: `vendor-${vendor.id}`,
        name: vendor.name,
        description: vendor.tier ? `Tier ${vendor.tier}` : undefined,
        icon: BuildingOfficeIcon,
        action: () => navigate(`/vendors/${vendor.id}`),
        category: 'search',
      });
    });

    return commands;
  }, [searchResults, navigate]);

  // Filter and combine commands
  const filteredCommands = useMemo(() => {
    const lowerQuery = query.toLowerCase();

    // If there's a search query, prioritize search results
    if (query.length >= 2) {
      const filtered = baseCommands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(lowerQuery) ||
          cmd.keywords?.some((k) => k.toLowerCase().includes(lowerQuery))
      );
      return [...searchCommands, ...filtered];
    }

    // Otherwise show all base commands
    if (!query) return baseCommands;

    return baseCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.keywords?.some((k) => k.toLowerCase().includes(lowerQuery))
    );
  }, [query, baseCommands, searchCommands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};

    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  const categoryLabels: Record<string, string> = {
    search: 'Search Results',
    navigation: 'Navigation',
    actions: 'Actions',
    settings: 'Settings',
  };

  // Handle command selection
  const handleSelect = useCallback(
    (command: CommandItem | null) => {
      if (command) {
        command.action();
        onClose();
        setQuery('');
      }
    },
    [onClose]
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform overflow-hidden rounded-xl bg-white border border-surface-200 shadow-2xl transition-all dark:bg-surface-900">
              <Combobox onChange={handleSelect}>
                {/* Search Input */}
                <div className="relative">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-surface-600"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    ref={inputRef}
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-white placeholder:text-surface-500 focus:ring-0 text-base"
                    placeholder="Search or type a command..."
                    onChange={(e) => setQuery(e.target.value)}
                    value={query}
                  />
                  <div className="absolute right-4 top-3 text-xs text-surface-500 hidden sm:flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-200 rounded text-surface-600">Esc</kbd>
                    <span>to close</span>
                  </div>
                </div>

                {/* Results */}
                {filteredCommands.length > 0 && (
                  <Combobox.Options
                    static
                    className="max-h-96 scroll-py-2 overflow-y-auto border-t border-surface-200"
                  >
                    {Object.entries(groupedCommands).map(([category, commands]) => (
                      <div key={category}>
                        <div className="px-4 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider bg-white/50 dark:bg-surface-900/50">
                          {categoryLabels[category] || category}
                        </div>
                        {commands.map((command) => (
                          <Combobox.Option
                            key={command.id}
                            value={command}
                            className={({ active }) =>
                              clsx(
                                'flex items-center gap-3 px-4 py-3 cursor-pointer',
                                active ? 'bg-surface-200' : ''
                              )
                            }
                          >
                            {({ active }) => (
                              <>
                                <command.icon
                                  className={clsx(
                                    'w-5 h-5 flex-shrink-0',
                                    active ? 'text-brand-400' : 'text-surface-600'
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={clsx(
                                      'text-sm font-medium truncate',
                                      active ? 'text-white' : 'text-surface-800'
                                    )}
                                  >
                                    {command.name}
                                  </p>
                                  {command.description && (
                                    <p className="text-xs text-surface-500 truncate">
                                      {command.description}
                                    </p>
                                  )}
                                </div>
                                {command.shortcut && (
                                  <kbd className="px-2 py-1 text-xs bg-surface-200 rounded text-surface-600">
                                    {command.shortcut}
                                  </kbd>
                                )}
                              </>
                            )}
                          </Combobox.Option>
                        ))}
                      </div>
                    ))}
                  </Combobox.Options>
                )}

                {/* Empty state */}
                {query && filteredCommands.length === 0 && (
                  <div className="px-6 py-14 text-center border-t border-surface-200">
                    <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-surface-500" />
                    <p className="mt-4 text-sm text-surface-600">No results found for "{query}"</p>
                    <p className="mt-2 text-xs text-surface-500">
                      Try searching for controls, policies, risks, or use a command
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-surface-200 px-4 py-2 text-xs text-surface-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-surface-200 rounded">↑</kbd>
                      <kbd className="px-1.5 py-0.5 bg-surface-200 rounded">↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-surface-200 rounded">↵</kbd>
                      select
                    </span>
                  </div>
                  <span>{branding.platformName}</span>
                </div>
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// Hook to manage command palette state
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
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
