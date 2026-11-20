import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { flattenTree, listBrands, listCategories } from '@/modules/gestor/services/catalogo';
import type { Brand, Category } from '@/modules/gestor/services/catalogo';
import RichTextEditor from '../RichTextEditor';
import { createBrand, createCategory } from '../lookups';
import type { ProductRow } from '../types';
import { DESCRIPTION_LIMIT, Field, selectCls } from './uiHelpers';

const BUCKET = 'marketing';
const NEW = '__new__';

interface Props {
  storeId: string;
  product: ProductRow;
  onChange: (patch: Partial<ProductRow>) => void;
}

function embedUrl(url?: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function readSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const u = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(u); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('Arquivo de imagem inválido.')); };
    img.src = u;
  });
}

async function uploadImage(storeId: string, file: File): Promise<string> {
  const sb: any = supabase;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${storeId}/products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Falha no envio (${BUCKET}): ${error.message}`);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl as string;
}

export default function CatalogoTab({ storeId, product, onChange }: Props) {
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [adding, setAdding] = useState<null | 'category' | 'brand'>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlText, setUrlText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([listCategories(storeId), listBrands(storeId)]);
      setCats(c);
      setBrands(b);
    } catch (e) { setErr((e as Error).message); }
  }, [storeId]);

  useEffect(() => { void reload(); }, [reload]);

  const tree = useMemo(() => flattenTree(cats.filter((c) => c.active || c.id === product.category_id)), [cats, product.category_id]);
  const activeBrands = useMemo(() => brands.filter((b) => b.active || b.id === product.brand_id), [brands, product.brand_id]);

  async function create() {
    const name = newName.trim();
    if (!name || !adding) return;
    setBusy(true);
    try {
      if (adding === 'category') {
        const id = await createCategory(storeId, name);
        await reload();
        onChange({ category_id: id, category: name } as Partial<ProductRow>);
      } else {
        const id = await createBrand(storeId, name);
        await reload();
        onChange({ brand_id: id });
      }
      setAdding(null);
      setNewName('');
      setErr(null);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  const gallery: string[] = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];
  const setGallery = (list: string[]) => onChange({ images: list, image_url: list[0] ?? null });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setErr(null);
    const added: string[] = [];
    try {
      for (const f of Array.from(files)) {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error(`${f.name}: use JPG, PNG ou WebP.`);
        if (f.size > 5 * 1024 * 1024) throw new Error(`${f.name}: máximo de 5 MB por imagem.`);
        const { w, h } = await readSize(f);
        if (w / h > 1.02) throw new Error(`${f.name}: imagem horizontal não é aceita. Use quadrada ou retrato.`);
        added.push(await uploadImage(storeId, f));
      }
    } catch (e) { setErr((e as Error).message); }
    finally {
      if (added.length) setGallery([...gallery, ...added]);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function addUrl() {
    const u = urlText.trim();
    if (!/^https?:\/\//i.test(u)) { setErr('Informe uma URL que comece com http:// ou https://'); return; }
    setErr(null);
    setGallery([...gallery, u]);
    setUrlText('');
  }

  const makeMain = (i: number) => setGallery([gallery[i], ...gallery.filter((_, idx) => idx !== i)]);
  const removeAt = (i: number) => setGallery(gallery.filter((_, idx) => idx !== i));
  const embed = embedUrl(product.video_url);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Categoria">
          <select
            className={selectCls}
            value={product.category_id ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === NEW) { setAdding('category'); setNewName(''); return; }
              const c = cats.find((x) => x.id === v);
              onChange({ category_id: v || null, category: c?.name ?? null } as Partial<ProductRow>);
            }}
          >
            <option value={NEW}>+ Adicionar categoria</option>
            <option value="">Sem categoria</option>
            {tree.map(({ cat, depth }) => <option key={cat.id} value={cat.id}>{`${'— '.repeat(depth)}${cat.name}`}</option>)}
          </select>
        </Field>
        <Field label="Marca">
          <select
            className={selectCls}
            value={product.brand_id ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === NEW) { setAdding('brand'); setNewName(''); return; }
              onChange({ brand_id: v || null });
            }}
          >
            <option value={NEW}>+ Adicionar marca</option>
            <option value="">Sem marca</option>
            {activeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      </div>

      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#0094eb]/30 bg-[#0094eb]/5 p-3">
          <Field label={adding === 'category' ? 'Nome da nova categoria' : 'Nome da nova marca'} className="min-w-[14rem] flex-1">
            <Input
              autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create(); } }}
            />
          </Field>
          <Button type="button" onClick={() => void create()} disabled={busy || !newName.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
          </Button>
          <Button type="button" variant="outline" onClick={() => { setAdding(null); setNewName(''); }}>Cancelar</Button>
        </div>
      )}

      <Field label="Link do produto na loja">
        <Input type="url" placeholder="https://" value={product.link ?? ''} onChange={(e) => onChange({ link: e.target.value || null })} />
      </Field>

      <Field label="Descrição" hint="Aceita formatação e HTML. Use o botão de código para editar o HTML direto.">
        <RichTextEditor
          value={product.description ?? ''}
          onChange={(html) => onChange({ description: html })}
          limit={DESCRIPTION_LIMIT}
          resetKey={product.id ?? 'new'}
        />
      </Field>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Imagens</p>
            <p className="text-[11px] text-slate-400">Quadradas ou em retrato, JPG/PNG/WebP, até 5 MB. A primeira é a principal.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}Enviar imagens
          </Button>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onFiles(e.target.files)} />
        </div>

        {gallery.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">Nenhuma imagem.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {gallery.map((u, i) => (
              <div key={u + i} className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <img src={u} alt="" className="aspect-[4/5] w-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-[#0094eb] px-1.5 py-0.5 text-[10px] font-bold text-white">Principal</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 opacity-0 transition group-hover:opacity-100">
                  <button type="button" title="Tornar principal" onClick={() => makeMain(i)} className="cursor-pointer p-1 text-white"><Star size={14} /></button>
                  <button type="button" title="Remover" onClick={() => removeAt(i)} className="cursor-pointer p-1 text-white"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input placeholder="Ou cole a URL de uma imagem" value={urlText} onChange={(e) => setUrlText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} />
          <Button type="button" variant="outline" onClick={addUrl}>Adicionar</Button>
        </div>
      </div>

      <Field label="Vídeo do produto (YouTube ou Vimeo)">
        <Input type="url" placeholder="https://www.youtube.com/watch?v=..." value={product.video_url ?? ''} onChange={(e) => onChange({ video_url: e.target.value || null })} />
        {product.video_url && !embed && <p className="mt-1 text-xs text-slate-400">Link salvo, mas sem pré-visualização (só YouTube e Vimeo).</p>}
      </Field>
      {embed && (
        <div className="aspect-video w-full max-w-md overflow-hidden rounded-md border">
          <iframe src={embed} title="Pré-visualização do vídeo" className="h-full w-full" allowFullScreen />
        </div>
      )}

      <Field label="Observações internas" hint="Visível só para a equipe, não aparece na loja.">
        <Textarea rows={4} value={product.notes ?? ''} onChange={(e) => onChange({ notes: e.target.value || null })} />
      </Field>

      {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}