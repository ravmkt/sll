import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { TEMPLATES, type ArtTemplate } from './templates';

type Loose = { bgType?: string; cutout?: boolean; images?: { feed?: string; story?: string } };

const resolveImg = (p?: string) => {
  if (!p) return '';
  if (/^(https?:|\/|data:)/.test(p)) return p;
  const withExt = /\.\w+$/.test(p) ? p : `${p}.webp`;
  return `/assets/templates/${withExt}`;
};

export function tplMeta(t: ArtTemplate) {
  const m = t as unknown as Loose;
  return {
    bgType: m.bgType === 'image' ? 'image' : 'code',
    cutout: !!m.cutout,
    feed: resolveImg(m.images?.feed),
  };
}

export function TemplateThumb({ t, className = '' }: { t: ArtTemplate; className?: string }) {
  const m = tplMeta(t);
  const [failed, setFailed] = useState(false);
  const showImg = m.bgType === 'image' && !!m.feed && !failed;
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-200 ${className}`}
      style={{ background: `linear-gradient(160deg,${t.bgFrom},${t.bgTo})` }}
    >
      {showImg && (
        <img src={m.feed} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
      <span className="absolute bottom-2 left-2 h-1.5 w-1/3 rounded" style={{ background: t.accent }} />
      <span className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-white shadow" style={{ background: t.accent }} />
    </div>
  );
}

const GROUPS = [
  { id: 'image', title: 'Fundo com imagem', hint: 'Só a cor de Destaque muda. O texto se ajusta ao fundo.' },
  { id: 'code', title: 'Fundo em cores', hint: 'Fundo 1, Fundo 2 e Destaque são editáveis.' },
];

interface Props {
  current: string;
  onPick: (key: string) => void;
  onClose: () => void;
}

export default function TemplatePicker({ current, onPick, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Escolha um template</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {GROUPS.map((g) => {
          const list = TEMPLATES.filter((t) => tplMeta(t).bgType === g.id);
          if (!list.length) return null;
          return (
            <div key={g.id} className="mb-6 last:mb-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{g.title}</p>
              <p className="mb-3 text-xs text-slate-400">{g.hint}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {list.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onPick(t.key)}
                    className={`rounded-xl border p-2 text-left transition ${current === t.key ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand-soft)] ring-2 ring-[color:color-mix(in_srgb,var(--sll-b-brand)_20%,transparent)]' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <TemplateThumb t={t} className="aspect-[4/5] w-full" />
                    <div className="mt-2 flex items-center gap-1">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{t.label}</p>
                      {current === t.key && <Check size={14} className="shrink-0 text-[color:var(--sll-b-brand)]" />}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}