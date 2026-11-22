import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Edit3, Link2, Loader2, Plus, Tag, Tags } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { showError } from '@/utils/toast';
import { inputCls } from '@/components/products/Modal';
import { flattenTree, listCategories } from '../services/catalogo';
import type { Category } from '../services/catalogo';
import CategoryChannelsDialog from './CategoryChannelsDialog';
import CategoryTagsDialog from './CategoryTagsDialog';
import CategoryTagPicker from './CategoryTagPicker';
import CreateCategoryModal from './CreateCategoryModal';

const sb: any = supabase;
const parentOf = (c: Category) => ((c as any).parent_id ?? (c as any).parent ?? null) as string | null;

export default function CategoriesPanel({ canEdit }: { canEdit: boolean }) {
  const { storeId, loading: lojaLoading } = useLoja();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tags, setTags] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      setCats(await listCategories(storeId));
      const { data } = await sb.from('product_categories').select('id, customer_tag, customer_tags').eq('store_id', storeId);
      setTags(Object.fromEntries(((data || []) as any[]).map((r) => {
        const list: string[] = r.customer_tags?.length ? r.customer_tags : r.customer_tag ? [r.customer_tag] : [];
        return [r.id, list];
      })));
    }
    catch (e) { showError((e as Error).message); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) void load(); }, [lojaLoading, load]);

  const tree = useMemo(() => flattenTree(cats), [cats]);
  const withTag = useMemo(() => tree.filter(({ cat }) => (tags[cat.id] || []).length > 0).length, [tree, tags]);
  const allTags = useMemo(() => {
    const m = new Map<string, string>();
    Object.values(tags).flat().forEach((t) => { if (!m.has(t.toLowerCase())) m.set(t.toLowerCase(), t); });
    return Array.from(m.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [tags]);

  const setCatTags = async (id: string, list: string[]) => {
    if (!storeId) return;
    const prev = tags[id] ?? [];
    setTags((p) => ({ ...p, [id]: list }));
    const { error } = await sb.rpc('gestor_category_set_tags', { p_store: storeId, p_category: id, p_tags: list });
    if (error) { setTags((p) => ({ ...p, [id]: prev })); showError(error.message); }
  };

  const save = async (id: string | null, n: string, p: string | null, active: boolean) => {
    if (!storeId) return;
    setBusy(true);
    try {
      const { error } = await sb.rpc('gestor_category_save', { p_store: storeId, p_name: n.trim(), p_id: id, p_parent: p, p_active: active });
      if (error) throw new Error(error.message);
      await load();
      return true;
    } catch (e) { showError((e as Error).message); return false; }
    finally { setBusy(false); }
  };

  const rename = async (c: Category) => {
    if (!editName.trim()) return;
    if (await save(c.id, editName, parentOf(c), c.active)) setEditId(null);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1a1f2c]">
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[color:var(--sll-b-brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--sll-b-brand-hover)]">
            <Plus size={16} /> Criar categoria
          </button>
          <button type="button" onClick={() => setLinkOpen(true)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:border-[color:var(--sll-b-brand)] dark:border-slate-700">
            <Link2 size={16} className="text-[color:var(--sll-b-brand)]" /> Vincular canais
          </button>
          <button type="button" onClick={() => setTagsOpen(true)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:border-[color:var(--sll-b-brand)] dark:border-slate-700">
            <Tags size={16} className="text-[color:var(--sll-b-brand)]" /> Vincular tags
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{withTag}/{tree.length}</span>
          </button>
        </div>
      )}

      {loading || lojaLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
      ) : tree.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {tree.map(({ cat, depth }) => (
            <div key={cat.id} style={{ marginLeft: depth * 24 }} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-[#111524]">
              <Tag size={14} className="shrink-0 text-[color:var(--sll-b-brand)]" />
              {editId === cat.id ? (
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void rename(cat); if (e.key === 'Escape') setEditId(null); }} className={inputCls + ' !py-1.5'} />
              ) : (
                <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${cat.active ? 'text-slate-700 dark:text-white' : 'text-slate-400 line-through'}`}>
                  {cat.name}
                  {typeof (cat as any).products === 'number' && <span className="ml-1 text-[11px] font-normal text-slate-400">({(cat as any).products})</span>}
                </span>
              )}

              {editId !== cat.id && (
                <CategoryTagPicker
                  value={tags[cat.id] || []}
                  allTags={allTags}
                  disabled={!canEdit}
                  onChange={(list) => void setCatTags(cat.id, list)}
                />
              )}

              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  {editId === cat.id ? (
                    <button type="button" disabled={busy} onClick={() => void rename(cat)} title="Salvar nome" className="cursor-pointer rounded-lg p-1.5 text-[color:var(--sll-b-brand)] hover:bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)]"><Check size={15} /></button>
                  ) : (
                    <button type="button" onClick={() => { setEditId(cat.id); setEditName(cat.name); }} title="Renomear" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Edit3 size={15} /></button>
                  )}
                  <button type="button" disabled={busy} onClick={() => void save(cat.id, cat.name, parentOf(cat), !cat.active)} className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase ${cat.active ? 'border-[color:color-mix(in_srgb,var(--sll-b-brand)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)] text-[color:var(--sll-b-brand)]' : 'border-rose-200 bg-rose-50 text-rose-600'}`}>
                    {cat.active ? 'Ativa' : 'Inativa'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {createOpen && storeId && (
        <CreateCategoryModal storeId={storeId} onCreated={() => void load()} onClose={() => setCreateOpen(false)} />
      )}
      {linkOpen && storeId && (
        <CategoryChannelsDialog storeId={storeId} onChanged={() => void load()} onClose={() => setLinkOpen(false)} />
      )}
      {tagsOpen && storeId && (
        <CategoryTagsDialog storeId={storeId} tree={tree} tags={tags} allTags={allTags} onSaved={() => void load()} onClose={() => setTagsOpen(false)} />
      )}
    </div>
  );
}