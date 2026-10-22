import { getModuleAppEnabled } from '@/services/moduleAppService';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, MessageCircle, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { buildSupportUrl } from '@/config/support';
import { submitVote } from '@/services/feedback';

const sb: any = supabase;

export interface SupportContext {
  storeName: string;
  storeId: string;
  currentRoute: string; // Ex: /dashboard/modules/vidlytics
  activeTab?: string; // Ex: comentarios
  appStatus?: boolean; // Aplicativo de videos ativo na loja
}

type Msg = { role: 'user' | 'assistant'; content: string; cta?: 'limit'; actions?: { type: string; label: string; href: string }[]; animate?: boolean; id?: string; question?: string; vote?: 'up' | 'down' };

const HIDDEN_ON = ['/admin-master', '/dashboard/onboarding', '/auth'];
const GREETING = 'Olá! Sou o Noah, assistente do SLL Hub. Como posso te ajudar agora?';
const FALLBACK = 'Não consegui responder agora. Tente de novo em instantes ou chame nosso time no WhatsApp.';
const MAX_LEN = 500;
const DEFAULT_ACTIONS = [
  { type: 'upgrade', label: 'Fazer upgrade de plano', href: '/dashboard/assinaturas' },
  { type: 'recharge', label: 'Comprar pacote extra', href: '/dashboard/assinaturas?addon=ai_messages' },
];

