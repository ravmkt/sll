import { useCallback, useEffect, useState } from 'react';
import { Check, Edit3, Loader2, Plus } from 'lucide-react';
import { listBrands, saveBrand, type Brand } from '@/modules/gestor/services/catalogo';
import { showError } from '@/utils/toast';
import { Modal, errMsg, inputCls, primaryBtn } from './Modal';

type Props = { storeId: string; onChanged?: () => Promise<void> | void; onClose: () => void };

export default function BrandsModal({ storeId, onChanged, onClose }: Props) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    try { setBrands(await listBrands(storeId)); }
    catch (e) { showError(errMsg(e)); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); await load(); await onChanged?.(); }
    catch (e) { showError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const add = () => {
    if (!newName.trim()) return;
    void run(async () => { await saveBrand(storeId, null, newName.trim(), true); setNewName(''); });
  };
  const rename = (b: Brand) => {
    if (!editName.trim()) return;
    void run(async () => { await saveBrand(storeId, b.id, editName.trim(), b.active); setEditId(null); });
  };
  const toggle = (b: Brand) => void run(() => saveBrand(storeId, b.id, b.name, !b.active));

  return (
    <Modal title="Marcas" onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nova marca..." className={inputCls} />
          <button type="button" onClick={add} disabled={busy} className={primaryBtn}><Plus size={16} /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-[#111524]">
                {editId === b.id ? (
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') rename(b); if (e.key === 'Escape') setEditId(null); }} className={inputCls + ' !py-1.5'} />
                ) : (
                  <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${b.active ? 'text-slate-700 dark:text-white' : 'text-slate-400 line-through'}`}>
                    {b.name} <span className="text-[11px] font-normal text-slate-400">({b.products})</span>
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  {editId === b.id ? (
                    <button type="button" onClick={() => rename(b)} disabled={busy} className="cursor-pointer rounded-lg p-1.5 text-[color:var(--sll-b-brand)] hover:bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)]"><Check size={15} /></button>
                  ) : (
                    <button type="button" onClick={() => { setEditId(b.id); setEditName(b.name); }} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Edit3 size={15} /></button>
                  )}
                  <button type="button" disabled={busy} onClick={() => toggle(b)} className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase ${b.active ? 'border-[color:color-mix(in_srgb,var(--sll-b-brand)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)] text-[color:var(--sll-b-brand)]' : 'border-rose-200 bg-rose-50 text-rose-600'}`}>
                    {b.active ? 'Ativa' : 'Inativa'}
                  </button>
                </div>
              </div>
            ))}
            {brands.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Nenhuma marca cadastrada.</p>}
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className={primaryBtn}>Concluído</button>
        </div>
      </div>
    </Modal>
  );
}