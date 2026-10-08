import ImageUpload from '@/components/admin/ImageUpload';
import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Pencil, Pause, Play, Mail, MessageCircle, Tag, X, BarChart3, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import {
  AUDIENCE_LABEL, FREQUENCY_LABEL, LOCATION_LABEL, deleteItem, emptyDraft, getMetrics, listItems, saveItem,
  type MktAudience, type MktCounts, type MktSlide, type MktDraft, type MktFrequency, type MktItem, type MktKind, type MktLocation, type MktMetrics,
} from '@/services/admin/marketingAdmin';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import {
  deleteMktCoupon, emptyCouponDraft, listMktCoupons, saveMktCoupon, setMktCouponActive,
  type CouponDraft, type MktCoupon,
} from '@/services/admin/couponsMarketing';

type TabKey = 'visao' | 'banner' | 'popup' | 'email' | 'whatsapp' | 'promocao';

const inputCls =
  'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1';

const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toIso = (v: string) => (v ? new Date(v).toISOString() : null);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const ctr = (c: MktCounts) => (c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%');

function statusOf(i: MktItem): { label: string; cls: string } {
  const now = Date.now();
  if (!i.is_active) return { label: 'Pausado', cls: 'bg-slate-700 text-slate-200' };
  if (i.ends_at && new Date(i.ends_at).getTime() < now) return { label: 'Encerrado', cls: 'bg-rose-500/20 text-rose-300' };
  if (i.starts_at && new Date(i.starts_at).getTime() > now) return { label: 'Agendado', cls: 'bg-sky-500/20 text-sky-300' };
  return { label: 'No ar', cls: 'bg-emerald-500/20 text-emerald-300' };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

function ChannelBlock({ title, icon, labels, note }: { title: string; icon: React.ReactNode; labels: string[]; note?: string }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">{icon}{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {labels.map((l) => <Stat key={l} label={l} value={0} />)}
      </div>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function Visao() {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<MktMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    getMetrics(days).then(setM).catch((e) => setErr(e?.message || 'Erro ao carregar métricas'));
  }, [days]);

  const block = (title: string, c: MktCounts | undefined) => (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-100">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Impressões" value={c?.impressions ?? 0} />
        <Stat label="Cliques" value={c?.clicks ?? 0} />
        <Stat label="CTR" value={c ? ctr(c) : '0,0%'} />
        <Stat label="Fechamentos" value={c?.closes ?? 0} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-100">Métricas</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={inputCls + ' !w-auto'}>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>
      {err && <p className="text-sm text-rose-400">{err}</p>}
      {block('Banners', m?.banner)}
      {block('Popups', m?.popup)}
      <ChannelBlock
        title="E-mail marketing" icon={<Mail className="w-4 h-4" />}
        labels={['Enviados', 'Abertos', 'Clicados', 'Respondidos']}
        note="Zerado até conectar um provedor de e-mail."
      />
      <ChannelBlock
        title="WhatsApp marketing" icon={<MessageCircle className="w-4 h-4" />}
        labels={['Enviadas', 'Lidas', 'Clicadas', 'Respondidas']}
        note="Zerado até conectar um provedor de WhatsApp."
      />
    </div>
  );
}

function DateTimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onChange(new Date().toISOString())} className="text-[11px] font-bold text-amber-400 hover:text-amber-300">Agora</button>
          {value && <button type="button" onClick={() => onChange(null)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-300">Limpar</button>}
        </div>
      </div>
      <input
        type="datetime-local"
        className={inputCls + ' cursor-pointer [color-scheme:dark]'}
        value={toLocal(value)}
        onChange={(e) => onChange(toIso(e.target.value))}
        onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { /* ignora */ } }}
      />
    </div>
  );
}

const blankSlide = (): MktSlide => ({ image_url: '', starts_at: null, ends_at: null });

const newDraft = (kind: MktKind): MktDraft => ({ ...emptyDraft(kind), slides: kind === 'banner' ? [blankSlide()] : [] });

const editDraft = (i: MktItem): MktDraft => {
  const slides = i.slides ?? [];
  if (i.kind === 'banner' && slides.length === 0 && i.image_url) {
    return { ...i, slides: [{ image_url: i.image_url, starts_at: null, ends_at: null }] };
  }
  return { ...i, slides };
};

