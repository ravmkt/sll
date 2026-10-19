import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { useNavigate } from 'react-router-dom';

const sb: any = supabase;
const AREAS = ['Novo módulo', 'Integração com plataforma', 'Relatórios e métricas', 'Automação e IA', 'Outro'];

export default function FeatureWishCard() {
  const { storeId } = useLoja() as { storeId: string | null };
  const navigate = useNavigate();
  const [area, setArea] = useState(AREAS[0]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!thanks) return;
    const t = setTimeout(() => setThanks(false), 6000);
    return () => clearTimeout(t);
  }, [thanks]);

  const send = async () => {
    if (!storeId || text.trim().length < 5 || sending) return;
    setSending(true);
    setErr('');
    const { data: u } = await sb.auth.getUser();
    const row: any = {
      type: 'suggestion',
      store_id: storeId,
      comment: ('[' + area + '] ' + text.trim()).slice(0, 2000),
      user_id: u?.user?.id ?? null,
    };
    let { error } = await sb.from('app_feedbacks').insert(row);
    if (error && /user_id/.test(String(error.message))) {
      delete row.user_id;
      ({ error } = await sb.from('app_feedbacks').insert(row));
    }
    setSending(false);
    if (error) { setErr('Não foi possível enviar. Tente de novo.'); return; }
    setDone(true);
    setThanks(true);
    setText('');
  };

  return (
    <section className="flex flex-col items-center gap-2 rounded-2xl border border-[#0094eb]/30 bg-white p-3 text-center shadow-sm">
      <style>{`@keyframes wishFloat { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-5px) rotate(1.5deg); } } .wish-float { animation: wishFloat 2.8s ease-in-out infinite; }`}</style>
      <img src="/assets/noah-pergunta2.png" alt="Noah" className="wish-float h-20 w-auto object-contain" />
      <p className="text-sm font-black leading-snug text-slate-900">O que você gostaria de ver no SLL Hub?</p>
      {done ? (
        <>
          <p className="text-xs text-slate-600">Obrigado! Sua ideia chegou ao time e ajuda a definir os próximos módulos.</p>
          <button type="button" onClick={() => setDone(false)} className="cursor-pointer text-xs font-bold text-[#0094eb] hover:underline">Enviar outra ideia</button>
          <button type="button" onClick={() => navigate('/dashboard/pedidos-dos-lojistas')} className="cursor-pointer text-xs font-bold text-slate-500 hover:underline">Ver o que outros pediram</button>
        </>
      ) : (
        <>
          <p className="text-[11px] leading-snug text-slate-500">Sua sugestão define os próximos módulos.</p>
          <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0094eb]">
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={4} placeholder="Descreva o que ajudaria sua loja..." className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0094eb]" />
          {err && <p className="text-[11px] text-rose-500">{err}</p>}
          <button type="button" onClick={send} disabled={sending || text.trim().length < 5} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#0094eb] px-3 py-2 text-xs font-black text-white shadow hover:bg-[#0082d1] disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar ideia
          </button>
        </>
      )}
      {thanks && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setThanks(false)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <img src="/assets/noah-pergunta2.png" alt="Noah" className="wish-float mx-auto h-28 w-auto object-contain" />
            <p className="mt-3 text-lg font-black text-slate-900">Obrigado pela sua ideia!</p>
            <p className="mt-1 text-sm text-slate-600">Ela foi enviada ao nosso time e ajuda a definir os próximos módulos do SLL Hub.</p>
            <button type="button" onClick={() => { setThanks(false); navigate('/dashboard/pedidos-dos-lojistas'); }} className="mt-4 w-full cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-black text-white shadow hover:bg-[#0082d1]">Ver o que outros lojistas pediram</button>
            <button type="button" onClick={() => setThanks(false)} className="mt-2 w-full cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600">Fechar</button>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}