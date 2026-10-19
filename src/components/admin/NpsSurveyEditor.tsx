import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { listAdminStores, saveNpsSurvey, type AdminQuestion, type AdminSurvey, type QType } from '@/services/admin/npsSurveys';

const SCROLL = 'overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700';
const INPUT = 'w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#0094eb]';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400';
const ICONBTN = 'cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-30';
const TYPES: { v: QType; label: string }[] = [
  { v: 'nps', label: 'Nota de 0 a 10' },
  { v: 'single', label: 'Escolha única' },
  { v: 'multi', label: 'Múltipla escolha' },
  { v: 'text', label: 'Texto livre' },
];

const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const hasOptions = (t: QType) => t === 'single' || t === 'multi';
const num = (v: string, min: number, max: number) => Math.min(Math.max(parseInt(v || '0', 10) || 0, min), max);

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

export default function NpsSurveyEditor({ open, survey, onClose, onSaved }: {
  open: boolean; survey: AdminSurvey | null; onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AdminSurvey>(newSurvey());
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(survey ? clone(survey) : newSurvey());
    setErr('');
    listAdminStores().then(setStores).catch(() => { /* opcional */ });
  }, [open, survey]);

  const set = (p: Partial<AdminSurvey>) => setDraft((d) => ({ ...d, ...p }));
  const mapQ = (fn: (qs: AdminQuestion[]) => AdminQuestion[]) => setDraft((d) => ({ ...d, questions: fn(d.questions) }));
  const setQ = (i: number, p: Partial<AdminQuestion>) => mapQ((qs) => qs.map((q, n) => (n === i ? { ...q, ...p } : q)));
  const moveQ = (i: number, dir: -1 | 1) => mapQ((qs) => {
    const j = i + dir;
    if (j < 0 || j >= qs.length) return qs;
    const c = [...qs]; const t = c[i]; c[i] = c[j]; c[j] = t;
    return c;
  });
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
  const setOpts = (i: number, fn: (o: AdminQuestion['options']) => AdminQuestion['options']) => setQ(i, { options: fn(draft.questions[i].options) });
  const toggleStore = (id: string) =>
    set({ store_ids: draft.store_ids.includes(id) ? draft.store_ids.filter((x) => x !== id) : [...draft.store_ids, id] });

  const save = async () => {
    setErr('');
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
    try { await saveNpsSurvey(draft); onSaved(); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const visibleStores = stores.filter((s) => (s.name ?? '').toLowerCase().includes(filter.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex h-[88vh] max-w-4xl flex-col gap-0 overflow-hidden border-slate-700 bg-[#0f1322] p-0 text-slate-100 sm:rounded-2xl">
        <DialogTitle className="border-b border-slate-800 px-5 py-3 text-lg font-black text-white">{draft.id ? 'Editar pesquisa' : 'Nova pesquisa'}</DialogTitle>
        <DialogDescription className="sr-only">Editar pesquisa e perguntas do NPS</DialogDescription>

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
                  <button type="button" className={`${ICONBTN} hover:!text-rose-400`} onClick={() => mapQ((qs) => qs.filter((_, n) => n !== i))} title="Excluir pergunta"><Trash2 className="h-4 w-4" /></button>
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
                      <input className={INPUT} placeholder="Opção" maxLength={80} value={o.label}
                        onChange={(e) => setOpts(i, (os) => os.map((x) => (x.key === o.key ? { ...x, label: e.target.value } : x)))} />
                      <button type="button" className={`${ICONBTN} hover:!text-rose-400`} onClick={() => setOpts(i, (os) => os.filter((x) => x.key !== o.key))} title="Excluir opção"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {q.allow_other && <p className="pl-6 text-sm text-slate-400">Outro (a loja descreve)</p>}
                  <button type="button" onClick={() => setOpts(i, (os) => [...os, { key: 'o_' + uid(), label: '' }])} className="cursor-pointer text-xs font-bold text-[#0094eb] hover:underline">+ Adicionar opção</button>
                </div>
              )}
              <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-2 text-sm text-slate-300">
                <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} /> Obrigatória</label>
                {hasOptions(q.type) && (
                  <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={q.allow_other} onChange={(e) => setQ(i, { allow_other: e.target.checked })} /> Permitir "Outro"</label>
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

        <div className="flex items-center gap-3 border-t border-slate-800 bg-[#0f1322] px-5 py-3">
          {err && <span className="text-sm font-semibold text-rose-400">{err}</span>}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">Cancelar</button>
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-5 py-2 text-sm font-black text-white hover:bg-[#0082d1] disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar pesquisa
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}