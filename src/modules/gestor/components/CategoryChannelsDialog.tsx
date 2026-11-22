import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Loader2, Search, ShoppingBag, Store, Wand2 } from 'lucide-react';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { createCategory } from '@/shared/products/lookups';
import { showError, showSuccess } from '@/utils/toast';
import { flattenTree, listCategories } from '../services/catalogo';
import type { Category } from '../services/catalogo';
import { CHANNEL_META } from '../services/canais';
import { ChannelCategory, autoMapChannel, channelLabel, listChannelCategories, saveCategoryMap } from '../services/categoryMap';

const NEW = '__new__';

const TYPE_OF: Record<string, 'ecommerce' | 'marketplace'> = {
  yampi: 'ecommerce', nuvemshop: 'ecommerce', shopify: 'ecommerce',
  mercadolivre: 'marketplace', tiktok: 'marketplace', amazon: 'marketplace', shopee: 'marketplace',
};
const typeOf = (c: string) => TYPE_OF[c] ?? 'ecommerce';
const TYPES = {
  ecommerce: { label: 'Plataforma de e-commerce', Icon: ShoppingBag },
  marketplace: { label: 'Marketplace', Icon: Store },
} as const;

function Badge({ c }: { c: string }) {
  const m = (CHANNEL_META as unknown as Record<string, { color: string; letter: string }>)[c];
  return (
    <span style={m ? { backgroundColor: m.color } : undefined} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white ${m ? '' : 'bg-slate-400'}`}>
      {m?.letter ?? c.charAt(0).toUpperCase()}
    </span>
  );
}

type Props = { storeId: string; onChanged: () => void; onClose: () => void };

export default function CategoryChannelsDialog({ storeId, onChanged, onClose }: Props) {
  const [rows, setRows] = useState<ChannelCategory[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [step, setStep] = useState<'type' | 'channel' | 'map'>('type');
  const [type, setType] = useState<'ecommerce' | 'marketplace'>('ecommerce');
  const [channel, setChannel] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([listChannelCategories(storeId), listCategories(storeId)]);
      setRows(r);
      setCats(c);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const channels = useMemo(() => Array.from(new Set(rows.map((r) => r.channel))), [rows]);
  const types = useMemo(() => Array.from(new Set(channels.map(typeOf))), [channels]);
  const typeChannels = useMemo(() => channels.filter((c) => typeOf(c) === type), [channels, type]);
  const tree = useMemo(() => flattenTree(cats.filter((c) => c.active)), [cats]);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.channel === channel && (!q || r.external_name.toLowerCase().includes(q)));
  }, [rows, channel, search]);
  const total = useMemo(() => rows.filter((r) => r.channel === channel), [rows, channel]);
  const pending = total.filter((r) => !r.category_id).length;

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

  const back = () => {
    if (step === 'map') { setStep('channel'); setSearch(''); }
    else if (step === 'channel') setStep('type');
  };

  const crumb = step === 'type' ? 'Escolha o tipo de canal' : step === 'channel' ? TYPES[type].label : `${TYPES[type].label} › ${channelLabel(channel)}`;

  return (
    <Modal wide title="Vincular categorias dos canais" onClose={onClose}>
      <div className="space-y-4 p-6">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum produto de canal com categoria. Importe produtos da Yampi primeiro.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {step !== 'type' && (
                <button type="button" onClick={back} className="cursor-pointer rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"><ArrowLeft size={15} /></button>
              )}
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{crumb}</span>
            </div>

            {step === 'type' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {types.map((t) => {
                  const { label, Icon } = TYPES[t];
                  return (
                    <button key={t} type="button" onClick={() => { setType(t); setStep('channel'); }} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-[color:var(--sll-b-brand)] dark:border-slate-700">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]"><Icon size={20} /></span>
                      <span className="flex-1 text-sm font-bold">{label}</span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  );
                })}
              </div>
            )}

            {step === 'channel' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {typeChannels.map((c) => (
                  <button key={c} type="button" onClick={() => { setChannel(c); setStep('map'); }} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-[color:var(--sll-b-brand)] dark:border-slate-700">
                    <Badge c={c} />
                    <span className="flex-1">
                      <span className="block text-sm font-bold">{channelLabel(c)}</span>
                      <span className="block text-[11px] text-slate-400">{rows.filter((r) => r.channel === c && !r.category_id).length} sem vínculo</span>
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {step === 'map' && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px] flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar categoria..." className={inputCls + ' pl-10'} />
                  </div>
                  <button type="button" disabled={busy !== null} onClick={() => void auto()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:border-[color:var(--sll-b-brand)] disabled:opacity-50 dark:border-slate-700">
                    {busy === 'auto' ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} className="text-[color:var(--sll-b-brand)]" />}
                    Vincular pelo nome
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  {total.length} categoria(s) em {channelLabel(channel)} · {pending > 0 ? `${pending} sem vínculo` : 'todas vinculadas'}.
                </p>

                <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full table-fixed text-left text-xs">
                    <colgroup><col className="w-[40%]" /><col className="w-14" /><col /></colgroup>
                    <thead className="sticky top-0 bg-slate-50 dark:bg-[#111524]">
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-3 py-2">Categoria na {channelLabel(channel)}</th>
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
                              {busy === r.channel + r.external_name && <Loader2 size={14} className="shrink-0 animate-spin text-[color:var(--sll-b-brand)]" />}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {list.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">Nenhuma categoria encontrada.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
        <div className="flex justify-end"><button type="button" onClick={onClose} className={primaryBtn}>Concluído</button></div>
      </div>
    </Modal>
  );
}