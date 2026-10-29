import { useState } from 'react';
import { AlertTriangle, ChevronDown, XCircle } from 'lucide-react';
import { checkAppearance } from '../../lib/contrastCheck';

interface Props {
  config: Record<string, unknown>;
}

export default function ContrastWarnings({ config }: Props) {
  const [open, setOpen] = useState(false);
  const issues = checkAppearance(config || {});
  if (!issues.length) return null;

  const bad = issues.some((i) => i.level === 'bad');
  const title = issues.length === 1 ? '1 aviso de contraste' : issues.length + ' avisos de contraste';

  return (
    <div className="shrink-0 border-b border-amber-200 bg-amber-50 text-xs text-amber-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left font-semibold"
      >
        {bad ? <XCircle className="h-4 w-4 shrink-0 text-red-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
        <span className="flex-1">{title}</span>
        <span className="text-[10px] font-medium text-amber-700">{'recomendado 4,5:1'}</span>
        <ChevronDown className={'h-4 w-4 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <ul className="max-h-48 space-y-2 overflow-y-auto border-t border-amber-200 px-4 py-2">
          {issues.map((i) => (
            <li key={i.id} className="flex items-start gap-2">
              <span className="mt-0.5 flex shrink-0 overflow-hidden rounded border border-amber-300">
                <span className="h-4 w-4" style={{ background: i.fg }} />
                <span className="h-4 w-4" style={{ background: i.bg }} />
              </span>
              <span className="leading-snug">
                <strong>{i.label}</strong>
                {': '}
                {i.ratio.toFixed(1).replace('.', ',')}
                {':1 '}
                {i.level === 'bad' ? '\u2014 ileg\u00edvel' : '\u2014 leitura dif\u00edcil'}
                {'. Sugest\u00e3o: texto '}
                {i.suggested === '#FFFFFF' ? 'branco' : 'preto'}
                {' neste fundo.'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && <p className="px-4 pb-2 text-[10px] text-amber-700">{'Apenas recomenda\u00e7\u00e3o: a loja usa exatamente as cores que voc\u00ea escolheu.'}</p>}
    </div>
  );
}