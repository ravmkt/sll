import { useState } from 'react';
import BenefitIcon from './BenefitIcon';
import { ICON_GROUPS, sanitizeSvg } from '../../lib/benefitIcons';
import type { BenefitItem } from '../../types/infoCards';

interface Props { item: BenefitItem; onChange: (p: Partial<BenefitItem>) => void }

export default function IconPicker({ item, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState('');
  const [err, setErr] = useState('');
  const term = q.trim().toLowerCase();

  const pick = (icon: string, svg: string) => { onChange({ icon, icon_svg: svg }); setOpen(false); };
  const useCustom = () => {
    const s = sanitizeSvg(custom);
    if (!s) { setErr('SVG inválido ou sem formas permitidas.'); return; }
    setErr(''); setCustom(''); pick('custom', s);
  };

  return (
    <div className="relative">
      <button type="button" title="Escolher ícone" onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:border-[color:var(--sll-b-brand)]">
        <BenefitIcon svg={item.icon_svg} size={20} color="#0094EB" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-12 z-30 w-[330px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <input className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[color:var(--sll-b-brand)]"
              placeholder="Buscar ícone..." value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {ICON_GROUPS.map((g) => {
                const icons = g.icons.filter((i) => !term || i.label.toLowerCase().includes(term) || i.name.includes(term));
                if (!icons.length) return null;
                return (
                  <div key={g.id}>
                    <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">{g.label}</div>
                    <div className="grid grid-cols-6 gap-1">
                      {icons.map((i) => (
                        <button key={i.name} type="button" title={i.label} onClick={() => pick(i.name, i.svg)}
                          className={`flex h-9 items-center justify-center rounded-lg hover:bg-[color:var(--sll-b-brand-soft)] ${item.icon === i.name ? 'bg-[color:var(--sll-b-brand-soft)]' : ''}`}>
                          <BenefitIcon svg={i.svg} size={18} color="#334155" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">Ícone próprio (SVG)</div>
              <textarea rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="<svg viewBox=&quot;0 0 24 24&quot;>...</svg>"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs outline-none focus:border-[color:var(--sll-b-brand)]" />
              {err && <p className="text-xs text-red-600">{err}</p>}
              <button type="button" onClick={useCustom} className="mt-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white">Usar SVG</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
