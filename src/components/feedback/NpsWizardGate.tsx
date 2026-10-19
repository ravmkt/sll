import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  dismissSurvey, getWizardStatus, resolveStoreId, submitNpsSurvey,
  type NpsAnswerInput, type NpsSurvey, type NpsSurveyQuestion,
} from '@/services/feedback';
import { showError } from '@/utils/toast';

const INVITE_KEY = 'sll_nps_invite_shown';
const SCROLL = 'overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300';
const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0094eb]';
const chip = (on: boolean) =>
  `flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
    on ? 'border-[#0094eb] bg-[#0094eb]/10 text-[#0094eb]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
  }`;

type Ans = { value: number | string | string[]; other?: string };

const answered = (q: NpsSurveyQuestion, a?: Ans) => {
  if (!a) return false;
  if (q.type === 'nps') return typeof a.value === 'number';
  if (q.type === 'single') return typeof a.value === 'string' && a.value.length > 0;
  if (q.type === 'multi') return Array.isArray(a.value) && a.value.length > 0;
  return typeof a.value === 'string' && a.value.trim().length > 0;
};

export default function NpsWizardGate({ showCard = true }: { showCard?: boolean }) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [survey, setSurvey] = useState<NpsSurvey | null>(null);
  const [show, setShow] = useState(false);
  const [invite, setInvite] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<Record<string, Ans>>({});
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = await resolveStoreId();
        const st = await getWizardStatus(id);
        if (!alive) return;
        setStoreId(id);
        setSurvey(st.survey ?? null);
        setShow(!!st.should_show && !!st.survey);
      } catch (err) { console.warn('[NPS] falhou', err); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!show) return;
    const force = new URLSearchParams(window.location.search).has('nps');
    if (!force && sessionStorage.getItem(INVITE_KEY)) return;
    const t = setTimeout(() => setInvite(true), 6000);
    return () => clearTimeout(t);
  }, [show]);

  const closeInvite = () => { sessionStorage.setItem(INVITE_KEY, '1'); setInvite(false); };
  const startWizard = () => { closeInvite(); setStep(0); setOpen(true); };

  const dismiss = async () => {
    if (!storeId || !survey) return;
    setShow(false); setInvite(false);
    try { await dismissSurvey(storeId, survey.id); } catch { /* silencioso */ }
  };

  const setValue = (id: string, patch: Partial<Ans> & { value: Ans['value'] }) =>
    setAns((m) => ({ ...m, [id]: { ...m[id], ...patch } }));

  const send = async () => {
    if (!storeId || !survey) return;
    const payload: NpsAnswerInput[] = survey.questions.flatMap((q) => {
      const a = ans[q.id];
      if (!answered(q, a)) return [];
      return [{ question_id: q.id, value: a.value, other: a.other?.trim() || undefined }];
    });
    setBusy(true);
    try {
      await submitNpsSurvey(storeId, survey.id, payload);
      setThanks(true);
    } catch (e: any) {
      if (String(e?.message).includes('already_answered_recently')) { setOpen(false); setShow(false); }
      else showError('Não foi possível enviar agora. Tente novamente.');
    } finally { setBusy(false); }
  };

  if (!show || !survey) return null;

  const qs = survey.questions;
  const q = qs[step];
  const last = step === qs.length - 1;
  const a = q ? ans[q.id] : undefined;
  const canNext = !q?.required || answered(q, a);

  const renderQuestion = (qq: NpsSurveyQuestion) => {
    const cur = ans[qq.id];
    if (qq.type === 'nps') {
      return (
        <div className="grid grid-cols-6 gap-3 py-2">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" onClick={() => setValue(qq.id, { value: n })}
              className={`h-12 cursor-pointer rounded-xl border-2 text-base font-black transition ${cur?.value === n ? 'border-[#0094eb] bg-[#0094eb] text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-[#0094eb] hover:text-[#0094eb]'}`}>
              {n}
            </button>
          ))}
        </div>
      );
    }
    if (qq.type === 'text') {
      return (
        <textarea value={typeof cur?.value === 'string' ? cur.value : ''} rows={4}
          onChange={(e) => setValue(qq.id, { value: e.target.value.slice(0, 2000) })}
          placeholder={qq.placeholder || ''} className={`${INPUT} resize-none`} />
      );
    }
    const opts = qq.allow_other ? [...qq.options, { key: 'outro', label: 'Outro' }] : qq.options;
    const picked: string[] = Array.isArray(cur?.value) ? cur!.value as string[] : typeof cur?.value === 'string' && cur.value ? [cur.value] : [];
    const pick = (key: string) => {
      if (qq.type === 'single') {
        setValue(qq.id, { value: key });
        if (key !== 'outro' && !last) setStep((s) => s + 1);
      } else {
        setValue(qq.id, { value: picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key] });
      }
    };
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {opts.map((o) => (
            <button key={o.key} type="button" onClick={() => pick(o.key)} className={chip(picked.includes(o.key))}>
              <span>{o.label}</span>
              {qq.type === 'multi' && picked.includes(o.key) && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
        {picked.includes('outro') && (
          <input value={cur?.other || ''} placeholder="Descreva rapidamente" className={INPUT}
            onChange={(e) => setValue(qq.id, { value: cur!.value, other: e.target.value.slice(0, 300) })} />
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes npsFloat { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-6px) rotate(1.5deg); } }
        @keyframes npsPop { 0% { opacity: 0; transform: translateY(24px) scale(.85); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .nps-float { animation: npsFloat 2.8s ease-in-out infinite; }
        .nps-pop { animation: npsPop .5s cubic-bezier(.2,.9,.3,1.2) both; }
      `}</style>

      {showCard && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-[#0094eb]/30 bg-white p-5 text-center shadow-sm">
          <img src="/assets/noah-pergunta2.png" alt="Noah" className="nps-float h-32 w-auto object-contain" />
          <p className="text-lg font-black leading-snug text-slate-900">{survey.invite_title}</p>
          <p className="text-xs text-slate-500">{survey.invite_text || `Sua opinião vale ouro! São ${qs.length} perguntas rápidas.`}</p>
          <button type="button" onClick={startWizard} className="w-full cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2.5 text-sm font-black text-white shadow hover:bg-[#0082d1]">Responder</button>
          <button type="button" onClick={dismiss} className="cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600">Agora não</button>
        </div>
      )}

      {invite && !open && (
        <div className="nps-pop fixed bottom-4 left-4 z-50 flex items-end">
          <img src="/assets/noah-pergunta2.png" alt="Noah" onClick={startWizard} className="nps-float h-40 w-auto shrink-0 cursor-pointer object-contain drop-shadow-xl" />
          <div className="nps-bubble relative mb-16 -ml-1 w-72 rounded-2xl border-2 border-[#fd8539] bg-white p-4 shadow-2xl">
            <span className="absolute -left-2 bottom-5 h-4 w-4 rotate-45 border-b-2 border-l-2 border-[#fd8539] bg-white" />
            <button type="button" aria-label="Fechar" onClick={closeInvite} className="absolute right-2 top-2 cursor-pointer text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
            <p className="pr-5 text-lg font-black leading-snug text-slate-900">{survey.invite_title}</p>
            {survey.invite_text && <p className="mt-1 text-sm text-slate-600">{survey.invite_text}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={closeInvite} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50">Depois</button>
              <button type="button" onClick={startWizard} className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-black text-white hover:bg-[#0082d1]">Responder</button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v && thanks) setShow(false); }}>
        <DialogContent className={`max-h-[90vh] max-w-lg gap-5 border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:rounded-2xl ${SCROLL}`}>
          {thanks ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <DialogTitle className="sr-only">Obrigado pela sua opinião</DialogTitle>
              <DialogDescription className="sr-only">Agradecimento pelo envio da pesquisa</DialogDescription>
              <img src="/assets/noah-pergunta2.png" alt="Noah" className="nps-float h-36 w-auto object-contain" />
              <p className="text-lg font-black text-slate-900">Obrigado pela sua opinião!</p>
              <p className="text-xs text-slate-600">Sua resposta chegou ao time e ajuda a melhorar o SLL Hub.</p>
              <button type="button" onClick={() => { setOpen(false); setShow(false); }}
                className="mt-1 w-full cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2.5 text-sm font-black text-white hover:bg-[#0082d1]">Fechar</button>
            </div>
          ) : (<>
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Sua opinião ({step + 1}/{qs.length})</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                {q?.title}{q && !q.required && q.type !== 'text' ? ' (opcional)' : ''}
              </DialogDescription>
            </DialogHeader>

            {q && renderQuestion(q)}

            <div className="flex justify-between pt-2">
              <button type="button" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40">Voltar</button>
              {!last ? (
                <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}
                  className="cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2 text-sm font-bold text-white disabled:opacity-40">
                  {!q?.required && !answered(q, a) ? 'Pular' : 'Continuar'}
                </button>
              ) : (
                <button type="button" disabled={busy || !canNext} onClick={send}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar
                </button>
              )}
            </div>
          </>)}
        </DialogContent>
      </Dialog>
    </>
  );
}