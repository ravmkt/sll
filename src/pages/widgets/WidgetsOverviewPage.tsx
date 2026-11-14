import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Palette, Ruler } from 'lucide-react';
import { widgetsService } from '../../services/widgets/widgetsService';
import type { RulerSettings, WidgetsCtx } from '../../types/widgets';

export default function WidgetsOverviewPage({ ctx }: { ctx: WidgetsCtx }) {
  const svc = useMemo(() => widgetsService(ctx.supabase), [ctx.supabase]);
  const [r, setR] = useState<RulerSettings | null>(null);
  const base = ctx.basePath ?? '/widgets';
  useEffect(() => { svc.getRuler(ctx.storeId).then(setR).catch(() => setR(null)); }, [svc, ctx.storeId]);

  const active = !!r?.active;
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Elementos que convertem mais</h1>
        <p className="mt-1 text-sm text-slate-500">Insira régua de descontos e outros elementos de conversão na sua loja.</p>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-extrabold text-slate-900">Seus widgets</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link to={`${base}/ruler`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#0094EB]">
          <div className="flex items-center justify-between">
            <Ruler className="h-6 w-6 text-[#0094EB]" />
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {active ? 'Ativa' : 'Inativa'}
            </span>
          </div>
          <div className="mt-3 text-base font-extrabold text-slate-900">Régua de descontos</div>
          <p className="text-sm text-slate-500">Descontos progressivos informativos na loja.</p>
        </Link>
        <Link to={`${base}/appearance`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#0094EB]">
          <Palette className="h-6 w-6 text-[#0094EB]" />
          <div className="mt-3 text-base font-extrabold text-slate-900">Aparência</div>
          <p className="text-sm text-slate-500">Cores, bordas, textos e templates.</p>
        </Link>
      </div>
    </div>
  );
}
