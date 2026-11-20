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
import StockPage from './pages/StockPage';
import ExpedicaoPage from './pages/ExpedicaoPage';
import TeamPage from './pages/TeamPage';

export default function GestorRoutes() {
  return (
    <Routes>
      <Route element={<GestorLayout />}>
        <Route index element={<GestorHomePage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="categorias" element={<CatalogPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
            <Route path="clientes" element={<CustomersPage />} />
        <Route path="fornecedores" element={<SuppliersPage />} />
        <Route path="expedicao" element={<ExpedicaoPage />} />
        <Route path="estoque" element={<StockPage />} />
        <Route path="estoque/historico" element={<GestorPage />} />
            <Route path="equipe" element={<TeamPage />} />
        {secaoRoutes}
        <Route path="*" element={<Navigate to="/dashboard/modules/gestor" replace />} />
      </Route>
    </Routes>
  );
}

