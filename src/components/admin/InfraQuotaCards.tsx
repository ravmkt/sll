import { useEffect, useState } from 'react';
import { getAutoUsage, getManualUsage, getQuotas, type Quota } from '@/services/admin/infraUsageAdmin';
import { customTotalBrl, getCostSettings, listCustomCosts, type CustomCost } from '@/services/admin/costsAdmin';

const HINT: Record<string, string> = {
  supabase_db_gb: 'Revise a retenção de dados antigos (logs e eventos) ou suba o plano do banco.',
  supabase_storage_gb: 'Mova vídeos e arquivos pesados para o Bunny ou Cloudflare R2, ou suba o plano.',
  supabase_egress_gb: 'Sirva mídia por CDN e reduza downloads diretos do Supabase.',
  supabase_mau: 'Avalie o plano Team ou limpe contas inativas.',
  vercel_transfer_gb: 'Ative cache e compressão de imagens; mídia pesada deve sair pela CDN.',
  vercel_requests_m: 'Aumente o cache nas rotas públicas e do widget.',
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Row = { q: Quota; used: number };

export default function InfraQuotaCards() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cost, setCost] = useState<{ sb: number; vc: number; extra: number } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getQuotas(),
      getManualUsage(),
      getAutoUsage(),
      getCostSettings(),
      listCustomCosts().catch(() => [] as CustomCost[]),
    ])
      .then(([q, man, auto, s, ex]) => {
        if (!alive) return;
        setRows(q.map((x) => ({ q: x, used: x.source === 'auto' ? auto[x.key] ?? 0 : man[x.key] ?? 0 })));
        if (s) {
          setCost({
            sb: s.supabase_pro_usd * s.usd_to_brl_rate,
            vc: s.vercel_pro_usd * s.usd_to_brl_rate,
            extra: customTotalBrl(ex, s.usd_to_brl_rate),
          });
        }
      })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

  if (rows === null) return null;
  if (rows.length === 0) return <p className="mb-3 text-[13px] text-slate-500">Cotas de infraestrutura não encontradas. Cadastre em Preços &gt; Custos.</p>;

  const pct = (r: Row) => (r.q.included > 0 ? r.used / r.q.included : 0);
  const hot = rows.filter((r) => r.q.included > 0 && pct(r) >= 0.8).sort((a, b) => pct(b) - pct(a));

  return (
    <div className="mb-4 space-y-3">
      {hot.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-200">
          <p className="font-bold">Hora de avaliar upgrade ou otimização ({hot.length}):</p>
          <ul className="mt-1 list-disc pl-4">
            {hot.map((r) => (
              <li key={r.q.key}>
                <b>{r.q.label}</b>: {(pct(r) * 100).toFixed(0)}% da franquia ({fmt(r.used)} de {fmt(r.q.included)} {r.q.unit}). {HINT[r.q.key] ?? ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const p = pct(r);
          const bar = p > 1 ? 'bg-rose-500' : p >= 0.8 ? 'bg-amber-400' : 'bg-emerald-500';
          return (
            <div key={r.q.key} className="rounded-2xl border border-slate-800 bg-[#111524] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-white">{r.q.label}</p>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{r.q.service}</span>
              </div>
              <p className="mt-2 text-[15px] font-bold text-white">
                {fmt(r.used)} <span className="font-normal text-slate-500">de {r.q.included > 0 ? fmt(r.q.included) : 'ilimitado'} {r.q.unit}</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, p * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {r.q.included > 0 ? `${(p * 100).toFixed(0)}% da franquia` : 'Sem franquia definida'} · {r.q.source === 'auto' ? 'leitura automática' : 'uso informado em Custos'}
              </p>
            </div>
          );
        })}
      </div>
      {cost && (
        <p className="text-xs text-slate-500">
          Custo fixo mensal (de Preços &gt; Custos): Supabase {brl(cost.sb)} + Vercel {brl(cost.vc)} + extras {brl(cost.extra)} = <b className="text-slate-300">{brl(cost.sb + cost.vc + cost.extra)}</b>
        </p>
      )}
    </div>
  );
}