import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { SllPageHeader } from '@/components/sll/SllPageHeader';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { showError, showSuccess } from '@/utils/toast';
import { CUSTOMER_FIELD_LABEL, getPdvRules, savePdvRules } from '../services/pdvSettings';
import type { CustomerField, PdvRules, PdvRulesPatch, RulesSource } from '../services/pdvSettings';

type Form = {
  req: Record<CustomerField, boolean>;
  discEnabled: boolean; discPct: string; discValue: string;
  shipEnabled: boolean; shipMode: 'options' | 'free'; shipOptions: { label: string; value: string }[];
  noteEnabled: boolean;
};

const checkCls = 'h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)] disabled:cursor-not-allowed';
const str = (n: number | null) => (n === null || n === undefined ? '' : String(n).replace('.', ','));
const parse = (s: string): number | null => {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

function toForm(r: PdvRules): Form {
  return {
    req: { ...r.customer_required },
    discEnabled: r.discount_enabled, discPct: str(r.discount_max_pct), discValue: str(r.discount_max_value),
    shipEnabled: r.shipping_enabled, shipMode: r.shipping_mode,
    shipOptions: r.shipping_options.map((o) => ({ label: o.label, value: str(o.value) })),
    noteEnabled: r.note_enabled,
  };
}

function build(f: Form): { error: string } | { patch: PdvRulesPatch } {
  const pct = parse(f.discPct);
  const val = parse(f.discValue);
  if (pct !== null && (Number.isNaN(pct) || pct < 0 || pct > 100)) return { error: 'O limite de desconto em % deve ficar entre 0 e 100.' };
  if (val !== null && (Number.isNaN(val) || val < 0)) return { error: 'O limite de desconto em R$ é inválido.' };
  if (f.discEnabled && pct === null && val === null) return { error: 'Com o desconto liberado, informe ao menos um limite (% ou R$).' };

  const seen = new Set<string>();
  const options: { label: string; value: number }[] = [];
  for (const o of f.shipOptions) {
    const label = o.label.trim();
    const v = parse(o.value);
    if (!label) return { error: 'Dê um nome a todas as opções de frete ou remova a linha vazia.' };
    if (v === null || Number.isNaN(v) || v < 0) return { error: `Valor inválido na opção de frete "${label}".` };
    if (seen.has(label.toLowerCase())) return { error: `A opção de frete "${label}" está repetida.` };
    seen.add(label.toLowerCase());
    options.push({ label, value: v });
  }
  if (f.shipEnabled && f.shipMode === 'options' && options.length === 0) return { error: 'Cadastre ao menos uma opção de frete ou escolha o valor livre.' };

  return {
    patch: {
      customer_required: f.req,
      discount_enabled: f.discEnabled, discount_max_pct: pct, discount_max_value: val,
      shipping_enabled: f.shipEnabled, shipping_mode: f.shipMode, shipping_options: options,
      note_enabled: f.noteEnabled,
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

export default function PdvConfigPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [rules, setRules] = useState<PdvRules | null>(null);
  const [source, setSource] = useState<RulesSource>('default');
  const [base, setBase] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    const r = await getPdvRules(storeId);
    const f = toForm(r.rules);
    setRules(r.rules); setSource(r.source); setBase(f); setForm(f); setLoading(false);
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) void load(); }, [lojaLoading, load]);

  const dirty = useMemo(() => !!form && !!base && JSON.stringify(form) !== JSON.stringify(base), [form, base]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (loading || lojaLoading || !form || !rules) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>;
  }

  const online = source === 'online';
  const canEdit = rules.is_manager && online;
  const ro = !canEdit;
  const set = (fn: (f: Form) => Form) => setForm((f) => (f ? fn(f) : f));

  const save = async () => {
    if (!storeId) return;
    const r = build(form);
    if ('error' in r) { showError(r.error); return; }
    setSaving(true);
    try {
      await savePdvRules(storeId, r.patch);
      showSuccess('Regras do PDV salvas.');
      await load();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SllPageHeader
        title="PDV"
        subtitle="Regras do balcão: dados do cliente, desconto, frete e observação. Valem para os vendedores; o gestor não tem limites."
        actions={canEdit ? (
          <>
            {dirty && <button type="button" disabled={saving} onClick={() => setForm(base)} className={sllBtnGhost}>Descartar</button>}
            <button type="button" disabled={!dirty || saving} onClick={() => void save()} className={sllBtnPrimary}>
              {saving && <Loader2 size={15} className="animate-spin" />}Salvar alterações
            </button>
          </>
        ) : undefined}
      />

      {!online && <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">Sem conexão com o servidor: mostrando a última cópia deste aparelho. Para alterar, conecte-se.</p>}
      {online && !rules.is_manager && <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">Você pode ver estas regras, mas só o dono e os administradores alteram.</p>}

      <Card title="Dados do cliente na venda" hint="Marque o que o vendedor é obrigado a preencher antes de finalizar a venda.">
        <div className="flex flex-wrap gap-6">
          {(Object.keys(CUSTOMER_FIELD_LABEL) as CustomerField[]).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className={checkCls} disabled={ro} checked={form.req[k]}
                onChange={(e) => set((f) => ({ ...f, req: { ...f.req, [k]: e.target.checked } }))} />
              {CUSTOMER_FIELD_LABEL[k]} obrigatório
            </label>
          ))}
        </div>
      </Card>

      <Card title="Desconto" hint="Quando os dois limites estão preenchidos, vale o mais restritivo.">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className={checkCls} disabled={ro} checked={form.discEnabled}
            onChange={(e) => set((f) => ({ ...f, discEnabled: e.target.checked }))} />
          Vendedor pode dar desconto
        </label>
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <SllField label="Limite em % do subtotal">
            <input className={sllFieldCls} inputMode="decimal" disabled={ro || !form.discEnabled} placeholder="sem limite em %"
              value={form.discPct} onChange={(e) => set((f) => ({ ...f, discPct: e.target.value }))} />
          </SllField>
          <SllField label="Limite em R$">
            <input className={sllFieldCls} inputMode="decimal" disabled={ro || !form.discEnabled} placeholder="sem limite em R$"
              value={form.discValue} onChange={(e) => set((f) => ({ ...f, discValue: e.target.value }))} />
          </SllField>
        </div>
      </Card>

      <Card title="Frete" hint="O vendedor escolhe entre as opções cadastradas. Valor livre só se você liberar.">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className={checkCls} disabled={ro} checked={form.shipEnabled}
            onChange={(e) => set((f) => ({ ...f, shipEnabled: e.target.checked }))} />
          Vendedor pode cobrar frete
        </label>
        <div className="mb-3 flex flex-wrap gap-6">
          {([['options', 'Só as opções cadastradas'], ['free', 'Valor livre']] as const).map(([k, l]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="ship-mode" className={checkCls} disabled={ro || !form.shipEnabled} checked={form.shipMode === k}
                onChange={() => set((f) => ({ ...f, shipMode: k }))} />
              {l}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          {form.shipOptions.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input className={sllFieldCls + ' max-w-[16rem]'} disabled={ro} placeholder="Nome (ex.: Entrega no bairro)" value={o.label}
                onChange={(e) => set((f) => ({ ...f, shipOptions: f.shipOptions.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
              <input className={sllFieldCls + ' max-w-[9rem]'} inputMode="decimal" disabled={ro} placeholder="R$ 0,00" value={o.value}
                onChange={(e) => set((f) => ({ ...f, shipOptions: f.shipOptions.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) }))} />
              {canEdit && (
                <button type="button" title="Remover" onClick={() => set((f) => ({ ...f, shipOptions: f.shipOptions.filter((_, j) => j !== i) }))}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><Trash2 size={15} /></button>
              )}
            </div>
          ))}
          {form.shipOptions.length === 0 && <p className="text-sm text-slate-400">Nenhuma opção de frete cadastrada.</p>}
        </div>
        {canEdit && (
          <button type="button" className={sllBtnGhost + ' mt-3'}
            onClick={() => set((f) => ({ ...f, shipOptions: [...f.shipOptions, { label: '', value: '' }] }))}>
            <Plus size={15} /> Adicionar opção
          </button>
        )}
      </Card>

      <Card title="Observação">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className={checkCls} disabled={ro} checked={form.noteEnabled}
            onChange={(e) => set((f) => ({ ...f, noteEnabled: e.target.checked }))} />
          Vendedor pode escrever observação na venda
        </label>
      </Card>
    </div>
  );
}