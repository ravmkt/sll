import { useCallback, useEffect, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { AUDIENCE_LABEL, type MktAudience } from '@/services/admin/marketingAdmin';
import { countRecipients, listCampaigns, sendCampaign, type EmailCampaign } from '@/services/admin/emailCampaigns';
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
const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function EmailCampaigns() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<MktAudience>('all');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<'send' | 'test' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [items, setItems] = useState<EmailCampaign[]>([]);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(() => {
    listCampaigns().then(setItems).catch((e) => setErr(e?.message || 'Erro ao carregar campanhas'));
  }, []);
  useEffect(() => { load(); }, [load]);

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
    } catch (e: any) {
      setErr(e?.message || 'Erro ao enviar o teste');
    } finally { setBusy(null); }
  };

  const send = async () => {
    const n = count ?? 0;
    const okConfirm = await confirm({
      title: 'Enviar campanha',
      message: 'O e-mail "' + subject.trim() + '" será enviado para ' + n + (n === 1 ? ' destinatário' : ' destinatários') + '. Não dá para desfazer.',
      confirmLabel: 'Enviar',
    });
    if (!okConfirm) return;
    setBusy('send'); setErr(null); setOk(null);
    try {
      const r = await sendCampaign({ subject, message, audience, storeId, test: false });
      setOk('Campanha enviada: ' + (r.sent ?? 0) + ' enviados, ' + (r.failed ?? 0) + ' falhas.');
      setSubject(''); setMessage('');
      load();
    } catch (e: any) {
      setErr(e?.message || 'Erro ao enviar a campanha');
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-100"><Mail className="w-4 h-4" /> Nova campanha de e-mail</h2>
      {err && <p className="text-[15px] text-rose-400">{err}</p>}
      {ok && <p className="text-[15px] text-emerald-400">{ok}</p>}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><label className={labelCls}>Assunto</label>
            <input className={inputCls} value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="Novidade no SLL Hub" /></div>
          <div className="md:col-span-2"><label className={labelCls}>Mensagem</label>
            <textarea rows={8} className={inputCls} value={message} maxLength={10000} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva o texto do e-mail. Quebras de linha são mantidas." /></div>
          <div><label className={labelCls}>Público</label>
            <select className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value as MktAudience)}>
              {Object.entries(AUDIENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="flex items-end text-[15px] text-slate-300">
            {count === null ? 'Destinatários: —' : 'Destinatários: ' + count}
          </div>
          {audience === 'store' && <StorePicker value={storeId} onChange={setStoreId} />}
        </div>

        {message.trim() && (
          <div>
            <label className={labelCls}>Pré-visualização</label>
            <div className="rounded-lg bg-white p-4 text-[15px] leading-relaxed text-slate-800">
              <p className="mb-1 text-xs font-bold text-slate-400">Assunto: {subject || '—'}</p>
              <p className="whitespace-pre-wrap">{message}</p>
              <hr className="my-4 border-slate-200" />
              <p className="text-xs text-slate-500">Equipe SLL Hub</p>
              <p className="text-xs text-slate-500 underline">Cancelar inscrição</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={!valid || busy !== null} onClick={test}
            className="px-3 py-2 rounded-lg text-[15px] font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50">
            {busy === 'test' ? 'Enviando teste...' : 'Enviar teste para mim'}
          </button>
          <button type="button" disabled={!valid || busy !== null || !count} onClick={send}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[15px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50">
            <Send className="w-4 h-4" /> {busy === 'send' ? 'Enviando...' : 'Enviar campanha'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[15px] font-bold text-slate-100">Histórico</h3>
        {items.length === 0 && <p className="text-[15px] text-slate-500">Nenhuma campanha enviada.</p>}
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-slate-100 truncate">{c.subject}</p>
                <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + STATUS[c.status].cls}>{STATUS[c.status].label}</span>
              </div>
              <p className="text-[13px] text-slate-400">{AUDIENCE_LABEL[c.audience]} · {fmt(c.created_at)}</p>
            </div>
            <div className="text-[13px] text-slate-300 tabular-nums">{c.sent} enviados · {c.failed} falhas · {c.total} total</div>
          </div>
        ))}
      </div>
      {dialog}
    </div>
  );
}