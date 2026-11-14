import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTryOnStore } from '../hooks/useTryOnStore';
import {
  DEFAULT_APPEARANCE,
  DEFAULT_BUTTON_TEXT,
  getAppearance,
  saveAppearance,
  type TryOnAppearance,
} from '../services/appearance';

const ICONS = [
  { v: '', l: 'Nenhum' },
  { v: '👕', l: '👕' },
  { v: '✨', l: '✨' },
  { v: '📷', l: '📷' },
  { v: '🪞', l: '🪞' },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Range({ label, value, min, max, onChange, unit = 'px' }: {
  label: string; value: number; min: number; max: number; unit?: string; onChange: (n: number) => void;
}) {
  return (
    <Field label={`${label}: ${value}${unit}`}>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </Field>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-200" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-24 rounded border border-slate-200 px-2 py-1 text-xs" />
      </div>
    </Field>
  );
}

export default function AparenciaTab() {
  const store = useTryOnStore() as any;
  const storeId: string | undefined = store?.storeId ?? store?.store?.id ?? store?.id;

  const [text, setText] = useState(DEFAULT_BUTTON_TEXT);
  const [a, setA] = useState<TryOnAppearance>(DEFAULT_APPEARANCE);
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [hover, setHover] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    setLoading(true);
    getAppearance(storeId)
      .then((r) => {
        if (!alive) return;
        setText(r.buttonText);
        setA(r.appearance);
        setSaved(JSON.stringify({ t: r.buttonText, a: r.appearance }));
      })
      .catch((e) => alive && setMsg({ ok: false, text: e?.message || 'Erro ao carregar' }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [storeId]);

  const set = <K extends keyof TryOnAppearance>(k: K, v: TryOnAppearance[K]) => setA((p) => ({ ...p, [k]: v }));
  const dirty = useMemo(() => JSON.stringify({ t: text, a }) !== saved, [text, a, saved]);

  const btnStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: a.align === 'left' ? 'flex-start' : a.align === 'right' ? 'flex-end' : 'center',
    gap: 8,
    padding: '0 16px',
    width: `${a.width}%`,
    height: a.height,
    background: hover ? a.hoverBg : a.bg,
    color: hover ? a.hoverColor : a.color,
    border: `${a.borderWidth}px solid ${a.borderColor}`,
    borderRadius: a.radius,
    fontSize: a.fontSize,
    fontWeight: a.fontWeight,
    margin: `${a.marginTop}px 0 ${a.marginBottom}px`,
    cursor: 'pointer',
    transition: 'all .15s',
    boxSizing: 'border-box',
  };

  async function onSave() {
    if (!storeId) return;
    setSaving(true);
    setMsg(null);
    try {
      await saveAppearance(storeId, text, a);
      setSaved(JSON.stringify({ t: text, a }));
      setMsg({ ok: true, text: 'Aparência salva.' });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  }

  if (!storeId) return <div className="text-sm text-slate-500">Selecione uma loja.</div>;
  if (loading) return <div className="text-sm text-slate-500">Carregando...</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <Field label="Texto do botão">
          <input value={text} maxLength={40} onChange={(e) => setText(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" />
        </Field>

        <Field label="Ícone">
          <div className="flex flex-wrap gap-2">
            {ICONS.map((i) => (
              <button key={i.l} type="button" onClick={() => set('icon', i.v)}
                className={`rounded border px-3 py-1 text-sm ${a.icon === i.v ? 'border-[#0094eb] bg-sky-50' : 'border-slate-200'}`}>
                {i.l}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Color label="Fundo" value={a.bg} onChange={(v) => set('bg', v)} />
          <Color label="Texto" value={a.color} onChange={(v) => set('color', v)} />
          <Color label="Fundo (hover)" value={a.hoverBg} onChange={(v) => set('hoverBg', v)} />
          <Color label="Texto (hover)" value={a.hoverColor} onChange={(v) => set('hoverColor', v)} />
          <Color label="Cor da borda" value={a.borderColor} onChange={(v) => set('borderColor', v)} />
        </div>

        <Range label="Espessura da borda" value={a.borderWidth} min={0} max={8} onChange={(n) => set('borderWidth', n)} />
        <Range label="Arredondamento" value={a.radius} min={0} max={40} onChange={(n) => set('radius', n)} />
        <Range label="Altura" value={a.height} min={30} max={90} onChange={(n) => set('height', n)} />
        <Range label="Largura" value={a.width} min={30} max={100} unit="%" onChange={(n) => set('width', n)} />
        <Range label="Tamanho da fonte" value={a.fontSize} min={10} max={32} onChange={(n) => set('fontSize', n)} />
        <Range label="Margem superior" value={a.marginTop} min={0} max={60} onChange={(n) => set('marginTop', n)} />
        <Range label="Margem inferior" value={a.marginBottom} min={0} max={60} onChange={(n) => set('marginBottom', n)} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso da fonte">
            <select value={a.fontWeight} onChange={(e) => set('fontWeight', Number(e.target.value))} className="w-full rounded border border-slate-200 px-2 py-2 text-sm">
              <option value={400}>Normal</option>
              <option value={500}>Médio</option>
              <option value={600}>Semibold</option>
              <option value={700}>Negrito</option>
            </select>
          </Field>
          <Field label="Alinhamento">
            <select value={a.align} onChange={(e) => set('align', e.target.value as TryOnAppearance['align'])} className="w-full rounded border border-slate-200 px-2 py-2 text-sm">
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button type="button" onClick={onSave} disabled={!dirty || saving}
            className="rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => { setA(DEFAULT_APPEARANCE); setText(DEFAULT_BUTTON_TEXT); }}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">
            Restaurar padrão
          </button>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Preview ao vivo</span>
          <div className="flex gap-1">
            {[false, true].map((m) => (
              <button key={String(m)} type="button" onClick={() => setMobile(m)}
                className={`rounded px-3 py-1 text-xs ${mobile === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                {m ? 'Celular' : 'Desktop'}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto rounded-lg bg-white p-4 shadow-sm" style={{ maxWidth: mobile ? 340 : 560 }}>
          <div className="aspect-[4/3] w-full rounded-md bg-slate-200" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">Produto de exemplo</h3>
          <p className="text-sm text-slate-500">R$ 199,90</p>
          <button type="button" style={btnStyle} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {a.icon && <span>{a.icon}</span>}
            <span>{text || DEFAULT_BUTTON_TEXT}</span>
          </button>
          <div className="h-10 rounded-md bg-slate-100" />
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">Passe o mouse no botão para ver o hover.</p>
      </div>
    </div>
  );
}