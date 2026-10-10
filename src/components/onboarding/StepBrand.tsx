import { useRef, useState } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { HEX, INPUT, LABEL, type Brand, type StepProps } from './shared';

export function StepBrand({ data, storeId, onChange }: StepProps) {
  const b = data.brand;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tag, setTag] = useState('');
  const setBrand = (patch: Partial<Brand>) => onChange({ brand: { ...b, ...patch } });
  const setSocial = (k: keyof Brand['social_links'], v: string) => setBrand({ social_links: { ...b.social_links, [k]: v } });

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
  const addTag = () => {
    const t = tag.trim().slice(0, 40);
    if (t && b.benefits.length < 8 && !b.benefits.some((x) => x.toLowerCase() === t.toLowerCase())) setBrand({ benefits: [...b.benefits, t] });
    setTag('');
  };

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div><span className={LABEL}>Instagram</span><input value={b.social_links.instagram} onChange={(e) => setSocial('instagram', e.target.value)} className={INPUT} placeholder="@sualoja" /></div>
        <div><span className={LABEL}>TikTok</span><input value={b.social_links.tiktok} onChange={(e) => setSocial('tiktok', e.target.value)} className={INPUT} placeholder="@sualoja" /></div>
        <div><span className={LABEL}>WhatsApp</span><input inputMode="tel" value={b.social_links.whatsapp} onChange={(e) => setSocial('whatsapp', e.target.value.replace(/[^\d+]/g, ''))} className={INPUT} placeholder="5541999999999" /></div>
      </div>

      <div>
        <span className={LABEL}>Benefícios da loja</span>
        <div className="mb-2 flex flex-wrap gap-2">
          {b.benefits.map((x) => (
            <span key={x} className="inline-flex items-center gap-1.5 rounded-full bg-[#0094eb]/10 px-3 py-1 text-xs font-semibold text-[#0094eb]">
              {x}
              <button type="button" aria-label={`Remover ${x}`} className="cursor-pointer" onClick={() => setBrand({ benefits: b.benefits.filter((y) => y !== x) })}><X size={12} /></button>
            </span>
          ))}
        </div>
        {b.benefits.length < 8 && (
          <div className="flex gap-2">
            <input value={tag} onChange={(e) => setTag(e.target.value)} className={INPUT} placeholder="Ex.: Entrega expressa"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
            <button type="button" onClick={addTag} className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"><Plus size={14} /> Adicionar</button>
          </div>
        )}
      </div>
    </div>
  );
}