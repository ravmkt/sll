import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Sparkles, 
  Eye, 
  Palette, 
  Layout, 
  Check, 
  Sliders,
  Maximize2,
  RefreshCw,
  ShoppingBag,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

export interface VidlyticsAppearanceSettings {
  primaryColor: string;
  accentColor: string;
  borderRadius: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showFloatingButton: boolean;
  buttonText: string;
  autoplay: boolean;
  mutedAutoplay: boolean;
  showProductPrice: boolean;
  showAddToCartButton: boolean;
  theme: 'dark' | 'light' | 'system';
}

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: VidlyticsAppearanceSettings) => void;
  currentSettings?: Partial<VidlyticsAppearanceSettings>;
}

const DEFAULT_SETTINGS: VidlyticsAppearanceSettings = {
  primaryColor: '#0094eb',
  accentColor: '#fd8539',
  borderRadius: 12,
  position: 'bottom-right',
  showFloatingButton: true,
  buttonText: 'Ver Vídeos',
  autoplay: true,
  mutedAutoplay: true,
  showProductPrice: true,
  showAddToCartButton: true,
  theme: 'dark',
};

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings,
}) => {
  const [settings, setSettings] = useState<VidlyticsAppearanceSettings>({
    ...DEFAULT_SETTINGS,
    ...currentSettings,
  });

  const [activeTab, setActiveTab] = useState('design');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  if (!isOpen) return null;

  const handleUpdate = <K extends keyof VidlyticsAppearanceSettings>(
    key: K,
    value: VidlyticsAppearanceSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(settings);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0094eb]/10 text-[#0094eb] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-[#0094eb]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Personalização do Vidlytics</h2>
              <p className="text-xs text-muted-foreground">Ajuste o visual do widget e do player para os visitantes da sua loja</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor Dispositivo sutil */}
            <div className="hidden sm:flex items-center bg-muted/60 p-1 rounded-xl border border-border/50 mr-2">
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewDevice === 'mobile' 
                    ? 'bg-[#0094eb] text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewDevice === 'desktop' 
                    ? 'bg-[#0094eb] text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" /> Desktop
              </button>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-muted">
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Corpo: Painel de Configurações + Visualizador */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Coluna de Configuração (5 colunas) */}
          <div className="md:col-span-5 border-r border-border flex flex-col h-full bg-card/40">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-6 pt-3 pb-2 border-b border-border/60">
                <TabsList className="grid grid-cols-2 w-full bg-muted/70">
                  <TabsTrigger value="design" className="text-xs data-[state=active]:bg-background">
                    <Palette className="w-3.5 h-3.5 mr-1.5" /> Estilo & Cores
                  </TabsTrigger>
                  <TabsTrigger value="behavior" className="text-xs data-[state=active]:bg-background">
                    <Sliders className="w-3.5 h-3.5 mr-1.5" /> Comportamento
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <TabsContent value="design" className="m-0 space-y-5">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cores do Widget</Label>
                    
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium">Cor Primária</span>
                        <p className="text-xs text-muted-foreground">Botões de ação e destaques</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => handleUpdate('primaryColor', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-xs font-mono uppercase bg-muted px-2 py-1 rounded-md">{settings.primaryColor}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium">Cor de Ênfase</span>
                        <p className="text-xs text-muted-foreground">Promoções e badges</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => handleUpdate('accentColor', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-xs font-mono uppercase bg-muted px-2 py-1 rounded-md">{settings.accentColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arredondamento das Bordas</Label>
                      <span className="text-xs font-medium text-muted-foreground">{settings.borderRadius}px</span>
                    </div>
                    <Slider
                      value={[settings.borderRadius]}
                      max={24}
                      min={0}
                      step={2}
                      onValueChange={(val) => handleUpdate('borderRadius', val[0])}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Posição na Tela</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'bottom-right', label: 'Inferior Direito' },
                        { id: 'bottom-left', label: 'Inferior Esquerdo' },
                        { id: 'top-right', label: 'Superior Direito' },
                        { id: 'top-left', label: 'Superior Esquerdo' },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => handleUpdate('position', pos.id as any)}
                          className={`p-2.5 text-xs rounded-xl border text-left font-medium transition-all ${
                            settings.position === pos.id
                              ? 'border-[#0094eb] bg-[#0094eb]/10 text-[#0094eb] font-semibold'
                              : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="behavior" className="m-0 space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background">
                    <div>
                      <div className="text-sm font-medium">Autoplay com Vídeo Mudo</div>
                      <div className="text-xs text-muted-foreground">Inicia a reprodução silenciosa ao abrir</div>
                    </div>
                    <Switch
                      checked={settings.mutedAutoplay}
                      onCheckedChange={(val) => handleUpdate('mutedAutoplay', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background">
                    <div>
                      <div className="text-sm font-medium">Exibir Preço do Produto</div>
                      <div className="text-xs text-muted-foreground">Mostra tag de preço sobre o vídeo</div>
                    </div>
                    <Switch
                      checked={settings.showProductPrice}
                      onCheckedChange={(val) => handleUpdate('showProductPrice', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background">
                    <div>
                      <div className="text-sm font-medium">Botão Comprar Direto</div>
                      <div className="text-xs text-muted-foreground">Adiciona o produto com 1 clique</div>
                    </div>
                    <Switch
                      checked={settings.showAddToCartButton}
                      onCheckedChange={(val) => handleUpdate('showAddToCartButton', val)}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Coluna de Pré-visualização (7 colunas) */}
          <div className="md:col-span-7 bg-muted/20 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-4 left-6 flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Eye className="w-4 h-4 text-[#0094eb]" /> Pré-visualização em tempo real
            </div>

            {/* Mockup Mobile */}
            <div 
              className="relative w-[280px] h-[520px] bg-black rounded-[36px] p-2.5 shadow-2xl border-4 border-slate-800 flex flex-col overflow-hidden transition-all duration-300"
              style={{
                borderRadius: `${Math.min(settings.borderRadius * 2.5, 40)}px`
              }}
            >
              {/* Dynamic Island / Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
              </div>

              {/* Conteúdo Simulado do Vídeo */}
              <div className="relative w-full h-full bg-gradient-to-b from-slate-900 via-slate-800 to-black rounded-[28px] overflow-hidden flex flex-col justify-between p-4">
                
                {/* Header do Player */}
                <div className="pt-6 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                      SLL
                    </div>
                    <span className="text-xs font-semibold text-white/90 drop-shadow">Minha Loja</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white/70">
                    <X className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card de Produto no Rodapé */}
                <div className="space-y-3 z-10">
                  {settings.showProductPrice && (
                    <div className="bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/10 flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/40">
                        <ShoppingBag className="w-5 h-5 text-white/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-white truncate">Jaqueta Corta-Vento Pro</p>
                        <p className="text-[11px] font-bold" style={{ color: settings.accentColor }}>R$ 189,90</p>
                      </div>
                      {settings.showAddToCartButton && (
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1"
                          style={{ backgroundColor: settings.primaryColor }}
                        >
                          Comprar
                        </button>
                      )}
                    </div>
                  )}

                  {/* Barra de Progresso / Controles */}
                  <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                    <div className="h-full w-2/3" style={{ backgroundColor: settings.primaryColor }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé / Ações */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-card/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restaurar Padrões
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="text-xs font-semibold bg-[#0094eb] hover:bg-[#0094eb]/90 text-white gap-1.5"
            >
              <Check className="w-4 h-4" /> Salvar Alterações
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AppearanceModal;
