import { useCallback, useEffect, useState } from 'react';
import { Eye, Mail, Plus, Send, X } from 'lucide-react';
import { AUDIENCE_LABEL, type MktAudience } from '@/services/admin/marketingAdmin';
import {
  EMPTY_EMAIL_METRICS, countRecipients, getCampaignDetail, getEmailMetrics, listCampaigns, sendCampaign,
  type EmailCampaign, type EmailMetrics, type EmailSendRow,
} from '@/services/admin/emailCampaigns';
import { StorePicker } from '@/components/admin/MarketingPickers';
import { useConfirm } from '@/components/admin/ConfirmDialog';

const inputCls =
  'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500';
const labelCls = 'block text-[13px] font-semibold uppercase tracking-wide text-slate-400 mb-1';

const STATUS: Record<EmailCampaign['status'], { label: string; cls: string }> = {
  sending: { label: 'Enviando', cls: 'bg-sky-500/20 text-sky-300' },
  sent: { label: 'Enviada', cls: 'bg-emerald-500/20 text-emerald-300' },
  partial: { label: 'Parcial', cls: 'bg-amber-500/20 text-amber-300' },
  failed: { label: 'Falhou', cls: 'bg-rose-500/20 text-rose-300' },
};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%');

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div className={'my-6 w-full rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl ' + (wide ? 'max-w-4xl' : 'max-w-2xl')} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="truncate text-base font-bold text-slate-100">{title}</h3>
          <button type="button" aria-label="Fechar" onClick={onClose} className="text-slate-400 hover:text-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmailPreview({ subject, message, unsub }: { subject: string; message: string; unsub?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-4 text-[15px] leading-relaxed text-slate-800">
      <p className="mb-2 text-xs font-bold text-slate-400">Assunto: {subject || '—'}</p>
      <p className="whitespace-pre-wrap">{message}</p>
      <hr className="my-4 border-slate-200" />
      <p className="text-xs text-slate-500">Equipe SLL Hub</p>
      {unsub !== false && <p className="text-xs text-slate-500 underline">Cancelar inscrição</p>}
    </div>
  );
}

