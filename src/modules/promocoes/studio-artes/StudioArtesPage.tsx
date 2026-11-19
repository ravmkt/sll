import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { AlertCircle, Download, Eye, Loader2, Search } from 'lucide-react';
import { listProducts, CatalogProduct } from '@/services/productsService';
import { getMyStore, saveCampaign, StudioStore } from './studioService';
import { renderArt } from './renderArt';
import {
  brl, promoFromPct, pctFromPromo, FORMATS, FormatKey, VARIABLES, DEFAULT_MESSAGE,
  renderMessage, cleanSite, waLink, fmtDate,
} from './lib';

interface Row { product: CatalogProduct; selected: boolean; pct: number; promo: number }

const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').slice(0, 40);

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const LABEL = 'block text-xs font-semibold text-slate-600';
const INP = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0094eb] focus:ring-2 focus:ring-[#0094eb]/20';
const NUM = 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right text-sm text-slate-800 outline-none transition focus:border-[#0094eb] focus:ring-2 focus:ring-[#0094eb]/20';
const COLOR = 'mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1';
const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#0094eb]/20 transition hover:bg-[#007bc4] disabled:cursor-not-allowed disabled:opacity-50';
const BTN_SECONDARY = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';

export default function StudioArtesPage() {
  const [store, setStore] = useState<StudioStore | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [globalPct, setGlobalPct] = useState(14);
  const [name, setName] = useState('BLACK WEEK');
  const [subtitle, setSubtitle] = useState('A maior promoção do ano já começou!');
  const [endsAt, setEndsAt] = useState('');
  const [format, setFormat] = useState<FormatKey>('feed');
  const [bgFrom, setBgFrom] = useState('#1a1a1a');
  const [bgTo, setBgTo] = useState('#3b2418');
  const [accent, setAccent] = useState('#c0392b');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const st = await getMyStore();
        if (!st) throw new Error('Loja não encontrada para o usuário logado.');
        setStore(st);
        const list = await listProducts(st.id);
        setRows(
          list
            .filter((p) => p.active !== false && (p.price ?? 0) > 0 && !!p.image_url)
            .map((p) => ({ product: p, selected: false, pct: 0, promo: p.price as number })),
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const l = q ? rows.filter((r) => r.product.name.toLowerCase().includes(q) || (r.product.sku || '').toLowerCase().includes(q)) : rows;
    return l.slice(0, 300);
  }, [rows, search]);

  const selected = rows.filter((r) => r.selected);
  const allFilteredSelected = filtered.length > 0 && filtered.every((f) => rows.find((r) => r.product.id === f.product.id)?.selected);
  const patch = (id: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.product.id === id ? { ...r, ...p } : r)));

  const setPct = (r: Row, pct: number) =>
    patch(r.product.id, { pct, promo: promoFromPct(r.product.price as number, pct) });
  const setPromo = (r: Row, promo: number) =>
    patch(r.product.id, { promo, pct: Math.max(0, pctFromPromo(r.product.price as number, promo)) });

  const applyGlobal = () =>
    setRows((rs) => rs.map((r) => (r.selected ? { ...r, pct: globalPct, promo: promoFromPct(r.product.price as number, globalPct) } : r)));

  const toggleAll = (v: boolean) =>
    setRows((rs) => rs.map((r) => (filtered.some((f) => f.product.id === r.product.id) ? { ...r, selected: v } : r)));

  const style = () => ({
    title: name, subtitle, site: cleanSite(store?.store_url || store?.url),
    bgFrom, bgTo, accent, w: FORMATS[format].w, h: FORMATS[format].h,
  });

  const vars = (r: Row) => ({
    produto: r.product.name,
    preco_de: brl(r.product.price as number),
    preco_por: brl(r.promo),
    desconto: `${Math.round(r.pct)}%`,
    campanha: name,
    data_fim: fmtDate(endsAt),
    site: cleanSite(store?.store_url || store?.url),
    whatsapp: waLink(store?.store_whatsapp || store?.whatsapp),
    link_produto: r.product.product_url || '',
  });

  const art = (r: Row) =>
    renderArt({ name: r.product.name, image_url: r.product.image_url as string, original: r.product.price as number, promo: r.promo, pct: r.pct }, style());

  const doPreview = async () => {
    if (!selected.length) return;
    setError('');
    try {
      const blob = await art(selected[0]);
      setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
    } catch (e) { setError((e as Error).message); }
  };

  const generate = async () => {
    if (!store || !selected.length) return;
    setBusy(true);
    setError('');
    try {
      const zip = new JSZip();
      let captions = '';
      for (let i = 0; i < selected.length; i++) {
        const r = selected[i];
        setProgress(`Gerando ${i + 1}/${selected.length}...`);
        const file = `${String(i + 1).padStart(3, '0')}-${slug(r.product.name)}`;
        try {
          zip.file(`${file}.png`, await art(r));
          captions += `=== ${file} ===\n${renderMessage(message, vars(r))}\n\n`;
        } catch (e) {
          captions += `=== ERRO: ${r.product.name} (${(e as Error).message}) ===\n\n`;
        }
      }
      zip.file('legendas.txt', captions);
      setProgress('Salvando campanha...');
      await saveCampaign(
        store.id,
        { name, ends_at: endsAt || null, format, message_template: message, style: { bgFrom, bgTo, accent, subtitle } },
        selected.map((r) => ({
          product_id: r.product.id, original_price: r.product.price as number,
          discount_pct: r.pct, promo_price: r.promo,
        })),
      );
      const out = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(out);
      a.download = `artes-${slug(name)}.zip`;
      a.click();
      setProgress(`Pronto! ${selected.length} artes no ZIP.`);
    } catch (e) {
      setError((e as Error).message);
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={`${CARD} flex items-center justify-center gap-3 py-16 text-sm text-slate-500`}>
        <Loader2 size={20} className="animate-spin text-[#0094eb]" /> Carregando produtos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      <section className={CARD}>
        <h2 className="mb-4 text-sm font-bold text-slate-800">Campanha</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className={LABEL}>Nome da campanha
            <input className={INP} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className={LABEL}>Subtítulo da arte
            <input className={INP} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
          <label className={LABEL}>Termina em
            <input type="date" className={INP} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
        </div>
      </section>

      <section className={CARD}>
        <h2 className="mb-4 text-sm font-bold text-slate-800">Estilo da arte</h2>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className={LABEL}>Formato
            <select className={INP} value={format} onChange={(e) => setFormat(e.target.value as FormatKey)}>
              {Object.entries(FORMATS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
          <label className={LABEL}>Fundo 1
            <input type="color" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)} className={COLOR} />
          </label>
          <label className={LABEL}>Fundo 2
            <input type="color" value={bgTo} onChange={(e) => setBgTo(e.target.value)} className={COLOR} />
          </label>
          <label className={LABEL}>Destaque
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className={COLOR} />
          </label>
        </div>
      </section>

      <section className={CARD}>
        <h2 className="mb-1 text-sm font-bold text-slate-800">Mensagem</h2>
        <p className="mb-3 text-xs text-slate-500">Texto que acompanha cada arte. Clique em um campo para inseri-lo no fim da mensagem.</p>
        <textarea
          className={`${INP} mt-0 h-40 font-mono`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 transition hover:border-[#0094eb] hover:text-[#0094eb]"
              onClick={() => setMessage((m) => `${m}{{${v}}}`)}
            >{`{{${v}}}`}</button>
          ))}
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={() => setMessage(DEFAULT_MESSAGE)}
          >Restaurar modelo</button>
        </div>
        {selected[0] && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-slate-500">Prévia da mensagem</p>
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{renderMessage(message, vars(selected[0]))}</pre>
          </div>
        )}
      </section>

      <section className={CARD}>
        <h2 className="mb-4 text-sm font-bold text-slate-800">Produtos</h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#0094eb] focus:ring-2 focus:ring-[#0094eb]/20"
              placeholder="Buscar produto ou SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="ml-2 text-sm text-slate-600">Aplicar</span>
          <input type="number" min={0} max={90} className={`${NUM} w-20`} value={globalPct} onChange={(e) => setGlobalPct(Number(e.target.value))} />
          <span className="text-sm text-slate-600">% nos selecionados</span>
          <button className={BTN_SECONDARY} onClick={applyGlobal} disabled={!selected.length}>Aplicar</button>
          <span className="ml-auto rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#0094eb]">
            {selected.length} selecionado(s) de {rows.length}
          </span>
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
                  <td className="p-3 text-right">
                    <input type="number" min={0} max={95} step="0.5" className={`${NUM} w-20`} value={r.pct} onChange={(e) => setPct(r, Number(e.target.value))} />
                  </td>
                  <td className="p-3 text-right">
                    <input type="number" min={0} step="0.01" className={`${NUM} w-28`} value={r.promo} onChange={(e) => setPromo(r, Number(e.target.value))} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Nenhum produto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CARD}>
        <div className="flex flex-wrap items-center gap-3">
          <button className={BTN_SECONDARY} disabled={!selected.length || busy} onClick={doPreview}>
            <Eye size={16} /> Prévia
          </button>
          <button className={BTN_PRIMARY} disabled={!selected.length || busy} onClick={generate}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Gerar {selected.length} artes (ZIP)
          </button>
          {progress && <span className="text-sm text-slate-600">{progress}</span>}
        </div>
        {preview && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-slate-500">Prévia da arte</p>
            <img src={preview} alt="Prévia" className="max-h-96 rounded-xl border border-slate-200" />
          </div>
        )}
      </section>
    </div>
  );
}