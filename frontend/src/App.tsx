import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Controls from './pages/Controls';
import ControlDetail from './pages/ControlDetail';
import Evidence from './pages/Evidence';
import EvidenceDetail from './pages/EvidenceDetail';
import Frameworks from './pages/Frameworks';
import FrameworkDetail from './pages/FrameworkDetail';
import Policies from './pages/Policies';
import PolicyDetail from './pages/PolicyDetail';
import Risks from './pages/Risks';
import RiskDetail from './pages/RiskDetail';
import RiskHeatmap from './pages/RiskHeatmap';
import RiskDashboard from './pages/RiskDashboard';
import RiskQueue from './pages/RiskQueue';
import RiskScenarios from './pages/RiskScenarios';
import RiskReports from './pages/RiskReports';
import RiskConfiguration from './pages/RiskConfiguration';
import AwarenessTraining from './pages/AwarenessTraining';
import Assets from './pages/Assets';
import Integrations from './pages/Integrations';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import NotificationSettings from './pages/NotificationSettings';
import UserManagement from './pages/UserManagement';
import PermissionGroups from './pages/PermissionGroups';
import Vendors from './pages/Vendors';
import VendorDetail from './pages/VendorDetail';
import Assessments from './pages/Assessments';
import AssessmentDetail from './pages/AssessmentDetail';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Questionnaires from './pages/Questionnaires';
import QuestionnaireDetail from './pages/QuestionnaireDetail';
import KnowledgeBase from './pages/KnowledgeBase';
import KnowledgeBaseDetail from './pages/KnowledgeBaseDetail';
import TrustCenter from './pages/TrustCenter';
import Audits from './pages/Audits';
import AuditRequests from './pages/AuditRequests';
import AuditFindings from './pages/AuditFindings';
import AuditDetail from './pages/AuditDetail';
import AuditNew from './pages/AuditNew';
import AuditAnalytics from './pages/AuditAnalytics';
import AuditCalendar from './pages/AuditCalendar';
import AuditTemplates from './pages/AuditTemplates';
import AuditWorkpapers from './pages/AuditWorkpapers';
import TestProcedures from './pages/TestProcedures';
import AuditorPortal from './pages/AuditorPortal';
import AuditorLogin from './pages/AuditorLogin';
// People / Training
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import EmployeeComplianceDashboard from './pages/EmployeeComplianceDashboard';
import SecurityTrainingDashboard from './pages/SecurityTrainingDashboard';
import TrainingAdmin from './pages/TrainingAdmin';
// Settings deep
import MCPSettings from './pages/MCPSettings';
import TPRMConfiguration from './pages/TPRMConfiguration';
import TrustConfiguration from './pages/TrustConfiguration';
import ConfigAsCode from './pages/ConfigAsCode';
import DeveloperDocs from './pages/DeveloperDocs';
import AccountSettings from './pages/AccountSettings';
import WorkspaceList from './pages/WorkspaceList';
import WorkspaceSettings from './pages/WorkspaceSettings';
// One-offs
import AIRiskAssistant from './pages/AIRiskAssistant';
import AnswerTemplates from './pages/AnswerTemplates';
import MappingGaps from './pages/MappingGaps';
import ReportBuilder from './pages/ReportBuilder';
import ScheduledReportsPage from './pages/ScheduledReportsPage';
import FrameworkLibrary from './pages/FrameworkLibrary';
import TrustAnalytics from './pages/TrustAnalytics';
import TrustCenterSettings from './pages/TrustCenterSettings';
import HelpCenter from './pages/HelpCenter';
import HelpArticle from './pages/HelpArticle';
import CustomDashboards from './pages/CustomDashboards';
import DisabledModulePage from './pages/DisabledModulePage';
import ComplianceCalendarPage from './pages/ComplianceCalendarPage';
import AssetDetail from './pages/AssetDetail';
import ControlNew from './pages/ControlNew';
import VendorNew from './pages/VendorNew';
import DesignSystem from './pages/DesignSystem';
// BCDR module
import BCDRDashboard from './pages/BCDRDashboard';
import BCDRPlans from './pages/BCDRPlans';
import BCDRPlanDetail from './pages/BCDRPlanDetail';
import BCDRIncidents from './pages/BCDRIncidents';
import BCDRIncidentDetail from './pages/BCDRIncidentDetail';
import DRTests from './pages/DRTests';
import DRTestDetail from './pages/DRTestDetail';
import Runbooks from './pages/Runbooks';
import RunbookDetail from './pages/RunbookDetail';
import BusinessProcesses from './pages/BusinessProcesses';
import BusinessProcessDetail from './pages/BusinessProcessDetail';
import RecoveryTeams from './pages/RecoveryTeams';
import RecoveryTeamDetail from './pages/RecoveryTeamDetail';
import CommunicationPlans from './pages/CommunicationPlans';
import CommunicationPlanDetail from './pages/CommunicationPlanDetail';
import ExerciseTemplates from './pages/ExerciseTemplates';
import Login from './pages/Login';
import Loading from './components/Loading';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Check if this is an OAuth callback (has code or error in URL)
  const searchParams = new URLSearchParams(location.search);
  const hasAuthCallback =
    searchParams.has('code') || searchParams.has('error') || searchParams.has('session_state');

  if (isLoading || hasAuthCallback) {
    // Still processing auth - show loading
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Root redirect component that waits for auth
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Check for OAuth callback params
  const searchParams = new URLSearchParams(location.search);
  const hasAuthCallback = searchParams.has('code') || searchParams.has('session_state');

  if (isLoading || hasAuthCallback) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auditor-login" element={<AuditorLogin />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="controls" element={<Controls />} />
        <Route path="controls/new" element={<ControlNew />} />
        <Route path="controls/:id" element={<ControlDetail />} />
        <Route path="evidence" element={<Evidence />} />
        <Route path="evidence/:id" element={<EvidenceDetail />} />
        <Route path="frameworks" element={<Frameworks />} />
        <Route path="frameworks/:id" element={<FrameworkDetail />} />
        <Route path="policies" element={<Policies />} />
        <Route path="policies/:id" element={<PolicyDetail />} />
        <Route path="risks" element={<Risks />} />
        <Route path="risks/:id" element={<RiskDetail />} />
        <Route path="risk-dashboard" element={<RiskDashboard />} />
        <Route path="risk-queue" element={<RiskQueue />} />
        <Route path="risk-heatmap" element={<RiskHeatmap />} />
        <Route path="risk-scenarios" element={<RiskScenarios />} />
        <Route path="risk-reports" element={<RiskReports />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/new" element={<VendorNew />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="assessments" element={<Assessments />} />
        <Route path="assessments/:id" element={<AssessmentDetail />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
        <Route path="questionnaires" element={<Questionnaires />} />
        <Route path="questionnaires/:id" element={<QuestionnaireDetail />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />
        <Route path="knowledge-base/:id" element={<KnowledgeBaseDetail />} />
        <Route path="trust-center" element={<TrustCenter />} />
        <Route path="audits" element={<Audits />} />
        <Route path="audits/new" element={<AuditNew />} />
        <Route path="audits/:id" element={<AuditDetail />} />
        <Route path="audit-requests" element={<AuditRequests />} />
        <Route path="audit-findings" element={<AuditFindings />} />
        <Route path="audit-templates" element={<AuditTemplates />} />
        <Route path="audit-workpapers" element={<AuditWorkpapers />} />
        <Route path="audit-analytics" element={<AuditAnalytics />} />
        <Route path="audit-calendar" element={<AuditCalendar />} />
        <Route path="test-procedures" element={<TestProcedures />} />
        <Route path="auditor-portal" element={<AuditorPortal />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/notifications" element={<NotificationSettings />} />
        <Route path="settings/risk" element={<RiskConfiguration />} />
        <Route path="tools/awareness" element={<AwarenessTraining />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="permissions" element={<PermissionGroups />} />
        <Route path="design-system" element={<DesignSystem />} />

        {/* BCDR */}
        <Route path="bcdr" element={<BCDRDashboard />} />
        <Route path="bcdr/plans" element={<BCDRPlans />} />
        <Route path="bcdr/plans/:id" element={<BCDRPlanDetail />} />
        <Route path="bcdr/incidents" element={<BCDRIncidents />} />
        <Route path="bcdr/incidents/:id" element={<BCDRIncidentDetail />} />
        <Route path="bcdr/tests" element={<DRTests />} />
        <Route path="bcdr/tests/:id" element={<DRTestDetail />} />
        <Route path="bcdr/runbooks" element={<Runbooks />} />
        <Route path="bcdr/runbooks/:id" element={<RunbookDetail />} />
        <Route path="bcdr/processes" element={<BusinessProcesses />} />
        <Route path="bcdr/processes/:id" element={<BusinessProcessDetail />} />
        <Route path="bcdr/recovery-teams" element={<RecoveryTeams />} />
        <Route path="bcdr/recovery-teams/:id" element={<RecoveryTeamDetail />} />
        <Route path="bcdr/communication" element={<CommunicationPlans />} />
        <Route path="bcdr/communication/:id" element={<CommunicationPlanDetail />} />
        <Route path="bcdr/exercise-templates" element={<ExerciseTemplates />} />

        {/* People / Training */}
        <Route path="people" element={<Employees />} />
        <Route path="people/training" element={<SecurityTrainingDashboard />} />
        <Route path="people/:id" element={<EmployeeDetail />} />
        <Route path="settings/employee-compliance" element={<EmployeeComplianceDashboard />} />
        <Route path="settings/training" element={<TrainingAdmin />} />

        {/* Settings deep */}
        <Route path="settings/mcp" element={<MCPSettings />} />
        <Route path="settings/tprm" element={<TPRMConfiguration />} />
        <Route path="settings/trust" element={<TrustConfiguration />} />
        <Route path="settings/config-as-code" element={<ConfigAsCode />} />
        <Route path="settings/workspaces" element={<WorkspaceList />} />
        <Route path="settings/workspaces/:id" element={<WorkspaceSettings />} />
        <Route path="account" element={<AccountSettings />} />
        <Route path="docs" element={<DeveloperDocs />} />

        {/* One-offs */}
        <Route path="dashboards" element={<CustomDashboards />} />
        <Route path="calendar" element={<ComplianceCalendarPage />} />
        <Route path="framework-library" element={<FrameworkLibrary />} />
        <Route path="reports/mapping-gaps" element={<MappingGaps />} />
        <Route path="reports/builder" element={<ReportBuilder />} />
        <Route path="scheduled-reports" element={<ScheduledReportsPage />} />
        <Route path="tools/ai-risk-assistant" element={<AIRiskAssistant />} />
        <Route path="answer-templates" element={<AnswerTemplates />} />
        <Route path="trust-analytics" element={<TrustAnalytics />} />
        <Route path="trust-center/settings" element={<TrustCenterSettings />} />
        <Route path="help" element={<HelpCenter />} />
        <Route path="help/:category/:article" element={<HelpArticle />} />
        <Route path="module-disabled" element={<DisabledModulePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
