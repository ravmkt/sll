import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useIsSuperadmin } from '@/hooks/admin/useIsSuperadmin';

export function MasterButton() {
  const isSuper = useIsSuperadmin();
  if (!isSuper) return null;

  return (
    <Link
      to="/admin-master"
      className="inline-flex items-center gap-2 rounded-xl bg-[#0b0e1a] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm ring-1 ring-slate-700 transition-colors hover:bg-[#151a2e]"
    >
      <ShieldCheck className="h-4 w-4 text-[#fd8539]" />
      Master
    </Link>
  );
}

export default MasterButton;