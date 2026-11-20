import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field, NumInput } from './fields';
import type { ProductRow } from '../types';

interface Props {
  product: ProductRow;
  onChange: (patch: Partial<ProductRow>) => void;
}

export default function StockTab({ product: p, onChange }: Props) {
  const range = p.min_stock != null && p.max_stock != null && p.min_stock > p.max_stock;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Estoque mínimo" hint="Abaixo disso o produto entra em Estoque crítico.">
          <NumInput value={p.min_stock} step="1" onChange={(v) => onChange({ min_stock: v })} />
        </Field>
        <Field label="Estoque máximo" hint="Referência para compras.">
          <NumInput value={p.max_stock} step="1" onChange={(v) => onChange({ max_stock: v })} />
        </Field>
        <Field label="Localização" hint="Ex.: Corredor 3, prateleira B.">
          <Input value={p.stock_location ?? ''} onChange={(e) => onChange({ stock_location: e.target.value })} />
        </Field>
      </div>
      {range && <p className="text-xs font-semibold text-rose-500">O estoque mínimo não pode ser maior que o máximo.</p>}

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          O saldo não é editado aqui. Para entradas, saídas e ajustes use o <strong>Livro de estoque</strong>, que registra cada movimento
          e mantém o histórico. Em produtos com variação, o saldo é por variação.
        </p>
      </div>
    </div>
  );
}
