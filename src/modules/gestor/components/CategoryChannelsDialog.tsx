import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { createCategory } from '@/shared/products/lookups';
import { showError, showSuccess } from '@/utils/toast';
import { flattenTree, listCategories } from '../services/catalogo';
import type { Category } from '../services/catalogo';
import { ChannelCategory, autoMapChannel, channelLabel, listChannelCategories, saveCategoryMap } from '../services/categoryMap';

const NEW = '__new__';

type Props = { storeId: string; onChanged: () => void; onClose: () => void };

export default function CategoryChannelsDialog({ storeId, onChanged, onClose }: Props) {
  const [rows, setRows] = useState<ChannelCategory[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([listChannelCategories(storeId), listCategories(storeId)]);
      setRows(r);
      setCats(c);
      setChannel((cur) => cur || r[0]?.channel || '');
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const channels = useMemo(() => Array.from(new Set(rows.map((r) => r.channel))), [rows]);
  const list = useMemo(() => rows.filter((r) => r.channel === channel), [rows, channel]);
  const tree = useMemo(() => flattenTree(cats.filter((c) => c.active)), [cats]);
  const pending = list.filter((r) => !r.category_id).length;

  const refresh = async () => { await load(); onChanged(); };

  async function choose(r: ChannelCategory, value: string) {
    const key = r.channel + r.external_name;
    setBusy(key);
    try {
      let id: string | null = value || null;
      if (value === NEW) id = await createCategory(storeId, r.external_name);
      const n = await saveCategoryMap(storeId, r.channel, r.external_name, id);
      showSuccess(id ? `Vinculada. ${n} produto(s) atualizado(s).` : 'Vínculo removido.');
      await refresh();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function auto() {
    setBusy('auto');
    try {
      const n = await autoMapChannel(storeId, channel);
      showSuccess(n ? `${n} categoria(s) vinculada(s) pelo nome.` : 'Nada novo para vincular pelo nome.');
      await refresh();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title="Vincular categorias dos canais" onClose={onClose}>
      <div className="space-y-4 p-6">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#0094eb]" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum produto de canal com categoria. Importe produtos da Yampi primeiro.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {channels.map((c) => (
                <button
                  key={c} type="button" onClick={() => setChannel(c)}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold ${c === channel ? 'border-[#0094eb] bg-[#0094eb]/10 text-[#0094eb]' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  {channelLabel(c)}
                </button>
              ))}
              <button type="button" disabled={busy !== null} onClick={() => void auto()} className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-[#0094eb] disabled:opacity-50 dark:border-slate-700">
                {busy === 'auto' ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} className="text-[#0094eb]" />}
                Vincular pelo nome
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {list.length} categoria(s) em {channelLabel(channel)} · {pending > 0 ? `${pending} sem vínculo` : 'todas vinculadas'}. Ao escolher, os produtos atuais e os próximos importados já entram na categoria do Gestor.
            </p>

            <div className="max-h-[55vh] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full table-fixed text-left text-xs">
                <colgroup><col className="w-[34%]" /><col className="w-14" /><col /></colgroup>
                <thead className="sticky top-0 bg-slate-50 dark:bg-[#111524]">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Categoria no canal</th>
                    <th className="px-2 py-2 text-center">Prod.</th>
                    <th className="px-3 py-2">Categoria no Gestor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {list.map((r) => (
                    <tr key={r.channel + r.external_name} className="align-middle">
                      <td className="break-words px-3 py-2 font-semibold">{r.external_name}</td>
                      <td className="px-2 py-2 text-center font-mono">{r.products}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={r.category_id ?? ''}
                            disabled={busy !== null}
                            onChange={(e) => void choose(r, e.target.value)}
                            className={inputCls + ' !py-1.5 !text-xs cursor-pointer ' + (r.category_id ? '' : 'border-amber-400')}
                          >
                            <option value="">Sem vínculo</option>
                            <option value={NEW}>+ Criar "{r.external_name}" no Gestor</option>
                            {tree.map(({ cat, depth }) => <option key={cat.id} value={cat.id}>{`${'— '.repeat(depth)}${cat.name}`}</option>)}
                          </select>
                          {busy === r.channel + r.external_name && <Loader2 size={14} className="shrink-0 animate-spin text-[#0094eb]" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="flex justify-end"><button type="button" onClick={onClose} className={primaryBtn}>Concluído</button></div>
      </div>
    </Modal>
  );
}