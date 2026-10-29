import { AlertTriangle, XCircle } from 'lucide-react';
import { checkAppearance } from '../../lib/contrastCheck';

interface Props {
  config: Record<string, unknown>;
}

export default function ContrastWarnings({ config }: Props) {
  const issues = checkAppearance(config || {});
  if (!issues.length) return null;

  return (
    <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="mb-2 font-semibold">{'Contraste baixo (m\u00ednimo recomendado 4,5:1)'}</p>
      <ul className="space-y-1">
        {issues.map((i) => (
          <li key={i.id} className="flex items-start gap-2">
            {i.level === 'bad' ? (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            )}
            <span>
              <strong>{i.label}</strong>
              {': '}
              {i.ratio.toFixed(1).replace('.', ',')}
              {':1 '}
              {i.level === 'bad' ? '\u2014 ileg\u00edvel' : '\u2014 leitura dif\u00edcil'}
              {'. Na loja o texto usa '}
              {i.suggested === '#FFFFFF' ? 'branco' : 'preto'}
              {' automaticamente.'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}