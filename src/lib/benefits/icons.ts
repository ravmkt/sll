import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { icons } from 'lucide-react'

export const BENEFIT_ICON_GROUPS: Record<string, string[]> = {
  Entrega: ['Truck', 'Package', 'PackageCheck', 'PackageOpen', 'Box', 'MapPin', 'Plane', 'Ship', 'Bike', 'Globe', 'Clock', 'Timer', 'Hourglass', 'Calendar'],
  Pagamento: ['CreditCard', 'Wallet', 'Banknote', 'QrCode', 'Coins', 'HandCoins', 'PiggyBank', 'Receipt', 'Landmark', 'Infinity'],
  Descontos: ['Percent', 'BadgePercent', 'Tag', 'Tags', 'Ticket', 'Gift', 'Zap', 'Flame', 'Sparkles', 'PartyPopper'],
  Seguranca: ['ShieldCheck', 'Shield', 'Lock', 'LockKeyhole', 'BadgeCheck', 'CircleCheck', 'ThumbsUp', 'Handshake', 'Verified'],
  Trocas: ['RefreshCw', 'RotateCcw', 'Undo2', 'Repeat', 'ArrowLeftRight', 'Replace'],
  Atendimento: ['Headphones', 'MessageCircle', 'Phone', 'Mail', 'Users', 'UserCheck', 'HeartHandshake', 'Smartphone'],
  Loja: ['Store', 'ShoppingBag', 'ShoppingCart', 'Download', 'Star', 'Heart', 'Award', 'Medal', 'Trophy', 'Crown', 'Gem'],
  Produto: ['Shirt', 'Watch', 'Glasses', 'Scissors', 'Ruler', 'Leaf', 'Recycle', 'Sun', 'Droplets', 'Sprout'],
}

const lib = icons as unknown as Record<string, React.ComponentType<Record<string, unknown>>>

export const AVAILABLE_ICON_GROUPS: Record<string, string[]> = Object.fromEntries(
  Object.entries(BENEFIT_ICON_GROUPS)
    .map(([g, names]) => [g, names.filter((n) => !!lib[n])] as [string, string[]])
    .filter(([, names]) => names.length > 0),
)

export function getIconComponent(name?: string | null) {
  return name ? lib[name] ?? null : null
}

export function getIconSvg(name: string, strokeWidth = 1.75): string | null {
  const Cmp = lib[name]
  if (!Cmp) return null
  return renderToStaticMarkup(
    createElement(Cmp, { size: 24, strokeWidth, color: 'currentColor' }),
  )
}
