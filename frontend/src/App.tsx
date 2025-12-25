import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Loading from './components/Loading';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Controls = lazy(() => import('./pages/Controls'));
const ControlNew = lazy(() => import('./pages/ControlNew'));
const ControlDetail = lazy(() => import('./pages/ControlDetail'));
const Evidence = lazy(() => import('./pages/Evidence'));
const EvidenceDetail = lazy(() => import('./pages/EvidenceDetail'));
const Frameworks = lazy(() => import('./pages/Frameworks'));
const FrameworkDetail = lazy(() => import('./pages/FrameworkDetail'));
const FrameworkLibrary = lazy(() => import('./pages/FrameworkLibrary'));
const Policies = lazy(() => import('./pages/Policies'));
const PolicyDetail = lazy(() => import('./pages/PolicyDetail'));
const Risks = lazy(() => import('./pages/Risks'));
const RiskDetail = lazy(() => import('./pages/RiskDetail'));
const RiskHeatmap = lazy(() => import('./pages/RiskHeatmap'));
const RiskDashboard = lazy(() => import('./pages/RiskDashboard'));
const RiskQueue = lazy(() => import('./pages/RiskQueue'));
const RiskScenarios = lazy(() => import('./pages/RiskScenarios'));
const RiskReports = lazy(() => import('./pages/RiskReports'));
const RiskConfiguration = lazy(() => import('./pages/RiskConfiguration'));
const TPRMConfiguration = lazy(() => import('./pages/TPRMConfiguration'));
const TrustConfiguration = lazy(() => import('./pages/TrustConfiguration'));
const AnswerTemplates = lazy(() => import('./pages/AnswerTemplates'));
const TrustAnalytics = lazy(() => import('./pages/TrustAnalytics'));
const AwarenessTraining = lazy(() => import('./pages/AwarenessTraining'));
// SecurityAwarenessTraining is combined into AwarenessTraining
const Assets = lazy(() => import('./pages/Assets'));
const AssetDetail = lazy(() => import('./pages/AssetDetail'));
const Integrations = lazy(() => import('./pages/Integrations'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Settings = lazy(() => import('./pages/Settings'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const PermissionGroups = lazy(() => import('./pages/PermissionGroups'));
const Vendors = lazy(() => import('./pages/Vendors'));
const VendorDetail = lazy(() => import('./pages/VendorDetail'));
const Assessments = lazy(() => import('./pages/Assessments'));
const AssessmentDetail = lazy(() => import('./pages/AssessmentDetail'));
const Contracts = lazy(() => import('./pages/Contracts'));
const ContractDetail = lazy(() => import('./pages/ContractDetail'));
const Questionnaires = lazy(() => import('./pages/Questionnaires'));
const QuestionnaireDetail = lazy(() => import('./pages/QuestionnaireDetail'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const KnowledgeBaseDetail = lazy(() => import('./pages/KnowledgeBaseDetail'));
const TrustCenter = lazy(() => import('./pages/TrustCenter'));
const TrustCenterSettings = lazy(() => import('./pages/TrustCenterSettings'));
const Audits = lazy(() => import('./pages/Audits'));
// AuditDetail will be combined into Audits detail view
const AuditRequests = lazy(() => import('./pages/AuditRequests'));
const AuditFindings = lazy(() => import('./pages/AuditFindings'));
const AuditTemplates = lazy(() => import('./pages/AuditTemplates'));
const AuditWorkpapers = lazy(() => import('./pages/AuditWorkpapers'));
const AuditAnalytics = lazy(() => import('./pages/AuditAnalytics'));
const AuditCalendar = lazy(() => import('./pages/AuditCalendar'));
const TestProcedures = lazy(() => import('./pages/TestProcedures'));
const ComplianceCalendarPage = lazy(() => import('./pages/ComplianceCalendarPage'));
const ScheduledReportsPage = lazy(() => import('./pages/ScheduledReportsPage'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const HelpArticle = lazy(() => import('./pages/HelpArticle'));
const DeveloperDocs = lazy(() => import('./pages/DeveloperDocs'));
const Employees = lazy(() => import('./pages/Employees'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'));
const EmployeeComplianceDashboard = lazy(() => import('./pages/EmployeeComplianceDashboard'));
const CustomDashboards = lazy(() => import('./pages/CustomDashboards'));
const MCPSettings = lazy(() => import('./pages/MCPSettings'));
const WorkspaceList = lazy(() => import('./pages/WorkspaceList'));
const WorkspaceSettings = lazy(() => import('./pages/WorkspaceSettings'));
const Login = lazy(() => import('./pages/Login'));
const AIRiskAssistant = lazy(() => import('./pages/AIRiskAssistant'));
const ConfigAsCode = lazy(() => import('./pages/ConfigAsCode'));

// BC/DR Pages
const BCDRDashboard = lazy(() => import('./pages/BCDRDashboard'));
const BusinessProcesses = lazy(() => import('./pages/BusinessProcesses'));
const BusinessProcessDetail = lazy(() => import('./pages/BusinessProcessDetail'));
const BCDRPlans = lazy(() => import('./pages/BCDRPlans'));
const BCDRPlanDetail = lazy(() => import('./pages/BCDRPlanDetail'));
const DRTests = lazy(() => import('./pages/DRTests'));
const DRTestDetail = lazy(() => import('./pages/DRTestDetail'));
const Runbooks = lazy(() => import('./pages/Runbooks'));
const CommunicationPlans = lazy(() => import('./pages/CommunicationPlans'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Check if this is an OAuth callback (has code/state/error in URL or hash)
  // Note: access_token in hash is handled by AuthContext, so we don't check for it here
  const searchParams = new URLSearchParams(location.search);
  // Only check hash if it has content (not just # or empty)
  const hash = location.hash.substring(1);
  const hashParams = hash ? new URLSearchParams(hash) : null;
  
  // Don't consider access_token as a callback that needs waiting - AuthContext handles it
  const hasAuthCallback = 
    searchParams.has('code') || 
    searchParams.has('error') || 
    searchParams.has('session_state') ||
    (hashParams && (hashParams.has('state') || hashParams.has('code') || hashParams.has('error')) && !hashParams.has('access_token'));

  // Prevent redirect loops
  const isOnLogin = location.pathname === '/login';

  if (isLoading || hasAuthCallback) {
    // Still processing auth - show loading
    return <Loading />;
  }

  if (!isAuthenticated && !isOnLogin) {
    return <Navigate to="/login" replace />;
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// Module route guard - checks if current route's module is enabled
const DisabledModulePage = lazy(() => import('./pages/DisabledModulePage'));

// Import module context for route checking
import { useModules, ModuleId } from './contexts/ModuleContext';

interface ModuleRouteProps {
  children: React.ReactNode;
  module: ModuleId;
}

function ModuleRoute({ children, module }: ModuleRouteProps) {
  const { isModuleEnabled } = useModules();
  
  if (!isModuleEnabled(module)) {
    return (
      <Suspense fallback={<PageLoader />}>
        <DisabledModulePage moduleId={module} />
      </Suspense>
    );
  }
  
  return <>{children}</>;
}

// Root redirect component that waits for auth
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Check for OAuth callback params in both query string and hash
  const searchParams = new URLSearchParams(location.search);
  // Only check hash if it has content (not just # or empty)
  const hash = location.hash.substring(1);
  const hashParams = hash ? new URLSearchParams(hash) : null;
  const hasAuthCallback = 
    searchParams.has('code') || 
    searchParams.has('session_state') ||
    (hashParams && (hashParams.has('state') || hashParams.has('code') || hashParams.has('error')));

  // Prevent redirect loops by checking current path
  const currentPath = location.pathname;
  const isOnLogin = currentPath === '/login';
  const isOnDashboard = currentPath === '/dashboard';

  if (isLoading || hasAuthCallback) {
    return <Loading />;
  }

  // Only redirect if we're actually on the root path
  if (currentPath !== '/' && currentPath !== '') {
    return null; // Don't redirect if already on a specific path
  }

  if (isAuthenticated && !isOnDashboard) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isAuthenticated && !isOnLogin) {
    return <Navigate to="/login" replace />;
  }

  // If already on the correct page, don't redirect
  return null;
}

// Page loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootRedirect />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          {/* Tools Module */}
          <Route path="dashboards" element={<ModuleRoute module="tools"><Suspense fallback={<PageLoader />}><CustomDashboards /></Suspense></ModuleRoute>} />
          {/* Compliance Module */}
          <Route path="controls" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><Controls /></Suspense></ModuleRoute>} />
          <Route path="controls/new" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><ControlNew /></Suspense></ModuleRoute>} />
          <Route path="controls/:id" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><ControlDetail /></Suspense></ModuleRoute>} />
          <Route path="evidence" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><Evidence /></Suspense></ModuleRoute>} />
          <Route path="evidence/:id" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><EvidenceDetail /></Suspense></ModuleRoute>} />
          <Route path="frameworks" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><Frameworks /></Suspense></ModuleRoute>} />
          <Route path="frameworks/:id" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><FrameworkDetail /></Suspense></ModuleRoute>} />
          <Route path="framework-library" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><FrameworkLibrary /></Suspense></ModuleRoute>} />
          <Route path="calendar" element={<ModuleRoute module="compliance"><Suspense fallback={<PageLoader />}><ComplianceCalendarPage /></Suspense></ModuleRoute>} />
          
          {/* Data Module */}
          <Route path="policies" element={<ModuleRoute module="data"><Suspense fallback={<PageLoader />}><Policies /></Suspense></ModuleRoute>} />
          <Route path="policies/:id" element={<ModuleRoute module="data"><Suspense fallback={<PageLoader />}><PolicyDetail /></Suspense></ModuleRoute>} />
          <Route path="assets" element={<ModuleRoute module="data"><Suspense fallback={<PageLoader />}><Assets /></Suspense></ModuleRoute>} />
          <Route path="assets/:id" element={<ModuleRoute module="data"><Suspense fallback={<PageLoader />}><AssetDetail /></Suspense></ModuleRoute>} />
          <Route path="integrations" element={<ModuleRoute module="data"><Suspense fallback={<PageLoader />}><Integrations /></Suspense></ModuleRoute>} />
          
          {/* Risk Module */}
          <Route path="risks" element={<ModuleRoute module="risk"><Suspense fallback={<PageLoader />}><Risks /></Suspense></ModuleRoute>} />
          <Route path="risks/:id" element={<ModuleRoute module="risk"><Suspense fallback={<PageLoader />}><RiskDetail /></Suspense></ModuleRoute>} />
          <Route path="risk-dashboard" element={<ModuleRoute module="risk"><Suspense fallback={<PageLoader />}><RiskDashboard /></Suspense></ModuleRoute>} />
          <Route path="risk-queue" element={<ModuleRoute module="risk"><Suspense fallback={<PageLoader />}><RiskQueue /></Suspense></ModuleRoute>} />
          <Route path="risk-heatmap" element={<ModuleRoute module="risk"><Suspense fallback={<PageLoader />}><RiskHeatmap /></Suspense></ModuleRoute>} />
          <Route path="risk-scenarios" element={<ModuleRoute module="risk"><Suspense fallback={<PageLoader />}><RiskScenarios /></Suspense></ModuleRoute>} />
          <Route path="risk-reports" element={<ModuleRoute module="risk"><Suspense fallback={<PageLoader />}><RiskReports /></Suspense></ModuleRoute>} />
          
          {/* TPRM Module */}
          <Route path="vendors" element={<ModuleRoute module="tprm"><Suspense fallback={<PageLoader />}><Vendors /></Suspense></ModuleRoute>} />
          <Route path="vendors/:id" element={<ModuleRoute module="tprm"><Suspense fallback={<PageLoader />}><VendorDetail /></Suspense></ModuleRoute>} />
          <Route path="assessments" element={<ModuleRoute module="tprm"><Suspense fallback={<PageLoader />}><Assessments /></Suspense></ModuleRoute>} />
          <Route path="assessments/:id" element={<ModuleRoute module="tprm"><Suspense fallback={<PageLoader />}><AssessmentDetail /></Suspense></ModuleRoute>} />
          <Route path="contracts" element={<ModuleRoute module="tprm"><Suspense fallback={<PageLoader />}><Contracts /></Suspense></ModuleRoute>} />
          <Route path="contracts/:id" element={<ModuleRoute module="tprm"><Suspense fallback={<PageLoader />}><ContractDetail /></Suspense></ModuleRoute>} />
          <Route path="questionnaires" element={<ModuleRoute module="tprm"><Suspense fallback={<PageLoader />}><Questionnaires /></Suspense></ModuleRoute>} />
          <Route path="questionnaires/:id" element={<ModuleRoute module="tprm"><Suspense fallback={<PageLoader />}><QuestionnaireDetail /></Suspense></ModuleRoute>} />
          
          {/* Trust Module */}
          <Route path="knowledge-base" element={<ModuleRoute module="trust"><Suspense fallback={<PageLoader />}><KnowledgeBase /></Suspense></ModuleRoute>} />
          <Route path="knowledge-base/:id" element={<ModuleRoute module="trust"><Suspense fallback={<PageLoader />}><KnowledgeBaseDetail /></Suspense></ModuleRoute>} />
          <Route path="answer-templates" element={<ModuleRoute module="trust"><Suspense fallback={<PageLoader />}><AnswerTemplates /></Suspense></ModuleRoute>} />
          <Route path="trust-analytics" element={<ModuleRoute module="trust"><Suspense fallback={<PageLoader />}><TrustAnalytics /></Suspense></ModuleRoute>} />
          <Route path="trust-center" element={<ModuleRoute module="trust"><Suspense fallback={<PageLoader />}><TrustCenter /></Suspense></ModuleRoute>} />
          <Route path="trust-center/settings" element={<ModuleRoute module="trust"><Suspense fallback={<PageLoader />}><TrustCenterSettings /></Suspense></ModuleRoute>} />
          
          {/* Audit Module */}
          <Route path="audits" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><Audits /></Suspense></ModuleRoute>} />
          <Route path="audit-requests" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><AuditRequests /></Suspense></ModuleRoute>} />
          <Route path="audit-findings" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><AuditFindings /></Suspense></ModuleRoute>} />
          <Route path="audit-templates" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><AuditTemplates /></Suspense></ModuleRoute>} />
          <Route path="audit-workpapers" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><AuditWorkpapers /></Suspense></ModuleRoute>} />
          <Route path="audit-analytics" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><AuditAnalytics /></Suspense></ModuleRoute>} />
          <Route path="audit-calendar" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><AuditCalendar /></Suspense></ModuleRoute>} />
          <Route path="test-procedures" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><TestProcedures /></Suspense></ModuleRoute>} />
          <Route path="audit" element={<ModuleRoute module="audit"><Suspense fallback={<PageLoader />}><AuditLog /></Suspense></ModuleRoute>} />
          
          {/* Tools Module */}
          <Route path="scheduled-reports" element={<ModuleRoute module="tools"><Suspense fallback={<PageLoader />}><ScheduledReportsPage /></Suspense></ModuleRoute>} />
          <Route path="tools/ai-risk-assistant" element={<ModuleRoute module="ai"><Suspense fallback={<PageLoader />}><AIRiskAssistant /></Suspense></ModuleRoute>} />
          <Route path="settings" element={<Navigate to="/settings/organization" replace />} />
          <Route path="settings/organization" element={<Suspense fallback={<PageLoader />}><Settings section="organization" /></Suspense>} />
          <Route path="settings/communications" element={<Suspense fallback={<PageLoader />}><Settings section="communications" /></Suspense>} />
          <Route path="settings/api-keys" element={<Suspense fallback={<PageLoader />}><Settings section="api" /></Suspense>} />
          <Route path="settings/modules" element={<Suspense fallback={<PageLoader />}><Settings section="modules" /></Suspense>} />
          <Route path="settings/notifications" element={<Suspense fallback={<PageLoader />}><NotificationSettings /></Suspense>} />
          <Route path="settings/risk" element={<Suspense fallback={<PageLoader />}><RiskConfiguration /></Suspense>} />
          <Route path="settings/tprm" element={<Suspense fallback={<PageLoader />}><TPRMConfiguration /></Suspense>} />
          <Route path="settings/trust" element={<Suspense fallback={<PageLoader />}><TrustConfiguration /></Suspense>} />
          <Route path="settings/dashboard-templates" element={<Suspense fallback={<PageLoader />}><Settings section="dashboard-templates" /></Suspense>} />
          <Route path="settings/employee-compliance" element={<Suspense fallback={<PageLoader />}><Settings section="employee-compliance" /></Suspense>} />
          <Route path="settings/ai" element={<Suspense fallback={<PageLoader />}><Settings section="ai" /></Suspense>} />
          <Route path="settings/config-as-code" element={<ModuleRoute module="config-as-code"><Suspense fallback={<PageLoader />}><ConfigAsCode /></Suspense></ModuleRoute>} />
          <Route path="settings/mcp" element={<Suspense fallback={<PageLoader />}><MCPSettings /></Suspense>} />
          <Route path="settings/workspaces" element={<Suspense fallback={<PageLoader />}><WorkspaceList /></Suspense>} />
          <Route path="settings/workspaces/:id" element={<Suspense fallback={<PageLoader />}><WorkspaceSettings /></Suspense>} />
          <Route path="account" element={<Suspense fallback={<PageLoader />}><AccountSettings /></Suspense>} />
          {/* People Module */}
          <Route path="tools/awareness" element={<ModuleRoute module="people"><Suspense fallback={<PageLoader />}><AwarenessTraining /></Suspense></ModuleRoute>} />
          {/* Security training is included in AwarenessTraining */}
          <Route path="users" element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>} />
          <Route path="permissions" element={<Suspense fallback={<PageLoader />}><PermissionGroups /></Suspense>} />
          <Route path="help" element={<Suspense fallback={<PageLoader />}><HelpCenter /></Suspense>} />
          <Route path="help/:category/:article" element={<Suspense fallback={<PageLoader />}><HelpArticle /></Suspense>} />
          <Route path="docs" element={<Suspense fallback={<PageLoader />}><DeveloperDocs /></Suspense>} />
          <Route path="people" element={<ModuleRoute module="people"><Suspense fallback={<PageLoader />}><Employees /></Suspense></ModuleRoute>} />
          <Route path="people/dashboard" element={<ModuleRoute module="people"><Suspense fallback={<PageLoader />}><EmployeeComplianceDashboard /></Suspense></ModuleRoute>} />
          <Route path="people/:id" element={<ModuleRoute module="people"><Suspense fallback={<PageLoader />}><EmployeeDetail /></Suspense></ModuleRoute>} />
          
          {/* BC/DR Module */}
          <Route path="bcdr" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><BCDRDashboard /></Suspense></ModuleRoute>} />
          <Route path="bcdr/processes" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><BusinessProcesses /></Suspense></ModuleRoute>} />
          <Route path="bcdr/processes/:id" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><BusinessProcessDetail /></Suspense></ModuleRoute>} />
          <Route path="bcdr/plans" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><BCDRPlans /></Suspense></ModuleRoute>} />
          <Route path="bcdr/plans/:id" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><BCDRPlanDetail /></Suspense></ModuleRoute>} />
          <Route path="bcdr/tests" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><DRTests /></Suspense></ModuleRoute>} />
          <Route path="bcdr/tests/:id" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><DRTestDetail /></Suspense></ModuleRoute>} />
          <Route path="bcdr/runbooks" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><Runbooks /></Suspense></ModuleRoute>} />
          <Route path="bcdr/runbooks/:id" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><Runbooks /></Suspense></ModuleRoute>} />
          <Route path="bcdr/communication" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><CommunicationPlans /></Suspense></ModuleRoute>} />
          <Route path="bcdr/communication/:id" element={<ModuleRoute module="bcdr"><Suspense fallback={<PageLoader />}><CommunicationPlans /></Suspense></ModuleRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
