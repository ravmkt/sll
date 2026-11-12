import { useState } from 'react';

const CATS: Record<string, number[]> = {
  Promo: [0x1F525, 0x1F3F7, 0x1F4A5, 0x2728, 0x1F4B0, 0x1F389, 0x1F381, 0x1F6CD, 0x1F6D2, 0x1F4E6, 0x1F69A, 0x1F4B3, 0x1F195, 0x1F193, 0x1F51D, 0x1F4AF],
  Destaque: [0x2B50, 0x1F31F, 0x26A1, 0x1F451, 0x1F48E, 0x1F3C6, 0x1F3AF, 0x1F680, 0x1F514, 0x1F4E2, 0x1F6E1, 0x1F48C],
  Status: [0x1F512, 0x1F513, 0x23F0, 0x23F3, 0x1F4C5, 0x26A0, 0x2705, 0x2714, 0x274C, 0x27A1, 0x2B07, 0x1F449, 0x1F4F2, 0x1F534, 0x1F7E1, 0x1F7E2],
  Rostos: [0x1F60D, 0x1F60E, 0x1F929, 0x1F973, 0x1F64C, 0x1F44F, 0x1F44D, 0x2764],
};

const emoji = (cp: number) => String.fromCodePoint(cp) + (cp < 0x10000 ? '\uFE0F' : '');

export default function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('Promo');
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#0094eb] hover:text-[#0094eb]"
      >
        {'\u{1F600} Emojis'}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex flex-wrap gap-1">
            {Object.keys(CATS).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={'rounded px-2 py-0.5 text-[11px] font-semibold ' + (cat === c ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {CATS[cat].map((cp) => (
              <button
                key={cp}
                type="button"
                onClick={() => onPick(emoji(cp))}
                className="rounded p-1 text-lg hover:bg-slate-100"
              >
                {emoji(cp)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}