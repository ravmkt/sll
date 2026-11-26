import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { SllPageHeader } from '@/components/sll/SllPageHeader';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { showError, showSuccess } from '@/utils/toast';
import { EMPTY_COMPANY, REGIMES, getCompany, missingFields, saveCompany } from '../services/empresa';
import type { Company } from '../services/empresa';
import { fetchCep, fetchCnpj, fmtCep, fmtCnpjCpf, isValidCnpj, onlyDigits } from '../services/fornecedoresLookup';

const fmt = (c: Company): Company => ({ ...c, cnpj: fmtCnpjCpf(c.cnpj), zip: fmtCep(c.zip) });

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function EmpresaPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [form, setForm] = useState<Company>(EMPTY_COMPANY);
  const [base, setBase] = useState<Company>(EMPTY_COMPANY);
  const [canEdit, setCanEdit] = useState(false);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookup, setLookup] = useState<'cnpj' | 'cep' | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const r = await getCompany(storeId);
      const f = fmt(r.company);
      setForm(f); setBase(f); setCanEdit(r.canEdit); setSaved(r.saved);
    } catch (e) {
      showError((e as Error).message || 'Erro ao carregar a empresa.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) void load(); }, [lojaLoading, load]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(base), [form, base]);
  const missing = useMemo(() => missingFields(form), [form]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = <K extends keyof Company>(k: K, v: Company[K]) => setForm((f) => ({ ...f, [k]: v }));
  const ro = !canEdit;

  const txt = (label: string, k: keyof Company, cls = '', extra: { max?: number; placeholder?: string; type?: string } = {}) => (
    <SllField label={label} className={cls}>
      <input
        type={extra.type ?? 'text'} maxLength={extra.max} placeholder={extra.placeholder} disabled={ro}
        className={sllFieldCls} value={String(form[k] ?? '')} onChange={(e) => set(k, e.target.value as never)}
      />
    </SllField>
  );

  const cepLookup = async (raw: string) => {
    if (onlyDigits(raw).length !== 8) return;
    setLookup('cep');
    try {
      const r = await fetchCep(raw);
      if (!r) { showError('CEP não encontrado. Preencha o endereço manualmente.'); return; }
      setForm((f) => ({
        ...f, zip: fmtCep(raw), street: r.street || f.street, district: r.district || f.district,
        city: r.city || f.city, state: r.state || f.state, ibge_code: r.ibge_code || f.ibge_code,
      }));
    } catch (e) { showError((e as Error).message); }
    finally { setLookup(null); }
  };

  const cnpjLookup = async () => {
    if (!isValidCnpj(form.cnpj)) { showError('CNPJ inválido. Confira os dígitos.'); return; }
    setLookup('cnpj');
    try {
      const r = await fetchCnpj(form.cnpj);
      if (!r) { showError('CNPJ não encontrado na Receita.'); return; }
      let ibge = r.ibge_code;
      if (!ibge && r.zip) { try { ibge = (await fetchCep(r.zip))?.ibge_code ?? ''; } catch { /* segue sem IBGE */ } }
      setForm((f) => ({
        ...f,
        legal_name: r.legal_name || f.legal_name,
        trade_name: f.trade_name.trim() ? f.trade_name : (r.trade_name || r.legal_name),
        email: f.email || r.email,
        phone: f.phone || r.phone,
        zip: r.zip ? fmtCep(r.zip) : f.zip,
        street: r.street || f.street, number: r.number || f.number, complement: r.complement || f.complement,
        district: r.district || f.district, city: r.city || f.city, state: r.state || f.state,
        ibge_code: ibge || f.ibge_code,
        tax_regime: r.tax_regime || f.tax_regime,
      }));
      if (r.situation && r.situation.toUpperCase() !== 'ATIVA') showError(`Atenção: situação na Receita é "${r.situation}".`);
      else showSuccess('Dados da Receita carregados. Confira e salve.');
    } catch (e) { showError((e as Error).message); }
    finally { setLookup(null); }
  };

  const save = async () => {
    if (!storeId) return;
    if (form.cnpj.trim() && !isValidCnpj(form.cnpj)) { showError('CNPJ inválido.'); return; }
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { showError('E-mail inválido.'); return; }
    if (form.zip.trim() && onlyDigits(form.zip).length !== 8) { showError('CEP deve ter 8 dígitos.'); return; }
    if (form.cnae.trim() && onlyDigits(form.cnae).length !== 7) { showError('CNAE deve ter 7 dígitos.'); return; }
    if (form.state.trim() && form.state.trim().length !== 2) { showError('UF deve ter 2 letras.'); return; }
    setSaving(true);
    try {
      await saveCompany(storeId, { ...form, state: form.state.trim().toUpperCase() });
      showSuccess('Dados da empresa salvos.');
      await load();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || lojaLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>;
  }

  return (
    <div className="space-y-4">
      <SllPageHeader
        title="Empresa"
        subtitle="Dados usados em notas fiscais, etiquetas, propostas e no envio ao contador. Preencha uma vez só."
        actions={canEdit ? (
          <>
            {dirty && <button type="button" disabled={saving} onClick={() => setForm(base)} className={sllBtnGhost}>Descartar</button>}
            <button type="button" disabled={(!dirty && saved) || saving} onClick={() => void save()} className={sllBtnPrimary}>
              {saving && <Loader2 size={15} className="animate-spin" />}Salvar
            </button>
          </>
        ) : undefined}
      />

      {ro && <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">Você pode ver estes dados, mas só o dono e quem tem permissão de edição em Configurações altera.</p>}
      {!saved && canEdit && <p className="rounded-xl bg-[color:var(--sll-b-brand-soft)] px-4 py-2 text-sm font-medium text-[color:var(--sll-b-brand)]">Preenchemos o que já existia no cadastro da loja. Confira, complete o que faltar e clique em Salvar.</p>}

      {missing.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Cadastro completo para emitir nota fiscal.</div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p><strong>Falta para emitir nota fiscal:</strong> {missing.join(', ')}.</p>
        </div>
      )}

      <Card title="Dados da empresa" hint="Digite o CNPJ e clique em Buscar: razão social, endereço e regime vêm da Receita.">
        <div className="grid gap-3 sm:grid-cols-3">
          <SllField label="CNPJ">
            <div className="flex gap-2">
              <input
                className={sllFieldCls} disabled={ro} value={form.cnpj} placeholder="00.000.000/0000-00"
                onChange={(e) => set('cnpj', e.target.value)} onBlur={() => set('cnpj', fmtCnpjCpf(form.cnpj))}
              />
              {canEdit && (
                <button type="button" disabled={lookup !== null || onlyDigits(form.cnpj).length !== 14} onClick={() => void cnpjLookup()} className={sllBtnGhost + ' shrink-0 !px-4 !py-2'}>
                  {lookup === 'cnpj' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
                </button>
              )}
            </div>
          </SllField>
          {txt('Razão social', 'legal_name', 'sm:col-span-2')}
          {txt('Nome fantasia', 'trade_name', 'sm:col-span-2')}
          <SllField label="Regime tributário">
            <select className={sllFieldCls + ' cursor-pointer'} disabled={ro} value={form.tax_regime} onChange={(e) => set('tax_regime', e.target.value)}>
              <option value="">Selecione</option>
              {REGIMES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </SllField>
          <SllField label="Inscrição estadual">
            <input className={sllFieldCls} disabled={ro || form.ie_exempt} value={form.ie_exempt ? '' : form.ie} placeholder={form.ie_exempt ? 'Isento' : ''} onChange={(e) => set('ie', e.target.value)} />
            <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input type="checkbox" disabled={ro} checked={form.ie_exempt} onChange={(e) => set('ie_exempt', e.target.checked)} className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" />
              Isento de IE
            </label>
          </SllField>
          {txt('Inscrição municipal', 'im')}
          {txt('CNAE (7 dígitos)', 'cnae', '', { max: 9, placeholder: '0000000' })}
        </div>
      </Card>

      <Card title="Contato">
        <div className="grid gap-3 sm:grid-cols-3">
          {txt('E-mail', 'email', '', { type: 'email' })}
          {txt('Telefone / WhatsApp', 'phone')}
          {txt('Site da loja', 'website', '', { placeholder: 'https://' })}
        </div>
      </Card>

      <Card title="Endereço" hint="Digite o CEP e o endereço é preenchido sozinho.">
        <div className="grid gap-3 sm:grid-cols-6">
          <SllField label="CEP" className="sm:col-span-2">
            <div className="relative">
              <input
                className={sllFieldCls} disabled={ro} value={form.zip} maxLength={9} placeholder="00000-000"
                onChange={(e) => { set('zip', e.target.value); if (onlyDigits(e.target.value).length === 8) void cepLookup(e.target.value); }}
                onBlur={() => set('zip', fmtCep(form.zip))}
              />
              {lookup === 'cep' && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[color:var(--sll-b-brand)]" />}
            </div>
          </SllField>
          {txt('Rua', 'street', 'sm:col-span-4')}
          {txt('Número', 'number', 'sm:col-span-2')}
          {txt('Complemento', 'complement', 'sm:col-span-4')}
          {txt('Bairro', 'district', 'sm:col-span-2')}
          {txt('Cidade', 'city', 'sm:col-span-3')}
          {txt('UF', 'state', '', { max: 2 })}
        </div>
      </Card>
    </div>
  );
}