import type { ReactNode } from 'react';
import { CARD_FONTS, type RulerAppearance } from '../../types/widgets';

const inp = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm';

function F({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Num({ label, v, on, min = 0, max = 999 }: { label: string; v: number; on: (n: number) => void; min?: number; max?: number }) {
  return (
    <F label={label}>
      <input type="number" className={inp} value={v} min={min} max={max}
        onChange={(e) => on(Math.max(min, Math.min(max, parseFloat(e.target.value) || 0)))} />
    </F>
  );
}
function Col({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <F label={label}>
      <input type="color" className="h-8 w-full rounded border border-slate-300" value={/^#[0-9a-f]{6}$/i.test(v) ? v : '#000000'} onChange={(e) => on(e.target.value)} />
    </F>
  );
}
function Chk({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-700">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} /> {label}
    </label>
  );
}
function H({ children }: { children: ReactNode }) {
  return <div className="pt-2 text-xs font-bold uppercase tracking-wide text-slate-500">{children}</div>;
}

export default function RulerCardsStyleFields({ a, set }: { a: RulerAppearance; set: (p: Partial<RulerAppearance>) => void }) {
  const setLine = (i: number, p: Partial<RulerAppearance['lines'][number]>) =>
    set({ lines: a.lines.map((l, k) => (k === i ? { ...l, ...p } : l)) });
  const cards = a.layout === 'cards';

  return (
    <div className="space-y-3">
      <H>Layout</H>
      <select className={inp} value={a.layout} onChange={(e) => set({ layout: e.target.value as RulerAppearance['layout'] })}>
        <option value="steps">{'Bolinhas com linha'}</option>
        <option value="cards">{'Cards'}</option>
      </select>

      {cards && (
        <>
          <H>{'Carrossel'}</H>
          <F label={'Modo'}>
            <select className={inp} value={a.carousel_mode} onChange={(e) => set({ carousel_mode: e.target.value as RulerAppearance['carousel_mode'] })}>
              <option value="static">{'Est\u00e1tico'}</option>
              <option value="auto">{'Autom\u00e1tico'}</option>
              <option value="manual">{'Manual (arrastar)'}</option>
              <option value="stack">{'Empilhado'}</option>
            </select>
          </F>
          <div className="grid grid-cols-2 gap-2">
            <Num label={'Cards vis\u00edveis'} v={a.cards_visible} min={1} max={6} on={(n) => set({ cards_visible: n })} />
            <Num label={'Espa\u00e7amento (px)'} v={a.cards_gap} max={60} on={(n) => set({ cards_gap: n })} />
            <Num label={'Intervalo (ms)'} v={a.autoplay_ms} min={1000} max={20000} on={(n) => set({ autoplay_ms: n })} />
            <Num label={'Velocidade (ms)'} v={a.anim_ms} min={100} max={3000} on={(n) => set({ anim_ms: n })} />
          </div>
          <Chk label={'Loop infinito'} v={a.infinite} on={(b) => set({ infinite: b })} />
          <Chk label={'Pausar ao passar o mouse'} v={a.pause_hover} on={(b) => set({ pause_hover: b })} />

          <H>Card</H>
          <div className="grid grid-cols-2 gap-2">
            <Num label={'Borda (px)'} v={a.card_border_width} max={12} on={(n) => set({ card_border_width: n })} />
            <Num label={'Raio (px)'} v={a.card_radius} max={60} on={(n) => set({ card_radius: n })} />
            <Num label={'Padding (px)'} v={a.card_padding} max={60} on={(n) => set({ card_padding: n })} />
            <span />
            <Col label={'Cor da borda'} v={a.card_border_color} on={(s) => set({ card_border_color: s })} />
            <Col label={'Fundo'} v={a.card_bg_color} on={(s) => set({ card_bg_color: s })} />
          </div>

          <H>{'Card destacado'}</H>
          <div className="grid grid-cols-2 gap-2">
            <Col label={'Borda'} v={a.hl_border_color} on={(s) => set({ hl_border_color: s })} />
            <Col label={'Fundo'} v={a.hl_bg_color} on={(s) => set({ hl_bg_color: s })} />
            <Col label={'Cor da linha 2'} v={a.hl_main_color || a.lines[1]?.color || '#000000'} on={(s) => set({ hl_main_color: s })} />
          </div>
          <Chk label={'Brilho (glow)'} v={a.hl_glow} on={(b) => set({ hl_glow: b })} />

          <H>{'Linhas do card'}</H>
          {a.lines.map((l, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-2">
              <div className="text-xs font-semibold text-slate-600">Linha {i + 1}</div>
              <div className="grid grid-cols-2 gap-2">
                <Num label={'Tamanho (px)'} v={l.size} min={8} max={80} on={(n) => setLine(i, { size: n })} />
                <Num label={'Peso'} v={l.weight} min={100} max={900} on={(n) => setLine(i, { weight: n })} />
                <Col label={'Cor'} v={l.color} on={(s) => setLine(i, { color: s })} />
                <Num label={'Espa\u00e7. letras'} v={l.spacing} max={10} on={(n) => setLine(i, { spacing: n })} />
              </div>
              <F label={'Fonte'}>
                <select className={inp} value={l.font} onChange={(e) => setLine(i, { font: e.target.value })}>
                  {CARD_FONTS.map(([v, n]) => <option key={n} value={v}>{n}</option>)}
                </select>
              </F>
              <Chk label={'MAI\u00daSCULAS'} v={l.upper} on={(b) => setLine(i, { upper: b })} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}