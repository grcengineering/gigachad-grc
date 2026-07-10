import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  controls: 'Controls',
  frameworks: 'Frameworks',
  evidence: 'Evidence',
  policies: 'Policies',
  risks: 'Risks',
  'risk-dashboard': 'Risk Dashboard',
  'risk-queue': 'My Queue',
  'risk-heatmap': 'Risk Heatmap',
  'risk-scenarios': 'Risk Scenarios',
  'risk-reports': 'Risk Reports',
  vendors: 'Vendors',
  assessments: 'Assessments',
  contracts: 'Contracts',
  questionnaires: 'Questionnaires',
  'knowledge-base': 'Knowledge Base',
  'trust-center': 'Trust Center',
  audits: 'Audits',
  'audit-requests': 'Audit Requests',
  'audit-findings': 'Findings',
  audit: 'Audit Log',
  assets: 'Assets',
  integrations: 'Integrations',
  settings: 'Settings',
  users: 'Users',
  permissions: 'Permissions',
  tools: 'Tools',
  awareness: 'Awareness & Training',
  notifications: 'Notifications',
  risk: 'Risk Configuration',
  'design-system': 'Design System',
};

function labelFor(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  // ID-looking segments (uuid, numeric, short hash) get a generic label
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment) || /^\d+$/.test(segment)) {
    return 'Detail';
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-xs text-surface-500 min-w-0"
    >
      <Link to="/dashboard" className="hover:text-surface-700 transition-colors">
        Home
      </Link>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const path = '/' + segments.slice(0, i + 1).join('/');
        return (
          <span key={path} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="h-3 w-3 text-surface-500 shrink-0" />
            {isLast ? (
              <span className="text-surface-700 truncate">{labelFor(seg)}</span>
            ) : (
              <Link to={path} className="hover:text-surface-700 transition-colors truncate">
                {labelFor(seg)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
