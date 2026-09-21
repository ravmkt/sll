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
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 font-sans relative bg-cover bg-center"
      /* Ajuste o caminho abaixo para o nome real da imagem que você fez upload */
      style={{ backgroundImage: 'url("/bg-login.jpg")' }} 
    >
      {/* Overlay escuro para dar destaque à caixa central */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] w-full max-w-md border border-gray-100 relative z-10">
        
        
