import { supabase } from '@/lib/supabase';
import { KpiGrid, Thumb, itemKpis, couponKpis } from '@/components/admin/MarketingKpi';
import CouponRanking from '@/components/admin/CouponRanking';
import MarketingChart from '@/components/admin/MarketingChart';
import EmailFunnel from '@/components/admin/EmailFunnel';
import ImageUpload from '@/components/admin/ImageUpload';
import NpsPanel from '@/components/admin/NpsPanel';
import EmailCampaigns from '@/components/admin/EmailCampaigns';
import { getEmailMetrics, EMPTY_EMAIL_METRICS, type EmailMetrics } from '@/services/admin/emailCampaigns';
import { LinkPicker, StorePicker } from '@/components/admin/MarketingPickers';
import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Pencil, Pause, Play, Mail, MessageCircle, Tag, X, BarChart3, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import {
  AUDIENCE_LABEL, FREQUENCY_LABEL, LOCATION_LABEL, NOTICE_STYLE_LABEL, deleteItem, emptyDraft, getMetrics, listItems, saveItem,
  type MktAudience, type NoticeStyle, type MktCounts, type MktSlide, type MktDraft, type MktFrequency, type MktItem, type MktKind, type MktLocation, type MktMetrics,
} from '@/services/admin/marketingAdmin';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import {
  deleteMktCoupon, couponToDraft, emptyCouponDraft, listCouponPlanOptions, listMktCoupons, saveMktCoupon, setMktCouponActive,
  type CouponDraft, type CouponDuration, type CouponPlanOption, type CouponType, type MktCoupon,
} from '@/services/admin/couponsMarketing';

type TabKey = 'visao' | 'banner' | 'popup' | 'aviso' | 'email' | 'whatsapp' | 'promocao' | 'nps';

const KIND_TITLE: Record<MktKind, string> = { banner: 'Banners', popup: 'Popups', notice: 'Avisos do sistema' };
const KIND_NOUN: Record<MktKind, string> = { banner: 'banner', popup: 'popup', notice: 'aviso' };

const inputCls =
  'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500';
const labelCls = 'block text-[13px] font-semibold uppercase tracking-wide text-slate-400 mb-1';

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
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

function ChannelBlock({ title, icon, labels, note, values }: { title: string; icon: React.ReactNode; labels: string[]; note?: string; values?: number[] }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-100">{icon}{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {labels.map((l, n) => <Stat key={l} label={l} value={values?.[n] ?? 0} />)}
      </div>
      {note && <p className="text-[13px] text-slate-500">{note}</p>}
    </div>
  );
}

type MetricCard = { title: string; tab?: string; items: { label: string; value: string | number }[] };

// Abre a aba do canal clicando no botao correspondente da barra de abas
function goToTab(label: string) {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === label);
  if (btn) { (btn as HTMLButtonElement).click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

function MetricCardView({ card }: { card: MetricCard }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-lg font-bold text-slate-100">{card.title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 text-center">
        {card.items.map((it) => (
          <div key={it.label}>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">{it.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-[#fd8539]">{it.value}</p>
          </div>
        ))}
      </div>
      {card.tab && (
        <button
          type="button"
          onClick={() => goToTab(card.tab as string)}
          className="mt-5 cursor-pointer self-start text-[13px] font-semibold text-sky-400 transition-colors hover:text-sky-300"
        >
          {'Ver relat\u00f3rio detalhado \u2192'}
        </button>
      )}
    </div>
  );
}

const DAY_OPTIONS = [
  { v: 7, label: '\u00daltimos 7 dias' },
  { v: 30, label: '\u00daltimos 30 dias' },
  { v: 90, label: '\u00daltimos 90 dias' },
];

