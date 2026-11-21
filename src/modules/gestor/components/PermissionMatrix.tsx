import type { TeamPermissions } from '../services/equipe';
import { ACTIONS, AREAS } from '../services/teamConfig';

interface Props {
  value: TeamPermissions;
  onChange: (v: TeamPermissions) => void;
  disabled?: boolean;
}

export default function PermissionMatrix({ value, onChange, disabled }: Props) {
  const toggle = (area: string, act: string) => {
    if (disabled) return;
    const cur = new Set(value[area] ?? []);
    if (cur.has(act)) {
      if (act === 'ver') cur.clear();
      else cur.delete(act);
    } else {
      cur.add(act);
      if (act !== 'ver') cur.add('ver');
    }
    const next: TeamPermissions = { ...value };
    if (cur.size) next[area] = ACTIONS.map((a) => a.key).filter((k) => cur.has(k));
    else delete next[area];
    onChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Área</th>
            {ACTIONS.map((a) => (
              <th key={a.key} className="px-2 py-2 text-center font-medium">{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {AREAS.map((area) => (
            <tr key={area.key}>
              <td className="px-3 py-1.5">{area.label}</td>
              {ACTIONS.map((a) => (
                <td key={a.key} className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)] disabled:cursor-not-allowed"
                    checked={(value[area.key] ?? []).includes(a.key)}
                    onChange={() => toggle(area.key, a.key)}
                    disabled={disabled}
                    aria-label={`${area.label}: ${a.label}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}