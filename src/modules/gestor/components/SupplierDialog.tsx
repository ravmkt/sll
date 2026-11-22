import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { showError, showSuccess } from '@/utils/toast';
import { saveSupplier } from '../services/cadastros';
import type { Supplier, SupplierForm } from '../services/cadastros';
import {
  fetchCep, fetchCnpj, fmtCep, fmtCnpjCpf, isValidCnpj, isValidCpf, onlyDigits,
} from '../services/fornecedoresLookup';

type Form = Required<SupplierForm>;

const EMPTY: Form = {
  name: '', document: '', email: '', phone: '', contact_name: '', lead_time_days: '', payment_terms: '', notes: '',
  active: true, legal_name: '', person_type: 'pj', ie: '', ie_indicator: '', im: '', tax_regime: '', zip: '',
  street: '', number: '', complement: '', district: '', city: '', state: '', ibge_code: '', bank_name: '',
  bank_agency: '', bank_account: '', pix_key: '',
};

const s = (v: string | null | undefined) => v ?? '';

const toForm = (x: Supplier): Form => ({
  name: x.name, document: fmtCnpjCpf(s(x.document)), email: s(x.email), phone: s(x.phone), contact_name: s(x.contact_name),
  lead_time_days: x.lead_time_days == null ? '' : String(x.lead_time_days), payment_terms: s(x.payment_terms),
  notes: s(x.notes), active: x.active, legal_name: s(x.legal_name), person_type: x.person_type || 'pj', ie: s(x.ie),
  ie_indicator: x.ie_indicator == null ? '' : String(x.ie_indicator), im: s(x.im), tax_regime: s(x.tax_regime),
  zip: fmtCep(s(x.zip)), street: s(x.street), number: s(x.number), complement: s(x.complement),
  district: s(x.district), city: s(x.city), state: s(x.state), ibge_code: s(x.ibge_code),
  bank_name: s(x.bank_name), bank_agency: s(x.bank_agency), bank_account: s(x.bank_account), pix_key: s(x.pix_key),
});

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

type Props = { storeId: string; supplier: Supplier | null; open: boolean; onClose: () => void; onSaved: () => void };

