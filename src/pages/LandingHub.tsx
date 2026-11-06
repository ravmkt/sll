import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { buildTabs, featuredId, fetchLandingData, planFeatures, EMPTY_LANDING, type LandingData } from "@/lib/landingConfig";
import {
  ArrowRight, BarChart3, Check, ChevronDown, Clock, Code2, Eye, Heart, Lock, Menu,
  MessageCircle, MousePointerClick, Play, Radio, ShieldCheck, ShoppingBag, Sparkles,
  TrendingUp, X, Zap,
} from "lucide-react";

declare global {
  interface Window { dataLayer?: Record<string, unknown>[] }
}

/* ---------- helpers ---------- */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const BRL2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function track(event: string, params: Record<string, unknown> = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const NAV = [
  { id: "modulos", label: "Módulos" },
  { id: "formatos", label: "Formatos" },
  { id: "calculadora", label: "Calculadora" },
  { id: "precos", label: "Preços" },
  { id: "faq", label: "FAQ" },
];

const TILES = [
  "from-rose-300 to-orange-200",
  "from-sky-300 to-indigo-300",
  "from-emerald-300 to-teal-200",
  "from-fuchsia-300 to-pink-200",
  "from-amber-300 to-yellow-200",
  "from-violet-300 to-sky-200",
];

function Section({ id, className = "", children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-24 px-4 py-16 md:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <span className="text-xs font-bold uppercase tracking-widest text-sky-600">{eyebrow}</span>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-slate-600">{sub}</p>}
    </div>
  );
}

function Cta({ to, children, event, variant = "primary", className = "" }: {
  to: string; children: ReactNode; event: string; variant?: "primary" | "ghost"; className?: string;
}) {
  const styles = variant === "primary"
    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600"
    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100";
  return (
    <Link
      to={to}
      onClick={() => track("click_cta", { cta: event, destination: to })}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ---------- header ---------- */
function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const go = (id: string) => { setOpen(false); scrollToId(id); track("click_nav", { target: id }); };

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition ${scrolled ? "border-slate-200 bg-white/80 shadow-sm" : "border-transparent bg-white/50"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="SLL Hub"><img src="/assets/sll-hub-logo-wide.png" alt="SLL Hub" className="h-8 w-auto" width={140} height={32} /></Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} className="text-sm font-medium text-slate-600 transition hover:text-sky-600">{n.label}</button>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <Link to="/auth" className="text-sm font-semibold text-slate-700 hover:text-sky-600">Entrar</Link>
          <Cta to="/auth?mode=signup" event="header_register" className="!px-5 !py-2.5">Começar Grátis</Cta>
        </div>
        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} className="rounded-lg px-3 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-50">{n.label}</button>
            ))}
            <Link to="/auth" className="rounded-lg px-3 py-3 text-base font-semibold text-slate-700">Entrar</Link>
            <Cta to="/auth?mode=signup" event="header_mobile_register" className="mt-2">Começar Grátis</Cta>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------- hero ---------- */
