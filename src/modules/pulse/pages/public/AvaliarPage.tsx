import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

type Item = { name: string; image: string | null; url: string | null };
type Info = {
  ok: boolean; error?: string; store_id?: string; customer?: string; items?: Item[]; allow_media?: boolean;
  store?: { name: string; logo: string | null; url: string | null };
};
type Media = { kind: 'image' | 'video'; url: string; poster_url?: string };

const SB_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error('rpc');
  return r.json() as Promise<T>;
}

function canvasBlob(c: HTMLCanvasElement, q: number): Promise<{ b: Blob; ext: 'webp' | 'jpg' }> {
  return new Promise((res, rej) => c.toBlob((b) => {
    if (b && b.type === 'image/webp') { res({ b, ext: 'webp' }); return; }
    c.toBlob((j) => (j ? res({ b: j, ext: 'jpg' }) : rej(new Error('Falha ao processar a imagem.'))), 'image/jpeg', q);
  }, 'image/webp', q));
}

async function imageBlob(f: File) {
  const bmp = await createImageBitmap(f).catch(() => { throw new Error('Imagem inválida ou não suportada.'); });
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return canvasBlob(c, 0.82);
}

function posterBlob(f: File) {
  return new Promise<{ b: Blob; ext: 'webp' | 'jpg' }>((resolve, reject) => {
    const url = URL.createObjectURL(f), v = document.createElement('video');
    const end = (fn: () => void) => { clearTimeout(t); URL.revokeObjectURL(url); fn(); };
    const t = window.setTimeout(() => end(() => reject(new Error('Não foi possível ler o vídeo.'))), 15000);
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
    v.onerror = () => end(() => reject(new Error('Vídeo inválido ou formato não suportado.')));
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      if (d > 30.5) { end(() => reject(new Error('O vídeo deve ter até 30 segundos.'))); return; }
      v.currentTime = Math.max(0.1, Math.min(0.5, d / 2));
    };
    v.onseeked = () => {
      const k = Math.min(1, 720 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((v.videoWidth || 1) * k)); c.height = Math.max(1, Math.round((v.videoHeight || 1) * k));
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
      canvasBlob(c, 0.8).then((r) => end(() => resolve(r)), (e) => end(() => reject(e)));
    };
  });
}

async function put(storeId: string, blob: Blob, type: string, ext: string): Promise<string> {
  const path = `submissions/${storeId}/${crypto.randomUUID()}.${ext}`;
  const r = await fetch(`${SB_URL}/storage/v1/object/reviews/${path}`, {
    method: 'POST', headers: { ...H, 'Content-Type': type, 'x-upsert': 'false' }, body: blob,
  });
  if (!r.ok) throw new Error('Falha ao enviar o arquivo. Tente novamente.');
  return `${SB_URL}/storage/v1/object/public/reviews/${path}`;
}

async function upload(storeId: string, f: File): Promise<Media> {
  if (f.type.startsWith('image/')) {
    const { b, ext } = await imageBlob(f);
    return { kind: 'image', url: await put(storeId, b, b.type, ext) };
  }
  const p = await posterBlob(f);
  const [url, poster] = await Promise.all([
    put(storeId, f, f.type, f.type === 'video/mp4' ? 'mp4' : 'webm'),
    put(storeId, p.b, p.b.type, p.ext),
  ]);
  return { kind: 'video', url, poster_url: poster };
}

const MSG: Record<string, string> = {
  not_found: 'Link de avaliação inválido.',
  reviewed: 'Você já avaliou esta compra. Obrigado!',
  closed: 'Este link de avaliação não está mais disponível.',
};

