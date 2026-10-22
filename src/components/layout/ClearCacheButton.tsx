import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { clearLocalCache } from '@/lib/clearLocalCache';

interface Props {
  variant?: 'light' | 'dark';
  className?: string;
}

export default function ClearCacheButton({ variant = 'light', className = '' }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  const onClick = async () => {
    if (busy) return;
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    await clearLocalCache();
    window.location.reload();
  };

  const tone = confirming
    ? 'bg-amber-500 text-white border-amber-500'
    : variant === 'dark'
      ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Limpar cache e atualizar os dados do painel (mantém seu login e sua loja)"
      aria-label="Limpar cache"
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors ${tone} ${className}`}
    >
      <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">{confirming ? 'Confirmar?' : 'Limpar cache'}</span>
    </button>
  );
}