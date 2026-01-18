/**
 * Route configuration with lazy loading for code splitting
 * 
 * Pages are loaded on-demand to reduce initial bundle size.
 * Critical paths (Dashboard, Login) load faster with smaller chunks.
 */

import { lazyLoad } from '@/lib/lazyLoad';
import Loading from '@/components/Loading';
import { Skeleton, SkeletonDashboard, SkeletonForm } from '@/components/Skeleton';

// Loading fallbacks for different sections
const PageLoadingFallback = <Loading />;
const SettingsLoadingFallback = (
  <div className="p-6 space-y-4">
    <Skeleton className="w-[200px] h-8" />
    <SkeletonForm fields={6} />
  </div>
);
const DashboardLoadingFallback = (
  <div className="p-6">
    <SkeletonDashboard />
  </div>
);

// ============================================
// CORE PAGES (prioritized loading)
// ============================================
export const Dashboard = lazyLoad(
  () => import('@/pages/Dashboard'),
  { fallback: DashboardLoadingFallback }
);

export const Login = lazyLoad(
  () => import('@/pages/Login'),
  { fallback: PageLoadingFallback }
);

// ============================================
// COMPLIANCE PAGES
// ============================================
export const Controls = lazyLoad(
  () => import('@/pages/Controls'),
  { fallback: PageLoadingFallback }
);

export const ControlDetail = lazyLoad(
  () => import('@/pages/ControlDetail'),
  { fallback: PageLoadingFallback }
);

export const Frameworks = lazyLoad(
  () => import('@/pages/Frameworks'),
  { fallback: PageLoadingFallback }
);

export const FrameworkDetail = lazyLoad(
  () => import('@/pages/FrameworkDetail'),
  { fallback: PageLoadingFallback }
);

// ============================================
// RISK MANAGEMENT PAGES
// ============================================
export const Risks = lazyLoad(
  () => import('@/pages/Risks'),
  { fallback: PageLoadingFallback }
);

export const RiskDetail = lazyLoad(
  () => import('@/pages/RiskDetail'),
  { fallback: PageLoadingFallback }
);

export const RiskScenarios = lazyLoad(
  () => import('@/pages/RiskScenarios'),
  { fallback: PageLoadingFallback }
);

export const RiskDashboard = lazyLoad(
  () => import('@/pages/RiskDashboard'),
  { fallback: DashboardLoadingFallback }
);

export const RiskHeatmap = lazyLoad(
  () => import('@/pages/RiskHeatmap'),
  { fallback: PageLoadingFallback }
);

export const RiskReports = lazyLoad(
  () => import('@/pages/RiskReports'),
  { fallback: PageLoadingFallback }
);

export const RiskQueue = lazyLoad(
  () => import('@/pages/RiskQueue'),
  { fallback: PageLoadingFallback }
);

export const RiskConfiguration = lazyLoad(
  () => import('@/pages/RiskConfiguration'),
  { fallback: SettingsLoadingFallback }
);

// ============================================
// POLICY PAGES
// ============================================
export const Policies = lazyLoad(
  () => import('@/pages/Policies'),
  { fallback: PageLoadingFallback }
);

export const PolicyDetail = lazyLoad(
  () => import('@/pages/PolicyDetail'),
  { fallback: PageLoadingFallback }
);

// ============================================
// VENDOR MANAGEMENT PAGES
// ============================================
export const Vendors = lazyLoad(
  () => import('@/pages/Vendors'),
  { fallback: PageLoadingFallback }
);

export const VendorDetail = lazyLoad(
  () => import('@/pages/VendorDetail'),
  { fallback: PageLoadingFallback }
);

export const Contracts = lazyLoad(
  () => import('@/pages/Contracts'),
  { fallback: PageLoadingFallback }
);

export const ContractDetail = lazyLoad(
  () => import('@/pages/ContractDetail'),
  { fallback: PageLoadingFallback }
);

// ============================================
// EVIDENCE & AUDIT PAGES
// ============================================
export const Evidence = lazyLoad(
  () => import('@/pages/Evidence'),
  { fallback: PageLoadingFallback }
);

export const EvidenceDetail = lazyLoad(
  () => import('@/pages/EvidenceDetail'),
  { fallback: PageLoadingFallback }
);

