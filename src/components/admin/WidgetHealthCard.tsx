import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { LATEST_LOADER_VERSION, getWidgetHealth, type WidgetHealth, type WidgetHealthStatus } from '@/services/admin/storesService';
import { CARD, dtt, modLabel } from '@/components/admin/storeUi';

const SITE = 'https://sllhub.com.br';

const ST: Record<WidgetHealthStatus, { label: string; hint: string; cls: string }> = {
  ok: { label: 'Funcionando', hint: 'O loader está rodando na loja.', cls: 'bg-emerald-500/15 text-emerald-300' },
  error: { label: 'Com erro', hint: 'O último ping do loader veio com erro.', cls: 'bg-rose-500/15 text-rose-300' },
  stale: { label: 'Sem sinal', hint: 'Nenhum ping há mais de 7 dias. Pode ter sido removido ou a loja não tem visitas.', cls: 'bg-amber-500/15 text-amber-300' },
  legacy: { label: 'Eventos sem ping do loader', hint: 'A loja envia eventos, mas ainda não houve ping. Loader antigo em cache ou widget instalado direto.', cls: 'bg-sky-500/15 text-sky-300' },
  never: { label: 'Não instalado', hint: 'Nenhum ping nem evento recebido desta loja.', cls: 'bg-slate-500/15 text-slate-300' },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-0.5 break-words text-[13px] text-slate-200">{children}</div>
    </div>
  );
}

export default function WidgetHealthCard({ storeId }: { storeId: string }) {
  const [h, setH] = useState<WidgetHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getWidgetHealth(storeId)
      .then(setH)
      .catch((e: any) => toast.error(e?.message || 'Erro ao carregar a saúde do widget.'))
      .finally(() => setLoading(false));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  const snippet = `<script async src="${SITE}/sll-loader.js" data-store-id="${storeId}"></script>`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success('Snippet copiado.');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const st = h ? ST[h.status] : null;
  const outdated = !!h?.loader_version && h.loader_version !== LATEST_LOADER_VERSION;

  return (
    <div className={`${CARD} space-y-3 ${loading ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[15px] font-bold text-white">Saúde do widget</p>
          {st && <span className={`rounded-full px-2 py-0.5 text-[13px] font-bold ${st.cls}`}>{st.label}</span>}
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-bold text-slate-200 hover:bg-white/20 disabled:opacity-40">
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>
      {st && <p className="text-[13px] text-slate-500">{st.hint}</p>}

      {h && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Row label="Último ping">{h.last_ping_at ? dtt(h.last_ping_at) : '—'}</Row>
          <Row label="Primeiro ping">{h.first_ping_at ? dtt(h.first_ping_at) : '—'}</Row>
          <Row label="Versão do loader">
            {h.loader_version || '—'}
            {outdated && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">atual: {LATEST_LOADER_VERSION}</span>}
          </Row>
          <Row label="Pings recebidos">{h.ping_count}</Row>
          <Row label="Módulos carregados">{h.modules && h.modules.length ? h.modules.map((m) => modLabel(m)).join(', ') : '—'}</Row>
          <Row label="Último evento do widget">{h.last_event_at ? dtt(h.last_event_at) : '—'}</Row>
          <Row label="Última página">{h.last_page_url || '—'}</Row>
          <Row label="Erros registrados">{h.error_count}</Row>
          {h.last_error && (
            <div className="sm:col-span-2 xl:col-span-4">
              <Row label="Último erro">
                <span className="text-rose-300">{h.last_error}</span>
                {h.last_error_at && <span className="ml-2 text-slate-500">{dtt(h.last_error_at)}</span>}
              </Row>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Snippet de instalação (tag HTML personalizada no GTM da loja)</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[13px] text-slate-200">{snippet}</code>
          <button type="button" onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[13px] font-bold text-slate-200 hover:bg-white/20">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} Copiar
          </button>
        </div>
      </div>
    </div>
  );
}