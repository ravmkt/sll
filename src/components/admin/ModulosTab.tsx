import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { getModulesOverview, type ModulesData } from '@/services/admin/modulesService';
import ModuloDetalhe from '@/components/admin/ModuloDetalhe';
import { CARD, SELECT, STATUS_LABEL, ModuleLogo, brl, int } from '@/components/admin/moduleUi';

const TH = 'px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';

export default function ModulosTab({ onOpenStore, onOpenPlans }: { onOpenStore: (id: string) => void; onOpenPlans: (slug: string) => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ModulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await getModulesOverview(days)); }
    catch (e: any) { setError(e?.message || 'Erro ao carregar os módulos.'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (selected) {
    return (
      <ModuloDetalhe
        slug={selected}
        onBack={() => { setSelected(null); load(); }}
        onOpenStore={onOpenStore}
        onOpenPlans={onOpenPlans}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0e1a] px-6 pb-3 pt-6">
        <div>
          <h1 className="text-xl font-black text-white">Módulos</h1>
          <p className="text-xs text-slate-500">Clique em um módulo para ver os detalhes e editar.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${SELECT} cursor-pointer`}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {data && (
        <>
          <div className={`${CARD} flex flex-wrap items-center gap-x-8 gap-y-2`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Combos (todos os módulos)</p>
              <p className="text-lg font-black text-white">{int(data.bundle_stores)} loja(s)</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Receita mensal dos combos</p>
              <p className="text-lg font-black text-white">{brl(data.bundle_mrr)}</p>
            </div>
            <p className="text-[11px] text-slate-500">Lojas com combo contam como acesso em cada módulo. A receita do combo não é dividida entre eles.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111524]">
            <table className="w-full min-w-[820px] text-xs">
              <thead className="border-b border-slate-800">
                <tr>
                  <th className={TH}>Ordem</th>
                  <th className={TH}>Módulo</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Venda</th>
                  <th className={`${TH} text-right`}>Com acesso</th>
                  <th className={`${TH} text-right`}>Pagantes</th>
                  <th className={`${TH} text-right`}>Receita mensal</th>
                  <th className={`${TH} text-right`}>Views ({data.days}d)</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.modules.map((m) => (
                  <tr key={m.slug} onClick={() => setSelected(m.slug)} className="cursor-pointer transition-colors hover:bg-white/5">
                    <td className="px-3 py-3 font-bold text-slate-400">{m.sort_order}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <ModuleLogo url={m.logo_url} name={m.name} size={36} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{m.name}</p>
                          <p className="font-mono text-[10px] text-slate-600">{m.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                        {STATUS_LABEL[m.status] || m.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.is_public_for_sale ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-500/15 text-slate-400'}`}>
                        {m.is_public_for_sale ? 'À venda' : 'Fora de venda'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-white">{int(m.access)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-300">{int(m.paying)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-white">{brl(m.mrr)}</td>
                    <td className="px-3 py-3 text-right text-slate-300">{m.views === null ? '—' : int(m.views)}</td>
                    <td className="px-3 py-3 text-right text-slate-500"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}