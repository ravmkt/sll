import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Video, 
  Layers, 
  Palette, 
  Code2, 
  ExternalLink 
} from 'lucide-react';

import VidlyticsOverviewTab from '@/components/vidlytics/VidlyticsOverviewTab';
import VideoCatalogTab from '@/components/vidlytics/VideoCatalogTab';
import StoriesCollectionTab from '@/components/vidlytics/StoriesCollectionTab';
import AppearanceCustomizerTab from '@/components/vidlytics/AppearanceCustomizerTab';
import IntegrationGTMTab from '@/components/vidlytics/IntegrationGTMTab';
import WidgetPreview from '@/components/vidlytics/WidgetPreview';

export const Vidlytics: React.FC = () => {
  const storeId = "a0000000-0000-0000-0000-000000000001";
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0094eb] dark:bg-[#fd8539] animate-pulse" />
            <span className="text-[11px] font-black tracking-wider uppercase text-[#0094eb] dark:text-[#fd8539]">
              Módulo Ativo
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Vidlytics - Vídeos & Stories Interativos
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Gerencie vídeos reels, coleções de stories, personalize o widget e monitore métricas de conversão.
          </p>
        </div>

        <button
          onClick={() => setIsPreviewOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15 text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <ExternalLink size={14} />
          Prévia do Widget
        </button>
      </div>

      {/* 5 Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <TabsTrigger value="overview" className="gap-2 font-bold cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <LayoutDashboard size={15} /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2 font-bold cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Video size={15} /> Catálogo de Vídeos
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-2 font-bold cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Layers size={15} /> Stories
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 font-bold cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Palette size={15} /> Aparência
          </TabsTrigger>
          <TabsTrigger value="integration" className="gap-2 font-bold cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Code2 size={15} /> Integração (GTM)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <VidlyticsOverviewTab 
            storeId={storeId} 
            onNavigateTab={(tabKey) => setActiveTab(tabKey)} 
          />
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <VideoCatalogTab storeId={storeId} />
        </TabsContent>

        <TabsContent value="stories" className="mt-6">
          <StoriesCollectionTab storeId={storeId} />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceCustomizerTab storeId={storeId} />
        </TabsContent>

        <TabsContent value="integration" className="mt-6">
          <IntegrationGTMTab storeId={storeId} />
        </TabsContent>
      </Tabs>

      <WidgetPreview 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        storeId={storeId} 
      />
    </div>
  );
};

export default Vidlytics;