function SlidesEditor({ slides, onChange }: { slides: MktSlide[]; onChange: (s: MktSlide[]) => void }) {
  const [same, setSame] = useState(() => slides.every((s) => s.starts_at === slides[0]?.starts_at && s.ends_at === slides[0]?.ends_at));

  const setImage = (idx: number, url: string) => onChange(slides.map((s, n) => (n === idx ? { ...s, image_url: url } : s)));
  const setDates = (idx: number, p: Partial<MktSlide>) => {
    if (same && slides.length > 1) setSame(false);
    onChange(slides.map((s, n) => (n === idx ? { ...s, ...p } : s)));
  };
  const toggleSame = (v: boolean) => {
    setSame(v);
    if (v && slides.length > 1) onChange(slides.map((s) => ({ ...s, starts_at: slides[0].starts_at, ends_at: slides[0].ends_at })));
  };
  const add = () => onChange([...slides, same && slides.length ? { image_url: '', starts_at: slides[0].starts_at, ends_at: slides[0].ends_at } : blankSlide()]);
  const remove = (idx: number) => onChange(slides.filter((_, n) => n !== idx));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className={labelCls + ' !mb-0'}>Imagens do banner</label>
        <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
          <input type="checkbox" checked={same} onChange={(e) => toggleSame(e.target.checked)} /> Usar as mesmas datas em todas
        </label>
      </div>
      {slides.map((s, idx) => (
        <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Imagem {idx + 1} de {slides.length}</p>
            {slides.length > 1 && (
              <button type="button" onClick={() => remove(idx)} className="text-[11px] font-semibold text-rose-400 hover:text-rose-300">Remover</button>
            )}
          </div>
          <ImageUpload kind="banner" value={s.image_url} onChange={(u) => setImage(idx, u)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateTimeField label="Início da imagem" value={s.starts_at} onChange={(x) => setDates(idx, { starts_at: x })} />
            <DateTimeField label="Fim da imagem" value={s.ends_at} onChange={(x) => setDates(idx, { ends_at: x })} />
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-700 text-slate-200 hover:bg-slate-800">
        <Plus className="w-4 h-4" /> Adicionar imagem
      </button>
      <p className="text-[11px] text-slate-500">Cada imagem só aparece no carrossel dentro do período dela e do período geral do banner.</p>
    </div>
  );
}

function ItemForm({ draft, onChange, onCancel, onSave, saving }: {
  draft: MktDraft; onChange: (d: MktDraft) => void; onCancel: () => void; onSave: () => void; saving: boolean;
}) {
  const set = <K extends keyof MktDraft>(k: K, v: MktDraft[K]) => onChange({ ...draft, [k]: v });
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100">{draft.id ? 'Editar' : 'Novo'} {draft.kind === 'banner' ? 'banner' : 'popup'}</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-100"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2"><label className={labelCls}>Título (uso interno)</label>
          <input className={inputCls} value={draft.title} onChange={(e) => set('title', e.target.value)} /></div>
        {draft.kind === 'banner' ? (
              <div className="md:col-span-2"><SlidesEditor key={draft.id ?? 'novo'} slides={draft.slides ?? []} onChange={(s) => set('slides', s)} /></div>
            ) : (
              <ImageUpload kind={draft.kind} value={draft.image_url} onChange={(u) => set('image_url', u)} />
            )}
        <div><label className={labelCls}>Link ao clicar na imagem</label>
          <input className={inputCls} value={draft.cta_url} onChange={(e) => set('cta_url', e.target.value)} placeholder="/precos ou https://..." /></div>
        <div><label className={labelCls}>Local de exibição</label>
          <select className={inputCls} value={draft.location} onChange={(e) => set('location', e.target.value as MktLocation)}>
            {Object.entries(LOCATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className={labelCls}>Público</label>
          <select className={inputCls} value={draft.audience} onChange={(e) => set('audience', e.target.value as MktAudience)}>
            {Object.entries(AUDIENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
            <DateTimeField label="Início" value={draft.starts_at} onChange={(x) => set('starts_at', x)} /><DateTimeField label="Fim" value={draft.ends_at} onChange={(x) => set('ends_at', x)} /></div>
        {draft.kind === 'popup' && (
          <div><label className={labelCls}>Frequência</label>
            <select className={inputCls} value={draft.frequency} onChange={(e) => set('frequency', e.target.value as MktFrequency)}>
              {Object.entries(FREQUENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-200 mt-5">
          <input type="checkbox" checked={draft.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Ativo
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancelar</button>
        <button type="button" disabled={saving || !draft.title.trim()} onClick={onSave}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function ItemsPanel({ kind }: { kind: MktKind }) {
  const [items, setItems] = useState<MktItem[]>([]);
  const [draft, setDraft] = useState<MktDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    listItems(kind).then(setItems).catch((e) => setErr(e?.message || 'Erro ao carregar'));
  }, [kind]);
  useEffect(() => { setDraft(null); setConfirmId(null); load(); }, [load]);

  const save = async () => {
    if (!draft) return;
    setSaving(true); setErr(null);
    try { await saveItem(draft); setDraft(null); load(); }
    catch (e: any) { setErr(e?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };
  const toggle = async (i: MktItem) => {
    try { await saveItem(editDraft({ ...i, is_active: !i.is_active })); load(); } catch (e: any) { setErr(e?.message || 'Erro'); }
  };
  const remove = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); return; }
    try { await deleteItem(id); setConfirmId(null); load(); } catch (e: any) { setErr(e?.message || 'Erro ao excluir'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-100">{kind === 'banner' ? 'Banners' : 'Popups'}</h2>
        {!draft && (
          <button type="button" onClick={() => setDraft(newDraft(kind))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400">
            <Plus className="w-4 h-4" /> Novo {kind === 'banner' ? 'banner' : 'popup'}
          </button>
        )}
      </div>
      {err && <p className="text-sm text-rose-400">{err}</p>}
      {draft && <ItemForm draft={draft} onChange={setDraft} onCancel={() => setDraft(null)} onSave={save} saving={saving} />}
      {items.length === 0 && !draft && <p className="text-sm text-slate-500">Nenhum item criado.</p>}
      <div className="space-y-2">
        {items.map((i) => {
          const st = statusOf(i);
          return (
            <div key={i.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-100 truncate">{i.title}</p>
                  <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + st.cls}>{st.label}</span>
                  {i.coupon_code && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{i.coupon_code}</span>}
                </div>
                <p className="text-xs text-slate-400">
                  {LOCATION_LABEL[i.location]} · {AUDIENCE_LABEL[i.audience]} · {fmtDate(i.starts_at)} → {fmtDate(i.ends_at)}
                </p>
              </div>
              <div className="text-xs text-slate-300 tabular-nums">
                {i.impressions} imp · {i.clicks} cliques · {ctr(i)} · {i.closes} fech.
              </div>
              <div className="flex items-center gap-1">
                <button type="button" title={i.is_active ? 'Pausar' : 'Ativar'} onClick={() => toggle(i)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800">
                  {i.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button type="button" title="Editar" onClick={() => setDraft(editDraft(i))} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800">
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" title="Excluir" onClick={() => remove(i.id)}
                  className={'p-2 rounded-lg ' + (confirmId === i.id ? 'bg-rose-600 text-white text-xs font-bold px-3' : 'text-rose-400 hover:bg-slate-800')}>
                  {confirmId === i.id ? 'Confirmar?' : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function couponStatus(c: MktCoupon): { label: string; cls: string } {
  const now = Date.now();
  if (!c.is_active) return { label: 'Pausado', cls: 'bg-slate-700 text-slate-200' };
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return { label: 'Expirado', cls: 'bg-rose-500/20 text-rose-300' };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: 'Agendado', cls: 'bg-sky-500/20 text-sky-300' };
  if (c.max_uses !== null && c.times_used >= c.max_uses) return { label: 'Esgotado', cls: 'bg-amber-500/20 text-amber-300' };
  return { label: 'Ativo', cls: 'bg-emerald-500/20 text-emerald-300' };
}

const couponValue = (c: MktCoupon) =>
  c.discount_type === 'percentage'
    ? c.discount_value + '%'
    : (c.discount_value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Cupom() {
  const [items, setItems] = useState<MktCoupon[]>([]);
  const [draft, setDraft] = useState<CouponDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(() => {
    listMktCoupons().then(setItems).catch((e) => setErr(e?.message || 'Erro ao carregar cupons'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof CouponDraft>(k: K, v: CouponDraft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true); setErr(null); setOk(null);
    try {
      await saveMktCoupon(draft);
      setOk(draft.id ? 'Cupom atualizado.' : 'Cupom ' + draft.code.trim().toUpperCase() + ' criado.');
      setDraft(null);
      load();
    } catch (e: any) {
      setErr(e?.message || 'Erro ao salvar o cupom');
    } finally { setSaving(false); }
  };

  const toggle = async (c: MktCoupon) => {
    setErr(null); setOk(null);
    try { await setMktCouponActive(c.id, !c.is_active); load(); } catch (e: any) { setErr(e?.message || 'Erro'); }
  };

  const remove = async (c: MktCoupon) => {
    if (!(await confirm({ title: 'Excluir cupom', message: 'O cupom "' + c.code + '" será apagado. Se já foi usado em assinaturas, use Pausar.', confirmLabel: 'Excluir' }))) return;
    setErr(null); setOk(null);
    try { await deleteMktCoupon(c.id); load(); } catch (e: any) { setErr(e?.message || 'Erro ao excluir'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-100">Cupons</h2>
        {!draft && (
          <button type="button" onClick={() => { setOk(null); setDraft(emptyCouponDraft()); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400">
            <Plus className="w-4 h-4" /> Novo cupom
          </button>
        )}
      </div>

      {err && <p className="text-sm text-rose-400">{err}</p>}
      {ok && <p className="text-sm text-emerald-400">{ok}</p>}

      {draft && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">{draft.id ? 'Editar cupom' : 'Novo cupom'}</h3>
            <button type="button" onClick={() => setDraft(null)} className="text-slate-400 hover:text-slate-100"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><label className={labelCls}>Código</label>
              <input className={inputCls} value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="BLACK10" /></div>
            <div><label className={labelCls}>Desconto (%)</label>
              <input className={inputCls} value={draft.value} onChange={(e) => set('value', e.target.value)} /></div>
            <div><label className={labelCls}>Limite de usos (vazio = ilimitado)</label>
              <input className={inputCls} value={draft.max_uses} onChange={(e) => set('max_uses', e.target.value)} /></div>
            <div className="md:col-span-3 grid grid-cols-2 gap-3">
              <DateTimeField label="Início da validade" value={draft.starts_at} onChange={(x) => set('starts_at', x)} />
              <DateTimeField label="Fim da validade" value={draft.expires_at} onChange={(x) => set('expires_at', x)} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Vale para todos os planos. Sem início, o cupom vale a partir de agora; sem fim, não expira.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancelar</button>
            <button type="button" disabled={saving || !draft.code.trim()} onClick={save}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !draft && <p className="text-sm text-slate-500">Nenhum cupom criado.</p>}

      <div className="space-y-2">
        {items.map((c) => {
          const st = couponStatus(c);
          return (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-100 tracking-wider">{c.code}</p>
                  <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + st.cls}>{st.label}</span>
                </div>
                <p className="text-xs text-slate-400">{fmtDate(c.starts_at)} → {c.expires_at ? fmtDate(c.expires_at) : 'sem fim'}</p>
              </div>
              <div className="text-xs text-slate-300 tabular-nums text-right">
                <p><b className="text-amber-300">{couponValue(c)}</b> de desconto</p>
                <p>Usado {c.times_used} / {c.max_uses ?? 'ilimitado'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" title={c.is_active ? 'Pausar' : 'Ativar'} onClick={() => toggle(c)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800">
                  {c.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button type="button" title="Editar" onClick={() => { setOk(null); setDraft({ id: c.id, code: c.code, value: String(c.discount_value), max_uses: c.max_uses === null ? '' : String(c.max_uses), starts_at: c.starts_at, expires_at: c.expires_at }); }}
                  className="p-2 rounded-lg text-slate-300 hover:bg-slate-800">
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" title="Excluir" onClick={() => remove(c)} className="p-2 rounded-lg text-rose-400 hover:bg-slate-800">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {dialog}
    </div>
  );
}
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'visao', label: 'Métricas', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'banner', label: 'Banners', icon: <ImageIcon className="w-4 h-4" /> },
  { key: 'popup', label: 'Popups', icon: <LayoutTemplate className="w-4 h-4" /> },
  { key: 'email', label: 'E-mail', icon: <Mail className="w-4 h-4" /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
  { key: 'promocao', label: 'Cupom', icon: <Tag className="w-4 h-4" /> },
];

export default function MarketingTab() {
  const [tab, setTab] = useState<TabKey>('visao');
  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100"><Megaphone className="w-5 h-5 text-amber-500" /> Marketing</h1>
      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={'flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px ' +
              (tab === t.key ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tab === 'visao' && <Visao />}
      {tab === 'banner' && <ItemsPanel kind="banner" />}
      {tab === 'popup' && <ItemsPanel kind="popup" />}
      {tab === 'email' && (
        <ChannelBlock title="E-mail marketing" icon={<Mail className="w-4 h-4" />} labels={['Enviados', 'Abertos', 'Clicados', 'Respondidos']}
          note="Envio de e-mail ainda não conectado. Precisa de um provedor (ex.: Resend, SendGrid) para medir abertura e resposta." />
      )}
      {tab === 'whatsapp' && (
        <ChannelBlock title="WhatsApp marketing" icon={<MessageCircle className="w-4 h-4" />} labels={['Enviadas', 'Lidas', 'Clicadas', 'Respondidas']}
          note="Envio de WhatsApp ainda não conectado. Precisa da API oficial ou de um provedor para medir leitura e resposta." />
      )}
      {tab === 'promocao' && <Cupom />}
    </div>
  );
}