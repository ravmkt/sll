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

function parseTags(s: string): string[] {
  const out: string[] = [];
  for (const raw of s.split(/[,;]/)) {
    const t = raw.trim();
    if (t && !out.some((o) => norm(o) === norm(t))) out.push(t);
  }
  return out;
}

const keyOf = (s: string) => parseTags(s).map(norm).sort().join('|');

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
    () => tree.filter(({ cat }) => keyOf(vals[cat.id] || '') !== keyOf(tags[cat.id] || '')),
    [tree, vals, tags],
  );

  async function setTags(id: string, list: string[]) {
    const { data, error } = await sb
      .from('product_categories')
      .update({ customer_tags: list })
      .eq('id', id)
      .eq('store_id', storeId)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('Categoria não encontrada ou sem permissão.');
  }

  async function save() {
    if (changed.length === 0) return;
    setBusy(true);
    const failed: string[] = [];
    let ok = 0;
    try {
      for (const { cat } of changed) {
        try {
          await setTags(cat.id, parseTags(vals[cat.id] || ''));
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
    if (ok) showSuccess(`${ok} categoria(s) atualizada(s). Os clientes foram recalculados.`);
    if (failed.length) showError(failed.slice(0, 2).join(' | '));
    else onClose();
  }

  return (
    <Modal title="Vincular tags às categorias" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        <p className="text-xs text-slate-500">
          Quem comprar de uma categoria recebe as tags dela (inclusive nas categorias filhas). Pedidos cancelados viram
          "tag (cancelado)" e reembolsados "tag (reembolsado)". Deixe em branco para não gerar tag.
        </p>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto overflow-x-hidden pr-1">
          {tree.map(({ cat, depth }) => {
            const v = vals[cat.id] || '';
            const dirty = keyOf(v) !== keyOf(tags[cat.id] || '');
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
                  placeholder="Ex.: Comfort, Verão"
                  className={inputCls + ' !w-72 shrink-0 !py-1.5 ' + (dirty ? 'border-amber-400' : '')}
                />
              </div>
            );
          })}
          {tree.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhuma categoria cadastrada.</p>}
        </div>

        <p className="text-xs text-slate-400">Separe várias tags com vírgula. A mesma tag pode ser usada em várias categorias.</p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">{changed.length} alteração(ões) · Enter vai para o próximo campo</span>
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