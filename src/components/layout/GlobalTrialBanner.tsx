import { useLocation } from 'react-router-dom';
import { TrialBanner } from './TrialBanner';

const HIDDEN = ['/auth', '/admin-master', '/vidlytics', '/sobre', '/privacidade', '/termos'];

// Unica instancia da tarja, renderizada no App para todas as paginas autenticadas
export function GlobalTrialBanner() {
  const { pathname } = useLocation();
  if (pathname === '/' || HIDDEN.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;
  return <TrialBanner />;
}