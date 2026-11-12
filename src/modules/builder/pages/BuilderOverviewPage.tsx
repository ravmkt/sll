import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Check, Eye, FileText, Link2, Pencil, Share2, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react';
import ModuleHeader from '@/components/layout/ModuleHeader';
import StorageUsageCard from '@/components/billing/StorageUsageCard';
import ProximasDatasComerciais from '@/components/vidlytics/ProximasDatasComerciais';
import { useLoja } from '@/contexts/LojaContext';
import { useStoreSector } from '@/hooks/useStoreSector';
import { listScopedTips, pickTip, plainText, type ScopedTip } from '@/services/scopedTips';
import { getBuilderOverview, type BuilderOverview } from '../services/overview';

const PERIODOS = [{ d: 7, label: '7 dias' }, { d: 30, label: '30 dias' }, { d: 90, label: '90 dias' }];
const BUILDER_TIP = { title: 'Uma página, um objetivo', text: 'Use um único botão ou formulário por página e deixe o formulário de cadastro visível logo no início para captar mais leads.' };
const fmtInt = (n: number) => (n || 0).toLocaleString('pt-BR');
const fmtPct = (n: number) => `${(n || 0).toFixed(1).replace('.', ',')}%`;

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev <= 0) return <span className="text-[11px] text-slate-400">{cur > 0 ? 'Novo no período' : 'Sem dados anteriores'}</span>;
  const v = ((cur - prev) / prev) * 100;
  const up = v >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      <Icon className="h-3 w-3" />{up ? '+' : ''}{v.toFixed(1).replace('.', ',')}% vs. anterior
    </span>
  );
}

function CardTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0094eb]/10"><Icon className="h-4 w-4 text-[#0094eb]" /></div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">{children}</h3>
    </div>
  );
}

