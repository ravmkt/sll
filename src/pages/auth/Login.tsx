import { AppFooter } from '@/components/layout/AppFooter';
import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(() => new URLSearchParams(window.location.search).get('mode') !== 'signup');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const gq = new URLSearchParams(window.location.search);
    if (gq.get('plan')) {
      sessionStorage.removeItem('sll_intent_used');
      localStorage.setItem('sll_checkout_intent', JSON.stringify({ ts: Date.now(), plan: gq.get('plan'), cycle: gq.get('cycle') ?? 'monthly', module: gq.get('module') ?? undefined }));
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
      queryParams: { prompt: 'select_account' },
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) toast.error('Erro no login com Google: ' + error.message);
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const qp = new URLSearchParams(window.location.search);
    const intentPlan = qp.get('plan');
    const intent = intentPlan
      ? { ts: Date.now(), plan: intentPlan, cycle: qp.get('cycle') ?? 'monthly', module: qp.get('module') ?? undefined }
      : null;
    if (intent) { sessionStorage.removeItem('sll_intent_used'); localStorage.setItem('sll_checkout_intent', JSON.stringify(intent)); }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error('Erro ao fazer login: ' + error.message);
    } else {
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem!');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nome,
            ...(intent ? { checkout_intent: intent } : {})
          }
        }
      });
      if (error) toast.error('Erro ao cadastrar: ' + error.message);
      else toast.success('Conta criada com sucesso! Agora vamos configurar a sua loja.');
    }
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden relative bg-slate-900"
      style={{ 
        backgroundImage: "url('/assets/bg-login.jpg')", 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}
    >
      {/* Overlay escuro para dar destaque ao card */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Card de Login */}
      <div className="bg-white px-8 pb-8 pt-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md border border-gray-100 relative z-10">
        
        <div className="flex flex-col items-center justify-center mb-2">
          <img loading="eager" decoding="async" 
            src="/assets/sll-logotipo-b.png" 
            alt="SLL Hub" 
            className="w-56 h-auto object-contain drop-shadow-sm" 
          />
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 mb-5">
          {isLogin ? 'Entrar' : 'Criar conta'}
        </h2>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <input type="text" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium" required />
            </>
          )}
          
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium" required />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium" required />
          
          {!isLogin && (
             <input type="password" placeholder="Confirmar Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium" required />
          )}

          <button type="submit" disabled={loading} className="w-full py-3.5 mt-2 rounded-xl font-bold text-white transition-all hover:opacity-90 shadow-md" style={{ backgroundColor: '#0094eb' }}>{loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}</button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="px-4 text-slate-400 text-xs font-bold uppercase tracking-wider">ou</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button onClick={handleGoogleLogin} type="button" className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 py-3.5 px-4 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all mb-6 shadow-sm">
          <img loading="eager" decoding="async" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          {isLogin ? 'Entrar com Google' : 'Cadastrar com Google'}
        </button>

        <div className="text-center">
          <button onClick={() => setIsLogin(!isLogin)} type="button" className="font-bold hover:underline transition-all" style={{ color: '#0094eb' }}>
            {isLogin ? 'Criar conta' : 'Já tenho conta'}
          </button>
        </div>
      </div>

      <div className="mt-6 w-full relative z-10 rounded-lg overflow-hidden"><AppFooter /></div>
    </div>
  );
}

