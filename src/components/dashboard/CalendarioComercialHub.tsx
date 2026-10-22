import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Lightbulb, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { nextOccurrence, type RuleDate } from '@/lib/commercialOccurrence';
import { stageOf, type SeasonalStage } from '@/services/seasonalTips';
import { plainText } from '@/services/scopedTips';
import { useStoreSector } from '@/hooks/useStoreSector';

const sb: any = supabase;
const DAY_MS = 86400000;
const WINDOW_DAYS = 60;
const MAX_ITEMS = 5;

type Row = { id: string; name: string; tip: string; date: Date; left: number; stage: SeasonalStage };
type Detail = { title: string; text: string };

const STAGE: Record<SeasonalStage, { label: string; cls: string }> = {
  plan: { label: 'Planejar', cls: 'bg-sky-50 text-sky-700' },
  produce: { label: 'Produzir', cls: 'bg-amber-50 text-amber-700' },
  urgent: { label: 'Urgente', cls: 'bg-rose-50 text-rose-700' },
};

const STAGE_HINT: Record<SeasonalStage, Detail> = {
  plan: {
    title: 'Hora de planejar',
    text: 'Defina as ofertas, confira o estoque dos produtos que mais saem e deixe o roteiro dos vídeos da campanha pronto.',
  },
  produce: {
    title: 'Hora de produzir',
    text: 'Grave os vídeos da campanha, vincule os produtos em destaque e agende a divulgação para as próximas semanas.',
  },
  urgent: {
    title: 'Ação imediata',
    text: 'Publique agora o vídeo da campanha, destaque os produtos da data na Home e avise seus clientes pelo WhatsApp.',
  },
};

const whenLabel = (n: number) => (n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : `Em ${n} dias`);
const monthShort = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

