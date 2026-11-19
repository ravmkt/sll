import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { listProducts, CatalogProduct } from '@/services/productsService';
import { getMyStore, saveCampaign, StudioStore } from './studioService';
import { renderArt } from './renderArt';
import {
  brl, promoFromPct, pctFromPromo, FORMATS, FormatKey, VARIABLES, DEFAULT_MESSAGE,
  renderMessage, cleanSite, waLink, fmtDate,
} from './lib';

interface Row { product: CatalogProduct; selected: boolean; pct: number; promo: number }

const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').slice(0, 40);

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

  if (loading) return <div className="p-6">Carregando produtos...</div>;

  const inp = 'border rounded px-2 py-1 bg-background';
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Studio de Artes</h1>
        <p className="text-sm text-muted-foreground">Defina o desconto, edite a mensagem e baixe todas as artes prontas.</p>
      </div>
      {error && <div className="p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

      <section className="grid md:grid-cols-3 gap-3">
        <label className="text-sm">Campanha<input className={`${inp} w-full`} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="text-sm">Subtítulo da arte<input className={`${inp} w-full`} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></label>
        <label className="text-sm">Termina em<input type="date" className={`${inp} w-full`} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></label>
        <label className="text-sm">Formato
          <select className={`${inp} w-full`} value={format} onChange={(e) => setFormat(e.target.value as FormatKey)}>
            {Object.entries(FORMATS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-3 text-sm">
          <label>Fundo 1<input type="color" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)} className="block h-8 w-14" /></label>
          <label>Fundo 2<input type="color" value={bgTo} onChange={(e) => setBgTo(e.target.value)} className="block h-8 w-14" /></label>
          <label>Destaque<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="block h-8 w-14" /></label>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-sm font-medium">Mensagem (editável)</div>
        <textarea className={`${inp} w-full h-40 font-mono text-sm`} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {VARIABLES.map((v) => (
            <button key={v} type="button" className="text-xs px-2 py-1 border rounded hover:bg-muted"
              onClick={() => setMessage((m) => `${m}{{${v}}}`)}>{`{{${v}}}`}</button>
          ))}
          <button type="button" className="text-xs px-2 py-1 border rounded" onClick={() => setMessage(DEFAULT_MESSAGE)}>Restaurar modelo</button>
        </div>
        {selected[0] && (
          <pre className="text-xs p-3 bg-muted rounded whitespace-pre-wrap">{renderMessage(message, vars(selected[0]))}</pre>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inp} w-64`} placeholder="Buscar produto ou SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="text-sm">Aplicar</span>
          <input type="number" min={0} max={90} className={`${inp} w-20`} value={globalPct} onChange={(e) => setGlobalPct(Number(e.target.value))} />
          <span className="text-sm">% nos selecionados</span>
          <button className="px-3 py-1 border rounded" onClick={applyGlobal} disabled={!selected.length}>Aplicar</button>
          <span className="text-sm ml-auto">{selected.length} selecionado(s) de {rows.length}</span>
        </div>
        <div className="overflow-auto max-h-[480px] border rounded">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-2 w-8"><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th className="p-2 text-left">Produto</th>
                <th className="p-2 text-right">Preço</th>
                <th className="p-2 text-right">Desconto %</th>
                <th className="p-2 text-right">Preço promo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.product.id} className="border-t">
                  <td className="p-2"><input type="checkbox" checked={r.selected} onChange={(e) => patch(r.product.id, { selected: e.target.checked })} /></td>
                  <td className="p-2 flex items-center gap-2">
                    <img src={r.product.image_url as string} alt="" className="h-10 w-10 object-contain" loading="lazy" />
                    <span className="line-clamp-2">{r.product.name}</span>
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">{brl(r.product.price as number)}</td>
                  <td className="p-2 text-right">
                    <input type="number" min={0} max={95} step="0.5" className={`${inp} w-20 text-right`} value={r.pct} onChange={(e) => setPct(r, Number(e.target.value))} />
                  </td>
                  <td className="p-2 text-right">
                    <input type="number" min={0} step="0.01" className={`${inp} w-28 text-right`} value={r.promo} onChange={(e) => setPromo(r, Number(e.target.value))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-wrap items-start gap-4">
        <div className="space-x-2">
          <button className="px-4 py-2 border rounded" disabled={!selected.length || busy} onClick={doPreview}>Prévia</button>
          <button className="px-4 py-2 bg-black text-white rounded disabled:opacity-50" disabled={!selected.length || busy} onClick={generate}>
            Gerar {selected.length} artes (ZIP)
          </button>
          <span className="text-sm">{progress}</span>
        </div>
        {preview && <img src={preview} alt="Prévia" className="max-h-96 rounded border" />}
      </section>
    </div>
  );
}
