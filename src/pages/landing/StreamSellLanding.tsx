import { Link } from 'react-router-dom';
import { Radio, ShoppingCart, MessageCircle, BarChart3, Play, Users } from 'lucide-react';
import TrialDays from '@/components/TrialDays';

const SIGNUP = '/auth?mode=signup&module=stream-sell';

const features = [
  { icon: Radio, title: 'Lives de venda', text: 'Transmita ao vivo direto na sua loja, sem sair do site.' },
  { icon: ShoppingCart, title: 'Produtos na tela', text: 'Vincule produtos à transmissão e venda com checkout durante a live.' },
  { icon: MessageCircle, title: 'Chat em tempo real', text: 'Converse com o público e responda dúvidas na hora.' },
  { icon: BarChart3, title: 'Métricas da live', text: 'Acompanhe audiência, cliques e vendas de cada transmissão.' },
  { icon: Users, title: 'Mais engajamento', text: 'Transforme visitantes em compradores com interação ao vivo.' },
  { icon: Play, title: 'Replay', text: 'Reaproveite a gravação da live como vídeo na sua loja.' },
];

export default function StreamSellLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-bold">SLL Hub</Link>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
            <Link to={SIGNUP} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Testar <TrialDays /> dias grátis
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Stream Sell</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Venda ao vivo na sua loja</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Lives com produtos vinculados, chat em tempo real e checkout durante a transmissão.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to={SIGNUP} className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground">
            Testar <TrialDays /> dias grátis
          </Link>
          <Link to="/" className="rounded-md border px-6 py-3 font-medium">Conhecer o SLL Hub</Link>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Sem cartão de crédito. Sem fidelidade.</p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border p-6">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <section className="border-t bg-muted/30 py-16 text-center">
        <h2 className="text-2xl font-bold">Comece sua primeira live</h2>
        <Link to={SIGNUP} className="mt-6 inline-block rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground">
          Criar conta e testar <TrialDays /> dias grátis
        </Link>
      </section>
    </div>
  );
}