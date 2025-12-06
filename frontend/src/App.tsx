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
import Login from './pages/Login';
import Loading from './components/Loading';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Check if this is an OAuth callback (has code or error in URL)
  const searchParams = new URLSearchParams(location.search);
  const hasAuthCallback = searchParams.has('code') || searchParams.has('error') || searchParams.has('session_state');

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
        <Route path="audit-requests" element={<AuditRequests />} />
        <Route path="audit-findings" element={<AuditFindings />} />
        <Route path="assets" element={<Assets />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/notifications" element={<NotificationSettings />} />
        <Route path="settings/risk" element={<RiskConfiguration />} />
        <Route path="tools/awareness" element={<AwarenessTraining />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="permissions" element={<PermissionGroups />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

