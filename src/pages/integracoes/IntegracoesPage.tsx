import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import PlatformConnectCard from '@/components/configuracoes/PlatformConnectCard';
import YampiWebhookCard from '@/components/integrations/YampiWebhookCard';
import { getYampiStatus } from '@/services/yampiService';
import { SocialIntegrationsCard } from "@/components/integracao/SocialIntegrationsCard";

type Item = { key: string; label: string; logo: string };

// Nova plataforma: adicione uma linha aqui e o modal dela mais abaixo.
const PLATFORMS: Item[] = [
  { key: 'yampi', label: 'Yampi', logo: '/assets/platforms/yampi.svg' },
];
const SOCIALS: Item[] = [
  { key: 'instagram', label: 'Instagram', logo: '/assets/platforms/instagram.png' },
  { key: 'tiktok', label: 'TikTok', logo: '/assets/platforms/tiktok.png' },
];

const H2 = 'text-base font-black uppercase tracking-tight text-slate-900 dark:text-white';

const EXTS = ['svg', 'png', 'webp', 'jpg'];

function Tile({ item, on, onClick }: { item: Item; on: boolean; onClick: () => void }) {
  const base = item.logo.replace(/\.[a-z0-9]+$/i, '');
  const first = (item.logo.split('.').pop() || 'svg').toLowerCase();
  const srcs = [item.logo, ...EXTS.filter((e) => e !== first).map((e) => base + '.' + e)];
  const [idx, setIdx] = useState(0);
  const failed = idx >= srcs.length;
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.label}
      aria-label={item.label}
      className="relative flex h-36 w-56 cursor-pointer flex-col items-center justify-center rounded-2xl p-6 border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-[#1a1f35]"
    >
      <span
        title={on ? 'Conectado' : 'Desconectado'}
        className={'absolute right-3 top-3 h-3 w-3 rounded-full ' + (on ? 'bg-emerald-500' : 'bg-rose-500')}
      />
      {failed ? (
        <span className="text-5xl font-black text-slate-300">{item.label.charAt(0)}</span>
      ) : (
        <img src={srcs[idx]} alt={item.label} className="max-h-20 w-auto max-w-[170px] object-contain" onError={() => setIdx((i) => i + 1)} />
      )}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1f35]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

type OpenKey = 'yampi' | 'instagram' | 'tiktok' | null;

export default function IntegracoesPage() {
  const { storeId } = useLoja();
  const [status, setStatus] = useState<Record<string, boolean>>({});
  // Volta do login: abre so o modal da rede de origem para processar o retorno.
  const [open, setOpen] = useState<OpenKey>(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has('tiktok')) return 'tiktok';
    if (p.has('code')) return 'instagram';
    return null;
  });

  const load = useCallback(async () => {
    if (!storeId) return;
    const next: Record<string, boolean> = {};
    try {
      const y = await getYampiStatus(storeId);
      next.yampi = !!y.connected;
    } catch { next.yampi = false; }
    try {
      const { data } = await (supabase as any).from('store_integrations').select('platform,status').eq('store_id', storeId);
      for (const r of (data ?? []) as { platform: string; status: string | null }[]) {
        if (r.status !== 'expired') next[String(r.platform).toLowerCase()] = true;
      }
    } catch { /* sem status */ }
    setStatus(next);
  }, [storeId]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [load]);

  const close = () => { setOpen(null); load(); };

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('yampi-sync', { body: { store_id: storeId, ...body } });
    if (error) throw error;
    return data;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Integrações</h1>

        {!storeId ? (
          <p className="text-sm text-slate-500">Carregando loja...</p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className={H2}>Plataformas de e-commerce</h2>
              <div className="flex flex-wrap gap-4">
                {PLATFORMS.map((p) => (
                  <Tile key={p.key} item={p} on={!!status[p.key]} onClick={() => setOpen(p.key as OpenKey)} />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className={H2}>Redes sociais</h2>
              <div className="flex flex-wrap gap-4">
                {SOCIALS.map((s) => (
                  <Tile key={s.key} item={s} on={!!status[s.key]} onClick={() => setOpen(s.key as OpenKey)} />
                ))}
              </div>
            </section>

            {open === 'yampi' && (
              <Modal title="" onClose={close}>
                <PlatformConnectCard storeId={storeId} platform="Yampi" platforms={['Yampi']} onChangePlatform={() => {}} />
                {status.yampi && <YampiWebhookCard storeId={storeId} call={call} />}
                <Link
                  to="/dashboard/instalacao"
                  className="block rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-[#0091ff] hover:bg-blue-100"
                >
                  Proximo passo: instalar o script de rastreamento &rarr;
                </Link>
              </Modal>
            )}

            {open === 'instagram' && (
              <Modal title="Instagram" onClose={close}>
                <SocialIntegrationsCard storeId={storeId} only="instagram" />
              </Modal>
            )}

            {open === 'tiktok' && (
              <Modal title="TikTok" onClose={close}>
                <SocialIntegrationsCard storeId={storeId} only="tiktok" />
              </Modal>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}