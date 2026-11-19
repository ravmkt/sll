import { Navigate, Route, Routes } from 'react-router-dom';
import GestorLayout from './components/GestorLayout';
import GestorHomePage from './pages/GestorHomePage';
import GestorPage from './pages/GestorPage';
import SuppliersPage from './pages/SuppliersPage';

export default function GestorRoutes() {
  return (
    <Routes>
      <Route element={<GestorLayout />}>
        <Route index element={<GestorHomePage />} />
        <Route path="produtos" element={<GestorPage />} />
        <Route path="fornecedores" element={<SuppliersPage />} />
        <Route path="*" element={<Navigate to="/dashboard/modules/gestor" replace />} />
      </Route>
    </Routes>
  );
}