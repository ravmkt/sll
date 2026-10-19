import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ClipboardList, Copy, Loader2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  deleteNpsSurvey, listAdminStores, listNpsStats, listNpsSurveys, resetNpsStore, saveNpsSurvey,
  type AdminQuestion, type AdminSurvey, type NpsStat, type QType,
} from '@/services/admin/npsSurveys';

const SCROLL = 'overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700';
const INPUT = 'w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#0094eb]';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400';
const ICONBTN = 'cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-30';
const TH = 'px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const TYPES: { v: QType; label: string }[] = [
  { v: 'nps', label: 'Nota de 0 a 10' },
  { v: 'single', label: 'Escolha única' },
  { v: 'multi', label: 'Múltipla escolha' },
  { v: 'text', label: 'Texto livre' },
];

const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const hasOptions = (t: QType) => t === 'single' || t === 'multi';

const newQuestion = (type: QType): AdminQuestion => ({
  type, title: '', required: false, placeholder: null, allow_other: false,
  options: hasOptions(type) ? [{ key: 'o_' + uid(), label: '' }] : [],
});

const newSurvey = (): AdminSurvey => ({
  name: 'Nova pesquisa', enabled: false,
  invite_title: 'Como está sendo sua experiência com o SLL?',
  invite_text: 'Leva menos de 1 minuto.',
  min_days_after_signup: 0, cooldown_days: 90, dismiss_days: 30,
  target: 'all', store_ids: [],
  questions: [{ ...newQuestion('nps'), title: 'De 0 a 10, o quanto você recomendaria o SLL a outro lojista?', required: true }],
});

const rule = (s: AdminSurvey) => {
  const when = s.min_days_after_signup > 0 ? `${s.min_days_after_signup} dia(s) após o cadastro` : 'Logo após o cadastro';
  const who = s.target === 'all' ? 'todas as lojas' : `${s.store_ids.length} loja(s)`;
  return `${when} · repete a cada ${s.cooldown_days} dias · volta em ${s.dismiss_days} dias se dispensar · ${who}`;
};

