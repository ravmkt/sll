import { Field, NumInput } from './fields';
import type { ProductRow } from '../types';

interface Props {
  product: ProductRow;
  onChange: (patch: Partial<ProductRow>) => void;
}

export default function DimensionsTab({ product: p, onChange }: Props) {
  const volume =
    p.width_cm && p.height_cm && p.depth_cm ? p.width_cm * p.height_cm * p.depth_cm : null;
  const weightError =
    p.net_weight_kg != null && p.gross_weight_kg != null && p.net_weight_kg > p.gross_weight_kg;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Peso</h3>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Peso líquido (kg)" hint="Peso do produto sem embalagem.">
            <NumInput value={p.net_weight_kg} step="0.001" onChange={(v) => onChange({ net_weight_kg: v })} />
          </Field>
          <Field label="Peso bruto (kg)" hint="Peso com embalagem. Usado no cálculo de frete.">
            <NumInput value={p.gross_weight_kg} step="0.001" onChange={(v) => onChange({ gross_weight_kg: v })} />
          </Field>
        </div>
        {weightError && <p className="mt-2 text-xs font-semibold text-rose-500">O peso líquido não pode ser maior que o bruto.</p>}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Dimensões da embalagem</h3>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Largura (cm)">
            <NumInput value={p.width_cm} step="0.01" onChange={(v) => onChange({ width_cm: v })} />
          </Field>
          <Field label="Altura (cm)">
            <NumInput value={p.height_cm} step="0.01" onChange={(v) => onChange({ height_cm: v })} />
          </Field>
          <Field label="Profundidade (cm)">
            <NumInput value={p.depth_cm} step="0.01" onChange={(v) => onChange({ depth_cm: v })} />
          </Field>
        </div>
        {volume != null && (
          <p className="mt-2 text-xs text-slate-500">
            Volume: <strong>{volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} cm³</strong>
          </p>
        )}
      </div>
    </div>
  );
}
