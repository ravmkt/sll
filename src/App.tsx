import { DashboardLayout } from './components/layout/DashboardLayout';

function App() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho inspirado no Vidlytics */}
        <div>
          <span className="inline-block px-3 py-1 bg-sll-blue/10 text-sll-blue dark:bg-sll-blue/20 rounded-full text-xs font-semibold tracking-wide mb-2">
            PLANO PRO
          </span>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Olá, Lojista
          </h1>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Faturamento Hoje', value: 'R$ 0,00', color: 'text-sll-blue' },
            { label: 'Lojas Ativas (Módulos)', value: '0', color: 'text-slate-700 dark:text-slate-300' },
            { label: 'Indicações', value: 'R$ 0,00', color: 'text-sll-orange' },
          ].map((card, i) => (
            <div key={i} className="bg-light-card dark:bg-dark-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">{card.label}</p>
              <h3 className={`text-2xl font-bold ${card.color}`}>{card.value}</h3>
            </div>
          ))}
        </div>

        {/* Área Central (Checklist / Atividades) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[300px]">
            <h4 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Checklist de Configuração</h4>
            {/* O conteúdo futuro vai aqui */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="w-6 h-6 rounded-full bg-sll-blue text-white flex items-center justify-center text-xs">1</div>
              <span className="text-sm dark:text-slate-300">Configurar credenciais Supabase</span>
            </div>
          </div>
          
          <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[300px]">
            <h4 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Atividade Recente</h4>
            {/* O conteúdo futuro vai aqui */}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default App;
