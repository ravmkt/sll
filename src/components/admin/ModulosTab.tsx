import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getModuleStores, getModulesOverview, updateHubModule,
  type ModuleOverview, type ModuleStoreRow, type ModulesData,
} from '@/services/admin/modulesService';

const CARD = 'rounded-2xl border border-slate-800 bg-[#111524] p-4';
const INPUT = 'h-9 w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 text-xs text-slate-200 outline-none focus:border-[#0094eb]';
const SELECT = 'h-8 rounded-lg border border-slate-700 bg-[#0b0e1a] px-2 text-xs text-slate-200 outline-none focus:border-[#0094eb]';

const STATUS_LABEL: Record<string, string> = { active: 'Ativo', coming_soon: 'Em breve' };
const SUB_LABEL: Record<string, string> = { active: 'Ativa', trialing: 'Trial', past_due: 'Em atraso', lifetime: 'Vitalícia' };
const CYCLE_LABEL: Record<string, string> = { monthly: 'Mensal', semiannual: 'Semestral', annual: 'Anual' };

const int = (n: number | null | undefined) => (Number(n) || 0).toLocaleString('pt-BR');
const brl = (cents: number) => ((Number(cents) || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const bytes = (b: number | null) => {
  const mb = (Number(b) || 0) / 1048576;
  return mb < 1024 ? `${mb.toFixed(1).replace('.', ',')} MB` : `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
};

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-black ${tone || 'text-white'}`}>{value}</p>
    </div>
  );
}

function ModuleDrawer({ m, onClose, onSaved, onOpenStore }: {
  m: ModuleOverview; onClose: () => void; onSaved: () => void; onOpenStore: (id: string) => void;
}) {
  const [name, setName] = useState(m.name);
  const [status, setStatus] = useState(m.status);
  const [pub, setPub] = useState(m.is_public_for_sale);
  const [sort, setSort] = useState(String(m.sort_order ?? 0));
  const [busy, setBusy] = useState(false);
  const [stores, setStores] = useState<ModuleStoreRow[] | null>(null);

  useEffect(() => {
    getModuleStores(m.slug).then(setStores).catch((e: any) => { toast.error(e?.message || 'Erro ao listar lojas.'); setStores([]); });
  }, [m.slug]);

  const save = async () => {
    setBusy(true);
    try {
      await updateHubModule(m.slug, name, status, status === 'active' ? pub : false, Number(sort) || 0);
      toast.success('Módulo atualizado.');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-md space-y-5 overflow-y-auto border-l border-slate-800 bg-[#0f1322] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Editar módulo</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
              <option value="active">Ativo</option>
              <option value="coming_soon">Em breve</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={status === 'active' && pub} disabled={status !== 'active'} onChange={(e) => setPub(e.target.checked)} />
            À venda para os lojistas {status !== 'active' && <span className="text-slate-500">(só módulos ativos)</span>}
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ordem de exibição</span>
            <input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className={INPUT} />
          </label>
          <p className="text-[11px] text-slate-500">Chave técnica: <span className="font-mono">{m.slug}</span> (não editável).</p>
          <button type="button" disabled={busy || !name.trim()} onClick={save} className="rounded-lg bg-[#fd8539] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
            {busy ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-white">Lojas com acesso</p>
          {stores === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
          ) : stores.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma loja com acesso.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-slate-800">
              {stores.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onOpenStore(s.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/5">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-white">{s.name || 'Sem nome'}</span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {s.plan_name || '—'}{s.billing_cycle ? ` · ${CYCLE_LABEL[s.billing_cycle] || s.billing_cycle}` : ''}{s.via_combo ? ' · via combo' : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">{SUB_LABEL[s.status] || s.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModulosTab({ onOpenStore }: { onOpenStore: (id: string) => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ModulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ModuleOverview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await getModulesOverview(days)); }
    catch (e: any) { setError(e?.message || 'Erro ao carregar os módulos.'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0e1a] px-6 pb-3 pt-6">
        <div>
          <h1 className="text-xl font-black text-white">Módulos</h1>
          <p className="text-xs text-slate-500">Uso, receita e desempenho de cada módulo do SLL.</p>
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
            <p className="text-[11px] text-slate-500">Lojas com combo contam como acesso em cada módulo abaixo. A receita do combo não é dividida entre eles.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {data.modules.map((m) => {
              const measured = m.events !== null;
              const ctr = m.views ? ((Number(m.clicks) || 0) / m.views) * 100 : 0;
              return (
                <div key={m.slug} className={`${CARD} space-y-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-white">{m.name}</h2>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                          {STATUS_LABEL[m.status] || m.status}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.is_public_for_sale ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-500/15 text-slate-400'}`}>
                          {m.is_public_for_sale ? 'À venda' : 'Fora de venda'}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-600">{m.slug}</p>
                    </div>
                    <button type="button" onClick={() => setEditing(m)} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10">
                      <Pencil size={12} /> Editar
                    </button>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Lojas e receita</p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      <Kpi label="Com acesso" value={int(m.access)} />
                      <Kpi label="Pagantes" value={int(m.paying)} tone="text-emerald-300" />
                      <Kpi label="Em trial" value={int(m.trial)} tone="text-sky-300" />
                      <Kpi label="Inadimplentes" value={int(m.past_due)} tone={m.past_due ? 'text-rose-300' : undefined} />
                      <Kpi label="Vitalícias" value={int(m.lifetime)} />
                      <Kpi label="Receita mensal" value={brl(m.mrr)} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Consumo e desempenho ({data.days} dias)</p>
                    {measured ? (
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        <Kpi label="Views" value={int(m.views)} />
                        <Kpi label="Cliques" value={int(m.clicks)} />
                        <Kpi label="CTR" value={`${ctr.toFixed(1).replace('.', ',')}%`} />
                        <Kpi label="Lojas ativas" value={int(m.active_stores)} />
                        <Kpi label="Vídeos" value={int(m.videos)} />
                        <Kpi label="Espaço" value={bytes(m.storage_bytes)} />
                      </div>
                    ) : (
                      <p className="rounded-xl bg-white/[0.03] px-3 py-3 text-xs text-slate-500">O consumo deste módulo ainda não é medido.</p>
                    )}
                    <p className={`mt-2 text-[11px] ${m.errors ? 'text-rose-300' : 'text-slate-500'}`}>
                      {m.errors ? `${int(m.errors)} erro(s) registrado(s) no período.` : 'Nenhum erro registrado no período.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {editing && (
        <ModuleDrawer
          key={editing.slug}
          m={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
          onOpenStore={(id) => { setEditing(null); onOpenStore(id); }}
        />
      )}
    </div>
  );
}