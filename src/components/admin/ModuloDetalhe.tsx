import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flag, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ModulePlansCard from '@/components/admin/ModulePlansCard';
import {
  getModuleStores, getModulesOverview, updateHubModule, uploadModuleLogo,
  type ModuleOverview, type ModuleStoreRow,
} from '@/services/admin/modulesService';
import {
  CARD, CYCLE_LABEL, INPUT, SELECT, STATUS_LABEL, SUB_LABEL, Kpi, ModuleLogo, bytes, brl, int,
} from '@/components/admin/moduleUi';

const TH = 'px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';
const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';

export default function ModuloDetalhe({ slug, onBack, onOpenStore, onOpenPlans }: {
  slug: string; onBack: () => void; onOpenStore: (id: string) => void; onOpenPlans: (slug: string) => void;
}) {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<ModuleOverview | null>(null);
  const [stores, setStores] = useState<ModuleStoreRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [pub, setPub] = useState(false);
  const [sort, setSort] = useState('1');
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const filled = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (fill: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await getModulesOverview(days);
      const found = res.modules.find((x) => x.slug === slug) || null;
      if (!found) { setError('Módulo não encontrado.'); return; }
      setM(found);
      if (fill || !filled.current) {
        setName(found.name);
        setStatus(found.status);
        setPub(found.is_public_for_sale);
        setSort(String(found.sort_order ?? 1));
        setLogo(found.logo_url);
        filled.current = true;
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar o módulo.');
    } finally {
      setLoading(false);
    }
  }, [days, slug]);

  useEffect(() => { load(false); }, [load]);

  useEffect(() => {
    getModuleStores(slug).then(setStores).catch((e: any) => { toast.error(e?.message || 'Erro ao listar lojas.'); setStores([]); });
  }, [slug]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try { setLogo(await uploadModuleLogo(slug, file)); toast.success('Logo enviado. Clique em Salvar para aplicar.'); }
    catch (e: any) { toast.error(e?.message || 'Falha no envio do logo.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    if (!m) return;
    setSaving(true);
    try {
      const logoArg = logo === (m.logo_url ?? null) ? null : (logo ?? '');
      await updateHubModule(slug, name, status, status === 'active' ? pub : false, Number(sort) || 1, logoArg);
      toast.success('Módulo atualizado.');
      await load(true);
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const measured = !!m && m.events !== null;
  const ctr = m && m.views ? ((Number(m.clicks) || 0) / m.views) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0e1a] px-6 pb-3 pt-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10">
            <ArrowLeft size={14} /> Módulos
          </button>
          {m && <ModuleLogo url={logo} name={name || m.name} size={40} />}
          <div>
            <h1 className="text-xl font-black text-white">{m?.name || 'Módulo'}</h1>
            <p className="font-mono text-[10px] text-slate-600">{slug}</p>
          </div>
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

      {m && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className={`${CARD} space-y-3`}>
              <p className="text-sm font-bold text-white">Lojas e receita</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <Kpi label="Com acesso" value={int(m.access)} />
                <Kpi label="Pagantes" value={int(m.paying)} tone="text-emerald-300" />
                <Kpi label="Em trial" value={int(m.trial)} tone="text-sky-300" />
                <Kpi label="Inadimplentes" value={int(m.past_due)} tone={m.past_due ? 'text-rose-300' : undefined} />
                <Kpi label="Vitalícias" value={int(m.lifetime)} />
                <Kpi label="Receita mensal" value={brl(m.mrr)} />
              </div>
            </div>

            <div className={`${CARD} space-y-3`}>
              <p className="text-sm font-bold text-white">Consumo e desempenho ({days} dias)</p>
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
              <p className={`text-[11px] ${m.errors ? 'text-rose-300' : 'text-slate-500'}`}>
                {m.errors ? `${int(m.errors)} erro(s) registrado(s) no período.` : 'Nenhum erro registrado no período.'}
              </p>
            </div>

            <div className={`${CARD} space-y-3`}>
              <p className="text-sm font-bold text-white">Lojas com acesso</p>
              {stores === null ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
              ) : stores.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma loja com acesso.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead className="border-b border-slate-800">
                      <tr><th className={TH}>Loja</th><th className={TH}>Plano</th><th className={TH}>Ciclo</th><th className={TH}>Origem</th><th className={TH}>Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stores.map((s) => (
                        <tr key={s.id} onClick={() => onOpenStore(s.id)} className="cursor-pointer hover:bg-white/5">
                          <td className="px-3 py-2 font-bold text-white">{s.name || 'Sem nome'}</td>
                          <td className="px-3 py-2 text-slate-300">{s.plan_name || '—'}</td>
                          <td className="px-3 py-2 text-slate-400">{s.billing_cycle ? CYCLE_LABEL[s.billing_cycle] || s.billing_cycle : '—'}</td>
                          <td className="px-3 py-2 text-slate-400">{s.via_combo ? 'Combo' : 'Individual'}</td>
                          <td className="px-3 py-2 text-slate-300">{SUB_LABEL[s.status] || s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${CARD} space-y-4`}>
              <p className="text-sm font-bold text-white">Dados do módulo</p>

              <div className="space-y-2">
                <span className={LABEL}>Logo</span>
                <div className="flex items-center gap-3">
                  <ModuleLogo url={logo} name={name || m.name} size={56} />
                  <div className="flex flex-col gap-1.5">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                    <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40">
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />} Enviar imagem
                    </button>
                    {logo && (
                      <button type="button" onClick={() => setLogo(null)} className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-500 hover:text-rose-300">
                        <Trash2 size={12} /> Remover logo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-600">PNG, JPG, SVG ou WebP, até 2 MB. Fundo transparente fica melhor.</p>
              </div>

              <label className="block space-y-1">
                <span className={LABEL}>Nome</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
              </label>
              <label className="block space-y-1">
                <span className={LABEL}>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
                  <option value="active">{STATUS_LABEL.active}</option>
                  <option value="coming_soon">{STATUS_LABEL.coming_soon}</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={status === 'active' && pub} disabled={status !== 'active'} onChange={(e) => setPub(e.target.checked)} />
                À venda para os lojistas {status !== 'active' && <span className="text-slate-500">(só módulos ativos)</span>}
              </label>
              <label className="block space-y-1">
                <span className={LABEL}>Posição na lista</span>
                <input type="number" min={1} value={sort} onChange={(e) => setSort(e.target.value)} className={INPUT} />
                <span className="block text-[10px] text-slate-600">Os outros módulos se ajustam sozinhos, sem repetir posição.</span>
              </label>
              <button type="button" disabled={saving || uploading || !name.trim()} onClick={save} className="w-full cursor-pointer rounded-lg bg-[#fd8539] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>

            <ModulePlansCard slug={slug} onManage={() => onOpenPlans(slug)} />
            <div className={`${CARD} space-y-2`}>
              <p className="flex items-center gap-2 text-sm font-bold text-white"><Flag size={14} className="text-[#fd8539]" /> Feature flags</p>
              <p className="text-xs text-slate-500">Em breve: liberar funcionalidades beta para lojas específicas antes do lançamento geral.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}