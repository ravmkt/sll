import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus } from 'lucide-react';
import { inputCls } from '@/components/products/Modal';

const norm = (s: string) => s.trim().toLowerCase();
const W = 272;

type Props = {
  value: string[];
  allTags: string[];
  disabled?: boolean;
  onChange: (list: string[]) => void;
};

export default function CategoryTagPicker({ value, allTags, disabled, onChange }: Props) {
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [q, setQ] = useState('');

  const open = () => {
    if (disabled || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8));
    const top = r.bottom + 6 + 300 > window.innerHeight ? Math.max(8, r.top - 306) : r.bottom + 6;
    setPos({ top, left });
    setQ('');
  };

  const has = (t: string) => value.some((v) => norm(v) === norm(t));
  const toggle = (t: string) => onChange(has(t) ? value.filter((v) => norm(v) !== norm(t)) : [...value, t]);

  const options = useMemo(() => {
    const all = [...allTags];
    value.forEach((v) => { if (!all.some((a) => norm(a) === norm(v))) all.push(v); });
    const n = norm(q);
    return all.filter((t) => !n || norm(t).includes(n)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allTags, value, q]);

  const canCreate = q.trim() !== '' && !allTags.some((a) => norm(a) === norm(q));

  const commit = () => {
    const t = q.trim();
    if (!t) return;
    const existing = allTags.find((a) => norm(a) === norm(t)) ?? t;
    if (!has(existing)) onChange([...value, existing]);
    setQ('');
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        onClick={open}
        title={disabled ? undefined : 'Escolher tags'}
        className={`flex max-w-[22rem] shrink-0 flex-wrap items-center justify-end gap-1 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {value.length === 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-[10px] font-bold text-slate-400 hover:border-[color:var(--sll-b-brand)] hover:text-[color:var(--sll-b-brand)] dark:border-slate-600">
            <Plus size={10} /> tag
          </span>
        ) : (
          <>
            {value.map((t) => (
              <span key={t} className="rounded-full bg-[color:var(--sll-b-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--sll-b-brand)]">{t}</span>
            ))}
            <span className="rounded-full border border-dashed border-slate-300 p-0.5 text-slate-400 dark:border-slate-600"><Plus size={10} /></span>
          </>
        )}
      </button>

      {pos && createPortal(
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setPos(null)} />
          <div style={{ top: pos.top, left: pos.left, width: W }} className="fixed z-[210] rounded-xl border border-slate-200 bg-[color:var(--sll-surface)] p-2 shadow-2xl dark:border-slate-700">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setPos(null); }}
              placeholder="Buscar ou criar tag..."
              className={inputCls + ' !py-1.5 !text-xs'}
            />
            <div className="mt-2 max-h-48 overflow-y-auto">
              {options.map((t) => (
                <button key={t} type="button" onClick={() => toggle(t)} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${has(t) ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand)] text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {has(t) && <Check size={11} />}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{t}</span>
                </button>
              ))}
              {options.length === 0 && !canCreate && <p className="px-2 py-3 text-center text-xs text-slate-400">Nenhuma tag criada ainda.</p>}
              {canCreate && (
                <button type="button" onClick={commit} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold text-[color:var(--sll-b-brand)] hover:bg-[color:var(--sll-b-brand-soft)]">
                  <Plus size={13} /> Criar "{q.trim()}"
                </button>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}