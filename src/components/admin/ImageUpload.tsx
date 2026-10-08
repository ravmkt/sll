import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const IMG_SPEC = {
  banner: { w: 1200, h: 150, label: 'Banner' },
  popup: { w: 900, h: 600, label: 'Popup' },
} as const;

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

function readSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida.')); };
    img.src = url;
  });
}

export default function ImageUpload({ kind, value, onChange }: { kind: 'banner' | 'popup'; value: string; onChange: (url: string) => void }) {
  const spec = IMG_SPEC[kind];
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    const ext = TYPES[file.type];
    if (!ext) { setErr('Use PNG, JPG ou WebP.'); return; }
    if (file.size > MAX_BYTES) { setErr('A imagem passa de 2 MB.'); return; }
    setBusy(true);
    try {
      const { w, h } = await readSize(file);
      const ratio = w / h;
      const want = spec.w / spec.h;
      if (Math.abs(ratio - want) / want > 0.05) throw new Error('Proporção errada (' + w + '×' + h + '). Use ' + spec.w + '×' + spec.h + ' px.');
      if (w < spec.w * 0.5) throw new Error('Imagem pequena (' + w + ' px de largura). Use ' + spec.w + '×' + spec.h + ' px.');
      const path = kind + '/' + crypto.randomUUID() + '.' + ext;
      const { error } = await supabase.storage.from('marketing').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
      if (error) throw new Error(error.message);
      onChange(supabase.storage.from('marketing').getPublicUrl(path).data.publicUrl);
    } catch (e: any) {
      setErr(e?.message || 'Erro ao enviar a imagem.');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="md:col-span-2">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
        Imagem do {spec.label.toLowerCase()} — {spec.w} × {spec.h} px (PNG, JPG ou WebP, até 2 MB)
      </label>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="space-y-2">
          <img src={value} alt="" className="w-full rounded-lg border border-slate-700 object-cover" style={{ aspectRatio: spec.w + ' / ' + spec.h, maxWidth: kind === 'popup' ? 360 : '100%' }} />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50">
              {busy ? 'Enviando...' : 'Trocar imagem'}
            </button>
            <button type="button" onClick={() => onChange('')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:bg-slate-800">
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => ref.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-950 px-3 text-sm text-slate-300 hover:border-amber-500 disabled:opacity-50"
          style={{ aspectRatio: spec.w + ' / ' + spec.h, maxHeight: 160 }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {busy ? 'Enviando...' : 'Escolher imagem'}
        </button>
      )}
      {err && <p className="mt-1 text-xs text-rose-400">{err}</p>}
    </div>
  );
}