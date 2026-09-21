import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Moon, Sun } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true); // Começando no dark mode como o print

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300 flex">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col">
        {/* Topbar simples para o Toggle de Tema */}
        <header className="h-16 flex items-center justify-end px-8 border-b border-transparent">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sll-blue transition-colors"
            title="Alternar Tema"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {/* Dynamic Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
