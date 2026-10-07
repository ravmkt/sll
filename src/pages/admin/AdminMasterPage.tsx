import { useEffect, useState } from 'react';
import { Search, MessageCircle, X, Loader2 } from 'lucide-react';
import {
  adminListStores,
  adminStoreXray,
  whatsappLink,
  STATUS_LABEL,
  CYCLE_LABEL,
  type AdminStoreRow,
  type AdminXray,
} from '@/services/admin/adminMaster';

const PAGE = 25;
const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Ativo' },
  { value: 'trialing', label: 'Trial' },
  { value: 'past_due', label: 'Inadimplente' },
  { value: 'canceled', label: 'Cancelado' },
  { value: 'lifetime', label: 'Vitalício' },
  { value: 'none', label: 'Sem assinatura' },
];
const BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-sky-100 text-sky-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  lifetime: 'bg-violet-100 text-violet-700',
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const fmtDateTime = (d: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '—');
const fmtNum = (n: number) => n.toLocaleString('pt-BR');
const fmtBytes = (n: number) => {
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(2).replace('.', ',') + ' GB';
  if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(1).replace('.', ',') + ' MB';
  return Math.round(n / 1024) + ' KB';
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Sem assinatura</span>;
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function UsageBar({ label, used, limit, fmt }: { label: string; used: number; limit: number | null | undefined; fmt: (n: number) => string }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const suffix = limit === undefined ? '' : limit === null ? ' (ilimitado)' : ` de ${fmt(limit)}`;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{fmt(used)}{suffix}</span>
      </div>
      <div className="mt-1 h-2 rounded bg-slate-100">
        <div
          className={`h-2 rounded ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-sky-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function XrayDrawer({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [data, setData] = useState<AdminXray | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    adminStoreXray(storeId)
      .then((d) => alive && (d ? setData(d) : setError('Loja não encontrada.')))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [storeId]);

  const lim = data?.limits ?? null;
  const num = (k: string): number | null | undefined =>
    lim === null ? undefined : (lim[k] as number | null | undefined) ?? null;
  const storageGb = num('storage_gb');
  const wa = data ? whatsappLink(data.store.phone, data.store.name) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-slate-900">Raio-X do lojista</h2>
          <button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {!data && !error && <Loader2 className="mt-6 h-5 w-5 animate-spin text-sky-500" />}

        {data && (
          <div className="mt-4 space-y-6 text-sm">
            <section className="space-y-1">
              <p className="text-base font-semibold text-slate-900">{data.store.name}</p>
              <p className="text-slate-600">{data.store.email ?? 'Sem e-mail'}</p>
              <p className="text-slate-600">{data.store.phone ?? 'Sem WhatsApp'}</p>
              {data.store.url && (
                <a href={data.store.url.startsWith('http') ? data.store.url : `https://${data.store.url}`} target="_blank" rel="noreferrer" className="text-sky-600 underline">
                  {data.store.url}
                </a>
              )}
              <p className="text-slate-500">Cadastro: {fmtDate(data.store.created_at)}</p>
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 font-medium text-white hover:bg-emerald-600">
                  <MessageCircle className="h-4 w-4" /> Conversar no WhatsApp
                </a>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Sem telefone válido para WhatsApp.</p>
              )}
            </section>

            <section className="space-y-1 rounded-lg border p-3">
              <p className="font-semibold text-slate-900">Assinatura</p>
              <p><StatusBadge status={data.store.sub_status} /> <span className="ml-1">{data.store.plan_name ?? '—'}</span></p>
              <p className="text-slate-600">
                Ciclo: {data.store.billing_cycle ? CYCLE_LABEL[data.store.billing_cycle] ?? data.store.billing_cycle : '—'}
              </p>
              <p className="text-slate-600">Renovação: {fmtDate(data.store.period_end)}</p>
            </section>

            <section className="space-y-3 rounded-lg border p-3">
              <p className="font-semibold text-slate-900">Consumo (Vidlytics)</p>
              <UsageBar label="Vídeos" used={data.usage.videos} limit={num('max_videos')} fmt={fmtNum} />
              <UsageBar
                label="Armazenamento"
                used={data.usage.storage_bytes}
                limit={storageGb === undefined ? undefined : storageGb === null ? null : storageGb * 1024 ** 3}
                fmt={fmtBytes}
              />
              <UsageBar label="Plays no mês" used={data.usage.views_month} limit={num('views')} fmt={fmtNum} />
              <UsageBar label="Páginas com vídeo (90 dias)" used={data.usage.pages} limit={num('max_pages')} fmt={fmtNum} />
            </section>

            <section className="rounded-lg border p-3">
              <p className="font-semibold text-slate-900">Saúde do widget</p>
              <p className="text-slate-600">Último evento recebido: {fmtDateTime(data.usage.last_event_at)}</p>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function AdminMasterPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AdminStoreRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    adminListStores(debounced, status, PAGE, page * PAGE)
      .then((r) => {
        if (!alive) return;
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debounced, status, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">SLL Master</h1>
      <p className="text-sm text-slate-500">Lojistas cadastrados ({fmtNum(total)})</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por loja, e-mail ou URL"
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Renovação</th>
              <th className="px-4 py-3">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-500" /></td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Nenhum lojista encontrado.</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">{r.email ?? '—'}</td>
                <td className="px-4 py-3">{r.plan_name ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={r.sub_status} /></td>
                <td className="px-4 py-3">{fmtDate(r.period_end)}</td>
                <td className="px-4 py-3">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-3 text-sm">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button>
        <span>{page + 1} / {pages}</span>
        <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Próxima</button>
      </div>

      {selected && <XrayDrawer storeId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}