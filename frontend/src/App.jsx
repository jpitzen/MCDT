import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CloudProviderSelection from './pages/CloudProviderSelection';
import CredentialsManager from './pages/CredentialsManager';
import DeploymentStatus from './pages/DeploymentStatus';
import DeploymentDetails from './pages/DeploymentDetails';
import DeploymentDrafts from './pages/DeploymentDrafts';
import DeploymentMonitor from './pages/DeploymentMonitor';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ClusterManagement from './pages/ClusterManagement';
import DatabaseQueryInterface from './pages/DatabaseQueryInterface';
import ContainerDeployments from './pages/ContainerDeployments';
import CloudDeploymentToolkit from './pages/CloudDeploymentToolkit';
import UnifiedDeploymentWizard from './pages/UnifiedDeploymentWizard';
import SystemAdmin from './pages/SystemAdmin';
import AccessDenied from './pages/AccessDenied';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';
import { useAuth } from './contexts/AuthContext';

/**
 * Role-based ProtectedRoute.
 * - No `roles` prop → any authenticated user.
 * - `roles={['admin']}` → only admin.
 * - Shows spinner while AuthContext is loading.
 * - Shows AccessDenied (403) if role mismatch (not a redirect to /login).
 */
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <Layout>
        <AccessDenied />
      </Layout>
    );
  }

  return children;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public routes - no Layout wrapper */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes - wrapped in Layout */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/select-cloud" element={
          <ProtectedRoute>
            <Layout>
              <CloudProviderSelection />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/credentials" element={
          <ProtectedRoute roles={['admin', 'operator']}>
            <Layout>
              <CredentialsManager />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/credentials/add/:provider" element={
          <ProtectedRoute roles={['admin', 'operator']}>
            <Layout>
              <CredentialsManager />
            </Layout>
          </ProtectedRoute>
        } />
        {/* Legacy wizard routes - redirect to unified wizard */}
        <Route path="/wizard-multicloud" element={<Navigate to="/unified-wizard" replace />} />
        <Route path="/deploy" element={<Navigate to="/unified-wizard" replace />} />
        <Route path="/deploy-wizard" element={<Navigate to="/unified-wizard" replace />} />
        <Route path="/deployments" element={
          <ProtectedRoute>
            <Layout>
              <DeploymentDrafts />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/deployment-status/:id" element={
          <ProtectedRoute>
            <Layout>
              <DeploymentStatus />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/deployment/:id" element={
          <ProtectedRoute>
            <Layout>
              <DeploymentDetails />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/deployments/:id" element={
          <ProtectedRoute>
            <Layout>
              <DeploymentDetails />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/clusters" element={
          <ProtectedRoute>
            <Layout>
              <ClusterManagement />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/monitor" element={
          <ProtectedRoute>
            <Layout>
              <DeploymentMonitor />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Layout>
              <AnalyticsDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/deployment-drafts" element={
          <ProtectedRoute>
            <Layout>
              <DeploymentDrafts />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/sql-interface" element={
          <ProtectedRoute>
            <Layout>
              <DatabaseQueryInterface />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/containers" element={
          <ProtectedRoute>
            <Layout>
              <ContainerDeployments />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/cloud-toolkit" element={
          <ProtectedRoute>
            <Layout>
              <CloudDeploymentToolkit />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/unified-wizard" element={
          <ProtectedRoute roles={['admin', 'operator']}>
            <Layout>
              <UnifiedDeploymentWizard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute roles={['admin']}>
            <Layout>
              <SystemAdmin />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/500" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
