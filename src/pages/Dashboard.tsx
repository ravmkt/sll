import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useStore } from '../contexts/StoreContext';
import { Video, Radio, ShoppingBag, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { currentStore } = useStore();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Loja Selecionada:{' '}
            <span className="font-semibold text-[#0094eb]">
              {currentStore?.name || 'Nenhuma loja ativa'}
            </span>
          </p>
        </div>

        {/* Módulos em Destaque */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:border-[#0094eb] transition-all">
            <div className="w-12 h-12 rounded-lg bg-[#0094eb]/10 text-[#0094eb] flex items-center justify-center mb-4">
              <Video size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-1">Vidlytics</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Widgets interativos de reels e stories para aumentar as conversões da sua loja.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0094eb]">
              Acessar Módulo <ArrowRight size={16} />
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:border-[#fd8539] transition-all">
            <div className="w-12 h-12 rounded-lg bg-[#fd8539]/10 text-[#fd8539] flex items-center justify-center mb-4">
              <Radio size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-1">Live Commerce</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Transmissões de vendas ao vivo integradas ao seu catálogo e carrinho de compras.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#fd8539]">
              Acessar Módulo <ArrowRight size={16} />
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <ShoppingBag size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-1">Catálogo de Produtos</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Base única de produtos vinculada a todos os seus micro-apps do SLL.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
              Ver Produtos <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
