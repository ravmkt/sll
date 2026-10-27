import { useState } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, Hourglass, CheckCircle2, Users, Clock, Eye, Radio, Zap, CalendarCheck,
  MessageCircle, MousePointerClick, Lightbulb, Share2, Play, ExternalLink, Package, ShoppingBag,
} from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const periods = ["Hoje", "7 dias", "30 dias", "Personalizado"] as const;
type Period = (typeof periods)[number];

const data = {
  pending: { value: 0, orders: 0 },
  paid: { value: 0, orders: 0 },
  referrals: 0,
  hoursUsed: 0, hoursLimit: 20,
  peakUsed: 0, peakLimit: 1000,
  activeDestinations: 1,
  engagement: { views: 0, chat: 0, clicks: 0 },
  topProducts: [] as { name: string; clicks: number }[],
  nextLive: {
    status: "Agendada",
    title: "Lançamento Coleção Casa & Decoração",
    date: new Date(2026, 9, 28, 20, 0),
    products: ["Vaso Terracota", "Almofada Linho", "Manta Algodão"],
    destination: "Site",
  },
};

const REFERRAL_LINK = `${typeof window !== "undefined" ? window.location.origin : ""}/clube?ref=streamsell`;
const YOUTUBE_URL = "https://www.youtube.com/@sistemalojalucrativa";

const card = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const btnPrimary = "w-full rounded-lg bg-red-600 py-3 text-white transition-colors hover:bg-red-700";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>;
}

