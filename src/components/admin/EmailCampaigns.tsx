import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, Mail, Plus, Send, Trash2, Upload, X } from 'lucide-react';
import { AUDIENCE_LABEL, type MktAudience } from '@/services/admin/marketingAdmin';
import {
  EMPTY_EMAIL_METRICS, countRecipients, getCampaignDetail, getEmailMetrics, listCampaigns, sendCampaign, uploadEmailImage,
  type EmailCampaign, type EmailMetrics, type EmailSendRow,
} from '@/services/admin/emailCampaigns';
import { BLOCK_LABEL, buildEmailHtml, buildEmailText, hasContent, newBlock, previewHtml, type BlockType, type EmailBlock } from '@/services/admin/emailBuilder';
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
const pct = (a: number, d: number) => (d > 0 ? ((a / d) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%');
const rateCls = (a: number, d: number) => {
  const r = d > 0 ? (a / d) * 100 : 0;
  return r >= 40 ? 'bg-emerald-500/20 text-emerald-300' : r >= 20 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-200';
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Modal({ title, onClose, size, children }: { title: string; onClose: () => void; size: 'md' | 'lg' | 'xl'; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const w = size === 'xl' ? 'max-w-6xl' : size === 'lg' ? 'max-w-4xl' : 'max-w-2xl';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div className={'my-6 w-full rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl ' + w} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="truncate text-base font-bold text-slate-100">{title}</h3>
          <button type="button" aria-label="Fechar" onClick={onClose} className="text-slate-400 hover:text-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function HtmlFrame({ html, height }: { html: string; height: number }) {
  return <iframe title="Pré-visualização" sandbox="" srcDoc={html} style={{ height }} className="w-full rounded-lg border-0 bg-white" />;
}

function BlockCard({ b, i, total, onChange, onMove, onRemove }: {
  b: EmailBlock; i: number; total: number;
  onChange: (p: Partial<EmailBlock>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [up, setUp] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (f: File | undefined) => {
    if (!f) return;
    setUp(true); setErr(null);
    try { onChange({ src: await uploadEmailImage(f) }); }
    catch (e: any) { setErr(e?.message || 'Erro no upload'); }
    finally { setUp(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold uppercase tracking-wide text-amber-400">{BLOCK_LABEL[b.type]}</span>
        <div className="flex items-center gap-1 text-slate-400">
          <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => onMove(-1)} className="p-1 hover:text-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" aria-label="Descer" disabled={i === total - 1} onClick={() => onMove(1)} className="p-1 hover:text-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
          <button type="button" aria-label="Remover" onClick={onRemove} className="p-1 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {b.type === 'heading' && <input className={inputCls} value={b.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Título do e-mail" />}
      {b.type === 'text' && <textarea rows={5} className={inputCls} value={b.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Escreva o texto. Quebras de linha são mantidas." />}
      {b.type === 'button' && (
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input className={inputCls} value={b.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Texto do botão" />
          <input className={inputCls} value={b.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://..." />
          <input type="color" aria-label="Cor do botão" value={b.color} onChange={(e) => onChange({ color: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950" />
        </div>
      )}
      {b.type === 'image' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input className={inputCls} value={b.src} onChange={(e) => onChange({ src: e.target.value })} placeholder="URL da imagem (https://...) ou envie um arquivo" />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" disabled={up} onClick={() => fileRef.current?.click()}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-[14px] font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">
              <Upload className="h-4 w-4" /> {up ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input className={inputCls} value={b.alt} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Texto alternativo (opcional)" />
            <input className={inputCls} value={b.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="Link ao clicar (opcional)" />
          </div>
          {err && <p className="text-[13px] text-rose-400">{err}</p>}
        </div>
      )}
      {b.type === 'divider' && <p className="text-[13px] text-slate-500">Linha horizontal.</p>}
    </div>
  );
}

function NewEmailModal({ onClose, onSent }: { onClose: () => void; onSent: (msg: string) => void }) {
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([newBlock('text')]);
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
      .then((c) => { if (alive) setCount(c); })
      .catch(() => { if (alive) setCount(null); });
    return () => { alive = false; };
  }, [audience, storeId]);

  const patch = (id: string, p: Partial<EmailBlock>) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const move = (i: number, d: -1 | 1) => setBlocks((bs) => {
    const a = [...bs]; const j = i + d;
    if (j < 0 || j >= a.length) return bs;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  });
  const add = (t: BlockType) => setBlocks((bs) => [...bs, newBlock(t)]);

  const valid = subject.trim() !== '' && hasContent(blocks) && (audience !== 'store' || !!storeId);
  const html = buildEmailHtml(blocks);

  const run = async (test: boolean) => {
    if (!test) {
      const c = count ?? 0;
      const yes = await confirm({
        title: 'Enviar e-mail',
        message: 'O e-mail "' + subject.trim() + '" será enviado para ' + c + (c === 1 ? ' destinatário' : ' destinatários') + '. Não dá para desfazer.',
        confirmLabel: 'Enviar',
      });
      if (!yes) return;
    }
    setBusy(test ? 'test' : 'send'); setErr(null); setOk(null);
    try {
      const r = await sendCampaign({ subject: subject.trim(), html, text: buildEmailText(blocks), audience, storeId, test });
      if (test) { setOk('Teste enviado para ' + r.to + '.'); setBusy(null); }
      else onSent('E-mail enviado: ' + (r.sent ?? 0) + ' enviados, ' + (r.failed ?? 0) + ' falhas.');
    } catch (e: any) { setErr(e?.message || 'Erro ao enviar'); setBusy(null); }
  };

  return (
    <>
      <Modal title="Novo e-mail" size="xl" onClose={busy ? () => {} : onClose}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            {err && <p className="text-[15px] text-rose-400">{err}</p>}
            {ok && <p className="text-[15px] text-emerald-400">{ok}</p>}
            <div><label className={labelCls}>Assunto</label>
              <input className={inputCls} value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="Novidade no SLL Hub" /></div>

            <div className="grid gap-3 md:grid-cols-2">
              <div><label className={labelCls}>Público</label>
                <select className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value as MktAudience)}>
                  {Object.entries(AUDIENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div className="flex items-end text-[15px] text-slate-300">{count === null ? 'Destinatários: —' : 'Destinatários: ' + count}</div>
              {audience === 'store' && <StorePicker value={storeId} onChange={setStoreId} />}
            </div>

            <div>
              <label className={labelCls}>Conteúdo</label>
              <p className="mb-2 text-[13px] text-slate-500">O logo no topo e a assinatura no final são adicionados automaticamente.</p>
              <div className="space-y-2">
                {blocks.map((b, i) => (
                  <BlockCard key={b.id} b={b} i={i} total={blocks.length}
                    onChange={(p) => patch(b.id, p)} onMove={(d) => move(i, d)}
                    onRemove={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(BLOCK_LABEL) as BlockType[]).map((t) => (
                  <button key={t} type="button" onClick={() => add(t)}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[13px] font-semibold text-slate-200 hover:bg-slate-800">
                    <Plus className="h-3.5 w-3.5" /> {BLOCK_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Pré-visualização</label>
            <HtmlFrame html={previewHtml(html)} height={560} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy !== null} className="px-3 py-2 rounded-lg text-[15px] text-slate-300 hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
          <button type="button" disabled={!valid || busy !== null} onClick={() => run(true)}
            className="px-3 py-2 rounded-lg text-[15px] font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50">
            {busy === 'test' ? 'Enviando teste...' : 'Enviar teste para mim'}
          </button>
          <button type="button" disabled={!valid || busy !== null || !count} onClick={() => run(false)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[15px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50">
            <Send className="w-4 h-4" /> {busy === 'send' ? 'Enviando...' : 'Enviar'}
          </button>
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
  const rej = c ? c.bounced + c.failed : 0;
  return (
    <Modal title={c?.subject || 'E-mail enviado'} size="lg" onClose={onClose}>
      {err && <p className="text-[15px] text-rose-400">{err}</p>}
      {!d && !err && <p className="text-[15px] text-slate-400">Carregando...</p>}
      {c && d && (
        <div className="space-y-4">
          <p className="text-[13px] text-slate-400">{AUDIENCE_LABEL[c.audience]} · {fmt(c.created_at)}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Stat label="Enviados" value={c.sent} />
            <Stat label="Entregues" value={c.delivered} sub={pct(c.delivered, c.sent)} />
            <Stat label="Abertos" value={c.opened} sub={pct(c.opened, c.sent)} />
            <Stat label="Clicados" value={c.clicked} sub={pct(c.clicked, c.sent)} />
            <Stat label="Rejeitados" value={rej} sub={pct(rej, c.total)} />
            <Stat label="Sucesso" value={pct(c.opened, c.sent)} sub="abertos ou clicados" />
          </div>
          <div>
            <label className={labelCls}>Como o e-mail foi enviado</label>
            {c.html
              ? <HtmlFrame html={previewHtml(c.html)} height={520} />
              : <div className="whitespace-pre-wrap rounded-lg bg-white p-4 text-[15px] text-slate-800">{c.message}</div>}
          </div>
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Stat label="Enviados" value={m.sent} />
        <Stat label="Entregues" value={m.delivered} sub={pct(m.delivered, m.sent)} />
        <Stat label="Abertos" value={m.opened} sub={pct(m.opened, m.sent)} />
        <Stat label="Clicados" value={m.clicked} sub={pct(m.clicked, m.sent)} />
        <Stat label="Rejeitados" value={m.bounced + m.failed} sub={pct(m.bounced + m.failed, m.sent + m.failed)} />
        <Stat label="Spam" value={m.complained} sub={pct(m.complained, m.sent)} />
        <Stat label="Taxa de sucesso" value={pct(m.opened, m.sent)} sub="abertos ou clicados" />
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
                <th className="px-3 py-2 text-right">Rejeitados</th><th className="px-3 py-2 text-right">Sucesso</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-slate-800 bg-slate-900 text-slate-200">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="max-w-[240px] truncate font-semibold text-slate-100">{c.subject}</span>
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
                  <td className="px-3 py-2 text-right"><span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + rateCls(c.opened, c.sent)}>{pct(c.opened, c.sent)}</span></td>
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
      <p className="text-[13px] text-slate-500">Taxa de sucesso = e-mails abertos ou clicados ÷ enviados. Entregues, abertos e cliques chegam pelo webhook do Resend.</p>

      {openNew && <NewEmailModal onClose={() => setOpenNew(false)} onSent={(msg) => { setOpenNew(false); setOk(msg); load(); }} />}
      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}