import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { Supplier, SupplierForm, listSuppliers, saveSupplier } from '../services/cadastros';
import { useGestorAccess } from '../hooks/useGestorAccess';

const EMPTY: SupplierForm = {
  name: '', document: '', email: '', phone: '', contact_name: '',
  lead_time_days: '', payment_terms: '', notes: '', active: true,
};

export default function SuppliersPage() {
  const { can: allow } = useGestorAccess();
  const { storeId, loading: lojaLoading } = useLoja();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      setRows(await listSuppliers(storeId));
    } catch (e) {
      console.error('[Gestor]', e);
      showError('Erro ao carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) reload(); }, [lojaLoading, reload]);

  const set = (k: keyof SupplierForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function openNew() { setEditId(null); setForm(EMPTY); setOpen(true); }
  function openEdit(s: Supplier) {
    setEditId(s.id);
    setForm({
      name: s.name, document: s.document || '', email: s.email || '', phone: s.phone || '',
      contact_name: s.contact_name || '', lead_time_days: s.lead_time_days == null ? '' : String(s.lead_time_days),
      payment_terms: s.payment_terms || '', notes: s.notes || '', active: s.active,
    });
    setOpen(true);
  }

  async function save() {
    if (!storeId) return;
    if (!form.name.trim()) { showError('Informe o nome do fornecedor.'); return; }
    setSaving(true);
    try {
      await saveSupplier(storeId, editId, form);
      showSuccess('Fornecedor salvo.');
      setOpen(false);
      await reload();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Cadastro usado na reposição e nas compras.</p>
        </div>
        <>{allow('fornecedores','criar') && (<Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo fornecedor</Button>)}</>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-muted-foreground">Nenhum fornecedor cadastrado.</div>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[s.contact_name, s.phone, s.email].filter(Boolean).join(' · ') || 'Sem contato'}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {s.lead_time_days != null ? `${s.lead_time_days} dia(s)` : ''}
              </div>
              <Badge variant={s.active ? 'secondary' : 'outline'}>{s.active ? 'Ativo' : 'Inativo'}</Badge>
              <>{allow('fornecedores','editar') && (<Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>)}</>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_label]:text-slate-700">
          <DialogHeader><DialogTitle>{editId ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CNPJ/CPF</label>
              <Input value={form.document} onChange={(e) => set('document', e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contato</label>
              <Input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">E-mail</label>
              <Input value={form.email} onChange={(e) => set('email', e.target.value)} type="email" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefone/WhatsApp</label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Prazo de entrega (dias)</label>
              <Input value={form.lead_time_days} onChange={(e) => set('lead_time_days', e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Condição de pagamento</label>
              <Input value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} placeholder="Ex.: 30/60 dias" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Observações</label>
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Ativo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}