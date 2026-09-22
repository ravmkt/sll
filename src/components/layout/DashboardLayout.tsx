import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Moon, Sun, Store as StoreIcon } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const { stores, currentStore, setCurrentStore, loadingStores } = useStore();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Topbar com seletor de Loja e Toggle de Tema */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#1a1f2c]/70 backdrop-blur sticky top-0 z-10">
          {/* Seletor de Loja Ativa */}
          <div className="flex items-center gap-3">
            <StoreIcon size={20} className="text-[#0094eb]" />
            {loadingStores ? (
              <span className="text-sm text-slate-400">Carregando lojas...</span>
            ) : stores.length > 0 ? (
              <select
                value={currentStore?.id || ''}
                onChange={(e) => {
                  const selected = stores.find((s) => s.id === e.target.value);
                  if (selected) setCurrentStore(selected);
                }}
                aria-label="Selecionar loja ativa"
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.domain || 'Loja sem nome'}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-amber-500 font-medium">Nenhuma loja cadastrada</span>
            )}
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#0094eb] transition-colors"
              title="Alternar Tema"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
