import type { ElementType } from 'react';
import {
  CircleHelp, CirclePlay, Images, LayoutGrid, Megaphone, ShieldCheck, Image as ImageIcon, LayoutTemplate, MessageSquareQuote,
  MousePointerClick, ShoppingBag, TextCursorInput, Timer, Type,
} from 'lucide-react';
import type { BlockType } from './types';
import { Heading1, Hourglass, ListChecks, Store, Tag, Tags } from 'lucide-react';

export interface PaletteItem { key: string; type: BlockType; label: string; icon: ElementType; cols?: number }

export function ColsIcon({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-9 gap-0.5">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="flex-1 rounded-[3px] bg-current opacity-70" />
      ))}
    </span>
  );
}

const cols = (n: number): PaletteItem => ({
  key: `columns-${n}`, type: 'columns', cols: n,
  label: n === 1 ? '1 coluna' : `${n} colunas`,
  icon: () => <ColsIcon n={n} />,
});

export const PALETTE: { title: string; items: PaletteItem[] }[] = [
  { title: 'Layout', items: [cols(1), cols(2), cols(3), cols(4)] },
  {
    title: 'Campanha',
    items: [
      { key: 'brandbar', type: 'brandbar', label: 'Cabe\u00e7alho da marca', icon: Store },
      { key: 'badge', type: 'badge', label: 'Selo de campanha', icon: Tag },
      { key: 'heading', type: 'heading', label: 'T\u00edtulo da campanha', icon: Heading1 },
      { key: 'chips', type: 'chips', label: 'Selos de benef\u00edcios', icon: Tags },
      { key: 'countdown', type: 'countdown', label: 'Contagem regressiva', icon: Hourglass },
      { key: 'benefits', type: 'benefits', label: 'Card de benef\u00edcios', icon: ListChecks },
    ],
  },
  {
    title: 'Loja',
    items: [
      { key: 'announcement', type: 'announcement', label: 'Barra de an\u00fancio', icon: Megaphone },
      { key: 'highlights', type: 'highlights', label: 'Destaques informativos', icon: ShieldCheck },
          { key: 'showcase', type: 'showcase', label: 'Vitrine de produtos', icon: LayoutGrid },
    ],
  },
  {
    title: 'Conteúdo',
    items: [
      { key: 'hero', type: 'hero', label: 'Hero', icon: LayoutTemplate },
      { key: 'text', type: 'text', label: 'Texto', icon: Type },
      { key: 'image', type: 'image', label: 'Imagem', icon: ImageIcon },
      { key: 'button', type: 'button', label: 'Botão', icon: MousePointerClick },
      { key: 'video', type: 'video', label: 'Vídeo', icon: CirclePlay },
          { key: 'carousel', type: 'carousel', label: 'Carrossel de imagens', icon: Images },
          { key: 'banner', type: 'banner', label: 'Banner principal', icon: Images },
          { key: 'banners', type: 'banners', label: '1 a 3 banners', icon: Images },
    ],
  },
  {
    title: 'Conversão',
    items: [
      { key: 'product', type: 'product', label: 'Produto', icon: ShoppingBag },
      { key: 'form', type: 'form', label: 'Formulário', icon: TextCursorInput },
      { key: 'timer', type: 'timer', label: 'Timer', icon: Timer },
    ],
  },
  {
    title: 'Prova social',
    items: [
      { key: 'testimonials', type: 'testimonials', label: 'Depoimentos', icon: MessageSquareQuote },
      { key: 'faq', type: 'faq', label: 'FAQ', icon: CircleHelp },
    ],
  },
];