import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export default function BillingSuccess() {
  const [sp] = useSearchParams();
  const sub = sp.get('sub') || '';
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!sub) return;
    let alive = true;
    let tries = 0;
    const tick = async () => {
      const { data } = await sb.from('subscriptions').select('status,dynamic_plan_id').eq('id', sub).maybeSingle();
      if (!alive) return;
      if (data) {
        setStatus(data.status);
        if (data.dynamic_plan_id && !name) {
          const { data: p } = await sb.from('dynamic_plans').select('plan_name').eq('id', data.dynamic_plan_id).maybeSingle();
          if (alive && p) setName(p.plan_name);
        }
        if (['active', 'lifetime'].includes(data.status)) return;
      }
      if (++tries < 20) setTimeout(tick, 3000);
    };
    tick();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub]);

  const done = status !== null && ['active', 'lifetime'].includes(status);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {done ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /> : <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0094eb]" />}
        <h1 className="text-2xl font-black text-slate-900">{done ? 'Pagamento confirmado!' : 'Confirmando seu pagamento...'}</h1>
        <p className="text-sm text-slate-600">
          {done
            ? `${name ? name + ' ' : 'Sua assinatura '}já está ativa e os limites da sua loja foram atualizados.`
            : 'Isso leva alguns segundos. Se demorar, você pode sair desta tela: avisaremos por e-mail assim que confirmar.'}
        </p>
        <Link to="/dashboard" className="inline-block rounded-full bg-[#3b63fb] px-6 py-3 text-sm font-bold text-white hover:bg-[#2f52d6]">Ir para o painel</Link>
      </div>
    </div>
  );
}