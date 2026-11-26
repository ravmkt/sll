import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Loader2, Plus, Trash2, Wallet } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { cn } from '@/lib/utils';
import { SllPageHeader } from '@/components/sll/SllPageHeader';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { showError, showSuccess } from '@/utils/toast';
import {
  GESTOR_STATUS, KNOWN_CHANNELS, PAYMENT_STATUS, channelName, getChannelsConfig, saveChannel,
  saveStatusMap, setChannelInherit,
} from '../services/canaisConfig';
import type { ChannelsConfig, StatusRow } from '../services/canaisConfig';

const checkCls = 'h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)] disabled:cursor-not-allowed';

function Card({ title, hint, actions, children }: { title: string; hint?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function ChannelsConfigPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [cfg, setCfg] = useState<ChannelsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [wh, setWh] = useState('');
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [newKey, setNewKey] = useState('');
  const [confirm, setConfirm] = useState<{ from: string | null } | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const c = await getChannelsConfig(storeId);
      setCfg(c);
      setSel((cur) => (cur && c.channels.some((x) => x.channel === cur) ? cur : c.channels[0]?.channel ?? ''));
    } catch (e) {
      showError((e as Error).message || 'Erro ao carregar os canais.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) void load(); }, [lojaLoading, load]);

  const ch = cfg?.channels.find((c) => c.channel === sel) ?? null;

  useEffect(() => {
    if (!cfg || !ch) return;
    setActive(ch.active);
    setWh(ch.warehouse_id ?? '');
    setRows(cfg.status_map.filter((m) => m.channel === ch.channel).map(({ channel: _c, ...r }) => r));
  }, [cfg, ch]);

  const canEdit = !!cfg?.can_edit;
  const free = useMemo(() => KNOWN_CHANNELS.filter((k) => !cfg?.channels.some((c) => c.channel === k)), [cfg]);
  const sources = useMemo(
    () => (cfg?.channels ?? []).filter((c) => c.channel !== sel && !c.inherit_from),
    [cfg, sel],
  );

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try { await fn(); showSuccess(ok); await load(); }
    catch (e) { showError((e as Error).message); }
    finally { setBusy(null); }
  };

  const addChannel = () => {
    if (!storeId || !newKey) return;
    const k = newKey;
    void run('add', async () => { await saveChannel(storeId, k, false, null); setSel(k); setNewKey(''); }, `${channelName(k)} adicionado.`);
  };

  const saveGeneral = () => {
    if (!storeId || !ch) return;
    void run('geral', () => saveChannel(storeId, ch.channel, active, wh || null), 'Canal salvo.');
  };

  const doInherit = () => {
    if (!storeId || !ch || !confirm) return;
    const from = confirm.from;
    setConfirm(null);
    void run('inherit', () => setChannelInherit(storeId, ch.channel, from),
      from ? `Pagamentos de ${channelName(ch.channel)} agora seguem ${channelName(from)}.` : 'Canal desvinculado. A configuração foi copiada e já pode ser editada.');
  };

  const saveStatus = () => {
    if (!storeId || !ch) return;
    const seen = new Set<string>();
    for (const r of rows) {
      const k = r.external_status.trim().toLowerCase();
      if (!k) { showError('Preencha o status do canal em todas as linhas ou remova a linha vazia.'); return; }
      if (seen.has(k)) { showError(`O status "${r.external_status}" está repetido.`); return; }
      seen.add(k);
    }
    void run('status', () => saveStatusMap(storeId, ch.channel, rows), 'Mapa de status salvo.');
  };

  const setRow = (i: number, patch: Partial<StatusRow>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  if (loading || lojaLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>;
  }
  if (!cfg) return null;

  const isPdv = sel === 'pdv';
  const bn = busy !== null;

  return (
    <div className="space-y-4">
      <SllPageHeader
        title="Canais"
        subtitle="Ative cada canal de venda, escolha o depósito e configure as formas de pagamento de cada um."
        actions={canEdit && free.length > 0 ? (
          <div className="flex items-center gap-2">
            <select className={sllFieldCls + ' w-48 cursor-pointer'} value={newKey} onChange={(e) => setNewKey(e.target.value)}>
              <option value="">Adicionar canal...</option>
              {free.map((k) => <option key={k} value={k}>{channelName(k)}</option>)}
            </select>
            <button type="button" disabled={!newKey || bn} onClick={addChannel} className={sllBtnPrimary}><Plus size={15} /> Adicionar</button>
          </div>
        ) : undefined}
      />

      {!canEdit && <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">Você pode ver os canais, mas só o dono e quem tem permissão de edição em Configurações altera.</p>}

      <div className="flex flex-wrap gap-2">
        {cfg.channels.map((c) => (
          <button
            key={c.channel} type="button" onClick={() => setSel(c.channel)}
            className={cn('inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
              sel === c.channel ? 'bg-[color:var(--sll-b-brand)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')}
          >
            {channelName(c.channel)}
            <span className={cn('h-2 w-2 rounded-full', c.active ? 'bg-emerald-400' : 'bg-slate-400')} />
          </button>
        ))}
        {cfg.channels.length === 0 && <p className="text-sm text-slate-400">Nenhum canal cadastrado.</p>}
      </div>

      {ch && (
        <>
          <Card
            title="Conexão e depósito"
            hint="Canal inativo não recebe pedidos nem estoque."
            actions={canEdit ? (
              <button type="button" disabled={bn} onClick={saveGeneral} className={sllBtnPrimary}>
                {busy === 'geral' && <Loader2 size={15} className="animate-spin" />}Salvar
              </button>
            ) : undefined}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm font-semibold">
                <input type="checkbox" className={checkCls} disabled={!canEdit} checked={active} onChange={(e) => setActive(e.target.checked)} />
                Canal ativo
              </label>
              <SllField label="Depósito do canal">
                <select className={sllFieldCls + ' cursor-pointer'} disabled={!canEdit} value={wh} onChange={(e) => setWh(e.target.value)}>
                  <option value="">Depósito padrão da loja (e-commerce)</option>
                  {cfg.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </SllField>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">O depósito fica gravado para a baixa de estoque dos pedidos do canal. A ligação com os pedidos entra na próxima etapa.</p>
          </Card>

          <Card
            title="Pagamentos"
            hint={ch.inherit_from
              ? `Este canal usa as formas de pagamento, parcelas e taxas de ${channelName(ch.inherit_from)}. O Pix é o mesmo em toda a loja.`
              : 'Este canal tem configuração própria de formas de pagamento, parcelas, taxas e descontos. O Pix é o mesmo em toda a loja.'}
            actions={(
              <Link to={`/dashboard/modules/gestor/config-financeiro?canal=${encodeURIComponent(ch.channel)}`} className={sllBtnGhost}>
                <Wallet size={15} /> {ch.inherit_from || !canEdit ? 'Ver pagamentos' : 'Editar pagamentos'}
              </Link>
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {ch.inherit_from ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--sll-b-brand-soft)] px-3 py-1 text-xs font-bold text-[color:var(--sll-b-brand)]">
                    <Link2 size={13} /> Herda de {channelName(ch.inherit_from)}
                  </span>
                  {canEdit && (
                    <button type="button" disabled={bn} onClick={() => setConfirm({ from: null })} className={sllBtnGhost}>Desvincular e editar separado</button>
                  )}
                </>
              ) : (
                <>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Configuração própria</span>
                  {canEdit && sources.length > 0 && (
                    <select
                      className={sllFieldCls + ' w-64 cursor-pointer'} disabled={bn} value=""
                      onChange={(e) => { if (e.target.value) setConfirm({ from: e.target.value }); }}
                    >
                      <option value="">Passar a seguir outro canal...</option>
                      {sources.map((s) => <option key={s.channel} value={s.channel}>{channelName(s.channel)}</option>)}
                    </select>
                  )}
                </>
              )}
            </div>
              {!isPdv && !ch.inherit_from && (
                <p className="mt-3 text-xs text-slate-500">
                  Como {channelName(ch.channel)} chama cada forma de pagamento (ex.: credit_card) e como ela aparece no Gestor:{' '}
                  <Link to={`/dashboard/modules/gestor/config-financeiro?canal=${encodeURIComponent(ch.channel)}&aba=integracoes`} className="font-semibold text-[color:var(--sll-b-brand)] hover:underline">traduzir formas de pagamento</Link>.
                </p>
              )}
              </Card>

              {!isPdv && (
                <details className="group">
                  <summary className="cursor-pointer select-none rounded-xl px-1 py-2 text-sm font-semibold text-slate-600 hover:text-[color:var(--sll-b-brand)] dark:text-slate-300">Avançado: status dos pedidos</summary>
                  <div className="mt-2">
                <Card
                  title="Status dos pedidos"
              hint="Como cada status que chega do canal vira status do pedido no Gestor. Linhas marcadas com “devolve estoque” repõem o saldo quando o Gestor controla o estoque do canal."
              actions={canEdit ? (
                <button type="button" disabled={bn} onClick={saveStatus} className={sllBtnPrimary}>
                  {busy === 'status' && <Loader2 size={15} className="animate-spin" />}Salvar mapa
                </button>
              ) : undefined}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 text-left">Status no canal</th><th className="py-2">Status no Gestor</th>
                      <th className="py-2">Pagamento</th><th className="py-2">Devolve estoque</th><th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-2">
                          <input className={sllFieldCls} disabled={!canEdit} placeholder="ex.: waiting_payment" value={r.external_status} onChange={(e) => setRow(i, { external_status: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <select className={sllFieldCls + ' cursor-pointer'} disabled={!canEdit} value={r.gestor_status} onChange={(e) => setRow(i, { gestor_status: e.target.value })}>
                            {GESTOR_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select className={sllFieldCls + ' cursor-pointer'} disabled={!canEdit} value={r.payment_status} onChange={(e) => setRow(i, { payment_status: e.target.value })}>
                            {PAYMENT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="py-2 text-center">
                          <input type="checkbox" className={checkCls} disabled={!canEdit} checked={r.returns_stock} onChange={(e) => setRow(i, { returns_stock: e.target.checked })} />
                        </td>
                        <td className="py-2 text-center">
                          {canEdit && (
                            <button type="button" title="Remover" onClick={() => setRows((p) => p.filter((_, j) => j !== i))}
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><Trash2 size={15} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-400">Nenhum status mapeado para este canal.</td></tr>}
                  </tbody>
                </table>
              </div>
              {canEdit && (
                <button type="button" className={sllBtnGhost + ' mt-3'} onClick={() => setRows((p) => [...p, { external_status: '', gestor_status: 'pending', payment_status: '', returns_stock: false }])}>
                  <Plus size={15} /> Adicionar status
                </button>
              )}
            </Card>
                  </div>
                </details>
              )}
            </>
          )}

          <SllModal
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.from ? 'Seguir outro canal?' : 'Desvincular canal?'}
        size="md"
        footer={(
          <>
            <button type="button" onClick={() => setConfirm(null)} className={sllBtnGhost}>Cancelar</button>
            <button type="button" onClick={doInherit} className={sllBtnPrimary}>Confirmar</button>
          </>
        )}
      >
        {confirm?.from ? (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {channelName(sel)} vai passar a usar os pagamentos de <strong>{channelName(confirm.from)}</strong>. A configuração própria atual fica guardada, mas deixa de valer enquanto o vínculo existir.
          </p>
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            A configuração de pagamentos que {channelName(sel)} usa hoje será <strong>copiada</strong> para ele, e daí em diante ele pode ser editado separado, sem afetar o canal de origem.
          </p>
        )}
      </SllModal>
    </div>
  );
}