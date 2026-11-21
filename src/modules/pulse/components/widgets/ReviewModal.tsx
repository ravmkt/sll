import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Play, Star, X } from 'lucide-react';
import { reviewsService } from '../../services/reviewsService';
import type { Review, ReviewInput, ReviewMedia, ReviewSource, ReviewStatus } from '../../types/reviews';
import type { WidgetsCtx } from '../../types/widgets';

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[color:var(--sll-b-brand)]';
const lbl = 'mb-1 block text-[10px] font-bold uppercase text-slate-400';

interface Props { ctx: WidgetsCtx; initial: Review | null; onClose: () => void; onSaved: () => void; }

export default function ReviewModal({ ctx, initial, onClose, onSaved }: Props) {
  const svc = useMemo(() => reviewsService(ctx.supabase), [ctx.supabase]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<ReviewInput>(() => ({
    id: initial?.id ?? null, source: initial?.source ?? 'manual', product_ref: initial?.product_ref ?? '',
    product_name: initial?.product_name ?? '', author_name: initial?.author_name ?? '', rating: initial?.rating ?? 5,
    title: initial?.title ?? '', body: initial?.body ?? '', review_date: initial?.review_date ?? new Date().toISOString(),
    verified: initial?.verified ?? false, status: initial?.status ?? 'approved', media: initial?.media ?? [],
  }));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof ReviewInput>(k: K, v: ReviewInput[K]) => setF((p) => ({ ...p, [k]: v }));

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError(''); setUploading(true);
    const added: ReviewMedia[] = [];
    try {
      for (const file of Array.from(files)) {
        if (f.media.length + added.length >= 10) { setError('Máximo de 10 arquivos por avaliação.'); break; }
        added.push(await svc.uploadMedia(ctx.storeId, file));
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro no upload.'); }
    if (added.length) setF((p) => ({ ...p, media: [...p.media, ...added] }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function save() {
    if (!f.author_name.trim()) { setError('Informe o nome do cliente.'); return; }
    setBusy(true); setError('');
    try { await svc.save(ctx.storeId, f); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar.'); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">{initial ? 'Editar avaliação' : 'Nova avaliação'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className={lbl}>Nome do cliente</span>
            <input className={inp} value={f.author_name} onChange={(e) => set('author_name', e.target.value)} /></label>
          <label><span className={lbl}>Data</span>
            <input type="date" className={inp} value={f.review_date.slice(0, 10)}
              onChange={(e) => { if (e.target.value) set('review_date', new Date(e.target.value + 'T12:00:00').toISOString()); }} /></label>
        </div>
        <div className="mt-3">
          <span className={lbl}>Nota</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => set('rating', n)} aria-label={`${n} estrelas`}>
                <Star className={`h-7 w-7 ${n <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
        </div>
        <label className="mt-3 block"><span className={lbl}>Título (opcional)</span>
          <input className={inp} value={f.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label className="mt-3 block"><span className={lbl}>Comentário (opcional)</span>
          <textarea rows={4} className={inp} value={f.body} onChange={(e) => set('body', e.target.value)} /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label><span className={lbl}>Produto (slug da URL; use * para várias cores)</span>
            <input className={inp + ' font-mono'} value={f.product_ref} placeholder="scrub-feminino-confort*"
              onChange={(e) => set('product_ref', e.target.value)} /></label>
          <label><span className={lbl}>Nome do produto</span>
            <input className={inp} value={f.product_name} onChange={(e) => set('product_name', e.target.value)} /></label>
          <label><span className={lbl}>Origem</span>
            <select className={inp} value={f.source} onChange={(e) => set('source', e.target.value as ReviewSource)}>
              <option value="manual">Manual</option><option value="store">Coletada na loja</option><option value="google">Google</option>
            </select></label>
          <label><span className={lbl}>Status</span>
            <select className={inp} value={f.status} onChange={(e) => set('status', e.target.value as ReviewStatus)}>
              <option value="approved">Aprovada</option><option value="pending">Pendente</option><option value="rejected">Rejeitada</option>
            </select></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={f.verified} onChange={(e) => set('verified', e.target.checked)} /> Compra verificada
        </label>

        <div className="mt-4">
          <span className={lbl}>Fotos e vídeos (fotos viram WebP · vídeo até 30 s e 50 MB)</span>
          <div className="flex flex-wrap gap-2">
            {f.media.map((m, i) => (
              <div key={m.url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img src={m.kind === 'video' ? (m.poster_url ?? '') : m.url} alt="" className="h-full w-full object-cover" />
                {m.kind === 'video' && <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white"><Play className="h-5 w-5" /></span>}
                <button type="button" title="Remover" onClick={() => set('media', f.media.filter((_, k) => k !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-[color:var(--sll-b-brand)] hover:text-[color:var(--sll-b-brand)]">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            </button>
            <input ref={fileRef} type="file" multiple hidden accept="image/*,video/mp4,video/webm" onChange={(e) => void onFiles(e.target.files)} />
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="button" disabled={busy || uploading} onClick={save}
            className="rounded-xl bg-[color:var(--sll-b-brand)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
