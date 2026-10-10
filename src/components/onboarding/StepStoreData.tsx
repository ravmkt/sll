import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InstagramConnectRow from '@/components/configuracoes/InstagramConnectRow';
import TikTokConnectRow from '@/components/configuracoes/TikTokConnectRow';
import { Field } from './Field';
import { HEX, INPUT, LABEL, NICHES, maskPhone, type Brand, type StepProps } from './shared';

export function StepStoreData({ data, storeId, onChange }: StepProps) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const b = data.brand;
  const setBrand = (patch: Partial<Brand>) => onChange({ brand: { ...b, ...patch } });

  const upload = async (file: File) => {
    setErr(null);
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) { setErr('Use PNG, JPG, WEBP ou SVG.'); return; }
    if (file.size > 2 * 1024 * 1024) { setErr('A logo deve ter até 2 MB.'); return; }
    setUploading(true);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${storeId}/brand/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('videos').upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (error) { setErr(error.message); return; }
    setBrand({ logo_url: supabase.storage.from('videos').getPublicUrl(path).data.publicUrl });
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
        <span className={LABEL}>Logo da loja</span>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
            {b.logo_url ? <img src={b.logo_url} alt="Logo da loja" className="h-full w-full object-contain" /> : <Upload className="h-5 w-5 text-slate-400" />}
          </div>
          <div>
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {uploading ? 'Enviando...' : b.logo_url ? 'Trocar logo' : 'Enviar logo'}
            </button>
            <p className="mt-1 text-[11px] text-slate-400">PNG, JPG, WEBP ou SVG, até 2 MB.</p>
            {err && <p className="mt-1 text-[11px] font-semibold text-rose-600">{err}</p>}
          </div>
          <input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(['primary_color', 'secondary_color'] as const).map((k) => (
          <div key={k}>
            <span className={LABEL}>{k === 'primary_color' ? 'Cor primária' : 'Cor secundária'}</span>
            <div className="flex items-center gap-2">
              <input type="color" aria-label={k} value={HEX.test(b[k]) ? b[k] : '#000000'} onChange={(e) => setBrand({ [k]: e.target.value })}
                className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
              <input value={b[k]} onChange={(e) => setBrand({ [k]: e.target.value })} className={INPUT} placeholder="#0094eb" />
            </div>
          </div>
        ))}
      </div>

      <div>
        <span className={LABEL}>Redes sociais (opcional)</span>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4">
          <InstagramConnectRow storeId={storeId} className="py-4" />
          <TikTokConnectRow storeId={storeId} className="py-4" />
        </div>
      </div>
    </div>
  );
}