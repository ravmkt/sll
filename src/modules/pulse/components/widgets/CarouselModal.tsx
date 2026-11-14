import { useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Monitor, Smartphone, Trash2, X } from 'lucide-react';
import WidgetPlacementPicker, { type Placement } from './WidgetPlacementPicker';
import { ColorField as Color } from './RulerConfigControls';
import CarouselPreview from './CarouselPreview';
import { infoCardsService } from '../../services/infoCardsService';
import { CAROUSEL_FONTS, normalizeCarousel } from '../../lib/carouselDefaults';
import type { CarouselDesign, CarouselFont, CarouselItem, InfoCard } from '../../types/infoCards';
import type { WidgetsCtx } from '../../types/widgets';

const BUCKET = 'widget-images';
const MAX_ITEMS = 20;
const MAX_BYTES = 3 * 1024 * 1024;
const EMPTY_PLACEMENT: Placement = { selector: '', position: 'before' };
const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0094EB]';
const labelCls = 'mb-1 block text-[10px] font-bold uppercase text-slate-400';
const sec = 'rounded-2xl border border-slate-200 bg-white p-5';
const h3 = 'mb-4 text-sm font-extrabold uppercase text-slate-800';
const validLink = (l?: string) => !l || /^(https?:\/\/|\/)/i.test(l.trim());
const SHAPES: { id: CarouselDesign['shape']; label: string }[] = [
  { id: 'square', label: 'Quadrado' }, { id: 'circle', label: 'Circular' },
];
const VIEWS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8];

const MAX_SRC = 15 * 1024 * 1024;
const MAX_W = 1200;
const WEBP_QUALITY = 0.82;

async function toWebp(file: File): Promise<{ body: Blob; type: string; ext: string }> {
  const orig = { body: file as Blob, type: file.type, ext: (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg' };
  if (file.type === 'image/gif') return orig;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_W / bmp.width);
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    if (!g) { bmp.close(); return orig; }
    g.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/webp', WEBP_QUALITY));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return orig;
    return { body: blob, type: 'image/webp', ext: 'webp' };
  } catch {
    return orig;
  }
}

