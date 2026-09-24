import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LojaProvider } from './context/LojaContext';
import { OnboardingModal } from './components/OnboardingModal';

// Carregamento sob demanda (Code-Splitting via React.lazy)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/auth/Login'));
const Vidlytics = lazy(() => import('./pages/modules/Vidlytics'));
const LiveCommerce = lazy(() => import('./pages/modules/LiveCommerce'));
const LiveAdminPage = lazy(() => import('./pages/modules/LiveAdminPage'));
const Products = lazy(() => import('./pages/Products'));

function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-[#0094eb]/20 border-t-[#0094eb] rounded-full animate-spin mb-4" />
      <span className="text-sm font-medium text-gray-600 tracking-wide">
        Carregando Sistema Loja Lucrativa...
      </span>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      {/* Modal de Onboarding: só aparece se needsOnboarding for true */}
      {user && <OnboardingModal />}

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/dashboard/modules/vidlytics"
          element={user ? <Vidlytics /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/dashboard/modules/live-commerce"
          element={user ? <LiveCommerce /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/dashboard/modules/live-commerce/admin/:id"
          element={user ? <LiveAdminPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/dashboard/products"
          element={user ? <Products /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/dashboard/modules"
          element={<Navigate to="/dashboard/modules/vidlytics" replace />}
        />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <LojaProvider>
        <AppRoutes />
      </LojaProvider>
    </Router>
  );
}