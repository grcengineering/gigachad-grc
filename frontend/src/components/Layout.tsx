import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  HomeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  FolderIcon,
  CubeIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ClipboardDocumentListIcon,
  LinkIcon,
  UsersIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChartBarIcon,
  QueueListIcon,
  BoltIcon,
  DocumentChartBarIcon,
  AdjustmentsHorizontalIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
  WrenchScrewdriverIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  DocumentCheckIcon,
  DocumentDuplicateIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  GlobeAltIcon,
  LifebuoyIcon,
  FireIcon,
  BeakerIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import NotificationBell from './notifications/NotificationBell';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette, useCommandPalette } from './CommandPalette';
import { KeyboardShortcutsModal, useKeyboardShortcuts } from './KeyboardShortcuts';
import { ErrorBoundary } from './ErrorBoundary';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** When true, this item is active only on an exact path match.
   *  Use for parent routes like /bcdr or /audit where children
   *  (e.g., /bcdr/plans) would otherwise spuriously activate it. */
  exact?: boolean;
}

interface NavSection {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    name: 'Compliance',
    icon: ShieldCheckIcon,
    items: [
      { name: 'Controls', href: '/controls', icon: ShieldCheckIcon, exact: true },
      { name: 'Frameworks', href: '/frameworks', icon: CubeIcon, exact: true },
      { name: 'Framework Library', href: '/framework-library', icon: RectangleStackIcon },
      { name: 'Calendar', href: '/calendar', icon: PresentationChartLineIcon },
      { name: 'Mapping Gaps', href: '/reports/mapping-gaps', icon: ExclamationTriangleIcon },
    ],
  },
  {
    name: 'Data',
    icon: FolderIcon,
    items: [
      { name: 'Evidence', href: '/evidence', icon: FolderIcon },
      { name: 'Policies', href: '/policies', icon: DocumentTextIcon },
      { name: 'Assets', href: '/assets', icon: ServerStackIcon },
      { name: 'Integrations', href: '/integrations', icon: LinkIcon },
    ],
  },
  {
    name: 'Risk Management',
    icon: ExclamationTriangleIcon,
    items: [
      { name: 'Risk Dashboard', href: '/risk-dashboard', icon: PresentationChartLineIcon },
      { name: 'Risk Register', href: '/risks', icon: TableCellsIcon },
      { name: 'My Queue', href: '/risk-queue', icon: QueueListIcon },
      { name: 'Risk Heatmap', href: '/risk-heatmap', icon: ChartBarIcon },
      { name: 'Scenarios', href: '/risk-scenarios', icon: BoltIcon },
      { name: 'Reports', href: '/risk-reports', icon: DocumentChartBarIcon },
    ],
  },
  {
    name: 'Third Party Risk',
    icon: BuildingOfficeIcon,
    items: [
      { name: 'Vendors', href: '/vendors', icon: BuildingOfficeIcon },
      { name: 'Assessments', href: '/assessments', icon: DocumentCheckIcon },
      { name: 'Contracts', href: '/contracts', icon: DocumentDuplicateIcon },
    ],
  },
  {
    name: 'Trust',
    icon: ChatBubbleLeftRightIcon,
    items: [
      { name: 'Questionnaires', href: '/questionnaires', icon: ChatBubbleLeftRightIcon },
      { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpenIcon },
      { name: 'Answer Templates', href: '/answer-templates', icon: DocumentDuplicateIcon },
      { name: 'Trust Center', href: '/trust-center', icon: GlobeAltIcon, exact: true },
      { name: 'Trust Analytics', href: '/trust-analytics', icon: ChartBarIcon },
      { name: 'Trust Center Settings', href: '/trust-center/settings', icon: CogIcon },
    ],
  },
  {
    name: 'Audit',
    icon: ClipboardDocumentListIcon,
    items: [
      { name: 'Audits', href: '/audits', icon: ClipboardDocumentListIcon, exact: true },
      { name: 'Audit Requests', href: '/audit-requests', icon: DocumentTextIcon },
      { name: 'Findings', href: '/audit-findings', icon: ExclamationTriangleIcon },
      { name: 'Templates', href: '/audit-templates', icon: RectangleStackIcon },
      { name: 'Workpapers', href: '/audit-workpapers', icon: DocumentDuplicateIcon },
      { name: 'Test Procedures', href: '/test-procedures', icon: BeakerIcon },
      { name: 'Analytics', href: '/audit-analytics', icon: ChartBarIcon },
      { name: 'Calendar', href: '/audit-calendar', icon: PresentationChartLineIcon },
      { name: 'Auditor Portal', href: '/auditor-portal', icon: UsersIcon },
    ],
  },
  {
    name: 'BC/DR',
    icon: LifebuoyIcon,
    items: [
      { name: 'Dashboard', href: '/bcdr', icon: PresentationChartLineIcon, exact: true },
      { name: 'Plans', href: '/bcdr/plans', icon: DocumentTextIcon },
      { name: 'Business Processes', href: '/bcdr/processes', icon: BuildingOfficeIcon },
      { name: 'DR Tests', href: '/bcdr/tests', icon: BeakerIcon },
      { name: 'Runbooks', href: '/bcdr/runbooks', icon: BookOpenIcon },
      { name: 'Incidents', href: '/bcdr/incidents', icon: FireIcon },
      { name: 'Recovery Teams', href: '/bcdr/recovery-teams', icon: UsersIcon },
      { name: 'Communications', href: '/bcdr/communication', icon: ChatBubbleLeftRightIcon },
      { name: 'Exercise Templates', href: '/bcdr/exercise-templates', icon: RectangleStackIcon },
    ],
  },
  {
    name: 'People',
    icon: UsersIcon,
    items: [
      { name: 'Employees', href: '/people', icon: UsersIcon, exact: true },
      { name: 'My Training', href: '/people/training', icon: AcademicCapIcon },
    ],
  },
  {
    name: 'Tools',
    icon: WrenchScrewdriverIcon,
    items: [
      { name: 'Custom Dashboards', href: '/dashboards', icon: PresentationChartLineIcon },
      { name: 'AI Risk Assistant', href: '/tools/ai-risk-assistant', icon: WrenchScrewdriverIcon },
      { name: 'Report Builder', href: '/reports/builder', icon: DocumentChartBarIcon },
      { name: 'Scheduled Reports', href: '/scheduled-reports', icon: QueueListIcon },
      { name: 'Help Center', href: '/help', icon: BookOpenIcon },
      { name: 'Awareness & Training', href: '/tools/awareness', icon: AcademicCapIcon },
    ],
  },
  {
    name: 'Settings',
    icon: CogIcon,
    items: [
      { name: 'Risk Configuration', href: '/settings/risk', icon: AdjustmentsHorizontalIcon },
      { name: 'TPRM Configuration', href: '/settings/tprm', icon: BuildingOfficeIcon },
      { name: 'Trust Configuration', href: '/settings/trust', icon: GlobeAltIcon },
      { name: 'Employee Compliance', href: '/settings/employee-compliance', icon: ShieldCheckIcon },
      { name: 'Training Admin', href: '/settings/training', icon: AcademicCapIcon },
      { name: 'Config as Code', href: '/settings/config-as-code', icon: DocumentTextIcon },
      { name: 'MCP', href: '/settings/mcp', icon: LinkIcon },
      { name: 'Workspaces', href: '/settings/workspaces', icon: RectangleStackIcon },
      { name: 'Users', href: '/users', icon: UsersIcon },
      { name: 'Permissions', href: '/permissions', icon: KeyIcon },
      { name: 'Audit Log', href: '/audit', icon: ClipboardDocumentListIcon, exact: true },
      { name: 'Account', href: '/account', icon: UsersIcon },
      { name: 'Developer Docs', href: '/docs', icon: BookOpenIcon },
    ],
  },
];

