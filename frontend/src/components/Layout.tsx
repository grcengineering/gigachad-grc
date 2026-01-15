import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingConfig } from '@/contexts/BrandingContext';
import { useModules } from '@/contexts/ModuleContext';
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
  UserGroupIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
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
  CalendarDaysIcon,
  ClockIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  ShieldExclamationIcon,
  BeakerIcon,
  MegaphoneIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import NotificationBell from './notifications/NotificationBell';
import GlobalSearch from './GlobalSearch';
import { CommandPalette, useCommandPalette } from './CommandPalette';
import { KeyboardShortcutsModal, useKeyboardShortcuts } from './KeyboardShortcuts';
import { OnboardingTour, useOnboarding } from './OnboardingTour';
import WorkspaceSwitcher from './WorkspaceSwitcher';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
      { name: 'Controls', href: '/controls', icon: ShieldCheckIcon },
      { name: 'Frameworks', href: '/frameworks', icon: CubeIcon },
      { name: 'Framework Library', href: '/framework-library', icon: BookOpenIcon },
      { name: 'Calendar', href: '/calendar', icon: CalendarDaysIcon },
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
    name: 'People',
    icon: UsersIcon,
    items: [
      { name: 'Employee Compliance', href: '/people', icon: UsersIcon },
      { name: 'Compliance Dashboard', href: '/people/dashboard', icon: ChartBarIcon },
      { name: 'Training Dashboard', href: '/people/training', icon: AcademicCapIcon },
      { name: 'Awareness & Training', href: '/tools/awareness', icon: AcademicCapIcon },
    ],
  },
  {
    name: 'Trust',
    icon: ChatBubbleLeftRightIcon,
    items: [
      { name: 'Questionnaires', href: '/questionnaires', icon: ChatBubbleLeftRightIcon },
      { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpenIcon },
      { name: 'Answer Templates', href: '/answer-templates', icon: DocumentDuplicateIcon },
      { name: 'Trust Analytics', href: '/trust-analytics', icon: ChartBarIcon },
      { name: 'Trust Center', href: '/trust-center', icon: GlobeAltIcon },
      { name: 'Trust Center Settings', href: '/trust-center/settings', icon: CogIcon },
    ],
  },
  {
    name: 'Audit',
    icon: ClipboardDocumentListIcon,
    items: [
      { name: 'Audits', href: '/audits', icon: ClipboardDocumentListIcon },
      { name: 'Audit Requests', href: '/audit-requests', icon: DocumentTextIcon },
      { name: 'Findings', href: '/audit-findings', icon: ExclamationTriangleIcon },
      { name: 'Templates', href: '/audit-templates', icon: DocumentDuplicateIcon },
      { name: 'Workpapers', href: '/audit-workpapers', icon: DocumentTextIcon },
      { name: 'Test Procedures', href: '/test-procedures', icon: BeakerIcon },
      { name: 'Analytics', href: '/audit-analytics', icon: ChartBarIcon },
      { name: 'Calendar', href: '/audit-calendar', icon: CalendarDaysIcon },
    ],
  },
  {
    name: 'BC/DR',
    icon: ShieldExclamationIcon,
    items: [
      { name: 'BC/DR Dashboard', href: '/bcdr', icon: ChartBarIcon },
      { name: 'Business Processes', href: '/bcdr/processes', icon: ShieldExclamationIcon },
      { name: 'BC/DR Plans', href: '/bcdr/plans', icon: DocumentTextIcon },
      { name: 'DR Tests', href: '/bcdr/tests', icon: BeakerIcon },
      { name: 'Runbooks', href: '/bcdr/runbooks', icon: BookOpenIcon },
      { name: 'Communication Plans', href: '/bcdr/communication', icon: MegaphoneIcon },
    ],
  },
  {
    name: 'Tools',
    icon: WrenchScrewdriverIcon,
    items: [
      { name: 'Scheduled Reports', href: '/scheduled-reports', icon: ClockIcon },
      { name: 'Dashboard Templates', href: '/settings/dashboard-templates', icon: Squares2X2Icon },
      { name: 'Audit Log', href: '/audit', icon: ClipboardDocumentListIcon },
    ],
  },
  {
    name: 'Configuration',
    icon: AdjustmentsHorizontalIcon,
    items: [
      { name: 'Risk Configuration', href: '/settings/risk', icon: ExclamationTriangleIcon },
      { name: 'TPRM Configuration', href: '/settings/tprm', icon: BuildingOfficeIcon },
      { name: 'Trust Configuration', href: '/settings/trust', icon: ChatBubbleLeftRightIcon },
      { name: 'Training Configuration', href: '/settings/training', icon: AcademicCapIcon },
      { name: 'Employee Compliance Configuration', href: '/settings/employee-compliance', icon: UserGroupIcon },
      { name: 'Module Configuration', href: '/settings/modules', icon: CubeIcon },
      { name: 'Configuration as Code', href: '/settings/config-as-code', icon: CodeBracketIcon },
    ],
  },
  {
    name: 'Settings',
    icon: CogIcon,
    items: [
      { name: 'Organization', href: '/settings/organization', icon: BuildingOfficeIcon },
      { name: 'Users', href: '/users', icon: UsersIcon },
      { name: 'Permissions', href: '/permissions', icon: KeyIcon },
      { name: 'Communications', href: '/settings/communications', icon: ChatBubbleLeftRightIcon },
      { name: 'API Keys', href: '/settings/api-keys', icon: LinkIcon },
      { name: 'AI Configuration', href: '/settings/ai', icon: BoltIcon },
      { name: 'MCP Servers', href: '/settings/mcp', icon: CommandLineIcon },
      { name: 'Workspaces', href: '/settings/workspaces', icon: BuildingOfficeIcon },
    ],
  },
];

