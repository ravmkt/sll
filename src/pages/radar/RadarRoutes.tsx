import { Navigate, Route, Routes } from 'react-router-dom';
import RadarLayout from '@/components/radar/RadarLayout';
import OverviewPage from './OverviewPage';
import ConnectionsPage from './ConnectionsPage';
import RankingsPage from './RankingsPage';
import TasksPage from './TasksPage';
import ProductsPage from './ProductsPage';
import OpportunitiesPage from './OpportunitiesPage';
import SettingsPage from './SettingsPage';

export default function RadarRoutes() {
  return (
    <Routes>
      <Route element={<RadarLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="conexoes" element={<ConnectionsPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="tarefas" element={<TasksPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="oportunidades" element={<OpportunitiesPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard/modules/radar" replace />} />
      </Route>
    </Routes>
  );
}