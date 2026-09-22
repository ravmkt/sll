import React, { useState, useEffect, useMemo } from "react";
import { LiveCommerceDatabaseService, LiveItem } from "@/services/LiveCommerceDatabaseService";
import { MODULES } from "@/lib/modules";
import { useStore } from "@/contexts/StoreContext";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radio, Plus, Search, AlertCircle, RefreshCw, Clock, Trash2, Pencil, Share2, Palette, TrendingUp,
  MonitorPlay,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LiveFormDialog } from "@/components/live/LiveFormDialog";
import { ShareLiveModal } from "@/components/live/ShareLiveModal";
import { LiveMetricsModal } from "@/components/live/LiveMetricsModal";

import LiveAppearanceModal, {
  DeviceConfig,
  WidgetDivulgacaoSettings,
  WidgetAoVivoSettings,
  LivePlayerSettings,
} from "@/components/live/LiveAppearanceModal";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  url?: string;
}

interface LiveRow {
  id: string;
  title: string;
  youtube_video_id: string;
  youtube_thumbnail_url?: string | null;
  status: "scheduled" | "live" | "finished";
  is_active: boolean;
  scheduled_at?: string | null;
  created_at: string;
}

export function LiveCommerce() {
  const { currentStore } = useStore?.() || { currentStore: null };
  const { storeId: tenantStoreId } = useTenant?.() || { storeId: null };
  const activeStoreId = currentStore?.id || tenantStoreId;

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [allowsLive, setAllowsLive] = useState<boolean>(true);
  const [planName, setPlanName] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [lives, setLives] = useState<LiveRow[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "live" | "finished">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingLiveId, setEditingLiveId] = useState<string | null>(null);

  const [shareLive, setShareLive] = useState<LiveRow | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const [selectedLiveForMetrics, setSelectedLiveForMetrics] = useState<LiveRow | null>(null);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);

  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [appearanceData, setAppearanceData] = useState<{
    divulgacao: DeviceConfig<WidgetDivulgacaoSettings> | null;
    aoVivo: DeviceConfig<WidgetAoVivoSettings> | null;
    player: DeviceConfig<LivePlayerSettings> | null;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!activeStoreId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setStoreId(activeStoreId);

        // Se a loja tiver plano associado
        if (currentStore?.plan) {
          const currentPlan: any = currentStore.plan;
          setPlanName(currentPlan.name || "Starter");
          setAllowsLive(
            Array.isArray(currentPlan.modules)
              ? currentPlan.modules.includes(MODULES.LIVE_COMMERCE)
              : currentPlan.allows_live !== false
          );
        }

        // Carrega produtos da loja
        try {
          const prods = await LiveCommerceDatabaseService.getProducts(activeStoreId);
          if (prods) setProducts(prods as any);
        } catch (prodErr) {
          console.warn("Aviso ao carregar produtos:", prodErr);
        }

        await loadLives(activeStoreId);
        await loadAppearance(activeStoreId);
      } catch (err) {
        console.error("Erro ao carregar dados do Live Commerce:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeStoreId, currentStore]);

  async function loadLives(currentStoreId: string) {
    try {
      const data = await LiveCommerceDatabaseService.getLives(currentStoreId);
      if (data) setLives(data as unknown as LiveRow[]);
    } catch (error) {
      console.error("Erro ao carregar lives:", error);
    }
  }

  async function loadAppearance(currentStoreId: string) {
    try {
      const data = await LiveCommerceDatabaseService.getLiveSettings(currentStoreId);
      if (data) {
        setAppearanceData({
          divulgacao: (data.widget_divulgacao as any) || null,
          aoVivo: (data.widget_aovivo as any) || null,
          player: (data.player_settings as any) || null,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de aparência:", error);
    }
  }

  async function handleSaveAppearance(
    divulgacao: DeviceConfig<WidgetDivulgacaoSettings>,
    aoVivo: DeviceConfig<WidgetAoVivoSettings>,
    player: DeviceConfig<LivePlayerSettings>
  ) {
    if (!storeId) return;
    try {
      setSavingAppearance(true);

      await LiveCommerceDatabaseService.upsertLiveSettings(storeId, {
        widget_divulgacao: divulgacao,
        widget_aovivo: aoVivo,
        player_settings: player,
      });

      setAppearanceData({ divulgacao, aoVivo, player });
      toast.success("Aparência da Live salva com sucesso!");
      setAppearanceOpen(false);
    } catch (err) {
      console.error("Erro ao salvar aparência:", err);
      toast.error("Erro ao salvar aparência da Live.");
    } finally {
      setSavingAppearance(false);
    }
  }

  const filteredLives = useMemo(() => {
    return lives.filter((l) => {
      const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [lives, search, statusFilter]);

  const handleCreateNew = () => {
    setEditingLiveId(null);
    setFormOpen(true);
  };

  const handleEdit = (liveId: string) => {
    setEditingLiveId(liveId);
    setFormOpen(true);
  };

  const handleDelete = async (liveId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta live? Essa ação não pode ser desfeita.")) return;
    try {
      await LiveCommerceDatabaseService.deleteLive(liveId);
      toast.success("Live excluída.");
      if (storeId) await loadLives(storeId);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir a live.");
    }
  };

  const handleShare = (live: LiveRow) => {
    setShareLive(live);
    setShareModalOpen(true);
  };

  const handleOpenMetrics = (live: LiveRow) => {
    setSelectedLiveForMetrics(live);
    setMetricsModalOpen(true);
  };

  const handleOpenAdminPanel = (liveId: string) => {
    navigate(`/app/live-admin/${liveId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-red-500 text-white animate-pulse">AO VIVO</Badge>;
      case "scheduled":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Agendada</Badge>;
      case "finished":
        return <Badge variant="outline" className="text-gray-500">Encerrada</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#0094eb]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Radio className="h-6 w-6 text-[#fd8539]" />
            Live Commerce
          </h1>
          <p className="text-sm text-gray-500">
            Transmita ao vivo e venda seus produtos em tempo real no seu e-commerce.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAppearanceOpen(true)}
            className="flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            Aparência
          </Button>

          <Button
            onClick={handleCreateNew}
            className="bg-[#0094eb] hover:bg-[#0080cc] text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Live
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar live por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            Todas ({lives.length})
          </Button>
          <Button
            variant={statusFilter === "live" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("live")}
            className={statusFilter === "live" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            Ao Vivo ({lives.filter((l) => l.status === "live").length})
          </Button>
          <Button
            variant={statusFilter === "scheduled" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("scheduled")}
          >
            Agendadas ({lives.filter((l) => l.status === "scheduled").length})
          </Button>
          <Button
            variant={statusFilter === "finished" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("finished")}
          >
            Encerradas ({lives.filter((l) => l.status === "finished").length})
          </Button>
        </div>
      </div>

      {/* Lista de Lives */}
      {filteredLives.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Radio className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma live encontrada</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-4">
              {search || statusFilter !== "all"
                ? "Nenhum resultado corresponde aos filtros aplicados."
                : "Você ainda não criou nenhuma transmissão ao vivo. Comece agendando sua primeira live!"}
            </p>
            {!search && statusFilter === "all" && (
              <Button
                onClick={handleCreateNew}
                className="bg-[#0094eb] hover:bg-[#0080cc] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Live
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLives.map((live) => (
            <Card key={live.id} className="overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                {live.youtube_thumbnail_url ? (
                  <img
                    src={live.youtube_thumbnail_url}
                    alt={live.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Radio className="h-10 w-10 text-gray-300" />
                )}
                <div className="absolute top-2 left-2">
                  {getStatusBadge(live.status)}
                </div>
              </div>

              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">{live.title}</h3>
                  {live.scheduled_at && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                      <Clock className="h-3 w-3" />
                      {new Date(live.scheduled_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1">
                  <Button
                    size="sm"
                    className="bg-[#0094eb] hover:bg-[#0080cc] text-white flex-1 text-xs"
                    onClick={() => handleOpenAdminPanel(live.id)}
                  >
                    <MonitorPlay className="h-3.5 w-3.5 mr-1" />
                    Painel
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-gray-600"
                    title="Métricas"
                    onClick={() => handleOpenMetrics(live)}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-gray-600"
                    title="Compartilhar"
                    onClick={() => handleShare(live)}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-gray-600"
                    title="Editar"
                    onClick={() => handleEdit(live.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="Excluir"
                    onClick={() => handleDelete(live.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modais */}
      {storeId && (
        <LiveFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingLiveId(null);
          }}
          storeId={storeId}
          liveId={editingLiveId}
          onSaved={() => {
            if (storeId) loadLives(storeId);
          }}
        />
      )}

      {shareLive && (
        <ShareLiveModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          live={shareLive}
        />
      )}

      {selectedLiveForMetrics && (
        <LiveMetricsModal
          open={metricsModalOpen}
          onOpenChange={setMetricsModalOpen}
          live={selectedLiveForMetrics}
        />
      )}

      {appearanceOpen && (
        <LiveAppearanceModal
          open={appearanceOpen}
          onOpenChange={setAppearanceOpen}
          onSave={handleSaveAppearance}
          saving={savingAppearance}
          initialValues={appearanceData}
        />
      )}
    </div>
  );
}

export default LiveCommerce;