// Helper function to check if a nav item matches the current path
function isNavItemMatch(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

// Find the most specific matching nav item (longest href that matches)
function findActiveNavItem(pathname: string, items: NavItem[]): string | null {
  let bestMatch: string | null = null;
  let bestMatchLength = 0;
  
  for (const item of items) {
    if (isNavItemMatch(pathname, item.href) && item.href.length > bestMatchLength) {
      bestMatch = item.href;
      bestMatchLength = item.href.length;
    }
  }
  
  return bestMatch;
}

function NavSectionComponent({ section }: { section: NavSection }) {
  const location = useLocation();
  const { isRouteEnabled } = useModules();
  
  // Filter items based on module enablement
  const filteredItems = section.items.filter((item) => {
    // Check if route is enabled (this handles module-based filtering)
    return isRouteEnabled(item.href);
  });
  
  const activeItemHref = findActiveNavItem(location.pathname, filteredItems);
  
  const [isOpen, setIsOpen] = useState(() => {
    // Auto-expand section if current path matches any item
    return activeItemHref !== null;
  });

  const hasActiveItem = activeItemHref !== null;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300',
          hasActiveItem
            ? 'text-brand-400'
            : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
        )}
      >
        <div className="flex items-center gap-3">
          <section.icon className="w-5 h-5" />
          {section.name}
        </div>
        <ChevronRightIcon 
          className={clsx(
            'w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
            isOpen && 'rotate-90'
          )} 
        />
      </button>

      <div
        className="ml-4 pl-4 border-l border-surface-800 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div 
            className="space-y-1 py-1"
            style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
              transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {filteredItems.map((item, index) => {
              const isActive = item.href === activeItemHref;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                    isActive
                      ? 'bg-brand-600/20 text-brand-400 font-medium'
                      : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
                  )}
                  style={{
                    transitionDelay: isOpen ? `${index * 30}ms` : '0ms',
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const branding = useBrandingConfig();
  const { isNavSectionEnabled } = useModules();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Command palette
  const commandPalette = useCommandPalette();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onShowShortcuts: () => setShowShortcuts(true),
  });

  // Onboarding tour
  const onboarding = useOnboarding();

  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 border-r border-surface-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-800">
            <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            <span className="text-lg font-semibold text-surface-100">{branding.platformName}</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {/* Dashboard - Top Level */}
            <NavLink
              to="/dashboard"
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isDashboardActive
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <HomeIcon className="w-5 h-5" />
              Dashboard
            </NavLink>

            {/* Custom Dashboards Link */}
            <NavLink
              to="/dashboards"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                  isActive
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Squares2X2Icon className="w-4 h-4" />
              Custom Dashboards
            </NavLink>

            {/* Divider */}
            <div className="h-px bg-surface-800 my-2" />

            {/* Collapsible Sections */}
            {navSections
              .filter((section) => {
                // Settings and Configuration sections are admin-only
                if (section.name === 'Settings' || section.name === 'Configuration') {
                  return user?.role === 'admin' || user?.role === 'super_admin';
                }
                // Check if section's module is enabled
                if (!isNavSectionEnabled(section.name)) {
                  return false;
                }
                return true;
              })
              .map((section) => (
                <NavSectionComponent key={section.name} section={section} />
              ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-surface-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center">
                <span className="text-sm font-medium text-surface-300">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-100 truncate">{user?.name}</p>
                <p className="text-xs text-surface-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
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
        <header className="sticky top-0 z-[60] bg-surface-900/80 backdrop-blur-sm border-b border-surface-800">
          <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-2">
              <button
                className="lg:hidden p-2 -ml-2 text-surface-400 hover:text-surface-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              <NotificationBell />

              {/* Workspace Switcher (only shown when multi-workspace is enabled) */}
              <WorkspaceSwitcher />

              {/* Keyboard Shortcuts Button */}
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
                title="Keyboard Shortcuts (⌘/)"
              >
                <CommandLineIcon className="w-5 h-5" />
              </button>

              {/* Help Center Link */}
              <NavLink
                to="/help"
                className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
                title="Help Center"
              >
                <QuestionMarkCircleIcon className="w-5 h-5" />
              </NavLink>

              <NavLink
                to="/account"
                className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
                title="Account Settings"
              >
                <CogIcon className="w-5 h-5" />
              </NavLink>
            </div>

            {/* Global Search - Far Right */}
            <GlobalSearch />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={onboarding.showTour}
        onClose={onboarding.closeTour}
        onComplete={onboarding.completeTour}
      />
    </div>
  );
}
