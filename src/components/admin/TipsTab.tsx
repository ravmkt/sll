import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pause, Pencil, Play, Plus, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { CATEGORIES, METRICS, OPERATORS, categoryLabel, type Operator, type Trigger } from '@/lib/tipsMetrics';
import { NICHES } from '@/components/onboarding/shared';
import { deleteTip, listAllTips, saveTip, setTipStatus, type Tip, type TipInput } from '@/services/tipsService';

const IN = 'w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#0094eb]';
const LBL = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400';

const EMPTY: TipInput = {
  title: '', content: '', category: 'conversao', niche: ['geral'], metric_trigger: null,
  action_label: null, action_url: null, estimated_minutes: 5, is_featured: false, status: true,
};

export default function TipsTab() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TipInput | null>(null);
  const [useTrigger, setUseTrigger] = useState(false);
  const [trig, setTrig] = useState<{ metric: string; operator: Operator; value: string }>({ metric: 'ctr', operator: '<', value: '2' });
  const [minutes, setMinutes] = useState('5');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try { setTips(await listAllTips()); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? tips.filter((t) => t.title.toLowerCase().includes(s) || t.content.toLowerCase().includes(s)) : tips;
  }, [tips, q]);

  const openNew = () => {
    setEditId(null); setForm({ ...EMPTY }); setUseTrigger(false); setMinutes('5');
    setTrig({ metric: 'ctr', operator: '<', value: '2' });
  };
  const openEdit = (t: Tip) => {
    setEditId(t.id);
    setForm({
      title: t.title, content: t.content, category: t.category, niche: t.niche?.length ? t.niche : ['geral'],
      metric_trigger: t.metric_trigger, action_label: t.action_label, action_url: t.action_url,
      estimated_minutes: t.estimated_minutes, is_featured: t.is_featured, status: t.status,
    });
    setUseTrigger(!!t.metric_trigger);
    if (t.metric_trigger) setTrig({ metric: t.metric_trigger.metric, operator: t.metric_trigger.operator, value: String(t.metric_trigger.value) });
    setMinutes(t.estimated_minutes ? String(t.estimated_minutes) : '');
  };

  const set = <K extends keyof TipInput>(k: K, v: TipInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const toggleNiche = (n: string) => {
    if (!form) return;
    const has = form.niche.includes(n);
    const next = has ? form.niche.filter((x) => x !== n) : [...form.niche, n];
    set('niche', next);
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.content.trim()) { toast.error('Informe título e conteúdo.'); return; }
    if (form.niche.length === 0) { toast.error('Selecione ao menos um nicho (ou Geral).'); return; }
    let trigger: Trigger | null = null;
    if (useTrigger) {
      const v = Number(trig.value.replace(',', '.'));
      if (!Number.isFinite(v)) { toast.error('Valor do gatilho inválido.'); return; }
      trigger = { metric: trig.metric, operator: trig.operator, value: v };
    }
    const min = minutes.trim() === '' ? null : Number(minutes);
    if (min !== null && (!Number.isInteger(min) || min < 1 || min > 240)) { toast.error('Tempo entre 1 e 240 minutos.'); return; }
    const url = (form.action_url || '').trim();
    if (url && !/^(\/|https?:\/\/)/i.test(url)) { toast.error('O link deve começar com / ou https://'); return; }

    setBusy(true);
    try {
      await saveTip({
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        metric_trigger: trigger,
        action_label: (form.action_label || '').trim() || null,
        action_url: url || null,
        estimated_minutes: min,
      }, editId ?? undefined);
      toast.success('Dica salva.');
      setForm(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (t: Tip) => {
    try { await setTipStatus(t.id, !t.status); await load(); } catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (t: Tip) => {
    if (!(await confirm({ title: 'Excluir dica', message: `"${t.title}" será apagada, junto com o feedback dos lojistas.`, confirmLabel: 'Excluir' }))) return;
    try { await deleteTip(t.id); await load(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Dicas do Noah</h1>
          <p className="text-xs text-slate-500">Cadastre dicas por nicho, categoria e gatilho de métrica. Aparecem em /dashboard/dicas.</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className={`${IN} !w-48 !py-1.5`} />
          <button type="button" onClick={openNew} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fd8539] px-3 py-2 text-xs font-bold text-white">
            <Plus size={14} /> Nova dica
          </button>
        </div>
      </div>

      {form && (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#111524] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-yellow-300">{editId ? 'Editar dica' : 'Nova dica'}</h2>
            <button type="button" onClick={() => setForm(null)} className="cursor-pointer text-slate-400 hover:text-white"><X size={16} /></button>
          </div>

          <label className="block"><span className={LBL}>Título</span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className={IN} /></label>

          <label className="block"><span className={LBL}>Conteúdo (parágrafos separados por linha em branco, listas com "- ", **negrito**)</span>
            <textarea rows={7} value={form.content} onChange={(e) => set('content', e.target.value)} className={IN} /></label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block"><span className={LBL}>Categoria</span>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className={`${IN} cursor-pointer`}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select></label>
            <label className="block"><span className={LBL}>Tempo estimado (min)</span>
              <input value={minutes} onChange={(e) => setMinutes(e.target.value)} className={IN} /></label>
            <div className="flex items-end gap-4 pb-2 text-xs text-slate-200">
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Destaque</label>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={form.status} onChange={(e) => set('status', e.target.checked)} /> Ativa</label>
            </div>
          </div>

          <div>
            <span className={LBL}>Nichos</span>
            <div className="flex flex-wrap gap-2">
              {['geral', ...NICHES].map((n) => {
                const on = form.niche.includes(n);
                return (
                  <button key={n} type="button" onClick={() => toggleNiche(n)}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${on ? 'border-[#0094eb] bg-[#0094eb]/20 text-sky-200' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                    {n === 'geral' ? 'Geral (todos)' : n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200">
              <input type="checkbox" checked={useTrigger} onChange={(e) => setUseTrigger(e.target.checked)} />
              Usar gatilho de métrica (dica vira Diagnóstico Prioritário quando a condição for verdadeira)
            </label>
            {useTrigger && (
              <div className="grid grid-cols-3 gap-3">
                <select value={trig.metric} onChange={(e) => setTrig({ ...trig, metric: e.target.value })} className={`${IN} cursor-pointer`}>
                  {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <select value={trig.operator} onChange={(e) => setTrig({ ...trig, operator: e.target.value as Operator })} className={`${IN} cursor-pointer`}>
                  {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input value={trig.value} onChange={(e) => setTrig({ ...trig, value: e.target.value })} className={IN} placeholder="Valor" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block"><span className={LBL}>Texto do botão (opcional)</span>
              <input value={form.action_label ?? ''} onChange={(e) => set('action_label', e.target.value)} className={IN} placeholder="Ajustar agora" /></label>
            <label className="block"><span className={LBL}>Link do botão (opcional)</span>
              <input value={form.action_url ?? ''} onChange={(e) => set('action_url', e.target.value)} className={IN} placeholder="/dashboard/produtos ou https://..." /></label>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">Cancelar</button>
            <button type="button" disabled={busy} onClick={save} className="cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2 text-xs font-bold text-white disabled:opacity-40">
              {busy ? 'Salvando...' : 'Salvar dica'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-800 bg-[#111524] py-10 text-center text-sm text-slate-500">Nenhuma dica cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((t) => (
            <div key={t.id} className={`flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-[#111524] p-3 ${t.status ? '' : 'opacity-50'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {t.is_featured && <Star size={13} className="fill-yellow-400 text-yellow-400" />}
                  <p className="truncate text-sm font-semibold text-slate-100">{t.title}</p>
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-300">{categoryLabel(t.category)}</span>
                  {t.metric_trigger && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {t.metric_trigger.metric} {t.metric_trigger.operator} {t.metric_trigger.value}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">{(t.niche || []).join(', ')}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" title={t.status ? 'Pausar' : 'Ativar'} onClick={() => toggle(t)} className="cursor-pointer rounded-lg p-2 text-slate-300 hover:bg-white/10">
                  {t.status ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button type="button" title="Editar" onClick={() => openEdit(t)} className="cursor-pointer rounded-lg p-2 text-slate-300 hover:bg-white/10"><Pencil size={15} /></button>
                <button type="button" title="Excluir" onClick={() => remove(t)} className="cursor-pointer rounded-lg p-2 text-rose-400 hover:bg-white/10"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
}