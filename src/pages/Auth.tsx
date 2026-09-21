import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [nome, setNome] = useState('');
  const [loja, setLoja] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      console.error('Erro no login com Google:', error.message);
      alert('Ocorreu um erro ao tentar logar com o Google.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('Erro ao fazer login: ' + error.message);
    } else {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: '#0094eb' }}>SLL Hub</h1>
          <p className="text-gray-400">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta para começar'}
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 px-4 rounded-lg font-bold hover:bg-gray-100 transition duration-300 mb-6 shadow-sm"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Continuar com o Google
        </button>

        <div className="flex items-center mb-6">
          <div className="flex-grow border-t border-gray-600"></div>
          <span className="px-4 text-gray-400 text-sm font-medium">ou com email</span>
          <div className="flex-grow border-t border-gray-600"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <input type="text" placeholder="Seu Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} className="p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0094eb] text-white transition-all" required />
              <input type="text" placeholder="Nome da sua Loja" value={loja} onChange={(e) => setLoja(e.target.value)} className="p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0094eb] text-white transition-all" required />
            </>
          )}
          <input type="email" placeholder="Seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0094eb] text-white transition-all" required />
          <input type="password" placeholder="Sua Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0094eb] text-white transition-all" required minLength={6} />

          <button type="submit" disabled={loading} className="w-full py-3 mt-2 rounded-lg font-bold text-white transition duration-300 hover:opacity-90 shadow-lg" style={{ backgroundColor: '#fd8539' }}>
            {loading ? 'Processando...' : (isLogin ? 'Entrar no Hub' : 'Criar Conta')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-400">
          {isLogin ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="ml-2 font-semibold hover:underline" style={{ color: '#0094eb' }}>
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
}
