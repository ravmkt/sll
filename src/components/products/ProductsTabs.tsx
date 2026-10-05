import { Link, useLocation } from 'react-router-dom';
import { Package, Ruler } from 'lucide-react';

const TABS = [
  { label: 'Produtos', path: '/dashboard/produtos', icon: Package },
  { label: 'Medidas', path: '/dashboard/medidas', icon: Ruler },
];

export default function ProductsTabs() {
  const { pathname } = useLocation();
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
      {TABS.map(({ label, path, icon: Icon }) => {
        const active = pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              active
                ? 'border-[#0094eb] text-[#0094eb]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}