import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../../../context/LojaContext';
import { AffiliateDatabaseService, AffiliateSummary } from '../../../services/AffiliateDatabaseService';
import { 
  CheckCircle2, 
  Hourglass, 
  DollarSign, 
  Eye, 
  HardDrive, 
  FileText, 
  Clock, 
  Play, 
  Share2, 
  Link2, 
  Check, 
  Settings, 
  Palette, 
  Edit3, 
  Radio,
  ArrowRight
} from 'lucide-react';

export default function VisaoGeralTab() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { storeId, store } = useLoja();
  const [affiliateSummary, setAffiliateSummary] = useState<AffiliateSummary | null>(null);

  useEffect(() => {
    if (!storeId) return;
    AffiliateDatabaseService.getSummary(storeId).then(setAffiliateSummary);
  }, [storeId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(store?.referral_code ? (window.location.origin + '/?ref=' + store.referral_code) : 'https://vidlytics.com.br/indica/useanny');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header de Boas-Vindas e Status do App */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-[#0094eb]/10 text-[#0094eb] uppercase tracking-wide">
              Plano Scale
            </span>
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-pink-100 text-pink-600 uppercase tracking-wide">
              Acesso Vitalício
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
            Olá, Loja
          </h1>
        </div>

        {/* Card Aplicativo Ativado */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3 max-w-md">
          <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 flex-shrink-0 animate-pulse" />
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              Aplicativo Ativado
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              Seus vídeos estão online e sendo transmitidos publicamente no seu e-commerce.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Resultados de Vendas Vindas dos Vídeos */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Resultados de Vendas Vindas dos Vídeos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card: Vendas Pagas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Vendas Pagas</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                  0 Pedidos
                </span>
              </div>
              <p className="text-2xl font-black text-slate-800">R$ 0,00</p>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                Faturamento confirmado →
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
          </div>

          {/* Card: Aguardando Pagamento */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Aguardando Pagamento</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">
                  3 Pedidos
                </span>
              </div>
              <p className="text-2xl font-black text-slate-800">R$ 378,39</p>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                Pix / Boleto pendente →
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-6 h-6 text-amber-500" />
            </div>
          </div>

          {/* Card: Faturamento Indicações */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Faturamento Indicações</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-[#0094eb]">
                  Comissões
                </span>
              </div>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(affiliateSummary?.available_balance || 0)}</p>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                Ver detalhes no Indica & Ganha →
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-[#0094eb]" />
            </div>
          </div>

        </div>
      </div>

      {/* 3. Consumo do Plano */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Consumo do Plano
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Visualizações */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Visualizações</span>
              <Eye className="w-4 h-4 text-[#0094eb]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">57</span>
              <span className="text-xs text-slate-400 font-medium">de 60.000</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Quota do mês</span>
              <span className="font-semibold text-slate-700">0%</span>
            </div>
          </div>

          {/* Armazenamento */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Armazenamento</span>
              <HardDrive className="w-4 h-4 text-[#0094eb]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">10.3 MB</span>
              <span className="text-xs text-slate-400 font-medium">de 50 GB</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Vídeos na nuvem</span>
              <span className="font-semibold text-slate-700">0%</span>
            </div>
          </div>

          {/* Páginas com Vídeos */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Páginas com Vídeos</span>
              <FileText className="w-4 h-4 text-[#0094eb]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">1</span>
              <span className="text-xs text-slate-400 font-medium">de 9999 ativas</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Locais de exibição</span>
              <span className="font-semibold text-slate-700">0%</span>
            </div>
          </div>

          {/* Ciclo da Conta */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Ciclo da Conta</span>
              <Clock className="w-4 h-4 text-[#0094eb]" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
              <span className="text-xl font-black text-slate-800">Vitalício</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Renovação:</span>
              <span className="font-medium text-slate-600">— (sem vencimento)</span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Duas Colunas: Checklist da Ativação + Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Coluna Esquerda: Checklist da Ativação da Loja */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Checklist da Ativação da Loja</h3>
              <p className="text-xs text-slate-400 mt-0.5">Conclua os passos para publicar seus stories.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-emerald-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full rounded-full" />
              </div>
              <span className="text-xs font-bold text-emerald-600">100%</span>
            </div>
          </div>

          <div className="space-y-3">
            
            {/* Item 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Configurações da loja</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Preencha os dados cadastrais, e-mail e integre seu canal de WhatsApp.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Instalação do script</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Copie e instale o script de embed nas plataformas ou via GTM.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Vincular os produtos</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Vincule produtos com preço para permitir compra direta através dos vídeos.
                </p>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Subir vídeos</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Suba seus vídeos verticais ou importe do Instagram/TikTok.
                </p>
              </div>
            </div>

            {/* Item 5 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Criar coleção de Stories</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Agrupe seus vídeos em coleções interativas.
                </p>
              </div>
            </div>

            {/* Item 6 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Configurar a aparência</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Personalize cores, fontes, bordas e botões do player de stories.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Coluna Direita: Atividade Recente (Log do Painel) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-slate-800">Atividade Recente (Log do Painel)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Histórico em tempo real de alterações e atividades do usuário.</p>
            </div>

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              
              {/* Log 1 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">Coleção de stories atualizada: <span className="font-bold">TESTE</span></p>
                  <p className="text-[10px] text-slate-400">16 de set. às 16:29</p>
                </div>
              </div>

              {/* Log 2 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Settings className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">Configurações da loja salvas: <span className="font-bold">Use Anny Moda Feminina</span></p>
                  <p className="text-[10px] text-slate-400">15 de set. às 13:57</p>
                </div>
              </div>

              {/* Log 3 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Settings className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">Configurações da loja salvas: <span className="font-bold">Use Anny Moda Feminina</span></p>
                  <p className="text-[10px] text-slate-400">15 de set. às 10:52</p>
                </div>
              </div>

              {/* Log 4 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Settings className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">Configurações da loja salvas: <span className="font-bold">Use Anny Moda Feminina</span></p>
                  <p className="text-[10px] text-slate-400">10 de set. às 08:30</p>
                </div>
              </div>

              {/* Log 5 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">Coleção de stories atualizada: <span className="font-bold">TESTE</span></p>
                  <p className="text-[10px] text-slate-400">09 de set. às 16:50</p>
                </div>
              </div>

              {/* Log 6 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Palette className="w-3.5 h-3.5 text-[#0094eb]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">Aparência do player atualizada: <span className="font-bold">USEANNY</span></p>
                  <p className="text-[10px] text-slate-400">09 de set. às 16:23</p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* 5. Duas Colunas Inferiores: Vidlytics Academy + Indique e Ganhe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card Vidlytics Academy */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col sm:flex-row items-center gap-5 hover:border-slate-300 transition-all">
          <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-gradient-to-tr from-sky-500 via-indigo-500 to-amber-400 flex items-center justify-center flex-shrink-0 group cursor-pointer shadow-inner">
            <div className="w-11 h-11 rounded-full bg-white/95 shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-[#0094eb] fill-[#0094eb] ml-0.5" />
            </div>
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-sky-50 text-[#0094eb] uppercase tracking-wider">
              <Radio className="w-3 h-3" /> Vidlytics Academy
            </span>
            <h4 className="text-sm font-bold text-slate-800 leading-snug">
              Como dobrar suas conversões com vídeos em 3 passos
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Aprenda as melhores práticas de posicionamento e gatilhos de CTA para aumentar as vendas da sua loja.
            </p>
          </div>
        </div>

        {/* Card Indique e Ganhe */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800">
              <DollarSign className="w-4 h-4 text-[#0094eb]" />
              <h4 className="text-sm font-bold">Indique e Ganhe</h4>
            </div>
            <Share2 className="w-4 h-4 text-slate-400" />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Receba comissões e desbloqueie meses gratuitos ao indicar o Vidlytics para outros lojistas.
          </p>

          <div className="space-y-2">
            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.99]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  LINK COPIADO!
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  COPIAR MEU LINK DE INDICAÇÃO
                </>
              )}
            </button>

            <div className="text-center">
              <a 
                href="/dashboard/afiliados"
                onClick={(e) => { e.preventDefault(); navigate('/dashboard/afiliados'); }}
                className="text-[11px] font-semibold text-slate-500 hover:text-[#0094eb] transition-colors inline-flex items-center gap-1"
              >
                Acessar painel de indicações →
              </a>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}


