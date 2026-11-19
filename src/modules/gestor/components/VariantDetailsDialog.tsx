import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showError, showSuccess } from '@/utils/toast';
import { EMPTY_DETAILS, VariantDetails, getVariantDetails, gtinValid, saveVariantDetails } from '../services/catalogo';

interface Props {
  variantId: string | null;
  label: string;
  onClose: () => void;
  onSaved?: () => void;
}

const FIELDS: { key: keyof VariantDetails; label: string; mode: 'numeric' | 'decimal' | 'text'; hint?: string }[] = [
  { key: 'min_stock', label: 'Estoque mínimo', mode: 'numeric' },
  { key: 'cost_price', label: 'Custo (R$)', mode: 'decimal' },
  { key: 'ean', label: 'EAN/GTIN', mode: 'numeric', hint: '8, 12, 13 ou 14 dígitos' },
  { key: 'ncm', label: 'NCM', mode: 'numeric', hint: '8 dígitos' },
  { key: 'cest', label: 'CEST', mode: 'numeric', hint: '7 dígitos' },
  { key: 'weight_g', label: 'Peso (g)', mode: 'numeric' },
  { key: 'height_cm', label: 'Altura (cm)', mode: 'decimal' },
  { key: 'width_cm', label: 'Largura (cm)', mode: 'decimal' },
  { key: 'length_cm', label: 'Comprimento (cm)', mode: 'decimal' },
];

export default function VariantDetailsDialog({ variantId, label, onClose, onSaved }: Props) {
  const [form, setForm] = useState<VariantDetails>(EMPTY_DETAILS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!variantId) return;
    setLoading(true);
    getVariantDetails(variantId)
      .then(setForm)
      .catch((e) => { console.error('[Gestor]', e); showError('Erro ao carregar os dados da variação.'); })
      .finally(() => setLoading(false));
  }, [variantId]);

  async function save() {
    if (!variantId) return;
    if (form.ean.trim() && !gtinValid(form.ean)) { showError('EAN/GTIN inválido (confira o dígito verificador).'); return; }
    setSaving(true);
    try {
      await saveVariantDetails(variantId, form);
      showSuccess('Dados da variação salvos.');
      onSaved?.();
      onClose();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!variantId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_label]:text-slate-700">
        <DialogHeader><DialogTitle>Dados da variação</DialogTitle></DialogHeader>
        <p className="-mt-2 truncate text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-sm font-medium">{f.label}</label>
                <Input
                  value={form[f.key]}
                  inputMode={f.mode === 'text' ? undefined : f.mode}
                  placeholder={f.hint}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || loading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}