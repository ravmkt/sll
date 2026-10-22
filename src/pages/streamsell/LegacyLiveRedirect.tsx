import { Navigate, useLocation, useParams } from 'react-router-dom';

export default function LegacyLiveRedirect({ to }: { to: string }) {
  const params = useParams();
  const { search } = useLocation();
  const target = to.replace(/:(\w+)/g, (_m, k: string) => params[k] ?? '');
  return <Navigate to={target + search} replace />;
}