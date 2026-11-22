import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { showError, showSuccess } from '@/utils/toast';
import type { Category } from '../services/catalogo';
import CategoryTagPicker from './CategoryTagPicker';

const sb: any = supabase;

type Node = { cat: Category; depth: number };
type Props = {
  storeId: string;
  tree: Node[];
  tags: Record<string, string[]>;
  allTags: string[];
  onSaved: () => void;
  onClose: () => void;
};

const norm = (s: string) => s.trim().toLowerCase();
const keyOf = (l: string[]) => l.map(norm).sort().join('|');

export default function CategoryTagsDialog({ storeId, tree, tags, allTags, onSaved, onClose }: Props) {
  const [vals, setVals] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(tree.map(({ cat }) => [cat.id, tags[cat.id] || []])));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const changed = useMemo(
    () => tree.filter(({ cat }) => keyOf(vals[cat.id] || []) !== keyOf(tags[cat.id] || [])),
    [tree, vals, tags],
  );

  const pool = useMemo(() => {
    const m = new Map<string, string>();
    [...allTags, ...Object.values(vals).flat()].forEach((t) => { if (!m.has(norm(t))) m.set(norm(t), t); });
    return Array.from(m.values());
  }, [allTags, vals]);

  const q = norm(search);
  const shown = q ? tree.filter(({ cat }) => norm(cat.name).includes(q)) : tree;

  async function save() {
    if (changed.length === 0) return;
    setBusy(true);
    const failed: string[] = [];
    let ok = 0;
    for (const { cat } of changed) {
      const { error } = await sb.rpc('gestor_category_set_tags', { p_store: storeId, p_category: cat.id, p_tags: vals[cat.id] || [] });
      if (error) failed.push(`${cat.name}: ${error.message}`); else ok++;
    }
    setBusy(false);
    onSaved();
    if (ok) showSuccess(`${ok} categoria(s) atualizada(s).`);
    if (failed.length) showError(failed.slice(0, 2).join(' | '));
    else onClose();
  }

  return (
    <Modal wide title="Vincular tags às categorias" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar categoria..." className={inputCls + ' pl-10'} />
        </div>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto overflow-x-hidden pr-1">
          {shown.map(({ cat, depth }) => {
            const dirty = keyOf(vals[cat.id] || []) !== keyOf(tags[cat.id] || []);
            return (
              <div key={cat.id} style={{ marginLeft: q ? 0 : depth * 20 }} className={`flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-2.5 dark:bg-[#111524] ${dirty ? 'border-amber-400' : 'border-slate-100 dark:border-slate-800'}`}>
                <span className={`min-w-0 flex-1 break-words text-sm font-semibold ${cat.active ? 'text-slate-700 dark:text-white' : 'text-slate-400 line-through'}`}>
                  {cat.name}
                </span>
                <CategoryTagPicker
                  value={vals[cat.id] || []}
                  allTags={pool}
                  disabled={busy}
                  onChange={(l) => setVals((p) => ({ ...p, [cat.id]: l }))}
                />
              </div>
            );
          })}
          {shown.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhuma categoria encontrada.</p>}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">{changed.length} alteração(ões)</span>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Cancelar</button>
            <button type="button" disabled={busy || changed.length === 0} onClick={() => void save()} className={primaryBtn + ' disabled:opacity-50'}>
              {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}
              {busy ? 'Salvando...' : `Salvar${changed.length ? ` (${changed.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}