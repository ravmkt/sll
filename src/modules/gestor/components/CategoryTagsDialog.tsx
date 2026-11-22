import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { showError, showSuccess } from '@/utils/toast';
import type { Category } from '../services/catalogo';

const sb: any = supabase;

type Node = { cat: Category; depth: number };
type Props = {
  storeId: string;
  tree: Node[];
  tags: Record<string, string>;
  onSaved: () => void;
  onClose: () => void;
};

const norm = (s: string) => s.trim().toLowerCase();

function nextOnEnter(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const all = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-cat-tag]'));
  all[all.indexOf(e.currentTarget) + 1]?.focus();
}

export default function CategoryTagsDialog({ storeId, tree, tags, onSaved, onClose }: Props) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(tree.map(({ cat }) => [cat.id, tags[cat.id] || ''])));
  const [busy, setBusy] = useState(false);

  const changed = useMemo(
    () => tree.filter(({ cat }) => (vals[cat.id] || '').trim() !== (tags[cat.id] || '').trim()),
    [tree, vals, tags],
  );

  const dups = useMemo(() => {
    const count = new Map<string, number>();
    for (const { cat } of tree) {
      const k = norm(vals[cat.id] || '');
      if (k) count.set(k, (count.get(k) || 0) + 1);
    }
    return new Set([...count.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [tree, vals]);

  async function setTag(id: string, tag: string) {
    const { error } = await sb.rpc('gestor_category_set_tag', { p_store: storeId, p_category: id, p_tag: tag });
    if (error) throw new Error(error.message);
  }

  async function save() {
    if (dups.size) { showError('Há tags repetidas. Cada categoria precisa de uma tag diferente.'); return; }
    if (changed.length === 0) return;
    setBusy(true);
    const failed: string[] = [];
    let ok = 0;
    try {
      // Libera primeiro as tags antigas que outra categoria alterada vai ocupar (troca de tags entre categorias)
      const wanted = new Set(changed.map(({ cat }) => norm(vals[cat.id] || '')).filter(Boolean));
      for (const { cat } of changed) {
        const old = (tags[cat.id] || '').trim();
        if (old && wanted.has(norm(old))) await setTag(cat.id, '');
      }
      for (const { cat } of changed) {
        try {
          await setTag(cat.id, vals[cat.id] || '');
          ok++;
        } catch (e) {
          failed.push(`${cat.name}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      failed.push((e as Error).message);
    } finally {
      setBusy(false);
    }
    onSaved();
    if (ok) showSuccess(`${ok} tag(s) salva(s). Os clientes foram recalculados.`);
    if (failed.length) showError(failed.slice(0, 2).join(' | '));
    else onClose();
  }

  return (
    <Modal title="Vincular tags às categorias" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        <p className="text-xs text-slate-500">
          Quem comprar de uma categoria recebe a tag dela (inclusive nas categorias filhas). Pedidos cancelados viram
          "tag (cancelado)" e reembolsados "tag (reembolsado)". Deixe em branco para não gerar tag.
        </p>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto overflow-x-hidden pr-1">
          {tree.map(({ cat, depth }) => {
            const v = vals[cat.id] || '';
            const dup = !!norm(v) && dups.has(norm(v));
            const dirty = v.trim() !== (tags[cat.id] || '').trim();
            return (
              <div key={cat.id} style={{ marginLeft: depth * 20 }} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-[#111524]">
                <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${cat.active ? 'text-slate-700 dark:text-white' : 'text-slate-400 line-through'}`} title={cat.name}>
                  {cat.name}
                </span>
                <input
                  data-cat-tag
                  value={v}
                  disabled={busy}
                  onChange={(e) => setVals((p) => ({ ...p, [cat.id]: e.target.value }))}
                  onKeyDown={nextOnEnter}
                  placeholder="Sem tag"
                  className={inputCls + ' !w-56 shrink-0 !py-1.5 ' + (dup ? 'border-rose-400' : dirty ? 'border-amber-400' : '')}
                />
              </div>
            );
          })}
          {tree.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhuma categoria cadastrada.</p>}
        </div>

        {dups.size > 0 && <p className="text-xs font-semibold text-rose-500">Tags repetidas em vermelho: use uma tag diferente em cada categoria.</p>}

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">{changed.length} alteração(ões) · Enter vai para o próximo campo</span>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Cancelar</button>
            <button type="button" disabled={busy || changed.length === 0 || dups.size > 0} onClick={() => void save()} className={primaryBtn + ' disabled:opacity-50'}>
              {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}
              {busy ? 'Salvando...' : `Salvar${changed.length ? ` (${changed.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}