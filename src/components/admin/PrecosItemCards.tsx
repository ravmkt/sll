import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getModulesOverview, type ModuleOverview } from '@/services/admin/modulesService';
import { getComboStats, getModulesRevenue, type ComboStat, type ModulesRevenue } from '@/services/admin/modulesRevenue';
import type { DynamicPlan } from '@/services/admin/plansAdmin';
import type { ComboModuleRow } from '@/services/admin/combosAdmin';
import ItemCard, { BTN } from '@/components/admin/ItemCard';
import { CARD } from '@/components/admin/moduleUi';

const STATUS_TIP: Record<string, string> = {
  active: 'Ativo: visível e disponível para contratação.',
  coming_soon: 'Em breve: aparece como lançamento, ainda sem contratação.',
  hidden: 'Oculto: invisível para os lojistas (rascunho/pausado).',
};
const STATUS_DOT: Record<string, 'green' | 'yellow' | 'gray'> = { active: 'green', coming_soon: 'yellow', hidden: 'gray' };
const sortOf = (p: DynamicPlan) => ((p as any).sort_order ?? 999) as number;

type Props = {
  kind: 'modulos' | 'combos';
  plans: DynamicPlan[] | null;
  comboMods: ComboModuleRow[];
  onManage: (key: string) => void;
};

export default function PrecosItemCards({ kind, plans, comboMods, onManage }: Props) {
  const [mods, setMods] = useState<ModuleOverview[]>([]);
  const [rev, setRev] = useState<ModulesRevenue | null>(null);
  const [stats, setStats] = useState<Record<string, ComboStat>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let off = false;
    Promise.all([
      getModulesOverview(30).catch(() => null),
      getModulesRevenue(30, null).catch(() => null),
      getComboStats(null).catch(() => ({} as Record<string, ComboStat>)),
    ]).then(([o, r, s]) => {
      if (off) return;
      setMods(o?.modules ?? []);
      setRev(r);
      setStats(s);
      setReady(true);
    });
    return () => { off = true; };
  }, []);

  const list = useMemo(
    () => [...mods].sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || (a.sort_order ?? 999) - (b.sort_order ?? 999)),
    [mods],
  );
  const logos = useMemo(() => Object.fromEntries(mods.map((m) => [m.slug, m.logo_url])) as Record<string, string | null>, [mods]);
  const modName = useMemo(() => new Map(mods.map((m) => [m.slug, m.name])), [mods]);
  const revBy = useMemo(
    () => new Map((rev?.items || []).filter((i) => !i.is_combo).map((i) => [i.item_key, Number(i.cents) || 0] as [string, number])),
    [rev],
  );
  const combos = useMemo(() => (plans || []).filter((p) => p.is_combo).sort((a, b) => sortOf(a) - sortOf(b)), [plans]);

  const slugsOf = (id: string) => comboMods.filter((r) => r.plan_id === id).map((r) => r.module_slug);
  const line = (id: string) => slugsOf(id).map((s) => modName.get(s) || s).join(' + ') || 'Nenhum módulo definido';
  const comboRev = (id: string) => Number(rev?.items.find((i) => i.item_key === `combo:${id}`)?.cents) || 0;
  const manageBtn = (onClick: () => void) => (
    <button type="button" onClick={onClick} className={`${BTN} bg-sky-500/15 text-sky-300 hover:bg-sky-500/25`}>Gerenciar preços</button>
  );

  if (!ready || plans === null) return <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />;

  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-black uppercase tracking-wider text-white">{kind === 'modulos' ? 'Módulos' : 'Combos'}</h2>

      {kind === 'modulos' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((m) => (
            <ItemCard
              key={m.slug}
              kind="module"
              dot={{ color: STATUS_DOT[m.status] || 'gray', tip: STATUS_TIP[m.status] || m.status }}
              logos={[{ url: m.logo_url, name: m.name }]}
              title={m.name}
              subtitle={m.is_public_for_sale ? undefined : 'Fora de venda'}
              stats={{ total: Number(m.access) || 0, trial: Number(m.trial) || 0, paying: Number(m.paying) || 0 }}
              revenue={revBy.get(m.slug) ?? 0}
              onOpen={() => onManage(m.slug)}
              actions={manageBtn(() => onManage(m.slug))}
            />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className={CARD}><p className="text-[13px] text-slate-500">Nenhum combo cadastrado. A criação é feita na tela Módulos.</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {combos.map((p) => {
            const st = stats[p.id];
            return (
              <ItemCard
                key={p.id}
                kind="combo"
                dot={p.is_active
                  ? { color: 'green', tip: 'Ativo: visível e disponível para contratação.' }
                  : { color: 'gray', tip: 'Pausado: oculto para novas contratações.' }}
                logos={slugsOf(p.id).map((s) => ({ url: logos[s] ?? null, name: modName.get(s) || s }))}
                title={p.plan_name}
                subtitle={line(p.id)}
                stats={{ total: Number(st?.total) || 0, trial: Number(st?.trial) || 0, paying: Number(st?.paying) || 0 }}
                revenue={comboRev(p.id)}
                onOpen={() => onManage(p.id)}
                actions={manageBtn(() => onManage(p.id))}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}