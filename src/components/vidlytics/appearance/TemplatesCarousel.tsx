import React, { useRef, useState, useEffect } from "react";
import { Eye, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { DEFAULT_APPEARANCES, DefaultAppearance } from "@/data/defaultAppearances";

interface TemplatesCarouselProps {
  templates?: any[];
  onView: (id: string) => void;
  onSetDefault?: (id: string) => void;
}

export const TemplatesCarousel: React.FC<TemplatesCarouselProps> = ({
  templates = DEFAULT_APPEARANCES,
  onView,
  onSetDefault,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Estados de arrastar com mouse (drag-to-scroll)
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const isDragging = useRef(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft: sLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(sLeft > 10);
    setCanScrollRight(sLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [templates]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = 340;
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
    const walk = (x - startX.current) * 1.3;
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
    <div className="relative group/carousel py-2">
      {/* Botão Seta Esquerda */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          aria-label="Anterior"
          className="absolute -left-3 top-[44%] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:scale-105 transition-all"
        >
          <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
        </button>
      )}

      {/* Botão Seta Direita */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll("right")}
          aria-label="Próximo"
          className="absolute -right-3 top-[44%] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:scale-105 transition-all"
        >
          <ChevronRight className="w-6 h-6 stroke-[1.5]" />
        </button>
      )}

      {/* Trilho horizontal */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex gap-6 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory select-none cursor-grab active:cursor-grabbing no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {templates.map((tpl: any) => {
          const themeColor =
            tpl.widget_style?.desktop?.floating_border_color || "#0094EB";
          const isDefault = tpl.is_default;

          return (
            <div
              key={tpl.id}
              className="snap-start shrink-0 w-[290px] sm:w-[320px] flex flex-col gap-2"
            >
              {/* Título do Template acima da imagem */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {tpl.name}
                </span>
                {isDefault && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#0094eb] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                    <Star size={11} className="fill-[#0094eb]" /> Padrão
                  </span>
                )}
              </div>

              {/* Moldura da Imagem / Mockup com cantos arredondados */}
              <div
                onClick={() => {
                  if (isDragging.current) return;
                  onView(tpl.id);
                }}
                className="group relative w-full aspect-[16/10] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Caso o template tenha imagem real cadastrada */}
                {tpl.imageUrl && (
                  <img
                    src={tpl.imageUrl}
                    alt={tpl.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}

                {/* Mockup visual estilizado (fallback elegante como a vitrine) */}
                <div className="w-full h-full p-4 flex flex-col justify-between bg-[#f8f6f2] dark:bg-slate-900">
                  {/* Topo tipo navegador */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                    <span className="text-[11px] font-serif font-bold tracking-widest text-slate-700 dark:text-slate-300">
                      ÉCLAT
                    </span>
                    <div className="flex gap-2 text-[9px] uppercase tracking-wider text-slate-400">
                      <span>Vestidos</span>
                      <span>Calçados</span>
                    </div>
                  </div>

                  {/* Conteúdo com moldura de celular simulando Stories/Widget */}
                  <div className="flex-1 flex items-center justify-between px-2 pt-2">
                    <div className="space-y-1 max-w-[140px]">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">
                        Últimas Unidades
                      </p>
                      <h5 className="text-xs font-serif font-bold text-slate-800 dark:text-slate-100 uppercase leading-tight">
                        Elegância Essencial
                      </h5>
                    </div>

                    {/* Mockup do Widget Flutuante / Stories com a cor do template */}
                    <div
                      className="w-14 h-24 rounded-xl border-2 shadow-md bg-white dark:bg-slate-800 flex flex-col justify-between p-1 relative overflow-hidden"
                      style={{ borderColor: themeColor }}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: themeColor }}
                        />
                        <span className="text-[7px] text-slate-400 font-bold">LIVE</span>
                      </div>
                      <div className="w-full h-8 rounded bg-slate-100 dark:bg-slate-700/60" />
                      <div
                        className="w-full py-0.5 rounded text-[7px] text-center text-white font-medium shadow-xs"
                        style={{ backgroundColor: themeColor }}
                      >
                        Ver Loja
                      </div>
                    </div>
                  </div>
                </div>

                {/* Efeito hover suave */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors" />
              </div>

              {/* Botão Visualizar abaixo da imagem */}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    if (isDragging.current) return;
                    e.stopPropagation();
                    onView(tpl.id);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white font-medium py-1 px-3 rounded-md transition-colors"
                >
                  <Eye size={15} />
                  Visualizar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
