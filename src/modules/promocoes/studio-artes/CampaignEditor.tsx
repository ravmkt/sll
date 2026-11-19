import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, Check, ChevronLeft, ChevronRight, Download, Loader2, Search } from 'lucide-react';
import type { CatalogProduct } from '@/services/productsService';
import { CampaignRow, StudioStore, getCampaignItems, patchCampaignStyle, saveCampaign, updateCampaign } from './studioService';
import { renderArt } from './renderArt';
import { prefetchCutout } from './cutout';
import { templateByKey, styleForChannel } from './templates';
import TemplatePicker, { TemplateThumb, tplMeta } from './TemplatePicker';
import {
  brl, promoFromPct, pctFromPromo, CHANNELS, CHANNEL_GROUPS, channelByKey, FormatKey, VARIABLES,
  DEFAULT_MESSAGE, renderMessage, cleanSite, waLink, fmtDate,
} from './lib';
import { CARD, LABEL, INP, NUM, COLOR, BTN_PRIMARY, BTN_SECONDARY } from './ui';
import ChannelPreviews, { type PreviewItem } from './ChannelPreviews';
import CaptionVariants from './CaptionVariants';
import { captionFor, type CaptionOverrides } from './captionHelpers';
import { DEF_ADJ, adjKey, type PhotoAdj, type PhotoAdjustMap } from './photoAdjust';

interface Row { product: CatalogProduct; selected: boolean; pct: number; promo: number }
interface Props {
  store: StudioStore;
  products: CatalogProduct[];
  mode: 'new' | 'edit' | 'reuse';
  campaign?: CampaignRow;
  onBack: () => void;
}

const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').slice(0, 40);

export default function CampaignEditor({ store, products, mode, campaign, onBack }: Props) {
  const st = (campaign?.style ?? {}) as Record<string, string>;
  const tpl0 = templateByKey(campaign?.template_key ?? 'classico');

  const [rows, setRows] = useState<Row[]>(() =>
    products
      .filter((p) => p.active !== false && (p.price ?? 0) > 0 && !!p.image_url)
      .map((p) => ({ product: p, selected: false, pct: 0, promo: p.price as number })),
  );
  const [search, setSearch] = useState('');
  const [globalPct, setGlobalPct] = useState(14);
  const [name, setName] = useState(mode === 'reuse' && campaign ? `${campaign.name} (cópia)` : campaign?.name ?? 'BLACK WEEK');
  const [endsAt, setEndsAt] = useState(campaign?.ends_at ? campaign.ends_at.slice(0, 10) : '');
  const [template, setTemplate] = useState(tpl0.key);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subtitle, setSubtitle] = useState(st.subtitle ?? tpl0.subtitle);
  const [kicker, setKicker] = useState(st.kicker ?? tpl0.kicker);
  const [cta, setCta] = useState(st.cta ?? 'COMPRE AGORA');
  const [bgFrom, setBgFrom] = useState(st.bgFrom ?? tpl0.bgFrom);
  const [bgTo, setBgTo] = useState(st.bgTo ?? tpl0.bgTo);
  const [accent, setAccent] = useState(st.accent ?? tpl0.accent);
  const [channels, setChannels] = useState<string[]>(campaign?.channels?.length ? campaign.channels : ['instagram_feed']);
  const [captionOv, setCaptionOv] = useState<CaptionOverrides>(((campaign?.style ?? {}) as Record<string, any>).captions ?? {});
