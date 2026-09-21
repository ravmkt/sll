import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [nome, setNome] = useState('');
  const [loja, setLoja] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) alert('Erro no login com Google: ' + error.message);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('Erro ao fazer login: ' + error.message);
    } else {
      if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nome,
            nome_loja: loja
          }
        }
      });
      if (error) alert('Erro ao cadastrar: ' + error.message);
      else alert('Cadastro realizado com sucesso! Verifique seu email.');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      {/* Imagem de Fundo com Overlay Escuro */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/bg-login.jpg')" }}
      />
      <div className="absolute inset-0 z-0 bg-black/70" />

      {/* Card Principal */}
      <div className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        
        {/* Identidade Visual SLL */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div 
            className="w-24 h-24 rounded-2xl flex items-center justify-center mb-2 shadow-lg"
            style={{ backgroundColor: '#0094eb' }}
          >
             <span className="text-white text-4xl font-bold tracking-wider">SLL</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Sistema Loja Lucrativa</h1>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 mb-6 text-center">
          {isLogin ? 'Entrar na sua conta' : 'Criar nova conta'}
        </h2>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium"
                required
              />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium"
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium"
                required
                minLength={6}
              />
              <input
                type="password"
                placeholder="Confirme a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium"
                required
                minLength={6}
              />
              <input
                type="text"
                placeholder="Nome da empresa/loja"
                value={loja}
                onChange={(e) => setLoja(e.target.value)}
                className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium"
                required
              />
            </>
          )}

          {isLogin && (
            <>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium"
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-3.5 rounded-xl bg-[#f1f5f9] border-transparent focus:bg-white focus:border-[#0094eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700 font-medium"
                required
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl font-bold text-white transition-all hover:opacity-90 shadow-md"
            style={{ backgroundColor: '#0094eb' }}
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="px-4 text-slate-400 text-xs font-bold uppercase tracking-wider">ou</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 py-3.5 px-4 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all mb-6 shadow-sm"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          {isLogin ? 'Entrar com Google' : 'Cadastrar com Google'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold hover:underline transition-all"
            style={{ color: '#0094eb' }}
          >
            {isLogin ? 'Criar conta' : 'Já tenho conta'}
          </button>
        </div>
      </div>

      {/* Rodapé do Sistema */}
      <footer className="relative z-10 mt-6 text-center text-sm text-gray-300">
        <p>&copy; {new Date().getFullYear()} Sistema Loja Lucrativa. Todos os direitos reservados.</p>
        <p className="mt-1">
          Saiba mais em{' '}
          <a 
            href="https://sistemalojalucrativa.com.br" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-bold hover:opacity-80 transition-opacity"
            style={{ color: '#fd8539' }}
          >
            sistemalojalucrativa.com.br
          </a>
        </p>
      </footer>
    </div>
  );
}
