import { Field } from './Field';
import { INPUT, maskPhone, type StepProps } from './shared';

export function StepManager({ data, onChange }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="Nome do contato">
        <input value={data.manager_name} onChange={(e) => onChange({ manager_name: e.target.value })} className={INPUT} placeholder="Nome completo" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone de contato">
          <input inputMode="tel" value={data.manager_phone} onChange={(e) => onChange({ manager_phone: maskPhone(e.target.value) })} className={INPUT} placeholder="(41) 99999-9999" />
        </Field>
        <Field label="E-mail de contato">
          <input type="email" inputMode="email" value={data.manager_email} onChange={(e) => onChange({ manager_email: e.target.value })} className={INPUT} placeholder="voce@email.com" />
        </Field>
      </div>
      <p className="text-[11px] text-slate-400">Os dados de faturamento você informa depois, quando for contratar um plano.</p>
    </div>
  );
}