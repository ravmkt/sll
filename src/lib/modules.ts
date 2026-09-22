export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  route: string;
  iconName?: string;
  requiresSubscription?: boolean;
}

export const MODULES: Record<string, ModuleDefinition> = {
  VIDLYTICS: {
    id: "vidlytics",
    name: "Vidlytics",
    description: "Vídeos e Stories interativos para e-commerce",
    route: "/dashboard/modules/vidlytics"
  },
  LIVE_COMMERCE: {
    id: "live_commerce",
    name: "Live Commerce",
    description: "Transmissões ao vivo integradas ao seu catálogo",
    route: "/dashboard/modules/live-commerce"
  },
  PDV: {
    id: "pdv",
    name: "App PDV",
    description: "Ponto de venda offline/online",
    route: "/dashboard/modules/pdv"
  }
};

export function canAccessModule(_storeId: string | null, _moduleId: string): boolean {
  // No Hub SLL o controle fino é feito via public.subscriptions
  return true;
}
