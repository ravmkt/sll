import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';
import { checkoutUrl, clearIntent, readIntent } from './AuthRedirect';

export default function CheckoutIntentWatcher() {
  const { user } = useAuth();
  const { loading, needsOnboarding, storeId } = useLoja();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!user || loading || needsOnboarding || !storeId) return;
    if (pathname.startsWith('/dashboard/checkout')) return;
    const intent = readIntent(user);
    if (!intent) return;
    void clearIntent(user);
    navigate(checkoutUrl(intent), { replace: true });
  }, [user, loading, needsOnboarding, storeId, pathname, navigate]);

  return null;
}