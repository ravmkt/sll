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
    const t = setTimeout(() => { setInvite(true); sessionStorage.setItem(INVITE_KEY, '1'); }, 15000);
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
        @keyframes npsFloat { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
        @keyframes npsPop { 0% { opacity: 0; transform: translateY(24px) scale(.9); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .nps-float { animation: npsFloat 2.6s ease-in-out infinite; }
        .nps-pop { animation: npsPop .45s cubic-bezier(.2,.9,.3,1.2) both; }
      `}</style>

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-[#0094eb]/30 bg-gradient-to-r from-[#0094eb] to-[#0070c0] p-4 shadow-lg shadow-[#0094eb]/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <img src="/assets/dica-do-noah-logo-ico.png" alt="Noah" className="nps-float h-16 w-16 shrink-0 object-contain drop-shadow-lg" />
            <div>
              <p className="text-base font-black text-white">Sua opinião vale ouro! Como está sendo sua experiência com o SLL?</p>
              <p className="text-xs text-white/80">São 3 perguntas rápidas, menos de 1 minuto.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={dismiss} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10">Agora não</button>
            <button type="button" onClick={startWizard} className="cursor-pointer rounded-lg bg-white px-5 py-2 text-sm font-black text-[#0094eb] shadow hover:bg-slate-50">Responder</button>
          </div>
        </div>
      </div>

      {invite && !open && (
        <div className="nps-pop fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-end gap-1">
          <img src="/assets/dica-do-noah-logo-ico.png" alt="Noah" className="nps-float -mb-1 h-28 w-28 shrink-0 object-contain drop-shadow-xl" />
          <div className="relative mb-6 w-64 rounded-2xl border-2 border-[#0094eb] bg-white p-4 shadow-2xl">
            <span className="absolute -left-2 bottom-5 h-4 w-4 rotate-45 border-b-2 border-l-2 border-[#0094eb] bg-white" />
            <button type="button" aria-label="Fechar" onClick={() => setInvite(false)} className="absolute right-2 top-2 cursor-pointer text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
            <p className="pr-4 text-sm font-black text-slate-900">Oi! Eu sou o Noah 👋</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Posso te fazer 3 perguntas rápidas?</p>
            <p className="mt-1 text-xs text-slate-500">Sua opinião direciona o que vamos construir.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setInvite(false)} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">Depois</button>
              <button type="button" onClick={startWizard} className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-1.5 text-xs font-black text-white hover:bg-[#0082d1]">Vamos lá!</button>
            </div>
          </div>
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
