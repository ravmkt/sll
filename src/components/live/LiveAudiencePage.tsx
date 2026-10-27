import WhatsAppConnectCard from "@/components/live/WhatsAppConnectCard";
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageTour from "@/components/tour/PageTour";
import type { TourStep } from "@/hooks/usePageTour";
import { BellRing, Download, MessageCircle, Phone, RefreshCw, Search, UserPlus, Users } from 'lucide-react';
import { supabaseLiveCommerce as supabase } from '@/services/supabaseClients';
import { liveStore } from '@/components/live/LiveTemplatesPage';
import NotifyTemplatesModal from '@/components/live/NotifyTemplatesModal';

type Lead = {
  id: string;
  live_id: string | null;
  name: string;
  email: string;
  whatsapp: string;
  source: string;
  created_at: string;
};

type Notify = { enabled: boolean; before24h: boolean; onStart: boolean };

const T = {
  title: 'Audi\u00eancia',
  sub: 'Pessoas que se cadastraram para ser avisadas das pr\u00f3ximas lives.',
  search: 'Buscar por nome, e-mail ou WhatsApp',
  csv: 'Exportar CSV',
  reload: 'Atualizar',
  empty: 'Nenhum cadastro encontrado.',
  err: 'N\u00e3o foi poss\u00edvel carregar os cadastros. Verifique a permiss\u00e3o de leitura (policy live_leads_select_owner).',
  cols: ['Nome', 'E-mail', 'WhatsApp', 'Live de origem', 'Data', 'A\u00e7\u00e3o'],
  cardTotal: 'Total de Inscritos',
  cardWa: 'Contatos com WhatsApp',
  cardNew: 'Novos nos \u00faltimos 7 dias',
  rule: 'R\u00e9gua de Notifica\u00e7\u00e3o Autom\u00e1tica (WhatsApp/E-mail)',
  ruleDesc: 'Ao agendar uma nova live, o sistema programa os avisos com o link da live para toda a sua audi\u00eancia.',
  ruleOn: 'Ativado',
  ruleOff: 'Desativado',
  opt24: 'Lembrete 24h antes da live',
  optStart: 'Aviso "Estamos ao vivo!" na hora de iniciar',
  ruleNote: 'A configura\u00e7\u00e3o \u00e9 salva por loja. O envio autom\u00e1tico depende da integra\u00e7\u00e3o de WhatsApp/e-mail.',
  ruleErr: 'N\u00e3o foi poss\u00edvel salvar a configura\u00e7\u00e3o. Tente novamente.',
  msgLabel: 'Mensagem do bot\u00e3o WhatsApp',
  msgDefault: 'Ol\u00e1, {nome}! Passando para avisar da nossa pr\u00f3xima live. Quer receber o link?',
  send: 'Enviar',
  sendTitle: 'Enviar mensagem pelo WhatsApp',
};

const DEFAULT_NOTIFY: Notify = { enabled: false, before24h: true, onStart: true };

function digits(v: string): string {
  return String(v || '').replace(/\D/g, '');
}

function fmtPhone(v: string): string {
  const d = digits(v);
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return d;
}

