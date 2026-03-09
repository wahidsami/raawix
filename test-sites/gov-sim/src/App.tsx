import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import './App.css';
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import DashboardPage from './pages/DashboardPage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import ApplyStep1Page from './pages/ApplyStep1Page';
import ApplyStep2Page from './pages/ApplyStep2Page';
import ApplyStep3Page from './pages/ApplyStep3Page';
import ReviewPage from './pages/ReviewPage';
import SuccessPage from './pages/SuccessPage';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/verify" element={<VerifyPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <ServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services/:id"
          element={
            <ProtectedRoute>
              <ServiceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apply/:id/step-1"
          element={
            <ProtectedRoute>
              <ApplyStep1Page />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apply/:id/step-2"
          element={
            <ProtectedRoute>
              <ApplyStep2Page />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apply/:id/step-3"
          element={
            <ProtectedRoute>
              <ApplyStep3Page />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apply/:id/review"
          element={
            <ProtectedRoute>
              <ReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apply/:id/success"
          element={
            <ProtectedRoute>
              <SuccessPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;

