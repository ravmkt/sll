import type { Placement, PageRule } from './WidgetPlacementPicker';

const OPTIONS: [PageRule, string][] = [
  ['auto', 'Todas as páginas'],
  ['home', 'Somente na home'],
  ['url_contains', 'URL contém'],
  ['url_not_contains', 'URL não contém'],
  ['url_not_equals', 'URL diferente'],
];
const WITH_VALUE: PageRule[] = ['url_contains', 'url_not_contains', 'url_not_equals'];

export function ruleNeedsValue(p: Placement): boolean {
  return WITH_VALUE.includes(p.rule ?? 'auto') && !(p.rule_value ?? '').trim();
}

export default function PageRuleField({ value, onChange }: { value: Placement; onChange: (p: Placement) => void }) {
  const rule = value.rule ?? 'auto';
  const inp = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';
  return (
    <div className="mt-4 space-y-2">
      <label className="block text-sm font-bold text-slate-700">Em quais páginas aparece</label>
      <select
        className={inp}
        value={rule}
        onChange={(e) => {
          const r = e.target.value as PageRule;
          onChange({ ...value, rule: r, rule_value: WITH_VALUE.includes(r) ? value.rule_value ?? '' : '' });
        }}
      >
        {OPTIONS.map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      {WITH_VALUE.includes(rule) && (
        <input
          className={inp}
          value={value.rule_value ?? ''}
          placeholder="ex.: confort"
          onChange={(e) => onChange({ ...value, rule_value: e.target.value })}
        />
      )}
      {rule === 'home' && <p className="text-xs text-slate-500">Aparece apenas na página inicial (/).</p>}
    </div>
  );
}