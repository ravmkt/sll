import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Clock, DollarSign, ExternalLink, Eye, Globe, Hourglass,
  Lightbulb, MessageSquare, MousePointerClick, Play, Radio, ShieldCheck, ShoppingCart,
  Trophy, Users, Wallet,
} from "lucide-react";

export type OverviewPeriod = "today" | "7d" | "30d" | "custom";

export type LiveOverviewProps = {
  period: OverviewPeriod;
  onPeriodChange: (p: OverviewPeriod) => void;
  revenue: { pendingValue: number; pendingOrders: number; paidValue: number; paidOrders: number; referralValue: number };
  usage: {
    hoursUsed: number; hoursLimit: number;
    peakViewers: number; peakLimit: number;
    connectedDestinations: number; accountActive: boolean;
  };
  nextLive: {
    title: string;
    scheduledAt: string | null;
    status: "scheduled" | "live" | "draft";
    productNames: string[];
    productsCount: number;
    destination: string;
    cockpitHref: string;
  } | null;
  engagement: {
    views: number; chatMessages: number; productClicks: number;
    topProducts: { name: string; clicks: number }[];
  };
  tip?: string;
  clubHref?: string;
  onCopyReferral?: () => void;
  referralCopied?: boolean;
  academy?: { channelUrl: string; videos: { title: string; duration: string; url: string }[] };
  allLivesHref?: string;
  tipsHref?: string;
};

const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number) => (v || 0).toLocaleString("pt-BR");
const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

const PERIODS: { key: OverviewPeriod; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "custom", label: "Personalizado" },
];

const DEFAULT_TIP =
  "Uma boa live começa antes de entrar no ar. Escolha 3 produtos-chave, prepare uma demonstração de cada um e deixe um cupom exclusivo pronto. Apresente o benefício antes de falar do preço.";

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Agendada", cls: "bg-amber-100 text-amber-700" },
  live: { label: "Ao vivo", cls: "bg-red-100 text-red-700" },
  draft: { label: "Rascunho", cls: "bg-slate-100 text-slate-600" },
};

