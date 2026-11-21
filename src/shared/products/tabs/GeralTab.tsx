import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidGtin } from '../productService';
import type { ProductFormat, ProductRow } from '../types';
import { selectCls } from './uiHelpers';

interface Props {
  storeId: string;
  product: ProductRow;
  onChange: (patch: Partial<ProductRow>) => void;
}

const UNITS = ['UN', 'PC', 'CX', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'PAR', 'KIT'];

export default function GeralTab({ storeId, product, onChange }: Props) {
  const [tagsText, setTagsText] = useState('');
  const [known, setKnown] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (supabase as any)
      .from('products')
      .select('tags')
      .eq('store_id', storeId)
      .not('tags', 'is', null)
      .limit(2000)
      .then(({ data }: { data: { tags: string[] | null }[] | null }) => {
        if (!alive) return;
        const all = new Set<string>();
        (data ?? []).forEach((r) => (r.tags ?? []).forEach((t) => { if (t) all.add(t); }));
        setKnown(Array.from(all).sort((a, b) => a.localeCompare(b, 'pt-BR')));
      });
    return () => { alive = false; };
  }, [storeId]);

  const addTags = (raw: string) => {
    const next = raw.split(',').map((t) => t.trim()).filter(Boolean);
    if (next.length) onChange({ tags: Array.from(new Set([...product.tags, ...next])) });
    setTagsText('');
  };
  const removeTag = (t: string) => onChange({ tags: product.tags.filter((x) => x !== t) });
  const suggestions = known.filter((t) => !product.tags.includes(t));

  const gtinInvalid = !isValidGtin(product.gtin);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
      <div className="space-y-1.5 md:col-span-6">
        <Label htmlFor="p-name">Nome do produto *</Label>
        <Input id="p-name" value={product.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-sku">SKU (código)</Label>
        <Input id="p-sku" value={product.sku ?? ''} onChange={(e) => onChange({ sku: e.target.value.toLowerCase() })} />
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
        <Label htmlFor="p-tags">Tags</Label>
        <Input
          id="p-tags" value={tagsText} placeholder="Digite e tecle Enter (ou vírgula) para adicionar"
          onChange={(e) => setTagsText(e.target.value)}
          onBlur={() => addTags(tagsText)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTags(tagsText); } }}
        />
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {product.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[color:var(--sll-b-brand)] px-3 py-1 text-xs font-bold text-white">
                {t}
                <button type="button" onClick={() => removeTag(t)} className="cursor-pointer opacity-80 hover:opacity-100" title="Remover"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tags já usadas (clique para reaproveitar)</p>
            <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
              {suggestions.map((t) => (
                <button
                  key={t} type="button" onClick={() => onChange({ tags: [...product.tags, t] })}
                  className="cursor-pointer rounded-full bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[color:var(--sll-b-brand)] transition hover:bg-[color:color-mix(in_srgb,var(--sll-b-brand)_20%,transparent)]"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}