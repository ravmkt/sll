import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const nav = useNavigate();
  const [isRecovery] = useState(() => window.location.hash.includes('type=recovery'));
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === 'PASSWORD_RECOVERY') setReady(true);
    });
    if (isRecovery) supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, [isRecovery]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (pwd.length < 8) return setError('A senha precisa ter ao menos 8 caracteres.');
    if (pwd !== pwd2) return setError('As senhas não conferem.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => nav('/dashboard', { replace: true }), 1500);
  };

  const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0094eb]';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <img src="/assets/sll-logotipo.png" alt="SLL Hub" className="mx-auto h-9 w-auto object-contain" />
        {done ? (
          <p className="text-center text-sm font-semibold text-emerald-600">Senha atualizada! Entrando no painel...</p>
        ) : ready ? (
          <form onSubmit={submit} className="space-y-3">
            <h1 className="text-lg font-black text-slate-900">Crie sua nova senha</h1>
            <input type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Nova senha (mín. 8 caracteres)" className={input} />
            <input type="password" autoComplete="new-password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Repita a nova senha" className={input} />
            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={busy} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] py-3 text-sm font-bold text-white disabled:opacity-50">
              {busy && <Loader2 size={15} className="animate-spin" />} Salvar nova senha
            </button>
          </form>
        ) : timedOut ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-slate-600">Este link expirou ou já foi usado. Peça um novo link ao suporte.</p>
            <button type="button" onClick={() => nav('/auth')} className="cursor-pointer text-sm font-bold text-[#0094eb] underline">Ir para o login</button>
          </div>
        ) : (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        )}
      </div>
    </div>
  );
}