function formatWhen(iso: string | null) {
  if (!iso) return "Data a definir";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Data a definir";
  const day = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(".", "");
  const hour = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${hour}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</h2>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function LiveOverviewLayout(p: LiveOverviewProps) {
  const { revenue: r, usage: u, engagement: e, nextLive: nl } = p;
  const clubHref = p.clubHref ?? "/dashboard/afiliados";
  const academy = p.academy;
  const channelUrl = academy?.channelUrl || (import.meta.env.VITE_ACADEMY_CHANNEL_URL as string | undefined) || "#";
  const videos = academy?.videos ?? [
    { title: "Sua primeira live no StreamSell", duration: "12:40", url: channelUrl },
    { title: "Produtos e cupons que convertem", duration: "08:15", url: channelUrl },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1260px] flex-col gap-7 px-6 pb-10 pt-6">
      {/* BANNER */}
      <div className="relative h-[150px] overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 shadow-lg">
        <DollarSign className="absolute -right-4 -top-6 h-48 w-48 rotate-12 text-white/10" strokeWidth={1.5} />
        <DollarSign className="absolute right-44 top-10 h-28 w-28 -rotate-12 text-white/10" strokeWidth={1.5} />
        <DollarSign className="absolute right-[22rem] -bottom-6 h-24 w-24 rotate-6 text-white/10" strokeWidth={1.5} />
        <div className="relative flex h-full flex-col justify-center gap-1 px-10 text-white">
          <h1 className="text-3xl font-extrabold uppercase leading-tight tracking-tight">Sua próxima live vende mais</h1>
          <p className="text-base text-blue-100">Prepare sua vitrine e transforme conexões em vendas.</p>
        </div>
      </div>

      {/* FATURAMENTO */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>Faturamento das Lives</SectionLabel>
          <div className="flex gap-0.5 rounded-xl border border-slate-200 bg-white p-1">
            {PERIODS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => p.onPeriodChange(o.key)}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${
                  p.period === o.key ? "bg-red-600 font-semibold text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Aguardando pagamento</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{num(r.pendingOrders)} pedidos</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{brl(r.pendingValue)}</div>
              <div className="text-xs text-slate-500">Pix / Boleto em live</div>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><Hourglass className="h-6 w-6" /></span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Vendas pagas</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{num(r.paidOrders)} pedidos</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{brl(r.paidValue)}</div>
              <div className="text-xs text-slate-500">Faturamento aprovado</div>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500"><CheckCircle2 className="h-6 w-6" /></span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Faturamento indicações</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Comissões</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{brl(r.referralValue)}</div>
              <Link to={clubHref} className="inline-block rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
                Acessar o Clube SLL
              </Link>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Wallet className="h-6 w-6" /></span>
          </div>
        </div>
      </section>

      {/* CONSUMO */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Consumo do plano</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium uppercase tracking-wide">Tempo de transmissão</span><Clock className="h-4 w-4 text-red-600" />
            </div>
            <div className="my-3"><span className="text-2xl font-extrabold text-slate-900">{num(u.hoursUsed)}</span> <span className="text-xs text-slate-500">de {num(u.hoursLimit)} horas</span></div>
            <ProgressBar value={pct(u.hoursUsed, u.hoursLimit)} />
            <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>Franquia mensal</span><span>{pct(u.hoursUsed, u.hoursLimit)}%</span></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium uppercase tracking-wide">Pico de espectadores</span><Users className="h-4 w-4 text-red-600" />
            </div>
            <div className="my-3"><span className="text-2xl font-extrabold text-slate-900">{num(u.peakViewers)}</span> <span className="text-xs text-slate-500">de {num(u.peakLimit)} ao vivo</span></div>
            <ProgressBar value={pct(u.peakViewers, u.peakLimit)} />
            <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>Capacidade simultânea</span><span>{pct(u.peakViewers, u.peakLimit)}%</span></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium uppercase tracking-wide">Destinos ativos</span><Globe className="h-4 w-4 text-red-600" />
            </div>
            <div className="my-3"><span className="text-2xl font-extrabold text-slate-900">{num(u.connectedDestinations)}</span> <span className="text-xs text-slate-500">{u.connectedDestinations === 1 ? "conectado" : "conectados"}</span></div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"><i className="block h-1.5 w-1.5 rounded-full bg-emerald-500" />Site • Conectado</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium uppercase tracking-wide">Ciclo da conta</span><ShieldCheck className="h-4 w-4 text-red-600" />
            </div>
            <div className="my-3 text-2xl font-extrabold text-slate-900">{u.accountActive ? "Ativo" : "Inativo"}</div>
            <div className="text-[11px] text-slate-500">Status da assinatura • {u.accountActive ? "Em dia" : "Verifique o plano"}</div>
          </div>
        </div>
      </section>

      {/* OPERACIONAL */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><Radio className="h-[18px] w-[18px]" /></span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Próxima live agendada</h3>
            </div>
            <Link to={p.allLivesHref ?? "/live/lives"} className="text-xs font-semibold text-blue-600 hover:underline">Ver todas →</Link>
          </div>
          {nl ? (
            <>
              <div className="flex gap-4">
                <div className="relative flex h-[100px] w-44 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 via-blue-600 to-red-600 text-white">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20"><Play className="h-[18px] w-[18px]" /></span>
                  <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wide">LIVE SHOP</span>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate text-base text-slate-900">{nl.title}</b>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS[nl.status].cls}`}>● {STATUS[nl.status].label}</span>
                  </div>
                  <div className="text-xs text-slate-500">{formatWhen(nl.scheduledAt)}</div>
                </div>
              </div>
              <div className="my-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                <div className="mb-1 font-semibold text-slate-700">{num(nl.productsCount)} {nl.productsCount === 1 ? "produto vinculado" : "produtos vinculados"}</div>
                <div className="text-slate-500">
                  {nl.productNames.slice(0, 2).join(" • ") || "Nenhum produto vinculado"}
                  {nl.productsCount > 2 ? ` • +${nl.productsCount - 2}` : ""}
                  <span className="mx-2 text-slate-300">|</span>Destino: {nl.destination}
                </div>
              </div>
              <Link to={nl.cockpitHref} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 font-medium text-white transition hover:bg-red-700">
                Abrir Estúdio da Live <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-center text-[11px] text-slate-500">Revise seus produtos e teste a transmissão antes de começar.</p>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-slate-500">Nenhuma live agendada.</p>
              <Link to={p.allLivesHref ?? "/live/lives"} className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700">Agendar uma live</Link>
            </div>
          )}
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><MousePointerClick className="h-[18px] w-[18px]" /></span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Engajamento das lives</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Eye, label: "Visualizações", v: e.views },
              { icon: MessageSquare, label: "Mensagens no chat", v: e.chatMessages },
              { icon: MousePointerClick, label: "Cliques em produtos on-air", v: e.productClicks },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500"><m.icon className="h-3 w-3 shrink-0" />{m.label}</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{num(m.v)}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex-1 border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Trophy className="h-3.5 w-3.5 text-red-600" />Produtos mais clicados</div>
            {e.topProducts.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-xs leading-relaxed text-slate-500">
                Nenhum clique em produtos por enquanto. O ranking aparecerá após os primeiros cliques nos produtos durante suas lives.
              </p>
            ) : (
              <ul className="space-y-3">
                {e.topProducts.slice(0, 5).map((t, i) => {
                  const max = Math.max(...e.topProducts.map((x) => x.clicks), 1);
                  return (
                    <li key={t.name + i} className="flex items-center gap-3 text-xs">
                      <b className="flex h-5 w-5 items-center justify-center rounded-md bg-red-50 text-[10px] text-red-700">{i + 1}</b>
                      <span className="min-w-0 flex-1 truncate text-slate-700">{t.name}</span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-600" style={{ width: `${pct(t.clicks, max)}%` }} /></div>
                      <span className="w-16 text-right text-slate-500">{num(t.clicks)} cliques</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* INTELIGÊNCIA & PARCERIAS */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-900 text-white"><Lightbulb className="h-5 w-5" /></span>
            <h3 className="text-xl font-bold text-slate-900">Dica do <span className="font-semibold text-red-600">Noah</span></h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{p.tip || DEFAULT_TIP}</p>
          <Link to={p.tipsHref ?? "/dashboard/dicas"} className="mt-auto pt-4 text-right text-xs font-semibold text-blue-600 hover:underline">Ver mais dicas →</Link>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold"><span className="text-blue-600">Clube</span><span className="text-red-600">SLL</span></h3>
            <ShoppingCart className="h-5 w-5 text-slate-400" />
          </div>
          <p className="my-3 text-sm text-slate-600">Indique o StreamSell para outros lojistas e receba comissões e benefícios com o Clube SLL.</p>
          <button
            type="button"
            onClick={p.onCopyReferral}
            className="w-full rounded-lg bg-red-600 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-red-700"
          >
            {p.referralCopied ? "Link copiado!" : "Copiar meu link de indicação"}
          </button>
          <Link to={clubHref} className="mt-4 text-center text-xs text-slate-600 hover:underline">Acessar painel de indicações →</Link>
        </div>
      </section>

      {/* ACADEMY */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold"><span className="text-blue-600">SLL</span> <span className="font-semibold text-red-600">Academy</span></h3>
        <p className="mb-5 mt-1 text-sm text-slate-600">Aprenda a configurar sua live, apresentar seus produtos e vender mais com Live Commerce.</p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {videos.slice(0, 2).map((v) => (
            <div key={v.title}>
              <div className="relative flex h-[135px] items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-blue-800">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white"><Play className="h-4 w-4" /></span>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{v.duration}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-slate-900">{v.title}</div>
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                Assistir no YouTube <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
          <div className="flex h-[135px] flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-red-800 to-red-950 px-6 text-center text-white md:h-auto">
            <b className="text-sm">Quer ver mais?</b>
            <span className="text-xs leading-snug text-red-100">Confira as aulas de Live Commerce no nosso canal do YouTube.</span>
          </div>
        </div>
        <div className="mt-4 text-right">
          <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">Assistir e se inscrever →</a>
        </div>
      </section>
    </div>
  );
}