﻿function TextGroup(p: {
  heading: string; size: number; min: number; max: number; font: CarouselFont; bold: boolean; color: string; noColor?: boolean;
  onSize: (v: number) => void; onFont: (v: CarouselFont) => void; onBold: (v: boolean) => void; onColor: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <p className="col-span-2 text-xs font-extrabold uppercase text-slate-500">{p.heading}</p>
      <label className="block"><span className={labelCls}>Tamanho: {p.size}px</span>
        <input type="range" min={p.min} max={p.max} value={p.size} onChange={(e) => p.onSize(Number(e.target.value))} className="w-full" /></label>
      <label className="block"><span className={labelCls}>Fonte</span>
        <select className={inputCls} value={p.font} onChange={(e) => p.onFont(e.target.value as CarouselFont)}>
          {CAROUSEL_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select></label>
      {!p.noColor && <Color label="Cor" value={p.color} onChange={p.onColor} />}
      <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={p.bold} onChange={(e) => p.onBold(e.target.checked)} /> Negrito</label>
    </div>
  );
}

interface Props { ctx: WidgetsCtx; initial: InfoCard | null; defaultName: string; onClose: () => void; onSaved: () => void }

export default function CarouselModal({ ctx, initial, defaultName, onClose, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [active, setActive] = useState(initial?.active ?? false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [items, setItems] = useState<CarouselItem[]>(initial ? (initial.tiers as CarouselItem[]) : []);
  const [placement, setPlacement] = useState<Placement>(initial?.placement ?? EMPTY_PLACEMENT);
  const [ds, setDs] = useState<CarouselDesign>(() => normalizeCarousel(initial?.design));
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const setD = (p: Partial<CarouselDesign>) => setDs((s) => ({ ...s, ...p }));
  const setItem = (i: number, p: Partial<CarouselItem>) => setItems((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const moveItem = (i: number, dir: -1 | 1) => setItems((l) => {
    const j = i + dir;
    if (j < 0 || j >= l.length) return l;
    const c = [...l];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });
  const filled = items.filter((i) => i.image);

  async function up(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Envie apenas imagens.');
    if (file.size > MAX_SRC) throw new Error('"' + file.name + '" tem mais de 15 MB.');
    const img = await toWebp(file);
    if (img.body.size > MAX_BYTES) throw new Error('"' + file.name + '" continua com mais de 3 MB após a compressão.');
    const path = ctx.storeId + '/' + crypto.randomUUID() + '.' + img.ext;
    const { error } = await ctx.supabase.storage.from(BUCKET).upload(path, img.body, { contentType: img.type, cacheControl: '31536000' });
    if (error) throw new Error(error.message);
    return ctx.supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setErr('');
    try {
      const room = MAX_ITEMS - items.length;
      const added: CarouselItem[] = [];
      for (const f of Array.from(files).slice(0, room)) added.push({ label: '', value: '', image: await up(f), link: '' });
      setItems((l) => [...l, ...added]);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro no upload.'); }
    finally { setBusy(false); }
  }

  async function replaceFile(i: number, files: FileList | null) {
    if (!files || !files[0]) return;
    setBusy(true); setErr('');
    try { setItem(i, { image: await up(files[0]) }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erro no upload.'); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!name.trim()) { setErr('Dê um nome ao carrossel.'); return; }
    if (filled.some((i) => !validLink(i.link))) { setErr('Links devem começar com http://, https:// ou /.'); return; }
    if (active && !placement.selector.trim()) { setErr('Selecione o elemento da loja antes de ativar.'); return; }
    if (active && filled.length === 0) { setErr('Adicione ao menos uma imagem antes de ativar.'); return; }
    setSaving(true); setErr('');
    try {
      await infoCardsService(ctx.supabase).save(ctx.storeId, {
        id: initial?.id ?? null, name: name.trim(), active, title, tiers: filled, footer: '', placement, style_id: null,
        kind: 'carousel', icon_position: 'left', icon_size: 28, icon_color: null, icon_bg: 'none', icon_bg_color: null, design: ds,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally { setSaving(false); }
  }

  const btnSel = (on: boolean) => `flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${on ? 'border-[#0094EB] bg-sky-50 text-[#0094EB]' : 'border-slate-200 text-slate-600'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div className="my-4 w-full max-w-[1200px] rounded-2xl bg-slate-50 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-extrabold text-slate-900">{initial ? 'Editar carrossel' : 'Novo carrossel'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-5">
            <section className={sec}>
              <h3 className={h3}>1. Imagens</h3>
              <label className="block"><span className={labelCls}>Nome (uso interno)</span>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="mt-4 block"><span className={labelCls}>Título acima do carrossel (opcional)</span>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Categorias" /></label>
              <div className="mt-4 space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-400" title="Trocar imagem">
                        {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { void replaceFile(i, e.target.files); e.target.value = ''; }} />
                      </label>
                      <div className="grid flex-1 grid-cols-1 gap-2">
                        <input className={inputCls} value={it.label} placeholder="Legenda (ex.: Para ela)" onChange={(e) => setItem(i, { label: e.target.value })} />
                        <input className={inputCls} value={it.link ?? ''} placeholder="Link ao clicar (opcional): https://..." onChange={(e) => setItem(i, { link: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <button type="button" disabled={i === 0} onClick={() => moveItem(i, -1)} aria-label="Mover para cima"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={i === items.length - 1} onClick={() => moveItem(i, 1)} aria-label="Mover para baixo"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              {items.length < MAX_ITEMS && (
                <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600">
                  <ImagePlus className="h-3.5 w-3.5" /> {busy ? 'Enviando...' : 'Enviar imagens'}
                  <input type="file" accept="image/*" multiple disabled={busy} className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
                </label>
              )}
              <p className="mt-2 text-xs text-slate-400">Até {MAX_ITEMS} imagens de até 15 MB. Elas são convertidas automaticamente para WebP.</p>
            </section>

            ﻿<section className={sec}>
                  <h3 className={h3}>2. Formato e tamanho da imagem</h3>
                  <div className="flex gap-2">
                    {SHAPES.map((s) => <button key={s.id} type="button" onClick={() => setD({ shape: s.id })} className={btnSel(ds.shape === s.id)}>{s.label}</button>)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {ds.shape === 'square' && (
                      <label className="block"><span className={labelCls}>Proporção</span>
                        <select className={inputCls} value={ds.aspect} onChange={(e) => setD({ aspect: e.target.value })}>
                          <option value="1 / 1">Quadrada (1:1)</option><option value="4 / 5">Retrato (4:5)</option>
                          <option value="3 / 4">Retrato (3:4)</option><option value="16 / 9">Paisagem (16:9)</option>
                        </select></label>
                    )}
                    {ds.shape === 'square' && (
                      <label className="block"><span className={labelCls}>Arredondar bordas: {ds.img_radius}%</span>
                        <input type="range" min={0} max={50} value={ds.img_radius} onChange={(e) => setD({ img_radius: Number(e.target.value) })} className="w-full" /></label>
                    )}
                    <label className="block"><span className={labelCls}>Ajuste da imagem</span>
                      <select className={inputCls} value={ds.fit} onChange={(e) => setD({ fit: e.target.value as CarouselDesign['fit'] })}>
                        <option value="contain">Mostrar inteira</option><option value="cover">Preencher (cortar)</option>
                      </select></label>
                    <Color label="Fundo da imagem" value={ds.img_bg} onChange={(v) => setD({ img_bg: v })} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setD({ size_mode: 'auto' })} className={btnSel(ds.size_mode === 'auto')}>Tamanho automático</button>
                    <button type="button" onClick={() => setD({ size_mode: 'fixed' })} className={btnSel(ds.size_mode === 'fixed')}>Tamanho fixo</button>
                  </div>
                  {ds.size_mode === 'fixed' ? (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block"><span className={labelCls}>Tamanho no desktop: {ds.size_d}px</span>
                        <input type="range" min={40} max={400} step={2} value={ds.size_d} onChange={(e) => setD({ size_d: Number(e.target.value) })} className="w-full" /></label>
                      <label className="block"><span className={labelCls}>Tamanho no mobile: {ds.size_m}px</span>
                        <input type="range" min={40} max={300} step={2} value={ds.size_m} onChange={(e) => setD({ size_m: Number(e.target.value) })} className="w-full" /></label>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">O tamanho se ajusta à quantidade de imagens visíveis (seção 4).</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setD({ border_on: false })} className={btnSel(!ds.border_on)}>Sem borda</button>
                    <button type="button" onClick={() => setD({ border_on: true })} className={btnSel(ds.border_on)}>Com borda</button>
                  </div>
                  {ds.border_on && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Color label="Cor da borda" value={ds.border_color} onChange={(v) => setD({ border_color: v })} />
                      <label className="block"><span className={labelCls}>Espessura: {ds.border_w}px</span>
                        <input type="range" min={1} max={8} value={ds.border_w} onChange={(e) => setD({ border_w: Number(e.target.value) })} className="w-full" /></label>
                    </div>
                  )}
                </section>

                <section className={sec}>
                  <h3 className={h3}>3. Texto</h3>
                  <TextGroup heading="Título" size={ds.title_size} min={12} max={40} font={ds.title_font} bold={ds.title_bold} color={ds.title_color}
                    onSize={(v) => setD({ title_size: v })} onFont={(v) => setD({ title_font: v })} onBold={(v) => setD({ title_bold: v })} onColor={(v) => setD({ title_color: v })} />
                  {!title.trim() && <p className="mt-2 text-xs text-slate-400">Preencha o título na seção 1 para ele aparecer.</p>}
                  {ds.caption_pos !== 'none' && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <TextGroup heading="Legenda" size={ds.caption_size} min={9} max={28} font={ds.caption_font} bold={ds.caption_bold} color={ds.caption_color}
                        noColor={ds.caption_pos === 'overlay'}
                        onSize={(v) => setD({ caption_size: v })} onFont={(v) => setD({ caption_font: v })} onBold={(v) => setD({ caption_bold: v })} onColor={(v) => setD({ caption_color: v })} />
                    </div>
                  )}
                </section>

                <section className={sec}>
                  <h3 className={h3}>4. Layout e espaçamento</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {ds.size_mode === 'auto' && (
                      <label className="block"><span className={labelCls}>Visíveis no desktop</span>
                        <select className={inputCls} value={ds.per_desktop} onChange={(e) => setD({ per_desktop: Number(e.target.value) })}>
                          {VIEWS.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
                    )}
                    {ds.size_mode === 'auto' && (
                      <label className="block"><span className={labelCls}>Visíveis no mobile</span>
                        <select className={inputCls} value={ds.per_mobile} onChange={(e) => setD({ per_mobile: Number(e.target.value) })}>
                          {VIEWS.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
                    )}
                    <label className="block"><span className={labelCls}>Espaço entre imagens: {ds.gap}px</span>
                      <input type="range" min={0} max={48} value={ds.gap} onChange={(e) => setD({ gap: Number(e.target.value) })} className="w-full" /></label>
                    <label className="block"><span className={labelCls}>Legenda</span>
                      <select className={inputCls} value={ds.caption_pos} onChange={(e) => setD({ caption_pos: e.target.value as CarouselDesign['caption_pos'] })}>
                        <option value="below">Abaixo da imagem</option><option value="overlay">Sobre a imagem</option><option value="none">Sem legenda</option>
                      </select></label>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                    <label className="col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={ds.bg_on} onChange={(e) => setD({ bg_on: e.target.checked })} /> Usar cor de fundo no carrossel
                    </label>
                    {ds.bg_on && <Color label="Cor de fundo" value={ds.bg_color} onChange={(v) => setD({ bg_color: v })} />}
                    <label className="block"><span className={labelCls}>Espaçamento lateral: {ds.pad_x}px</span>
                      <input type="range" min={0} max={96} value={ds.pad_x} onChange={(e) => setD({ pad_x: Number(e.target.value) })} className="w-full" /></label>
                    <label className="block"><span className={labelCls}>Espaçamento superior: {ds.pad_t}px</span>
                      <input type="range" min={0} max={96} value={ds.pad_t} onChange={(e) => setD({ pad_t: Number(e.target.value) })} className="w-full" /></label>
                    <label className="block"><span className={labelCls}>Espaçamento inferior: {ds.pad_b}px</span>
                      <input type="range" min={0} max={96} value={ds.pad_b} onChange={(e) => setD({ pad_b: Number(e.target.value) })} className="w-full" /></label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-5 text-sm text-slate-700">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={ds.arrows} onChange={(e) => setD({ arrows: e.target.checked })} /> Setas (desktop)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={ds.autoplay} onChange={(e) => setD({ autoplay: e.target.checked })} /> Rolagem automática</label>
                  </div>
                  {(ds.arrows || ds.autoplay) && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {ds.arrows && <Color label="Cor das setas" value={ds.arrow_color} onChange={(v) => setD({ arrow_color: v })} />}
                      {ds.autoplay && (
                        <label className="block"><span className={labelCls}>Intervalo: {(ds.autoplay_ms / 1000).toFixed(1)}s</span>
                          <input type="range" min={1500} max={10000} step={500} value={ds.autoplay_ms} onChange={(e) => setD({ autoplay_ms: Number(e.target.value) })} className="w-full" /></label>
                      )}
                    </div>
                  )}
                </section>
                <section className={sec}>
              <h3 className={h3}>5. Posição na loja</h3>
              <WidgetPlacementPicker supabase={ctx.supabase} storeId={ctx.storeId} storeUrl={ctx.storeUrl} value={placement} onChange={setPlacement} />
            </section>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className={sec}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase text-slate-800">Preview</h3>
                <div className="flex rounded-lg border border-slate-200 p-0.5">
                  {(['mobile', 'desktop'] as const).map((d) => (
                    <button key={d} type="button" onClick={() => setDevice(d)} className={`rounded-md p-1.5 ${device === d ? 'bg-[#0094EB] text-white' : 'text-slate-500'}`}>
                      {d === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`mx-auto rounded-xl bg-white p-3 ${device === 'mobile' ? 'max-w-[340px]' : 'w-full'}`}>
                <CarouselPreview title={title} items={filled} ds={ds} device={device} />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <button type="button" role="switch" aria-checked={active} onClick={() => setActive(!active)}
              className={`relative h-6 w-11 rounded-full transition ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${active ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            {active ? 'Ativo na loja' : 'Rascunho / pausado'}
          </div>
          <div className="flex items-center gap-3">
            {err && <span className="text-sm font-semibold text-red-600">{err}</span>}
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" onClick={save} disabled={saving || busy} className="rounded-xl bg-[#0094EB] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
