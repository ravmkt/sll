import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useLoja } from '../context/LojaContext';
import { Video, Radio, ShoppingBag, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { store } = useLoja();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Visão Geral
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Loja Selecionada:{' '}
            <span className="font-semibold text-[#0094eb]">
              {store?.name || 'Nenhuma loja ativa'}
            </span>
          </p>
        </div>

        {/* Módulos em Destaque */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vidlytics */}
          <Link
            to="/dashboard/modules/vidlytics"
            className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:border-[#0094eb] hover:shadow-md transition-all group block cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-[#0094eb]/10 text-[#0094eb] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Video size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-1 group-hover:text-[#0094eb] transition-colors text-slate-900 dark:text-white">
              Vidlytics
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Widgets interativos de reels e stories para aumentar as conversões da sua loja.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0094eb]">
              Acessar Módulo <ArrowRight size={16} />
            </span>
          </Link>

          {/* Live Commerce */}
          <Link
            to="/dashboard/modules/live-commerce"
            className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:border-[#fd8539] hover:shadow-md transition-all group block cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-[#fd8539]/10 text-[#fd8539] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Radio size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-1 group-hover:text-[#fd8539] transition-colors text-slate-900 dark:text-white">
              Live Commerce
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Transmissões de vendas ao vivo integradas ao seu catálogo e carrinho de compras.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#fd8539]">
              Acessar Módulo <ArrowRight size={16} />
            </span>
          </Link>

          {/* Catálogo de Produtos */}
          <Link
            to="/dashboard/products"
            className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group block cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ShoppingBag size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-1 group-hover:text-emerald-500 transition-colors text-slate-900 dark:text-white">
              Catálogo de Produtos
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Base única de produtos vinculada a todos os seus micro-apps do SLL.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
              Ver Produtos <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}