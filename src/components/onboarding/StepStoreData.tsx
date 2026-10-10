import { useState } from 'react';
import { Music2 } from 'lucide-react';
import InstagramConnectRow from '@/components/configuracoes/InstagramConnectRow';
import { startTikTokConnect } from '@/services/socialIntegrationsService';
import { Field } from './Field';
import { INPUT, LABEL, NICHES, maskPhone, type StepProps } from './shared';

export function StepStoreData({ data, storeId, onChange }: StepProps) {
  const [tt, setTt] = useState<string | null>(null);
  const connectTikTok = async () => {
    setTt(null);
    try { await startTikTokConnect(storeId); }
    catch (e: any) { setTt(e?.message || 'Não foi possível iniciar a conexão com o TikTok.'); }
  };
  return (
    <div className="space-y-5">
      <Field label="URL da loja virtual">
        <input inputMode="url" value={data.store_url} onChange={(e) => onChange({ store_url: e.target.value })} className={INPUT} placeholder="www.sualoja.com.br" />
      </Field>
      <Field label="Nicho principal">
        <select value={data.store_niche} onChange={(e) => onChange({ store_niche: e.target.value })} className={INPUT}>
          <option value="">Selecione...</option>
          {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail da loja">
          <input type="email" inputMode="email" value={data.store_email} onChange={(e) => onChange({ store_email: e.target.value })} className={INPUT} placeholder="contato@sualoja.com.br" />
        </Field>
        <Field label="WhatsApp de atendimento">
          <input inputMode="tel" value={data.store_whatsapp} onChange={(e) => onChange({ store_whatsapp: maskPhone(e.target.value) })} className={INPUT} placeholder="(41) 99999-9999" />
        </Field>
      </div>

      <div>
        <span className={LABEL}>Redes sociais (opcional)</span>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <InstagramConnectRow storeId={storeId} />
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Music2 size={16} /> TikTok</div>
            <button type="button" onClick={connectTikTok} className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white">Conectar TikTok</button>
          </div>
          {tt && <p className="text-[11px] font-semibold text-rose-600">{tt}</p>}
          <p className="text-[11px] text-slate-400">O que você preencheu é salvo automaticamente antes de abrir a conexão.</p>
        </div>
      </div>
    </div>
  );
}