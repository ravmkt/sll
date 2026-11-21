import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Pencil, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { listWarehouses, saveWarehouse } from '@/shared/products/lookups';
import type { Warehouse } from '@/shared/products/lookups';
import { useGestorAccess } from '../hooks/useGestorAccess';
import { CHANNEL_META, listChannelRules, saveChannelRule } from '../services/estoqueCanais';
import type { ChannelRule } from '../services/estoqueCanais';

type Draft = { active: boolean; ceiling: string; reserve: string; all: boolean; whs: string[] };
const toDraft = (r: ChannelRule): Draft => ({
  active: r.active,
  ceiling: r.ceiling == null ? '' : String(r.ceiling),
  reserve: String(r.reserve),
  all: r.warehouse_ids == null,
  whs: r.warehouse_ids ?? [],
});
const digits = (s: string) => s.replace(/\D/g, '');

function RuleCard({ storeId, rule, warehouses, sample, canEdit, onSaved }: {
  storeId: string; rule: ChannelRule; warehouses: Warehouse[]; sample: number; canEdit: boolean; onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(rule));
  const [busy, setBusy] = useState(false);
  const meta = CHANNEL_META[rule.channel] ?? { label: rule.channel, short: rule.channel };

  const reserveN = d.reserve === '' ? 0 : Number(d.reserve);
  const ceilN = d.ceiling === '' ? null : Number(d.ceiling);
  const base = Math.max(0, sample - reserveN);
  const shown = ceilN == null ? base : Math.min(ceilN, base);
  const limited = ceilN != null && base > ceilN;

  const toggleWh = (id: string) =>
    setD((p) => ({ ...p, whs: p.whs.includes(id) ? p.whs.filter((x) => x !== id) : [...p.whs, id] }));

  const save = async () => {
    if (ceilN !== null && (!Number.isInteger(ceilN) || ceilN < 1)) { showError('O teto deve ser 1 ou mais. Deixe vazio para sem limite.'); return; }
    if (!d.all && d.whs.length === 0) { showError('Escolha ao menos um depósito para este canal.'); return; }
    setBusy(true);
    try {
      await saveChannelRule(storeId, {
        channel: rule.channel, ceiling: ceilN, reserve: reserveN, active: d.active,
        warehouse_ids: d.all ? null : d.whs,
      });
      showSuccess(`${meta.label} salvo.`);
      onSaved();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">{meta.label}</p>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
          <input type="checkbox" disabled={!canEdit} checked={d.active} onChange={(e) => setD((p) => ({ ...p, active: e.target.checked }))} className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" />
          Canal ativo
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Teto de exibição (opcional)
          <input inputMode="numeric" disabled={!canEdit} value={d.ceiling} placeholder="Sem limite" onChange={(e) => setD((p) => ({ ...p, ceiling: digits(e.target.value) }))} className={cn(inputCls, 'mt-1 font-normal')} />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">Máximo que este canal mostra, mesmo com mais saldo. Não é uma cota: se o saldo cair abaixo do teto, o canal mostra o saldo.</span>
        </label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Reserva de segurança
          <input inputMode="numeric" disabled={!canEdit} value={d.reserve} onChange={(e) => setD((p) => ({ ...p, reserve: digits(e.target.value) }))} className={cn(inputCls, 'mt-1 font-normal')} />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">Unidades guardadas e não oferecidas neste canal, para evitar venda dupla. Sugerido: 1. A loja física (PDV) ainda vende até o último item.</span>
        </label>
      </div>

      {d.active && reserveN === 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p>Com reserva 0, duas vendas ao mesmo tempo no último item, ou um atraso de sincronização, podem gerar venda sem estoque.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Depósitos que alimentam este canal</p>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input type="checkbox" disabled={!canEdit} checked={d.all} onChange={(e) => setD((p) => ({ ...p, all: e.target.checked }))} className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" />
          Todos os depósitos ativos (inclui os que você criar depois)
        </label>
        {!d.all && (
          <div className="flex flex-wrap gap-3 pl-6">
            {warehouses.map((w) => (
              <label key={w.id} className="flex cursor-pointer items-center gap-1.5 text-xs">
                <input type="checkbox" disabled={!canEdit} checked={d.whs.includes(w.id)} onChange={() => toggleWh(w.id)} className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" />
                {w.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-[#111524]">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Prévia: com <strong>{sample}</strong> un. no saldo físico, este canal exibe <strong>{shown}</strong>{limited ? ' (limitado pelo teto)' : ''}.
        </p>
        {canEdit && (
          <button type="button" disabled={busy} onClick={() => void save()} className={primaryBtn + ' !px-4 !py-2 disabled:opacity-50'}>
            {busy && <Loader2 size={14} className="mr-2 inline animate-spin" />}Salvar canal
          </button>
        )}
      </div>
    </div>
  );
}

type Props = { storeId: string; onClose: () => void; onChanged: () => void };

export default function ChannelsModal({ storeId, onClose, onChanged }: Props) {
  const { can } = useGestorAccess();
  const canEdit = can('estoque', 'editar');
  const [tab, setTab] = useState<'canais' | 'depositos'>('canais');
  const [rules, setRules] = useState<ChannelRule[]>([]);
  const [whs, setWhs] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sample, setSample] = useState('10');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, w] = await Promise.all([listChannelRules(storeId), listWarehouses(storeId)]);
      setRules(r);
      setWhs(w);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const refresh = async () => { await load(); onChanged(); };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); await refresh(); }
    catch (e) { showError((e as Error).message); }
    finally { setBusy(false); }
  };

  const add = () => {
    if (!name.trim()) return;
    void run(async () => { await saveWarehouse(storeId, name.trim(), 'physical', null, true); setName(''); });
  };
  const rename = (w: Warehouse) => {
    if (!editName.trim()) return;
    void run(async () => { await saveWarehouse(storeId, editName.trim(), w.kind, w.id, w.active); setEditId(null); });
  };
  const toggle = (w: Warehouse) => void run(() => saveWarehouse(storeId, w.name, w.kind, w.id, !w.active));

  const activeWhs = whs.filter((w) => w.active);
  const sampleN = sample === '' ? 0 : Number(sample);
  const tabBtn = (k: 'canais' | 'depositos', label: string) => (
    <button type="button" onClick={() => setTab(k)} className={cn('cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition', tab === k ? 'bg-[color:var(--sll-b-brand)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>{label}</button>
  );

  return (
    <Modal title="Canais e depósitos" onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {tabBtn('canais', 'Canais de venda')}
          {tabBtn('depositos', 'Depósitos')}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : tab === 'canais' ? (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <p className="text-xs text-slate-500">
              O estoque físico é um só. Cada canal mostra: <strong>menor entre o teto e (saldo dos depósitos vinculados − reserva)</strong>.
            </p>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Saldo físico para a prévia
              <input inputMode="numeric" value={sample} onChange={(e) => setSample(digits(e.target.value))} className={cn(inputCls, '!w-20 !py-1.5 text-center font-mono')} />
            </label>
            {rules.map((r) => (
              <RuleCard
                key={r.channel + JSON.stringify(r)}
                storeId={storeId}
                rule={r}
                warehouses={activeWhs}
                sample={sampleN}
                canEdit={canEdit}
                onSaved={() => void refresh()}
              />
            ))}
            <p className="text-[11px] text-slate-400">Mercado Livre e TikTok Shop ainda não têm integração: a regra fica salva e aparece na lista, mas nenhum envio é feito por enquanto.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Depósitos são locais físicos (estoque principal, loja, consignado), não canais de venda. Quem tem um só local pode ignorar esta aba.</p>
            <ul className="divide-y rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {whs.map((w) => (
                <li key={w.id} className="flex items-center gap-3 p-3">
                  {editId === w.id ? (
                    <>
                      <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') rename(w); if (e.key === 'Escape') setEditId(null); }} className={cn(inputCls, '!py-1.5')} />
                      <button type="button" disabled={busy} onClick={() => rename(w)} className="cursor-pointer text-emerald-600" title="Salvar"><Check size={16} /></button>
                      <button type="button" onClick={() => setEditId(null)} className="cursor-pointer text-slate-400" title="Cancelar"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-sm font-medium', !w.active && 'text-slate-400 line-through')}>{w.name}</p>
                        <p className="text-[11px] text-slate-400">{w.is_ecommerce ? 'Depósito principal (alimenta o e-commerce)' : w.kind === 'physical' ? 'Loja física' : 'Outro'}</p>
                      </div>
                      {canEdit && <button type="button" onClick={() => { setEditId(w.id); setEditName(w.name); }} className="cursor-pointer text-slate-400 hover:text-[color:var(--sll-b-brand)]" title="Renomear"><Pencil size={15} /></button>}
                      {canEdit && !w.is_ecommerce && (
                        <button type="button" disabled={busy} onClick={() => toggle(w)} className={cn('cursor-pointer rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase', w.active ? 'border-[color:color-mix(in_srgb,var(--sll-b-brand)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)] text-[color:var(--sll-b-brand)]' : 'border-rose-200 bg-rose-50 text-rose-600')}>
                          {w.active ? 'Ativo' : 'Inativo'}
                        </button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="Novo depósito (ex.: Loja Centro)" className={inputCls} />
                <button type="button" disabled={busy} onClick={add} className={primaryBtn}><Plus size={16} /></button>
              </div>
            )}
            <p className="text-[11px] text-slate-400">Para desativar um depósito, transfira o saldo dele antes.</p>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className={primaryBtn}>Concluído</button>
        </div>
      </div>
    </Modal>
  );
}