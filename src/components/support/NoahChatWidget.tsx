import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { buildSupportUrl } from '@/config/support';

const sb: any = supabase;

export interface SupportContext {
  storeName: string;
  storeId: string;
  currentRoute: string; // Ex: /dashboard/modules/vidlytics
  activeTab?: string; // Ex: comentarios
  appStatus?: boolean; // Aplicativo de videos ativo na loja
}

type Msg = { role: 'user' | 'assistant'; content: string; animate?: boolean };

const HIDDEN_ON = ['/admin-master', '/dashboard/onboarding', '/auth'];
const GREETING = 'Olá! Sou o Noah, assistente do SLL Hub. Como posso te ajudar agora?';
const FALLBACK = 'Não consegui responder agora. Tente de novo em instantes ou chame nosso time no WhatsApp.';
const MAX_LEN = 500;

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
  return <>{text.slice(0, n)}</>;
}

export default function NoahChatWidget() {
  const { pathname } = useLocation();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<string | undefined>((window as any).__sllActiveTab);
  const [appStatus, setAppStatus] = useState<boolean | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollDown = useCallback(() => endRef.current?.scrollIntoView({ block: 'end' }), []);

  useEffect(() => {
    const h = (e: Event) => setTab(((e as CustomEvent).detail as string) || undefined);
    window.addEventListener('sll:active-tab', h);
    return () => window.removeEventListener('sll:active-tab', h);
  }, []);

  useEffect(() => {
    if (!open || !storeId) return;
    let alive = true;
    sb.from('store_settings_public')
      .select('app_enabled,widget_enabled')
      .eq('store_id', storeId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (alive && data) setAppStatus(data.app_enabled !== false && data.widget_enabled !== false);
      });
    return () => { alive = false; };
  }, [open, storeId]);

  useEffect(() => { if (open) { scrollDown(); inputRef.current?.focus(); } }, [open, messages, loading, scrollDown]);

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;

  const inVidlytics = pathname.startsWith('/dashboard/modules/vidlytics');
  const whatsapp = buildSupportUrl(store?.name, storeId ?? store?.id);

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
    const history = next.slice(1).slice(-12).map(({ role, content }) => ({ role, content }));

    let reply = FALLBACK;
    try {
      const { data, error } = await supabase.functions.invoke('noah-support', { body: { messages: history, context } });
      if (!error && data?.reply) reply = String(data.reply);
    } catch { /* usa o texto padrao */ }

    setMessages((m) => [...m, { role: 'assistant', content: reply, animate: true }]);
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

        <div className="flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                  m.role === 'user' ? 'rounded-br-sm bg-[#0094eb] text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800'
                }`}
              >
                {m.animate ? <Typewriter text={m.content} onTick={scrollDown} /> : m.content}
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
          <p className="text-center text-[11px] text-slate-400">
            Ainda com dúvidas?{' '}
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 hover:underline">
              Chamar no WhatsApp
            </a>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#0094eb] text-white">
          {open ? <X className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
        </span>
      </button>
    </div>
  );
}