export const Audits = lazyLoad(
  () => import('@/pages/Audits'),
  { fallback: PageLoadingFallback }
);

export const AuditFindings = lazyLoad(
  () => import('@/pages/AuditFindings'),
  { fallback: PageLoadingFallback }
);

export const AuditRequests = lazyLoad(
  () => import('@/pages/AuditRequests'),
  { fallback: PageLoadingFallback }
);

export const AuditLog = lazyLoad(
  () => import('@/pages/AuditLog'),
  { fallback: PageLoadingFallback }
);

// ============================================
// ASSET PAGES
// ============================================
export const Assets = lazyLoad(
  () => import('@/pages/Assets'),
  { fallback: PageLoadingFallback }
);

export const AssetDetail = lazyLoad(
  () => import('@/pages/AssetDetail'),
  { fallback: PageLoadingFallback }
);

// ============================================
// EMPLOYEE COMPLIANCE PAGES
// ============================================
export const Employees = lazyLoad(
  () => import('@/pages/Employees'),
  { fallback: PageLoadingFallback }
);

export const EmployeeDetail = lazyLoad(
  () => import('@/pages/EmployeeDetail'),
  { fallback: PageLoadingFallback }
);

export const EmployeeComplianceDashboard = lazyLoad(
  () => import('@/pages/EmployeeComplianceDashboard'),
  { fallback: DashboardLoadingFallback }
);

export const AwarenessTraining = lazyLoad(
  () => import('@/pages/AwarenessTraining'),
  { fallback: PageLoadingFallback }
);

// ============================================
// INTEGRATION PAGES
// ============================================
export const Integrations = lazyLoad(
  () => import('@/pages/Integrations'),
  { fallback: PageLoadingFallback }
);

// ============================================
// TRUST CENTER PAGES
// ============================================
export const TrustCenter = lazyLoad(
  () => import('@/pages/TrustCenter'),
  { fallback: PageLoadingFallback }
);

export const TrustCenterSettings = lazyLoad(
  () => import('@/pages/TrustCenterSettings'),
  { fallback: SettingsLoadingFallback }
);

export const Questionnaires = lazyLoad(
  () => import('@/pages/Questionnaires'),
  { fallback: PageLoadingFallback }
);

export const QuestionnaireDetail = lazyLoad(
  () => import('@/pages/QuestionnaireDetail'),
  { fallback: PageLoadingFallback }
);

export const KnowledgeBase = lazyLoad(
  () => import('@/pages/KnowledgeBase'),
  { fallback: PageLoadingFallback }
);

export const KnowledgeBaseDetail = lazyLoad(
  () => import('@/pages/KnowledgeBaseDetail'),
  { fallback: PageLoadingFallback }
);

// ============================================
// SETTINGS PAGES
// ============================================
// Settings page requires a section prop, so it's imported directly in App.tsx
// This export is provided for compatibility but should use section-specific routes
export const Settings = lazyLoad(
  () => import('@/pages/Settings').then(mod => ({
    default: () => <mod.default section="organization" />
  })),
  { fallback: SettingsLoadingFallback }
);

export const AccountSettings = lazyLoad(
  () => import('@/pages/AccountSettings'),
  { fallback: SettingsLoadingFallback }
);

export const NotificationSettings = lazyLoad(
  () => import('@/pages/NotificationSettings'),
  { fallback: SettingsLoadingFallback }
);

export const UserManagement = lazyLoad(
  () => import('@/pages/UserManagement'),
  { fallback: SettingsLoadingFallback }
);

export const PermissionGroups = lazyLoad(
  () => import('@/pages/PermissionGroups'),
  { fallback: SettingsLoadingFallback }
);

export const ConfigAsCode = lazyLoad(
  () => import('@/pages/ConfigAsCode'),
  { fallback: SettingsLoadingFallback }
);

// ============================================
// DASHBOARD CUSTOMIZATION PAGES
// ============================================
export const CustomDashboards = lazyLoad(
  () => import('@/pages/CustomDashboards'),
  { fallback: DashboardLoadingFallback }
);

// ============================================
// ASSESSMENT PAGES
// ============================================
export const Assessments = lazyLoad(
  () => import('@/pages/Assessments'),
  { fallback: PageLoadingFallback }
);

