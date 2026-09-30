import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Unlink, ExternalLink, Instagram, Video } from "lucide-react";
import { toast } from "sonner";
import {
  getStoreIntegrations,
  disconnectIntegration,
  StoreIntegration,
} from "@/services/integrationsService";

interface SocialIntegrationsCardProps {
  storeId?: string;
}

export function SocialIntegrationsCard({ storeId }: SocialIntegrationsCardProps) {
  const [integrations, setIntegrations] = useState<StoreIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const data = await getStoreIntegrations(storeId);
      setIntegrations(data);
    } catch (err) {
      console.error("Erro ao carregar integrações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [storeId]);

  const instagramIntegration = integrations.find((i) => i.platform === "instagram");
  const tiktokIntegration = integrations.find((i) => i.platform === "tiktok");

  const handleDisconnect = async (platform: "instagram" | "tiktok") => {
    if (!storeId) return;
    const confirm = window.confirm(`Deseja realmente desconectar sua conta do ${platform === "instagram" ? "Instagram" : "TikTok"}?`);
    if (!confirm) return;

    try {
      setActionLoading(platform);
      await disconnectIntegration(storeId, platform);
      toast.success(`${platform === "instagram" ? "Instagram" : "TikTok"} desconectado com sucesso!`);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(`Erro ao desconectar: ${err?.message || "Tente novamente."}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectInstagram = () => {
    if (!storeId) {
      toast.error("Loja não identificada.");
      return;
    }
    const clientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID || "1028751335438848";
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/instagram/callback`);
    const state = storeId;
    const scope = "user_profile,user_media";
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${state}`;

    window.location.href = authUrl;
  };

  const handleConnectTikTok = () => {
    if (!storeId) {
      toast.error("Loja não identificada.");
      return;
    }
    const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
    if (!clientKey) {
      toast.info("A integração direta com o TikTok está sendo configurada para sua loja.");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/tiktok/callback`);
    const state = storeId;
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${redirectUri}&state=${state}`;

    window.location.href = authUrl;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Integrações de Redes Sociais
            </h2>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
              Mídias & Catálogo
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500">
            Conecte suas contas do Instagram e TikTok para sincronizar Reels e vídeos automaticamente com o SLL.
          </p>
        </div>

        <button
          onClick={fetchIntegrations}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
          title="Recarregar status"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Instagram */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-6 transition-all hover:border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-sm">
                <Instagram size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Instagram</h3>
                <p className="text-xs font-medium text-slate-500">
                  {instagramIntegration ? (
                    <span className="text-slate-700 font-semibold">
                      @{instagramIntegration.account_username || "conectado"}
                    </span>
                  ) : (
                    "Reels e vídeos do perfil"
                  )}
                </p>
              </div>
            </div>

            {instagramIntegration ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 size={12} />
                Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                <AlertCircle size={12} />
                Não conectado
              </span>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              {instagramIntegration ? "Sincronização ativa" : "Requer autorização da Meta"}
            </span>

            {instagramIntegration ? (
              <button
                onClick={() => handleDisconnect("instagram")}
                disabled={actionLoading === "instagram"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <Unlink size={13} />
                Desconectar
              </button>
            ) : (
              <button
                onClick={handleConnectInstagram}
                disabled={actionLoading === "instagram"}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-500 text-white text-xs font-black shadow-sm hover:opacity-95 transition-all"
              >
                <ExternalLink size={13} />
                Conectar Conta
              </button>
            )}
          </div>
        </div>

        {/* Card TikTok */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-6 transition-all hover:border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Video size={22} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">TikTok</h3>
                <p className="text-xs font-medium text-slate-500">
                  {tiktokIntegration ? (
                    <span className="text-slate-700 font-semibold">
                      @{tiktokIntegration.account_username || "conectado"}
                    </span>
                  ) : (
                    "Vídeos e publicações do TikTok"
                  )}
                </p>
              </div>
            </div>

            {tiktokIntegration ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 size={12} />
                Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                <AlertCircle size={12} />
                Não conectado
              </span>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              {tiktokIntegration ? "Sincronização ativa" : "Requer autorização do TikTok"}
            </span>

            {tiktokIntegration ? (
              <button
                onClick={() => handleDisconnect("tiktok")}
                disabled={actionLoading === "tiktok"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <Unlink size={13} />
                Desconectar
              </button>
            ) : (
              <button
                onClick={handleConnectTikTok}
                disabled={actionLoading === "tiktok"}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm transition-all"
              >
                <ExternalLink size={13} />
                Conectar Conta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
