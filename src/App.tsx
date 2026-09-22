import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Vidlytics from './pages/modules/Vidlytics';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-[#0094eb] font-semibold">
        Carregando Sistema Loja Lucrativa...
      </div>
    );
  }

  return (
    <Routes>
      {/* Redireciona a raiz para a dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Rota pública de Login */}
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Rotas protegidas */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/auth" replace />}
      />

      {/* Rota Vidlytics */}
      <Route
        path="/dashboard/modules/vidlytics"
        element={user ? <Vidlytics /> : <Navigate to="/auth" replace />}
      />

      {/* Redirecionamento de módulos geral para Vidlytics como padrão */}
      <Route
        path="/dashboard/modules"
        element={<Navigate to="/dashboard/modules/vidlytics" replace />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
