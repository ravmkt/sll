import { LayoutDashboard, ShoppingCart, Settings, Users, Video, LogOut } from 'lucide-react';

export function Sidebar() {
  // Simulação do caminho atual
  const currentPath = '/';

  const menuItems = [
    { name: 'Visão Geral', icon: LayoutDashboard, path: '/' },
    { name: 'Módulos', icon: Video, path: '/modulos' },
    { name: 'Assinatura', icon: ShoppingCart, path: '/assinatura' },
    { name: 'Configurações', icon: Settings, path: '/config' },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 bg-light-sidebar dark:bg-dark-sidebar transition-colors duration-300 flex flex-col">
      {/* Logo Area */}
      <div className="p-6 flex justify-center items-center h-24 border-b border-slate-200 dark:border-slate-800">
        {/* Usando o caminho que você enviou. Ajuste a extensão para .png ou .svg conforme seu arquivo */}
        <img 
          src="/assets/sll-logotipo.png" 
          alt="Sistema Loja Lucrativa" 
          className="max-h-12 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Menu Principal
        </p>
        
        {menuItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          
          return (
            <a
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-sll-orange text-white font-medium shadow-md shadow-sll-orange/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sll-blue'
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <LogOut size={20} />
          <span>Sair da Plataforma</span>
        </button>
      </div>
    </aside>
  );
}
