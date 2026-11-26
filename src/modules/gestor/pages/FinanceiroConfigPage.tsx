import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useLoja } from '@/contexts/LojaContext';
import { cn } from '@/lib/utils';
import { SllPageHeader } from '@/components/sll/SllPageHeader';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { showError, showSuccess } from '@/utils/toast';
import {
  METHOD_LABEL, METHOD_ORDER, SCOPE_LABEL, clearGatewayKey, getFinConfig, saveFinConfig, saveGatewayKey,
} from '../services/financeiro';
import type { FinConfig, FinMethodKey, FinPayload, FinScope } from '../services/financeiro';

type Form = {
  settings: { max_installments: string; max_interest_free: string; min_installment_value: string; pix_key_type: string; pix_key: string; pix_receiver_name: string; pix_city: string };
  methods: Record<FinMethodKey, { enabled: boolean; scope: FinScope; discount_pct: string; receive_days: string }>;
  debitFee: string;
  creditFees: Record<number, string>;
  gateway: { enabled: boolean; mode: 'test' | 'live'; has_secret: boolean };
  map: { platform_method: string; method: FinMethodKey }[];
};

const TABS = [
  { k: 'meios', l: 'Meios de pagamento' },
  { k: 'parcelas', l: 'Parcelamento e taxas' },
  { k: 'pix', l: 'Pix' },
  { k: 'integracoes', l: 'Integrações' },
] as const;
type Tab = (typeof TABS)[number]['k'];

const SUGGESTED: { platform_method: string; method: FinMethodKey }[] = [
  { platform_method: 'pix', method: 'pix' },
  { platform_method: 'credit_card', method: 'credit' },
  { platform_method: 'pix_in_installments', method: 'credit' },
  { platform_method: 'billet', method: 'transfer' },
];

const str = (n: number) => (n ? String(n).replace('.', ',') : '');
const num = (s: string) => { const t = s.trim().replace(',', '.'); return t === '' ? 0 : Number(t); };
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const digitsOf = (s: string) => s.replace(/\D/g, '');

function toForm(c: FinConfig): Form {
  const methods = {} as Form['methods'];
  for (const k of METHOD_ORDER) {
    const m = c.methods.find((x) => x.method === k);
    methods[k] = { enabled: m ? m.enabled : true, scope: m ? m.scope : 'both', discount_pct: str(m?.discount_pct ?? 0), receive_days: String(m?.receive_days ?? 0) };
  }
  const creditFees: Record<number, string> = {};
  for (let n = 1; n <= 24; n++) creditFees[n] = str(c.fees.find((f) => f.method === 'credit' && f.installments === n)?.fee_pct ?? 0);
  const g = c.gateways.find((x) => x.provider === 'pagarme');
  return {
    settings: {
      max_installments: String(c.settings.max_installments), max_interest_free: String(c.settings.max_interest_free),
      min_installment_value: str(c.settings.min_installment_value), pix_key_type: c.settings.pix_key_type ?? '',
      pix_key: c.settings.pix_key ?? '', pix_receiver_name: c.settings.pix_receiver_name ?? '', pix_city: c.settings.pix_city ?? '',
    },
    methods,
    debitFee: str(c.fees.find((f) => f.method === 'debit' && f.installments === 1)?.fee_pct ?? 0),
    creditFees,
    gateway: { enabled: g?.enabled ?? false, mode: g?.mode ?? 'test', has_secret: g?.has_secret ?? false },
    map: c.platform_map.map((p) => ({ platform_method: p.platform_method, method: p.method })),
  };
}

function normalizePix(type: string, raw: string): string | null {
  const v = raw.trim();
  if (type === 'cpf') { const d = digitsOf(v); return d.length === 11 ? d : null; }
  if (type === 'cnpj') { const d = digitsOf(v); return d.length === 14 ? d : null; }
  if (type === 'email') { const e = v.toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null; }
  if (type === 'phone') {
    const d = digitsOf(v);
    if (d.length === 10 || d.length === 11) return '+55' + d;
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return '+' + d;
    return null;
  }
  if (type === 'random') return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
  return null;
}

