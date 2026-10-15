import StoreDetailPage from '@/components/admin/StoreDetailPage';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, KeyRound, Loader2, Mail, MessageCircle, MoreVertical, Pencil, Power, Search, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  deleteStore, listStores, setSubscriptionStatus,
  type AdminStoreRow, type StoreStatus,
} from '@/services/admin/storesService';
import { Badge, CARD, DeleteStoreModal, ICON, modLabel } from '@/components/admin/storeUi';

const sb = supabase as any;
const TZ = 'America/Sao_Paulo';
const MENU_W = 208;
const CHIPS: { id: 'all' | StoreStatus; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Ativas' },
  { id: 'inactive', label: 'Inativas' },
  { id: 'trial', label: 'Em trial' },
  { id: 'past_due', label: 'Inadimplentes' },
];
const STATUS_ORDER: Record<StoreStatus, number> = { active: 0, trial: 1, past_due: 2, inactive: 3 };

type SortKey = 'name' | 'created' | 'access' | 'status' | 'plans' | 'ai' | 'storage';
type SortDir = 'asc' | 'desc';
const DEFAULT_DIR: Record<SortKey, SortDir> = { name: 'asc', created: 'desc', access: 'desc', status: 'asc', plans: 'asc', ai: 'desc', storage: 'desc' };

const ts = (v: string | null) => (v ? new Date(v).getTime() : 0);
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR', { timeZone: TZ }) : '—');
const fmtFull = (v: string | null) => (v ? new Date(v).toLocaleString('pt-BR', { timeZone: TZ }) : 'Nunca acessou');

const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
function hm(d: Date) {
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = p.find((x) => x.type === 'hour')?.value ?? '0';
  const m = p.find((x) => x.type === 'minute')?.value ?? '00';
  return `${Number(h)}h${m}`;
}
function lastAccess(v: string | null): { text: string; stale: boolean } {
  if (!v) return { text: 'Nunca acessou', stale: false };
  const d = new Date(v);
  const days = Math.round((Date.parse(dayKey(new Date())) - Date.parse(dayKey(d))) / 86400000);
  if (days <= 0) return { text: `Hoje às ${hm(d)}`, stale: false };
  if (days === 1) return { text: `Ontem às ${hm(d)}`, stale: false };
  return { text: `Há ${days} dias`, stale: days > 15 };
}

function Th({ label, k, sort, dir, onSort }: { label: string; k: SortKey; sort: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = sort === k;
  return (
    <th className="px-4 py-3" aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={`flex cursor-pointer items-center gap-1 uppercase tracking-wider transition-colors hover:text-white ${active ? 'text-white' : ''}`}>
        {label}
        {active ? (dir === 'asc' ? <ArrowUp size={12} className="text-[#fd8539]" /> : <ArrowDown size={12} className="text-[#fd8539]" />) : <ArrowUpDown size={12} className="opacity-40" />}
      </button>
    </th>
  );
}

type MenuProps = {
  r: AdminStoreRow;
  busy: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onImpersonate: () => void;
  onToggle: () => void;
  onDelete: () => void;
};

function RowMenu({ r, busy, onDetails, onEdit, onImpersonate, onToggle, onDelete }: MenuProps) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener('pointerdown', down);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', down);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const toggleOpen = () => {
    if (pos) { setPos(null); return; }
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const left = Math.max(8, b.right - MENU_W);
    setPos(b.bottom + 300 > window.innerHeight ? { bottom: window.innerHeight - b.top + 4, left } : { top: b.bottom + 4, left });
  };

  const item = (icon: ReactNode, label: string, fn: () => void, cls = 'text-slate-200') => (
    <button
      type="button"
      role="menuitem"
      onClick={() => { setPos(null); fn(); }}
      className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-white/5 ${cls}`}
    >
      {icon}{label}
    </button>
  );

  let wa: string | null = null;
  if (r.whatsapp) {
    let digits = r.whatsapp.replace(/\D/g, '');
    if (digits.length >= 10) { if (digits.length <= 11) digits = `55${digits}`; wa = `https://wa.me/${digits}`; }
  }
  const mail = r.owner_email || r.contact_email;
  const cancel = r.status !== 'inactive';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Ações da loja"
        aria-haspopup="menu"
        aria-expanded={!!pos}
        disabled={busy}
        onClick={toggleOpen}
        className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-white/10 disabled:opacity-40"
      >
        {busy ? <Loader2 size={16} className="animate-spin text-slate-400" /> : <MoreVertical size={16} className={ICON} />}
      </button>
      {pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: MENU_W }}
          className="z-50 overflow-hidden rounded-xl border border-white/10 bg-[#111524] py-1 shadow-2xl shadow-black/50"
        >
          {item(<Eye size={14} className={ICON} />, 'Ver detalhes', onDetails)}
          {item(<Pencil size={14} className={ICON} />, 'Editar dados', onEdit)}
          {item(<KeyRound size={14} className="text-sky-400" />, 'Entrar na loja (gerar link)', onImpersonate)}
          {item(<Power size={14} className={cancel ? 'text-amber-400' : 'text-emerald-400'} />, cancel ? 'Desligar plano' : 'Ligar plano', onToggle)}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => setPos(null)} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/5">
              <MessageCircle size={14} className="text-emerald-400" /> WhatsApp
            </a>
          )}
          {mail && (
            <a href={`mailto:${mail}`} role="menuitem" onClick={() => setPos(null)} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/5">
              <Mail size={14} className={ICON} /> E-mail
            </a>
          )}
          <div className="my-1 border-t border-white/10" />
          {item(<Trash2 size={14} />, 'Excluir loja', onDelete, 'text-rose-400')}
        </div>
      )}
    </>
  );
}

