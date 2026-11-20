import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProductRow } from '../types';
import { numStr, selectClass, toNum } from './fieldUtils';

interface Props {
  storeId: string;
  product: ProductRow;
  onChange: (patch: Partial<ProductRow>) => void;
}

interface Cat { id: string; name: string; parent_id: string | null; active: boolean | null }
interface Brand { id: string; name: string; active: boolean | null }

const BUCKET = 'store-assets';
const MAX_MB = 5;
const MAX_IMAGES = 9;

export default function CatalogoTab({ storeId, product, onChange }: Props) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from('product_categories').select('id,name,parent_id,active').eq('store_id', storeId).order('name'),
      supabase.from('brands').select('id,name,active').eq('store_id', storeId).order('name'),
    ]).then(([c, b]) => {
      if (!alive) return;
      setCats((c.data ?? []) as Cat[]);
      setBrands((b.data ?? []) as Brand[]);
    });
    return () => { alive = false; };
  }, [storeId]);

  const catOptions = useMemo(() => {
    const byId = new Map(cats.map((c) => [c.id, c]));
    const label = (c: Cat): string => {
      const parts = [c.name];
      let p = c.parent_id ? byId.get(c.parent_id) : undefined;
      for (let i = 0; p && i < 6; i++) { parts.unshift(p.name); p = p.parent_id ? byId.get(p.parent_id) : undefined; }
      return parts.join(' › ');
    };
    return cats
      .filter((c) => c.active !== false || c.id === product.category_id)
      .map((c) => ({ id: c.id, name: c.name, label: label(c) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [cats, product.category_id]);

  const brandOptions = useMemo(
    () => brands.filter((b) => b.active !== false || b.id === product.brand_id),
    [brands, product.brand_id],
  );

  const gallery = useMemo(() => {
    const all = [product.image_url, ...(product.images ?? [])].filter((u): u is string => !!u);
    return Array.from(new Set(all));
  }, [product.image_url, product.images]);

  const commit = (list: string[]) => onChange({ image_url: list[0] ?? null, images: list.slice(1) });

  const pickCategory = (id: string) => {
    const opt = catOptions.find((c) => c.id === id);
    onChange({ category_id: id || null, category: opt?.name ?? null } as Partial<ProductRow>);
  };

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX_IMAGES - gallery.length;
    if (room <= 0) { setError(`Limite de ${MAX_IMAGES} imagens.`); return; }
    setUploading(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith('image/')) { setError('Envie apenas imagens.'); continue; }
        if (file.size > MAX_MB * 1024 * 1024) { setError(`Cada imagem deve ter até ${MAX_MB} MB.`); continue; }
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `${storeId}/products/${crypto.randomUUID()}.${ext || 'jpg'}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) { setError(upErr.message); continue; }
        added.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      }
      if (added.length) commit([...gallery, ...added]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const active = product.active ?? true;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
      <div className="space-y-1.5 md:col-span-3">
        <Label htmlFor="p-cat">Categoria</Label>
        <select id="p-cat" className={selectClass} value={product.category_id ?? ''} onChange={(e) => pickCategory(e.target.value)}>
          <option value="">Sem categoria</option>
          {catOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="space-y-1.5 md:col-span-3">
        <Label htmlFor="p-brand">Marca</Label>
        <select id="p-brand" className={selectClass} value={product.brand_id ?? ''} onChange={(e) => onChange({ brand_id: e.target.value || null })}>
          <option value="">Sem marca</option>
          {brandOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-price">Preço de venda (R$)</Label>
        <Input id="p-price" inputMode="decimal" value={numStr(product.price)} onChange={(e) => onChange({ price: toNum(e.target.value) })} />
      </div>

      <div className="space-y-1.5 md:col-span-4">
        <Label htmlFor="p-link">Link do produto na loja</Label>
        <Input id="p-link" type="url" placeholder="https://" value={product.link ?? ''} onChange={(e) => onChange({ link: e.target.value || null })} />
      </div>

      <div className="space-y-1.5 md:col-span-6">
        <Label htmlFor="p-desc">Descrição</Label>
        <Textarea id="p-desc" rows={4} value={product.description ?? ''} onChange={(e) => onChange({ description: e.target.value || null })} />
      </div>

      <div className="space-y-2 md:col-span-6">
        <Label>Imagens ({gallery.length}/{MAX_IMAGES})</Label>
        <div className="flex flex-wrap gap-3">
          {gallery.map((url, i) => (
            <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-lg border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-[#0094eb] px-1.5 text-[10px] font-bold text-white">Principal</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/60 py-1 opacity-0 transition group-hover:opacity-100">
                {i > 0 && (
                  <button type="button" title="Tornar principal" className="cursor-pointer text-white" onClick={() => commit([url, ...gallery.filter((u) => u !== url)])}>
                    <Star size={14} />
                  </button>
                )}
                <button type="button" title="Remover" className="cursor-pointer text-white" onClick={() => commit(gallery.filter((u) => u !== url))}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {gallery.length < MAX_IMAGES && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-[#0094eb] hover:text-[#0094eb] disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              {uploading ? 'Enviando' : 'Adicionar'}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
        <p className="text-[11px] text-muted-foreground">A primeira imagem é a principal. Até {MAX_MB} MB cada. As imagens só ficam salvas no produto ao clicar em Salvar.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm md:col-span-6">
        <input type="checkbox" checked={active} onChange={(e) => onChange({ active: e.target.checked })} />
        Produto ativo
      </label>
    </div>
  );
}