function Stat({ label, value, icon: Icon, hint }: { label: string; value: string; icon: React.ElementType; hint: string }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-slate-300">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[11px] font-bold uppercase">{label}</span>
        <Icon className="h-4 w-4 text-[#0094eb]" />
      </div>
      <span className="block text-2xl font-black text-slate-800">{value}</span>
      <div className="border-t border-slate-100 pt-1 text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

export default function BuilderOverviewPage() {
  const navigate = useNavigate();
  const { storeId, store } = useLoja() as { storeId: string | null; store: any };
  const [days, setDays] = useState(30);
  const [data, setData] = useState<BuilderOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tips, setTips] = useState<ScopedTip[]>([]);
  const sectorId = useStoreSector();

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    setLoading(true);
    getBuilderOverview(storeId, days)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError((e as Error).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId, days]);

  useEffect(() => {
    let alive = true;
    listScopedTips('builder' as any).then((l) => { if (alive) setTips(l); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const views = data?.views ?? 0;
  const leads = data?.leads ?? 0;
  const conv = views > 0 ? (leads / views) * 100 : 0;
  const convPrev = (data?.views_prev ?? 0) > 0 ? ((data?.leads_prev ?? 0) / (data?.views_prev ?? 1)) * 100 : 0;
  const ranking = (data?.pages ?? []).filter((p) => p.views > 0 || p.leads > 0).slice(0, 5);

  const tip = pickTip(tips, { sectorId, niche: String(store?.store_niche || '') }, { ctr: conv, views, clicks: leads }, 0);
  const noah = tip ? { title: tip.title, text: plainText(tip.content) } : BUILDER_TIP;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(store?.referral_code ? `${window.location.origin}/?ref=${store.referral_code}` : window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-in fade-in space-y-8 pb-12 font-sans text-slate-800 duration-300">
      <ModuleHeader module="builder" />

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div>
        <h3 className="mb-3 px-1 text-xl font-bold leading-tight text-slate-900">Consumo do Plano</h3>
        <div className="mb-4"><StorageUsageCard /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Páginas publicadas" value={fmtInt(data?.published ?? 0)} icon={FileText} hint="No ar agora" />
          <Stat label="Rascunhos" value={fmtInt(data?.drafts ?? 0)} icon={Pencil} hint="Ainda não publicadas" />
          <Stat label="Visualizações" value={fmtInt(data?.views_month ?? 0)} icon={Eye} hint="No mês atual" />
          <Stat label="Leads captados" value={fmtInt(data?.leads_month ?? 0)} icon={Users} hint="No mês atual" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle icon={Activity}>Desempenho das páginas</CardTitle>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {PERIODOS.map((p) => (
                <button key={p.d} type="button" onClick={() => setDays(p.d)}
                  className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${days === p.d ? 'bg-[#0094eb] text-white shadow-sm' : 'text-slate-500 hover:text-[#0094eb]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${loading ? 'opacity-50' : ''}`}>
            <div className="space-y-1 rounded-xl border border-slate-100 p-3">
              <span className="text-[11px] font-bold uppercase text-slate-400">Visualizações</span>
              <p className="text-xl font-black text-slate-800">{fmtInt(views)}</p>
              <Delta cur={views} prev={data?.views_prev ?? 0} />
            </div>
            <div className="space-y-1 rounded-xl border border-slate-100 p-3">
              <span className="text-[11px] font-bold uppercase text-slate-400">Leads</span>
              <p className="text-xl font-black text-slate-800">{fmtInt(leads)}</p>
              <Delta cur={leads} prev={data?.leads_prev ?? 0} />
            </div>
            <div className="space-y-1 rounded-xl border border-slate-100 p-3">
              <span className="text-[11px] font-bold uppercase text-slate-400">Conversão</span>
              <p className="text-xl font-black text-slate-800">{fmtPct(conv)}</p>
              <Delta cur={conv} prev={convPrev} />
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Trophy className="h-4 w-4 text-[#0094eb]" /> Páginas com melhor desempenho
            </p>
            {ranking.length === 0 ? (
              <p className="text-xs text-slate-500">
                {loading ? 'Carregando...' : 'Nenhuma visita ou lead no período. As visitas passam a ser contadas nas páginas publicadas a partir da próxima publicação.'}
              </p>
            ) : (
              ranking.map((p, i) => (
                <Link key={p.id} to={`/dashboard/modules/builder/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2 hover:bg-slate-50">
                  <span className="w-5 text-center text-xs font-black text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">{p.title}</p>
                    <p className="text-[11px] text-slate-500">{fmtInt(p.views)} visitas · {fmtInt(p.leads)} leads · /{p.slug}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {fmtPct(p.views > 0 ? (p.leads / p.views) * 100 : 0)}
                  </span>
                </Link>
              ))
            )}
            <div className="flex justify-between pt-1">
              <button type="button" onClick={() => navigate('/dashboard/modules/builder/paginas')} className="cursor-pointer text-[11px] font-semibold text-[#0094eb] hover:underline">Ver minhas páginas →</button>
              <button type="button" onClick={() => navigate('/dashboard/leads')} className="cursor-pointer text-[11px] font-semibold text-[#0094eb] hover:underline">Ver leads →</button>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="lg:absolute lg:inset-0"><ProximasDatasComerciais /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <img src="/assets/dica-do-noah-logo-wide.png" alt="Dica do Noah" className="h-auto w-[180px] shrink-0 object-contain object-left" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{noah.title}</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">{noah.text}</p>
          </div>
          {tips.length > 0 && (
            <button type="button" onClick={() => navigate('/dashboard/insights-noah')} className="cursor-pointer self-end text-xs font-bold text-[#0094eb] hover:underline">Ver mais dicas →</button>
          )}
        </div>

        <div className="flex h-full flex-col justify-between space-y-4 rounded-2xl border border-[#fd8539]/60 bg-white p-5 shadow-sm transition-all hover:border-[#fd8539]">
          <div className="flex items-center justify-between">
            <img src="/assets/clube-sll-logo-wide.png" alt="Clube SLL" className="h-auto w-[140px] shrink-0 object-contain object-left" />
            <Share2 className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-xs leading-relaxed text-slate-500">Receba comissões e benefícios ao indicar o Builder para outros lojistas.</p>
          <div className="space-y-2">
            <button onClick={handleCopyLink} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#fd8539] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#e07128] active:scale-[0.99]">
              {copied ? (<><Check className="h-4 w-4" />LINK COPIADO!</>) : (<><Link2 className="h-4 w-4" />COPIAR MEU LINK DE INDICAÇÃO</>)}
            </button>
            <div className="text-center">
              <Link to="/dashboard/afiliados" className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-[#fd8539]">Acessar painel de indicações →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}