function Meter({ pct }: { pct: number }) {
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-red-600" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function Overview() {
  const [period, setPeriod] = useState<Period>("30 dias");
  const [copied, setCopied] = useState(false);

  const hoursPct = Math.round((data.hoursUsed / data.hoursLimit) * 100);
  const peakPct = Math.round((data.peakUsed / data.peakLimit) * 100);
  const nl = data.nextLive;
  const dateLabel =
    nl.date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) +
    " às " + nl.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  async function copyLink() {
    await navigator.clipboard.writeText(REFERRAL_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 px-8 py-10 text-white">
        <DollarSign className="absolute -right-4 -top-6 h-40 w-40 rotate-12 text-white/10" />
        <DollarSign className="absolute bottom-[-30px] right-40 h-28 w-28 -rotate-12 text-white/10" />
        <DollarSign className="absolute left-[45%] top-2 h-16 w-16 rotate-6 text-white/10" />
        <h1 className="relative text-2xl font-extrabold tracking-tight md:text-4xl">SUA PRÓXIMA LIVE VENDE MAIS</h1>
        <p className="relative mt-2 text-blue-100">Prepare sua vitrine e transforme conexões em vendas.</p>
      </section>

      {/* Faturamento */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Faturamento das Lives</SectionTitle>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Aguardando Pagamento</p>
              <Hourglass className="h-5 w-5 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{brl(data.pending.value)}</p>
            <p className="text-xs text-slate-400">{data.pending.orders} pedidos • Pix / Boleto em live</p>
          </div>
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Vendas Pagas</p>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{brl(data.paid.value)}</p>
            <p className="text-xs text-slate-400">{data.paid.orders} pedidos • Faturamento aprovado</p>
          </div>
          <div className={card}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Faturamento Indicações</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Comissões</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{brl(data.referrals)}</p>
            <Link to="/clube" className="mt-1 inline-block text-xs text-slate-500 underline-offset-2 hover:text-red-600 hover:underline">
              Acessar o Clube SLL
            </Link>
          </div>
        </div>
      </section>

      {/* Consumo */}
      <section className="space-y-4">
        <SectionTitle>Consumo do Plano</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={card}>
            <div className="flex items-center justify-between text-slate-500">
              <p className="text-sm font-medium">Horas de Transmissão</p><Clock className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">{data.hoursUsed} de {data.hoursLimit} horas</p>
            <p className="text-xs text-slate-400">Franquia mensal {hoursPct}%</p>
            <Meter pct={hoursPct} />
          </div>
          <div className={card}>
            <div className="flex items-center justify-between text-slate-500">
              <p className="text-sm font-medium">Pico de Espectadores</p><Users className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {data.peakUsed} de {data.peakLimit.toLocaleString("pt-BR")} ao vivo
            </p>
            <p className="text-xs text-slate-400">Capacidade simultânea {peakPct}%</p>
            <Meter pct={peakPct} />
          </div>
          <div className={card}>
            <div className="flex items-center justify-between text-slate-500">
              <p className="text-sm font-medium">Destinos Ativos</p><Share2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">{data.activeDestinations} conectado</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Site • Conectado
            </p>
          </div>
          <div className={card}>
            <div className="flex items-center justify-between text-slate-500">
              <p className="text-sm font-medium">Ciclo da Conta</p><CalendarCheck className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-green-600">Ativo</p>
            <p className="text-xs text-slate-400">Status da assinatura • Em dia</p>
          </div>
        </div>
      </section>

      {/* Operacional */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className={`${card} flex flex-col`}>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle>Próxima Live Agendada</SectionTitle>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{nl.status}</span>
          </div>
          <div className="flex gap-4">
            <div className="relative flex h-24 w-40 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-600">
              <ShoppingBag className="h-8 w-8 text-white/40" />
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Radio className="h-3 w-3" /> LIVE SHOP
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">{nl.title}</h3>
              <p className="mt-1 text-sm capitalize text-slate-500">{dateLabel}</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              <strong>{nl.products.length} produtos vinculados:</strong> {nl.products.join(" • ")} |{" "}
              <strong>Destino:</strong> {nl.destination}
            </p>
          </div>
          <div className="mt-auto pt-5">
            <Link to="/streamsell/lives" className={`${btnPrimary} block text-center font-medium`}>
              Abrir Estúdio da Live →
            </Link>
            <p className="mt-2 text-center text-xs text-slate-400">
              Revise seus produtos e teste a transmissão antes de começar.
            </p>
          </div>
        </div>

        <div className={card}>
          <SectionTitle>Engajamento das Lives</SectionTitle>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { l: "Visualizações", v: data.engagement.views, i: Eye },
              { l: "Mensagens no Chat", v: data.engagement.chat, i: MessageCircle },
              { l: "Cliques em Produtos On-Air", v: data.engagement.clicks, i: MousePointerClick },
            ].map(({ l, v, i: Icon }) => (
              <div key={l} className="rounded-lg bg-slate-50 p-3">
                <Icon className="h-4 w-4 text-slate-400" />
                <p className="mt-2 text-xl font-bold text-slate-900">{v.toLocaleString("pt-BR")}</p>
                <p className="text-[11px] leading-tight text-slate-500">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Produtos mais clicados</p>
            {data.topProducts.length === 0 ? (
              <div className="mt-3 flex flex-col items-center rounded-lg border border-dashed border-slate-200 px-6 py-8 text-center">
                <MousePointerClick className="h-8 w-8 text-slate-300" />
                <p className="mt-3 max-w-xs text-sm text-slate-500">
                  Nenhum clique em produtos por enquanto. O ranking aparecerá após os primeiros cliques nos produtos durante suas lives.
                </p>
              </div>
            ) : (
              <ol className="mt-3 space-y-2">
                {data.topProducts.map((p, i) => (
                  <li key={p.name} className="flex justify-between text-sm">
                    <span>{i + 1}. {p.name}</span><span className="font-semibold">{p.clicks}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* Inteligência & Parcerias */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className={`${card} flex flex-col`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Lightbulb className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold text-slate-900">Dica do Noah</h3>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Uma boa live começa antes de entrar no ar. Escolha 3 produtos-chave, prepare uma demonstração de cada um e deixe um cupom exclusivo pronto. Apresente o benefício antes de falar do preço.
          </p>
          <Link to="/streamsell/dicas" className="mt-auto pt-4 text-sm font-medium text-red-600 hover:text-red-700">
            Ver mais dicas →
          </Link>
        </div>

        <div className={`${card} flex flex-col`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Share2 className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold text-slate-900">ClubeSLL</h3>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Indique o StreamSell para outros lojistas e receba comissões e benefícios com o Clube SLL.
          </p>
          <div className="mt-auto space-y-3 pt-5">
            <button onClick={copyLink} className={`${btnPrimary} font-semibold`}>
              {copied ? "LINK COPIADO ✓" : "COPIAR MEU LINK DE INDICAÇÃO"}
            </button>
            <Link to="/clube" className="block text-center text-sm font-medium text-slate-600 hover:text-red-600">
              Acessar painel de indicações →
            </Link>
          </div>
        </div>
      </section>

      {/* Academy */}
      <section className={card}>
        <h3 className="text-lg font-semibold text-slate-900">SLL Academy</h3>
        <p className="mt-1 text-sm text-slate-500">
          Aprenda a configurar sua live, apresentar seus produtos e vender mais com Live Commerce.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { t: "Sua primeira live no StreamSell", d: "12:40", g: "from-slate-800 to-slate-600" },
            { t: "Produtos e cupons que convertem", d: "08:15", g: "from-blue-800 to-blue-600" },
          ].map((v) => (
            <div key={v.t} className="overflow-hidden rounded-lg border border-slate-200">
              <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${v.g}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-red-600">
                  <Play className="h-5 w-5 fill-current" />
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">{v.d}</span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-slate-900">{v.t}</p>
                <a href={YOUTUBE_URL} target="_blank" rel="noreferrer"
                   className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                  Assistir no YouTube <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
          <div className="flex flex-col justify-center rounded-lg bg-red-900 p-6 text-white">
            <Zap className="h-6 w-6 text-red-300" />
            <p className="mt-3 font-medium leading-snug">
              Quer ver mais? Confira as aulas de Live Commerce no nosso canal do YouTube.
            </p>
          </div>
        </div>
        <div className="mt-4 text-right">
          <a href={YOUTUBE_URL} target="_blank" rel="noreferrer" className="text-sm font-medium text-red-600 hover:text-red-700">
            Assistir e se inscrever →
          </a>
        </div>
      </section>
    </div>
  );
}
