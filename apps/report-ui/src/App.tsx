import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoginForm from './components/auth/LoginForm';
import ScanDashboard from './components/ScanDashboard';

import OverviewPage from './pages/OverviewPage';
import EntitiesPage from './pages/EntitiesPage';
import EntityDetailPage from './pages/EntityDetailPage';
import ScansPage from './pages/ScansPage';
import ScanDetailPage from './pages/ScanDetailPage';
import FindingsPage from './pages/FindingsPage';
import WidgetAnalyticsPage from './pages/WidgetAnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AssistiveMapsPage from './pages/AssistiveMapsPage';
import SitesPage from './pages/SitesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UsersPage from './pages/UsersPage';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="entities" element={<EntitiesPage />} />
          <Route path="entities/:id" element={<EntityDetailPage />} />
          <Route path="scans" element={<ScansPage />} />
          <Route path="scans/:scanId" element={<ScanDetailPage />} />
          <Route path="findings" element={<FindingsPage />} />
          <Route path="assistive-maps" element={<AssistiveMapsPage />} />
          <Route path="widget-analytics" element={<WidgetAnalyticsPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Legacy scan route - wrap existing ScanDashboard */}
          <Route
            path="legacy-scan"
            element={
              <ScanDashboard
                apiUrl={import.meta.env.VITE_API_URL || 'http://localhost:3001'}
                apiKey={import.meta.env.VITE_API_KEY || 'dev-api-key-change-in-production'}
                scanId={null}
                onScanStart={() => { }}
                onNewScan={() => { }}
              />
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
