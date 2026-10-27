import { useEffect, useRef, useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { AppModal } from '@/components/common/AppModal';
import { supabaseLiveCommerce as supabase } from '@/services/supabaseClients';
import { liveStore } from '@/components/live/LiveTemplatesPage';

type Channel = 'whatsapp' | 'email';
type Kind = 'before_24h' | 'on_start';
type Tpl = { subject: string; body: string };

const DEFAULTS: Record<string, Tpl> = {
  'whatsapp:before_24h': { subject: '', body: 'Ol\u00e1, {nome}! Amanh\u00e3 \u00e0s {hora} tem live na {loja}: {titulo_live}. Garanta seu lugar: {link}' },
  'whatsapp:on_start': { subject: '', body: '{nome}, estamos ao vivo agora na {loja}! {titulo_live}. Entre aqui: {link}' },
  'email:before_24h': { subject: 'Amanh\u00e3 tem live: {titulo_live}', body: 'Ol\u00e1, {nome}!\n\nAmanh\u00e3, {data} \u00e0s {hora}, a {loja} far\u00e1 uma live: {titulo_live}.\n\nGaranta seu lugar: {link}' },
  'email:on_start': { subject: 'Estamos ao vivo: {titulo_live}', body: 'Ol\u00e1, {nome}!\n\nA live "{titulo_live}" da {loja} come\u00e7ou agora.\n\nEntre: {link}' },
};
const VARS = ['{nome}', '{loja}', '{titulo_live}', '{data}', '{hora}', '{link}'];
const SAMPLE: Record<string, string> = {
  nome: 'Maria', loja: 'Sua Loja', titulo_live: 'Especial Anivers\u00e1rio', data: '28/10', hora: '19:00', link: 'https://sualoja.com.br/?sll_live=...',
};
const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k) => SAMPLE[k] ?? m);
const key = (c: Channel, k: Kind) => c + ':' + k;
const field = 'w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-red-100';

export default function NotifyTemplatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [kind, setKind] = useState<Kind>('before_24h');
  const [saved, setSaved] = useState<Record<string, Tpl>>({});
  const [draft, setDraft] = useState<Record<string, Tpl>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const storeId = liveStore.id;
    setMsg('');
    if (!storeId) return;
    (supabase as any).schema('live_commerce').from('live_notify_templates')
      .select('channel,kind,subject,body').eq('store_id', storeId)
      .then(({ data }: any) => {
        const m: Record<string, Tpl> = {};
        (data || []).forEach((r: any) => { m[key(r.channel, r.kind)] = { subject: r.subject || '', body: r.body || '' }; });
        setSaved(m);
        setDraft({});
      });
  }, [open]);

  const k = key(channel, kind);
  const cur: Tpl = draft[k] || saved[k] || DEFAULTS[k];
  const isCustom = !!saved[k];
  const set = (p: Partial<Tpl>) => { setMsg(''); setDraft((d) => ({ ...d, [k]: { ...cur, ...p } })); };

  const insertVar = (v: string) => {
    const el = ta.current;
    if (!el) { set({ body: cur.body + v }); return; }
    const s = el.selectionStart ?? cur.body.length;
    const e = el.selectionEnd ?? s;
    set({ body: cur.body.slice(0, s) + v + cur.body.slice(e) });
    setTimeout(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length); }, 0);
  };

  const save = async () => {
    const storeId = liveStore.id;
    if (!storeId) { setMsg('Loja n\u00e3o identificada. Recarregue a p\u00e1gina.'); return; }
    if (!cur.body.trim()) { setMsg('A mensagem n\u00e3o pode ficar vazia.'); return; }
    setBusy(true);
    const { error } = await (supabase as any).schema('live_commerce').from('live_notify_templates').upsert(
      { store_id: storeId, channel, kind, subject: channel === 'email' ? cur.subject : '', body: cur.body, updated_at: new Date().toISOString() },
      { onConflict: 'store_id,channel,kind' },
    );
    setBusy(false);
    if (error) { setMsg('N\u00e3o foi poss\u00edvel salvar. Tente novamente.'); return; }
    setSaved((s) => ({ ...s, [k]: { subject: channel === 'email' ? cur.subject : '', body: cur.body } }));
    setDraft((d) => { const n = { ...d }; delete n[k]; return n; });
    setMsg('Template salvo.');
  };

  const tab = (on: boolean) => 'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ' + (on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700');
  const btnCancel = 'flex-1 cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50';
  const btnMain = 'flex-1 cursor-pointer rounded-2xl bg-[#DC2626] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#B91C1C] disabled:opacity-50';

  return (
    <AppModal
      open={open}
      title={'TEMPLATES DA R\u00c9GUA'}
      maxWidth="max-w-xl"
      busy={busy}
      onClose={onClose}
      footer={<><button type="button" className={btnCancel} onClick={onClose}>Fechar</button><button type="button" disabled={busy} className={btnMain} onClick={save}>{busy ? 'Salvando...' : 'Salvar template'}</button></>}
    >
      <div className="w-full space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <button type="button" className={tab(channel === 'whatsapp')} onClick={() => setChannel('whatsapp')}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</button>
          <button type="button" className={tab(channel === 'email')} onClick={() => setChannel('email')}><Mail className="h-3.5 w-3.5" /> E-mail</button>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <button type="button" className={tab(kind === 'before_24h')} onClick={() => setKind('before_24h')}>{'Lembrete 24h antes'}</button>
          <button type="button" className={tab(kind === 'on_start')} onClick={() => setKind('on_start')}>{'Estamos ao vivo'}</button>
        </div>

        {channel === 'email' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Assunto</label>
            <input className={field} value={cur.subject} maxLength={150} onChange={(e) => set({ subject: e.target.value })} />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Mensagem</label>
          <textarea ref={ta} rows={6} className={field + ' resize-none'} value={cur.body} maxLength={2000} onChange={(e) => set({ body: e.target.value })} />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {VARS.map((v) => (
              <button key={v} type="button" onClick={() => insertVar(v)} className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">{v}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">{'Pr\u00e9via (com dados de exemplo)'}</label>
          <div className="whitespace-pre-wrap rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-3 text-xs text-slate-800">
            {channel === 'email' && <b className="mb-1 block">{fill(cur.subject)}</b>}
            {fill(cur.body)}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{isCustom ? 'Template personalizado' : 'Template padr\u00e3o'}</span>
          <button type="button" className="cursor-pointer font-bold text-[#DC2626] hover:underline" onClick={() => set(DEFAULTS[k])}>{'Restaurar padr\u00e3o'}</button>
        </div>
        {msg && <p className="text-xs font-semibold text-slate-700">{msg}</p>}
        <p className="text-[11px] text-amber-700">{'Aten\u00e7\u00e3o: o envio autom\u00e1tico ainda n\u00e3o est\u00e1 ativo. Estes textos ser\u00e3o usados quando o disparo for implantado.'}</p>
      </div>
    </AppModal>
  );
}