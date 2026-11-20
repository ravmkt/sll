import { Navigate, Route, Routes } from 'react-router-dom';
import GestorLayout from './components/GestorLayout';
import GestorHomePage from './pages/GestorHomePage';
import GestorPage from './pages/GestorPage';
import ProductsPage from './pages/ProductsPage';
import SuppliersPage from './pages/SuppliersPage';
import CatalogPage from './pages/CatalogPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import { secaoRoutes } from './pages/secaoRoutes';
import ExpedicaoPage from './pages/ExpedicaoPage';

export default function GestorRoutes() {
  return (
    <Routes>
      <Route element={<GestorLayout />}>
        <Route index element={<GestorHomePage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="estoque" element={<GestorPage />} />
        <Route path="categorias" element={<CatalogPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
            <Route path="clientes" element={<CustomersPage />} />
        <Route path="fornecedores" element={<SuppliersPage />} />
        <Route path="expedicao" element={<ExpedicaoPage />} />
        {secaoRoutes}
        <Route path="*" element={<Navigate to="/dashboard/modules/gestor" replace />} />
      </Route>
    </Routes>
  );
}

