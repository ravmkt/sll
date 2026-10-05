import React, { useState, useEffect, useMemo, useCallback } from "react";
import { LiveCommerceDatabaseService } from "@/services/LiveCommerceDatabaseService";
import { MODULES } from "@/lib/modules";
import { useLoja } from "@/contexts/LojaContext";
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
import { StoreBrand } from "@/components/layout/StoreBrand";
import { ModuleSwitcher } from "@/components/layout/ModuleSwitcher";
import { LiveSidebar } from "@/components/live/LiveSidebar";
import { AppFooter } from "@/components/layout/AppFooter";
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

function LiveCommerceContent() {
  const { store: currentStore, storeId: tenantStoreId } = useLoja();
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

  const loadLives = useCallback(async (currentStoreId: string) => {
    try {
      const data = await LiveCommerceDatabaseService.getLives(currentStoreId);
      const rows = (data || []) as unknown as LiveRow[];
      rows.sort((a, b) => {
        if (!a.scheduled_at && !b.scheduled_at) return 0;
        if (!a.scheduled_at) return 1;
        if (!b.scheduled_at) return -1;
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      });
      setLives(rows);
    } catch (err: any) {
      toast.error("Erro ao carregar lives: " + (err?.message || ""));
    }
  }, []);

  const loadAppearance = useCallback(async (currentStoreId: string) => {
    try {
      const data: any = await LiveCommerceDatabaseService.getLiveSettings(currentStoreId);
      if (data) {
        setAppearanceData({
          divulgacao: data.widget_divulgacao || null,
          aoVivo: data.widget_aovivo || null,
          player: data.player_settings || null,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar aparência:", err);
    }
  }, []);

  useEffect(() => {
    const plan: any = (currentStore as any)?.plan;
    if (!plan) return;
    setPlanName(plan.name || "");
    setAllowsLive(
      Array.isArray(plan.modules)
        ? plan.modules.includes(MODULES.LIVE_COMMERCE)
        : (plan.allows_live_commerce ?? plan.allows_live ?? true) !== false
    );
  }, [currentStore]);

  useEffect(() => {
    async function loadData() {
      if (!activeStoreId) {
        setLoading(false);
        return;
      }
      setStoreId(activeStoreId);
      try {
        setLoading(true);
        const prods = await LiveCommerceDatabaseService.getProducts(activeStoreId);
        setProducts((prods || []) as any);
        await Promise.all([loadLives(activeStoreId), loadAppearance(activeStoreId)]);
      } catch (err: any) {
        toast.error("Erro ao carregar dados do Live Commerce: " + (err?.message || ""));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeStoreId, loadLives, loadAppearance]);

  useEffect(() => {
    const open = () => setAppearanceOpen(true);
    window.addEventListener("live:open-appearance", open);
    return () => window.removeEventListener("live:open-appearance", open);
  }, []);

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
      const matchesSearch = (l.title || "").toLowerCase().includes(search.toLowerCase());
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
      toast.error(err?.message || "Erro ao excluir a live.");
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
    window.open(`/dashboard/modules/live-commerce/admin/${liveId}`, "_blank", "noopener,noreferrer");
  };

  const onFormSaved = async () => {
    if (storeId) await loadLives(storeId);
  };

  const statusBadge = (live: LiveRow) => {
    if (live.is_active && live.status === "live") {
      return (
        <Badge className="bg-rose-600 text-white flex items-center gap-1.5 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
          AO VIVO
        </Badge>
      );
    }
    if (live.status === "scheduled") {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500 flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Programada
        </Badge>
      );
    }
    return <Badge variant="secondary">Finalizada</Badge>;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Commerce</h1>
            <p className="text-muted-foreground text-sm">
              Programe, divulgue e gerencie todas as suas lives em um só lugar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAppearanceOpen(true)} className="gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </Button>
          <Button onClick={handleCreateNew} disabled={!allowsLive} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
            <Plus className="h-4 w-4" />
            Nova Live
          </Button>
        </div>
      </div>

      {!allowsLive && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Recurso Exclusivo dos Planos Pro e Scale</h3>
              <p className="text-sm text-muted-foreground">
                Seu plano atual ({planName || "Starter"}) não inclui Live Commerce.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/app/plans")} className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap">
            Fazer Upgrade Agora
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar live pelo título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="scheduled">Programadas</option>
          <option value="live">Ao vivo</option>
          <option value="finished">Finalizadas</option>
        </select>
      </div>

      {filteredLives.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Radio className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma live encontrada.</p>
            <Button variant="link" onClick={handleCreateNew} disabled={!allowsLive} className="mt-2 text-primary">
              Criar sua primeira live
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLives.map((live) => {
            const isLiveNow = Boolean(live.is_active && live.status === "live");
            return (
              <Card key={live.id} className="border-border/60 hover:border-border transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-16 w-24 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center border border-border/40">
                    {live.youtube_thumbnail_url ? (
                      <img loading="lazy" decoding="async" src={live.youtube_thumbnail_url} alt={live.title} className="h-full w-full object-cover" />
                    ) : (
                      <Radio className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">{statusBadge(live)}</div>
                    <p className="font-semibold text-sm truncate">{live.title}</p>
                    {live.scheduled_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(live.scheduled_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isLiveNow && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenAdminPanel(live.id)}
                        title="Administrar Live (Painel de Controle)"
                        className="text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                      >
                        <MonitorPlay className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenMetrics(live)}
                      title="Métricas da Live"
                      className="text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleShare(live)} title="Divulgar">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleEdit(live.id)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(live.id)} title="Excluir" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {storeId && (
        <LiveFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          storeId={storeId}
          liveId={editingLiveId}
          allowsLive={allowsLive}
          products={products}
          onSaved={onFormSaved}
        />
      )}

      {shareLive && (
        <ShareLiveModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          liveTitle={shareLive.title}
          youtubeVideoId={shareLive.youtube_video_id}
          isLiveNow={Boolean(shareLive.is_active && shareLive.status === "live")}
        />
      )}

      <LiveAppearanceModal
        isOpen={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        onSave={handleSaveAppearance}
        isSaving={savingAppearance}
        initialData={appearanceData}
      />

      <LiveMetricsModal
        open={metricsModalOpen}
        onOpenChange={setMetricsModalOpen}
        live={selectedLiveForMetrics}
      />
    </div>
  );
}

export function LiveCommerce() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      <LiveSidebar
        activeTab="lives"
        isCollapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onTabChange={(tab) => {
          if (tab === "aparencia") window.dispatchEvent(new Event("live:open-appearance"));
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="bg-white border-b border-slate-200/80 px-6 py-2.5 flex items-center justify-between sticky top-0 z-20">
          <StoreBrand />
          <ModuleSwitcher />
        </header>

        <div className="flex-1">
          <LiveCommerceContent />
        </div>

        <AppFooter />
      </div>
    </div>
  );
}

export default LiveCommerce;