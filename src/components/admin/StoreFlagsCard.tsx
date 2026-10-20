import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getStoreFlags, type StoreFlag } from '@/services/admin/storesService';
import { setFlagStore } from '@/services/admin/flagsService';
import { CARD, modLabel } from '@/components/admin/storeUi';
import StoreAiCreditsCard from '@/components/admin/StoreAiCreditsCard';

const MODE: Record<StoreFlag['mode'], { label: string; cls: string }> = {
  all: { label: 'Liberada para todas', cls: 'bg-emerald-500/15 text-emerald-300' },
  stores: { label: 'Lojas específicas', cls: 'bg-sky-500/15 text-sky-300' },
  off: { label: 'Desligada', cls: 'bg-slate-500/15 text-slate-300' },
};

export default function StoreFlagsCard({ storeId }: { storeId: string }) {
  const [flags, setFlags] = useState<StoreFlag[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    getStoreFlags(storeId)
      .then(setFlags)
      .catch((e: any) => { toast.error(e?.message || 'Erro ao carregar as flags.'); setFlags([]); });
  }, [storeId]);
  useEffect(() => { setFlags(null); load(); }, [load]);

  const toggle = async (f: StoreFlag) => {
    setBusyId(f.id);
    try {
      await setFlagStore(f.id, storeId, !f.enabled);
      toast.success(!f.enabled ? 'Flag liberada para a loja.' : 'Flag removida da loja.');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao alterar a flag.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
    <StoreAiCreditsCard storeId={storeId} />
    <div className={`${CARD} space-y-3`}>
      <p className="text-[15px] font-bold text-white">Feature flags da loja</p>
      {flags === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : flags.length === 0 ? (
        <p className="text-[13px] text-slate-500">Nenhuma flag cadastrada. Crie flags na página de cada módulo.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {flags.map((f) => {
            const m = MODE[f.mode];
            const editable = f.mode === 'stores';
            return (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-white">
                    {f.name} <span className="ml-1 font-mono text-xs font-normal text-slate-600">{f.key}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {modLabel(f.module_slug)}{f.description ? ` · ${f.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${m.cls}`}>{m.label}</span>
                  <label className={`flex items-center gap-2 text-[13px] ${editable ? 'cursor-pointer text-slate-200' : 'cursor-not-allowed text-slate-600'}`}
                    title={editable ? '' : 'Só dá para liberar por loja quando o modo da flag é "Lojas específicas".'}>
                    <input type="checkbox" checked={f.enabled} disabled={!editable || busyId === f.id} onChange={() => toggle(f)} />
                    {f.enabled ? 'Ativa' : 'Inativa'}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}
