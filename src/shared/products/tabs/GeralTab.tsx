import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidGtin } from '../productService';
import type { ProductFormat, ProductRow } from '../types';
import { selectCls } from './uiHelpers';

interface Props {
  product: ProductRow;
  onChange: (patch: Partial<ProductRow>) => void;
}

const UNITS = ['UN', 'PC', 'CX', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'PAR', 'KIT'];

export default function GeralTab({ product, onChange }: Props) {
  const [tagsText, setTagsText] = useState(product.tags.join(', '));
  useEffect(() => { setTagsText(product.tags.join(', ')); }, [product.id]);

  const commitTags = () =>
    onChange({ tags: Array.from(new Set(tagsText.split(',').map((t) => t.trim()).filter(Boolean))) });

  const gtinInvalid = !isValidGtin(product.gtin);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
      <div className="space-y-1.5 md:col-span-6">
        <Label htmlFor="p-name">Nome do produto *</Label>
        <Input id="p-name" value={product.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-sku">SKU (código)</Label>
        <Input id="p-sku" value={product.sku ?? ''} onChange={(e) => onChange({ sku: e.target.value })} />
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-format">Formato</Label>
        <select id="p-format" className={selectCls} value={product.format} onChange={(e) => onChange({ format: e.target.value as ProductFormat })}>
          <option value="simple">Simples</option>
          <option value="variation">Com variações</option>
          <option value="kit">Kit / Composição</option>
        </select>
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-unit">Unidade *</Label>
        <select id="p-unit" className={selectCls} value={product.unit} onChange={(e) => onChange({ unit: e.target.value })}>
          {!UNITS.includes(product.unit) && <option value={product.unit}>{product.unit}</option>}
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="space-y-1.5 md:col-span-3">
        <Label htmlFor="p-gtin">GTIN / EAN</Label>
        <Input
          id="p-gtin" inputMode="numeric" value={product.gtin ?? ''}
          onChange={(e) => onChange({ gtin: e.target.value })}
          className={gtinInvalid ? 'border-destructive' : ''}
        />
        {gtinInvalid && <p className="text-xs text-destructive">Dígito verificador não confere.</p>}
      </div>

      <div className="space-y-1.5 md:col-span-3">
        <Label htmlFor="p-validity">Validade</Label>
        <Input id="p-validity" type="date" value={product.validity_date ?? ''} onChange={(e) => onChange({ validity_date: e.target.value || null })} />
      </div>

      <div className="space-y-1.5 md:col-span-6">
        <Label htmlFor="p-tags">Tags (separadas por vírgula)</Label>
        <Input id="p-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} onBlur={commitTags} placeholder="verão, promoção, lançamento" />
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {product.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}