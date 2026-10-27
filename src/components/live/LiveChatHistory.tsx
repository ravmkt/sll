import { useEffect, useState } from "react";
import { MessageSquare, Users } from "lucide-react";
import { supabaseLiveCommerce } from "@/services/supabaseClients";

type Msg = { id: string; author_name: string | null; message: string; created_at: string; is_from_store: boolean | null; archived: boolean | null };
type Lead = { id: string; name: string; email: string; whatsapp: string; created_at: string };

const fmt = (v: string) => new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const phone = (v: string) => {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
};

export default function LiveChatHistory({ liveId }: { liveId?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!liveId) return;
    let alive = true;
    setLoading(true);
    const db: any = supabaseLiveCommerce;
    Promise.all([
      db.from("live_chat_messages").select("id,author_name,message,created_at,is_from_store,archived").eq("live_id", liveId).order("created_at", { ascending: true }).limit(2000),
      db.from("live_leads").select("id,name,email,whatsapp,created_at").eq("live_id", liveId).order("created_at", { ascending: false }),
    ])
      .then(([m, l]: any[]) => {
        if (!alive) return;
        setMsgs((m.data || []) as Msg[]);
        setLeads((l.data || []) as Lead[]);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [liveId]);

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <MessageSquare className="h-4 w-4" /> Histórico da conversa ({msgs.length})
        </h3>
        {loading && <p className="text-xs text-slate-400">Carregando...</p>}
        {!loading && msgs.length === 0 && <p className="text-xs text-slate-400">Nenhuma mensagem nesta live.</p>}
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {msgs.map((m) => (
            <div key={m.id} className={`rounded-lg px-3 py-1.5 text-xs ${m.is_from_store ? "bg-sky-50 text-sky-900" : "bg-slate-50 text-slate-800"}`}>
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                <b>
                  {m.is_from_store ? "Loja" : m.author_name || "Visitante"}
                  {m.archived ? " · sessão anterior" : ""}
                </b>
                <span>{fmt(m.created_at)}</span>
              </div>
              {String(m.message || "").split("[[cadastro]]").join(" (link de cadastro)")}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <Users className="h-4 w-4" /> Cadastros nesta live ({leads.length})
        </h3>
        {!loading && leads.length === 0 && <p className="text-xs text-slate-400">Nenhum cadastro nesta live.</p>}
        {leads.length > 0 && (
          <div className="max-h-56 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500">
                <tr><th className="py-1 pr-3">Nome</th><th className="pr-3">E-mail</th><th className="pr-3">WhatsApp</th><th>Data</th></tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="py-1 pr-3 font-medium">{l.name}</td>
                    <td className="pr-3">{l.email}</td>
                    <td className="pr-3">{phone(l.whatsapp)}</td>
                    <td>{fmt(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}