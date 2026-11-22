import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { showSuccess } from '@/utils/toast';
import { saveSupplier } from '../services/cadastros';
import type { Supplier, SupplierForm } from '../services/cadastros';
import { EMPTY_FORM, toForm, validateSupplier } from '../services/fornecedores';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

type Props = {
  storeId: string;
  supplier: Supplier | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function SupplierDialog({ storeId, supplier, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    setForm(supplier ? toForm(supplier) : EMPTY_FORM);
  }, [open, supplier]);

  const set = <K extends keyof SupplierForm>(k: K, v: SupplierForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const problem = validateSupplier(form);
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr('');
    try {
      await saveSupplier(storeId, supplier?.id ?? null, form);
      showSuccess(supplier ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.');
      onSaved();
      onClose();
    } catch (e) {
      setErr((e as Error).message || 'Erro ao salvar');
    } finally {
      setBusy(false);
    }
  };

  const text = (label: string, k: 'name' | 'document' | 'contact_name' | 'email' | 'phone' | 'payment_terms' | 'lead_time_days', opts?: { type?: string; cls?: string; placeholder?: string; inputMode?: 'numeric' | 'tel' | 'email' }) => (
    <SllField label={label} className={opts?.cls}>
      <input
        type={opts?.type ?? 'text'}
        inputMode={opts?.inputMode}
        placeholder={opts?.placeholder}
        className={sllFieldCls}
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
      />
    </SllField>
  );

  const footer = (
    <>
      <button type="button" disabled={busy} onClick={onClose} className={sllBtnGhost}>Cancelar</button>
      <button type="button" disabled={busy} onClick={() => void submit()} className={sllBtnPrimary}>
        {busy && <Loader2 size={15} className="animate-spin" />}{busy ? 'Salvando...' : 'Salvar'}
      </button>
    </>
  );

  return (
    <SllModal
      open={open}
      onOpenChange={(v) => { if (!v && !busy) onClose(); }}
      title={supplier ? 'Editar fornecedor' : 'Novo fornecedor'}
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{err}</p>}

        <Card title="Dados do fornecedor">
          <div className="grid gap-3 sm:grid-cols-2">
            {text('Nome *', 'name', { cls: 'sm:col-span-2' })}
            {text('CNPJ / CPF', 'document', { inputMode: 'numeric', placeholder: 'Somente números' })}
            {text('Pessoa de contato', 'contact_name')}
          </div>
        </Card>

        <Card title="Contato">
          <div className="grid gap-3 sm:grid-cols-2">
            {text('E-mail', 'email', { type: 'email', inputMode: 'email' })}
            {text('Telefone / WhatsApp', 'phone', { inputMode: 'tel', placeholder: '(00) 00000-0000' })}
          </div>
        </Card>

        <Card title="Condições comerciais">
          <div className="grid gap-3 sm:grid-cols-2">
            {text('Prazo de entrega (dias)', 'lead_time_days', { inputMode: 'numeric' })}
            {text('Condição de pagamento', 'payment_terms', { placeholder: 'Ex.: 30/60 dias' })}
          </div>
        </Card>

        <Card title="Observações">
          <textarea className={sllFieldCls} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Card>

        <Card title="Situação">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]"
              checked={form.active}
              onChange={(e) => set('active', e.target.checked)}
            />
            Fornecedor ativo
          </label>
        </Card>
      </div>
    </SllModal>
  );
}