function PhoneMockup() {
  const [viewers, setViewers] = useState(1284);
  useEffect(() => {
    const t = setInterval(() => setViewers((v) => Math.max(900, v + Math.round((Math.random() - 0.4) * 14))), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative mx-auto w-[280px]">
      <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-tr from-sky-200/70 via-emerald-100/60 to-transparent blur-3xl" />
      <div className="relative h-[580px] rounded-[3rem] bg-slate-900 p-3 shadow-2xl shadow-slate-900/30">
        <div className="absolute left-1/2 top-4 z-30 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
        <div className="relative h-full overflow-hidden rounded-[2.4rem] bg-gradient-to-b from-rose-300 via-fuchsia-300 to-indigo-400">
          <video
            src="/assets/landing/hero-demo.mp4" autoPlay muted loop playsInline preload="metadata"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          <div className="absolute inset-x-4 top-10 z-10 flex gap-1">
            <span className="h-0.5 flex-1 rounded bg-white" /><span className="h-0.5 flex-1 rounded bg-white/40" /><span className="h-0.5 flex-1 rounded bg-white/40" />
          </div>
          <div className="absolute left-4 top-14 z-10 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
            <Eye className="h-3 w-3" /> {viewers.toLocaleString("pt-BR")} assistindo agora
          </div>
          <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-4 text-white">
            <div className="flex flex-col items-center text-[10px]"><Heart className="h-6 w-6" />12,4k</div>
            <div className="flex flex-col items-center text-[10px]"><MessageCircle className="h-6 w-6" />386</div>
          </div>
          <div className="absolute inset-x-3 bottom-4 z-10 rounded-2xl bg-white p-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-200 to-rose-200"><ShoppingBag className="h-6 w-6 text-rose-500" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">Vestido Midi Linho Bege</p>
                <p className="text-[10px] text-slate-400 line-through">R$ 249,90</p>
                <p className="text-sm font-extrabold text-emerald-600">R$ 189,90</p>
              </div>
            </div>
            <div className="relative mt-2.5">
              <span className="absolute inset-0 animate-ping rounded-xl bg-emerald-400/40" />
              <button className="relative w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white">Comprar agora</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700">
            🟢 Plataforma de Vídeo Commerce para E-commerce
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-6xl">
            Transforme os visitantes da sua loja em compradores usando o poder do{" "}
            <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">vídeo.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            Vídeos shoppable nos produtos, carrossel de stories e lives com compra direta na tela.
            Compatível com qualquer plataforma via script leve ou Google Tag Manager.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Cta to="/auth?mode=signup" event="hero_trial" className="text-base">Testar 7 dias grátis <ArrowRight className="h-4 w-4" /></Cta>
            <button
              onClick={() => { track("click_cta", { cta: "hero_formats" }); scrollToId("formatos"); }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <Play className="h-4 w-4 text-sky-600" /> Ver formatos em ação
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">Sem cartão de crédito · Instalação em 5 minutos · Cancele quando quiser</p>
        </div>
        <PhoneMockup />
      </div>
    </section>
  );
}

/* ---------- resultados ---------- */
function Stats() {
  const items = [
    { icon: TrendingUp, value: "+28%", label: "de aumento médio na taxa de conversão da loja" },
    { icon: Clock, value: "4.2x", label: "mais tempo de permanência nas páginas com vídeo" },
    { icon: Zap, value: "0 ms", label: "de bloqueio no carregamento (script assíncrono)" },
    { icon: MousePointerClick, value: "1 clique", label: "do vídeo direto para o checkout" },
  ];
  return (
    <section className="px-4 pb-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={value} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600"><Icon className="h-5 w-5" /></div>
            <p className="text-3xl font-extrabold text-slate-900">{value}</p>
            <p className="mt-1 text-sm text-slate-600">{label}</p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-3 max-w-6xl text-center text-[11px] text-slate-400">Resultados médios; variam conforme loja, nicho e volume de tráfego.</p>
    </section>
  );
}

/* ---------- módulos ---------- */
function useLanding() {
  const [data, setData] = useState<LandingData>(EMPTY_LANDING);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let alive = true;
    fetchLandingData()
      .then((d) => { if (alive) { setData(d); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, []);
  return { data, status };
}

function Modules() {
  const { data } = useLanding();
  const cards = data.config.cards ?? {};
  const all = [
    {
      key: "vidlytics" as const, logo: "/assets/vidlytics-logo-wide.png", name: "Vidlytics", to: "/vidlytics", icon: Play,
      text: "Stories shoppable na home, vídeos flutuantes em páginas de produto e métricas de retenção segundo a segundo.",
      bullets: ["Stories, carrossel, grade e widget flutuante", "Analytics: plays, retenção, CTR e conversão"],
    },
    {
      key: "stream_sell" as const, logo: "/assets/stream-sell-logo-wide.png", name: "Stream Sell", to: "/stream-sell", icon: Radio,
      text: "Transmissões ao vivo com catálogo integrado, chat moderado e compra em 1 clique durante a live.",
      bullets: ["Produtos vinculados e sincronizados na live", "Chat em tempo real e checkout na transmissão"],
    },
  ];
  const mods = all.filter((m) => cards[m.key] !== false);
  return (
    <Section id="modulos">
      <SectionTitle eyebrow="O ecossistema" title="Dois módulos que se completam" sub="Use separado ou em combo: o vídeo atrai e a live converte, no mesmo painel." />
      <div className={`grid gap-6 ${mods.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-xl"}`}>
        {mods.map((m) => (
          <article key={m.name} className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <img src={m.logo} alt={m.name} loading="lazy" className="h-9 w-auto" />
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-600"><m.icon className="h-5 w-5" /></span>
            </div>
            <p className="mt-6 text-slate-700">{m.text}</p>
            <ul className="mt-5 space-y-2">
              {m.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{b}</li>
              ))}
            </ul>
            <Link to={m.to} onClick={() => track("click_module", { module: m.name })} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-700">
              Conhecer {m.name} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </article>
        ))}
      </div>
    </Section>
  );
}
/* ---------- formatos ---------- */
function Browser({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <div className="ml-3 h-5 flex-1 rounded-md bg-white px-2 text-[10px] leading-5 text-slate-400">sualoja.com.br</div>
      </div>
      <div className="relative min-h-[340px] p-5">{children}</div>
    </div>
  );
}

const Skel = ({ className = "" }: { className?: string }) => <div className={`rounded-lg bg-slate-100 ${className}`} />;

function StoriesMock() {
  const names = ["Novidades", "Vestidos", "Looks", "Promo", "Verão", "Bastidores"];
  return (
    <Browser>
      <div className="flex gap-4 overflow-hidden">
        {names.map((n, i) => (
          <div key={n} className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="rounded-full bg-gradient-to-tr from-sky-500 to-emerald-400 p-[3px]">
              <div className="rounded-full bg-white p-[2px]"><div className={`h-14 w-14 rounded-full bg-gradient-to-br ${TILES[i]}`} /></div>
            </div>
            <span className="text-[10px] font-medium text-slate-600">{n}</span>
          </div>
        ))}
      </div>
      <Skel className="mt-6 h-32 w-full" />
      <div className="mt-4 grid grid-cols-3 gap-3"><Skel className="h-20" /><Skel className="h-20" /><Skel className="h-20" /></div>
    </Browser>
  );
}

function CarouselMock() {
  return (
    <Browser>
      <Skel className="mb-4 h-4 w-40" />
      <div className="flex gap-3 overflow-hidden">
        {TILES.slice(0, 5).map((t, i) => (
          <div key={i} className={`relative aspect-[9/16] w-28 shrink-0 rounded-2xl bg-gradient-to-br ${t}`}>
            <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/80"><Play className="h-3.5 w-3.5 text-slate-800" /></span>
            <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-800">R$ {89 + i * 30},90</span>
          </div>
        ))}
      </div>
    </Browser>
  );
}

function FloatingMock() {
  return (
    <Browser>
      <div className="grid grid-cols-2 gap-4">
        <Skel className="h-52" />
        <div className="space-y-3"><Skel className="h-5 w-3/4" /><Skel className="h-4 w-1/3" /><Skel className="h-3 w-full" /><Skel className="h-3 w-5/6" /><Skel className="h-10 w-full" /></div>
      </div>
      <div className="absolute bottom-4 right-4 w-24">
        <div className="relative aspect-[9/16] rounded-2xl bg-gradient-to-br from-rose-300 to-fuchsia-300 shadow-xl ring-4 ring-white">
          <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/40 text-white"><X className="h-3 w-3" /></span>
          <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85"><Play className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </Browser>
  );
}

function GridMock() {
  return (
    <Browser>
      <Skel className="mb-4 h-4 w-48" />
      <div className="grid grid-cols-3 gap-3">
        {TILES.map((t, i) => (
          <div key={i} className={`relative aspect-square rounded-xl bg-gradient-to-br ${t}`}>
            <span className="absolute bottom-1.5 left-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/85"><Play className="h-3 w-3" /></span>
          </div>
        ))}
      </div>
    </Browser>
  );
}

function LiveMock() {
  const chat = [["Ana", "Quero o tamanho M!"], ["Bia", "Lindo demais 😍"], ["Carla", "Qual o frete?"], ["Dani", "Comprei! ✅"]];
  return (
    <Browser>
      <div className="grid grid-cols-[1fr_130px] gap-3">
        <div>
          <div className="relative aspect-video rounded-xl bg-gradient-to-br from-indigo-300 via-fuchsia-300 to-rose-300">
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white"><Radio className="h-3 w-3" /> AO VIVO</span>
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/45 px-2 py-0.5 text-[10px] text-white"><Eye className="h-3 w-3" /> 842</span>
          </div>
          <div className="mt-3 flex gap-2">
            {TILES.slice(0, 3).map((t, i) => (
              <div key={i} className="flex-1 rounded-lg border border-slate-200 p-1.5">
                <div className={`aspect-square rounded bg-gradient-to-br ${t}`} />
                <p className="mt-1 text-[10px] font-bold text-emerald-600">R$ {79 + i * 40}</p>
                <button className="mt-1 w-full rounded bg-emerald-500 py-1 text-[9px] font-bold text-white">Comprar</button>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-slate-50 p-2">
          {chat.map(([n, m]) => (<p key={n} className="text-[10px] leading-tight text-slate-600"><b className="text-slate-800">{n}</b> {m}</p>))}
        </div>
      </div>
    </Browser>
  );
}

const FORMATS = [
  { id: "stories", title: "Stories por Bolhas", tag: "Destaque", desc: "Círculos interativos no topo do site, no estilo Instagram, que abrem vídeos shoppable em tela cheia.", Mock: StoriesMock },
  { id: "carrossel", title: "Carrossel de Vídeos", tag: "Home e categorias", desc: "Grid horizontal dinâmico para a página inicial ou páginas de categoria, com preço e botão de compra.", Mock: CarouselMock },
  { id: "bubble", title: "Widget Flutuante", tag: "Mobile e desktop", desc: "Miniatura expansível no canto da tela que acompanha o visitante e leva direto ao produto.", Mock: FloatingMock },
  { id: "grid", title: "Grade de Vídeos", tag: "Página de produto", desc: "Galeria visual que mostra caimento e uso real do produto, reduzindo dúvidas e devoluções.", Mock: GridMock },
  { id: "live", title: "Player de Stream Sell", tag: "Stream Sell", desc: "Interface completa de transmissão com chat e carrossel de produtos sincronizados.", Mock: LiveMock },
];

function Formats() {
  const [active, setActive] = useState(FORMATS[0].id);
  const current = FORMATS.find((f) => f.id === active) ?? FORMATS[0];
  return (
    <Section id="formatos" className="bg-white">
      <SectionTitle eyebrow="Formatos na prática" title="Como aparece na loja do seu cliente" sub="Escolha o formato certo para cada ponto da jornada de compra." />
      <div className="grid items-start gap-8 lg:grid-cols-[360px_1fr]">
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setActive(f.id); track("select_format", { format: f.id }); }}
              className={`min-w-[220px] rounded-2xl border p-4 text-left transition lg:min-w-0 ${active === f.id ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-sky-600 ring-1 ring-sky-200">{f.tag}</span>
              </div>
              {active === f.id && <p className="mt-2 text-sm text-slate-600">{f.desc}</p>}
            </button>
          ))}
        </div>
        <div key={current.id} className="animate-in fade-in duration-300"><current.Mock /></div>
      </div>
    </Section>
  );
}

/* ---------- calculadora ---------- */
function Calculator() {
  const [revenue, setRevenue] = useState(80000);
  const low = revenue * 0.15;
  const high = revenue * 0.25;
  const pct = ((revenue - 10000) / (500000 - 10000)) * 100;
  return (
    <Section id="calculadora">
      <SectionTitle eyebrow="Simulador" title="Quanto o vídeo pode adicionar ao seu faturamento?" sub="Estimativa com incremento de +15% a +25% de conversão por vídeo." />
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-10">
        <div className="flex items-end justify-between">
          <label htmlFor="rev" className="text-sm font-semibold text-slate-600">Faturamento mensal da loja</label>
          <span className="text-2xl font-extrabold text-slate-900">{BRL.format(revenue)}</span>
        </div>
        <input
          id="rev" type="range" min={10000} max={500000} step={5000} value={revenue}
          onChange={(e) => setRevenue(Number(e.target.value))}
          onMouseUp={() => track("use_calculator", { revenue })} onTouchEnd={() => track("use_calculator", { revenue })}
          className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full accent-sky-600"
          style={{ background: `linear-gradient(to right,#0284c7 ${pct}%,#e2e8f0 ${pct}%)` }}
        />
        <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>R$ 10 mil</span><span>R$ 500 mil</span></div>
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 p-6 text-center">
          <p className="text-sm font-medium text-slate-600">Faturamento adicional estimado por mês</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-600 md:text-4xl">{BRL.format(low)} a {BRL.format(high)}</p>
          <p className="mt-1 text-xs text-slate-500">Em 12 meses: {BRL.format(low * 12)} a {BRL.format(high * 12)}</p>
        </div>
        <Cta to={`/auth?mode=signup&source=calculadora&revenue=${revenue}`} event="calculator" className="mt-6 w-full text-base">
          Destravar esse faturamento na minha loja <ArrowRight className="h-4 w-4" />
        </Cta>
        <p className="mt-3 text-center text-[11px] text-slate-400">Simulação ilustrativa, não é garantia de resultado.</p>
      </div>
    </Section>
  );
}

/* ---------- integração ---------- */
function Integration() {
  const platforms = ["Yampi", "Shopify", "Nuvemshop", "Tray", "WooCommerce", "Cartpanda", "VTEX", "Loja própria"];
  const steps = [
    { n: "1", t: "Crie sua conta", d: "Cadastro em minutos, sem cartão." },
    { n: "2", t: "Cole o código", d: "No GTM (tag HTML personalizada) ou direto no tema." },
    { n: "3", t: "Publique os vídeos", d: "Ative stories, carrossel, widget ou lives." },
  ];
  return (
    <Section className="bg-white">
      <SectionTitle eyebrow="Integração universal" title="Instalação Universal via Google Tag Manager (GTM) ou Script Direto" sub="Sem código e sem depender de desenvolvedor. Funciona em qualquer plataforma." />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {platforms.map((p) => (
              <div key={p} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-bold text-slate-700">{p}</div>
            ))}
          </div>
          <ol className="mt-8 space-y-4">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-600 text-sm font-bold text-white">{s.n}</span>
                <div><p className="font-bold text-slate-900">{s.t}</p><p className="text-sm text-slate-600">{s.d}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="overflow-hidden rounded-2xl bg-slate-900 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3 text-xs text-slate-400"><Code2 className="h-4 w-4" /> Script único, assíncrono</div>
          <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-emerald-300"><code>{`<script
  src="https://app.sllhub.com.br/sll-loader.js"
  data-store="ID_DA_SUA_LOJA"
  async defer>
</script>`}</code></pre>
          <div className="border-t border-slate-700 p-5 text-sm text-slate-300">
            <p className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-300" /> Carregamento assíncrono, sem bloquear a renderização.</p>
            <p className="mt-2 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-sky-300" /> O ID da sua loja aparece no painel após o cadastro.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- preços ---------- */
function Pricing() {
  const { data, status } = useLanding();
  const tabs = useMemo(() => buildTabs(data), [data]);
  const [tab, setTab] = useState<string | null>(null);
  const active = tabs.find((t) => t.key === tab) ?? tabs[0];
  const featId = active ? featuredId(active.plans, data.config) : null;
  const includesOf = (id: string) =>
    data.combo_modules.filter((c) => c.plan_id === id).map((c) => data.modules.find((m) => m.slug === c.module_slug)?.name ?? c.module_slug);

  return (
    <Section id="precos">
      <SectionTitle eyebrow="Preços" title="Planos simples, sem surpresa" sub="Teste 7 dias grátis e cancele quando quiser." />
      {status === "loading" && (
        <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-96 animate-pulse rounded-3xl bg-slate-200" />)}</div>
      )}
      {status === "error" && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">Não foi possível carregar os planos agora. Atualize a página ou fale com o suporte.</p>
      )}
      {status === "ready" && tabs.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Nenhum plano disponível no momento.</p>
      )}
      {status === "ready" && active && (
        <>
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); track("select_pricing_tab", { tab: t.key }); }}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${active.key === t.key ? "bg-sky-600 text-white shadow-md" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className={`grid items-center gap-6 ${active.plans.length === 1 ? "mx-auto max-w-sm" : active.plans.length === 2 ? "mx-auto max-w-3xl md:grid-cols-2" : "md:grid-cols-3"}`}>
            {active.plans.map((p) => {
              const featured = p.id === featId;
              const ov = data.config.plans?.[p.id];
              const features = planFeatures(p, includesOf(p.id), ov);
              const price = p.price_monthly_cents / 100;
              return (
                <article key={p.id} className={`relative rounded-3xl bg-white p-7 transition ${featured ? "z-10 border-2 border-sky-500 shadow-2xl shadow-sky-500/15 md:scale-105" : "border border-slate-200 shadow-sm"}`}>
                  {featured && (
                    <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-1 text-xs font-bold text-white shadow">
                      <Sparkles className="h-3 w-3" /> Mais Escolhido
                    </span>
                  )}
                  <h3 className="text-lg font-extrabold text-slate-900">{p.plan_name}</h3>
                  {ov?.description && <p className="mt-1 min-h-[40px] text-sm text-slate-500">{ov.description}</p>}
                  <p className="mt-5">
                    {price > 0
                      ? <><span className="text-4xl font-extrabold text-slate-900">{BRL2.format(price).replace(",00", "")}</span><span className="text-sm text-slate-500">/mês</span></>
                      : <span className="text-4xl font-extrabold text-slate-900">Grátis</span>}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {features.map((x) => (
                      <li key={x} className="flex items-start gap-2 text-sm text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{x}</li>
                    ))}
                  </ul>
                  <Link
                    to={`/auth?mode=signup&plan_id=${p.id}`}
                    onClick={() => track("select_plan", { plan_id: p.id, plan: p.plan_name, price })}
                    className={`mt-7 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition ${featured ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600" : "border border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                  >
                    Começar com {p.plan_name} <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </>
      )}
      <p className="mt-8 text-center text-xs text-slate-500">7 dias grátis · Sem fidelidade · Cancele quando quiser</p>
    </Section>
  );
}
/* ---------- faq ---------- */
const FAQS = [
  { q: "É compatível com o meu tema e plataforma?", a: "Sim. Funciona em Yampi, Shopify, Nuvemshop, Tray, WooCommerce, Cartpanda, VTEX e lojas próprias, via Google Tag Manager ou um único script." },
  { q: "Deixa a loja lenta?", a: "Não. O script carrega de forma assíncrona e os vídeos são entregues por CDN global, sem bloquear a renderização da página." },
  { q: "Preciso de programador?", a: "Não. A ativação leva menos de 5 minutos: você cola o código no GTM ou no tema e publica os vídeos pelo painel." },
  { q: "Posso contratar só um módulo?", a: "Sim. Você pode assinar o Vidlytics, o Stream Sell ou o Combo SLL Hub, e mudar de plano quando quiser." },
  { q: "Como funciona o teste grátis?", a: "São 7 dias para testar sem cartão de crédito. Se gostar, escolha o plano; se não, é só não continuar." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Não há fidelidade nem multa." },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" className="bg-white">
      <SectionTitle eyebrow="FAQ" title="Perguntas frequentes" />
      <div className="mx-auto max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {FAQS.map((f, i) => (
          <div key={f.q}>
            <button
              onClick={() => { setOpen(open === i ? null : i); track("open_faq", { question: f.q }); }}
              aria-expanded={open === i}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="font-bold text-slate-900">{f.q}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open === i ? "rotate-180 text-sky-600" : ""}`} />
            </button>
            {open === i && <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{f.a}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- cta final + footer ---------- */
function FinalCta() {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-sky-600 to-blue-800 p-10 text-center text-white shadow-2xl">
        <h2 className="text-3xl font-extrabold md:text-4xl">Pronto para vender mais com vídeo?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sky-100">Instale em 5 minutos e teste 7 dias grátis, sem cartão de crédito.</p>
        <Cta to="/auth?mode=signup" event="final_cta" className="mt-7 !px-8 text-base">Testar 7 dias grátis <ArrowRight className="h-4 w-4" /></Cta>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { t: "Produto", l: [["Vidlytics", "/vidlytics"], ["Stream Sell", "/stream-sell"], ["Preços", "#precos"]] },
    { t: "Conta", l: [["Entrar", "/auth"], ["Criar conta", "/auth?mode=signup"]] },
    { t: "Legal", l: [["Termos de uso", "/termos"], ["Política de privacidade", "/privacidade"]] },
  ];
  return (
    <footer className="border-t border-slate-200 bg-white px-4 pb-24 pt-14 md:pb-14">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <img src="/assets/sll-hub-logo-wide.png" alt="SLL Hub" loading="lazy" className="h-8 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-slate-500">Ecossistema de vídeo commerce para lojistas que querem vender mais.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> LGPD</span>
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5"><Lock className="h-3.5 w-3.5 text-emerald-600" /> SSL 256-bit</span>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.t}>
            <h4 className="text-sm font-bold text-slate-900">{c.t}</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              {c.l.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("#")
                    ? <button onClick={() => scrollToId(href.slice(1))} className="hover:text-sky-600">{label}</button>
                    : <Link to={href} className="hover:text-sky-600">{label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-slate-100 pt-6 text-xs text-slate-400">© {new Date().getFullYear()} SLL Hub · Sistema Loja Lucrativa. Todos os direitos reservados.</p>
    </footer>
  );
}

function StickyMobileCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 p-3 backdrop-blur md:hidden">
      <Cta to="/auth?mode=signup" event="sticky_mobile" className="w-full">Testar 7 dias grátis</Cta>
    </div>
  );
}

/* ---------- página ---------- */
export default function LandingHub() {
  useEffect(() => {
    document.title = "SLL Hub | Vídeo Commerce para E-commerce";
    track("view_landing", { page: "landing_hub" });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <Header />
      <main>
        <Hero />
        <Stats />
        <Modules />
        <Formats />
        <Calculator />
        <Integration />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <StickyMobileCta />
    </div>
  );
}
