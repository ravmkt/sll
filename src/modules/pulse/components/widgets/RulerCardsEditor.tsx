import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from 'lucide-react';
import EmojiPicker from '../../../builder/components/EmojiPicker';
import type { CardLine, Tier } from '../../types/widgets';
import { isSafeUrl } from '@/lib/safe-link';

const PH = ['Ex.: Leve 3 pe\u00e7as', 'Ex.: 10% OFF', 'Ex.: + Frete gr\u00e1tis'];
const inp = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm';

function norm(t: Tier): CardLine[] {
  const base = t.lines ?? [{ text: t.label }, { text: t.value }];
  return [0, 1, 2].map((i) => ({ ...(base[i] ?? { text: '' }) }));
}

export default function RulerCardsEditor({ tiers, onChange }: { tiers: Tier[]; onChange: (t: Tier[]) => void }) {
  const upd = (i: number, patch: Partial<Tier>) => onChange(tiers.map((t, k) => (k === i ? { ...t, ...patch } : t)));
  const setLine = (i: number, j: number, text: string) => {
    const lines = norm(tiers[i]);
    lines[j] = { ...lines[j], text };
    upd(i, { lines, label: lines[0].text, value: lines[1].text });
  };
  const move = (i: number, d: number) => {
    const k = i + d;
    if (k < 0 || k >= tiers.length) return;
    const c = [...tiers];
    [c[i], c[k]] = [c[k], c[i]];
    onChange(c);
  };
  const add = () => onChange([...tiers, { label: '', value: '', lines: [{ text: '' }, { text: '' }, { text: '' }] }]);

  return (
    <div className="space-y-3">
      {tiers.map((t, i) => {
        const lines = norm(t);
        return (
          <div key={i} className={'space-y-2 rounded-lg border p-3 ' + (t.highlight ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200')}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Card {i + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" title="Destacar" onClick={() => upd(i, { highlight: !t.highlight })}
                  className={'rounded p-1.5 ' + (t.highlight ? 'bg-amber-400 text-white' : 'text-slate-500 hover:bg-slate-100')}><Star size={14} /></button>
                <button type="button" title="Subir" onClick={() => move(i, -1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><ArrowUp size={14} /></button>
                <button type="button" title="Descer" onClick={() => move(i, 1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><ArrowDown size={14} /></button>
                <button type="button" title="Remover" onClick={() => onChange(tiers.filter((_, k) => k !== i))} className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>
            {lines.map((l, j) => (
              <div key={j} className="flex items-center gap-1">
                <input className={inp} placeholder={PH[j]} value={l.text} onChange={(e) => setLine(i, j, e.target.value)} />
                <EmojiPicker compact onPick={(e) => setLine(i, j, l.text + e)} />
              </div>
            ))}
            <input className={inp} type="url" inputMode="url" placeholder="Link do card inteiro (https://... ou /pagina) - opcional"
                  value={t.link ?? ''} onChange={(e) => upd(i, { link: e.target.value.trim() || undefined })} />
                {t.link && !isSafeUrl(t.link) && <p className="text-xs text-red-500">Use http(s):// ou /caminho</p>}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
              <label className="flex items-center gap-1">Borda
                <input type="color" value={t.border_color || '#000000'} onChange={(e) => upd(i, { border_color: e.target.value })} />
                {t.border_color && <button type="button" className="underline" onClick={() => upd(i, { border_color: undefined })}>limpar</button>}
              </label>
              <label className="flex items-center gap-1">Fundo
                <input type="color" value={t.bg_color || '#ffffff'} onChange={(e) => upd(i, { bg_color: e.target.value })} />
                {t.bg_color && <button type="button" className="underline" onClick={() => upd(i, { bg_color: undefined })}>limpar</button>}
              </label>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={add}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50">
        <Plus size={14} /> Adicionar card
      </button>
    </div>
  );
}