import { Field } from './Field';
import { INPUT, maskCep, maskDoc, maskPhone, type Billing, type StepProps } from './shared';

export function StepManager({ data, onChange }: StepProps) {
  const bl = data.billing;
  const setBilling = (patch: Partial<Billing>) => onChange({ billing: { ...bl, ...patch } });
  const setType = (t: 'pj' | 'pf') => setBilling({ person_type: t, document: maskDoc(bl.document, t) });
  const lookupCep = async () => {
    const z = bl.zip.replace(/\D/g, '');
    if (z.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${z}/json/`);
      const j = await r.json();
      if (!j.erro) setBilling({ street: j.logradouro || bl.street, district: j.bairro || bl.district, city: j.localidade || bl.city, state: j.uf || bl.state });
    } catch { /* preenchimento manual */ }
  };
  const tab = (t: 'pj' | 'pf') =>
    `flex-1 cursor-pointer rounded-xl border px-4 py-2.5 text-xs font-bold ${bl.person_type === t ? 'border-[#0094eb] bg-[#0094eb]/5 text-[#0094eb]' : 'border-slate-200 text-slate-600'}`;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-black text-slate-900">Dados do gestor</h2>
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
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black text-slate-900">Dados de faturamento</h2>
        <p className="text-xs text-slate-500">Usados para emitir a nota fiscal da sua assinatura.</p>
        <div className="flex gap-2">
          <button type="button" className={tab('pj')} onClick={() => setType('pj')}>Pessoa jurídica</button>
          <button type="button" className={tab('pf')} onClick={() => setType('pf')}>Pessoa física</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={bl.person_type === 'pj' ? 'Razão social' : 'Nome completo'}>
            <input value={bl.legal_name} onChange={(e) => setBilling({ legal_name: e.target.value })} className={INPUT} />
          </Field>
          <Field label={bl.person_type === 'pj' ? 'CNPJ' : 'CPF'}>
            <input inputMode="numeric" value={bl.document} onChange={(e) => setBilling({ document: maskDoc(e.target.value, bl.person_type) })} className={INPUT} placeholder={bl.person_type === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="CEP">
            <input inputMode="numeric" value={bl.zip} onChange={(e) => setBilling({ zip: maskCep(e.target.value) })} onBlur={lookupCep} className={INPUT} placeholder="00000-000" />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <input value={bl.street} onChange={(e) => setBilling({ street: e.target.value })} className={INPUT} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Número"><input value={bl.number} onChange={(e) => setBilling({ number: e.target.value })} className={INPUT} /></Field>
          <Field label="Complemento" className="sm:col-span-2"><input value={bl.complement} onChange={(e) => setBilling({ complement: e.target.value })} className={INPUT} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Bairro" className="sm:col-span-2"><input value={bl.district} onChange={(e) => setBilling({ district: e.target.value })} className={INPUT} /></Field>
          <Field label="Cidade"><input value={bl.city} onChange={(e) => setBilling({ city: e.target.value })} className={INPUT} /></Field>
          <Field label="UF"><input maxLength={2} value={bl.state} onChange={(e) => setBilling({ state: e.target.value.toUpperCase() })} className={INPUT} placeholder="PR" /></Field>
        </div>
      </section>
    </div>
  );
}