function LojasList() {
  const [, setParams] = useSearchParams();
  const [rows, setRows] = useState<AdminStoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | StoreStatus>('all');
  const [mod, setMod] = useState('all');
  const [sort, setSort] = useState<SortKey>('created');
  const [dir, setDir] = useState<SortDir>('desc');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [del, setDel] = useState<AdminStoreRow | null>(null);

  const open = (id: string, aba?: string) =>
    setParams(aba ? { tab: 'lojas', loja: id, aba } : { tab: 'lojas', loja: id });

  const load = useCallback(() => {
    setLoading(true);
    listStores()
      .then(setRows)
      .catch((e) => { toast.error('Erro ao listar lojas.'); console.error(e); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSort = (k: SortKey) => {
    if (k === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(k); setDir(DEFAULT_DIR[k]); }
  };

  const counts = useMemo(() => {
    const c: Record<'all' | StoreStatus, number> = { all: rows.length, active: 0, past_due: 0, trial: 0, inactive: 0 };
    rows.forEach((r) => { c[r.status] += 1; });
    return c;
  }, [rows]);

  const [modNames, setModNames] = useState<Record<string, string>>({});
  useEffect(() => {
    sb.from('hub_modules').select('slug,name').then(({ data }: any) =>
      setModNames(Object.fromEntries((data || []).map((m: any) => [m.slug, m.name]))));
  }, []);
  const modCounts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => r.modules.forEach((m) => { c[m] = (c[m] || 0) + 1; }));
    return c;
  }, [rows]);
  const modules = useMemo(
    () => Object.keys(modCounts).filter((m) => m in modNames).sort((a, b) => modNames[a].localeCompare(modNames[b], 'pt-BR')),
    [modCounts, modNames],
  );

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = rows.filter((r) =>
      (status === 'all' || r.status === status) &&
      (mod === 'all' || r.modules.includes(mod)) &&
      (!term || [r.name, r.url, r.contact_email, r.owner_email].some((v) => (v || '').toLowerCase().includes(term))));
    const sign = dir === 'asc' ? 1 : -1;
    const planKey = (r: AdminStoreRow) =>
      r.plans[0] || (r.modules[0] ? (modNames[r.modules[0]] || modLabel(r.modules[0])) : '\uffff');
    const storagePct = (r: AdminStoreRow) => {
      const lim = Number(r.storage_limit_bytes) || 0;
      return lim > 0 ? (Number(r.storage_used_bytes) || 0) / lim : -1;
    };
    return list.sort((a, b) => {
      let p = 0;
      if (sort === 'name') p = (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
      else if (sort === 'created') p = ts(a.created_at) - ts(b.created_at);
      else if (sort === 'access') p = ts(a.last_sign_in_at) - ts(b.last_sign_in_at);
      else if (sort === 'plans') p = planKey(a).localeCompare(planKey(b), 'pt-BR', { sensitivity: 'base' });
      else if (sort === 'ai') p = (a.ai_interactions || 0) - (b.ai_interactions || 0);
      else if (sort === 'storage') p = storagePct(a) - storagePct(b);
      else p = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return p * sign || ts(b.created_at) - ts(a.created_at);
    });
  }, [rows, q, status, mod, sort, dir, modNames]);

  const togglePlan = async (r: AdminStoreRow) => {
    if (r.is_lifetime) {
      toast.info('Loja vitalícia: gerencie na aba Assinaturas.');
      open(r.id, 'assinaturas');
      return;
    }
    const cancel = r.status !== 'inactive';
    const targets = r.subs.filter((s) => (cancel ? s.status !== 'canceled' : s.status === 'canceled'));
    if (targets.length === 0) {
      toast.info('Sem assinatura atual para alterar. Abrindo a loja.');
      open(r.id, 'assinaturas');
      return;
    }
    const nome = r.name || 'esta loja';
    const txt = cancel ? `Cancelar ${targets.length} assinatura(s) de ${nome}?` : `Reativar ${targets.length} assinatura(s) de ${nome}?`;
    if (!window.confirm(`${txt}\nIsso altera só o SLL. Cobrança recorrente no Asaas deve ser cancelada lá.`)) return;
    setBusyId(r.id);
    try {
      for (const t of targets) await setSubscriptionStatus(t.id, cancel ? 'canceled' : 'active');
      toast.success('Plano atualizado.');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar plano.');
    } finally {
      setBusyId(null);
    }
  };

  const impersonate = async (r: AdminStoreRow) => {
    if (!window.confirm(`Gerar link de acesso como dono de "${r.name || 'esta loja'}"?\nA ação fica registrada no log de auditoria.`)) return;
    setBusyId(r.id);
    try {
      const { data, error } = await sb.functions.invoke('admin-impersonate', {
        body: { store_id: r.id, redirect_to: `${window.location.origin}/dashboard` },
      });
      if (error) {
        let msg: string = error.message;
        try { msg = (await error.context.json())?.error || msg; } catch { /* mantém */ }
        throw new Error(msg);
      }
      if (!data?.link) throw new Error(data?.error || 'Link não gerado.');
      await navigator.clipboard.writeText(data.link);
      toast.success('Link copiado. Cole numa janela anônima: abrir neste navegador encerra a sua sessão Master.', { duration: 9000 });
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível gerar o link.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setBusyId(del.id);
    try {
      await deleteStore(del.id);
      toast.success('Loja excluída.');
      setDel(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível excluir a loja.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Lojas</h1>
        <p className="text-[13px] text-slate-500">{visible.length} de {rows.length} lojas</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setStatus(c.id)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors ${
              status === c.id ? 'border-[#fd8539] bg-[#fd8539]/15 text-white' : 'border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {c.label} <span className="ml-1 text-slate-500">{counts[c.id]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${ICON}`} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, URL ou e-mail"
            className="w-full rounded-xl border border-white/10 bg-[#111524] py-2 pl-9 pr-3 text-[13px] text-white outline-none focus:border-[#fd8539]"
          />
        </div>
        <select value={mod} onChange={(e) => setMod(e.target.value)} className="cursor-pointer rounded-xl border border-white/10 bg-[#111524] px-3 py-2 text-[13px] text-white outline-none">
          <option value="all">Todos os módulos</option>
          {modules.map((m) => <option key={m} value={m}>{modNames[m] || modLabel(m)} ({modCounts[m]})</option>)}
        </select>
      </div>

      <div className={`${CARD} overflow-x-auto p-0`}>
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${ICON}`} /></div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-500">
                <Th label="Loja" k="name" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Criada em" k="created" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Último acesso" k="access" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Status" k="status" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Planos &amp; módulos" k="plans" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Consumo IA" k="ai" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Storage" k="storage" sort={sort} dir={dir} onSort={onSort} />
                <th className="px-4 py-3 text-right uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Nenhuma loja encontrada.</td></tr>
              )}
              {visible.map((r) => {
                const acc = lastAccess(r.last_sign_in_at);
                const badges = r.plans.length ? r.plans : r.modules.map((m) => modNames[m] || modLabel(m));
                return (
                  <tr key={r.id} className="align-top hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => open(r.id)} className="cursor-pointer text-left font-bold text-white hover:text-[#fd8539]">
                          {r.name || 'Sem nome'}
                        </button>
                        {r.is_lifetime && (
                          <span title="Conta vitalícia" className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-bold text-sky-300">
                            <Star size={10} className="fill-sky-300" /> Vitalícia
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-500">{r.url || '—'}</p>
                      <p className="text-[13px] text-slate-500">{r.owner_email || r.contact_email || 'sem e-mail'}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmtDate(r.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3" title={fmtFull(r.last_sign_in_at)}>
                      {acc.stale ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[13px] font-bold text-amber-300">{acc.text}</span>
                      ) : (
                        <span className={r.last_sign_in_at ? 'text-slate-300' : 'text-slate-600'}>{acc.text}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {badges.length === 0 ? <span className="text-slate-600">—</span> : badges.map((b) => (
                          <span key={b} className="rounded-md bg-[#fd8539]/10 px-2 py-0.5 text-[13px] font-semibold text-[#fd8539]">{b}</span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" title={`${r.ai_tokens.toLocaleString('pt-BR')} tokens · US$ ${Number(r.ai_cost_usd).toFixed(4)} no mês`}>
                      {r.ai_interactions > 0 ? (
                        <>
                          <p className="font-bold text-slate-200">{r.ai_interactions.toLocaleString('pt-BR')} {r.ai_interactions === 1 ? 'interação' : 'interações'}</p>
                          <p className="text-[13px] text-slate-500">{r.ai_tokens.toLocaleString('pt-BR')} tokens</p>
                        </>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3"><StorageCell used={r.storage_used_bytes} limit={r.storage_limit_bytes} /></td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu
                        r={r}
                        busy={busyId === r.id}
                        onDetails={() => open(r.id)}
                        onEdit={() => open(r.id, 'dados')}
                        onImpersonate={() => impersonate(r)}
                        onToggle={() => togglePlan(r)}
                        onDelete={() => setDel(r)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {del && (
        <DeleteStoreModal name={del.name || 'excluir'} busy={busyId === del.id} onCancel={() => setDel(null)} onConfirm={confirmDelete} />
      )}
    </div>
  );
}

function fmtBytes(b: number | null | undefined) {
  const n = Number(b) || 0;
  const mb = n / 1048576;
  return mb < 1024 ? `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')} MB` : `${(mb / 1024).toFixed(1).replace('.', ',')} GB`;
}

function StorageCell({ used, limit }: { used: number | null; limit: number | null }) {
  const u = Number(used) || 0;
  const lim = Number(limit) || 0;
  if (!lim) return <span className="text-[13px] text-slate-400">{u > 0 ? fmtBytes(u) : '—'}</span>;
  const pct = Math.min(100, (u / lim) * 100);
  const bar = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-sky-500';
  return (
    <div className="w-36" title={`${fmtBytes(u)} de ${fmtBytes(lim)} (${pct.toFixed(0)}%)`}>
      <p className="text-[13px] text-slate-300">{fmtBytes(u)} <span className="text-slate-500">de {fmtBytes(lim)}</span></p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${bar}`} style={{ width: `${Math.max(pct, u > 0 ? 3 : 0)}%` }} />
      </div>
    </div>
  );
}

export function LojasTab() {
  const [params] = useSearchParams();
  const loja = params.get('loja');
  return loja ? <StoreDetailPage key={loja} storeId={loja} /> : <LojasList />;
}

export default LojasTab;