export const AssessmentDetail = lazyLoad(
  () => import('@/pages/AssessmentDetail'),
  { fallback: PageLoadingFallback }
);

// ============================================
// CALENDAR & REPORTS PAGES
// ============================================
export const ComplianceCalendarPage = lazyLoad(
  () => import('@/pages/ComplianceCalendarPage'),
  { fallback: PageLoadingFallback }
);

export const ScheduledReportsPage = lazyLoad(
  () => import('@/pages/ScheduledReportsPage'),
  { fallback: PageLoadingFallback }
);

// ============================================
// HELP & DOCUMENTATION PAGES
// ============================================
export const HelpCenter = lazyLoad(
  () => import('@/pages/HelpCenter'),
  { fallback: PageLoadingFallback }
);

export const HelpArticle = lazyLoad(
  () => import('@/pages/HelpArticle'),
  { fallback: PageLoadingFallback }
);

export const DeveloperDocs = lazyLoad(
  () => import('@/pages/DeveloperDocs'),
  { fallback: PageLoadingFallback }
);

// ============================================
// BC/DR (BUSINESS CONTINUITY / DISASTER RECOVERY) PAGES
// ============================================
export const BCDRDashboard = lazyLoad(
  () => import('@/pages/BCDRDashboard'),
  { fallback: DashboardLoadingFallback }
);

export const BusinessProcesses = lazyLoad(
  () => import('@/pages/BusinessProcesses'),
  { fallback: PageLoadingFallback }
);

export const BCDRPlans = lazyLoad(
  () => import('@/pages/BCDRPlans'),
  { fallback: PageLoadingFallback }
);

export const DRTests = lazyLoad(
  () => import('@/pages/DRTests'),
  { fallback: PageLoadingFallback }
);

export const Runbooks = lazyLoad(
  () => import('@/pages/Runbooks'),
  { fallback: PageLoadingFallback }
);

export const CommunicationPlans = lazyLoad(
  () => import('@/pages/CommunicationPlans'),
  { fallback: PageLoadingFallback }
);

export const ExerciseTemplates = lazyLoad(
  () => import('@/pages/ExerciseTemplates'),
  { fallback: PageLoadingFallback }
);

export const RecoveryTeams = lazyLoad(
  () => import('@/pages/RecoveryTeams'),
  { fallback: PageLoadingFallback }
);

export const RecoveryTeamDetail = lazyLoad(
  () => import('@/pages/RecoveryTeamDetail'),
  { fallback: PageLoadingFallback }
);

export const BCDRIncidents = lazyLoad(
  () => import('@/pages/BCDRIncidents'),
  { fallback: PageLoadingFallback }
);

export const BCDRIncidentDetail = lazyLoad(
  () => import('@/pages/BCDRIncidentDetail'),
  { fallback: PageLoadingFallback }
);

// ============================================
// AUDITOR PORTAL PAGES (External Access)
// ============================================
export const AuditorLogin = lazyLoad(
  () => import('@/pages/AuditorLogin'),
  { fallback: PageLoadingFallback }
);

export const AuditorPortal = lazyLoad(
  () => import('@/pages/AuditorPortal'),
  { fallback: PageLoadingFallback }
);

// ============================================
// PRELOAD GROUPS
// ============================================

/**
 * Core pages to preload after initial page load
 */
export const corePages = [Dashboard, Controls, Risks, Frameworks];

/**
 * Settings pages to preload when settings section is accessed
 */
export const settingsPages = [Settings, AccountSettings, NotificationSettings, UserManagement];

/**
 * Risk management pages to preload when risk section is accessed
 */
export const riskPages = [Risks, RiskDetail, RiskScenarios, RiskDashboard, RiskHeatmap];

/**
 * Vendor management pages to preload when vendor section is accessed
 */
export const vendorPages = [Vendors, VendorDetail, Contracts, ContractDetail];

/**
 * Audit pages to preload when audit section is accessed
 */
export const auditPages = [Audits, AuditFindings, AuditRequests, Evidence, EvidenceDetail];

/**
 * BC/DR pages to preload when BC/DR section is accessed
 */
export const bcdrPages = [BCDRDashboard, BusinessProcesses, BCDRPlans, DRTests, Runbooks, CommunicationPlans, ExerciseTemplates, RecoveryTeams, BCDRIncidents];

