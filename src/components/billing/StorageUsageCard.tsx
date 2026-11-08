import { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentStoreId } from '@/modules/builder/services/pages';

type Usage = { videos_bytes: number; builder_bytes: number; used_bytes: number; limit_bytes: number | null };

const MB = 1024 * 1024;
const GB = 1024 * MB;
const fmt = (n: number) => (n >= GB ? `${(n / GB).toFixed(2).replace('.', ',')} GB` : `${(n / MB).toFixed(1).replace('.', ',')} MB`);

export default function StorageUsageCard({ storeId, dark = false }: { storeId?: string; dark?: boolean }) {
  const [u, setU] = useState<Usage | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = storeId ?? (await getCurrentStoreId());
        const { data, error } = await (supabase as any).rpc('store_storage_usage', { p_store: id });
        if (error) throw error;
        if (alive) setU(data as Usage);
      } catch {
        if (alive) setErr(true);
      }
    })();
    return () => { alive = false; };
  }, [storeId]);

  const box = dark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-white text-slate-800';
  const sub = dark ? 'text-slate-400' : 'text-slate-500';
  const track = dark ? 'bg-white/10' : 'bg-slate-200';

  if (err) return <div className={`rounded-xl border p-4 text-sm ${box} ${sub}`}>Armazenamento indisponível no momento.</div>;
  if (!u) return <div className={`rounded-xl border p-4 text-sm ${box} ${sub}`}>Carregando armazenamento...</div>;

  const lim = u.limit_bytes;
  const pct = lim ? Math.min(100, (u.used_bytes / lim) * 100) : 0;
  const bar = !lim ? 'bg-[#0094eb]' : pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-[#0094eb]';

  return (
    <div className={`rounded-xl border p-4 ${box}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <HardDrive className="h-4 w-4" /> Armazenamento
        </span>
        <span className="text-sm font-semibold">
          {fmt(u.used_bytes)}{lim ? ` de ${fmt(lim)}` : ' (ilimitado)'}
        </span>
      </div>
      {lim ? (
        <div className={`h-2 w-full overflow-hidden rounded-full ${track}`}>
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      <div className={`mt-2 flex gap-4 text-xs ${sub}`}>
        <span>Vídeos: {fmt(u.videos_bytes)}</span>
        <span>Builder: {fmt(u.builder_bytes)}</span>
        {lim ? <span>{pct.toFixed(0)}% usado</span> : null}
      </div>
    </div>
  );
}