export default function AvaliarPage() {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<null | boolean>(null);

  useEffect(() => {
    rpc<Info>('review_request_get', { p_token: token }).then(setInfo).catch(() => setInfo({ ok: false, error: 'not_found' }));
  }, [token]);

  function addFiles(list: FileList | null) {
    setErr('');
    const next = [...files];
    for (const f of Array.from(list ?? [])) {
      const vid = f.type === 'video/mp4' || f.type === 'video/webm';
      if (next.length >= 3) { setErr('Máximo de 3 arquivos.'); break; }
      if (!f.type.startsWith('image/') && !vid) { setErr('Formato não suportado. Use imagem, mp4 ou webm.'); continue; }
      if (vid && f.size > 30 * 1048576) { setErr('O vídeo deve ter até 30 MB.'); continue; }
      if (vid && next.some((x) => x.type.startsWith('video/'))) { setErr('Envie apenas 1 vídeo.'); continue; }
      next.push(f);
    }
    setFiles(next);
  }

  async function send() {
    setErr('');
    if (!rating) { setErr('Escolha uma nota de 1 a 5 estrelas.'); return; }
    if (body.trim() && body.trim().length < 5) { setErr('Escreva pelo menos 5 caracteres ou deixe em branco.'); return; }
    try {
      const media: Media[] = [];
      for (let i = 0; i < files.length; i++) {
        setBusy(`Enviando arquivo ${i + 1}/${files.length}…`);
        media.push(await upload(info!.store_id!, files[i]));
      }
      setBusy('Enviando…');
      const res = await rpc<{ ok: boolean; error?: string; approved?: boolean }>('review_request_submit', {
        p_token: token, p_data: { via: 'invite', rating, title: title.trim(), body: body.trim(), media },
      });
      if (res.ok) { setDone(!!res.approved); return; }
      setBusy('');
      setErr(res.error === 'duplicate' ? 'Você já avaliou esta compra. Obrigado!' : 'Confira os campos e tente novamente.');
    } catch (e) {
      setBusy('');
      setErr(e instanceof Error && e.message !== 'rpc' ? e.message : 'Não foi possível enviar agora. Tente novamente.');
    }
  }

  const box = 'min-h-screen bg-slate-50 flex items-start justify-center p-4';
  if (!info) return <div className={box}><p className="mt-20 text-slate-500">Carregando…</p></div>;
  if (!info.ok) return <div className={box}><p className="mt-20 text-slate-700 text-center">{MSG[info.error ?? ''] ?? MSG.not_found}</p></div>;
  const st = info.store;
  const items = info.items ?? [];

  return (
    <div className={box}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-4">
        <div className="text-center mb-5">
          {st?.logo ? <img src={st.logo} alt={st.name} className="h-12 mx-auto mb-2 object-contain" />
            : <div className="font-bold text-lg text-slate-900">{st?.name}</div>}
        </div>
        {done !== null ? (
          <div className="text-center py-6">
            <div className="text-xl font-bold text-slate-900 mb-1">Obrigado pela sua avaliação!</div>
            <p className="text-slate-600">{done ? 'Ela já está publicada.' : 'Ela será publicada após a aprovação da loja.'}</p>
            {st?.url && /^https?:\/\//i.test(st.url) && (
              <a href={st.url} className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-[color:var(--sll-b-brand)] text-white font-bold">Voltar à loja</a>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-xl font-extrabold text-slate-900">
              {info.customer ? `Olá, ${info.customer}! ` : ''}Como foi sua compra?
            </h1>
            {items.length > 0 && (
              <div className="flex flex-wrap gap-3 my-4">
                {items.map((i, k) => {
                  const inner = (
                    <>
                      {i.image ? <img src={i.image} alt={i.name} className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                        : <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200" />}
                      <span className="block w-16 mt-1 text-[11px] leading-tight text-slate-600 line-clamp-2">{i.name}</span>
                    </>
                  );
                  return i.url ? <a key={k} href={i.url} target="_blank" rel="noopener noreferrer">{inner}</a> : <div key={k}>{inner}</div>;
                })}
              </div>
            )}
            <div className="mt-3 mb-1 text-sm font-semibold text-slate-800">Sua nota *</div>
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} estrelas`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}
                  className={`text-4xl leading-none ${n <= (hover || rating) ? 'text-amber-400' : 'text-slate-300'}`}>★</button>
              ))}
            </div>
            <label className="block mt-4 text-sm font-semibold text-slate-800">Título (opcional)
              <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-base font-normal outline-none focus:border-[color:var(--sll-b-brand)]" />
            </label>
            <label className="block mt-3 text-sm font-semibold text-slate-800">Sua avaliação (opcional)
              <textarea value={body} maxLength={2000} rows={4} onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-base font-normal outline-none focus:border-[color:var(--sll-b-brand)]" />
            </label>
            {info.allow_media && (
              <div className="mt-3">
                <div className="text-sm font-semibold text-slate-800 mb-1">Fotos ou vídeo (opcional)</div>
                <label className="block w-full text-center border border-dashed border-slate-300 rounded-lg py-2.5 text-[color:var(--sll-b-brand)] font-semibold cursor-pointer">
                  + Adicionar foto ou vídeo
                  <input type="file" className="hidden" multiple accept="image/*,video/mp4,video/webm"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, k) => (
                    <div key={k} className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                      {f.type.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" /> : <span>▶</span>}
                      <button type="button" aria-label="Remover" onClick={() => setFiles(files.filter((_, j) => j !== k))}
                        className="absolute top-0 right-0 w-5 h-5 bg-black/65 text-white text-sm leading-none">×</button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Até 3 arquivos. Vídeo: 1, de até 30 s e 30 MB.</p>
              </div>
            )}
            {err && <p role="alert" className="text-sm text-red-700 mt-3">{err}</p>}
            <button type="button" disabled={!!busy} onClick={send}
              className="mt-4 w-full py-3 rounded-lg bg-[color:var(--sll-b-brand)] text-white font-bold disabled:opacity-60">
              {busy || 'Enviar avaliação'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}