function Visao() {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<MktMetrics | null>(null);
  const [em, setEm] = useState<EmailMetrics>(EMPTY_EMAIL_METRICS);
  const [err, setErr] = useState<string | null>(null);

  const [cp, setCp] = useState({ total: 0, active: 0, uses: 0, expired: 0 });
  const [nps, setNps] = useState({ score: '\u2014' as string, total: 0, prom: 0, detr: 0 });

  useEffect(() => {
    setErr(null);
    getMetrics(days).then(setM).catch((e) => setErr(e?.message || 'Erro ao carregar m\u00e9tricas'));
    getEmailMetrics(days).then(setEm).catch(() => {});

    listMktCoupons().then((list: any[]) => {
      const now = Date.now();
      let active = 0, expired = 0, uses = 0;
      for (const c of list || []) {
        uses += Number(c.times_used) || 0;
        const end = c.expires_at ?? c.valid_until ?? c.ends_at ?? null;
        if (end && new Date(end).getTime() < now) expired++;
        else if ((c.is_active ?? c.active ?? true) !== false) active++;
      }
      setCp({ total: (list || []).length, active, uses, expired });
    }).catch(() => {});

    const since = new Date(Date.now() - days * 86400000).toISOString();
    (supabase as any)
      .from('app_feedbacks')
      .select('score')
      .eq('type', 'nps_wizard')
      .gte('created_at', since)
      .not('score', 'is', null)
      .limit(5000)
      .then(({ data }: any) => {
        const sc: number[] = (data || []).map((r: any) => Number(r.score));
        const total = sc.length;
        const prom = sc.filter((s) => s >= 9).length;
        const detr = sc.filter((s) => s <= 6).length;
        setNps({ score: total ? String(Math.round(((prom - detr) / total) * 100)) : '\u2014', total, prom, detr });
      });
  }, [days]);

  const countsItems = (c?: MktCounts) => [
    { label: 'Impress\u00f5es', value: c?.impressions ?? 0 },
    { label: 'Cliques', value: c?.clicks ?? 0 },
    { label: 'CTR', value: c ? ctr(c) : '0,0%' },
    { label: 'Sa\u00eddas', value: c?.closes ?? 0 },
  ];

  // Para um novo modulo/canal, adicione um item aqui.
  const cards: MetricCard[] = [
    { title: 'Banners', tab: 'Banners', items: countsItems(m?.banner) },
    { title: 'Popups', tab: 'Popups', items: countsItems(m?.popup) },
    {
      title: 'E-mails',
      tab: 'E-mail',
      items: [
        { label: 'Enviados', value: em.sent },
        { label: 'Abertos', value: em.opened },
        { label: 'Cliques', value: em.clicked },
        { label: 'Rejeitados', value: em.bounced + em.failed },
      ],
    },
    { title: 'Avisos', tab: 'Avisos', items: countsItems(m?.notice) },
    {
      title: 'WhatsApp',
      tab: 'WhatsApp',
      items: [
        { label: 'Enviadas', value: 0 },
        { label: 'Lidas', value: 0 },
        { label: 'Clicadas', value: 0 },
        { label: 'Respondidas', value: 0 },
      ],
    },
    {
      title: 'Cupons',
      tab: 'Cupom',
      items: [
        { label: 'Ativos', value: cp.active },
        { label: 'Usos', value: cp.uses },
        { label: 'Expirados', value: cp.expired },
        { label: 'Total', value: cp.total },
      ],
    },
    {
      title: 'NPS',
      tab: 'NPS',
      items: [
        { label: 'Nota NPS', value: nps.score },
        { label: 'Respostas', value: nps.total },
        { label: 'Promotores', value: nps.prom },
        { label: 'Detratores', value: nps.detr },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-100">{'M\u00e9tricas'}</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={inputCls + ' !w-auto'}>
          {DAY_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      </div>
      {err && <p className="text-[15px] text-rose-400">{err}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => <MetricCardView key={c.title} card={c} />)}
      </div>
    </div>
  );
}
function DateTimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">{label}</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onChange(new Date().toISOString())} className="text-[13px] font-bold text-amber-400 hover:text-amber-300">Agora</button>
          {value && <button type="button" onClick={() => onChange(null)} className="text-[13px] font-semibold text-slate-500 hover:text-slate-300">Limpar</button>}
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
        <label className="flex items-center gap-2 text-[13px] text-slate-200 cursor-pointer">
          <input type="checkbox" checked={same} onChange={(e) => toggleSame(e.target.checked)} /> Usar as mesmas datas em todas
        </label>
      </div>
      {slides.map((s, idx) => (
        <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-400">Imagem {idx + 1} de {slides.length}</p>
            {slides.length > 1 && (
              <button type="button" onClick={() => remove(idx)} className="text-[13px] font-semibold text-rose-400 hover:text-rose-300">Remover</button>
            )}
          </div>
          <ImageUpload kind="banner" value={s.image_url} onChange={(u) => setImage(idx, u)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateTimeField label="Início da imagem" value={s.starts_at} onChange={(x) => setDates(idx, { starts_at: x })} />
            <DateTimeField label="Fim da imagem" value={s.ends_at} onChange={(x) => setDates(idx, { ends_at: x })} />
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-bold border border-slate-700 text-slate-200 hover:bg-slate-800">
        <Plus className="w-4 h-4" /> Adicionar imagem
      </button>
      <p className="text-[13px] text-slate-500">Cada imagem só aparece no carrossel dentro do período dela e do período geral do banner.</p>
    </div>
  );
}

const NOTICE_PREVIEW: Record<NoticeStyle, string> = {
  info: 'bg-blue-600 text-white',
  warning: 'bg-amber-400 text-slate-900',
  urgent: 'bg-red-600 text-white',
};

function ItemPreview({ draft }: { draft: MktDraft }) {
  const wrap = (child: React.ReactNode, note?: string) => (
    <div className="md:col-span-2 space-y-1">
      <label className={labelCls}>Pré-visualização</label>
      {child}
      {note && <p className="text-[13px] text-slate-500">{note}</p>}
    </div>
  );

  if (draft.kind === 'notice') {
    const txt = draft.body.trim() || 'Sua mensagem aparece aqui.';
    return wrap(
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-white">
        <div className={'flex items-center gap-3 px-4 py-2 text-sm ' + NOTICE_PREVIEW[draft.notice_style ?? 'info']}>
          <p className="min-w-0 flex-1 text-center font-semibold">{txt}</p>
          {draft.cta_url && <span className="shrink-0 rounded-md bg-black/20 px-3 py-1 text-xs font-bold">{draft.cta_label || 'Saiba mais'}</span>}
          <X className="w-4 h-4 shrink-0" />
        </div>
        <div className="flex h-10 items-center border-b border-slate-200 px-4 text-xs font-bold text-slate-400">SLLhub</div>
        <div className="h-10 bg-slate-50" />
      </div>,
      'A barra fica fixa no topo do painel do lojista.'
    );
  }

  if (draft.kind === 'banner') {
    const imgs = (draft.slides ?? []).filter((s) => s.image_url);
    if (imgs.length === 0) return null;
    return wrap(
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-white">
        <img src={imgs[0].image_url} alt="" className="w-full" style={{ aspectRatio: '1200 / 150', objectFit: 'cover' }} />
        <div className="h-10 bg-slate-50" />
      </div>,
      imgs.length > 1 ? 'Mostrando a imagem 1 de ' + imgs.length + ' do carrossel.' : undefined
    );
  }

  if (!draft.image_url) return null;
  return wrap(
    <div className="flex items-center justify-center rounded-lg border border-slate-700 bg-black/60 p-4">
      <img src={draft.image_url} alt="" className="w-full max-w-[360px] rounded-lg" style={{ aspectRatio: '900 / 600', objectFit: 'cover' }} />
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
        <h3 className="text-[15px] font-bold text-slate-100">{draft.id ? 'Editar' : 'Novo'} {KIND_NOUN[draft.kind]}</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-100"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2"><label className={labelCls}>Título (uso interno)</label>
          <input className={inputCls} value={draft.title} onChange={(e) => set('title', e.target.value)} /></div>
        {draft.kind === 'banner' ? (
              <div className="md:col-span-2"><SlidesEditor key={draft.id ?? 'novo'} slides={draft.slides ?? []} onChange={(s) => set('slides', s)} /></div>
            ) : (
              draft.kind === 'notice' ? (
                  <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                    <div><label className={labelCls}>Tipo do aviso</label>
                      <select className={inputCls} value={draft.notice_style ?? 'info'} onChange={(e) => set('notice_style', e.target.value as NoticeStyle)}>
                        {Object.entries(NOTICE_STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select></div>
                    <div><label className={labelCls}>Texto do botão (opcional)</label>
                      <input className={inputCls} value={draft.cta_label} onChange={(e) => set('cta_label', e.target.value)} placeholder="Saiba mais" /></div>
                    <div className="md:col-span-2"><label className={labelCls}>Mensagem do aviso</label>
                      <textarea rows={2} className={inputCls} value={draft.body} onChange={(e) => set('body', e.target.value)} placeholder="Estaremos em manutenção hoje às 23h." /></div>
                  </div>
                ) : (
                  <ImageUpload kind={draft.kind as 'popup'} value={draft.image_url} onChange={(u) => set('image_url', u)} />
                )
            )}
        <ItemPreview draft={draft} />
            <div><label className={labelCls}>{draft.kind === 'notice' ? 'Link do botão (opcional)' : 'Link ao clicar na imagem'}</label>
          <LinkPicker value={draft.cta_url} onChange={(v) => set('cta_url', v)} /></div>
        <div><label className={labelCls}>Local de exibição</label>
          <select className={inputCls} value={draft.location} onChange={(e) => set('location', e.target.value as MktLocation)}>
            {Object.entries(LOCATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className={labelCls}>Público</label>
          <select className={inputCls} value={draft.audience} onChange={(e) => set('audience', e.target.value as MktAudience)}>
            {Object.entries(AUDIENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
            <DateTimeField label="Início" value={draft.starts_at} onChange={(x) => set('starts_at', x)} /><DateTimeField label="Fim" value={draft.ends_at} onChange={(x) => set('ends_at', x)} /></div>
        {draft.audience === 'store' && (
              <StorePicker value={draft.store_id} onChange={(id) => set('store_id', id)} />
            )}
            {draft.kind === 'popup' && (
          <div><label className={labelCls}>Frequência</label>
            <select className={inputCls} value={draft.frequency} onChange={(e) => set('frequency', e.target.value as MktFrequency)}>
              {Object.entries(FREQUENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
        )}
        <label className="flex items-center gap-2 text-[15px] text-slate-200 mt-5">
          <input type="checkbox" checked={draft.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Ativo
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg text-[15px] text-slate-300 hover:bg-slate-800">Cancelar</button>
        <button type="button" disabled={saving || !draft.title.trim()} onClick={onSave}
          className="px-4 py-2 rounded-lg text-[15px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50">
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
        <h2 className="text-base font-bold text-slate-100">{KIND_TITLE[kind]}</h2>
        {!draft && (
          <button type="button" onClick={() => setDraft(newDraft(kind))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[15px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400">
            <Plus className="w-4 h-4" /> Novo {KIND_NOUN[kind]}
          </button>
        )}
      </div>
      {err && <p className="text-[15px] text-rose-400">{err}</p>}
      {draft && <ItemForm draft={draft} onChange={setDraft} onCancel={() => setDraft(null)} onSave={save} saving={saving} />}
      {!draft && <KpiGrid kpis={itemKpis(kind, items)} />}
      {!draft && <MarketingChart kind={kind} />}
      {items.length === 0 && !draft && <p className="text-[15px] text-slate-500">Nenhum item criado.</p>}
      <div className="space-y-2">
        {items.map((i) => {
          const st = statusOf(i);
          return (
            <div key={i.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 flex flex-wrap items-center gap-3">
              {i.kind !== 'notice' && <Thumb url={i.slides?.[0]?.image_url || i.image_url} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-slate-100 truncate">{i.title}</p>
                  <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + st.cls}>{st.label}</span>
                  {i.coupon_code && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{i.coupon_code}</span>}
                </div>
                <p className="text-[13px] text-slate-400">
                  {LOCATION_LABEL[i.location]} · {AUDIENCE_LABEL[i.audience]} · {fmtDate(i.starts_at)} → {fmtDate(i.ends_at)}
                </p>
              </div>
              <div className="text-[13px] text-slate-300 tabular-nums">
                {i.impressions} imp · {i.clicks} cliques · {ctr(i)} · {i.closes} disp.
              </div>
              <div className="flex items-center gap-1">
                <button type="button" title={i.is_active ? 'Pausar' : 'Ativar'} onClick={() => toggle(i)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800">
                  {i.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button type="button" title="Editar" onClick={() => setDraft(editDraft(i))} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800">
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" title="Excluir" onClick={() => remove(i.id)}
                  className={'p-2 rounded-lg ' + (confirmId === i.id ? 'bg-rose-600 text-white text-[13px] font-bold px-3' : 'text-rose-400 hover:bg-slate-800')}>
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

function durationLabel(c: MktCoupon): string {
  if (c.duration_type === 'first_invoice') return '1ª fatura';
  if (c.duration_type === 'months') return c.duration_months + (c.duration_months === 1 ? ' mês' : ' meses');
  return 'para sempre';
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

function CouponPlanPicker({ plans, value, onChange }: {
  plans: CouponPlanOption[]; value: string[]; onChange: (ids: string[]) => void;
}) {
  const [opened, setOpened] = useState<string[]>([]);
  const groups = Array.from(new Map(plans.map((p) => [p.group, p.groupLabel])).entries())
    .map(([key, label]) => ({ key, label, items: plans.filter((p) => p.group === key) }));
  const isOpen = (g: { key: string; items: CouponPlanOption[] }) =>
    opened.includes(g.key) || g.items.some((i) => value.includes(i.id));

  const toggleGroup = (g: { key: string; items: CouponPlanOption[] }) => {
    const ids = g.items.map((i) => i.id);
    if (isOpen(g)) {
      setOpened((o) => o.filter((k) => k !== g.key));
      onChange(value.filter((v) => !ids.includes(v)));
    } else {
      setOpened((o) => [...o, g.key]);
      onChange(Array.from(new Set([...value, ...ids])));
    }
  };

  const openGroups = groups.filter(isOpen);
  const emptyOpen = openGroups.length > 0 && value.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className={labelCls + ' mb-0'}>Onde o cupom vale</label>
        <span className="text-[13px] text-slate-400">
          {value.length === 0 ? 'Todos os planos' : value.length + (value.length === 1 ? ' plano selecionado' : ' planos selecionados')}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setOpened([]); onChange([]); }}
          className={'px-3 py-1.5 rounded-full text-[13px] font-bold border ' + (value.length === 0 && openGroups.length === 0 ? 'bg-amber-500 text-slate-950 border-amber-500' : 'border-slate-700 text-slate-300 hover:bg-slate-800')}>
          Todos os planos
        </button>
        {groups.map((g) => (
          <button key={g.key} type="button" onClick={() => toggleGroup(g)}
            className={'px-3 py-1.5 rounded-full text-[13px] font-bold border ' + (isOpen(g) ? 'bg-amber-500 text-slate-950 border-amber-500' : 'border-slate-700 text-slate-300 hover:bg-slate-800')}>
            {g.label}
          </button>
        ))}
      </div>

      {openGroups.map((g) => {
        const ids = g.items.map((i) => i.id);
        const all = ids.every((id) => value.includes(id));
        return (
          <div key={g.key} className="rounded-lg border border-slate-700 bg-slate-950 p-3 space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-bold text-slate-100">
              <input type="checkbox" checked={all}
                onChange={() => onChange(all ? value.filter((v) => !ids.includes(v)) : Array.from(new Set([...value, ...ids])))} />
              {g.label}: todos os planos
            </label>
            <div className="grid gap-1 pl-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((pl) => {
                const on = value.includes(pl.id);
                return (
                  <label key={pl.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[13px] text-slate-200 hover:bg-slate-800">
                    <input type="checkbox" checked={on}
                      onChange={() => onChange(on ? value.filter((x) => x !== pl.id) : [...value, pl.id])} />
                    <span className="truncate">{pl.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {emptyOpen && <p className="text-[13px] text-amber-400">Marque ao menos um plano. Sem nenhum marcado, o cupom vale para todos.</p>}
    </div>
  );
}

function Cupom() {
  const [items, setItems] = useState<MktCoupon[]>([]);
  const [plans, setPlans] = useState<CouponPlanOption[]>([]);
  const [draft, setDraft] = useState<CouponDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(() => {
    listCouponPlanOptions().then(setPlans).catch(() => {});
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[15px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400">
            <Plus className="w-4 h-4" /> Novo cupom
          </button>
        )}
      </div>

      {err && <p className="text-[15px] text-rose-400">{err}</p>}
      {ok && <p className="text-[15px] text-emerald-400">{ok}</p>}

      {draft && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-slate-100">{draft.id ? 'Editar cupom' : 'Novo cupom'}</h3>
            <button type="button" onClick={() => setDraft(null)} className="text-slate-400 hover:text-slate-100"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><label className={labelCls}>Código</label>
              <input className={inputCls} value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="BLACK10" /></div>
            <div><label className={labelCls}>Tipo de desconto</label>
                  <select className={inputCls} value={draft.discount_type} onChange={(e) => set('discount_type', e.target.value as CouponType)}>
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed_amount">Valor fixo (R$)</option>
                  </select></div>
                <div><label className={labelCls}>{draft.discount_type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
              <input className={inputCls} value={draft.value} onChange={(e) => set('value', e.target.value)} /></div>
            <div><label className={labelCls}>Limite de usos (vazio = ilimitado)</label>
              <input className={inputCls} value={draft.max_uses} onChange={(e) => set('max_uses', e.target.value)} /></div>
            <div className="md:col-span-3 grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Duração do desconto</label>
                    <select className={inputCls} value={draft.duration_type} onChange={(e) => set('duration_type', e.target.value as CouponDuration)}>
                      <option value="first_invoice">Apenas na 1ª fatura</option>
                      <option value="months">Por X meses</option>
                      <option value="forever">Para sempre (recorrente)</option>
                    </select></div>
                  {draft.duration_type === 'months' && (
                    <div><label className={labelCls}>Quantidade de meses</label>
                      <input className={inputCls} value={draft.duration_months} onChange={(e) => set('duration_months', e.target.value.replace(/\D/g, ''))} placeholder="3" /></div>
                  )}
                </div>
                <div className="md:col-span-3 grid grid-cols-2 gap-3">
              <DateTimeField label="Início da validade" value={draft.starts_at} onChange={(x) => set('starts_at', x)} />
              <DateTimeField label="Fim da validade" value={draft.expires_at} onChange={(x) => set('expires_at', x)} />
            </div>
          </div>
          <CouponPlanPicker plans={plans} value={draft.applicable_plan_ids} onChange={(ids) => set('applicable_plan_ids', ids)} />
          <p className="text-[13px] text-slate-500">Sem início, o cupom vale a partir de agora; sem fim, não expira.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="px-3 py-2 rounded-lg text-[15px] text-slate-300 hover:bg-slate-800">Cancelar</button>
            <button type="button" disabled={saving || !draft.code.trim()} onClick={save}
              className="px-4 py-2 rounded-lg text-[15px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {!draft && <KpiGrid kpis={couponKpis(items)} />}
      {!draft && <CouponRanking />}
      {items.length === 0 && !draft && <p className="text-[15px] text-slate-500">Nenhum cupom criado.</p>}

      <div className="space-y-2">
        {items.map((c) => {
          const st = couponStatus(c);
          return (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-bold text-slate-100 tracking-wider">{c.code}</p>
                  <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + st.cls}>{st.label}</span>
                  {c.applicable_plan_ids && c.applicable_plan_ids.length > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                      {c.applicable_plan_ids.length} {c.applicable_plan_ids.length === 1 ? 'plano' : 'planos'}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-slate-400">{fmtDate(c.starts_at)} → {c.expires_at ? fmtDate(c.expires_at) : 'sem fim'}</p>
              </div>
              <div className="text-[13px] text-slate-300 tabular-nums text-right">
                <p><b className="text-amber-300">{couponValue(c)}</b> de desconto · {durationLabel(c)}</p>
                <p>Usado {c.times_used} / {c.max_uses ?? 'ilimitado'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" title={c.is_active ? 'Pausar' : 'Ativar'} onClick={() => toggle(c)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800">
                  {c.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button type="button" title="Editar" onClick={() => { setOk(null); setDraft(couponToDraft(c)); }}
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
  { key: 'aviso', label: 'Avisos', icon: <Megaphone className="w-4 h-4" /> },
  { key: 'email', label: 'E-mail', icon: <Mail className="w-4 h-4" /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
  { key: 'promocao', label: 'Cupom', icon: <Tag className="w-4 h-4" /> },
  { key: 'nps', label: 'NPS', icon: <BarChart3 className="h-4 w-4" /> },
];

export default function MarketingTab() {
  const [tab, setTab] = useState<TabKey>('visao');
  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100"><Megaphone className="w-5 h-5 text-amber-500" /> Marketing</h1>
      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={'flex items-center gap-1.5 px-3 py-2 text-[15px] font-semibold border-b-2 -mb-px ' +
              (tab === t.key ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tab === 'visao' && <Visao />}
      {tab === 'banner' && <ItemsPanel kind="banner" />}
      {tab === 'popup' && <ItemsPanel kind="popup" />}
          {tab === 'aviso' && <ItemsPanel kind="notice" />}
      {tab === 'email' && (<><EmailFunnel /><EmailCampaigns /></>)}
          {false && (
        <ChannelBlock title="E-mail marketing" icon={<Mail className="w-4 h-4" />} labels={['Enviados', 'Abertos', 'Clicados', 'Respondidos']}
          note="Envio de e-mail ainda não conectado. Precisa de um provedor (ex.: Resend, SendGrid) para medir abertura e resposta." />
      )}
      {tab === 'whatsapp' && (
        <ChannelBlock title="WhatsApp marketing" icon={<MessageCircle className="w-4 h-4" />} labels={['Enviadas', 'Lidas', 'Clicadas', 'Respondidas']}
          note="Envio de WhatsApp ainda não conectado. Precisa da API oficial ou de um provedor para medir leitura e resposta." />
      )}
      {tab === 'promocao' && <Cupom />}
      {tab === 'nps' && <NpsPanel />}
    </div>
  );
}