function build(f: Form): { error: string } | { payload: FinPayload } {
  const maxI = Number(f.settings.max_installments);
  if (!Number.isInteger(maxI) || maxI < 1 || maxI > 24) return { error: 'O máximo de parcelas deve ficar entre 1 e 24.' };
  const free = Number(f.settings.max_interest_free);
  if (!Number.isInteger(free) || free < 1 || free > maxI) return { error: 'As parcelas sem juros devem ficar entre 1 e o máximo de parcelas.' };
  const minV = num(f.settings.min_installment_value);
  if (!Number.isFinite(minV) || minV < 0) return { error: 'Parcela mínima inválida.' };

  const methods = [];
  for (const k of METHOD_ORDER) {
    const m = f.methods[k];
    const d = num(m.discount_pct);
    const days = Number(m.receive_days === '' ? 0 : m.receive_days);
    if (!Number.isFinite(d) || d < 0 || d >= 100) return { error: `Desconto de ${METHOD_LABEL[k]} deve ficar entre 0 e 99,99.` };
    if (!Number.isInteger(days) || days < 0 || days > 365) return { error: `Prazo de recebimento de ${METHOD_LABEL[k]} deve ficar entre 0 e 365 dias.` };
    methods.push({ method: k, enabled: m.enabled, scope: m.scope, discount_pct: d, receive_days: days });
  }

  const fees: FinPayload['fees'] = [];
  const deb = num(f.debitFee);
  if (!Number.isFinite(deb) || deb < 0 || deb >= 100) return { error: 'A taxa do débito deve ficar entre 0 e 99,999.' };
  fees.push({ method: 'debit', installments: 1, fee_pct: deb });
  for (let n = 1; n <= maxI; n++) {
    const v = num(f.creditFees[n] ?? '');
    if (!Number.isFinite(v) || v < 0 || v >= 100) return { error: `A taxa do crédito em ${n}x deve ficar entre 0 e 99,999.` };
    fees.push({ method: 'credit', installments: n, fee_pct: v });
  }

  let pixKey: string | null = null;
  const type = f.settings.pix_key_type;
  if (f.settings.pix_key.trim()) {
    if (!type) return { error: 'Escolha o tipo da chave Pix.' };
    pixKey = normalizePix(type, f.settings.pix_key);
    if (!pixKey) return { error: 'A chave Pix não confere com o tipo escolhido.' };
    if (!f.settings.pix_receiver_name.trim() || !f.settings.pix_city.trim()) return { error: 'Informe o nome do recebedor e a cidade do Pix.' };
  }
  if (f.settings.pix_receiver_name.length > 25) return { error: 'Nome do recebedor: no máximo 25 caracteres.' };
  if (f.settings.pix_city.length > 15) return { error: 'Cidade do Pix: no máximo 15 caracteres.' };

  const seen = new Set<string>();
  const map: FinPayload['platform_map'] = [];
  for (const r of f.map) {
    const pm = r.platform_method.trim();
    if (!pm) continue;
    if (seen.has(pm.toLowerCase())) return { error: `A forma "${pm}" da Yampi está repetida.` };
    seen.add(pm.toLowerCase());
    map.push({ platform: 'yampi', platform_method: pm, method: r.method });
  }

  if (f.gateway.enabled && !f.gateway.has_secret) return { error: 'Cadastre a chave do Pagar.me antes de ativar.' };

  return {
    payload: {
      settings: {
        max_installments: maxI, max_interest_free: free, min_installment_value: minV,
        pix_key_type: pixKey ? type : null, pix_key: pixKey,
        pix_receiver_name: f.settings.pix_receiver_name.trim() || null, pix_city: f.settings.pix_city.trim() || null,
      },
      methods, fees,
      gateways: [{ provider: 'pagarme', enabled: f.gateway.enabled, mode: f.gateway.mode, has_secret: f.gateway.has_secret }],
      platform_map: map,
    },
  };
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {hint && <p className="mb-3 mt-1 text-xs text-slate-500">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

const checkCls = 'h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)] disabled:cursor-not-allowed';

export default function FinanceiroConfigPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [qs] = useSearchParams();
  const canal = qs.get('canal') || 'yampi';
  const [base, setBase] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('meios');
  const [sample, setSample] = useState('1000');
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyVal, setKeyVal] = useState('');
  const [keyBusy, setKeyBusy] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const c = await getFinConfig(storeId, canal);
      const f = toForm(c);
      setBase(f); setForm(f); setCanEdit(c.can_edit);
    } catch (e) {
      showError((e as Error).message || 'Erro ao carregar o financeiro.');
    } finally {
      setLoading(false);
    }
  }, [storeId, canal]);

  useEffect(() => { if (!lojaLoading) void load(); }, [lojaLoading, load]);

  const dirty = useMemo(() => !!form && !!base && JSON.stringify(form) !== JSON.stringify(base), [form, base]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const maxN = useMemo(() => {
    const n = Number(form?.settings.max_installments);
    return Number.isInteger(n) ? Math.min(24, Math.max(0, n)) : 0;
  }, [form?.settings.max_installments]);

  const preview = useMemo(() => {
    if (!form) return [];
    const amount = Number(sample.replace(',', '.')) || 0;
    const free = Number(form.settings.max_interest_free) || 1;
    const minV = num(form.settings.min_installment_value) || 0;
    return Array.from({ length: maxN }, (_, i) => {
      const n = i + 1;
      const fee = num(form.creditFees[n] ?? '') || 0;
      const withInt = n > free && fee > 0;
      const total = withInt ? amount / (1 - fee / 100) : amount;
      return { n, withInt, total, per: total / n, blocked: n > 1 && amount / n < minV };
    });
  }, [form, sample, maxN]);

  if (loading || lojaLoading || !form) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>;
  }

  const ro = !canEdit;
  const set = (fn: (f: Form) => Form) => setForm((f) => (f ? fn(f) : f));
  const setSetting = (k: keyof Form['settings'], v: string) => set((f) => ({ ...f, settings: { ...f.settings, [k]: v } }));
  const setMethod = (k: FinMethodKey, patch: Partial<Form['methods'][FinMethodKey]>) =>
    set((f) => ({ ...f, methods: { ...f.methods, [k]: { ...f.methods[k], ...patch } } }));

  const save = async () => {
    if (!storeId || !form) return;
    const r = build(form);
    if ('error' in r) { showError(r.error); return; }
    setSaving(true);
    try {
      await saveFinConfig(storeId, r.payload, canal);
      showSuccess('Configurações financeiras salvas.');
      await load();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitKey = async () => {
    if (!storeId) return;
    if (!keyVal.trim()) { showError('Cole a chave secreta do Pagar.me.'); return; }
    setKeyBusy(true);
    try {
      const mode = await saveGatewayKey(storeId, 'pagarme', keyVal.trim());
      const patch = (f: Form | null): Form | null => (f ? { ...f, gateway: { ...f.gateway, has_secret: true, mode } } : f);
      setBase(patch); setForm(patch);
      setKeyVal(''); setKeyOpen(false);
      showSuccess(`Chave validada e guardada com segurança (${mode === 'live' ? 'produção' : 'teste'}).`);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setKeyBusy(false);
    }
  };

  const removeKey = async () => {
    if (!storeId || !window.confirm('Remover a chave do Pagar.me? O gateway será desativado.')) return;
    setKeyBusy(true);
    try {
      await clearGatewayKey(storeId, 'pagarme');
      const patch = (f: Form | null): Form | null => (f ? { ...f, gateway: { ...f.gateway, has_secret: false, enabled: false } } : f);
      setBase(patch); setForm(patch);
      showSuccess('Chave removida.');
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setKeyBusy(false);
    }
  };

  const tabBtn = (k: Tab, l: string) => (
    <button
      key={k} type="button" onClick={() => setTab(k)}
      className={cn('cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition',
        tab === k ? 'bg-[color:var(--sll-b-brand)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')}
    >{l}</button>
  );

  return (
    <div className="space-y-4">
      <SllPageHeader
        title="Financeiro"
        subtitle={canal === 'yampi' ? 'Meios de pagamento, parcelamento, Pix e integrações da loja.' : 'Canal: ' + canal + '. Meios de pagamento, parcelas e taxas deste canal.'}
        actions={canEdit ? (
          <>
            {dirty && <button type="button" disabled={saving} onClick={() => setForm(base)} className={sllBtnGhost}>Descartar</button>}
            <button type="button" disabled={!dirty || saving} onClick={() => void save()} className={sllBtnPrimary}>
              {saving && <Loader2 size={15} className="animate-spin" />}Salvar alterações
            </button>
          </>
        ) : undefined}
      />

      {ro && <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">Você pode ver estas configurações, mas só o dono e quem tem permissão de edição em Configurações altera.</p>}

      <div className="flex flex-wrap gap-2">{TABS.map((t) => tabBtn(t.k, t.l))}</div>

      {tab === 'meios' && (
        <Card title="Meios de pagamento" hint="Desative o que a loja não aceita. Descontos e prazos de recebimento ficam salvos para o PDV e o financeiro.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 text-left">Meio</th><th className="py-2">Ativo</th><th className="py-2">Onde vale</th>
                  <th className="py-2">Desconto (%)</th><th className="py-2">Recebimento (dias)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {METHOD_ORDER.map((k) => {
                  const m = form.methods[k];
                  return (
                    <tr key={k}>
                      <td className="py-2 font-semibold">{METHOD_LABEL[k]}</td>
                      <td className="py-2"><input type="checkbox" className={checkCls} disabled={ro} checked={m.enabled} onChange={(e) => setMethod(k, { enabled: e.target.checked })} /></td>
                      <td className="px-2 py-2">
                        <select className={sllFieldCls + ' cursor-pointer'} disabled={ro} value={m.scope} onChange={(e) => setMethod(k, { scope: e.target.value as FinScope })}>
                          {(Object.keys(SCOPE_LABEL) as FinScope[]).map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2"><input className={sllFieldCls + ' text-center'} inputMode="decimal" disabled={ro} placeholder="0" value={m.discount_pct} onChange={(e) => setMethod(k, { discount_pct: e.target.value })} /></td>
                      <td className="px-2 py-2"><input className={sllFieldCls + ' text-center'} inputMode="numeric" disabled={ro} value={m.receive_days} onChange={(e) => setMethod(k, { receive_days: e.target.value.replace(/\D/g, '') })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'parcelas' && (
        <>
          <Card title="Regras do parcelamento">
            <div className="grid gap-3 sm:grid-cols-3">
              <SllField label="Máximo de parcelas (1 a 24)">
                <input className={sllFieldCls} inputMode="numeric" disabled={ro} value={form.settings.max_installments} onChange={(e) => setSetting('max_installments', e.target.value.replace(/\D/g, ''))} />
              </SllField>
              <SllField label="Parcelas sem juros (até)">
                <input className={sllFieldCls} inputMode="numeric" disabled={ro} value={form.settings.max_interest_free} onChange={(e) => setSetting('max_interest_free', e.target.value.replace(/\D/g, ''))} />
              </SllField>
              <SllField label="Parcela mínima (R$)">
                <input className={sllFieldCls} inputMode="decimal" disabled={ro} placeholder="0,00" value={form.settings.min_installment_value} onChange={(e) => setSetting('min_installment_value', e.target.value)} />
              </SllField>
            </div>
          </Card>

          <Card title="Taxas do cartão" hint="Acima das parcelas sem juros, a taxa vira juros para o cliente: valor ÷ (1 − taxa). No débito e nas parcelas sem juros, a taxa é custo da loja.">
            <div className="mb-3 max-w-[12rem]">
              <SllField label="Débito (1x) %">
                <input className={sllFieldCls + ' text-center'} inputMode="decimal" disabled={ro} placeholder="0" value={form.debitFee} onChange={(e) => set((f) => ({ ...f, debitFee: e.target.value }))} />
              </SllField>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: maxN }, (_, i) => i + 1).map((n) => (
                <SllField key={n} label={`Crédito ${n}x %`}>
                  <input className={sllFieldCls + ' text-center'} inputMode="decimal" disabled={ro} placeholder="0" value={form.creditFees[n] ?? ''} onChange={(e) => set((f) => ({ ...f, creditFees: { ...f.creditFees, [n]: e.target.value } }))} />
                </SllField>
              ))}
              {maxN === 0 && <p className="col-span-full text-sm text-slate-400">Informe o máximo de parcelas acima.</p>}
            </div>
          </Card>

          <Card title="Simulação">
            <div className="mb-3 max-w-[12rem]">
              <SllField label="Valor da venda (R$)">
                <input className={sllFieldCls} inputMode="decimal" value={sample} onChange={(e) => setSample(e.target.value)} />
              </SllField>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {preview.map((r) => (
                <div key={r.n} className={cn('rounded-lg border px-3 py-2 text-xs', r.blocked ? 'border-slate-200 text-slate-400 line-through dark:border-slate-700' : 'border-slate-200 dark:border-slate-700')}>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{r.n}x de {brl(r.per)}</p>
                  <p className={r.withInt ? 'text-amber-600' : 'text-emerald-600'}>
                    {r.blocked ? 'abaixo da parcela mínima' : r.withInt ? `com juros · total ${brl(r.total)}` : 'sem juros'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {tab === 'pix' && (
        <Card title="Chave Pix da loja" hint="Usada para gerar o QR e o copia-e-cola das vendas no PDV. A confirmação do recebimento é manual.">
          <div className="grid gap-3 sm:grid-cols-3">
            <SllField label="Tipo da chave">
              <select className={sllFieldCls + ' cursor-pointer'} disabled={ro} value={form.settings.pix_key_type} onChange={(e) => setSetting('pix_key_type', e.target.value)}>
                <option value="">Não informada</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="random">Chave aleatória</option>
              </select>
            </SllField>
            <SllField label="Chave" className="sm:col-span-2">
              <input className={sllFieldCls} disabled={ro} value={form.settings.pix_key} onChange={(e) => setSetting('pix_key', e.target.value)} />
            </SllField>
            <SllField label="Nome do recebedor (até 25)">
              <input className={sllFieldCls} maxLength={25} disabled={ro} value={form.settings.pix_receiver_name} onChange={(e) => setSetting('pix_receiver_name', e.target.value)} />
            </SllField>
            <SllField label="Cidade (até 15)">
              <input className={sllFieldCls} maxLength={15} disabled={ro} value={form.settings.pix_city} onChange={(e) => setSetting('pix_city', e.target.value)} />
            </SllField>
          </div>
        </Card>
      )}

      {tab === 'integracoes' && (
        <>
          <Card title="Plataforma de e-commerce: Yampi" hint="Diga como cada forma de pagamento que chega da Yampi é tratada no Gestor.">
            <div className="space-y-2">
              {form.map.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input className={sllFieldCls + ' max-w-[16rem]'} disabled={ro} placeholder="Nome na Yampi (ex.: credit_card)" value={r.platform_method}
                    onChange={(e) => set((f) => ({ ...f, map: f.map.map((x, j) => (j === i ? { ...x, platform_method: e.target.value } : x)) }))} />
                  <span className="text-xs text-slate-400">vira</span>
                  <select className={sllFieldCls + ' max-w-[14rem] cursor-pointer'} disabled={ro} value={r.method}
                    onChange={(e) => set((f) => ({ ...f, map: f.map.map((x, j) => (j === i ? { ...x, method: e.target.value as FinMethodKey } : x)) }))}>
                    {METHOD_ORDER.map((k) => <option key={k} value={k}>{METHOD_LABEL[k]}</option>)}
                  </select>
                  {canEdit && (
                    <button type="button" title="Remover" onClick={() => set((f) => ({ ...f, map: f.map.filter((_, j) => j !== i) }))}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><Trash2 size={15} /></button>
                  )}
                </div>
              ))}
              {form.map.length === 0 && <p className="text-sm text-slate-400">Nenhuma forma vinculada.</p>}
            </div>
            {canEdit && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={sllBtnGhost} onClick={() => set((f) => ({ ...f, map: [...f.map, { platform_method: '', method: 'credit' }] }))}><Plus size={15} /> Adicionar forma</button>
                <button type="button" className={sllBtnGhost} onClick={() => set((f) => {
                  const have = new Set(f.map.map((x) => x.platform_method.toLowerCase()));
                  return { ...f, map: [...f.map, ...SUGGESTED.filter((s) => !have.has(s.platform_method))] };
                })}>Usar sugeridas da Yampi</button>
              </div>
            )}
          </Card>

          <Card title="Gateway de pagamento: Pagar.me" hint="A chave secreta é testada no Pagar.me e guardada em cofre. Ela nunca aparece nesta tela depois de salva.">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', form.gateway.has_secret ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
                {form.gateway.has_secret ? `Chave cadastrada · ${form.gateway.mode === 'live' ? 'Produção' : 'Teste'}` : 'Sem chave'}
              </span>
              {canEdit && (
                <button type="button" disabled={keyBusy} className={sllBtnGhost} onClick={() => { setKeyVal(''); setKeyOpen(true); }}>
                  <KeyRound size={15} /> {form.gateway.has_secret ? 'Trocar chave' : 'Cadastrar chave'}
                </button>
              )}
              {canEdit && form.gateway.has_secret && (
                <button type="button" disabled={keyBusy} className="cursor-pointer text-xs font-semibold text-rose-600 hover:underline" onClick={() => void removeKey()}>Remover chave</button>
              )}
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className={checkCls} disabled={ro || !form.gateway.has_secret} checked={form.gateway.enabled}
                  onChange={(e) => set((f) => ({ ...f, gateway: { ...f.gateway, enabled: e.target.checked } }))} />
                Pagar.me ativo
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-400">Mercado Pago, Asaas e Stripe: em breve.</p>
          </Card>
        </>
      )}

      <SllModal
        open={keyOpen}
        onOpenChange={(o) => { if (!o && !keyBusy) setKeyOpen(false); }}
        title="Chave do Pagar.me"
        size="md"
        footer={(
          <>
            <button type="button" disabled={keyBusy} onClick={() => setKeyOpen(false)} className={sllBtnGhost}>Cancelar</button>
            <button type="button" disabled={keyBusy} onClick={() => void submitKey()} className={sllBtnPrimary}>
              {keyBusy && <Loader2 size={15} className="animate-spin" />}Validar e guardar
            </button>
          </>
        )}
      >
        <SllField label="Chave secreta (começa com sk_)">
          <input type="password" autoComplete="off" className={sllFieldCls} value={keyVal} onChange={(e) => setKeyVal(e.target.value)} placeholder="sk_test_... ou sk_..." />
        </SllField>
        <p className="mt-2 text-xs text-slate-500">Painel do Pagar.me › Configurações › Chaves. Use a chave secreta, nunca a pública (pk_). Chave sk_test_ funciona em modo teste.</p>
      </SllModal>
    </div>
  );
}