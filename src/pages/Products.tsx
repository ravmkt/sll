import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ShoppingBag, Construction } from 'lucide-react';

export default function Products() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo de Produtos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Base central de produtos sincronizada com todos os seus módulos SLL.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
            <ShoppingBag size={32} />
          </div>
          <h2 className="text-xl font-semibold mb-2">Módulo em Integração</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
            O catálogo central de produtos está sendo conectado à tabela public.products do Supabase Central.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium">
            <Construction size={16} /> Em Breve
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}