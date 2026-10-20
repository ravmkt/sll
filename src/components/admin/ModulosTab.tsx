import { useCallback, useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { deleteHubModule, getModulesOverview, reorderHubModules, updateHubModule, type ModuleOverview, type ModulesData } from '@/services/admin/modulesService';
import { getModulesRevenue, listStoreOptions, type ModulesRevenue, type StoreOpt } from '@/services/admin/modulesRevenue';
import ModuloDetalhe from '@/components/admin/ModuloDetalhe';
import NovoModuloModal from '@/components/admin/NovoModuloModal';
import ComboSection from '@/components/admin/ComboSection';
import ComboDiscountCard from '@/components/admin/ComboDiscountCard';
import RevenueSection from '@/components/admin/RevenueSection';
import ItemCard, { BTN } from '@/components/admin/ItemCard';
import SandboxStoreSelect from '@/components/master/SandboxStoreSelect';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { SELECT } from '@/components/admin/moduleUi';

const STATUS_TIP: Record<string, string> = {
  active: 'Ativo: visível e disponível para contratação.',
  coming_soon: 'Em breve: aparece como lançamento, ainda sem contratação.',
  hidden: 'Oculto: invisível para os lojistas (rascunho/pausado).',
};
const STATUS_DOT: Record<string, 'green' | 'yellow' | 'gray'> = { active: 'green', coming_soon: 'yellow', hidden: 'gray' };

export default function ModulosTab({ onOpenStore, onOpenPlans }: { onOpenStore: (id: string) => void; onOpenPlans: (slug: string) => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ModulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragSlug, setDragSlug] = useState<string | null>(null);
  const [overSlug, setOverSlug] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [rev, setRev] = useState<ModulesRevenue | null>(null);
  const [revLoading, setRevLoading] = useState(false);
  const [store, setStore] = useState('');
  const [stores, setStores] = useState<StoreOpt[]>([]);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await getModulesOverview(30)); }
    catch (e: any) { setError(e?.message || 'Erro ao carregar os módulos.'); }
    finally { setLoading(false); }
  }, []);

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

  const list: ModuleOverview[] = data
    ? [...data.modules].sort(
        (a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || (a.sort_order ?? 999) - (b.sort_order ?? 999),
      )
    : [];
  const logos = Object.fromEntries(list.map((m) => [m.slug, m.logo_url])) as Record<string, string | null>;
  const revBy = new Map((rev?.items || []).filter((i) => !i.is_combo).map((i) => [i.item_key, Number(i.cents) || 0] as [string, number]));

  const dropOn = async (target: ModuleOverview) => {
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

  const dnd = (m: ModuleOverview) => {
    const src = list.find((x) => x.slug === dragSlug);
    const same = !!src && (src.status === 'active') === (m.status === 'active');
    return {
      draggable: true,
      onDragStart: (e: DragEvent<HTMLDivElement>) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', m.slug); setDragSlug(m.slug); },
      onDragOver: (e: DragEvent<HTMLDivElement>) => { if (same) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overSlug !== m.slug) setOverSlug(m.slug); } },
      onDrop: (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); dropOn(m); },
      onDragEnd: () => { setDragSlug(null); setOverSlug(null); },
    };
  };

  const toggleStatus = async (m: ModuleOverview) => {
    const hide = m.status === 'active';
    if (hide && !(await confirm({ title: 'Pausar módulo', message: `"${m.name}" deixará de aparecer na vitrine para novas contratações.`, confirmLabel: 'Pausar' }))) return;
    setBusySlug(m.slug);
    try {
      await updateHubModule(m.slug, m.name, hide ? 'hidden' : 'active', m.is_public_for_sale, m.sort_order);
      toast.success(hide ? 'Módulo pausado.' : 'Módulo ativado.');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível alterar o status.');
    } finally {
      setBusySlug(null);
    }
  };

  const remove = async (m: ModuleOverview) => {
    if (!(await confirm({ title: 'Excluir módulo', message: `"${m.name}" será apagado e essa ação não pode ser desfeita.`, confirmLabel: 'Excluir' }))) return;
    setBusySlug(m.slug);
    try {
      await deleteHubModule(m.slug);
      toast.success('Módulo excluído.');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível excluir.');
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0e1a] px-6 pb-3 pt-6">
        <div>
          <h1 className="text-xl font-black text-white">Módulos</h1>
          <p className="text-[13px] text-slate-500">Arraste os cards para mudar a ordem da vitrine; módulos ativos ficam sempre na frente.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${SELECT} cursor-pointer`}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={180}>Últimos 6 meses</option>
            <option value={365}>Últimos 12 meses</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[15px] text-rose-300">{error}</div>}
      {creating && <NovoModuloModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}

      <SandboxStoreSelect />

      <RevenueSection data={rev} loading={revLoading} stores={stores} store={store} onStore={setStore} />

      <ComboSection rev={rev} logos={logos} store={store} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[15px] font-black uppercase tracking-wider text-white">Módulos</h2>
          <button type="button" onClick={() => setCreating(true)} className="flex cursor-pointer items-center gap-1 text-[13px] font-bold text-[#fd8539] hover:opacity-80">
            <Plus size={14} /> Módulo
          </button>
          <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Ativo</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-yellow-400" /> Em breve</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-slate-500" /> Oculto</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((m) => (
            <ItemCard
              key={m.slug}
              kind="module"
              dot={{ color: STATUS_DOT[m.status] || 'gray', tip: STATUS_TIP[m.status] || m.status }}
              logos={[{ url: m.logo_url, name: m.name }]}
              title={m.name}
              subtitle={m.is_public_for_sale ? undefined : 'Fora de venda'}
              stats={{ total: Number(m.access) || 0, trial: Number(m.trial) || 0, paying: Number(m.paying) || 0 }}
              revenue={revBy.get(m.slug) ?? 0}
              onOpen={() => setSelected(m.slug)}
              dnd={dnd(m)}
              dim={dragSlug === m.slug}
              highlight={!!dragSlug && dragSlug !== m.slug && overSlug === m.slug}
              actions={
                <>
                  <button type="button" onClick={() => setSelected(m.slug)} className={`${BTN} bg-white/5 text-slate-200 hover:bg-white/10`}>Editar</button>
                  <button type="button" disabled={busySlug === m.slug} onClick={() => toggleStatus(m)}
                    className={`${BTN} ${m.status === 'active' ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}>
                    {m.status === 'active' ? 'Pausar' : 'Ativar'}
                  </button>
                  <button type="button" disabled={busySlug === m.slug || (Number(m.access) || 0) > 0} onClick={() => remove(m)}
                    title={(Number(m.access) || 0) > 0 ? 'Módulo com lojas: use Pausar' : 'Excluir módulo'}
                    className={`${BTN} bg-rose-500/15 text-rose-300 hover:bg-rose-500/25`}>Excluir</button>
                </>
              }
            />
          ))}
        </div>
      </section>

      <ComboDiscountCard />
      {dialog}
    </div>
  );
}