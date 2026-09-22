import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { LiveCommerceDatabaseService } from "@/services/LiveCommerceDatabaseService";
import { MODULES } from "@/lib/modules";
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

export function LiveCommercePage() {
  const { storeId: tenantStoreId } = useTenant();
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

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLive, setShareLive] = useState<LiveRow | null>(null);

  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [selectedLiveForMetrics, setSelectedLiveForMetrics] = useState<LiveRow | null>(null);

  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [appearanceData, setAppearanceData] = useState<{
    divulgacao: DeviceConfig<WidgetDivulgacaoSettings> | null;
    aoVivo: DeviceConfig<WidgetAoVivoSettings> | null;
    player: DeviceConfig<LivePlayerSettings> | null;
  } | null>(null);

  useEffect(() => {
    async function loadStoreAndPlan() {
      if (!tenantStoreId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data: store, error: storeErr } = await supabase
          .from("stores")
          .select("id, plan_id, plan:plan_id(id, name, allows_live, modules)")
          .eq("id", tenantStoreId)
          .maybeSingle();

        if (storeErr || !store) {
          toast.error("Loja não encontrada.");
          return;
        }

        setStoreId(store.id);
        const currentPlan = (store as any).plan;
        if (currentPlan) {
          setPlanName(currentPlan.name || "Starter");
          setAllowsLive(Array.isArray(currentPlan.modules) ? currentPlan.modules.includes(MODULES.LIVE_COMMERCE) : currentPlan.allows_live !== false);
        }

        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, image_url, product_url")
          .eq("store_id", store.id)
          .order("name", { ascending: true });
        if (prods) setProducts(prods);

        await loadLives(store.id);
        await loadAppearance(store.id);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStoreAndPlan();
  }, [tenantStoreId]);

  async function loadLives(currentStoreId: string) {
    try {
      const data = await LiveCommerceDatabaseService.getLives(currentStoreId);
      if (data) setLives(data as LiveRow[]);
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
            disabled={!allowsLive}
            className="bg-[#0094eb] hover:bg-[#0080cc] text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Live
          </Button>
        </div>
      </div>

      {!allowsLive && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-amber-800">
                  Módulo de Live Commerce não incluído no seu plano ({planName})
                </h3>
                <p className="mt-1 text-sm text-amber-700">
                  Faça upgrade de sua assinatura para desbloquear transmissões ao vivo com catálogo de produtos interativo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por título da live..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className={statusFilter === "all" ? "bg-[#0094eb] hover:bg-[#0080cc]" : ""}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "live" ? "default" : "outline"}
            onClick={() => setStatusFilter("live")}
            className={statusFilter === "live" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            Ao Vivo
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "scheduled" ? "default" : "outline"}
            onClick={() => setStatusFilter("scheduled")}
            className={statusFilter === "scheduled" ? "bg-[#0094eb] hover:bg-[#0080cc]" : ""}
          >
            Agendadas
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "finished" ? "default" : "outline"}
            onClick={() => setStatusFilter("finished")}
            className={statusFilter === "finished" ? "bg-[#0094eb] hover:bg-[#0080cc]" : ""}
          >
            Encerradas
          </Button>
        </div>
      </div>

      {/* Lista de Lives */}
      {filteredLives.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Radio className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhuma live encontrada</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mb-4">
              {search || statusFilter !== "all"
                ? "Não foram encontradas lives com os filtros aplicados."
                : "Você ainda não criou nenhuma live. Clique no botão abaixo para começar."}
            </p>
            {!search && statusFilter === "all" && (
              <Button
                onClick={handleCreateNew}
                disabled={!allowsLive}
                className="bg-[#0094eb] hover:bg-[#0080cc] text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Live
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLives.map((live) => (
            <Card key={live.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative aspect-video bg-gray-900 overflow-hidden group">
                <img
                  src={
                    live.youtube_thumbnail_url ||
                    (live.youtube_video_id ? `https://img.youtube.com/vi/${live.youtube_video_id}/hqdefault.jpg` : "/placeholder.svg")
                  }
                  alt={live.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  {getStatusBadge(live.status)}
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 line-clamp-1" title={live.title}>
                  {live.title}
                </h3>

                <div className="flex items-center text-xs text-gray-500 gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {live.scheduled_at
                    ? new Date(live.scheduled_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Sem data agendada"}
                </div>

                <div className="pt-2 border-t flex items-center justify-between gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenAdminPanel(live.id)}
                    className="text-[#0094eb] hover:bg-blue-50 px-2 text-xs flex items-center gap-1"
                  >
                    <MonitorPlay className="h-3.5 w-3.5" />
                    Painel
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenMetrics(live)}
                      className="h-8 w-8 text-gray-500 hover:text-[#0094eb]"
                      title="Métricas"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleShare(live)}
                      className="h-8 w-8 text-gray-500 hover:text-[#0094eb]"
                      title="Compartilhar"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(live.id)}
                      className="h-8 w-8 text-gray-500 hover:text-amber-600"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(live.id)}
                      className="h-8 w-8 text-gray-500 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