export default function CalendarioComercialHub() {
  const navigate = useNavigate();
  const sectorId = useStoreSector();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sectorName, setSectorName] = useState<string | null>(null);
  const [sel, setSel] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    if (!sectorId) { setSectorName(null); return; }
    let alive = true;
    (async () => {
      for (const table of ['sectors', 'store_sectors', 'market_sectors']) {
        try {
          const { data, error } = await sb.from(table).select('*').eq('id', sectorId).maybeSingle();
          if (error || !data) continue;
          const n = data.name ?? data.label ?? data.title ?? data.sector_name;
          if (n) { if (alive) setSectorName(String(n)); return; }
        } catch { /* tenta a proxima tabela */ }
      }
    })();
    return () => { alive = false; };
  }, [sectorId]);

  useEffect(() => {
    if (sectorId === undefined) return;
    let alive = true;
    (async () => {
      try {
        let ids: string[] = [];
        if (sectorId) {
          const { data } = await sb.from('commercial_date_sectors').select('commercial_date_id').eq('sector_id', sectorId);
          ids = (data || []).map((r: any) => r.commercial_date_id as string);
        }
        let q = sb
          .from('commercial_dates')
          .select('id,slug,name,description,tip,rule_type,month,day,weekday,nth,lead_days')
          .eq('is_active', true);
        if (ids.length) q = q.in('id', ids);
        const { data, error } = await q;
        if (error) throw error;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const out: Row[] = [];
        for (const d of (data || []) as RuleDate[]) {
          const date = nextOccurrence(d, today);
          if (!date) continue;
          const left = Math.round((date.getTime() - today.getTime()) / DAY_MS);
          if (left < 0 || left > WINDOW_DAYS) continue;
          const any = d as any;
          out.push({ id: String(any.id), name: String(any.name), tip: String(any.tip || any.description || ''), date, left, stage: stageOf(left) });
        }
        out.sort((a, b) => a.left - b.left);
        if (alive) setRows(out.slice(0, MAX_ITEMS));
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => { alive = false; };
  }, [sectorId]);

  // Dica rapida do pop-up: etapa da data > dica do setor > texto da data > sugestao padrao da etapa
  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    let alive = true;
    setDetail(null);
    (async () => {
      let result: Detail | null = null;
      try {
        const { data: st } = await sb
          .from('commercial_date_stage_tips')
          .select('title,content,sector_id')
          .eq('is_active', true)
          .eq('scope', 'hub')
          .eq('commercial_date_id', sel.id)
          .eq('stage', sel.stage);
        const list = (st || []) as any[];
        const exact = sectorId ? list.filter((r) => r.sector_id === sectorId) : [];
        const pool = exact.length ? exact : list.filter((r) => !r.sector_id);
        if (pool.length) {
          const pick = pool[Math.floor(Date.now() / DAY_MS) % pool.length];
          result = { title: String(pick.title || ''), text: plainText(pick.content) };
        }
        if (!result && sectorId) {
          const { data: tp } = await sb
            .from('commercial_date_tips')
            .select('tip')
            .eq('sector_id', sectorId)
            .eq('commercial_date_id', sel.id)
            .maybeSingle();
          if (tp?.tip) result = { title: STAGE_HINT[sel.stage].title, text: String(tp.tip) };
        }
      } catch { /* usa o texto padrao */ }
      if (!result && sel.tip) result = { title: STAGE_HINT[sel.stage].title, text: sel.tip };
      if (!result) result = STAGE_HINT[sel.stage];
      if (alive) setDetail(result);
    })();
    return () => { alive = false; };
  }, [sel, sectorId]);

  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel]);

  return (
    <div data-tour="calendar" className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">Datas comemorativas</h3>
          <p className="text-sm text-slate-500">
            {sectorName ? (
              <>Próximos {WINDOW_DAYS} dias, de acordo com o segmento <strong className="font-semibold text-slate-700">{sectorName}</strong>.</>
            ) : (
              <>Próximos {WINDOW_DAYS} dias, de acordo com o segmento da sua loja.</>
            )}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {rows === null ? (
          [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)
        ) : rows.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
            Nenhuma data comercial relevante nos próximos {WINDOW_DAYS} dias.
          </p>
        ) : (
          rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSel(r)}
              className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all hover:border-[#0094eb]/40 hover:bg-slate-50 ${
                i === 0 ? 'border-[#0094eb]/30 bg-sky-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
                <span className="text-sm font-black leading-none">{String(r.date.getDate()).padStart(2, '0')}</span>
                <span className="text-[10px] font-bold uppercase leading-tight">{monthShort(r.date)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{r.name}</p>
                <p className="truncate text-xs font-medium text-slate-500">{whenLabel(r.left)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE[r.stage].cls}`}>
                {STAGE[r.stage].label}
              </span>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate('/dashboard/dicas')}
        className="mt-auto inline-flex cursor-pointer items-center gap-1.5 self-end text-xs font-bold text-[#0094eb] hover:underline"
      >
        Ver dicas e insights <ArrowRight className="h-3 w-3" />
      </button>

      {sel &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setSel(null)}
            role="dialog"
            aria-modal="true"
            aria-label={sel.name}
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
                    <span className="text-base font-black leading-none">{String(sel.date.getDate()).padStart(2, '0')}</span>
                    <span className="text-[10px] font-bold uppercase leading-tight">{monthShort(sel.date)}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold leading-tight text-slate-900">{sel.name}</h4>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">{whenLabel(sel.left)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE[sel.stage].cls}`}>{STAGE[sel.stage].label}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSel(null)}
                  aria-label="Fechar"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0094eb]">
                  <Lightbulb className="h-3.5 w-3.5" /> Sugestão rápida
                </div>
                {detail ? (
                  <>
                    {detail.title && <p className="text-sm font-bold text-slate-900">{detail.title}</p>}
                    <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">{detail.text}</p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSel(null)}
                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => { setSel(null); navigate('/dashboard/dicas'); }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#007fcc]"
                >
                  Ver mais dicas <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}