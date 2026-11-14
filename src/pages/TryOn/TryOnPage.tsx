import { useMemo, useRef, useState } from 'react';

type Step = 'form' | 'loading' | 'done' | 'error';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const ERRORS: Record<string, string> = {
  tryon_disabled: 'O provador virtual está indisponível nesta loja no momento.',
  no_subscription: 'O provador virtual está indisponível nesta loja no momento.',
  subscription_inactive: 'O provador virtual está indisponível nesta loja no momento.',
  trial_expired: 'O provador virtual está indisponível nesta loja no momento.',
  monthly_limit_reached: 'O provador atingiu o limite de usos deste mês. Tente novamente mais tarde.',
  visitor_limit_reached: 'Você atingiu o limite de provas deste mês.',
  rate_limited: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
  invalid_photo: 'Não foi possível usar essa foto. Envie um JPG, PNG ou WebP nítido.',
  invalid_garment: 'Não foi possível carregar a imagem do produto.',
  consent_required: 'É preciso aceitar o uso da foto para continuar.',
  generation_failed: 'Não conseguimos gerar a imagem agora. Tente novamente em instantes.',
};

function getSession(): string {
  const key = 'sll_tryon_session';
  const fresh = () => crypto.randomUUID().replace(/-/g, '');
  try {
    let v = localStorage.getItem(key);
    if (!v) {
      v = fresh();
      localStorage.setItem(key, v);
    }
    return v;
  } catch {
    return fresh();
  }
}

async function toResizedDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  let out = canvas.toDataURL('image/jpeg', 0.9);
  if (out.length > 7_000_000) out = canvas.toDataURL('image/jpeg', 0.75);
  return out;
}

export default function TryOnPage() {
  const q = useMemo(() => new URLSearchParams(window.location.search), []);
  const storeId = q.get('store_id') || '';
  const productImage = q.get('product_image') || '';
  const productName = q.get('product_name') || 'Produto';

  const [step, setStep] = useState<Step>('form');
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<string>('');
  const [resultUrl, setResultUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const missing = !storeId || !productImage;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setPhoto(await toResizedDataUrl(f));
      setError('');
    } catch {
      setPhoto('');
      setError(ERRORS.invalid_photo);
    }
  }

  async function generate() {
    setStep('loading');
    setError('');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 70000);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tryon-generate`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          store_id: storeId,
          session_id: getSession(),
          consent: true,
          consent_version: 'v1',
          person_image: photo,
          garment_image_url: productImage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setError(ERRORS[data?.error] || ERRORS.generation_failed);
        setStep('error');
        return;
      }
      setResultUrl(data.url);
      setStep('done');
    } catch {
      setError(ERRORS.generation_failed);
      setStep('error');
    } finally {
      clearTimeout(timer);
    }
  }

  function reset() {
    setStep('form');
    setPhoto('');
    setResultUrl('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h1 className="text-xl font-bold text-gray-900">Provador Virtual</h1>
        <p className="text-sm text-gray-500 mb-4">{productName}</p>

        {missing && (
          <p className="text-sm text-red-600">Link inválido. Volte à loja e clique novamente no botão do provador.</p>
        )}

        {!missing && (step === 'form' || step === 'error') && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <img src={productImage} alt={productName} className="w-24 h-24 object-cover rounded-lg border" />
              <p className="text-sm text-gray-600">
                Envie uma foto sua, de corpo inteiro ou da parte de cima, com boa iluminação e de frente.
              </p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFile}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-4 file:py-2 file:text-white"
            />

            {photo && <img src={photo} alt="Sua foto" className="max-h-72 mx-auto rounded-lg border" />}

            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>
                Autorizo o uso da minha foto apenas para gerar esta imagem de prova virtual. A foto é guardada por tempo
                limitado e depois apagada automaticamente.
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={!photo || !consent}
              onClick={generate}
              className="w-full h-12 bg-black text-white font-bold rounded-md disabled:opacity-40"
            >
              Experimentar
            </button>
          </div>
        )}

        {!missing && step === 'loading' && (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Gerando sua imagem... isso leva até 30 segundos.</p>
          </div>
        )}

        {!missing && step === 'done' && (
          <div className="space-y-4">
            <img src={resultUrl} alt="Resultado" className="w-full rounded-lg border" />
            <div className="flex gap-2">
              <a
                href={resultUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-11 grid place-items-center bg-black text-white font-semibold rounded-md"
              >
                Abrir imagem
              </a>
              <button type="button" onClick={reset} className="flex-1 h-11 border rounded-md font-semibold">
                Usar outra foto
              </button>
            </div>
            <button type="button" onClick={() => window.close()} className="w-full text-sm text-gray-500 underline">
              Voltar à loja
            </button>
          </div>
        )}
      </div>
    </div>
  );
}