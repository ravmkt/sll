import { useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Monitor, Pencil, Ruler, Save, Smartphone, X } from 'lucide-react';
import RulerPreview from './RulerPreview';
import RulerCardsStyleFields from './RulerCardsStyleFields';
import type { RulerAppearance, RulerContent, RulerStyleConfig } from '../../types/widgets';
import type { StyleInput } from '../../services/widgetsService';

type Device = 'mobile' | 'desktop';
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0094EB]';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Num({ label, value, onChange, min = 0, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <Field label={label}>
      <input type="number" min={min} max={max} value={value} className={inputCls}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)} />
    </Field>
  );
}
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      </div>
    </Field>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-[#0094EB]" />
      {label}
    </label>
  );
}
function Align({ label, value, onChange }: { label: string; value: string; onChange: (v: 'left' | 'center' | 'right') => void }) {
  return (
    <Field label={label}>
      <select value={value} className={inputCls} onChange={(e) => onChange(e.target.value as 'left' | 'center' | 'right')}>
        <option value="left">Esquerda</option>
        <option value="center">Centro</option>
        <option value="right">Direita</option>
      </select>
    </Field>
  );
}
function Section({ n, title, open, onToggle, children }: { n: number; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className={`rounded-xl border bg-white shadow-sm ${open ? 'border-slate-800' : 'border-slate-200'}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <span className="text-sm font-bold text-slate-900">{n}. {title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>
      {open && <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-4">{children}</div>}
    </div>
  );
}

export interface EditorInitial {
  id?: string | null;
  name: string;
  primary_color: string;
  config: RulerStyleConfig;
  is_default: boolean;
}

interface Props {
  initial: EditorInitial;
  content: RulerContent;
  onClose: () => void;
  onSave: (s: StyleInput) => Promise<void>;
}

export default function RulerStyleEditorModal({ initial, content, onClose, onSave }: Props) {
  const [name, setName] = useState(initial.name);
  const [isDefault, setIsDefault] = useState(initial.is_default);
  const [cfg, setCfg] = useState<RulerStyleConfig>(initial.config);
  const [device, setDevice] = useState<Device>('mobile');
  const [open, setOpen] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const a = cfg[device];
  const set = <K extends keyof RulerAppearance>(k: K, v: RulerAppearance[K]) =>
    setCfg((p) => ({ ...p, [device]: { ...p[device], [k]: v } }));
  const toggle = (n: number) => setOpen((o) => (o === n ? 0 : n));
  const patch = (p: Partial<RulerAppearance>) => setCfg((prev) => ({ ...prev, [device]: { ...prev[device], ...p } }));

  async function save() {
    if (!name.trim()) { setErr('Informe um nome para o estilo.'); return; }
    setSaving(true); setErr('');
    try {
      await onSave({ id: initial.id ?? null, name: name.trim(), primary_color: cfg.desktop.accent_color, config: cfg, is_default: isDefault });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-5">
          <div className="flex items-start justify-between">
            <div className="flex w-[320px] items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
              <Pencil className="h-4 w-4 text-slate-400" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do estilo"
                className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none" />
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-6 w-6" /></button>
          </div>
          <div className="mt-4 flex gap-2 pb-4">
            <span className="inline-flex items-center gap-2 rounded-lg bg-[#0094EB] px-4 py-2 text-sm font-bold text-white">
              <Ruler className="h-4 w-4" /> Régua
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 border-t border-slate-200">
          <div className="w-[430px] shrink-0 space-y-3 overflow-y-auto p-6">
            <h3 className="text-lg font-extrabold text-slate-900">Configurações Da Régua</h3>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-sm font-bold text-slate-800">Dispositivo</span>
              <div className="flex items-center gap-2">
                {device === 'desktop' && (
                  <button type="button" onClick={() => setCfg((p) => ({ ...p, desktop: { ...p.mobile } }))}
                    className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-600">
                    Sincronizar com Mobile
                  </button>
                )}
                <div className="flex rounded-lg border border-slate-200 p-0.5">
                  {(['mobile', 'desktop'] as Device[]).map((d) => (
                    <button key={d} type="button" onClick={() => setDevice(d)}
                      className={`rounded-md p-1.5 ${device === d ? 'bg-[#0094EB] text-white' : 'text-slate-500'}`}>
                      {d === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <RulerCardsStyleFields a={a} set={patch} />
        </div>
\n        <Section n={1} title="Dimensões & Margens" open={open === 1} onToggle={() => toggle(1)}>
              <Num label="Largura máx. (px, 0 = total)" value={a.max_width} onChange={(v) => set('max_width', v)} max={1600} />
              <Num label="Espaço interno vertical (px)" value={a.padding_y} onChange={(v) => set('padding_y', v)} />
              <Num label="Espaço interno horizontal (px)" value={a.padding_x} onChange={(v) => set('padding_x', v)} />
              <Num label="Margem superior (px)" value={a.margin_top} onChange={(v) => set('margin_top', v)} />
              <Num label="Margem inferior (px)" value={a.margin_bottom} onChange={(v) => set('margin_bottom', v)} />
            </Section>

            <Section n={2} title="Bordas" open={open === 2} onToggle={() => toggle(2)}>
              <Color label="Cor da Borda" value={a.border_color} onChange={(v) => set('border_color', v)} />
              <Num label="Largura Borda (px)" value={a.border_width} onChange={(v) => set('border_width', v)} max={10} />
              <Num label="Raio da Borda (px)" value={a.border_radius} onChange={(v) => set('border_radius', v)} max={100} />
            </Section>

            <Section n={3} title="Cores" open={open === 3} onToggle={() => toggle(3)}>
              <Color label="Fundo" value={a.bg_color} onChange={(v) => set('bg_color', v)} />
              <Color label="Cor de destaque" value={a.accent_color} onChange={(v) => set('accent_color', v)} />
              <Color label="Título" value={a.title_color} onChange={(v) => set('title_color', v)} />
              <Color label="Texto das faixas" value={a.text_color} onChange={(v) => set('text_color', v)} />
              <Color label="Trilho da régua" value={a.track_color} onChange={(v) => set('track_color', v)} />
              <Color label="Rodapé" value={a.footer_color} onChange={(v) => set('footer_color', v)} />
            </Section>

            <Section n={4} title="Textos" open={open === 4} onToggle={() => toggle(4)}>
              <Num label="Tamanho do título (px)" value={a.title_size} onChange={(v) => set('title_size', v || 14)} min={8} max={48} />
              <Align label="Alinhar título" value={a.title_align} onChange={(v) => set('title_align', v)} />
              <Num label="Tamanho das faixas (px)" value={a.text_size} onChange={(v) => set('text_size', v || 12)} min={8} max={32} />
              <Num label="Tamanho do rodapé (px)" value={a.footer_size} onChange={(v) => set('footer_size', v || 11)} min={8} max={32} />
              <Align label="Alinhar rodapé" value={a.footer_align} onChange={(v) => set('footer_align', v)} />
              <Check label="Título em negrito" checked={a.title_bold} onChange={(v) => set('title_bold', v)} />
            </Section>

            <Section n={5} title="Barra da Régua" open={open === 5} onToggle={() => toggle(5)}>
              <Num label="Espessura da barra (px)" value={a.bar_height} onChange={(v) => set('bar_height', v || 2)} min={2} max={30} />
              <Num label="Tamanho do marcador (px)" value={a.marker_size} onChange={(v) => set('marker_size', v || 8)} min={8} max={48} />
            </Section>

            <Section n={6} title="Elementos Visíveis" open={open === 6} onToggle={() => toggle(6)}>
              <Check label="Exibir título" checked={a.show_title} onChange={(v) => set('show_title', v)} />
              <Check label="Exibir marcadores" checked={a.show_markers} onChange={(v) => set('show_markers', v)} />
              <Check label="Exibir rodapé" checked={a.show_footer} onChange={(v) => set('show_footer', v)} />
            </Section>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-50 p-8">
            {device === 'mobile' ? (
              <div className="relative h-[560px] w-[290px] shrink-0 rounded-[42px] border-[8px] border-[#1e2140] bg-white shadow-xl">
                <div className="absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[#1e2140]" />
                <div className="h-full overflow-hidden rounded-[32px] px-1 pt-8">
                  <div className="mx-2 h-28 rounded-lg bg-slate-100" />
                  <RulerPreview a={a} content={content} />
                  <div className="mx-2 mt-3 h-3 w-2/3 rounded bg-slate-100" />
                  <div className="mx-2 mt-2 h-3 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[900px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex gap-1.5 bg-slate-100 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="p-6">
                  <div className="h-32 rounded-lg bg-slate-100" />
                  <RulerPreview a={a} content={content} />
                  <div className="mt-3 h-3 w-1/3 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {err ? <span className="font-semibold text-red-600">{err}</span> : (
              <span>Este painel é um <b>preview meramente visual</b>. O conteúdo da régua é editado na página <b>Régua</b>.</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-800">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#0094EB]" />
              Padrão da loja
            </label>
            <button type="button" onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
