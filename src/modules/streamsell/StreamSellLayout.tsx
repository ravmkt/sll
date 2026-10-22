import { NavLink, Link, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Radio, Tag, Share2, MessageSquare, Palette, Settings,
  ArrowLeft, LogOut, type LucideIcon,
} from "lucide-react";

type Item = { to: string; label: string; icon: LucideIcon; sub?: string; end?: boolean };

const items: Item[] = [
  { to: "/streamsell", label: "Visão Geral", icon: LayoutDashboard, end: true },
  { to: "/streamsell/lives", label: "Minhas Lives", icon: Radio },
  { to: "/streamsell/produtos", label: "Produtos & Cupons", icon: Tag },
  { to: "/streamsell/destinos", label: "Destinos", icon: Share2, sub: "Site / YouTube / Instagram" },
  { to: "/streamsell/chat", label: "Chat & Moderação", icon: MessageSquare },
  { to: "/streamsell/player", label: "Aparência do Player", icon: Palette },
  { to: "/streamsell/configuracoes", label: "Configurações", icon: Settings },
];

export default function StreamSellLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-5 py-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">StreamSell</h1>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            LIVE COMMERCE • SLL HUB
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map(({ to, label, icon: Icon, sub, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex flex-col leading-tight">
                {label}
                {sub && <span className="text-[11px] font-normal opacity-60">{sub}</span>}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-slate-200 p-3">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" /> Voltar ao SLL Hub
          </Link>
          <Link to="/logout" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
            <LogOut className="h-4 w-4" /> Sair da Plataforma
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