function Avatar({ size, className = '' }: { size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span style={{ width: size, height: size }} className={`flex items-center justify-center rounded-full bg-[#0094eb] text-white ${className}`}>
        <MessageCircle style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }
  return (
    <img
      src="/assets/noah-suporte.png"
      alt="Noah"
      style={{ width: size, height: size }}
      className={`bg-transparent object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function Typewriter({ text, onTick }: { text: string; onTick: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => {
      setN((v) => Math.min(text.length, v + 3));
      onTick();
    }, 15);
    return () => clearTimeout(t);
  }, [n, text, onTick]);
  return <Md text={text.slice(0, n)} />;
}

function Md({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }: any) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
        ol: ({ children }: any) => <ol className="mb-2 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>,
        li: ({ children }: any) => <li className="pl-0.5">{children}</li>,
        strong: ({ children }: any) => <strong className="font-semibold text-slate-900">{children}</strong>,
        a: ({ children, href }: any) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0094eb] underline">{children}</a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function waUrl(cfg: any, name?: string | null, id?: string | null): string {
  const num = String(cfg.whatsapp_number ?? '').replace(/\D/g, '');
  const text = String(cfg.whatsapp_message ?? '').replace(/\{loja\}/g, name ?? '').replace(/\{id\}/g, id ?? '');
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export default function NoahChatWidget() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<string | undefined>((window as any).__sllActiveTab);
  const [appStatus, setAppStatus] = useState<boolean | undefined>(undefined);
  const [cfg, setCfg] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollDown = useCallback(() => endRef.current?.scrollIntoView({ block: 'end' }), []);
  useEffect(() => {
    let alive = true;
    sb.rpc('noah_public_config').then(({ data }: any) => { if (alive && data) setCfg(data); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const h = (e: Event) => setTab(((e as CustomEvent).detail as string) || undefined);
    window.addEventListener('sll:active-tab', h);
    return () => window.removeEventListener('sll:active-tab', h);
  }, []);

  useEffect(() => {
    if (!open || !storeId) return;
    let alive = true;
    getModuleAppEnabled(storeId, window.location.pathname.includes('live') ? 'live_commerce' : 'vidlytics')
      .then((v) => { if (alive) setAppStatus(v); });
    return () => { alive = false; };
  }, [open, storeId]);

  useEffect(() => { if (open) { scrollDown(); inputRef.current?.focus(); } }, [open, messages, loading, scrollDown]);

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;

  const inVidlytics = pathname.startsWith('/dashboard/modules/vidlytics');
  const aiOff = !!cfg && cfg.ai_enabled === false;
  const whatsapp = cfg?.whatsapp_number ? waUrl(cfg, store?.name, storeId ?? store?.id) : buildSupportUrl(store?.name, storeId ?? store?.id);

  const vote = async (idx: number, v: 'up' | 'down') => {
    const m = messages[idx];
    if (!m?.id || !storeId || m.vote === v) return;
    const prev = m.vote;
    setMessages((all) => all.map((x, k) => (k === idx ? { ...x, vote: v } : x)));
    try {
      await submitVote({ type: 'noah', referenceId: m.id, vote: v, storeId, comment: v === 'down' ? m.question : undefined });
    } catch {
      setMessages((all) => all.map((x, k) => (k === idx ? { ...x, vote: prev } : x)));
    }
  };

  const send = async () => {
    const text = input.trim().slice(0, MAX_LEN);
    if (!text || loading || !storeId) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    const context: SupportContext = {
      storeName: store?.name ?? '',
      storeId,
      currentRoute: pathname,
      activeTab: inVidlytics ? tab : undefined,
      appStatus,
    };
    const history = next.slice(1).slice(-6).map(({ role, content }) => ({ role, content }));

    let reply = FALLBACK;
    let limit = false;
    let free = false;
    let actions: Msg['actions'];
    try {
      const { data, error } = await supabase.functions.invoke('noah-support', { body: { messages: history, context } });
      if (!error && data?.reply) { reply = String(data.reply); limit = data.limit_reached === true; free = data.free === true; actions = Array.isArray(data.actions) ? data.actions.filter((a: any) => typeof a?.href === 'string' && a.href.startsWith('/')) : undefined; }
      else if (error) console.error('noah-support', error, await (error as any).context?.text?.().catch(() => ''));
    } catch { /* usa o texto padrao */ }

    setMessages((m) => [...m, { role: 'assistant', content: reply, animate: true, cta: limit ? 'limit' : undefined, actions, id: reply === FALLBACK || limit || free ? undefined : crypto.randomUUID(), question: text }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end gap-3">
      <div
        role="dialog"
        aria-label="Chat com o Noah"
        className={`${open ? 'flex' : 'hidden'} h-[500px] max-h-[calc(100vh-13rem)] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div className="flex items-center gap-3 bg-[#0094eb] px-4 py-3 text-white">
          <Avatar size={36} className="shrink-0 rounded-full bg-white p-0.5" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">Noah • Assistente SLL</p>
            <p className="flex items-center gap-1.5 text-[11px] text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online
            </p>
          </div>
          <button type="button" aria-label="Fechar chat" onClick={() => setOpen(false)} className="cursor-pointer rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-smooth bg-white px-4 py-4 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] break-words rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                  m.role === 'user' ? 'rounded-br-sm bg-[#0094eb] text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800'
                }`}
              >
                {m.animate ? <Typewriter text={m.content} onTick={scrollDown} /> : m.role === 'assistant' ? <Md text={m.content} /> : m.content}
                {m.cta === 'limit' && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {(m.actions?.length ? m.actions : DEFAULT_ACTIONS).map((a, k) => (
                      <button key={a.type} type="button" onClick={() => { setOpen(false); navigate(a.href); }}
                        className={k === 0
                          ? 'cursor-pointer rounded-lg bg-[#0094eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#007fcc]'
                          : 'cursor-pointer rounded-lg border border-[#0094eb] px-3 py-1.5 text-xs font-semibold text-[#0094eb] hover:bg-sky-50'}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
                {m.id && (
                  <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-200 pt-1.5">
                    <span className="mr-auto text-[11px] text-slate-400">{m.vote ? 'Obrigado!' : 'Isso ajudou?'}</span>
                    <button type="button" aria-label="Resposta útil" onClick={() => void vote(i, 'up')}
                      className={`cursor-pointer rounded-md p-1 ${m.vote === 'up' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'}`}>
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="Resposta não útil" onClick={() => void vote(i, 'down')}
                      className={`cursor-pointer rounded-md p-1 ${m.vote === 'down' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-700'}`}>
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-3">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="space-y-2 border-t border-slate-100 bg-white px-3 pb-3 pt-2">
          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              maxLength={MAX_LEN}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva sua dúvida..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0094eb]"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#0094eb] text-white hover:bg-[#007fcc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <p className="text-center text-xs text-slate-400">
            Ainda com dúvidas?{' '}
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 hover:underline">
              Chamar no WhatsApp
            </a>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { if (cfg && cfg.ai_enabled === false) { window.open(whatsapp, '_blank', 'noopener,noreferrer'); return; } setOpen((v) => !v); }}
        aria-label={open ? 'Fechar chat com o Noah' : 'Abrir chat com o Noah'}
        aria-expanded={open}
        className="group relative flex h-[90px] w-[90px] items-center justify-center rounded-full transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        {!open && (
          <span role="tooltip" className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
            Fale com o Noah
          </span>
        )}
        <Avatar size={90} className="drop-shadow-lg" />
        <span className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-white ${aiOff ? 'bg-[#25D366]' : 'bg-[#0094eb]'}`}>
          {aiOff ? <WaIcon /> : open ? <X className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
        </span>
      </button>
    </div>
  );
}