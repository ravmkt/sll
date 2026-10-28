import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { updateDynamicPlan, type DynamicPlan } from '@/services/admin/plansAdmin';
import { cycleInfo } from '@/components/admin/cycleInfo';
import { INPUT, int } from '@/components/admin/moduleUi';

type D = { m: string; s: string; a: string; x: string };

const LBL = 'text-xs font-bold uppercase tracking-wider text-slate-500';
const toReais = (c: number) => ((Number(c) || 0) / 100).toFixed(2).replace('.', ',');
const toCents = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);
const num = (v: string) => Number(v.replace(',', '.'));
const DEFAULT_X = [1, 2.5, 5];

type Props = {
  title: string;
  plans: DynamicPlan[];
  subs: Record<string, number>;
  showAnchor: boolean;
  subtitleOf?: (p: DynamicPlan) => string;
  renderMargin: (p: DynamicPlan) => ReactNode;
  onEdit: (p: DynamicPlan) => void;
  onSaved: () => void | Promise<void>;
};

export default function PlanosGerenciar({ title, plans, subs, showAnchor, subtitleOf, renderMargin, onEdit, onSaved }: Props) {
  const sorted = useMemo(() => [...plans].sort((a, b) => (((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0)) || (a.price_monthly_cents - b.price_monthly_cents)), [plans]);
  const sig = sorted.map((p) => `${p.id}:${p.price_monthly_cents}:${p.price_semiannual_cents}:${p.price_annual_cents}`).join('|');
  const [d, setD] = useState<Record<string, D>>({});
  const [anchor, setAnchor] = useState('');
  const [ds, setDs] = useState('10');
  const [da, setDa] = useState('20');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const first = sorted[0];
    const base = first?.price_monthly_cents || 0;
    const next: Record<string, D> = {};
    sorted.forEach((p, i) => {
      const ratio = base > 0 ? Math.round((p.price_monthly_cents / base) * 100) / 100 : (DEFAULT_X[i] ?? i + 1);
      next[p.id] = {
        m: toReais(p.price_monthly_cents),
        s: toReais(p.price_semiannual_cents),
        a: toReais(p.price_annual_cents),
        x: String(ratio).replace('.', ','),
      };
    });
    setD(next);
    setAnchor(toReais(base));
    if (first && first.price_monthly_cents > 0) {
      if (first.price_semiannual_cents > 0) setDs(String(Math.max(0, Math.round((1 - first.price_semiannual_cents / (first.price_monthly_cents * 6)) * 100))));
      if (first.price_annual_cents > 0) setDa(String(Math.max(0, Math.round((1 - first.price_annual_cents / (first.price_monthly_cents * 12)) * 100))));
    }
  }, [sig]);

  const setField = (id: string, patch: Partial<D>) => setD((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const dirty = (p: DynamicPlan) => {
    const v = d[p.id];
    return !!v && (toCents(v.m) !== p.price_monthly_cents || toCents(v.s) !== p.price_semiannual_cents || toCents(v.a) !== p.price_annual_cents);
  };

  const move = async (id: string, dir: -1 | 1) => {
    const i = sorted.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const list = sorted.map((x) => x.id);
    [list[i], list[j]] = [list[j], list[i]];
    setBusy('order');
    try {
      for (let k = 0; k < list.length; k++) {
        const { error } = await (supabase as any).from('dynamic_plans').update({ sort_order: k + 1 }).eq('id', list[k]);
        if (error) throw new Error(error.message);
      }
      toast.success('Ordem salva.');
      await onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar a ordem.');
    } finally {
      setBusy(null);
    }
  };

  const suggest = () => {
    const base = toCents(anchor);
    if (!Number.isFinite(base) || base <= 0) { toast.error('Informe o preço âncora do plano mais básico.'); return; }
    const dsn = num(ds) || 0;
    const dan = num(da) || 0;
    setD((prev) => {
      const next = { ...prev };
      sorted.forEach((p) => {
        const x = num(prev[p.id]?.x || '1');
        if (!Number.isFinite(x) || x <= 0) return;
        const m = Math.round((base * x) / 100) * 100;
        const s = Math.round((m * 6 * (1 - dsn / 100)) / 100) * 100;
        const a = Math.round((m * 12 * (1 - dan / 100)) / 100) * 100;
        next[p.id] = { ...prev[p.id], m: toReais(m), s: toReais(s), a: toReais(a) };
      });
      return next;
    });
    toast.message('Sugestão aplicada. Ajuste cada card e clique em Salvar.');
  };

  const save = async (p: DynamicPlan, quiet = false) => {
    const v = d[p.id];
    if (!v) return false;
    const c = [toCents(v.m), toCents(v.s), toCents(v.a)];
    if (c.some((x) => !Number.isFinite(x) || x < 0)) { toast.error(`Confira os preços de "${p.plan_name}".`); return false; }
    setBusy(p.id);
    try {
      await updateDynamicPlan(p.id, {
        plan_name: p.plan_name,
        price_monthly_cents: c[0], price_semiannual_cents: c[1], price_annual_cents: c[2],
        limits_config: p.limits_config ?? {},
        is_recommended: p.is_recommended,
        is_active: p.is_active,
      });
      if (!quiet) toast.success(`"${p.plan_name}" salvo.`);
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveOne = async (p: DynamicPlan) => { if (await save(p)) await onSaved(); };
  const anyDirty = sorted.some(dirty);
  const saveAll = async () => {
    let ok = true;
    for (const p of sorted) if (dirty(p)) ok = (await save(p, true)) && ok;
    if (ok) toast.success('Preços salvos.');
    await onSaved();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-sky-300">
          {title} <span className="ml-1 font-normal text-slate-500">({sorted.length} {sorted.length === 1 ? 'plano' : 'planos'})</span>
        </h2>
        <button type="button" disabled={!anyDirty || busy !== null} onClick={saveAll}
          className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-1.5 text-[13px] font-bold text-white disabled:opacity-40">
          Salvar todos
        </button>
      </div>

      {showAnchor && sorted.length > 1 && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-[#111524] p-4">
          <label className="space-y-1">
            <span className={LBL}>Preço âncora (mensal, plano básico)</span>
            <input value={anchor} onChange={(e) => setAnchor(e.target.value)} className={`${INPUT} w-40`} />
          </label>
          <label className="space-y-1">
            <span className={LBL}>Desc. semestral %</span>
            <input value={ds} onChange={(e) => setDs(e.target.value)} className={`${INPUT} w-24`} />
          </label>
          <label className="space-y-1">
            <span className={LBL}>Desc. anual %</span>
            <input value={da} onChange={(e) => setDa(e.target.value)} className={`${INPUT} w-24`} />
          </label>
          <button type="button" onClick={suggest} className="cursor-pointer rounded-lg bg-[#fd8539] px-4 py-2 text-[13px] font-bold text-white">
            Sugerir escadinha
          </button>
          <p className="basis-full text-xs text-slate-500">
            Preço de cada plano = âncora × multiplicador do card. Semestral e anual = mensal × meses, menos o desconto. Ajuste à mão antes de salvar. Preços só afetam novas assinaturas.
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-[#111524] px-4 py-8 text-center text-[13px] text-slate-500">Nenhum plano cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p, pi) => {
            const v = d[p.id];
            if (!v) return null;
            const mo = toCents(v.m);
            const semi = cycleInfo(toCents(v.s), 6, mo);
            const ann = cycleInfo(toCents(v.a), 12, mo);
            return (
              <div key={p.id} className={`space-y-3 rounded-2xl border bg-[#111524] p-4 ${p.is_recommended ? 'border-[#fd8539]/60' : 'border-slate-800'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">
                      {p.plan_name}
                      {p.is_recommended && <span className="ml-2 rounded-full bg-[#fd8539]/15 px-1.5 py-0.5 text-[11px] text-[#fd8539]">Recomendado</span>}
                    </p>
                    <p className="font-mono text-xs text-slate-600">{p.plan_tier}</p>
                    {subtitleOf && <p className="mt-0.5 text-xs text-yellow-300/80">{subtitleOf(p)}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                    {p.is_active ? 'Ativo' : 'Pausado'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1"><span className={LBL}>Mensal</span><input value={v.m} onChange={(e) => setField(p.id, { m: e.target.value })} className={INPUT} /></label>
                  <label className="space-y-1"><span className={LBL}>Semestral</span><input value={v.s} onChange={(e) => setField(p.id, { s: e.target.value })} className={INPUT} /></label>
                  <label className="space-y-1"><span className={LBL}>Anual</span><input value={v.a} onChange={(e) => setField(p.id, { a: e.target.value })} className={INPUT} /></label>
                </div>
                {(semi || ann) && (
                  <p className="text-xs font-semibold text-emerald-400">
                    {[semi && `Semestral: ${semi}`, ann && `Anual: ${ann}`].filter(Boolean).join('  |  ')}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Ordem {pi + 1}</span>
                        <button type="button" title="Subir" disabled={busy !== null || pi === 0} onClick={() => move(p.id, -1)} className="rounded-md bg-slate-800 px-2 py-1 font-bold text-slate-200 disabled:opacity-30">{'\u2191'}</button>
                        <button type="button" title="Descer" disabled={busy !== null || pi === sorted.length - 1} onClick={() => move(p.id, 1)} className="rounded-md bg-slate-800 px-2 py-1 font-bold text-slate-200 disabled:opacity-30">{'\u2193'}</button>
                      </div>
                      {showAnchor && (
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    Multiplicador da âncora
                    <input value={v.x} onChange={(e) => setField(p.id, { x: e.target.value })} className={`${INPUT} w-20 text-right`} />
                    <span>×</span>
                  </label>
                )}

                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500">Margem {renderMargin(p)}</span>
                  <span className="text-slate-500">Assinantes <b className="text-white">{int(subs[p.id])}</b></span>
                </div>

                <div className="flex gap-2">
                  <button type="button" disabled={!dirty(p) || busy === p.id} onClick={() => saveOne(p)}
                    className="flex-1 cursor-pointer rounded-lg bg-[#0094eb] px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-40">
                    {busy === p.id ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button type="button" onClick={() => onEdit(p)} className="cursor-pointer rounded-lg bg-white/5 px-3 py-1.5 text-[13px] font-semibold text-slate-200 hover:bg-white/10">
                    Limites e detalhes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}