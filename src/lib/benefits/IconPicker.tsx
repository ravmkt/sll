import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { AVAILABLE_ICON_GROUPS, getIconComponent } from '@/lib/benefits/icons'
import { cn } from '@/lib/utils'

interface Props {
  value: string | null
  onChange: (name: string | null) => void
}

export function BenefitIconPicker({ value, onChange }: Props) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    return Object.entries(AVAILABLE_ICON_GROUPS)
      .map(([g, names]) => [g, term ? names.filter((n) => n.toLowerCase().includes(term)) : names] as const)
      .filter(([, names]) => names.length > 0)
  }, [q])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Buscar ícone (ex.: Truck)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn('rounded-md border px-3 py-2 text-sm', value === null && 'border-primary bg-primary/10')}
        >
          Sem ícone
        </button>
      </div>
      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {groups.map(([group, names]) => (
          <div key={group}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{group}</p>
            <div className="grid grid-cols-8 gap-1">
              {names.map((n) => {
                const Icon = getIconComponent(n)
                if (!Icon) return null
                return (
                  <button
                    key={n}
                    type="button"
                    title={n}
                    onClick={() => onChange(n)}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-md border hover:bg-muted',
                      value === n && 'border-primary bg-primary/10',
                    )}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
