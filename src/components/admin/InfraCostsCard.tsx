import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  NUM_KEYS, buildCalc, getCostSettings, getPayingStores, saveCostSettings, syncFx,
  addCustomCost, customTotalBrl, deleteCustomCost, listCustomCosts, updateCustomCost,
  type CostSettings, type CustomCost, type NumKey,
} from '@/services/admin/costsAdmin';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import {
  getAutoUsage, getManualUsage, getQuotas, saveManualUsage, saveQuotaIncluded, type Quota,
} from '@/services/admin/infraUsageAdmin';

const BOX = 'space-y-4 rounded-2xl border border-slate-800 bg-[#111524] p-5';
const IN = 'w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-[#0094eb]';
const LBL = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';

const parse = (v?: string): number | null => {
  const t = (v ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const num = (v?: string) => parse(v) ?? 0;
const opt = (v?: string) => ((v ?? '').trim() === '' ? 0 : parse(v));
const str = (v: number) => String(v).replace('.', ',');
const brl = (v: number, d = 2) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: d });
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const HINT: Record<string, string> = {
  supabase_db_gb: 'Revise a retenção de dados antigos (logs e eventos) ou suba o plano do banco.',
  supabase_storage_gb: 'Mova vídeos e arquivos pesados para o Bunny ou Cloudflare R2.',
  supabase_egress_gb: 'Sirva mídia por CDN e reduza downloads diretos do Supabase.',
  supabase_mau: 'Avalie o plano Team ou limpe contas inativas.',
  vercel_transfer_gb: 'Ative cache e compressão de imagens; mídia pesada deve sair pela CDN.',
  vercel_requests_m: 'Aumente o cache nas rotas públicas e do widget.',
};
const TIP_STYLE: Record<string, string> = {
  ok: 'bg-emerald-500/10 text-emerald-300',
  warn: 'bg-amber-500/10 text-amber-300',
  bad: 'bg-rose-500/10 text-rose-300',
};

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className={LBL}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={IN} />
      {hint && <span className="block text-[10px] text-slate-600">{hint}</span>}
    </label>
  );
}

function Stat({ t, v }: { t: string; v: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t}</p>
      <p className="text-xs font-bold text-white">{v}</p>
    </div>
  );
}

