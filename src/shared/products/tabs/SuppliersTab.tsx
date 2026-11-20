import { useEffect, useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NumInput } from './fields';
import { listSupplierOptions, type SupplierOption } from '../suppliersLookup';
import type { ProductSupplier } from '../types';

interface Props {
  storeId: string;
  suppliers: ProductSupplier[];
  onChange: (list: ProductSupplier[]) => void;
}

export default function SuppliersTab({ storeId, suppliers, onChange }: Props) {
  const [options, setOptions] = useState<SupplierOption[]>([]);

  useEffect(() => {
    let alive = true;
    listSupplierOptions(storeId).then((o) => alive && setOptions(o));
    return () => { alive = false; };
  }, [storeId]);

  const patch = (i: number, p: Partial<ProductSupplier>) =>
    onChange(suppliers.map((s, idx) => (idx === i ? { ...s, ...p } : s)));

  const add = () =>
    onChange([...suppliers, { supplier_id: null, supplier_name: '', supplier_code: '', purchase_cost: null, is_default: suppliers.length === 0 }]);

  const remove = (i: number) => {
    const next = suppliers.filter((_, idx) => idx !== i);
    if (next.length && !next.some((s) => s.is_default)) next[0] = { ...next[0], is_default: true };
    onChange(next);
  };

  const setDefault = (i: number) => onChange(suppliers.map((s, idx) => ({ ...s, is_default: idx === i })));

  const pick = (i: number, id: string) => {
    const opt = options.find((o) => o.id === id);
    patch(i, { supplier_id: opt?.id ?? null, supplier_name: opt?.name ?? '' });
  };

  return (
    <div className="space-y-4">
      {suppliers.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
          Nenhum fornecedor vinculado a este produto.
        </p>
      )}

      {suppliers.map((s, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.length > 0 ? (
              <Field label="Fornecedor">
                <select
                  value={s.supplier_id ?? ''}
                  onChange={(e) => pick(i, e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
                >
                  <option value="">Selecione...</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Fornecedor" hint="Cadastre fornecedores no Gestor para selecioná-los aqui.">
                <Input value={s.supplier_name ?? ''} onChange={(e) => patch(i, { supplier_name: e.target.value })} />
              </Field>
            )}
            <Field label="Código no fornecedor">
              <Input value={s.supplier_code ?? ''} onChange={(e) => patch(i, { supplier_code: e.target.value })} />
            </Field>
            <Field label="Custo de compra (R$)">
              <NumInput value={s.purchase_cost} step="0.01" onChange={(v) => patch(i, { purchase_cost: v })} />
            </Field>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDefault(i)}
              className={`inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold ${s.is_default ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
            >
              <Star size={14} fill={s.is_default ? 'currentColor' : 'none'} />
              {s.is_default ? 'Fornecedor padrão' : 'Tornar padrão'}
            </button>
            <button type="button" onClick={() => remove(i)} className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-rose-500">
              <Trash2 size={14} /> Remover
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add}>
        <Plus size={14} className="mr-1" /> Adicionar fornecedor
      </Button>
    </div>
  );
}
