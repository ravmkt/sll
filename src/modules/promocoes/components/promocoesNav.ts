import type { ElementType } from 'react';
import {
  LayoutDashboard, Megaphone, CalendarClock, Tag, Ticket, Package,
  Palette, MessageSquareText, Images, BarChart3, Paintbrush, Code2,
} from 'lucide-react';

export type PromocoesTab =
  | 'painel' | 'campanhas' | 'cronograma'
  | 'precos' | 'cupons' | 'combos'
  | 'studio' | 'mensagens' | 'biblioteca'
  | 'metricas' | 'marca' | 'instalacao';

export interface PromocoesNavItem {
  id: PromocoesTab;
  label: string;
  icon: ElementType;
  description: string;
  ready: boolean;
}

export interface PromocoesNavSection {
  title: string;
  items: PromocoesNavItem[];
}

export const PROMOCOES_SECTIONS: PromocoesNavSection[] = [
  {
    title: 'Visão Geral',
    items: [
      { id: 'painel', label: 'Painel', icon: LayoutDashboard, description: 'Resumo das promoções ativas e resultados.', ready: false },
    ],
  },
  {
    title: 'Campanhas',
    items: [
      { id: 'campanhas', label: 'Campanhas', icon: Megaphone, description: 'Crie e gerencie campanhas promocionais.', ready: false },
      { id: 'cronograma', label: 'Cronograma', icon: CalendarClock, description: 'Planeje datas comerciais e agende promoções.', ready: false },
    ],
  },
  {
    title: 'Ofertas',
    items: [
      { id: 'precos', label: 'Preços promocionais', icon: Tag, description: 'Defina descontos e preços promocionais por produto.', ready: false },
      { id: 'cupons', label: 'Cupons', icon: Ticket, description: 'Cupons de desconto e frete grátis.', ready: false },
      { id: 'combos', label: 'Combos', icon: Package, description: 'Kits e combos com desconto progressivo.', ready: false },
    ],
  },
  {
    title: 'Artes & Mensagens',
    items: [
      { id: 'studio', label: 'Studio de Artes', icon: Palette, description: 'Defina o desconto, edite a mensagem e baixe todas as artes prontas.', ready: true },
      { id: 'mensagens', label: 'Modelos de mensagem', icon: MessageSquareText, description: 'Textos prontos para WhatsApp e redes sociais.', ready: false },
      { id: 'biblioteca', label: 'Biblioteca', icon: Images, description: 'Artes geradas e arquivos salvos.', ready: false },
    ],
  },
  {
    title: 'Resultados',
    items: [
      { id: 'metricas', label: 'Métricas', icon: BarChart3, description: 'Desempenho das promoções e retorno sobre vendas.', ready: false },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { id: 'marca', label: 'Marca e cores', icon: Paintbrush, description: 'Logo, cores e identidade das artes.', ready: false },
      { id: 'instalacao', label: 'Instalação', icon: Code2, description: 'Instalação e integração com a sua loja.', ready: false },
    ],
  },
];

export const PROMOCOES_ITEMS: PromocoesNavItem[] = PROMOCOES_SECTIONS.flatMap((s) => s.items);