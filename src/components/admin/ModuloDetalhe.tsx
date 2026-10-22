import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import ModulePlansCard from '@/components/admin/ModulePlansCard';
import FeatureFlagsCard from '@/components/admin/FeatureFlagsCard';
import ModuloVitrineEditor, { parseFeatures } from '@/components/admin/ModuloVitrineEditor';
import StagingActionBar from '@/components/master/StagingActionBar';
import { useStagingPublish } from '@/hooks/useStagingPublish';
import {
  getModuleStores, getModulesOverview, updateHubModule, uploadModuleLogo,
  type ModuleOverview, type ModuleStoreRow,
} from '@/services/admin/modulesService';
import {
  CARD, CYCLE_LABEL, INPUT, SELECT, SUB_LABEL, Kpi, ModuleLogo, bytes, brl, int,
} from '@/components/admin/moduleUi';

const TH = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500';

type VitrineCfg = {
  name: string; status: string; is_public_for_sale: boolean;
  description: string; features: string[]; logo_url: string | null;
};

export default function ModuloDetalhe({ slug, onBack, onOpenStore, onOpenPlans }: {
  slug: string; onBack: () => void; onOpenStore: (id: string) => void; onOpenPlans: (slug: string) => void;
}) {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<ModuleOverview | null>(null);
  const [stores, setStores] = useState<ModuleStoreRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [pub, setPub] = useState(false);
  const [sort, setSort] = useState('1');
  const [logo, setLogo] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalDesc, setModalDesc] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  useEffect(() => {
    (supabase as any).from('hub_modules').select('modal_description').eq('slug', slug).maybeSingle()
      .then(({ data }: any) => setModalDesc(String(data?.modal_description ?? '')));
  }, [slug]);

  const saveModalDesc = async () => {
    setSavingDesc(true);
    const { error: err } = await (supabase as any).from('hub_modules')
      .update({ modal_description: modalDesc.trim() || null }).eq('slug', slug);
    setSavingDesc(false);
    if (err) toast.error(err.message); else toast.success('Resumo do modal salvo.');
  };
  const { confirm, dialog } = useConfirm();
  const filled = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveOk = useRef(false);

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
        setDescription(found.description ?? '');
        setFeaturesText((found.features ?? []).join('\n'));
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
    try { setLogo(await uploadModuleLogo(slug, file)); toast.success('Logo enviado. Clique em Aplicar na Loja Teste.'); }
    catch (e: any) { toast.error(e?.message || 'Falha no envio do logo.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    if (!m) return;
    saveOk.current = false;
    setSaving(true);
    try {
      const logoArg = logo === (m.logo_url ?? null) ? null : (logo ?? '');
      const feats = parseFeatures(featuresText);
      await updateHubModule(slug, name, status, status === 'active' ? pub : false, Number(sort) || 1, logoArg, description, feats);
      saveOk.current = true;
      toast.success('Módulo atualizado.');
      await load(true);
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const removeModule = async () => {
    const ok = await confirm({
      title: 'Excluir módulo',
      message: `"${m?.name || slug}" e seus planos e add-ons serão apagados. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    setDeleting(true);
    const { error: err } = await (supabase as any).rpc('admin_delete_hub_module', { p_slug: slug });
    setDeleting(false);
    if (err) { toast.error(err.message); return; }
    toast.success('Módulo excluído.');
    onBack();
  };

  const liveCfg = useMemo<VitrineCfg | undefined>(() => (m ? {
    name: m.name, status: m.status, is_public_for_sale: m.is_public_for_sale,
    description: m.description ?? '', features: m.features ?? [], logo_url: m.logo_url ?? null,
  } : undefined), [m]);

  const formCfg: VitrineCfg = {
    name: name.trim(), status, is_public_for_sale: status === 'active' ? pub : false,
    description, features: parseFeatures(featuresText), logo_url: logo,
  };

  const staging = useStagingPublish<VitrineCfg>('module', slug, liveCfg, {
    applyLive: async (c) => {
      const logoArg = c.logo_url === (m?.logo_url ?? null) ? null : (c.logo_url ?? '');
      await updateHubModule(slug, c.name, c.status, c.status === 'active' ? c.is_public_for_sale : false, Number(m?.sort_order) || 1, logoArg, c.description, c.features);
    },
    onSettled: (k) => { if (k !== 'save') void load(true); },
  });

  const draftApplied = useRef(false);
  useEffect(() => {
    if (!m || staging.loading || draftApplied.current) return;
    draftApplied.current = true;
    const d = staging.hasDraft ? staging.test : null;
    if (!d) return;
    setName(d.name); setStatus(d.status); setPub(!!d.is_public_for_sale);
    setDescription(d.description ?? ''); setFeaturesText((d.features ?? []).join('\n')); setLogo(d.logo_url ?? null);
  }, [m, staging.loading, staging.hasDraft, staging.test]);

  const term = q.trim().toLowerCase();
  const shown = (stores || []).filter((x) => !term || (x.name || '').toLowerCase().includes(term));
  const measured = !!m && m.events !== null;
  const ctr = m && m.views ? ((Number(m.clicks) || 0) / m.views) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0e1a] px-6 pb-3 pt-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[13px] font-bold text-slate-200 hover:bg-white/10">
            <ArrowLeft size={14} /> Módulos
          </button>
          {m && <ModuleLogo url={logo} name={name || m.name} size={40} />}
          <div>
            <h1 className="text-xl font-black text-white">{m?.name || 'Módulo'}</h1>
            <p className="font-mono text-xs text-slate-600">{slug}</p>
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

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[15px] text-rose-300">{error}</div>}

      {m && (
        <>
        <ModuloVitrineEditor
          slug={slug}
          name={name} setName={setName}
          status={status} setStatus={setStatus}
          pub={pub} setPub={setPub}
          sort={sort} setSort={setSort}
          logo={logo} setLogo={setLogo}
          description={description} setDescription={setDescription}
          featuresText={featuresText} setFeaturesText={setFeaturesText}
          fileRef={fileRef} onFile={onFile}
          uploading={uploading} saving={saving} onSave={save}
          footer={
            <div className="space-y-2">
              <div className="space-y-2 rounded-2xl border border-slate-800 bg-[#111524] p-4">
                <p className="text-[13px] font-bold uppercase tracking-wider text-slate-400">Resumo do modal de planos</p>
                <textarea value={modalDesc} maxLength={300} rows={3} onChange={(e) => setModalDesc(e.target.value)} className={INPUT}
                  placeholder="Texto que aparece no topo do modal de compra deste módulo." />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-600">{modalDesc.length}/300. Vazio usa a descrição da vitrine. Vale ao vivo ao salvar.</span>
                  <button type="button" disabled={savingDesc} onClick={saveModalDesc}
                    className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-1.5 text-[13px] font-bold text-white disabled:opacity-40">
                    {savingDesc ? 'Salvando…' : 'Salvar resumo'}
                  </button>
                </div>
              </div>
              <StagingActionBar staging={staging} config={formCfg} disabled={uploading || !name.trim()} />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={saving || uploading || !name.trim()}
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Salvar direto ao vivo',
                      message: 'As alterações vão para todas as lojas agora, e também na Loja Teste.',
                      confirmLabel: 'Salvar ao vivo',
                    });
                    if (!ok) return;
                    await save();
                    if (!saveOk.current) return;
                    const { error: syncErr } = await (supabase as any).rpc('admin_staging_sync_live', { p_scope: 'module', p_key: slug, p_config: formCfg });
                    if (syncErr) toast.error(syncErr.message); else await staging.load();
                  }}
                  className="cursor-pointer rounded-lg bg-[#fd8539] px-5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? 'Salvando…' : 'Salvar direto ao vivo'}
                </button>
              </div>
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className={`${CARD} space-y-3`}>
              <p className="text-[15px] font-bold text-white">Lojas e receita</p>
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
              <p className="text-[15px] font-bold text-white">Consumo e desempenho ({days} dias)</p>
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
                <p className="rounded-xl bg-white/[0.03] px-3 py-3 text-[13px] text-slate-500">O consumo deste módulo ainda não é medido.</p>
              )}
              <p className={`text-[13px] ${m.errors ? 'text-rose-300' : 'text-slate-500'}`}>
                {m.errors ? `${int(m.errors)} erro(s) registrado(s) no período.` : 'Nenhum erro registrado no período.'}
              </p>
            </div>

            <div className={`${CARD} space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15px] font-bold text-white">Lojas com acesso{stores ? ` (${stores.length})` : ''}</p>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar loja..." className={`${INPUT} max-w-[220px]`} />
              </div>
              {stores === null ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
              ) : stores.length === 0 ? (
                <p className="text-[13px] text-slate-500">Nenhuma loja com acesso.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full min-w-[560px] text-[13px]">
                    <thead className="border-b border-slate-800">
                      <tr><th className={TH}>Loja</th><th className={TH}>Plano</th><th className={TH}>Ciclo</th><th className={TH}>Origem</th><th className={TH}>Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {shown.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Nenhuma loja encontrada.</td></tr>}
                      {shown.map((s) => (
                        <tr key={s.id} onClick={() => onOpenStore(s.id)} className="cursor-pointer hover:bg-white/5">
                          <td className="px-3 py-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); onOpenStore(s.id); }} className="cursor-pointer text-left font-bold text-white underline-offset-2 hover:text-[#fd8539] hover:underline">
                              {s.name || 'Sem nome'}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-slate-300">{s.plan_name || '—'}</td>
                          <td className="px-3 py-2 text-slate-400">{s.status === 'lifetime' ? 'Vitalício' : s.billing_cycle ? CYCLE_LABEL[s.billing_cycle] || s.billing_cycle : '—'}</td>
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
            <ModulePlansCard slug={slug} onManage={() => onOpenPlans(slug)} />
            <FeatureFlagsCard slug={slug} />
            <div className="space-y-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
              <p className="text-[15px] font-bold text-rose-300">Zona de perigo</p>
              <p className="text-[13px] text-slate-500">Só é possível excluir módulos sem assinaturas e fora de combos. Nos demais casos, use o status "Oculto".</p>
              <button type="button" disabled={deleting} onClick={removeModule} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-[13px] font-bold text-white hover:bg-rose-500 disabled:opacity-40">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir módulo
              </button>
            </div>
            {dialog}
          </div>
        </div>
        </>
      )}
    </div>
  );
}