import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, unknown>;

export interface LojaMetrics {
  conversion?: number | null;
  ctr?: number | null;
  retention5s?: number | null;
  addToCart?: number | null;
  ticket?: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sector?: string | null;
  loja?: LojaMetrics | null;
}

const MASCOT = '/assets/noah-a3.png';

const norm = (s: string) =>
  s.replace(/&/g, ' e ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v);
const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

type Metric = {
  key: string;
  label: string;
  tip: string;
  min: number | null;
  max: number | null;
  value: number | null;
  fmt: (n: number) => string;
};

type Status = 'below' | 'within' | 'above' | 'none';

const statusOf = (m: Metric): Status => {
  if (m.value === null || m.min === null || m.max === null) return 'none';
  if (m.value < m.min) return 'below';
  if (m.value > m.max) return 'above';
  return 'within';
};

const STATUS_UI: Record<Status, { label: string; badge: string; marker: string }> = {
  below: { label: 'Abaixo do setor', badge: 'bg-rose-50 text-rose-600', marker: 'bg-rose-500' },
  within: { label: 'Dentro da média', badge: 'bg-amber-50 text-amber-600', marker: 'bg-amber-500' },
  above: { label: 'Acima do setor', badge: 'bg-emerald-50 text-emerald-600', marker: 'bg-emerald-500' },
  none: { label: 'Sem dados da loja', badge: 'bg-slate-100 text-slate-500', marker: 'bg-slate-400' },
};

function MetricCard({ m }: { m: Metric }) {
  const st = statusOf(m);
  const ui = STATUS_UI[st];
  const hasRange = m.min !== null && m.max !== null;
  const scaleMax = hasRange ? Math.max((m.max as number) * 1.5, (m.value ?? 0) * 1.1) : 1;
  const left = hasRange ? ((m.min as number) / scaleMax) * 100 : 0;
  const width = hasRange ? (((m.max as number) - (m.min as number)) / scaleMax) * 100 : 0;
  const pos = m.value !== null ? Math.min(98, Math.max(2, (m.value / scaleMax) * 100)) : 0;

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">{m.label}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ui.badge}`}>{ui.label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Sua loja</p>
          <p className="text-lg font-black text-slate-900">{m.value !== null ? m.fmt(m.value) : '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Setor</p>
          <p className="text-sm font-bold text-slate-600">
            {hasRange ? `${m.fmt(m.min as number)} a ${m.fmt(m.max as number)}` : 'Sem dados'}
          </p>
        </div>
      </div>
      {hasRange && (
        <div className="relative mt-3 h-2 rounded-full bg-slate-100">
          <div className="absolute top-0 h-2 rounded-full bg-[#0094eb]/30" style={{ left: `${left}%`, width: `${width}%` }} />
          {m.value !== null && (
            <div className={`absolute -top-1 h-4 w-1.5 rounded-full ${ui.marker}`} style={{ left: `${pos}%` }} />
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-slate-400">{m.tip}</p>
    </div>
  );
}

export function MarketStudyModal({ open, onClose, sector, loja }: Props) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [mascotOk, setMascotOk] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('sector_benchmarks').select('*');
      if (!alive) return;
      const target = norm(sector || '');
      const rows = (data as Row[] | null) ?? [];
      const found =
        rows.find((r) => norm(String(r.sector_name ?? '')) === target) ??
        rows.find((r) => {
          const n = norm(String(r.sector_name ?? ''));
          return target.length > 3 && (n.includes(target) || target.includes(n));
        }) ??
        null;
      setRow(found);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, sector]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const metrics: Metric[] = row
    ? [
        { key: 'conv', label: 'Taxa de conversão', tip: 'Visitas que viram compra.', min: num(row.conversion_rate_min), max: num(row.conversion_rate_max), value: num(loja?.conversion), fmt: pct },
        { key: 'ctr', label: 'CTR dos vídeos', tip: 'Quem clica depois de ver o vídeo.', min: num(row.video_ctr_min), max: num(row.video_ctr_max), value: num(loja?.ctr), fmt: pct },
        { key: 'ret', label: 'Retenção aos 5s', tip: 'Quem continua assistindo após 5 segundos.', min: num(row.retention_5s_min), max: num(row.retention_5s_max), value: num(loja?.retention5s), fmt: pct },
        { key: 'cart', label: 'Adição ao carrinho', tip: 'Visitas que colocam produto no carrinho.', min: num(row.add_to_cart_min), max: num(row.add_to_cart_max), value: num(loja?.addToCart), fmt: pct },
        { key: 'tkt', label: 'Ticket médio', tip: 'Valor médio por pedido.', min: num(row.ticket_avg_min), max: num(row.ticket_avg_max), value: num(loja?.ticket), fmt: brl },
      ]
    : [];

  const withData = metrics.filter((m) => statusOf(m) !== 'none');
  const below = withData.filter((m) => statusOf(m) === 'below');
  const above = withData.filter((m) => statusOf(m) === 'above').length;
  const within = withData.filter((m) => statusOf(m) === 'within').length;

  let summary = 'Compare os indicadores do seu setor. Assim que a loja tiver dados suficientes, mostramos aqui onde você está.';
  if (withData.length > 0) {
    summary =
      below.length === 0
        ? `Sua loja está na média ou acima do setor em todos os ${withData.length} indicadores medidos. Continue assim!`
        : `Sua loja está abaixo do setor em: ${below.map((m) => m.label).join(', ')}. Esse é o melhor ponto para focar agora.`;
  }

  const updated = row && typeof row.updated_at === 'string' ? new Date(row.updated_at).toLocaleDateString('pt-BR') : null;
  const source = row && typeof row.source_reference === 'string' ? row.source_reference : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Estudo de mercado"
      >
        <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[#0094eb]/10 via-white to-white px-6 pt-5">
          <div className="pb-4">
            <h2 className="text-lg font-bold text-slate-900">Estudo de mercado</h2>
            <p className="text-sm font-semibold text-[#0094eb]">{row ? String(row.sector_name) : sector || 'Setor não definido'}</p>
            <p className="mt-2 max-w-md text-sm leading-snug text-slate-600">{summary}</p>
          </div>
          <div className="flex items-start gap-1">
            {mascotOk && (
              <img src={MASCOT} alt="Noah" className="h-32 w-auto object-contain" onError={() => setMascotOk(false)} />
            )}
            <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 pt-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>
          ) : !row ? (
            <p className="py-10 text-center text-sm text-slate-500">Ainda não há benchmark para este setor.</p>
          ) : (
            <>
              {withData.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">{above} acima</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-600">{within} na média</span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-600">{below.length} abaixo</span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.map((m) => (
                  <MetricCard key={m.key} m={m} />
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-snug text-slate-400">
                A faixa azul mostra o intervalo típico do setor; o marcador mostra onde sua loja está.
                {updated ? ` Atualizado em ${updated}.` : ''}
                {source ? ` Fonte: ${source}.` : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarketStudyModal;