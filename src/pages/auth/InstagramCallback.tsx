import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function InstagramCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    const handleProcessCallback = async () => {
      if ((window as any).__igBusy) return;
      (window as any).__igBusy = true;
      const code = searchParams.get("code");
      const storeId = searchParams.get("state");

      if (!code || !storeId) {
        setStatus("error");
        setErrorMessage("Código de autorização ou ID da loja não fornecidos pela Meta.");
        return;
      }

      try {
        if (supabase) {
          const { data, error } = await supabase.functions.invoke("instagram-auth", {
            body: { code, store_id: storeId, redirect_uri: sessionStorage.getItem("ig_redirect_uri") || `${window.location.origin}/auth/instagram/callback` },
          });

          if (error || data?.error) {
            let detail = error?.message || data?.error;
          try { const b = await (error as any)?.context?.json(); if (b?.error) detail = b.error; } catch {}
          throw new Error(detail || "Erro ao validar autorizacao na Meta.");
          }
        }

        setStatus("success");
        toast.success("Instagram conectado com sucesso!");
        setTimeout(() => navigate("/dashboard/integracao"), 2000);
      } catch (err: any) {
        console.error("Erro no callback do Instagram:", err);
        setStatus("error");
        setErrorMessage(err.message || "Falha ao registrar autorização do Instagram.");
        toast.error("Erro ao conectar conta do Instagram.");
      }
    };

    handleProcessCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-950 p-8 text-center shadow-2xl border border-[#0091ff]/30 space-y-4">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#0091ff]" />
            <h2 className="text-lg font-black text-white">Conectando sua conta do Instagram...</h2>
            <p className="text-xs text-slate-400">Aguarde enquanto validamos suas credenciais na Meta.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
            <h2 className="text-lg font-black text-white">Instagram Conectado!</h2>
            <p className="text-xs text-slate-400">Redirecionando você de volta ao seu painel...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-12 w-12 text-rose-500" />
            <h2 className="text-lg font-black text-white">Falha na Conexão</h2>
            <p className="text-xs text-rose-400">{errorMessage}</p>
            <button
              onClick={() => navigate("/dashboard/integracao")}
              className="mt-4 rounded-2xl bg-[#0091ff] px-4 py-2 text-xs font-black text-white hover:bg-[#0070f3] transition-all"
            >
              Voltar para Integrações
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

