import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { showError, showSuccess } from '@/utils/toast';
import { flattenTree, listCategories } from '../services/catalogo';
import type { Category } from '../services/catalogo';
import { channelLabel, listChannelCategories, saveCategory, saveCategoryMap } from '../services/categoryMap';
import type { ChannelCategory } from '../services/categoryMap';

type Props = { storeId: string; onCreated: () => void; onClose: () => void };

export default function CreateCategoryModal({ storeId, onCreated, onClose }: Props) {
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [channel, setChannel] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<ChannelCategory[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([listChannelCategories(storeId), listCategories(storeId)])
      .then(([r, c]) => {
        setRows(r);
        setCats(c);
        setChannel(r[0]?.channel || '');
      })
      .catch((e) => showError((e as Error).message))
      .finally(() => setLoading(false));
  }, [storeId]);

  const channels = useMemo(() => Array.from(new Set(rows.map((r) => r.channel))), [rows]);
  const pending = useMemo(() => rows.filter((r) => r.channel === channel && !r.category_id), [rows, channel]);
  const tree = useMemo(() => flattenTree(cats.filter((c) => c.active)), [cats]);

  const toggle = (ext: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(ext)) n.delete(ext); else n.add(ext);
    return n;
  });

  async function submit() {
    const nm = name.trim();
    if (!nm) { showError('Informe o nome da categoria.'); return; }
    setBusy(true);
    let id: string | null = null;
    try {
      id = await saveCategory(storeId, nm, parent || null);
      let products = 0;
      for (const ext of picked) products += await saveCategoryMap(storeId, channel, ext, id);
      showSuccess(picked.size
        ? `Categoria criada e vinculada. ${products} produto(s) atualizado(s).`
        : 'Categoria criada.');
      onCreated();
      onClose();
    } catch (e) {
      showError(id ? `Categoria criada, mas o vínculo falhou: ${(e as Error).message}` : (e as Error).message);
      if (id) onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Criar categoria" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Nome</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Camisetas" className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Categoria pai (opcional)</label>
          <select value={parent} onChange={(e) => setParent(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="">Nenhuma (categoria principal)</option>
            {tree.map(({ cat, depth }) => <option key={cat.id} value={cat.id}>{`${'— '.repeat(depth)}${cat.name}`}</option>)}
          </select>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Vincular a um canal de vendas</label>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
          ) : channels.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum canal com categorias. Importe produtos da Yampi para vincular.</p>
          ) : (
            <div className="space-y-3">
              <select value={channel} onChange={(e) => { setChannel(e.target.value); setPicked(new Set()); }} className={inputCls + ' cursor-pointer'}>
                {channels.map((c) => <option key={c} value={c}>{channelLabel(c)}</option>)}
              </select>
              {pending.length === 0 ? (
                <p className="text-sm text-slate-400">Todas as categorias de {channelLabel(channel)} já estão vinculadas.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  {pending.map((r) => (
                    <label key={r.external_name} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                      <input type="checkbox" checked={picked.has(r.external_name)} onChange={() => toggle(r.external_name)} className="h-4 w-4 cursor-pointer" />
                      <span className="min-w-0 flex-1 truncate font-semibold">{r.external_name}</span>
                      <span className="font-mono text-xs text-slate-400">{r.products} prod.</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-400">Marque as categorias do canal que entram nesta categoria. Os produtos atuais e os próximos importados já vão para ela.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancelar</button>
          <button type="button" disabled={busy || !name.trim()} onClick={() => void submit()} className={primaryBtn + ' disabled:opacity-50'}>
            {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}
            {picked.size ? 'Criar e vincular' : 'Criar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}