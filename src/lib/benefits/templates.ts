export type IconPosition = 'top' | 'left' | 'right'
export type IconBg = 'none' | 'circle' | 'square'

export interface BenefitIconStyle {
  icon_position: IconPosition
  icon_size: number
  icon_color: string | null
  icon_bg: IconBg
  icon_bg_color: string | null
}

export interface BenefitTemplate {
  id: string
  label: string
  description: string
  icon: BenefitIconStyle
  container: {
    layout: 'bar' | 'cards'
    bg_color: string
    text_color: string
    border_color: string | null
    border_width: number
    radius: number
    uppercase: boolean
    align: 'left' | 'center'
    divider: boolean
  }
  items: { title: string; subtitle?: string; icon_name?: string }[]
}

export const BENEFIT_TEMPLATES: BenefitTemplate[] = [
  {
    id: 'bar-icon-left',
    label: 'Faixa com ícone',
    description: 'Fundo branco, ícone fino à esquerda, título e subtítulo',
    icon: { icon_position: 'left', icon_size: 30, icon_color: '#111111', icon_bg: 'none', icon_bg_color: null },
    container: { layout: 'bar', bg_color: '#ffffff', text_color: '#111111', border_color: null, border_width: 0, radius: 0, uppercase: false, align: 'center', divider: false },
    items: [
      { title: 'Baixe o app', subtitle: 'e ganhe vantagens', icon_name: 'Tag' },
      { title: 'Pague no Pix', subtitle: 'e ganhe 5% OFF', icon_name: 'QrCode' },
      { title: 'Frete grátis', subtitle: 'a partir de R$ 699', icon_name: 'Truck' },
      { title: 'Personal Shopper', subtitle: 'atendimento exclusivo', icon_name: 'ShoppingBag' },
      { title: 'Retire na loja', subtitle: 'e ganhe 15% OFF', icon_name: 'Store' },
    ],
  },
  {
    id: 'bar-text-only',
    label: 'Faixa só texto',
    description: 'Fundo cinza, texto em maiúsculas, sem ícone',
    icon: { icon_position: 'left', icon_size: 0, icon_color: null, icon_bg: 'none', icon_bg_color: null },
    container: { layout: 'bar', bg_color: '#f0f0f0', text_color: '#111111', border_color: null, border_width: 0, radius: 0, uppercase: true, align: 'center', divider: false },
    items: [
      { title: 'Frete grátis* acima de R$ 299' },
      { title: '5% OFF em compras com Pix' },
      { title: 'Até 6x sem juros' },
      { title: 'Envios para todo o Brasil' },
    ],
  },
  {
    id: 'cards-icon-top',
    label: 'Cards com ícone',
    description: 'Cards com borda, ícone em círculo no topo',
    icon: { icon_position: 'top', icon_size: 20, icon_color: '#ffffff', icon_bg: 'circle', icon_bg_color: 'rgba(255,255,255,0.18)' },
    container: { layout: 'cards', bg_color: '#3f5a4b', text_color: '#ffffff', border_color: '#d9a21b', border_width: 2, radius: 12, uppercase: false, align: 'center', divider: false },
    items: [
      { title: '1ª troca grátis', icon_name: 'RefreshCw' },
      { title: '5% OFF no Pix', icon_name: 'Percent' },
      { title: '6x sem juros', icon_name: 'CreditCard' },
      { title: 'Frete grátis', icon_name: 'Truck' },
    ],
  },
]