function NewEmailModal({ onClose, onSent }: { onClose: () => void; onSent: (msg: string) => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<MktAudience>('all');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<'send' | 'test' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    if (audience === 'store' && !storeId) { setCount(null); return; }
    let alive = true;
    countRecipients(audience, storeId)
      .then((n) => { if (alive) setCount(n); })
      .catch(() => { if (alive) setCount(null); });
    return () => { alive = false; };
  }, [audience, storeId]);

  const valid = subject.trim() !== '' && message.trim() !== '' && (audience !== 'store' || !!storeId);

  const test = async () => {
    setBusy('test'); setErr(null); setOk(null);
    try {
      const r = await sendCampaign({ subject, message, audience, storeId, test: true });
      setOk('Teste enviado para ' + r.to + '.');
    } catch (e: any) { setErr(e?.message || 'Erro ao enviar o teste'); }
    finally { setBusy(null); }
  };

  const send = async () => {
    const n = count ?? 0;
    const yes = await confirm({
      title: 'Enviar e-mail',
      message: 'O e-mail "' + subject.trim() + '" será enviado para ' + n + (n === 1 ? ' destinatário' : ' destinatários') + '. Não dá para desfazer.',
      confirmLabel: 'Enviar',
    });
    if (!yes) return;
    setBusy('send'); setErr(null); setOk(null);
    try {
      const r = await sendCampaign({ subject, message, audience, storeId, test: false });
      onSent('E-mail enviado: ' + (r.sent ?? 0) + ' enviados, ' + (r.failed ?? 0) + ' falhas.');
    } catch (e: any) { setErr(e?.message || 'Erro ao enviar'); setBusy(null); }
  };

  return (
    <>
      <Modal title="Novo e-mail" onClose={busy ? () => {} : onClose}>
        <div className="space-y-3">
          {err && <p className="text-[15px] text-rose-400">{err}</p>}
          {ok && <p className="text-[15px] text-emerald-400">{ok}</p>}
          <div><label className={labelCls}>Assunto</label>
            <input className={inputCls} value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="Novidade no SLL Hub" /></div>
          <div><label className={labelCls}>Mensagem</label>
            <textarea rows={8} className={inputCls} value={message} maxLength={10000} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva o texto do e-mail. Quebras de linha são mantidas." /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className={labelCls}>Público</label>
              <select className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value as MktAudience)}>
                {Object.entries(AUDIENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div className="flex items-end text-[15px] text-slate-300">{count === null ? 'Destinatários: —' : 'Destinatários: ' + count}</div>
            {audience === 'store' && <StorePicker value={storeId} onChange={setStoreId} />}
          </div>
          {message.trim() && (
            <div><label className={labelCls}>Pré-visualização</label><EmailPreview subject={subject} message={message} /></div>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={busy !== null} className="px-3 py-2 rounded-lg text-[15px] text-slate-300 hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={!valid || busy !== null} onClick={test}
              className="px-3 py-2 rounded-lg text-[15px] font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50">
              {busy === 'test' ? 'Enviando teste...' : 'Enviar teste para mim'}
            </button>
            <button type="button" disabled={!valid || busy !== null || !count} onClick={send}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[15px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50">
              <Send className="w-4 h-4" /> {busy === 'send' ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </Modal>
      {dialog}
    </>
  );
}

function sendState(s: EmailSendRow): { label: string; cls: string } {
  if (s.bounced_at) return { label: 'Rejeitado', cls: 'bg-rose-500/20 text-rose-300' };
  if (s.complained_at) return { label: 'Spam', cls: 'bg-rose-500/20 text-rose-300' };
  if (s.status === 'failed') return { label: 'Falhou', cls: 'bg-rose-500/20 text-rose-300' };
  if (s.clicked_at) return { label: 'Clicou', cls: 'bg-emerald-500/20 text-emerald-300' };
  if (s.opened_at) return { label: 'Abriu', cls: 'bg-emerald-500/20 text-emerald-300' };
  if (s.delivered_at) return { label: 'Entregue', cls: 'bg-sky-500/20 text-sky-300' };
  return { label: 'Enviado', cls: 'bg-slate-700 text-slate-200' };
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<{ campaign: EmailCampaign; sends: EmailSendRow[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { getCampaignDetail(id).then(setD).catch((e) => setErr(e?.message || 'Erro ao carregar')); }, [id]);
  const c = d?.campaign;
  return (
    <Modal title={c?.subject || 'E-mail enviado'} onClose={onClose} wide>
      {err && <p className="text-[15px] text-rose-400">{err}</p>}
      {!d && !err && <p className="text-[15px] text-slate-400">Carregando...</p>}
      {c && d && (
        <div className="space-y-4">
          <p className="text-[13px] text-slate-400">{AUDIENCE_LABEL[c.audience]} · {fmt(c.created_at)}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Enviados" value={c.sent} />
            <Stat label="Entregues" value={c.delivered} sub={pct(c.delivered, c.sent)} />
            <Stat label="Abertos" value={c.opened} sub={pct(c.opened, c.sent)} />
            <Stat label="Clicados" value={c.clicked} sub={pct(c.clicked, c.sent)} />
            <Stat label="Rejeitados" value={c.bounced + c.failed} sub={pct(c.bounced + c.failed, c.total)} />
          </div>
          <div><label className={labelCls}>Como o e-mail foi enviado</label><EmailPreview subject={c.subject} message={c.message} /></div>
          <div>
            <label className={labelCls}>Destinatários</label>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-950 text-slate-400">
                  <tr><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Entregue</th><th className="px-3 py-2">Aberto</th><th className="px-3 py-2">Clicado</th></tr>
                </thead>
                <tbody>
                  {d.sends.map((s) => {
                    const st = sendState(s);
                    return (
                      <tr key={s.email} className="border-t border-slate-800 text-slate-200">
                        <td className="px-3 py-2">{s.email}</td>
                        <td className="px-3 py-2"><span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + st.cls}>{st.label}</span>{s.error && <span className="ml-2 text-rose-400">{s.error}</span>}</td>
                        <td className="px-3 py-2">{fmt(s.delivered_at)}</td>
                        <td className="px-3 py-2">{s.open_count > 0 ? fmt(s.opened_at) + ' (' + s.open_count + 'x)' : '—'}</td>
                        <td className="px-3 py-2">{s.click_count > 0 ? fmt(s.clicked_at) + ' (' + s.click_count + 'x)' : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function EmailCampaigns() {
  const [items, setItems] = useState<EmailCampaign[]>([]);
  const [days, setDays] = useState(30);
  const [m, setM] = useState<EmailMetrics>(EMPTY_EMAIL_METRICS);
  const [openNew, setOpenNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(() => {
    listCampaigns().then(setItems).catch((e) => setErr(e?.message || 'Erro ao carregar e-mails'));
    getEmailMetrics(days).then(setM).catch(() => {});
  }, [days]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-100"><Mail className="w-4 h-4" /> E-mails enviados</h2>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={inputCls + ' !w-auto'}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button type="button" onClick={() => { setOk(null); setOpenNew(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[15px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400">
            <Plus className="w-4 h-4" /> Novo e-mail
          </button>
        </div>
      </div>

      {err && <p className="text-[15px] text-rose-400">{err}</p>}
      {ok && <p className="text-[15px] text-emerald-400">{ok}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Enviados" value={m.sent} />
        <Stat label="Entregues" value={m.delivered} sub={pct(m.delivered, m.sent)} />
        <Stat label="Abertos" value={m.opened} sub={pct(m.opened, m.sent)} />
        <Stat label="Clicados" value={m.clicked} sub={pct(m.clicked, m.sent)} />
        <Stat label="Rejeitados" value={m.bounced + m.failed} sub={pct(m.bounced + m.failed, m.sent + m.failed)} />
        <Stat label="Spam" value={m.complained} sub={pct(m.complained, m.sent)} />
      </div>

      {items.length === 0 ? (
        <p className="text-[15px] text-slate-500">Nenhum e-mail enviado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-3 py-2">Assunto</th><th className="px-3 py-2">Público</th><th className="px-3 py-2">Data</th>
                <th className="px-3 py-2 text-right">Enviados</th><th className="px-3 py-2 text-right">Entregues</th>
                <th className="px-3 py-2 text-right">Abertos</th><th className="px-3 py-2 text-right">Cliques</th>
                <th className="px-3 py-2 text-right">Rejeitados</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-slate-800 bg-slate-900 text-slate-200">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="max-w-[260px] truncate font-semibold text-slate-100">{c.subject}</span>
                      <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + STATUS[c.status].cls}>{STATUS[c.status].label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{AUDIENCE_LABEL[c.audience]}</td>
                  <td className="px-3 py-2 text-slate-400">{fmt(c.created_at)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.sent}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.delivered} <span className="text-slate-500">({pct(c.delivered, c.sent)})</span></td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.opened} <span className="text-slate-500">({pct(c.opened, c.sent)})</span></td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.clicked} <span className="text-slate-500">({pct(c.clicked, c.sent)})</span></td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.bounced + c.failed}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" title="Ver e-mail" onClick={() => setDetailId(c.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-amber-400 hover:bg-slate-800">
                      <Eye className="h-4 w-4" /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[13px] text-slate-500">Entregues, abertos, cliques e rejeitados chegam pelo webhook do Resend e só valem para e-mails enviados depois que ele foi ativado.</p>

      {openNew && <NewEmailModal onClose={() => setOpenNew(false)} onSent={(msg) => { setOpenNew(false); setOk(msg); load(); }} />}
      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}