const SECTION_STATE_KEY = 'gc-sidebar-sections';

function loadSectionState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SECTION_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSectionState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function NavSectionComponent({
  section,
  initialOpen,
  onToggle,
}: {
  section: NavSection;
  initialOpen: boolean;
  onToggle: (open: boolean) => void;
}) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(initialOpen);

  const isItemActive = (item: NavItem) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(item.href + '/');

  const hasActiveItem = section.items.some(isItemActive);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle(next);
  };

  return (
    <div className="space-y-1">
      <button
        onClick={toggle}
        className={clsx(
          'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium transition-colors',
          hasActiveItem
            ? 'text-brand-700'
            : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
        )}
      >
        <div className="flex items-center gap-3">
          <section.icon className="w-5 h-5" />
          {section.name}
        </div>
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <ChevronRightIcon className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="ml-4 pl-4 border-l border-surface-200 space-y-1">
          {section.items.map((item) => {
            const isActive = isItemActive(item);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-brand-600/20 text-brand-700 font-medium'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sectionState, setSectionState] = useState<Record<string, boolean>>(() => loadSectionState());
  const palette = useCommandPalette();
  const shortcuts = useKeyboardShortcuts();

  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';

  // Persist section open/close state
  useEffect(() => {
    saveSectionState(sectionState);
  }, [sectionState]);

  const initialOpenFor = (section: NavSection): boolean => {
    if (section.name in sectionState) return sectionState[section.name];
    // First visit: auto-open if any item matches the current route
    return section.items.some((item) => location.pathname.startsWith(item.href));
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
      <KeyboardShortcutsModal open={shortcuts.open} onClose={() => shortcuts.setOpen(false)} />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-white/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b border-surface-200">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-md" />
            <span className="text-lg font-semibold text-surface-900">GigaChad GRC</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {/* Dashboard - Top Level */}
            <NavLink
              to="/dashboard"
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isDashboardActive
                  ? 'bg-brand-600/20 text-brand-700'
                  : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <HomeIcon className="w-5 h-5" />
              Dashboard
            </NavLink>

            <div className="h-px bg-surface-100 my-2" />

            {navSections.map((section) => (
              <NavSectionComponent
                key={section.name}
                section={section}
                initialOpen={initialOpenFor(section)}
                onToggle={(open) =>
                  setSectionState((prev) => ({ ...prev, [section.name]: open }))
                }
              />
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-surface-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center">
                <span className="text-sm font-medium text-surface-700">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">{user?.name}</p>
                <p className="text-xs text-surface-500 truncate capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-md transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-[60] bg-white">
          <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6 border-b border-surface-200">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden p-2 -ml-2 text-surface-600 hover:text-surface-900"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <Breadcrumbs />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Command palette trigger */}
              <button
                onClick={() => palette.setOpen(true)}
                className="hidden md:inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-md border border-surface-300 bg-white text-small text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
                aria-label="Open command palette"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
                <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-surface-300 bg-surface-100 px-1 text-[10px] font-mono text-surface-500">
                  <span>⌘</span>
                  <span>K</span>
                </kbd>
              </button>
              <button
                onClick={() => palette.setOpen(true)}
                className="md:hidden p-2 text-surface-600 hover:text-surface-900"
                aria-label="Open search"
              >
                <Search className="h-5 w-5" />
              </button>

              <NotificationBell />

              <NavLink
                to="/settings"
                className="p-2 text-surface-600 hover:text-surface-900"
              >
                <CogIcon className="w-5 h-5" />
              </NavLink>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
