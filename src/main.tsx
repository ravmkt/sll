import { getActiveReferralCode } from '@/lib/auth';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

// Guarda o codigo de indicacao (?ref=) assim que o app abre, antes de cadastro/login/OAuth
getActiveReferralCode();
