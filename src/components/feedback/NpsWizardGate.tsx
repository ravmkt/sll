import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dismissWizard, getWizardStatus, resolveStoreId, submitNpsWizard } from '@/services/feedback';
import { showError, showSuccess } from '@/utils/toast';

const INVITE_KEY = 'sll_nps_invite_shown';
const PAINS = [
  { key: 'dificuldade_instalacao', label: 'Dificuldade na instalação' },
  { key: 'poucos_recursos', label: 'Faltam funcionalidades' },
  { key: 'preco', label: 'Preço' },
  { key: 'desempenho', label: 'Desempenho / lentidão' },
  { key: 'suporte', label: 'Suporte' },
  { key: 'outro', label: 'Outro' },
];
const FEATURES = [
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

export default function NpsWizardGate() {
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = await resolveStoreId();
        const st = await getWizardStatus(id);
        if (!alive) return;
        setStoreId(id);
        setShow(st.should_show);
      } catch { /* sem loja ou sem permissão: não exibe */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!show || sessionStorage.getItem(INVITE_KEY)) return;
    const t = setTimeout(() => { setInvite(true); sessionStorage.setItem(INVITE_KEY, '1'); }, 6000);
    return () => clearTimeout(t);
  }, [show]);

  const startWizard = () => { setInvite(false); setStep(1); setOpen(true); };

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
      showSuccess('Obrigado pelo seu feedback!');
      setOpen(false); setShow(false);
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#0094eb]/30 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/assets/noah-pergunta.png" alt="Noah pergunta: como está sendo sua experiência com o SLL?" className="nps-float h-32 w-auto shrink-0 object-contain mix-blend-multiply" />
          <div>
            <p className="text-base font-black text-slate-900">Sua opinião vale ouro!</p>
            <p className="text-xs text-slate-500">São 3 perguntas rápidas, menos de 1 minuto.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={dismiss} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">Agora não</button>
          <button type="button" onClick={startWizard} className="cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2 text-sm font-black text-white shadow hover:bg-[#0082d1]">Responder</button>
        </div>
      </div>

      {invite && !open && (
        <div className="nps-pop fixed bottom-4 left-4 z-50">
          <button type="button" onClick={startWizard} aria-label="Responder pesquisa de experiência" className="block cursor-pointer">
            <img src="/assets/noah-pergunta.png" alt="Noah pergunta: como está sendo sua experiência com o SLL?" className="nps-float h-48 w-auto object-contain mix-blend-multiply drop-shadow-xl" />
          </button>
          <button type="button" aria-label="Fechar" onClick={() => setInvite(false)} className="absolute right-0 top-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-slate-500 shadow hover:text-slate-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-5 border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Sua opinião ({step}/3)</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {step === 1 && 'De 0 a 10, o quanto você recomendaria o SLL a outro lojista?'}
              {step === 2 && 'Conte o que mais pesa e o que mais vale para você.'}
              {step === 3 && 'Quer deixar algum comentário? (opcional)'}
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
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Maior dificuldade</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAINS.map((p) => (
                    <button key={p.key} type="button" onClick={() => setPain(p.key)} className={chip(pain === p.key)}>{p.label}</button>
                  ))}
                </div>
                {pain === 'outro' && (
                  <input value={painOther} onChange={(e) => setPainOther(e.target.value.slice(0, 300))} placeholder="Descreva rapidamente"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0094eb]" />
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Funcionalidade favorita</p>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map((f) => (
                    <button key={f.key} type="button" onClick={() => setFeature(f.key)} className={chip(feature === f.key)}>{f.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 2000))} rows={4}
              placeholder="O que podemos melhorar?"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0094eb]" />
          )}

          <div className="flex justify-between pt-2">
            <button type="button" disabled={step === 1 || busy} onClick={() => setStep((s) => s - 1)}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40">Voltar</button>
            {step < 3 ? (
              <button type="button" disabled={score === null} onClick={() => setStep((s) => s + 1)}
                className="cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2 text-sm font-bold text-white disabled:opacity-40">Continuar</button>
            ) : (
              <button type="button" disabled={busy} onClick={send}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
