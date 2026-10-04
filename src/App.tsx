import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './contexts/AuthContext';
import { LojaProvider } from './contexts/LojaContext';
import { OnboardingModal } from './components/OnboardingModal';
import { SubscriptionGate } from './components/auth/SubscriptionGate';

// Carregamento sob demanda (Code-Splitting via React.lazy)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/auth/Login'));
const Vidlytics = lazy(() => import('./pages/modules/Vidlytics'));
const LiveCommerce = lazy(() => import('./pages/modules/LiveCommerce'));
const LiveAdminPage = lazy(() => import('./pages/modules/LiveAdminPage'));
const Products = lazy(() => import('./pages/Products'));
const IndicaEGanha = lazy(() => import('./pages/afiliados/IndicaEGanha'));
const SettingsPage = lazy(() => import('./pages/configuracoes/SettingsPage'));
const Assinaturas = lazy(() => import('./pages/assinaturas/Assinaturas'));
const Planos = lazy(() => import('./pages/planos/Planos'));
const PlanosGatePage = lazy(() => import('./pages/planos/PlanosGatePage'));
const IntegrationPage = lazy(() => import('./pages/integracao/IntegrationPage'));
const InstagramCallback = lazy(() => import('./pages/auth/InstagramCallback'));

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
        <Route path="/dashboard/products" element={<Navigate to="/dashboard/produtos" replace />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/auth/instagram/callback" element={<InstagramCallback />} />

        {/* Landing Page de Bloqueio/Upgrade (Acessível a usuários logados) */}
        <Route
          path="/planos-bloqueio"
          element={user ? <PlanosGatePage /> : <Navigate to="/auth" replace />}
        />

        {/* Área de Planos e Assinaturas (Sempre acessível para permitir contratação) */}
        <Route
          path="/dashboard/planos"
          element={user ? <Planos /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/dashboard/assinaturas"
          element={user ? <Assinaturas /> : <Navigate to="/auth" replace />}
        />

        {/* Rotas Operacionais Protegidas pelo SubscriptionGate */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <SubscriptionGate>
                <Dashboard />
              </SubscriptionGate>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/dashboard/modules/vidlytics"
          element={
            user ? (
              <SubscriptionGate>
                <Vidlytics />
              </SubscriptionGate>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/dashboard/modules/live-commerce"
          element={
            user ? (
              <SubscriptionGate>
                <LiveCommerce />
              </SubscriptionGate>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/dashboard/modules/live-commerce/admin/:id"
          element={
            user ? (
              <SubscriptionGate>
                <LiveAdminPage />
              </SubscriptionGate>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/dashboard/produtos"
          element={
            user ? (
              <SubscriptionGate>
                <Products />
              </SubscriptionGate>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/dashboard/afiliados"
          element={
            user ? (
              <SubscriptionGate>
                <IndicaEGanha />
              </SubscriptionGate>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            user ? (
              <SubscriptionGate>
                <SettingsPage />
              </SubscriptionGate>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/dashboard/modules"
          element={<Navigate to="/dashboard/modules/vidlytics" replace />}
        />
        <Route
          path="/dashboard/integracao"
          element={
            user ? (
              <SubscriptionGate>
                <IntegrationPage />
              </SubscriptionGate>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
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
        <Toaster richColors position="top-right" />
      </LojaProvider>
    </Router>
  );
}