const draftKey = `sll_studio_adjust_${store.id}_${mode}_${campaign?.id ?? 'new'}`;
  const [adjust, setAdjust] = useState<PhotoAdjustMap>(() => {
    const saved = (((campaign?.style ?? {}) as Record<string, any>).photoAdjust ?? {}) as PhotoAdjustMap;
    try {
      const d = localStorage.getItem(draftKey);
      if (d) return { ...saved, ...(JSON.parse(d) as PhotoAdjustMap) };
    } catch { /* ignora */ }
    return saved;
  });
  const [pvIdx, setPvIdx] = useState(0);
  const [pvChannel, setPvChannel] = useState('');
  const [saveState, setSaveState] = useState<'' | 'saving' | 'saved'>('');
  const getAdj = (pid: string, ch: string): PhotoAdj => adjust[adjKey(pid, ch)] ?? DEF_ADJ;
  const setAdj = (pid: string, ch: string, p: Partial<PhotoAdj>) =>
    setAdjust((m) => ({ ...m, [adjKey(pid, ch)]: { ...(m[adjKey(pid, ch)] ?? DEF_ADJ), ...p } }));

  const adjMounted = useRef(false);
  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify(adjust)); } catch { /* ignora */ }
    if (!adjMounted.current) { adjMounted.current = true; return; }
    if (mode !== 'edit' || !campaign) { setSaveState('saved'); return; }
    setSaveState('saving');
    const t = setTimeout(() => {
      patchCampaignStyle(campaign.id, { photoAdjust: adjust })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState(''));
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjust]);
  const [message, setMessage] = useState(campaign?.message_template || DEFAULT_MESSAGE);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const insertVar = (v: string) => {
    const tag = `{{${v}}}`;
    const el = msgRef.current;
    if (!el) { setMessage((m) => m + tag); return; }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? start;
    setMessage(message.slice(0, start) + tag + message.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tag.length;
      el.setSelectionRange(pos, pos);
    });
  };
  const [images, setImages] = useState<Record<string, string>>({});
  const [previewing, setPreviewing] = useState(false);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const site = cleanSite(store.store_url || store.url);

  // carrega itens da campanha ao editar/reaproveitar
  useEffect(() => {
    if (!campaign) return;
    getCampaignItems(campaign.id)
      .then((items) => {
        const m = new Map(items.map((i) => [i.product_id, i]));
        setRows((rs) => rs.map((r) => {
          const it = m.get(r.product.id);
          return it ? { ...r, selected: true, pct: Number(it.discount_pct), promo: Number(it.promo_price) } : r;
        }));
      })
      .catch((e) => setError((e as Error).message));
  }, [campaign]);

  const pickTemplate = (k: string) => {
    const t = templateByKey(k);
    setTemplate(t.key);
    setBgFrom(t.bgFrom); setBgTo(t.bgTo); setAccent(t.accent);
    setKicker(t.kicker); setSubtitle(t.subtitle);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const l = q ? rows.filter((r) => r.product.name.toLowerCase().includes(q) || (r.product.sku || '').toLowerCase().includes(q)) : rows;
    return l.slice(0, 300);
  }, [rows, search]);

  const selected = rows.filter((r) => r.selected);
  const tplCur = templateByKey(template);
  const meta = tplMeta(tplCur);
  const usesCutout = template === 'blackfriday' || meta.cutout;
  const isImageBg = meta.bgType === 'image';
  useEffect(() => {
    if (!usesCutout) return;
    selected.slice(0, 2).forEach((r) => prefetchCutout(r.product.image_url as string));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.map((r) => r.product.id).slice(0, 2).join(','), template]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((f) => rows.find((r) => r.product.id === f.product.id)?.selected);
  const patch = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.product.id === id ? { ...r, ...p } : r)));
  const setPct = (r: Row, pct: number) => patch(r.product.id, { pct, promo: promoFromPct(r.product.price as number, pct) });
  const setPromo = (r: Row, promo: number) => patch(r.product.id, { promo, pct: Math.max(0, pctFromPromo(r.product.price as number, promo)) });
  const applyGlobal = () => setRows((rs) => rs.map((r) => (r.selected ? { ...r, pct: globalPct, promo: promoFromPct(r.product.price as number, globalPct) } : r)));
  const toggleAll = (v: boolean) => setRows((rs) => rs.map((r) => (filtered.some((f) => f.product.id === r.product.id) ? { ...r, selected: v } : r)));
  const toggleChannel = (k: string) => setChannels((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  const art = (r: Row, channelKey: string) =>
    renderArt(
      { name: r.product.name, image_url: r.product.image_url as string, original: r.product.price as number, promo: r.promo, pct: r.pct },
      styleForChannel({ title: name, subtitle, site, bgFrom, bgTo, accent, template, kicker, cta, photoScale: getAdj(r.product.id, channelKey).s, photoOffsetX: getAdj(r.product.id, channelKey).x, photoOffsetY: getAdj(r.product.id, channelKey).y }, channelKey),
    );

  const vars = (r: Row) => ({
    produto: r.product.name,
    preco_de: brl(r.product.price as number),
    preco_por: brl(r.promo),
    desconto: `${Math.round(r.pct)}%`,
    campanha: name,
    data_fim: fmtDate(endsAt),
    site,
    whatsapp: waLink(store.store_whatsapp || store.whatsapp),
    link_produto: r.product.product_url || '',
  });

  // preview ao vivo (debounce) - produto e canal ativos
  const pvCount = selected.length;
  const pvPos = Math.min(pvIdx, Math.max(pvCount - 1, 0));
  const pvRow = selected[pvPos];
  const activeCh = channels.includes(pvChannel) ? pvChannel : channels[0];
  const pvAdj = pvRow && activeCh ? getAdj(pvRow.product.id, activeCh) : DEF_ADJ;
  const pvKey = JSON.stringify([pvRow?.product.id, pvRow?.pct, pvRow?.promo, name, subtitle, kicker, cta, bgFrom, bgTo, accent, template, activeCh, site, pvAdj]);

  useEffect(() => {
    if (!pvRow || !activeCh) { setImages({}); setPreviewing(false); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const url = URL.createObjectURL(await art(pvRow, activeCh));
        if (cancelled) { URL.revokeObjectURL(url); return; }
        setImages((old) => { Object.values(old).forEach((u) => URL.revokeObjectURL(u)); return { [activeCh]: url }; });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pvKey]);

  const previewItems: PreviewItem[] = pvRow && activeCh && images[activeCh]
    ? [{ channelKey: activeCh, imageUrl: images[activeCh], caption: renderMessage(captionFor(activeCh, message, captionOv), vars(pvRow)) }]
    : [];

  const generate = async () => {
    if (!selected.length || !channels.length) return;
    setBusy(true);
    setError('');
    try {
      const zip = new JSZip();
      let captions = '';
      const total = selected.length * channels.length;
      let n = 0;
      for (let i = 0; i < selected.length; i++) {
        const r = selected[i];
        const file = `${String(i + 1).padStart(3, '0')}-${slug(r.product.name)}`;
        for (const ch of channels) {
          n++;
          setProgress(`Gerando ${n}/${total}...`);
          try {
            zip.file(`${ch}/${file}.png`, await art(r, ch));
                zip.file(`${ch}/${file}.txt`, renderMessage(captionFor(ch, message, captionOv), vars(r)));
          } catch (e) {
            captions += `=== ERRO: ${r.product.name} em ${ch} (${(e as Error).message}) ===\n\n`;
          }
        }
        captions += `=== ${file} ===\n${renderMessage(message, vars(r))}\n\n`;
      }
      zip.file('legendas.txt', captions);

      setProgress('Salvando campanha...');
      const payload = {
        name,
        ends_at: endsAt || null,
        format: 'feed' as FormatKey,
        message_template: message,
        style: { bgFrom, bgTo, accent, subtitle, kicker, cta, photoAdjust: adjust, captions: captionOv },
        channels,
        template_key: template,
        art_mode: 'template',
        ...(mode === 'reuse' && campaign ? { source_campaign_id: campaign.id } : {}),
      };
      const items = selected.map((r) => ({
        product_id: r.product.id, original_price: r.product.price as number,
        discount_pct: r.pct, promo_price: r.promo,
      }));
      if (mode === 'edit' && campaign) await updateCampaign(campaign.id, store.id, payload, items);
      else await saveCampaign(store.id, payload, items);

      const out = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(out);
      a.download = `artes-${slug(name)}.zip`;
      a.click();
      try { localStorage.removeItem(draftKey); } catch { /* ignora */ }
          toast.success(`${total} artes geradas e campanha salva`);
      onBack();
    } catch (e) {
      setError((e as Error).message);
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'edit' ? 'Editar campanha' : mode === 'reuse' ? 'Reaproveitar campanha' : 'Nova arte';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button className={BTN_SECONDARY} onClick={onBack} disabled={busy}><ArrowLeft size={16} /> Voltar</button>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <div className="min-w-0 space-y-6">
          <section className={CARD}>
            <h3 className="mb-4 text-sm font-bold text-slate-800">Campanha</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <label className={LABEL}>Nome da campanha
                <input className={INP} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className={LABEL}>Subtítulo / chamada
                <input className={INP} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </label>
              <label className={LABEL}>Termina em
                <input type="date" className={INP} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </label>
            </div>
          </section>

          <section className={CARD}>
            <h3 className="mb-4 text-sm font-bold text-slate-800">Template e cores</h3>
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-3">
                  <TemplateThumb t={tplCur} className="h-28 w-[88px] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{tplCur.label}</p>
                    <p className="text-xs text-slate-500">{tplCur.description}</p>
                  </div>
                  <button type="button" className={BTN_SECONDARY} onClick={() => setPickerOpen(true)}>Trocar template</button>
                </div>
                {pickerOpen && (
                  <TemplatePicker
                    current={template}
                    onPick={(k) => { pickTemplate(k); setPickerOpen(false); }}
                    onClose={() => setPickerOpen(false)}
                  />
                )}
            <div className="mt-4 grid gap-4 md:grid-cols-5">
              {!isImageBg && (
                    <>
                      <label className={LABEL}>Fundo 1<input type="color" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)} className={COLOR} /></label>
              <label className={LABEL}>Fundo 2<input type="color" value={bgTo} onChange={(e) => setBgTo(e.target.value)} className={COLOR} /></label>
                    </>
                  )}
              <label className={LABEL}>Destaque<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className={COLOR} /></label>
              {template !== 'classico' && (
                    <>
                  <label className={LABEL}>Texto superior<input className={INP} value={kicker} onChange={(e) => setKicker(e.target.value)} /></label>
                  <label className={LABEL}>Botão<input className={INP} value={cta} onChange={(e) => setCta(e.target.value)} /></label>
                </>
              )}
            </div>
          </section>

              <section className={CARD}>
            <h3 className="mb-1 text-sm font-bold text-slate-800">Canais</h3>
            <p className="mb-3 text-xs text-slate-500">Cada produto gera uma arte no tamanho de cada canal marcado (uma pasta por canal no ZIP).</p>
            <div className="grid gap-4 md:grid-cols-2">
              {CHANNEL_GROUPS.map((g) => (
                <div key={g}>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{g}</p>
                  {CHANNELS.filter((c) => c.group === g).map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-slate-700">
                      <input type="checkbox" className="h-4 w-4 accent-[#0094eb]" checked={channels.includes(c.key)} onChange={() => toggleChannel(c.key)} />
                      {c.label} <span className="text-xs text-slate-400">{c.w}x{c.h}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className={CARD}>
            <h3 className="mb-1 text-sm font-bold text-slate-800">Mensagem</h3>
            <p className="mb-3 text-xs text-slate-500">Clique em um campo para inseri-lo na posicao do cursor.</p>
            <textarea ref={msgRef} className={`${INP} mt-0 h-36 font-mono`} value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button key={v} type="button" className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 transition hover:border-[#0094eb] hover:text-[#0094eb]" onMouseDown={(e) => e.preventDefault()} onClick={() => insertVar(v)}>{`{{${v}}}`}</button>
              ))}
              <button type="button" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100" onClick={() => setMessage(DEFAULT_MESSAGE)}>Restaurar modelo</button>
            </div>
            {selected[0] && <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{renderMessage(message, vars(selected[0]))}</pre>}
                <CaptionVariants base={message} channels={channels} overrides={captionOv} onChange={setCaptionOv} />
          </section>

          <section className={CARD}>
            <h3 className="mb-4 text-sm font-bold text-slate-800">Produtos</h3>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#0094eb] focus:ring-2 focus:ring-[#0094eb]/20" placeholder="Buscar produto ou SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <span className="ml-2 text-sm text-slate-600">Aplicar</span>
              <input type="number" min={0} max={90} className={`${NUM} w-20`} value={globalPct} onChange={(e) => setGlobalPct(Number(e.target.value))} />
              <span className="text-sm text-slate-600">% nos selecionados</span>
              <button className={BTN_SECONDARY} onClick={applyGlobal} disabled={!selected.length}>Aplicar</button>
              <span className="ml-auto rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#0094eb]">{selected.length} selecionado(s) de {rows.length}</span>
            </div>
            <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-10 p-3"><input type="checkbox" checked={allFilteredSelected} onChange={(e) => toggleAll(e.target.checked)} className="h-4 w-4 accent-[#0094eb]" /></th>
                    <th className="p-3 text-left font-semibold">Produto</th>
                    <th className="p-3 text-right font-semibold">Preço</th>
                    <th className="p-3 text-right font-semibold">Desconto %</th>
                    <th className="p-3 text-right font-semibold">Preço promo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.product.id} className={`border-t border-slate-100 transition ${r.selected ? 'bg-sky-50/60' : 'hover:bg-slate-50'}`}>
                      <td className="p-3"><input type="checkbox" checked={r.selected} onChange={(e) => patch(r.product.id, { selected: e.target.checked })} className="h-4 w-4 accent-[#0094eb]" /></td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img src={r.product.image_url as string} alt="" className="h-10 w-10 shrink-0 rounded-md bg-slate-100 object-contain" loading="lazy" />
                          <span className="line-clamp-2 text-slate-800">{r.product.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right text-slate-600">{brl(r.product.price as number)}</td>
                      <td className="p-3 text-right"><input type="number" min={0} max={95} step="0.5" className={`${NUM} w-20`} value={r.pct} onChange={(e) => setPct(r, Number(e.target.value))} /></td>
                      <td className="p-3 text-right"><input type="number" min={0} step="0.01" className={`${NUM} w-28`} value={r.promo} onChange={(e) => setPromo(r, Number(e.target.value))} /></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Nenhum produto encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <section className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800">Prévia</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {saveState === 'saving' && (<><Loader2 size={12} className="animate-spin" /> Salvando...</>)}
              {saveState === 'saved' && (<span className="flex items-center gap-1 text-emerald-600"><Check size={12} /> Ajustes salvos</span>)}
              {previewing && <Loader2 size={16} className="animate-spin text-[#0094eb]" />}
            </div>
          </div>
          {!pvRow || !activeCh ? (
            <p className="rounded-xl bg-slate-100 p-6 text-center text-xs text-slate-500">Selecione um produto e um canal para ver a arte.</p>
          ) : (
            <>
              {channels.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {channels.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPvChannel(k)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${k === activeCh ? 'border-[#0094eb] bg-sky-50 text-[#0094eb]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {channelByKey(k)?.label ?? k}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-3 flex items-center gap-2">
                <button type="button" className={BTN_SECONDARY} disabled={pvPos === 0} onClick={() => setPvIdx(pvPos - 1)} aria-label="Produto anterior"><ChevronLeft size={16} /></button>
                <p className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-slate-600">{pvPos + 1}/{pvCount} · {pvRow.product.name}</p>
                <button type="button" className={BTN_SECONDARY} disabled={pvPos >= pvCount - 1} onClick={() => setPvIdx(pvPos + 1)} aria-label="Próximo produto"><ChevronRight size={16} /></button>
              </div>

              <div className="[&>div]:!grid-cols-1">
                <ChannelPreviews items={previewItems} />
              </div>

              {usesCutout && (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">Foto deste produto neste canal</p>
                    <button type="button" className={BTN_SECONDARY} onClick={() => setAdj(pvRow.product.id, activeCh, { s: 1, x: 0, y: 0 })}>Restaurar</button>
                  </div>
                  <label className={LABEL}>Tamanho ({Math.round(pvAdj.s * 100)}%)
                    <input type="range" min={0.6} max={1.5} step={0.05} value={pvAdj.s} onChange={(e) => setAdj(pvRow.product.id, activeCh, { s: Number(e.target.value) })} className="mt-2 w-full accent-[#0094eb]" />
                  </label>
                  <label className={LABEL}>Horizontal
                    <input type="range" min={-0.3} max={0.3} step={0.01} value={pvAdj.x} onChange={(e) => setAdj(pvRow.product.id, activeCh, { x: Number(e.target.value) })} className="mt-2 w-full accent-[#0094eb]" />
                  </label>
                  <label className={LABEL}>Vertical
                    <input type="range" min={-0.3} max={0.3} step={0.01} value={pvAdj.y} onChange={(e) => setAdj(pvRow.product.id, activeCh, { y: Number(e.target.value) })} className="mt-2 w-full accent-[#0094eb]" />
                  </label>
                </div>
              )}
            </>
          )}
        </section>

          <section className={CARD}>
            <button className={`${BTN_PRIMARY} w-full justify-center`} disabled={!selected.length || !channels.length || busy} onClick={generate}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Gerar {selected.length * channels.length} artes (ZIP)
            </button>
            <p className="mt-2 text-xs text-slate-500">{selected.length} produto(s) x {channels.length} canal(is). {mode === 'edit' ? 'A campanha será atualizada.' : 'A campanha será salva.'}</p>
            {progress && <p className="mt-2 text-sm text-slate-600">{progress}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}