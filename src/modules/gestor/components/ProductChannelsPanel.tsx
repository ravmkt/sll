import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { CHANNEL_META, listActiveChannels } from '../services/canais';
import type { ChannelKey } from '../services/canais';
import { listChannelLinks, setChannelLink } from '../services/vinculos';
import ChannelFavicon, { normChannel } from './ChannelFavicon';

type Props = { storeId: string; productId: string; onChanged?: () => void };

export default function ProductChannelsPanel({ storeId, productId, onChanged }: Props) {
  const [linked, setLinked] = useState<Map<ChannelKey, boolean>>(new Map());
  const [active, setActive] = useState<ChannelKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ChannelKey | null>(null);

  const load = useCallback(async () => {
    try {
      const [links, act] = await Promise.all([listChannelLinks(storeId), listActiveChannels(storeId)]);
      const m = new Map<ChannelKey, boolean>();
      for (const l of links) {
        if (l.product_id !== productId) continue;
        const k = normChannel(l.channel);
        if (k) m.set(k, l.published);
      }
      setLinked(m);
      setActive(act);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [storeId, productId]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (ch: ChannelKey) => {
    const on = linked.has(ch);
    setBusy(ch);
    try {
      await setChannelLink(storeId, [productId], ch, !on);
      showSuccess(on ? `Removido de ${CHANNEL_META[ch].label}.` : `Vinculado a ${CHANNEL_META[ch].label}.`);
      await load();
      onChanged?.();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Escolha em quais canais este produto é vendido e divulgado. A alteração vale na hora, sem precisar salvar o produto.
      </p>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {(Object.keys(CHANNEL_META) as ChannelKey[]).map((ch) => {
          const on = linked.has(ch);
          const pending = on && linked.get(ch) === false;
          const enabled = active.includes(ch) || on;
          return (
            <li key={ch} className="flex items-center gap-3 px-4 py-3">
              <ChannelFavicon channel={ch} size={24} pending={pending} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold', !enabled && 'text-slate-400')}>{CHANNEL_META[ch].label}</p>
                <p className="text-[11px] text-slate-400">
                  {!enabled ? 'Canal inativo. Ative em Estoque › Canais e depósitos.' : pending ? 'Vinculado, aguardando publicação no canal.' : on ? 'Vendido neste canal.' : 'Não vendido neste canal.'}
                </p>
              </div>
              {busy === ch && <Loader2 size={15} className="animate-spin text-[color:var(--sll-b-brand)]" />}
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={!enabled || busy !== null}
                onClick={() => void toggle(ch)}
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className={cn('relative block h-5 w-9 rounded-full transition-colors', on ? 'bg-emerald-500' : 'bg-slate-300')}>
                  <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}