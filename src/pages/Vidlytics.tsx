import React, { useState, useEffect } from "react";
import VidlyticsLayout, { VidlyticsTab } from "../components/vidlytics/VidlyticsLayout";
import SLLDatabaseService, { Store } from "../services/SLLDatabaseService";

export const Vidlytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VidlyticsTab>("overview");
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStore() {
      try {
        console.log("[Vidlytics] Buscando lojas...");
        const stores = await SLLDatabaseService.getStores();
        console.log("[Vidlytics] Lojas encontradas:", stores);

        if (stores && stores.length > 0) {
          setCurrentStore(stores[0]);
        } else {
          // Fallback para visualização durante migração
          setCurrentStore({
            id: "default-store",
            name: "Lojista SLL",
            owner_user_id: "demo"
          });
        }
      } catch (err) {
        console.error("[Vidlytics] Erro ao carregar loja:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, []);

  return (
    <VidlyticsLayout
      currentStoreName={currentStore?.name || "Lojista"}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* RENDERIZAÇÃO CONDICIONAL POR ABA */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Card de Boas-Vindas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0094eb] px-2.5 py-0.5 rounded-full border border-blue-100">
                  PLANO PRO
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Assinatura Ativa
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Olá, {currentStore?.name || "Lojista"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Acompanhe a performance dos vídeos e configure o widget no seu e-commerce.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    WIDGET VIDLYTICS ATIVO
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Seus vídeos estão online e sendo transmitidos publicamente no seu e-commerce.
                </p>
              </div>
            </div>
          </div>

          {/* Cards de Métricas / Resultados de Vídeos */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Resultados de Vendas Vindas dos Vídeos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Vendas Pagas</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">0 Pedidos</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">R$ 0,00</div>
                <p className="text-xs text-slate-400 mt-1">Faturamento confirmado via vídeos</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Aguardando Pagamento</span>
                  <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">0 Pedidos</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">R$ 0,00</div>
                <p className="text-xs text-slate-400 mt-1">Pix / Boletos em aberto</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Indicações Vidlytics</span>
                  <span className="text-[10px] bg-blue-50 text-[#0094eb] px-2 py-0.5 rounded-full font-bold">Comissões</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">R$ 0,00</div>
                <p className="text-xs text-slate-400 mt-1">Recompensas de indicação</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholders limpos para as demais abas */}
      {activeTab !== "overview" && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0094eb] flex items-center justify-center mx-auto text-xl font-bold">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-slate-800 capitalize">
              Aba {activeTab}
            </h3>
            <p className="text-sm text-slate-500">
              O layout base está pronto e desacoplado. Próximo passo: plugar os componentes do schema <code>vidlytics</code> aqui.
            </p>
          </div>
        </div>
      )}
    </VidlyticsLayout>
  );
};

export default Vidlytics;
