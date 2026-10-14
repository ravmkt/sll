import { Navigate, useLocation, useParams } from 'react-router-dom';

// /checkout/:id -> /dashboard/checkout?plan=:id (mantem ciclo e add-ons da URL)
export default function CheckoutIdRedirect() {
  const { id } = useParams();
  const { search } = useLocation();
  const q = new URLSearchParams(search);
  q.set('plan', id ?? '');
  return <Navigate to={`/dashboard/checkout?${q.toString()}`} replace />;
}