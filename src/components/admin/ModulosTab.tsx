import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, GripVertical, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getModulesOverview, reorderHubModules, type ModulesData } from '@/services/admin/modulesService';
import RevenueSection from '@/components/admin/RevenueSection';
import { getModulesRevenue, listStoreOptions, brlCents, type ModulesRevenue, type StoreOpt } from '@/services/admin/modulesRevenue';
import ModuloDetalhe from '@/components/admin/ModuloDetalhe';
import NovoModuloModal from '@/components/admin/NovoModuloModal';
import ComboSection from '@/components/admin/ComboSection';
import SandboxStoreSelect from '@/components/master/SandboxStoreSelect';
import { CARD, SELECT, STATUS_LABEL, ModuleLogo, brl, int } from '@/components/admin/moduleUi';

const TH = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500';
const STATUS_TIP: Record<string, string> = { active: "Ativo: visível e disponível para contratação.", coming_soon: "Em breve: aparece como lançamento futuro, ainda sem contratação.", hidden: "Oculto: invisível para os lojistas (rascunho)." };

export default function ModulosTab({ onOpenStore, onOpenPlans }: { onOpenStore: (id: string) => void; onOpenPlans: (slug: string) => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ModulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<'modulos' | 'combos'>('modulos');
  const [dragSlug, setDragSlug] = useState<string | null>(null);
  const [overSlug, setOverSlug] = useState<string | null>(null);
  const blocked = useRef(false);
  const [rev, setRev] = useState<ModulesRevenue | null>(null);
  const [revLoading, setRevLoading] = useState(false);
  const [store, setStore] = useState('');
  const [stores, setStores] = useState<StoreOpt[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await getModulesOverview(days)); }
    catch (e: any) { setError(e?.message || 'Erro ao carregar os módulos.'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listStoreOptions().then(setStores).catch(() => setStores([])); }, []);
  useEffect(() => {
    setRevLoading(true);
    getModulesRevenue(days, store || null)
      .then(setRev)
      .catch((e) => { setRev(null); toast.error(e?.message || 'Erro ao carregar a receita.'); })
      .finally(() => setRevLoading(false));
  }, [days, store]);

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

  // ativos sempre na frente; dentro do grupo vale a posição salva
  const list = data
    ? [...data.modules].sort(
        (a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || (a.sort_order ?? 999) - (b.sort_order ?? 999),
      )
    : [];

  const revBy = new Map((rev?.items || []).filter((i) => !i.is_combo).map((i) => [i.item_key, i.cents] as [string, number]));

  const dropOn = async (target: (typeof list)[number]) => {
    const src = list.find((x) => x.slug === dragSlug);
    setOverSlug(null);
    if (!src || !data || src.slug === target.slug) return;
    if ((src.status === 'active') !== (target.status === 'active')) return;

    const active = list.filter((x) => x.status === 'active');
    const rest = list.filter((x) => x.status !== 'active');
    const grp = src.status === 'active' ? active : rest;
    const from = grp.findIndex((x) => x.slug === src.slug);
    const to = grp.findIndex((x) => x.slug === target.slug);
    const [moved] = grp.splice(from, 1);
    grp.splice(to, 0, moved);

    const next = [...active, ...rest].map((x, i) => ({ ...x, sort_order: i + 1 }));
    setData({ ...data, modules: next });
    try {
      await reorderHubModules(next.map((x) => x.slug));
      toast.success('Ordem da vitrine atualizada.');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar a ordem.');
      load();
    }
  };

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0e1a] px-6 pb-3 pt-6">
        <div>
          <h1 className="text-xl font-black text-white">Módulos</h1>
          <p className="text-[13px] text-slate-500">Clique para editar. Arraste as linhas para mudar a ordem da vitrine; módulos ativos ficam sempre na frente.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />}
          <button type="button" onClick={() => setCreating(true)} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fd8539] px-3 py-2 text-[13px] font-bold text-white hover:opacity-90">
            <Plus size={14} /> Novo Módulo
          </button>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${SELECT} cursor-pointer`}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option><option value={180}>Últimos 6 meses</option><option value={365}>Últimos 12 meses</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[15px] text-rose-300">{error}</div>}

      {creating && <NovoModuloModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}

      <SandboxStoreSelect />

      <RevenueSection data={rev} loading={revLoading} stores={stores} store={store} onStore={setStore} />

      <div className="flex gap-2">
        {([['modulos', 'Módulos individuais'], ['combos', 'Combos']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setView(k)}
            className={`cursor-pointer rounded-lg px-4 py-2 text-[13px] font-bold ${view === k ? 'bg-[#fd8539] text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
            {l}
          </button>
        ))}
      </div>
      {view === 'combos' && <ComboSection />}

      {data && view === 'modulos' && (
        <>
          <div className={`${CARD} flex flex-wrap items-center gap-x-8 gap-y-2`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Combos (todos os módulos)</p>
              <p className="text-lg font-black text-white">{int(data.bundle_stores)} loja(s)</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Receita mensal dos combos</p>
              <p className="text-lg font-black text-white">{brl(data.bundle_mrr)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Receita mensal total (MRR)</p>
              <p className="text-lg font-black text-[#fd8539]">{brl(data.modules.reduce((a, m) => a + (Number(m.mrr) || 0), 0) + (Number(data.bundle_mrr) || 0))}</p>
            </div>
            <p className="text-[13px] text-slate-500">MRR total = módulos individuais + combos. Lojas com combo contam como acesso e pagante em cada módulo, mas a receita do combo não é dividida entre eles.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111524]">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead className="border-b border-slate-800">
                <tr>
                  <th className={TH}>Ordem</th>
                  <th className={TH}>Módulo</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Venda</th>
                  <th className={`${TH} text-right`}>Lojas</th>
                  <th className={`${TH} text-right`}>Pagantes</th>
                  <th className={`${TH} text-right`}>Trial</th>
                  <th className={`${TH} text-right`}>Receita mensal</th>
                  <th className={`${TH} text-right`}>Receita no período</th>
                  <th className={`${TH} text-right`}>Views ({data.days}d)</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((m, idx) => {
                  const isActive = m.status === 'active';
                  const src = list.find((x) => x.slug === dragSlug);
                  const valid = !!src && src.slug !== m.slug && (src.status === 'active') === isActive;
                  return (
                  <tr
                    key={m.slug}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', m.slug);
                      blocked.current = false;
                      setDragSlug(m.slug);
                    }}
                    onDragOver={(e) => {
                      if (!src) return;
                      if ((src.status === 'active') === isActive) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        blocked.current = false;
                        if (overSlug !== m.slug) setOverSlug(m.slug);
                      } else {
                        e.dataTransfer.dropEffect = 'none';
                        blocked.current = true;
                        if (overSlug) setOverSlug(null);
                      }
                    }}
                    onDrop={(e) => { e.preventDefault(); dropOn(m); }}
                    onDragEnd={() => {
                      if (blocked.current) toast.info('Módulos ativos ficam sempre na frente dos demais.');
                      blocked.current = false;
                      setDragSlug(null);
                      setOverSlug(null);
                    }}
                    onClick={() => setSelected(m.slug)}
                    className={`cursor-pointer transition-colors hover:bg-white/5 ${dragSlug === m.slug ? 'opacity-40' : ''} ${valid && overSlug === m.slug ? 'bg-[#fd8539]/10 shadow-[inset_0_2px_0_#fd8539]' : ''}`}
                  >
                    <td className="px-3 py-3 font-bold text-slate-400">
                      <div className="flex cursor-grab items-center gap-1.5 active:cursor-grabbing">
                        <GripVertical size={14} className="text-slate-600" />
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <ModuleLogo url={m.logo_url} name={m.name} size={36} />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-white">{m.name}</p>
                          <p className="font-mono text-xs text-slate-600">{m.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${m.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : m.status === 'hidden' ? 'bg-slate-500/15 text-slate-400' : 'bg-amber-500/15 text-amber-300'}`}>
                        <span title={STATUS_TIP[m.status]}>{STATUS_LABEL[m.status] || m.status}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${m.is_public_for_sale ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-500/15 text-slate-400'}`}>
                        {m.is_public_for_sale ? 'À venda' : 'Fora de venda'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-white">{int(m.access)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-300">{int(m.paying)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-amber-300">{int(m.trial)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-white">{brl(m.mrr)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-[#fd8539]">{brlCents(revBy.get(m.slug) ?? 0)}</td>
                    <td className="px-3 py-3 text-right text-slate-300">{m.views === null ? '—' : int(m.views)}</td>
                    <td className="px-3 py-3 text-right text-slate-500"><ChevronRight size={16} /></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}