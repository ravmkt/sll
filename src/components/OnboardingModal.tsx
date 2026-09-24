import React, { useState } from 'react';
import { 
  Play, 
  Store, 
  Globe, 
  Mail, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SLLDatabaseService, StorePayload } from '@/services/SLLDatabaseService';
import { useLoja } from '@/context/LojaContext';

const PLATAFORMAS = [
  'Shopify',
  'Nuvemshop',
  'WooCommerce',
  'Loja Integrada',
  'Tray',
  'Yampi',
  'Cartpanda',
  'Outra',
];

export const OnboardingModal: React.FC = () => {
  const { needsOnboarding, setStoreManually } = useLoja();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState<StorePayload>({
    name: '',
    url: '',
    platform: 'Shopify',
    contact_email: '',
  });

  if (!needsOnboarding) return null;

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 2) {
      if (!formData.name.trim()) {
        setErrorMsg('O nome da loja é obrigatório.');
        return;
      }
      if (!formData.url.trim()) {
        setErrorMsg('Informe o domínio ou URL da sua loja.');
        return;
      }
      if (!formData.contact_email.trim() || !formData.contact_email.includes('@')) {
        setErrorMsg('Informe um e-mail de contato válido.');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinishSetup = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada. Faça login novamente.');

      const newStore = await SLLDatabaseService.createInitialStore(user.id, formData);
      setStoreManually(newStore);
    } catch (err: any) {
      console.error('Falha ao concluir setup inicial:', err);
      setErrorMsg(err?.message || 'Erro ao criar a loja. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#111524] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* HEADER DO STEPPER */}
        <div className="px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0094eb]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#0094eb]">
                Setup Inicial • Sistema Loja Lucrativa
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Passo {step} de 3
            </span>
          </div>

          {/* BARRA DE PROGRESSO */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-[#0094eb]' : 'bg-slate-100 dark:bg-slate-800'}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-[#0094eb]' : 'bg-slate-100 dark:bg-slate-800'}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-[#fd8539]' : 'bg-slate-100 dark:bg-slate-800'}`} />
          </div>
        </div>

        {/* CORPO DO STEP */}
        <div className="p-8 flex-1 min-h-[380px]">
          {errorMsg && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* PASSO 1: BOAS-VINDAS & VÍDEO */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-[#0094eb]/10 border border-blue-100 dark:border-[#0094eb]/20 flex items-center justify-center text-[#0094eb]">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Boas-vindas ao ecossistema SLL
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Vamos configurar a sua loja para liberar todos os seus módulos contratados como o Vidlytics e Live Commerce.
                </p>
              </div>

              {/* CONTAINER DE VÍDEO INTRODUTÓRIO (16:9) */}
              <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-slate-200 dark:border-slate-800 relative overflow-hidden flex items-center justify-center group shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                <div className="w-14 h-14 rounded-full bg-white/95 text-slate-950 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 cursor-pointer">
                  <Play size={20} className="fill-slate-950 ml-1" />
                </div>
                <span className="absolute bottom-4 left-4 text-xs font-bold text-white tracking-wide">
                  Tutorial: Como conectar sua loja em 2 minutos
                </span>
              </div>
            </div>
          )}

          {/* PASSO 2: FORMULÁRIO DE DADOS */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Identificação da sua Loja
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esses dados vincularão as métricas, os produtos e as vitrines de vídeos.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Comercial da Loja *
                  </label>
                  <div className="relative">
                    <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: Minha Loja Store"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#0094eb] dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    URL ou Domínio da Loja *
                  </label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="https://sualoja.com.br"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#0094eb] dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Plataforma de E-commerce
                    </label>
                    <div className="relative">
                      <Layers size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={formData.platform}
                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#0094eb] dark:bg-slate-900 dark:text-white cursor-pointer"
                      >
                        {PLATAFORMAS.map((plat) => (
                          <option key={plat} value={plat}>
                            {plat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail Comercial *
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="contato@sualoja.com.br"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#0094eb] dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: RESUMO E CONFIRMAÇÃO */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Confirmar dados da Loja
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tudo pronto para conectar seu ecossistema. Revise as informações abaixo:
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500">Nome da Loja:</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{formData.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500">Domínio:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formData.url}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500">Plataforma:</span>
                  <span className="text-xs font-black uppercase text-[#0094eb] bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
                    {formData.platform}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">E-mail:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formData.contact_email}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  O módulo Vidlytics e o banco de dados serão integrados automaticamente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO WIZARD */}
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
            )}
          </div>

          <div>
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                {step === 1 ? 'Começar Configuração' : 'Próximo'}
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleFinishSetup}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#fd8539] hover:bg-[#e07128] text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'Criando Loja...' : 'Criar Minha Loja e Acessar Hub'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};