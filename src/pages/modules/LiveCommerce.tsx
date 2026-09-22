import React, { useState, useEffect, useMemo, useCallback } from "react";
import { LiveCommerceDatabaseService, LiveItem } from "@/services/LiveCommerceDatabaseService";
import { MODULES } from "@/lib/modules";
import { useStore } from "@/contexts/StoreContext";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  Clock,
  Trash2,
  Pencil,
  Share2,
  Palette,
  TrendingUp,
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-red-500 hover:bg-red-600 text-white animate-pulse flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-white" />
          AO VIVO
        </Badge>
      );
    case "scheduled":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Agendada
        </Badge>
      );
    case "finished":
      return (
        <Badge variant="secondary" className="text-gray-600">
          Encerrada
        </Badge>
      );
    default:
      return null;
  }
};

// Componente memoizado do Card para evitar re-renderizações desnecessárias
interface LiveCardItemProps {
  live: LiveRow;
  onOpenAdmin: (id: string) => void;
  onOpenMetrics: (live: LiveRow) => void;
  onShare: (live: LiveRow) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const LiveCardItem = React.memo(function LiveCardItem({
  live,
  onOpenAdmin,
  onOpenMetrics,
  onShare,
  onEdit,
  onDelete,
}: LiveCardItemProps) {
  return (
    <Card className="overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
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
            onClick={() => onOpenAdmin(live.id)}
          >
            <MonitorPlay className="h-3.5 w-3.5 mr-1" />
            Painel
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 text-gray-600"
            title="Métricas"
            onClick={() => onOpenMetrics(live)}
          >
            <TrendingUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 text-gray-600"
            title="Compartilhar"
            onClick={() => onShare(live)}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 text-gray-600"
            title="Editar"
            onClick={() => onEdit(live.id)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
            title="Excluir"
            onClick={() => onDelete(live.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

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
    divulgacao?: DeviceConfig<WidgetDivulgacaoSettings>;
    aoVivo?: DeviceConfig<WidgetAoVivoSettings>;
    player?: DeviceConfig<LivePlayerSettings>;
  }>({});

  const loadLives = useCallback(async (currentStoreId: string) => {
    try {
      const data = await LiveCommerceDatabaseService.getLives(currentStoreId);
      const rows: LiveRow[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        youtube_video_id: item.youtube_video_id,
        youtube_thumbnail_url: item.youtube_thumbnail_url,
        status: item.status,
        is_active: item.is_active,
        scheduled_at: item.scheduled_at,
        created_at: item.created_at,
      }));
      setLives(rows);
    } catch (err: any) {
      toast.error("Erro ao carregar lives: " + err.message);
    }
  }, []);

  const loadAppearance = useCallback(async (currentStoreId: string) => {
    try {
      const data = await LiveCommerceDatabaseService.getLiveSettings(currentStoreId);
      if (data) {
        setAppearanceData({
          divulgacao: data.widget_divulgacao,
          aoVivo: data.widget_aovivo,
          player: data.live_player,
        });
      }
    } catch (err: any) {
      console.error("Erro ao carregar configurações de aparência:", err);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!activeStoreId) {
        setLoading(false);
        return;
      }

      setStoreId(activeStoreId);

      try {
        if (currentStore?.plan) {
          const currentPlan: any = currentStore.plan;
          setPlanName(currentPlan.name || "");
          const allowed = currentPlan.allows_live_commerce ?? true;
          setAllowsLive(allowed);
        }

        const prods = await LiveCommerceDatabaseService.getProducts(activeStoreId);
        setProducts(prods || []);

        await Promise.all([
          loadLives(activeStoreId),
          loadAppearance(activeStoreId)
        ]);
      } catch (err: any) {
        toast.error("Erro ao carregar dados do Live Commerce: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeStoreId, currentStore, loadLives, loadAppearance]);

  const handleSaveAppearance = useCallback(async (
    divulgacao: DeviceConfig<WidgetDivulgacaoSettings>,
    aoVivo: DeviceConfig<WidgetAoVivoSettings>,
    player: DeviceConfig<LivePlayerSettings>
  ) => {
    if (!storeId) return;
    setSavingAppearance(true);
    try {
      await LiveCommerceDatabaseService.upsertLiveSettings(storeId, {
        widget_divulgacao: divulgacao,
        widget_aovivo: aoVivo,
        live_player: player,
      });
      setAppearanceData({ divulgacao, aoVivo, player });
      toast.success("Configurações de aparência salvas com sucesso!");
      setAppearanceOpen(false);
    } catch (err: any) {
      toast.error("Erro ao salvar aparência: " + err.message);
    } finally {
      setSavingAppearance(false);
    }
  }, [storeId]);

  const filteredLives = useMemo(() => {
    return lives.filter((l) => {
      const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [lives, search, statusFilter]);

  const handleCreateNew = useCallback(() => {
    setEditingLiveId(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((liveId: string) => {
    setEditingLiveId(liveId);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (liveId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta live? Essa ação não pode ser desfeita.")) return;
    try {
      await LiveCommerceDatabaseService.deleteLive(liveId);
      toast.success("Live excluída.");
      if (storeId) await loadLives(storeId);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir a live.");
    }
  }, [storeId, loadLives]);

  const handleShare = useCallback((live: LiveRow) => {
    setShareLive(live);
    setShareModalOpen(true);
  }, []);

  const handleOpenMetrics = useCallback((live: LiveRow) => {
    setSelectedLiveForMetrics(live);
    setMetricsModalOpen(true);
  }, []);

  const handleOpenAdminPanel = useCallback((liveId: string) => {
    navigate(`/app/live-admin/${liveId}`);
  }, [navigate]);

  const handleLiveFormSaved = useCallback(() => {
    if (storeId) loadLives(storeId);
  }, [storeId, loadLives]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#0094eb]" />
      </div>
    );
  }

  if (!allowsLive) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Módulo Live Commerce Indisponível</h2>
            <p className="text-gray-600 mb-6">
              O módulo de Lives não está incluído no seu plano atual ({planName || "Atual"}).
              Faça um upgrade para transmitir ao vivo e vender em tempo real.
            </p>
            <Button
              className="bg-[#0094eb] hover:bg-[#0080cc] text-white"
              onClick={() => navigate("/app/plans")}
            >
              Ver Planos de Upgrade
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-[#fd8539]" />
            <h1 className="text-2xl font-bold text-gray-900">Live Commerce</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Crie transmissões ao vivo integradas ao seu catálogo para vender em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setAppearanceOpen(true)}
            className="flex items-center gap-2 border-gray-300"
          >
            <Palette className="h-4 w-4 text-[#fd8539]" />
            Aparência dos Widgets
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

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(["all", "live", "scheduled", "finished"] as const).map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className={statusFilter === st ? "bg-[#0094eb] text-white" : "text-gray-600"}
            >
              {st === "all" && "Todas"}
              {st === "live" && "Ao Vivo"}
              {st === "scheduled" && "Agendadas"}
              {st === "finished" && "Encerradas"}
            </Button>
          ))}
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
                ? "Não foram encontrados resultados para os filtros selecionados."
                : "Você ainda não possui transmissões ao vivo cadastradas. Crie sua primeira live!"}
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
            <LiveCardItem
              key={live.id}
              live={live}
              onOpenAdmin={handleOpenAdminPanel}
              onOpenMetrics={handleOpenMetrics}
              onShare={handleShare}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modais e Diálogos */}
      {formOpen && (
        <LiveFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          storeId={storeId}
          liveId={editingLiveId}
          onSaved={handleLiveFormSaved}
        />
      )}

      {shareModalOpen && shareLive && (
        <ShareLiveModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          liveId={shareLive.id}
          liveTitle={shareLive.title}
        />
      )}

      {metricsModalOpen && selectedLiveForMetrics && (
        <LiveMetricsModal
          open={metricsModalOpen}
          onOpenChange={setMetricsModalOpen}
          liveId={selectedLiveForMetrics.id}
          liveTitle={selectedLiveForMetrics.title}
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
