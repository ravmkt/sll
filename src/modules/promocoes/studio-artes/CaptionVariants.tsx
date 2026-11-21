import { Copy, Undo2 } from 'lucide-react';
import { channelByKey } from './lib';
import { bioVersion, type CaptionOverrides } from './captionHelpers';

interface Props {
  base: string;
  channels: string[];
  overrides: CaptionOverrides;
  onChange: (o: CaptionOverrides) => void;
}

const BTN = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100';

export default function CaptionVariants({ base, channels, overrides, onChange }: Props) {
  if (!channels.length) return null;

  const set = (key: string, value: string) => onChange({ ...overrides, [key]: value });
  const clear = (key: string) => {
    const next = { ...overrides };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-semibold text-slate-500">
        Legenda por canal. Sem personalização, o canal usa a mensagem padrão acima.
      </p>
      {channels.map((key) => {
        const ch = channelByKey(key);
        const custom = overrides[key] !== undefined;
        const isInsta = key.startsWith('instagram');
        return (
          <div key={key} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{ch?.label ?? key}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${custom ? 'bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]' : 'bg-slate-100 text-slate-500'}`}>
                {custom ? 'Personalizada' : 'Padrão'}
              </span>
              <div className="ml-auto flex gap-2">
                {!custom && (
                  <button type="button" className={BTN} onClick={() => set(key, isInsta ? bioVersion(base) : base)}>
                    <Copy size={14} /> {isInsta ? 'Duplicar (link na bio)' : 'Duplicar e editar'}
                  </button>
                )}
                {custom && (
                  <button type="button" className={BTN} onClick={() => clear(key)}>
                    <Undo2 size={14} /> Voltar ao padrão
                  </button>
                )}
              </div>
            </div>
            {custom && (
              <textarea
                className="h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-[color:var(--sll-b-brand)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--sll-b-brand)_20%,transparent)]"
                value={overrides[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}