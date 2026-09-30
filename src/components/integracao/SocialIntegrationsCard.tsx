import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Unlink, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SocialIntegrationsCardProps {
  storeId: string | null;
}

interface SocialAccount {
  id?: string;
  provider: "instagram" | "tiktok";
  account_name: string | null;
  account_id?: string | null;
  status: "connected" | "expired" | "disconnected";
  updated_at?: string;
}

const DEFAULT_CONFIGS = {
  INSTAGRAM: {
    APP_ID: import.meta.env.VITE_INSTAGRAM_CLIENT_ID || "1780976113328436",
    REDIRECT_URI:
      import.meta.env.VITE_INSTAGRAM_REDIRECT_URI ||
      "https://app.vidlytics.com.br/api/auth/instagram/callback",
    SCOPE: "instagram_business_basic",
  },
  TIKTOK: {
    CLIENT_KEY: import.meta.env.VITE_TIKTOK_CLIENT_KEY || "sbaw4swn8vca0a5p25",
    REDIRECT_URI:
      import.meta.env.VITE_TIKTOK_REDIRECT_URI ||
      "https://wznvecurmisgoaijykbt.supabase.co/functions/v1/tiktok-oauth-callback",
    SCOPE: "user.info.basic,video.list",
  },
};

const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

export const SocialIntegrationsCard: React.FC<SocialIntegrationsCardProps> = ({ storeId }) => {
  const [integrations, setIntegrations] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      const { data: legacyData } = await supabase
        .from("store_integrations")
        .select("platform, account_username, updated_at")
        .eq("store_id", storeId);

      if (legacyData && legacyData.length > 0) {
        const mapped: SocialAccount[] = legacyData.map((item: any) => ({
          provider: item.platform,
          account_name: item.account_username,
          status: "connected",
          updated_at: item.updated_at,
        }));
        setIntegrations(mapped);
        return;
      }

      const { data: socialData } = await supabase
        .from("store_social_integrations")
        .select("id, provider, account_name, account_id, status, updated_at")
        .eq("store_id", storeId);

      if (socialData) {
        setIntegrations(socialData);
      }
    } catch (err) {
      console.warn("Status de integrações:", err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnectInstagram = () => {
    if (!storeId) {
      alert("Selecione ou cadastre uma loja primeiro.");
      return;
    }

    const { APP_ID, REDIRECT_URI, SCOPE } = DEFAULT_CONFIGS.INSTAGRAM;

    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&response_type=code&scope=${SCOPE}&state=${storeId}`;

    window.location.href = authUrl;
  };

  const handleConnectTikTok = () => {
    if (!storeId) {
      alert("Selecione ou cadastre uma loja primeiro.");
      return;
    }

    const { CLIENT_KEY, REDIRECT_URI, SCOPE } = DEFAULT_CONFIGS.TIKTOK;

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${CLIENT_KEY}&scope=${SCOPE}&response_type=code&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&state=${storeId}`;

    window.location.href = authUrl;
  };

  const handleDisconnect = async (provider: string) => {
    if (!storeId) return;
    if (!confirm(`Deseja realmente desconectar a conta do ${provider === "instagram" ? "Instagram" : "TikTok"}?`)) {
      return;
    }

    setDisconnecting(provider);
    try {
      await supabase
        .from("store_integrations")
        .delete()
        .eq("store_id", storeId)
        .eq("platform", provider);

      await supabase
        .from("store_social_integrations")
        .delete()
        .eq("store_id", storeId)
        .eq("provider", provider);

      await fetchIntegrations();
    } catch (err) {
      console.error("Erro ao desconectar conta:", err);
      alert("Erro ao desconectar. Tente novamente.");
    } finally {
      setDisconnecting(null);
    }
  };

  const getStatus = (provider: "instagram" | "tiktok") => {
    return integrations.find((i) => i.provider === provider);
  };

  const igStatus = getStatus("instagram");
  const ttStatus = getStatus("tiktok");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-pink-600">
              3
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              Conectar Redes Sociais
            </h2>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Conecte suas contas para importar Stories, Reels e TikToks diretamente para os widgets da sua loja.
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50 self-start sm:self-auto"
          title="Atualizar status das conexões"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card Instagram */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-pink-50/20 p-6 transition-all hover:shadow-md hover:border-pink-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-md">
                  <InstagramIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Instagram</h3>
                  <p className="text-xs text-slate-500">Stories e Reels da sua página</p>
                </div>
              </div>

              {igStatus && igStatus.status === "connected" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Conectado
                </span>
              ) : igStatus?.status === "expired" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Expirado
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  Desconectado
                </span>
              )}
            </div>

            {igStatus && igStatus.status === "connected" ? (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 text-xs">
                <span className="font-medium text-slate-500">Perfil vinculado:</span>{" "}
                <span className="font-bold text-slate-900">@{igStatus.account_name || "Instagram Business"}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Permite sincronizar vídeos automaticamente do feed e stories para exibir em carrosséis interativos.
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            {igStatus && igStatus.status === "connected" ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleConnectInstagram}
                  className="text-xs font-semibold text-pink-600 hover:text-pink-700 inline-flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reconectar
                </button>
                <button
                  type="button"
                  onClick={() => handleDisconnect("instagram")}
                  disabled={disconnecting === "instagram"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  {disconnecting === "instagram" ? "Desconectando..." : "Desconectar"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectInstagram}
                disabled={!storeId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <InstagramIcon className="h-4 w-4" />
                Conectar Conta Instagram
              </button>
            )}
          </div>
        </div>

        {/* Card TikTok */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-6 transition-all hover:shadow-md hover:border-slate-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white shadow-md">
                  <TikTokIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">TikTok</h3>
                  <p className="text-xs text-slate-500">Vídeos do feed e campanhas</p>
                </div>
              </div>

              {ttStatus && ttStatus.status === "connected" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Conectado
                </span>
              ) : ttStatus?.status === "expired" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Expirado
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  Desconectado
                </span>
              )}
            </div>

            {ttStatus && ttStatus.status === "connected" ? (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 text-xs">
                <span className="font-medium text-slate-500">Perfil vinculado:</span>{" "}
                <span className="font-bold text-slate-900">@{ttStatus.account_name || "TikTok Creator"}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Integre seu canal do TikTok para alimentar automaticamente as vitrines de vídeos curtos no seu e-commerce.
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            {ttStatus && ttStatus.status === "connected" ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleConnectTikTok}
                  className="text-xs font-semibold text-slate-800 hover:text-black inline-flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reconectar
                </button>
                <button
                  type="button"
                  onClick={() => handleDisconnect("tiktok")}
                  disabled={disconnecting === "tiktok"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  {disconnecting === "tiktok" ? "Desconectando..." : "Desconectar"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectTikTok}
                disabled={!storeId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TikTokIcon className="h-4 w-4" />
                Conectar Conta TikTok
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