export default function NpsSurveysModal() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [surveys, setSurveys] = useState<AdminSurvey[]>([]);
  const [stats, setStats] = useState<Record<string, NpsStat>>({});
  const [draft, setDraft] = useState<AdminSurvey | null>(null);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState('');
  const [resetStore, setResetStore] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      setSurveys(await listNpsSurveys());
      setStats(await listNpsStats().catch(() => ({})));
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar pesquisas');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!open) return;
    setView('list'); setMsg(''); setErr('');
    void load();
    listAdminStores().then(setStores).catch(() => { /* opcional */ });
  }, [open, load]);

  const edit = (s: AdminSurvey | null) => { setDraft(s ? clone(s) : newSurvey()); setView('edit'); setMsg(''); setErr(''); };

  const set = (p: Partial<AdminSurvey>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const mapQ = (fn: (qs: AdminQuestion[]) => AdminQuestion[]) => setDraft((d) => (d ? { ...d, questions: fn(d.questions) } : d));
  const setQ = (i: number, p: Partial<AdminQuestion>) => mapQ((qs) => qs.map((q, n) => (n === i ? { ...q, ...p } : q)));
  const moveQ = (i: number, dir: -1 | 1) => mapQ((qs) => {
    const j = i + dir;
    if (j < 0 || j >= qs.length) return qs;
    const c = [...qs]; const t = c[i]; c[i] = c[j]; c[j] = t;
    return c;
  });
  const delQ = (i: number) => mapQ((qs) => qs.filter((_, n) => n !== i));
  const dupQ = (i: number) => mapQ((qs) => {
    const src = clone(qs[i]);
    const copy: AdminQuestion = { ...src, id: undefined, legacy_key: null, options: src.options.map((o) => ({ key: 'o_' + uid(), label: o.label })) };
    return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
  });
  const changeType = (i: number, type: QType) => mapQ((qs) => qs.map((q, n) => {
    if (n !== i) return q;
    const opts = hasOptions(type) && q.options.length === 0 ? [{ key: 'o_' + uid(), label: '' }] : q.options;
    return { ...q, type, options: opts, allow_other: hasOptions(type) ? q.allow_other : false };
  }));
  const setOpt = (i: number, key: string, label: string) => setQ(i, { options: draft!.questions[i].options.map((o) => (o.key === key ? { ...o, label } : o)) });
  const addOpt = (i: number) => setQ(i, { options: [...draft!.questions[i].options, { key: 'o_' + uid(), label: '' }] });
  const delOpt = (i: number, key: string) => setQ(i, { options: draft!.questions[i].options.filter((o) => o.key !== key) });
  const toggleStore = (id: string) => {
    if (!draft) return;
    set({ store_ids: draft.store_ids.includes(id) ? draft.store_ids.filter((x) => x !== id) : [...draft.store_ids, id] });
  };

  const save = async () => {
    if (!draft) return;
    setErr(''); setMsg('');
    if (!draft.name.trim()) { setErr('Dê um nome à pesquisa.'); return; }
    if (!draft.questions.length) { setErr('Adicione ao menos uma pergunta.'); return; }
    if (draft.target === 'stores' && draft.store_ids.length === 0) { setErr('Selecione ao menos uma loja ou use "Todas as lojas".'); return; }
    for (let i = 0; i < draft.questions.length; i++) {
      const q = draft.questions[i];
      if (!q.title.trim()) { setErr(`Pergunta ${i + 1}: informe o texto.`); return; }
      if (hasOptions(q.type)) {
        if (q.options.length === 0 && !q.allow_other) { setErr(`Pergunta ${i + 1}: adicione ao menos uma opção.`); return; }
        if (q.options.some((o) => !o.label.trim())) { setErr(`Pergunta ${i + 1}: há opção vazia (preencha ou exclua na lixeira).`); return; }
      }
    }
    setSaving(true);
    try {
      await saveNpsSurvey(draft);
      await load();
      setView('list');
      setMsg('Pesquisa salva.');
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const toggleEnabled = async (s: AdminSurvey) => {
    setErr(''); setMsg('');
    try {
      await saveNpsSurvey({ ...s, enabled: !s.enabled });
      await load();
      setMsg(s.enabled ? 'Pesquisa desativada.' : 'Pesquisa ativada.');
    } catch (e: any) { setErr(e?.message ?? 'Erro ao atualizar'); }
  };

  const remove = async (s: AdminSurvey) => {
    if (!s.id) return;
    if (!window.confirm(`Excluir a pesquisa "${s.name}"? As perguntas serão apagadas; as respostas já enviadas continuam no histórico.`)) return;
    try { await deleteNpsSurvey(s.id); await load(); setMsg('Pesquisa excluída.'); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao excluir'); }
  };

  const reset = async () => {
    if (!resetStore) { setErr('Escolha a loja que será resetada.'); return; }
    const nm = stores.find((s) => s.id === resetStore)?.name ?? 'a loja';
    if (!window.confirm(`Resetar o NPS de "${nm}"? As respostas e dispensas dessa loja serão apagadas e o balão volta a aparecer.`)) return;
    setErr(''); setMsg('');
    try { await resetNpsStore(resetStore); setMsg(`NPS de "${nm}" resetado. Recarregue a página dessa loja.`); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao resetar'); }
  };

  const num = (v: string, min: number, max: number) => Math.min(Math.max(parseInt(v || '0', 10) || 0, min), max);
  const visibleStores = stores.filter((s) => s.name?.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0094eb] px-4 py-3 text-sm font-black text-white shadow-lg hover:bg-[#0082d1]">
        <ClipboardList className="h-4 w-4" /> Pesquisas NPS
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[88vh] max-w-6xl flex-col gap-0 overflow-hidden border-slate-700 bg-[#0f1322] p-0 text-slate-100 sm:rounded-2xl">
          <DialogTitle className="flex items-center gap-2 border-b border-slate-800 px-5 py-3 text-lg font-black text-white">
            {view === 'edit' && (
              <button type="button" onClick={() => setView('list')} className={ICONBTN} title="Voltar"><ArrowLeft className="h-4 w-4" /></button>
            )}
            {view === 'list' ? 'Pesquisas NPS' : draft?.id ? 'Editar pesquisa' : 'Nova pesquisa'}
          </DialogTitle>
          <DialogDescription className="sr-only">Criar e editar pesquisas e perguntas do NPS</DialogDescription>

          {view === 'list' && (
            <div className={`min-h-0 flex-1 space-y-5 p-5 ${SCROLL}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Cada pesquisa tem suas perguntas, público e regra de exibição.</p>
                <button type="button" onClick={() => edit(null)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-black text-white hover:bg-[#0082d1]">
                  <Plus className="h-4 w-4" /> Nova pesquisa
                </button>
              </div>

              {loading ? <Loader2 className="h-5 w-5 animate-spin text-[#0094eb]" /> : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111524]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800">
                      <tr>
                        <th className={TH}>Pesquisa</th>
                        <th className={`${TH} text-center`}>Status</th>
                        <th className={`${TH} text-center`}>Respostas</th>
                        <th className={`${TH} text-center`}>Visualizações</th>
                        <th className={`${TH} text-center`}>Fechamentos</th>
                        <th className={TH}>Quando aparece</th>
                        <th className={`${TH} text-center`}>Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {surveys.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhuma pesquisa criada.</td></tr>}
                      {surveys.map((s) => {
                        const st = stats[s.id ?? ''] ?? { views: 0, dismissals: 0 };
                        return (
                          <tr key={s.id} className="align-top hover:bg-white/5">
                            <td className="px-3 py-3">
                              <p className="font-bold text-slate-100">{s.name}</p>
                              <p className="text-[11px] text-slate-500">{s.questions.length} perguntas</p>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button type="button" onClick={() => toggleEnabled(s)} title="Clique para ativar/desativar"
                                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                                {s.enabled ? 'Ativa' : 'Inativa'}
                              </button>
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-white">{s.responses_count ?? 0}</td>
                            <td className="px-3 py-3 text-center text-slate-300">{st.views}</td>
                            <td className="px-3 py-3 text-center text-slate-300">{st.dismissals}</td>
                            <td className="max-w-[320px] px-3 py-3 text-slate-400">{rule(s)}</td>
                            <td className="px-3 py-3">
                              <div className="flex justify-center gap-1">
                                <button type="button" className={ICONBTN} onClick={() => edit(s)} title="Editar"><Pencil className="h-4 w-4" /></button>
                                <button type="button" className={`${ICONBTN} hover:!text-rose-400`} onClick={() => remove(s)} title="Excluir"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-slate-800 bg-[#111524] p-4">
                <p className="text-sm font-bold text-white">Resetar para teste</p>
                <p className="text-xs text-slate-400">Apaga as respostas e dispensas do NPS de uma loja, para o balão voltar a aparecer para ela.</p>
                <div className="flex flex-wrap gap-2">
                  <select className={`${INPUT} max-w-sm`} value={resetStore} onChange={(e) => setResetStore(e.target.value)}>
                    <option value="">Escolha a loja...</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="button" onClick={reset}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fd8539] px-4 py-2 text-sm font-black text-white hover:bg-[#e8742a]">
                    <RotateCcw className="h-4 w-4" /> Resetar loja
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'edit' && draft && (
            <div className={`min-h-0 flex-1 space-y-5 p-5 ${SCROLL}`}>
              <div className="grid gap-3 rounded-xl border border-slate-800 bg-[#111524] p-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={LABEL}>Nome da pesquisa (interno)</label>
                  <input className={INPUT} value={draft.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Título do convite</label>
                  <input className={INPUT} value={draft.invite_title} maxLength={120} onChange={(e) => set({ invite_title: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Texto de apoio do convite</label>
                  <input className={INPUT} value={draft.invite_text} maxLength={160} onChange={(e) => set({ invite_text: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Mostrar após (dias de cadastro)</label>
                  <input type="number" className={INPUT} value={draft.min_days_after_signup} onChange={(e) => set({ min_days_after_signup: num(e.target.value, 0, 3650) })} />
                </div>
                <div>
                  <label className={LABEL}>Intervalo entre respostas (dias)</label>
                  <input type="number" className={INPUT} value={draft.cooldown_days} onChange={(e) => set({ cooldown_days: num(e.target.value, 1, 730) })} />
                </div>
                <div>
                  <label className={LABEL}>Se dispensar, voltar em (dias)</label>
                  <input type="number" className={INPUT} value={draft.dismiss_days} onChange={(e) => set({ dismiss_days: num(e.target.value, 1, 365) })} />
                </div>
                <div>
                  <label className={LABEL}>Público</label>
                  <select className={INPUT} value={draft.target} onChange={(e) => set({ target: e.target.value === 'stores' ? 'stores' : 'all' })}>
                    <option value="all">Todas as lojas</option>
                    <option value="stores">Lojas específicas</option>
                  </select>
                </div>
                {draft.target === 'stores' && (
                  <div className="sm:col-span-2">
                    <input className={`${INPUT} mb-2`} placeholder="Buscar loja..." value={filter} onChange={(e) => setFilter(e.target.value)} />
                    <div className={`max-h-40 space-y-1 rounded-lg border border-slate-700 bg-[#0b0e1a] p-2 ${SCROLL}`}>
                      {visibleStores.map((s) => (
                        <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                          <input type="checkbox" checked={draft.store_ids.includes(s.id)} onChange={() => toggleStore(s.id)} /> {s.name}
                        </label>
                      ))}
                      {visibleStores.length === 0 && <p className="text-xs text-slate-500">Nenhuma loja encontrada.</p>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{draft.store_ids.length} loja(s) selecionada(s)</p>
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-200 sm:col-span-2">
                  <input type="checkbox" checked={draft.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
                  Pesquisa ativa (aparece para as lojas elegíveis)
                </label>
              </div>

              {draft.questions.map((q, i) => (
                <div key={q.id ?? `n${i}`} className="space-y-3 rounded-xl border border-slate-800 bg-[#111524] p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#0094eb]">#{i + 1}</span>
                    <select className={`${INPUT} max-w-[220px]`} value={q.type} onChange={(e) => changeType(i, e.target.value as QType)}>
                      {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                    </select>
                    <div className="ml-auto flex items-center">
                      <button type="button" className={ICONBTN} disabled={i === 0} onClick={() => moveQ(i, -1)} title="Subir"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" className={ICONBTN} disabled={i === draft.questions.length - 1} onClick={() => moveQ(i, 1)} title="Descer"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" className={ICONBTN} onClick={() => dupQ(i)} title="Duplicar"><Copy className="h-4 w-4" /></button>
                      <button type="button" className={`${ICONBTN} hover:!text-rose-400`} onClick={() => delQ(i)} title="Excluir pergunta"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <input className={INPUT} placeholder="Texto da pergunta" maxLength={200} value={q.title} onChange={(e) => setQ(i, { title: e.target.value })} />

                  {q.type === 'text' && (
                    <input className={INPUT} placeholder="Placeholder da resposta (opcional)" maxLength={120} value={q.placeholder ?? ''} onChange={(e) => setQ(i, { placeholder: e.target.value })} />
                  )}

                  {hasOptions(q.type) && (
                    <div className="space-y-2">
                      {q.options.map((o) => (
                        <div key={o.key} className="flex items-center gap-2">
                          <span className={`h-4 w-4 shrink-0 border border-slate-600 ${q.type === 'single' ? 'rounded-full' : 'rounded'}`} />
                          <input className={INPUT} placeholder="Opção" maxLength={80} value={o.label} onChange={(e) => setOpt(i, o.key, e.target.value)} />
                          <button type="button" className={`${ICONBTN} hover:!text-rose-400`} onClick={() => delOpt(i, o.key)} title="Excluir opção"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                      {q.allow_other && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span className={`h-4 w-4 shrink-0 border border-slate-600 ${q.type === 'single' ? 'rounded-full' : 'rounded'}`} />
                          Outro (a loja descreve)
                        </div>
                      )}
                      <button type="button" onClick={() => addOpt(i)} className="cursor-pointer text-xs font-bold text-[#0094eb] hover:underline">+ Adicionar opção</button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-2 text-sm text-slate-300">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} /> Obrigatória
                    </label>
                    {hasOptions(q.type) && (
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={q.allow_other} onChange={(e) => setQ(i, { allow_other: e.target.checked })} /> Permitir "Outro"
                      </label>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button key={t.v} type="button" onClick={() => mapQ((qs) => [...qs, newQuestion(t.v)])}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#0094eb] px-3 py-2 text-xs font-bold text-[#0094eb] hover:bg-[#0094eb]/10">
                    <Plus className="h-3.5 w-3.5" /> {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-slate-800 bg-[#0f1322] px-5 py-3">
            {err && <span className="text-sm font-semibold text-rose-400">{err}</span>}
            {msg && !err && <span className="text-sm font-semibold text-emerald-400">{msg}</span>}
            {view === 'edit' && (
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setView('list')} className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">Cancelar</button>
                <button type="button" onClick={save} disabled={saving}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-5 py-2 text-sm font-black text-white hover:bg-[#0082d1] disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar pesquisa
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}