function fmtDate(v: string): string {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function hasWa(v: string): boolean {
  return digits(v).length >= 10;
}

function waLink(v: string, text: string): string {
  const d = digits(v);
  if (d.length < 10) return '';
  return 'https://wa.me/' + (d.length <= 11 ? '55' + d : d) + '?text=' + encodeURIComponent(text);
}

function csvCell(v: string): string {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"';
}

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={label}
      onClick={onChange}
      className={'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ' + (on ? 'bg-emerald-500' : 'bg-slate-300')}
    >
      <span className={'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ' + (on ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={'flex h-11 w-11 items-center justify-center rounded-full ' + tone}>{icon}</div>
      <div>
        <div className="text-2xl font-bold tabular-nums text-slate-900">{new Intl.NumberFormat('pt-BR').format(value)}</div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      </div>
    </div>
  );
}

const AUDIENCIA_TOUR: TourStep[] = [
  { element: '[data-tour="audiencia-metricas"]', title: 'Sua audi\u00eancia', description: 'Total de inscritos, contatos com WhatsApp e novos cadastros dos \u00faltimos 7 dias.', side: 'bottom' },
  { element: '[data-tour="audiencia-regua"]', title: 'R\u00e9gua de notifica\u00e7\u00e3o', description: 'Ative os avisos autom\u00e1ticos: lembrete 24h antes e "Estamos ao vivo!" na hora de iniciar.', side: 'bottom' },
  { element: '[data-tour="audiencia-busca"]', title: 'Busca', description: 'Encontre pessoas por nome, e-mail, WhatsApp ou live de origem.', side: 'bottom' },
  { element: '[data-tour="audiencia-tabela"]', title: 'Cadastros', description: 'Use o bot\u00e3o Enviar para chamar a pessoa no WhatsApp com a mensagem pronta.', side: 'top' },
];

export default function LiveAudiencePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState<Notify>(DEFAULT_NOTIFY);
  const [notifyError, setNotifyError] = useState('');
  const [msg, setMsg] = useState(T.msgDefault);
  const [tplOpen, setTplOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const db = (supabase as any).schema('live_commerce');
      const [l, v] = await Promise.all([
        db.from('live_leads').select('id,live_id,name,email,whatsapp,source,created_at').order('created_at', { ascending: false }).limit(5000),
        db.from('lives').select('id,title'),
      ]);
      if (l.error) throw l.error;
      setLeads((l.data || []) as Lead[]);
      const map: Record<string, string> = {};
      ((v.data || []) as Array<{ id: string; title: string }>).forEach((x) => { map[x.id] = x.title; });
      setTitles(map);
    } catch (e) {
      console.error('[Audiencia]', e);
      setError(T.err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotify = useCallback(async () => {
    const storeId = liveStore.id;
    if (!storeId) return;
    try {
      const db = (supabase as any).schema('live_commerce');
      const { data, error: err } = await db
        .from('live_notify_settings')
        .select('enabled,before_24h,on_start')
        .eq('store_id', storeId)
        .maybeSingle();
      if (err) throw err;
      if (data) setNotify({ enabled: !!data.enabled, before24h: !!data.before_24h, onStart: !!data.on_start });
    } catch (e) {
      console.error('[Audiencia/notify]', e);
    }
  }, []);

  useEffect(() => { load(); loadNotify(); }, [load, loadNotify]);

  const saveNotify = async (next: Notify) => {
    const storeId = liveStore.id;
    const prev = notify;
    setNotify(next);
    setNotifyError('');
    if (!storeId) {
      setNotify(prev);
      setNotifyError(T.ruleErr);
      return;
    }
    try {
      const db = (supabase as any).schema('live_commerce');
      const { error: err } = await db.from('live_notify_settings').upsert(
        { store_id: storeId, enabled: next.enabled, before_24h: next.before24h, on_start: next.onStart, updated_at: new Date().toISOString() },
        { onConflict: 'store_id' }
      );
      if (err) throw err;
    } catch (e) {
      console.error('[Audiencia/notify]', e);
      setNotify(prev);
      setNotifyError(T.ruleErr);
    }
  };

  const stats = useMemo(() => {
    const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: leads.length,
      wa: leads.filter((r) => hasWa(r.whatsapp)).length,
      recent: leads.filter((r) => new Date(r.created_at).getTime() >= limit).length,
    };
  }, [leads]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sd = s.replace(/\D/g, '');
    if (!s) return leads;
    return leads.filter((r) =>
      r.name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      (sd.length > 0 && r.whatsapp.includes(sd)) ||
      (r.live_id ? (titles[r.live_id] || '').toLowerCase().includes(s) : false)
    );
  }, [leads, q, titles]);

  const exportCsv = () => {
    const head = T.cols.slice(0, 5).map(csvCell).join(';');
    const body = rows.map((r) => [
      r.name, r.email, fmtPhone(r.whatsapp), r.live_id ? (titles[r.live_id] || '') : '', fmtDate(r.created_at),
    ].map(csvCell).join(';'));
    const blob = new Blob(['\ufeff' + [head, ...body].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audiencia-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const textFor = (name: string) => msg.split('{nome}').join((name || '').trim().split(' ')[0] || '');

  return (
    <div className="w-full space-y-5 p-6">
      <WhatsAppConnectCard />
      <PageTour tourKey="live-audiencia" steps={AUDIENCIA_TOUR} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Users className="h-5 w-5 text-rose-600" /> {T.title}
          </h2>
          <p className="text-sm text-slate-500">{T.sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> {T.reload}
          </button>
          <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
            <Download className="h-4 w-4" /> {T.csv}
          </button>
        </div>
      </div>

      <div data-tour="audiencia-metricas" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon={<Users className="h-5 w-5 text-rose-600" />} tone="bg-rose-50" label={T.cardTotal} value={stats.total} />
        <MetricCard icon={<Phone className="h-5 w-5 text-emerald-600" />} tone="bg-emerald-50" label={T.cardWa} value={stats.wa} />
        <MetricCard icon={<UserPlus className="h-5 w-5 text-sky-600" />} tone="bg-sky-50" label={T.cardNew} value={stats.recent} />
      </div>

      <div data-tour="audiencia-regua" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <BellRing className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{T.rule}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{T.ruleDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={'rounded-full px-2.5 py-0.5 text-[11px] font-bold ' + (notify.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
              {notify.enabled ? T.ruleOn : T.ruleOff}
            </span>
            <Switch on={notify.enabled} label={notify.enabled ? T.ruleOff : T.ruleOn} onChange={() => saveNotify({ ...notify, enabled: !notify.enabled })} />
          </div>
        </div>
        <div className={'mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-sm text-slate-700 ' + (notify.enabled ? '' : 'opacity-50')}>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={notify.before24h} disabled={!notify.enabled} onChange={() => saveNotify({ ...notify, before24h: !notify.before24h })} className="h-4 w-4 accent-rose-600" />
            {T.opt24}
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={notify.onStart} disabled={!notify.enabled} onChange={() => saveNotify({ ...notify, onStart: !notify.onStart })} className="h-4 w-4 accent-rose-600" />
            {T.optStart}
          </label>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">{T.ruleNote}</p>
        <button type="button" onClick={() => setTplOpen(true)} className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
          {'Ver / editar templates'}
        </button>
        <NotifyTemplatesModal open={tplOpen} onClose={() => setTplOpen(false)} />
        {notifyError && <p className="mt-2 text-xs font-semibold text-rose-600">{notifyError}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div data-tour="audiencia-busca" className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T.search} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400" />
        </div>
        <div className="flex min-w-[280px] flex-1 items-center gap-2">
          <label className="shrink-0 text-xs font-bold text-slate-500">{T.msgLabel}</label>
          <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
        </div>
        <span className="text-sm text-slate-500">{rows.length} / {leads.length}</span>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div data-tour="audiencia-tabela" className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[150px]" />
            <col />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {T.cols.map((c, i) => (
                <th key={c} className={'px-4 py-2.5 font-semibold ' + (i === 5 ? 'text-center' : '')}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const link = waLink(r.whatsapp, textFor(r.name));
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="truncate px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                  <td className="truncate px-4 py-2.5 text-slate-600">{r.email}</td>
                  <td className="truncate px-4 py-2.5 text-slate-700">{fmtPhone(r.whatsapp)}</td>
                  <td className="truncate px-4 py-2.5 text-slate-600">{r.live_id ? (titles[r.live_id] || '-') : '-'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" title={T.sendTitle} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
                        <MessageCircle className="h-3.5 w-3.5" /> {T.send}
                      </a>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">{T.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
