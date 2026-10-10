import { INPUT, LABEL, NICHES, maskPhone, type StepProps } from './shared';

export function StepStoreData({ data, onChange }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className={LABEL} htmlFor="ob-url">URL da loja virtual</label>
        <input id="ob-url" inputMode="url" value={data.store_url} onChange={(e) => onChange({ store_url: e.target.value })}
          className={INPUT} placeholder="www.sualoja.com.br" />
      </div>
      <div>
        <label className={LABEL} htmlFor="ob-niche">Nicho principal</label>
        <select id="ob-niche" value={data.store_niche} onChange={(e) => onChange({ store_niche: e.target.value })} className={INPUT}>
          <option value="">Selecione...</option>
          {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL} htmlFor="ob-wa">WhatsApp do gestor</label>
        <input id="ob-wa" inputMode="tel" value={maskPhone(data.manager_whatsapp)}
          onChange={(e) => onChange({ manager_whatsapp: maskPhone(e.target.value) })} className={INPUT} placeholder="(41) 99999-9999" />
      </div>
    </div>
  );
}