import { AppFooter } from '@/components/layout/AppFooter';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Sparkles, CheckCircle2, ArrowRight, Zap, PlayCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';

export default function PlanosGatePage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { store } = useLoja();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-[#0094eb] selection:text-white">
      {/* Topo / Navbar simples */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0094eb] to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-[#0094eb]/20">
            SLL
          </div>
          <span className="font-bold tracking-tight text-lg">Sistema Loja Lucrativa</span>
        </div>

        <button
          onClick={() => signOut()}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <LogOut size={14} /> Sair da conta
        </button>
      </header>

      {/* Conteúdo Principal / Hero de Conversão */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0094eb]/10 border border-[#0094eb]/30 text-[#0094eb] text-xs font-semibold mb-6">
          <Sparkles size={14} />
          <span>Desbloqueie o Máximo Potencial do Seu E-commerce</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl leading-tight mb-4">
          Potencialize as vendas de{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0094eb] to-cyan-400">
            {store?.name || 'sua loja'}
          </span>{' '}
          com o ecossistema SLL
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mb-8">
          Seu período de teste terminou ou você ainda não possui um plano ativo. Escolha uma assinatura para liberar widgets interativos de reels, stories e transmissões ao vivo.
        </p>

        {/* Destaques rápidos de valor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-10 text-left">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[#0094eb] mb-2"><PlayCircle size={22} /></div>
            <h4 className="font-semibold text-sm mb-1 text-white">Vidlytics</h4>
            <p className="text-xs text-slate-400">Vídeos curtos e interativos direto nas páginas dos seus produtos.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[#fd8539] mb-2"><Zap size={22} /></div>
            <h4 className="font-semibold text-sm mb-1 text-white">Live E-commerce</h4>
            <p className="text-xs text-slate-400">Lives interativas com carrinho em tempo real para picos de venda.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-emerald-400 mb-2"><CheckCircle2 size={22} /></div>
            <h4 className="font-semibold text-sm mb-1 text-white">+ Conversão Comprovada</h4>
            <p className="text-xs text-slate-400">Multiplique o engajamento e reduza o abandono de checkout.</p>
          </div>
        </div>

        {/* Botão de Chamada para Ação */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={() => navigate('/dashboard/planos')}
            className="px-8 py-3.5 rounded-xl bg-[#0094eb] hover:bg-[#0082cf] text-white font-semibold text-sm shadow-xl shadow-[#0094eb]/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Ver Planos e Ativar Agora
            <ArrowRight size={18} />
          </button>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
