import { useEffect, useState } from 'react';
import { Loader2, Radio } from 'lucide-react';
import { listDestinations, type DestinationRow } from '@/services/streamSell/streamSellService';

const PLATFORMS: { key: DestinationRow['platform']; label: string }[] = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
];
const STATUS: Record<string, { text: string; cls: string }> = {
  not_connected: { text: 'Não conectado', cls: 'bg-slate-100 text-slate-500' },
  connected: { text: 'Conectado', cls: 'bg-emerald-100 text-emerald-700' },
  error: { text: 'Com erro', cls: 'bg-rose-100 text-rose-600' },
  expired: { text: 'Expirado', cls: 'bg-amber-100 text-amber-700' },
};

export default function Destinos() {
  const [rows, setRows] = useState<DestinationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDestinations()
      .then(setRows)
      .catch((e) => setError(e?.message ?? 'Erro ao carregar destinos'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-base font-bold text-slate-900">Destinos</h1>
        <p className="text-xs text-slate-500">Plataformas que recebem os eventos da sua live, além do site.</p>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {PLATFORMS.map((p) => {
          const row = rows.find((r) => r.platform === p.key);
          const st = STATUS[row?.status ?? 'not_connected'];
          return (
            <div key={p.key} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold"><Radio className="w-4 h-4" />{p.label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
              </div>
              {row?.external_account && <p className="text-xs text-slate-500 truncate">{row.external_account}</p>}
              <button type="button" disabled className="w-full text-xs font-bold py-2 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed">
                Conectar (em breve)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}