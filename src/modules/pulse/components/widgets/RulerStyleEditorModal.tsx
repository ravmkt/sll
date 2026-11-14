import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Layers, Monitor, Pencil, Plus, Ruler, Save, Smartphone, X } from 'lucide-react';
import RulerPreview from './RulerPreview';
import { ColorField, CheckField, Grid2, NumField, Section, SelectField, Sub, ToggleBtn } from './RulerConfigControls';
import { CARD_FONTS, PRESETS, type LineStyle, type RulerAppearance, type RulerContent, type RulerStyleConfig } from '../../types/widgets';
import type { StyleInput } from '../../services/widgetsService';

type Device = 'mobile' | 'desktop';
type Align = RulerAppearance['title_align'];

const ALIGN = [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']] as const;
const MODES = [['static', 'Estático'], ['auto', 'Automático'], ['manual', 'Manual (arrastar)'], ['stack', 'Empilhado']] as const;
const LAYOUTS = [['steps', 'Bolinhas com linha'], ['cards', 'Cards']] as const;

export interface EditorInitial {
  id?: string | null;
  name: string;
  template?: string;
  primary_color: string;
  config: RulerStyleConfig;
  is_default: boolean;
}

interface Props {
  initial: EditorInitial;
  content: RulerContent;
  existingNames?: string[];
  onClose: () => void;
  onSave: (s: StyleInput) => Promise<void>;
}

export default function RulerStyleEditorModal({ initial, content, existingNames = [], onClose, onSave }: Props) {
  const [name, setName] = useState(initial.name);
  const [isDefault, setIsDefault] = useState(initial.is_default);
  const [cfg, setCfg] = useState<RulerStyleConfig>(initial.config);
  const [device, setDevice] = useState<Device>('mobile');
  const [open, setOpen] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [naming, setNaming] = useState<{ asNew: boolean } | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [nameErr, setNameErr] = useState('');

  const baseJson = useMemo(() => JSON.stringify(initial.config), [initial]);
  const dirty = JSON.stringify(cfg) !== baseJson;
  const reserved = useMemo(() => PRESETS.map((p) => p.name.trim().toLowerCase()), []);

  const a = cfg[device];
  const cards = a.layout === 'cards';
  const set = <K extends keyof RulerAppearance>(k: K, v: RulerAppearance[K]) =>
    setCfg((p) => ({ ...p, [device]: { ...p[device], [k]: v } }));
  const patch = (p: Partial<RulerAppearance>) => setCfg((prev) => ({ ...prev, [device]: { ...prev[device], ...p } }));
  const setLine = (i: number, p: Partial<LineStyle>) => patch({ lines: a.lines.map((l, k) => (k === i ? { ...l, ...p } : l)) });
  const toggle = (id: string) => setOpen((o) => (o === id ? '' : id));

  const [demoHl, setDemoHl] = useState(false);
  const hasHl = content.tiers.some((t) => t.highlight);
  const previewContent = useMemo<RulerContent>(() => {
    if (!demoHl || hasHl) return content;
    const base = content.tiers.length
      ? content.tiers
      : [{ label: 'Leve 2', value: '5% OFF' }, { label: 'Leve 3', value: '10% OFF' }, { label: 'Leve 4', value: '15% OFF' }];
    const mid = Math.floor(base.length / 2);
    return { ...content, tiers: base.map((t, i) => (i === mid ? { ...t, highlight: true } : t)) } as RulerContent;
  }, [demoHl, hasHl, content]);
  function checkName(n: string, checkDup: boolean): string {
    if (!n) return 'Informe um nome para o estilo.';
    const low = n.toLowerCase();
    if (reserved.includes(low)) return 'Este nome pertence a um template padrão. Escolha outro nome.';
    if (checkDup && existingNames.some((x) => x.trim().toLowerCase() === low)) return 'Já existe um estilo com esse nome.';
    return '';
  }

  async function doSave(finalName: string, asNew: boolean) {
    setSaving(true); setErr('');
    try {
      await onSave({
        id: asNew ? null : initial.id ?? null,
        name: finalName,
        primary_color: cfg.desktop.accent_color,
        config: cfg,
        is_default: isDefault,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar.');
      setSaving(false);
      setNaming(null);
    }
  }

  function openNaming(asNew: boolean) {
    setNameErr('');
    setNameDraft(asNew && initial.id ? `${name.trim()} (cópia)` : '');
    setNaming({ asNew });
  }

  function onSaveClick() {
    if (!initial.id) { openNaming(false); return; }
    const m = checkName(name.trim(), false);
    if (m) { setErr(m); return; }
    void doSave(name.trim(), false);
  }

  function confirmName() {
    const n = nameDraft.trim();
    const m = checkName(n, true);
    if (m) { setNameErr(m); return; }
    void doSave(n, true);
  }

  const sections: { id: string; title: string; show: boolean; body: ReactNode }[] = [
    {
      id: 'layout', title: cards ? 'Layout & Carrossel' : 'Layout', show: true,
      body: (
        <>
          <SelectField label="Tipo de layout" value={a.layout} options={LAYOUTS}
            onChange={(v) => set('layout', v as RulerAppearance['layout'])} />
          {cards && (
            <>
              <Sub>Carrossel</Sub>
              <SelectField label="Modo" value={a.carousel_mode} options={MODES}
                onChange={(v) => set('carousel_mode', v as RulerAppearance['carousel_mode'])} />
              <NumField label="Cards visíveis" value={a.cards_visible} min={1} max={6} onChange={(v) => set('cards_visible', v)} />
              <NumField label="Espaçamento (px)" value={a.cards_gap} max={60} onChange={(v) => set('cards_gap', v)} />
              {a.carousel_mode === 'auto' && (
                <NumField label="Intervalo (ms)" value={a.autoplay_ms} min={1000} max={20000} step={100} onChange={(v) => set('autoplay_ms', v)} />
              )}
              {a.carousel_mode !== 'static' && (
                <NumField label="Velocidade da animação (ms)" value={a.anim_ms} min={100} max={3000} step={50} onChange={(v) => set('anim_ms', v)} />
              )}
              <CheckField label="Loop infinito" checked={a.infinite} onChange={(v) => set('infinite', v)} />
              <CheckField label="Pausar ao passar o mouse" checked={a.pause_hover} onChange={(v) => set('pause_hover', v)} />
            </>
          )}
        </>
      ),
    },
    {
      id: 'dim', title: 'Dimensões & Margens', show: true,
      body: (
        <>
          <NumField label="Largura máxima (0 = total)" value={a.max_width} max={1600} step={10} onChange={(v) => set('max_width', v)} />
          <NumField label="Espaço interno vertical (px)" value={a.padding_y} max={80} onChange={(v) => set('padding_y', v)} />
          <NumField label="Espaço interno horizontal (px)" value={a.padding_x} max={80} onChange={(v) => set('padding_x', v)} />
          <NumField label="Margem superior (px)" value={a.margin_top} max={120} onChange={(v) => set('margin_top', v)} />
          <NumField label="Margem inferior (px)" value={a.margin_bottom} max={120} onChange={(v) => set('margin_bottom', v)} />
          {cards && (
            <>
              <Sub>Card</Sub>
              <NumField label="Espaço interno do card (px)" value={a.card_padding} max={60} onChange={(v) => set('card_padding', v)} />
            </>
          )}
        </>
      ),
    },
    {
      id: 'bordas', title: 'Bordas', show: true,
      body: (
        <>
          <Sub>Régua</Sub>
          <ColorField label="Cor da borda" value={a.border_color} onChange={(v) => set('border_color', v)} />
          <NumField label="Espessura (px)" value={a.border_width} max={10} onChange={(v) => set('border_width', v)} />
          <NumField label="Arredondamento (px)" value={a.border_radius} max={100} onChange={(v) => set('border_radius', v)} />
          {cards && (
            <>
              <Sub>Card</Sub>
              <ColorField label="Cor da borda" value={a.card_border_color} onChange={(v) => set('card_border_color', v)} />
              <NumField label="Espessura (px)" value={a.card_border_width} max={12} onChange={(v) => set('card_border_width', v)} />
              <NumField label="Arredondamento (px)" value={a.card_radius} max={60} onChange={(v) => set('card_radius', v)} />
            </>
          )}
        </>
      ),
    },
    {
      id: 'cores', title: 'Cores', show: true,
      body: (
        <Grid2>
          <ColorField label="Fundo da régua" value={a.bg_color} onChange={(v) => set('bg_color', v)} />
          <ColorField label="Cor de destaque" value={a.accent_color} onChange={(v) => set('accent_color', v)} />
          {!cards && <ColorField label="Trilho da régua" value={a.track_color} onChange={(v) => set('track_color', v)} />}
          {cards && <ColorField label="Fundo do card" value={a.card_bg_color} onChange={(v) => set('card_bg_color', v)} />}
        </Grid2>
      ),
    },
    {
      id: 'textos', title: 'Textos', show: true,
      body: (
        <>
          <Sub>Título</Sub>
          <NumField label="Tamanho (px)" value={a.title_size} min={8} max={48} onChange={(v) => set('title_size', v)} />
          <Grid2>
            <ColorField label="Cor" value={a.title_color} onChange={(v) => set('title_color', v)} />
            <SelectField label="Alinhamento" value={a.title_align} options={ALIGN} onChange={(v) => set('title_align', v as Align)} />
          </Grid2>
          <div className="flex gap-2">
            <ToggleBtn active={a.title_bold} onClick={() => set('title_bold', !a.title_bold)}>B Negrito</ToggleBtn>
          </div>

          {!cards && (
            <>
              <Sub>Faixas</Sub>
              <NumField label="Tamanho (px)" value={a.text_size} min={8} max={32} onChange={(v) => set('text_size', v)} />
              <ColorField label="Cor" value={a.text_color} onChange={(v) => set('text_color', v)} />
            </>
          )}

          <Sub>Rodapé</Sub>
          <NumField label="Tamanho (px)" value={a.footer_size} min={8} max={32} onChange={(v) => set('footer_size', v)} />
          <Grid2>
            <ColorField label="Cor" value={a.footer_color} onChange={(v) => set('footer_color', v)} />
            <SelectField label="Alinhamento" value={a.footer_align} options={ALIGN} onChange={(v) => set('footer_align', v as Align)} />
          </Grid2>

          {cards && a.lines.map((l, i) => (
            <div key={i} className="space-y-3">
              <Sub>Card · Linha {i + 1}</Sub>
              <NumField label="Tamanho (px)" value={l.size} min={8} max={80} onChange={(v) => setLine(i, { size: v })} />
              <NumField label="Espaçamento entre letras (px)" value={l.spacing} max={10} step={0.5} onChange={(v) => setLine(i, { spacing: v })} />
              <Grid2>
                <ColorField label="Cor" value={l.color} onChange={(v) => setLine(i, { color: v })} />
                <SelectField label="Fonte" value={l.font} options={CARD_FONTS} onChange={(v) => setLine(i, { font: v })} />
              </Grid2>
              <div className="flex gap-2">
                <ToggleBtn active={l.weight >= 700} onClick={() => setLine(i, { weight: l.weight >= 700 ? 400 : 700 })}>B Negrito</ToggleBtn>
                <ToggleBtn active={l.upper} onClick={() => setLine(i, { upper: !l.upper })}>AA Maiúsculas</ToggleBtn>
              </div>
            </div>
          ))}
        </>
      ),
    },
    {
          id: 'destaque', title: 'Card Destacado', show: cards,
          body: (
            <>
              {!hasHl && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
                  Nenhum card está marcado como destacado. Na página <b>Régua</b>, clique na estrela de um card para ver estas opções na loja.
                </div>
              )}
              {!hasHl && (
                <ToggleBtn active={demoHl} onClick={() => setDemoHl(!demoHl)}>Destacar card de exemplo no preview</ToggleBtn>
              )}
              <Sub>Borda e fundo</Sub>
              <Grid2>
                <ColorField label="Cor da borda" value={a.hl_border_color} onChange={(v) => set('hl_border_color', v)} />
                <ColorField label="Fundo" value={a.hl_bg_color} onChange={(v) => set('hl_bg_color', v)} />
              </Grid2>
              <Sub>Texto</Sub>
              <ColorField label="Cor da linha 2" value={a.hl_main_color || a.lines[1]?.color || '#000000'} onChange={(v) => set('hl_main_color', v)} />
              <Sub>Brilho (glow)</Sub>
              <CheckField label="Ativar brilho" checked={a.hl_glow} onChange={(v) => set('hl_glow', v)} />
              {a.hl_glow && (
                <>
                  <ColorField label="Cor do brilho" value={a.hl_glow_color || a.hl_border_color} onChange={(v) => set('hl_glow_color', v)} />
                  <NumField label="Tamanho do brilho (px)" value={a.hl_glow_size ?? 22} min={4} max={60} onChange={(v) => set('hl_glow_size', v)} />
                </>
              )}
            </>
          ),
        },
        {
      id: 'barra', title: 'Barra da Régua', show: !cards,
      body: (
        <>
          <NumField label="Espessura da barra (px)" value={a.bar_height} min={2} max={30} onChange={(v) => set('bar_height', v)} />
          <NumField label="Tamanho do marcador (px)" value={a.marker_size} min={8} max={48} onChange={(v) => set('marker_size', v)} />
        </>
      ),
    },
    {
      id: 'visiveis', title: 'Elementos Visíveis', show: true,
      body: (
        <>
          <CheckField label="Exibir título" checked={a.show_title} onChange={(v) => set('show_title', v)} />
          {!cards && <CheckField label="Exibir marcadores" checked={a.show_markers} onChange={(v) => set('show_markers', v)} />}
          <CheckField label="Exibir rodapé" checked={a.show_footer} onChange={(v) => set('show_footer', v)} />
        </>
      ),
    },
  ].filter((s) => s.show);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {initial.id ? (
                <div className="flex w-[320px] items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
                  <Pencil className="h-4 w-4 text-slate-400" />
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do estilo"
                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none" />
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800">Novo estilo</div>
              )}
              {initial.template && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <Layers className="h-3.5 w-3.5" /> Baseado em: {initial.template}
                </span>
              )}
              {dirty && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">Modificado</span>}
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
          <div className="w-[430px] shrink-0 space-y-2 overflow-y-auto p-5">
            <h3 className="text-lg font-extrabold text-slate-900">Configurações Da Régua</h3>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
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

            {sections.map((s, i) => (
              <Section key={s.id} n={i + 1} title={s.title} open={open === s.id} onToggle={() => toggle(s.id)}>
                {s.body}
              </Section>
            ))}
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-50 p-8">
            {device === 'mobile' ? (
              <div className="relative h-[560px] w-[290px] shrink-0 rounded-[42px] border-[8px] border-[#1e2140] bg-white shadow-xl">
                <div className="absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[#1e2140]" />
                <div className="h-full overflow-hidden rounded-[32px] px-1 pt-8">
                  <div className="mx-2 h-28 rounded-lg bg-slate-100" />
                  <RulerPreview a={a} content={previewContent} />
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
                  <RulerPreview a={a} content={previewContent} />
                  <div className="mt-3 h-3 w-1/3 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            {err ? <span className="font-semibold text-red-600">{err}</span> : (
              <span>Este painel é um <b>preview meramente visual</b>. O conteúdo da régua é editado na página <b>Régua</b>.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-800">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#0094EB]" />
              Padrão da loja
            </label>
            <button type="button" onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">
              <X className="h-4 w-4" /> Cancelar
            </button>
            {initial.id && (
              <button type="button" onClick={() => openNaming(true)} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-600 disabled:opacity-60">
                <Plus className="h-4 w-4" /> Salvar como novo
              </button>
            )}
            <button type="button" onClick={onSaveClick} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? 'Salvando...' : initial.id ? 'Salvar' : 'Salvar como novo estilo'}
            </button>
          </div>
        </div>
      </div>

      {naming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900">Nome do estilo</h3>
            <p className="mt-1 text-sm text-slate-500">
              {initial.id
                ? 'Digite um nome para salvar uma cópia independente.'
                : 'Templates padrão não podem ser alterados. Digite um nome para salvar como um novo estilo personalizado.'}
            </p>
            <input autoFocus value={nameDraft} onChange={(e) => { setNameDraft(e.target.value); setNameErr(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmName(); }}
              placeholder="Ex.: Black Friday 2026"
              className="mt-4 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0094EB]" />
            {nameErr && <p className="mt-2 text-xs font-semibold text-red-600">{nameErr}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setNaming(null)} disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">Cancelar</button>
              <button type="button" onClick={confirmName} disabled={saving}
                className="rounded-xl bg-[#0094EB] px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}