export default function InfraCostsCard({ onChanged }: { onChanged: () => void }) {
  const [s, setS] = useState<CostSettings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [auto, setAuto] = useState(true);
  const [paying, setPaying] = useState(0);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [inc, setInc] = useState<Record<string, string>>({});
  const [man, setMan] = useState<Record<string, string>>({});
  const [autoU, setAutoU] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [extras, setExtras] = useState<CustomCost[]>([]);
  const [exTxt, setExTxt] = useState<Record<string, string>>({});
  const { confirm, dialog } = useConfirm();

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    try {
      const [x, p, q, mu, au, ex] = await Promise.all([
        getCostSettings(),
        getPayingStores().catch(() => 0),
        getQuotas().catch(() => [] as Quota[]),
        getManualUsage(),
        getAutoUsage(),
        listCustomCosts().catch(() => [] as CustomCost[]),
      ]);
      if (x) {
        setS(x);
        setAuto(x.auto_sync_currency);
        setForm(Object.fromEntries(NUM_KEYS.map((k) => [k, str(x[k])])));
      }
      setPaying(p);
      setQuotas(q);
      setInc(Object.fromEntries(q.map((r) => [r.key, str(r.included)])));
      setMan(Object.fromEntries(Object.entries(mu).map(([k, v]) => [k, str(v)])));
      setAutoU(au);
      setExtras(ex);
      setExTxt(Object.fromEntries(ex.map((r) => [r.id, str(r.amount)])));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const live = useMemo(() => {
    if (!s) return null;
    const o: any = { ...s };
    NUM_KEYS.forEach((k) => { o[k] = num(form[k] ?? String(s[k])); });
    return o as CostSettings;
  }, [s, form]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />;
  if (!s || !live) return <p className="text-xs text-rose-400">Configuração de custos não encontrada. Rode a migration de custos.</p>;

  const amt = (x: CustomCost) => num(exTxt[x.id] ?? String(x.amount));
  const extraBrl = customTotalBrl(extras.map((x) => ({ ...x, amount: amt(x) })), live.usd_to_brl_rate);
  const c = buildCalc(live, paying, extraBrl);

  const patchEx = (id: string, p: Partial<CustomCost>) => setExtras((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const addExtra = async () => {
    setBusy(true);
    try {
      const r = await addCustomCost({ name: 'Novo custo', cost_type: 'fixed_monthly', currency: 'BRL', amount: 0, quota_notes: null, is_active: true });
      setExtras((p) => [...p, r]);
      setExTxt((p) => ({ ...p, [r.id]: '0' }));
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggleEx = async (x: CustomCost) => {
    try {
      await updateCustomCost(x.id, { is_active: !x.is_active });
      patchEx(x.id, { is_active: !x.is_active });
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const removeEx = async (x: CustomCost) => {
    if (!(await confirm({ title: 'Excluir despesa', message: `"${x.name}" será removida do custo fixo.`, confirmLabel: 'Excluir' }))) return;
    try {
      await deleteCustomCost(x.id);
      setExtras((p) => p.filter((y) => y.id !== x.id));
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const rate = live.usd_to_brl_rate;
  const usedOf = (q: Quota) => (q.source === 'auto' ? autoU[q.key] ?? 0 : num(man[q.key]));
  const inclOf = (q: Quota) => num(inc[q.key] ?? String(q.included));

  const svc = (rows: Quota[], planKey: NumKey) => {
    let over = 0;
    let worst: { q: Quota; r: number } | null = null;
    for (const q of rows) {
      const u = usedOf(q);
      const i = inclOf(q);
      over += Math.max(0, u - i) * q.overage_usd * rate;
      const r = i > 0 ? u / i : 0;
      if (!worst || r > worst.r) worst = { q, r };
    }
    return { base: live[planKey] * rate, over, worst: worst as { q: Quota; r: number } | null };
  };

  const sbRows = quotas.filter((q) => q.service === 'supabase');
  const vcRows = quotas.filter((q) => q.service === 'vercel');
  const sbS = svc(sbRows, 'supabase_pro_usd');
  const vcS = svc(vcRows, 'vercel_pro_usd');
  const bunnyCost = (num(man.bunny_storage_gb) * live.storage_cost_usd_per_gb + num(man.bunny_traffic_gb) * live.traffic_cost_usd_per_gb) * rate;
  const total = sbS.base + sbS.over + vcS.base + vcS.over + bunnyCost + extraBrl;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const lastStr = s.last_currency_sync_at ? new Date(s.last_currency_sync_at).toLocaleDateString('en-CA') : '';
  const fresh = lastStr === todayStr;

  const tipOf = (w: { q: Quota; r: number } | null, over: number) => {
    if (!w) return { lv: 'ok', text: 'Sem dados de uso para avaliar.' };
    const p = (w.r * 100).toFixed(0);
    const h = HINT[w.q.key] ?? '';
    if (w.r > 1) return { lv: 'bad', text: `Acima do plano em "${w.q.label}" (${p}%). Excedente estimado: ${brl(over)} por mês. ${h}` };
    if (w.r >= 0.8) return { lv: 'warn', text: `Atenção: "${w.q.label}" está em ${p}% da franquia. ${h}` };
    return { lv: 'ok', text: 'Dentro do plano. Nenhuma migração necessária por enquanto.' };
  };

  const sync = async () => {
    setBusy(true);
    try {
      const x = await syncFx();
      setS(x);
      set('usd_to_brl_rate', str(x.usd_to_brl_rate));
      toast.success(`Câmbio atualizado: ${brl(x.usd_to_brl_rate, 4)}`);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const patch: Record<string, number> = {};
    for (const k of NUM_KEYS) {
      const n = parse(form[k]);
      if (n === null) { toast.error('Confira os valores informados.'); return; }
      patch[k] = n;
    }
    if (patch.min_tenants_divider < 1) { toast.error('O mínimo de lojas deve ser 1 ou mais.'); return; }
    const items: { key: string; included: number }[] = [];
    for (const q of quotas) {
      const n = opt(inc[q.key] ?? String(q.included));
      if (n === null) { toast.error(`Franquia inválida em "${q.label}".`); return; }
      items.push({ key: q.key, included: n });
    }
    for (const x of extras) {
      if (!x.name.trim()) { toast.error('Dê um nome a todas as despesas.'); return; }
      if (parse(exTxt[x.id] ?? String(x.amount)) === null) { toast.error(`Valor inválido em "${x.name}".`); return; }
    }
    const usage: Record<string, number> = {};
    const manualKeys = [...quotas.filter((q) => q.source === 'manual').map((q) => q.key), 'bunny_storage_gb', 'bunny_traffic_gb'];
    for (const k of manualKeys) {
      const n = opt(man[k]);
      if (n === null) { toast.error('Confira os valores de uso informados.'); return; }
      usage[k] = n;
    }
    setBusy(true);
    try {
      await saveCostSettings({ ...patch, auto_sync_currency: auto });
      for (const x of extras) {
        await updateCustomCost(x.id, { name: x.name.trim(), cost_type: x.cost_type, currency: x.currency, amount: amt(x), quota_notes: (x.quota_notes ?? '').trim() || null });
      }
      await saveQuotaIncluded(items);
      await saveManualUsage(usage);
      toast.success('Custos salvos. Margens recalculadas.');
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const renderRow = (q: Quota) => {
    const used = usedOf(q);
    const incl = inclOf(q);
    const r = incl > 0 ? used / incl : 0;
    const bar = r > 1 ? 'bg-rose-500' : r >= 0.8 ? 'bg-amber-400' : 'bg-emerald-500';
    const exc = Math.max(0, used - incl) * q.overage_usd * rate;
    return (
      <div key={q.key} className="grid grid-cols-12 items-center gap-3 border-t border-white/5 py-2">
        <div className="col-span-12 md:col-span-3">
          <p className="text-xs font-semibold text-white">{q.label}</p>
          <p className="text-[10px] text-slate-500">{q.source === 'auto' ? 'Leitura automática' : 'Você informa o uso'} · {q.unit}</p>
        </div>
        <div className="col-span-6 md:col-span-2">
          <p className={LBL}>Usado</p>
          {q.source === 'auto'
            ? <p className="py-1.5 text-sm font-bold text-white">{fmt(used)}</p>
            : <input value={man[q.key] ?? ''} onChange={(e) => setMan((p) => ({ ...p, [q.key]: e.target.value }))} className={IN} />}
        </div>
        <div className="col-span-6 md:col-span-2">
          <p className={LBL}>Incluído</p>
          <input value={inc[q.key] ?? ''} onChange={(e) => setInc((p) => ({ ...p, [q.key]: e.target.value }))} className={IN} />
        </div>
        <div className="col-span-12 md:col-span-5">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, r * 100)}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-500">{(r * 100).toFixed(0)}% da franquia{exc > 0 ? ` · excedente ${brl(exc)}` : ''}</p>
        </div>
      </div>
    );
  };

  const renderService = (title: string, planKey: NumKey, rows: Quota[], r: ReturnType<typeof svc>) => {
    const tip = tipOf(r.worst, r.over);
    return (
      <section className={BOX}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-yellow-300">{title}</h2>
            <p className="text-[11px] text-slate-500">Mensalidade {brl(r.base)} + excedente estimado {brl(r.over)}</p>
          </div>
          <div className="text-right">
            <p className={LBL}>Total do mês</p>
            <p className="text-lg font-black text-white">{brl(r.base + r.over)}</p>
          </div>
        </div>
        <div className="max-w-xs">
          <Field label="Plano pago (US$/mês)" value={form[planKey] ?? ''} onChange={(v) => set(planKey, v)} />
        </div>
        <div>{rows.length ? rows.map(renderRow) : <p className="text-xs text-slate-500">Franquias não cadastradas. Rode o SQL A.</p>}</div>
        <p className={`rounded-lg px-3 py-2 text-[11px] ${TIP_STYLE[tip.lv]}`}>{tip.text}</p>
      </section>
    );
  };

  return (
    <div className="space-y-5">
      <section className={BOX}>
        <div>
          <h2 className="text-sm font-bold text-yellow-300">Resumo do mês</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Recalcula enquanto você digita. A margem dos planos usa só o custo fixo (sem excedente).</p>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/5 p-3 md:grid-cols-6">
          <Stat t="Custo fixo" v={brl(c.fixedTotal)} />
          <Stat t="Lojas pagantes" v={String(paying)} />
          <Stat t="Rateio por loja" v={brl(c.fixedPerStore)} />
          <Stat t="Storage / GB" v={brl(c.storageBrl, 4)} />
          <Stat t="Tráfego / GB" v={brl(c.trafficBrl, 4)} />
          <Stat t="Total com uso" v={brl(total)} />
        </div>
        <p className="text-[10px] text-slate-600">Rateio = custo fixo ÷ maior valor entre lojas pagantes e o mínimo definido.</p>
      </section>

      <section className={BOX}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-yellow-300">Câmbio</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {s.last_currency_sync_at ? `Última sincronização: ${new Date(s.last_currency_sync_at).toLocaleString('pt-BR')}.` : 'Ainda não sincronizado.'}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${fresh ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
            {fresh ? 'Sincronizado hoje' : 'Desatualizado'}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44"><Field label="Dólar (R$)" value={form.usd_to_brl_rate ?? ''} onChange={(v) => set('usd_to_brl_rate', v)} /></div>
          <button type="button" disabled={busy} onClick={sync} className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40">
            Sincronizar câmbio agora
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Sincronizar automaticamente todo dia (06:00 pelo servidor; se falhar, ao abrir o Master)
        </label>
      </section>

      {renderService('Supabase', 'supabase_pro_usd', sbRows, sbS)}
      {renderService('Vercel', 'vercel_pro_usd', vcRows, vcS)}

      <section className={BOX}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-yellow-300">Bunny (vídeos)</h2>
            <p className="text-[11px] text-slate-500">Sem franquia: paga só pelo que usar.</p>
          </div>
          <div className="text-right">
            <p className={LBL}>Total do mês</p>
            <p className="text-lg font-black text-white">{brl(bunnyCost)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Storage usado (GB)" value={man.bunny_storage_gb ?? ''} onChange={(v) => setMan((p) => ({ ...p, bunny_storage_gb: v }))} />
          <Field label="Tráfego do mês (GB)" value={man.bunny_traffic_gb ?? ''} onChange={(v) => setMan((p) => ({ ...p, bunny_traffic_gb: v }))} />
          <Field label="Storage (US$/GB)" value={form.storage_cost_usd_per_gb ?? ''} onChange={(v) => set('storage_cost_usd_per_gb', v)} />
          <Field label="Tráfego (US$/GB)" value={form.traffic_cost_usd_per_gb ?? ''} onChange={(v) => set('traffic_cost_usd_per_gb', v)} />
        </div>
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
          Com {fmt(num(form.mb_per_play))} MB por play, cada 1.000 plays consomem cerca de {fmt((1000 * num(form.mb_per_play)) / 1024)} GB e custam {brl(((1000 * num(form.mb_per_play)) / 1024) * c.trafficBrl)}.
        </p>
      </section>

      <section className={BOX}>
        <h2 className="text-sm font-bold text-yellow-300">Outros custos e taxas</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Gateway de pagamento (%)" value={form.gateway_fee_percent ?? ''} onChange={(v) => set('gateway_fee_percent', v)} />
          <Field label="Impostos / Simples Nacional (%)" value={form.tax_percent ?? ''} onChange={(v) => set('tax_percent', v)} />
        </div>

        <div className="space-y-2 border-t border-white/5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">Despesas operacionais e ferramentas</p>
              <p className="text-[10px] text-slate-500">Entram no custo fixo e são rateadas entre as lojas. Em US$, convertidas pelo câmbio do dia.</p>
            </div>
            <button type="button" disabled={busy} onClick={addExtra} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fd8539] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">
              <Plus size={14} /> Adicionar custo
            </button>
          </div>

          {extras.length === 0 && <p className="py-3 text-center text-xs text-slate-500">Nenhuma despesa cadastrada.</p>}

          {extras.map((x) => (
            <div key={x.id} className={`grid grid-cols-12 items-end gap-2 border-t border-white/5 pt-2 ${x.is_active ? '' : 'opacity-50'}`}>
              <label className="col-span-12 space-y-1 md:col-span-3">
                <span className={LBL}>Nome</span>
                <input value={x.name} onChange={(e) => patchEx(x.id, { name: e.target.value })} placeholder="Contabilidade" className={IN} />
              </label>
              <label className="col-span-6 space-y-1 md:col-span-2">
                <span className={LBL}>Tipo</span>
                <select value={x.cost_type} onChange={(e) => patchEx(x.id, { cost_type: e.target.value as CustomCost['cost_type'] })} className={`${IN} cursor-pointer`}>
                  <option value="fixed_monthly">Fixo mensal</option>
                  <option value="variable_quota">Variável / franquia</option>
                </select>
              </label>
              <label className="col-span-3 space-y-1 md:col-span-1">
                <span className={LBL}>Moeda</span>
                <select value={x.currency} onChange={(e) => patchEx(x.id, { currency: e.target.value as CustomCost['currency'] })} className={`${IN} cursor-pointer`}>
                  <option value="BRL">R$</option>
                  <option value="USD">US$</option>
                </select>
              </label>
              <label className="col-span-3 space-y-1 md:col-span-2">
                <span className={LBL}>Valor mensal</span>
                <input value={exTxt[x.id] ?? ''} onChange={(e) => setExTxt((p) => ({ ...p, [x.id]: e.target.value }))} className={IN} />
                {x.currency === 'USD' && <span className="block text-[10px] text-slate-500">≈ {brl(amt(x) * rate)}</span>}
              </label>
              <label className="col-span-8 space-y-1 md:col-span-3">
                <span className={LBL}>Observação / franquia</span>
                <input value={x.quota_notes ?? ''} onChange={(e) => patchEx(x.id, { quota_notes: e.target.value })} placeholder="Até 50.000 disparos/mês" className={IN} />
              </label>
              <div className="col-span-4 flex items-center justify-end gap-1.5 md:col-span-1">
                <button type="button" onClick={() => toggleEx(x)} title={x.is_active ? 'Desativar' : 'Ativar'}
                  className={`cursor-pointer rounded-md px-2 py-1.5 text-[10px] font-bold ${x.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                  {x.is_active ? 'On' : 'Off'}
                </button>
                <button type="button" onClick={() => removeEx(x)} title="Excluir" className="cursor-pointer rounded-md bg-rose-500/15 p-1.5 text-rose-300 hover:bg-rose-500/25">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          <p className="border-t border-white/5 pt-2 text-right text-[11px] text-slate-400">
            Total das despesas ativas: <b className="text-white">{brl(extraBrl)}</b> · edições só são gravadas em "Salvar custos"; adicionar, ativar e excluir gravam na hora.
          </p>
        </div>
        {dialog}
      </section>

      <section className={BOX}>
        <h2 className="text-sm font-bold text-yellow-300">Premissas de cálculo</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="MB por play" value={form.mb_per_play ?? ''} onChange={(v) => set('mb_per_play', v)} />
          <Field label="Uso realista (%)" value={form.realistic_usage_percent ?? ''} onChange={(v) => set('realistic_usage_percent', v)} />
          <Field label="Mínimo de lojas no rateio" value={form.min_tenants_divider ?? ''} onChange={(v) => set('min_tenants_divider', v)} />
        </div>
      </section>

      <button type="button" disabled={busy} onClick={save} className="cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">
        {busy ? 'Salvando…' : 'Salvar custos'}
      </button>
    </div>
  );
}