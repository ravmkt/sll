import { Navigate, useParams } from 'react-router-dom';

export default function LiveCockpitRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/dashboard/modules/stream-sell/live/${id}/estudio`} replace />;
}