export default function SupplierDialog({ storeId, supplier, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<'cnpj' | 'cep' | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    setForm(supplier ? toForm(supplier) : EMPTY);
  }, [open, supplier]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const text = (label: string, k: keyof Form, cls = '', extra: { type?: string; max?: number; placeholder?: string } = {}) => (
    <SllField label={label} className={cls}>
      <input
        type={extra.type ?? 'text'}
        maxLength={extra.max}
        placeholder={extra.placeholder}
        className={sllFieldCls}
        value={String(form[k] ?? '')}
        onChange={(e) => set(k, e.target.value as never)}
      />
    </SllField>
  );

  const isPj = form.person_type === 'pj';
  const isPf = form.person_type === 'pf';
  const docLabel = isPf ? 'CPF' : form.person_type === 'exterior' ? 'Documento' : 'CNPJ';

  const cepLookup = async (raw: string, force: boolean) => {
    if (onlyDigits(raw).length !== 8) return;
    setLookup('cep');
    try {
      const r = await fetchCep(raw);
      if (!r) { showError('CEP não encontrado. Preencha o endereço manualmente.'); return; }
      setForm((f) => ({
        ...f,
        zip: fmtCep(raw),
        street: r.street || (force ? '' : f.street),
        district: r.district || (force ? '' : f.district),
        city: r.city || f.city,
        state: r.state || f.state,
        ibge_code: r.ibge_code || f.ibge_code,
        complement: f.complement || r.complement,
      }));
    } catch (e) { showError((e as Error).message); }
    finally { setLookup(null); }
  };

  const cnpjLookup = async () => {
    if (!isValidCnpj(form.document)) { showError('CNPJ inválido. Confira os dígitos.'); return; }
    setLookup('cnpj');
    try {
      const r = await fetchCnpj(form.document);
      if (!r) { showError('CNPJ não encontrado na Receita.'); return; }
      let ibge = r.ibge_code;
      if (!ibge && r.zip) { try { ibge = (await fetchCep(r.zip))?.ibge_code ?? ''; } catch { /* segue sem IBGE */ } }
      setForm((f) => ({
        ...f,
        legal_name: r.legal_name || f.legal_name,
        name: f.name.trim() ? f.name : (r.trade_name || r.legal_name),
        email: f.email || r.email,
        phone: f.phone || r.phone,
        zip: r.zip ? fmtCep(r.zip) : f.zip,
        street: r.street || f.street,
        number: r.number || f.number,
        complement: r.complement || f.complement,
        district: r.district || f.district,
        city: r.city || f.city,
        state: r.state || f.state,
        ibge_code: ibge || f.ibge_code,
        tax_regime: r.tax_regime || f.tax_regime,
      }));
      if (r.situation && r.situation.toUpperCase() !== 'ATIVA') showError(`Atenção: situação na Receita é "${r.situation}".`);
      else showSuccess('Dados da Receita carregados. Confira antes de salvar.');
    } catch (e) { showError((e as Error).message); }
    finally { setLookup(null); }
  };

  const submit = async () => {
    const doc = onlyDigits(form.document);
    if (!form.name.trim()) { setErr('Informe o nome do fornecedor.'); return; }
    if (doc && isPj && !isValidCnpj(doc)) { setErr('CNPJ inválido.'); return; }
    if (doc && isPf && !isValidCpf(doc)) { setErr('CPF inválido.'); return; }
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setErr('E-mail inválido.'); return; }
    if (form.zip && onlyDigits(form.zip).length !== 8) { setErr('CEP deve ter 8 dígitos.'); return; }
    if (form.state && form.state.trim().length !== 2) { setErr('UF deve ter 2 letras.'); return; }
    if (form.ie_indicator === '1' && !form.ie.trim()) { setErr('Informe a inscrição estadual (contribuinte de ICMS).'); return; }
    setBusy(true); setErr('');
    try {
      await saveSupplier(storeId, supplier?.id ?? null, {
        ...form,
        document: doc,
        zip: onlyDigits(form.zip),
        state: form.state.trim().toUpperCase(),
        tax_regime: isPj ? form.tax_regime : '',
      });
      showSuccess('Fornecedor salvo.');
      onSaved(); onClose();
    } catch (e) { setErr((e as Error).message || 'Erro ao salvar'); }
    finally { setBusy(false); }
  };

  const select = 'cursor-pointer';

  const footer = (
    <>
      <button type="button" disabled={busy} onClick={onClose} className={sllBtnGhost}>Cancelar</button>
      <button type="button" disabled={busy} onClick={() => void submit()} className={sllBtnPrimary}>
        {busy && <Loader2 size={15} className="animate-spin" />}{busy ? 'Salvando...' : 'Salvar'}
      </button>
    </>
  );

  return (
    <SllModal open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }} title={supplier ? 'Editar fornecedor' : 'Novo fornecedor'} size="lg" footer={footer}>
      <div className="space-y-4">
        {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{err}</p>}

        <Card title="Identificação e fiscal">
          <div className="grid gap-3 sm:grid-cols-3">
            <SllField label="Tipo de pessoa">
              <select className={sllFieldCls + ' ' + select} value={form.person_type} onChange={(e) => set('person_type', e.target.value)}>
                <option value="pj">Pessoa jurídica</option>
                <option value="pf">Pessoa física</option>
                <option value="exterior">Exterior</option>
              </select>
            </SllField>
            <SllField label={docLabel} className="sm:col-span-2">
              <div className="flex gap-2">
                <input
                  className={sllFieldCls}
                  value={form.document}
                  onChange={(e) => set('document', e.target.value)}
                  onBlur={() => set('document', fmtCnpjCpf(form.document))}
                />
                {isPj && (
                  <button
                    type="button"
                    disabled={lookup !== null || onlyDigits(form.document).length !== 14}
                    onClick={() => void cnpjLookup()}
                    className={sllBtnGhost + ' shrink-0 !px-4 !py-2'}
                    title="Preenche razão social, endereço e regime pela Receita"
                  >
                    {lookup === 'cnpj' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar CNPJ
                  </button>
                )}
              </div>
            </SllField>
            {text('Nome fantasia *', 'name', 'sm:col-span-3')}
            {text('Razão social', 'legal_name', 'sm:col-span-3')}
            <SllField label="Indicador de IE">
              <select className={sllFieldCls + ' ' + select} value={form.ie_indicator} onChange={(e) => set('ie_indicator', e.target.value)}>
                <option value="">Não informado</option>
                <option value="1">Contribuinte ICMS</option>
                <option value="2">Isento</option>
                <option value="9">Não contribuinte</option>
              </select>
            </SllField>
            {text('Inscrição estadual', 'ie')}
            {text('Inscrição municipal', 'im')}
            {isPj && (
              <SllField label="Regime tributário" className="sm:col-span-3">
                <select className={sllFieldCls + ' ' + select} value={form.tax_regime} onChange={(e) => set('tax_regime', e.target.value)}>
                  <option value="">Não informado</option>
                  <option value="mei">MEI</option>
                  <option value="simples">Simples Nacional</option>
                  <option value="presumido">Lucro presumido</option>
                  <option value="real">Lucro real</option>
                </select>
              </SllField>
            )}
          </div>
        </Card>

        <Card title="Contato">
          <div className="grid gap-3 sm:grid-cols-3">
            {text('Contato', 'contact_name')}
            {text('E-mail (XML da nota)', 'email', '', { type: 'email' })}
            {text('Telefone / WhatsApp', 'phone')}
          </div>
        </Card>

        <Card title="Endereço">
          <div className="grid gap-3 sm:grid-cols-6">
            <SllField label="CEP" className="sm:col-span-2">
              <div className="relative">
                <input
                  className={sllFieldCls}
                  value={form.zip}
                  maxLength={9}
                  placeholder="00000-000"
                  onChange={(e) => {
                    set('zip', e.target.value);
                    if (onlyDigits(e.target.value).length === 8) void cepLookup(e.target.value, true);
                  }}
                  onBlur={() => set('zip', fmtCep(form.zip))}
                />
                {lookup === 'cep' && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[color:var(--sll-b-brand)]" />}
              </div>
            </SllField>
            {text('Rua', 'street', 'sm:col-span-4')}
            {text('Número', 'number', 'sm:col-span-2')}
            {text('Complemento', 'complement', 'sm:col-span-4')}
            {text('Bairro', 'district', 'sm:col-span-2')}
            {text('Cidade', 'city', 'sm:col-span-3')}
            {text('UF', 'state', '', { max: 2 })}
            {text('Código IBGE do município', 'ibge_code', 'sm:col-span-3', { max: 7 })}
          </div>
        </Card>

        <Card title="Financeiro">
          <div className="grid gap-3 sm:grid-cols-4">
            {text('Prazo de entrega (dias)', 'lead_time_days', 'sm:col-span-1', { type: 'number' })}
            {text('Condição de pagamento', 'payment_terms', 'sm:col-span-3', { placeholder: 'Ex.: 30/60 dias' })}
            {text('Banco', 'bank_name', 'sm:col-span-2')}
            {text('Agência', 'bank_agency')}
            {text('Conta', 'bank_account')}
            {text('Chave PIX', 'pix_key', 'sm:col-span-4')}
          </div>
        </Card>

        <Card title="Observações">
          <SllField label="Notas internas">
            <textarea className={sllFieldCls} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </SllField>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            Fornecedor ativo
          </label>
        </Card>
      </div>
    </SllModal>
  );
}