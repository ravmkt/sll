import React, { useRef, useState, useEffect } from "react";
import { Eye, Check, ChevronLeft, ChevronRight, Sparkles, Radio, Flame, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_APPEARANCES, DefaultAppearance } from "@/data/defaultAppearances";

interface TemplatesCarouselProps {
  currentDefaultId?: string | null;
  onSetDefault: (id: string) => void;
  onPreview: (template: DefaultAppearance) => void;
}

// Configuração visual temática para cada template
const TEMPLATE_PREVIEWS: Record<string, {
  accentColor: string;
  badgeBg: string;
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
}> = {
  DEFAULT_VIDLYTICS: {
    accentColor: "#0094EB",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gradient: "from-blue-950/40 via-neutral-900 to-neutral-950",
    icon: Sparkles,
    tagline: "Identidade Azul Oficial",
  },
  DEFAULT_LIVE: {
    accentColor: "#EF4444",
    badgeBg: "bg-red-500/10 text-red-400 border-red-500/20",
    gradient: "from-red-950/40 via-neutral-900 to-neutral-950",
    icon: Radio,
    tagline: "Foco em Transmissões e Urgência",
  },
  DEFAULT_BLACK_FRIDAY: {
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    gradient: "from-amber-950/30 via-neutral-900 to-neutral-950",
    icon: Flame,
    tagline: "Alta Conversão e Ofertas",
  },
  DEFAULT_NATAL: {
    accentColor: "#DC2626",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    gradient: "from-emerald-950/30 via-neutral-900 to-neutral-950",
    icon: Gift,
    tagline: "Festividades de Fim de Ano",
  },
};

export const TemplatesCarousel: React.FC<TemplatesCarouselProps> = ({
  currentDefaultId,
  onSetDefault,
  onPreview,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Estados para suportar drag com mouse
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const isDragging = useRef(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft: sLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(sLeft > 8);
    setCanScrollRight(sLeft < scrollWidth - clientWidth - 8);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDown.current = true;
    isDragging.current = false;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.4;
    if (Math.abs(walk) > 5) {
      isDragging.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    isDown.current = false;
  };

  return (
    <div className="relative group">
      {/* Botão Scroll Esquerda */}
      {canScrollLeft && (
        <button
          onClick={() => handleScroll("left")}
          aria-label="Rolar para a esquerda"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-neutral-900/90 border border-neutral-700 text-white shadow-xl flex items-center justify-center hover:bg-neutral-800 transition-all hover:scale-110"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Botão Scroll Direita */}
      {canScrollRight && (
        <button
          onClick={() => handleScroll("right")}
          aria-label="Rolar para a direita"
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-neutral-900/90 border border-neutral-700 text-white shadow-xl flex items-center justify-center hover:bg-neutral-800 transition-all hover:scale-110"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Trilho de Cards (Snap + Drag) */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory select-none cursor-grab active:cursor-grabbing no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {DEFAULT_APPEARANCES.map((template) => {
          const isCurrentDefault = currentDefaultId === template.id;
          const meta = TEMPLATE_PREVIEWS[template.id] || {
            accentColor: "#0094EB",
            badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            gradient: "from-neutral-900 to-neutral-950",
            icon: Sparkles,
            tagline: "Template Pronto",
          };
          const Icon = meta.icon;

          return (
            <div
              key={template.id}
              className={`snap-start shrink-0 w-[280px] sm:w-[300px] rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden bg-neutral-900/60 backdrop-blur-sm ${
                isCurrentDefault
                  ? "border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/5"
                  : "border-neutral-800 hover:border-neutral-700 hover:shadow-md hover:shadow-black/40"
              }`}
            >
              {/* Header do Card / Visual Mockup */}
              <div
                className={`relative h-40 bg-gradient-to-b ${meta.gradient} p-4 flex flex-col justify-between overflow-hidden border-b border-neutral-800/80`}
              >
                {/* Elementos visuais simulando a UI do tema */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <div
                    className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full blur-2xl"
                    style={{ backgroundColor: meta.accentColor }}
                  />
                  <div
                    className="absolute -left-6 -top-6 w-28 h-28 rounded-full blur-xl"
                    style={{ backgroundColor: meta.accentColor }}
                  />
                </div>

                <div className="relative z-1 flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-700/50 shadow-sm backdrop-blur-md">
                    <Icon className="w-5 h-5" style={{ color: meta.accentColor }} />
                  </div>
                  {isCurrentDefault && (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 gap-1 text-[11px] font-medium">
                      <Check className="w-3 h-3" /> Padrão Ativo
                    </Badge>
                  )}
                </div>

                {/* Mockup de Vídeo Stories do Tema */}
                <div className="relative z-1 flex items-center gap-2">
                  <div
                    className="w-10 h-14 rounded-md border shadow-sm flex items-center justify-center bg-neutral-950/80"
                    style={{ borderColor: meta.accentColor }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{ backgroundColor: meta.accentColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-neutral-400 truncate uppercase tracking-wider">
                      {meta.tagline}
                    </p>
                    <p className="text-sm font-semibold text-white truncate">
                      {template.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Corpo do Card */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                  {template.description}
                </p>

                {/* Ações: Visualizar e Marcar como Padrão */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      if (isDragging.current) return;
                      e.stopPropagation();
                      onPreview(template);
                    }}
                    className="w-full text-xs border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-200 hover:text-white gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualizar
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isCurrentDefault}
                    onClick={(e) => {
                      if (isDragging.current) return;
                      e.stopPropagation();
                      onSetDefault(template.id);
                    }}
                    className={`w-full text-xs font-medium transition-all ${
                      isCurrentDefault
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                        : "bg-white hover:bg-neutral-200 text-neutral-950"
                    }`}
                  >
                    {isCurrentDefault ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Ativo
                      </span>
                    ) : (
                      "Definir padrão"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
