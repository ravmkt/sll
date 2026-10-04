import { useEffect, useState } from 'react';
import { useLoja } from '../../contexts/LojaContext';

export function StoreBrand() {
  const ctx: any = useLoja();
  const store = ctx?.store;
  const [failed, setFailed] = useState(false);
  const name: string = store?.name || 'Minha loja';
  const logo: string | null = store?.logo_url || null;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  useEffect(() => { setFailed(false); }, [logo]);

  return (
    <div className="flex items-center gap-3 min-w-0">
      {logo && !failed ? (
        <img
          src={logo}
          alt={name}
          onError={() => setFailed(true)}
          className="w-9 h-9 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0094eb] to-[#fd8539] text-white text-xs font-bold flex items-center justify-center shrink-0">
          {initials || 'L'}
        </div>
      )}
      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[260px]">{name}</span>
    </div>
  );
}

export default StoreBrand;