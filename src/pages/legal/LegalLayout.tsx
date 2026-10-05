import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export const CONTACT_EMAIL = "contato@sllhub.com.br";
export const LAST_UPDATE = "05/10/2026";

export default function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold">SLL Hub</Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/privacidade" className="hover:underline">Privacidade</Link>
            <Link to="/termos" className="hover:underline">Termos</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 leading-relaxed">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">Última atualização: {LAST_UPDATE}</p>
        {children}
      </main>
    </div>
  );
}