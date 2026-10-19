import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dismissWizard, getNpsOptions, getNpsTexts, getWizardStatus, NPS_TEXT_DEFAULTS, resolveStoreId, submitNpsWizard } from '@/services/feedback';
import { showError } from '@/utils/toast';

const INVITE_KEY = 'sll_nps_invite_shown';
const DEFAULT_PAINS = [
  { key: 'dificuldade_instalacao', label: 'Dificuldade na instalação' },
  { key: 'poucos_recursos', label: 'Faltam funcionalidades' },
  { key: 'preco', label: 'Preço' },
  { key: 'desempenho', label: 'Desempenho / lentidão' },
  { key: 'suporte', label: 'Suporte' },
  { key: 'outro', label: 'Outro' },
];
const DEFAULT_FEATURES = [
  { key: 'vidlytics', label: 'Vidlytics (vídeos)' },
  { key: 'live_commerce', label: 'Live Commerce' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'noah', label: 'Noah (assistente)' },
  { key: 'widgets', label: 'Widgets' },
];
const chip = (on: boolean) =>
  `cursor-pointer rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
    on ? 'border-[#0094eb] bg-[#0094eb]/10 text-[#0094eb]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
  }`;

export default function NpsWizardGate({ showCard = true }: { showCard?: boolean }) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [invite, setInvite] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [score, setScore] = useState<number | null>(null);
  const [pain, setPain] = useState('');
  const [painOther, setPainOther] = useState('');
  const [feature, setFeature] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [pains, setPains] = useState(DEFAULT_PAINS);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [tx, setTx] = useState<Record<string, string>>(NPS_TEXT_DEFAULTS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = await resolveStoreId();
        const st = await getWizardStatus(id);
        console.info('[NPS] status', { id, st });
        if (!alive) return;
        setStoreId(id);
        setShow(st.should_show);
        if (st.should_show) {
          try {
            getNpsTexts().then((t) => { if (alive) setTx({ ...NPS_TEXT_DEFAULTS, ...t }); }).catch(() => { /* mantém o padrão */ });
            const opts = await getNpsOptions();
            if (!alive) return;
            if (opts.pains.length) setPains(opts.pains);
            if (opts.features.length) setFeatures(opts.features);
          } catch { /* mantém as opções padrão */ }
        }
      } catch (err) { console.warn('[NPS] falhou', err); /* sem loja ou sem permissão: não exibe */ }
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
  const startWizard = () => { closeInvite(); setStep(1); setOpen(true); };

  const dismiss = async () => {
    if (!storeId) return;
    setShow(false); setInvite(false);
    try { await dismissWizard(storeId); } catch { /* silencioso */ }
  };

  const send = async () => {
    if (!storeId || score === null) return;
    setBusy(true);
    try {
      await submitNpsWizard({
        storeId, score, topFeature: feature, mainPain: pain,
        mainPainOther: pain === 'outro' ? painOther.trim() : undefined,
        comment: comment.trim(),
      });
      setThanks(true);
    } catch (e: any) {
      if (String(e?.message).includes('already_answered_recently')) { setOpen(false); setShow(false); }
      else showError('Não foi possível enviar agora. Tente novamente.');
    } finally { setBusy(false); }
  };

  if (!show) return null;

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
        <p className="text-lg font-black leading-snug text-slate-900">{tx.invite_title}</p>
        <p className="text-xs text-slate-500">Sua opinião vale ouro! São 3 perguntas rápidas, menos de 1 minuto.</p>
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
            <p className="pr-5 text-lg font-black leading-snug text-slate-900">{tx.invite_title}</p>
            <p className="mt-1 text-sm text-slate-600">Leva menos de 1 minuto.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={closeInvite} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50">Depois</button>
              <button type="button" onClick={startWizard} className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-black text-white hover:bg-[#0082d1]">Responder</button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v && thanks) setShow(false); }}>
        <DialogContent className="max-w-lg gap-5 border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:rounded-2xl">
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
            <DialogTitle className="text-xl font-black text-slate-900">Sua opinião ({step}/4)</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {step === 1 && tx.score_question}
              {step === 2 && tx.pain_title}
              {step === 3 && tx.feature_title}
              {step === 4 && tx.comment_question}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="grid grid-cols-6 gap-3 py-2">
              {Array.from({ length: 11 }, (_, n) => (
                <button key={n} type="button" onClick={() => setScore(n)}
                  className={`cursor-pointer rounded-xl border-2 h-12 text-base font-black transition ${score === n ? 'border-[#0094eb] bg-[#0094eb] text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-[#0094eb] hover:text-[#0094eb]'}`}>
                  {n}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {pains.map((p) => (
                  <button key={p.key} type="button"
                    onClick={() => { setPain(p.key); if (p.key !== 'outro') setStep(3); }}
                    className={chip(pain === p.key)}>{p.label}</button>
                ))}
              </div>
              {pain === 'outro' && (
                <input value={painOther} onChange={(e) => setPainOther(e.target.value.slice(0, 300))} placeholder="Descreva rapidamente"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0094eb]" />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-2">
              {features.map((f) => (
                <button key={f.key} type="button"
                  onClick={() => { setFeature(f.key); setStep(4); }}
                  className={chip(feature === f.key)}>{f.label}</button>
              ))}
            </div>
          )}

          {step === 4 && (
            <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 2000))} rows={4}
              placeholder={tx.comment_placeholder}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0094eb]" />
          )}

          <div className="flex justify-between pt-2">
            <button type="button" disabled={step === 1 || busy} onClick={() => setStep((s) => s - 1)}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40">Voltar</button>
            {step < 4 ? (
              <button type="button" disabled={step === 1 && score === null} onClick={() => setStep((s) => s + 1)}
                className="cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2 text-sm font-bold text-white disabled:opacity-40">{(step === 2 && !pain) || (step === 3 && !feature) ? 'Pular' : 'Continuar'}</button>
            ) : (
              <button type="button" disabled={busy} onClick={send}
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
