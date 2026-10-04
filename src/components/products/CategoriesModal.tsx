import { useState } from 'react';
import { Check, Edit3, Plus, Trash2 } from 'lucide-react';
import { CatalogCategory, addCategory, deleteCategory, renameCategory } from '@/services/productsService';
import { showError } from '@/utils/toast';
import { Modal, errMsg, inputCls, primaryBtn } from './Modal';

type Props = {
  storeId: string;
  categories: CatalogCategory[];
  onChanged: () => Promise<void> | void;
  onClose: () => void;
};

export default function CategoriesModal({ storeId, categories, onChanged, onClose }: Props) {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); await onChanged(); } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const add = () => {
    if (!newName.trim()) return;
    run(async () => { await addCategory(storeId, newName); setNewName(''); });
  };
  const save = (c: CatalogCategory) => {
    if (!editName.trim()) return;
    run(async () => { await renameCategory(storeId, c.id, c.name, editName); setEditId(null); });
  };
  const remove = (c: CatalogCategory) => {
    if (!window.confirm(`Excluir a categoria "${c.name}"? Os produtos continuam com o nome dela.`)) return;
    run(() => deleteCategory(storeId, c.id));
  };

  return (
    <Modal title="Categorias" onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nova categoria..." className={inputCls} />
          <button type="button" onClick={add} disabled={busy} className={primaryBtn}><Plus size={16} /></button>
        </div>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#111524] px-4 py-2.5">
              {editId === c.id ? (
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(c); if (e.key === 'Escape') setEditId(null); }} className={inputCls + ' !py-1.5 mr-2'} />
              ) : (
                <span className="text-sm font-semibold text-slate-700 dark:text-white">{c.name}</span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {editId === c.id ? (
                  <button type="button" onClick={() => save(c)} disabled={busy} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"><Check size={15} /></button>
                ) : (
                  <button type="button" onClick={() => { setEditId(c.id); setEditName(c.name); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><Edit3 size={15} /></button>
                )}
                <button type="button" onClick={() => remove(c)} disabled={busy} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Nenhuma categoria cadastrada.</p>}
        </div>
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className={primaryBtn}>Concluído</button>
        </div>
      </div>
    </Modal>
  );
}