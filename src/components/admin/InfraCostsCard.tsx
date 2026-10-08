import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  NUM_KEYS, buildCalc, getCostSettings, getPayingStores, saveCostSettings, syncFx,
  type CostSettings, type NumKey,
} from '@/services/admin/costsAdmin';

const FIELDS: { k: NumKey; label: string }[] = [
  { k: 'usd_to_brl_rate', label: 'Dólar (R$)' },
  { k: 'storage_cost_usd_per_gb', label: 'Storage (US$/GB)' },
  { k: 'traffic_cost_usd_per_gb', label: 'Tráfego (US$/GB)' },
  { k: 'supabase_pro_usd', label: 'Supabase Pro (US$/mês)' },
  { k: 'vercel_pro_usd', label: 'Vercel Pro (US$/mês)' },
  { k: 'domain_and_tools_monthly_brl', label: 'Domínios e ferramentas (R$/mês)' },
  { k: 'gateway_fee_percent', label: 'Gateway (%)' },
  { k: 'tax_percent', label: 'Impostos (%)' },
  { k: 'min_tenants_divider', label: 'Mínimo de lojas no rateio' },
  { k: 'mb_per_play', label: 'MB por play' },
  { k: 'realistic_usage_percent', label: 'Uso realista (%)' },
];
const str = (v: number) => String(v).replace('.', ',');
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });

export default function InfraCostsCard({ onChanged }: { onChanged: () => void }) {
  const [s, setS] = useState<CostSettings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [auto, setAuto] = useState(true);
  const [paying, setPaying] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fill = (x: CostSettings) => {
    setS(x);
    setAuto(x.auto_sync_currency);
    setForm(Object.fromEntries(NUM_KEYS.map((k) => [k, str(x[k])])));
  };

  const load = useCallback(async () => {
    try {
      const [x, p] = await Promise.all([getCostSettings(), getPayingStores().catch(() => 0)]);
      if (x) fill(x);
      setPaying(p);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const patch: Record<string, number> = {};
    for (const k of NUM_KEYS) {
      const n = Number((form[k] ?? '').replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) { toast.error('Confira os valores informados.'); return; }
      patch[k] = n;
    }
    if (patch.min_tenants_divider < 1) { toast.error('O mínimo de lojas deve ser 1 ou mais.'); return; }
    setBusy(true);
    try {
      await saveCostSettings({ ...patch, auto_sync_currency: auto });
      toast.success('Custos salvos. Margens recalculadas.');
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const x = await syncFx();
      fill(x);
      toast.success(`Câmbio atualizado: ${brl(x.usd_to_brl_rate)}`);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />;
  if (!s) return <p className="text-xs text-rose-400">Configuração de custos não encontrada. Rode a migration do script 1.</p>;

  const c = buildCalc(s, paying);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-[#111524] p-5">
      <div>
        <h2 className="text-sm font-bold text-yellow-300">Custos de infraestrutura</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Base do alerta de margem. Valores internacionais em dólar, convertidos pelo câmbio abaixo.
          {s.last_currency_sync_at && ` Último câmbio: ${new Date(s.last_currency_sync_at).toLocaleString('pt-BR')}.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.k} className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{f.label}</span>
            <input value={form[f.k] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [f.k]: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-[#0094eb]" />
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        Sincronizar o câmbio automaticamente (a cada 20 horas, ao abrir o Master)
      </label>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/5 p-3 text-center md:grid-cols-5">
        {[
          ['Storage / GB', brl(c.storageBrl)],
          ['Tráfego / GB', brl(c.trafficBrl)],
          ['Custo fixo total', brl(c.fixedTotal)],
          ['Lojas pagantes', String(paying)],
          ['Rateio por loja', brl(c.fixedPerStore)],
        ].map(([t, v]) => (
          <div key={t}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t}</p>
            <p className="text-xs font-bold text-white">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-600">Rateio = custo fixo ÷ maior valor entre lojas pagantes e o mínimo definido.</p>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={save} className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
          {busy ? 'Salvando…' : 'Salvar custos'}
        </button>
        <button type="button" disabled={busy} onClick={sync} className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40">
          Sincronizar câmbio agora
        </button>
      </div>
    </section>
  );
}