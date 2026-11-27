import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Loader2, Minus, Package, Plus, Trash2, UserPlus, Wifi, WifiOff, X } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { cn } from '@/lib/utils';
import { SllPageHeader } from '@/components/sll/SllPageHeader';
import { SllField, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { listProducts } from '@/services/productsService';
import type { CatalogProduct } from '@/services/productsService';
import { hasRealVariants, listVariantsByProduct, variantLabel } from '@/components/products/variantsData';
import type { VariantRow } from '@/components/products/variantsData';
import { showError, showSuccess } from '@/utils/toast';
import { brl } from '../services/clientes';
import { METHOD_LABEL, getFinConfig } from '../services/financeiro';
import type { FinConfig, FinMethodKey } from '../services/financeiro';
import { createPdvSale, newSaleKey } from '../services/pdv';
import { isContingency, usePdvNet } from '../services/pdvNet';
import { cashCurrent } from '@/modules/pdv/services/caixa';
import { cacheKeys, countQueue, loadCache, saveCache } from '../services/pdvOffline';
import { companyBriefCached, finCached, loadSnapshot, saveSnapshot } from '../services/pdvCache';
import {
  buildReceiptHtml, installmentOptions, loadStockByWarehouse, norm, parseMoney, quickCustomer,
  r2, searchCustomers,
} from '../services/pdvVenda';
import type { CustomerHit, Receipt, StockMap } from '../services/pdvVenda';
import type { SaleOrigin } from '../services/canaisVenda';
import PdvChannelPicker from '../components/PdvChannelPicker';
import { useGestorAccess } from '../hooks/useGestorAccess';

type Line = { variantId: string; name: string; sku: string; price: number; qty: number };

const PAGE = 40;

type DoneInfo = { queued: boolean; provisional: string | null };

function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

const qtyBtn =
  'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-[color:var(--sll-b-brand)] hover:text-[color:var(--sll-b-brand)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300';

export default function PdvPage() {
  const { can } = useGestorAccess();
  const { storeId, loading: lojaLoading } = useLoja();
  const net = usePdvNet();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [variants, setVariants] = useState<Map<string, VariantRow[]>>(new Map());
  const [stock, setStock] = useState<StockMap>(new Map());
  const [loading, setLoading] = useState(true);

  const [channel, setChannel] = useState('');
  const [warehouse, setWarehouse] = useState<string | null>(null);
  const [origin, setOrigin] = useState<SaleOrigin>('balcao');
  const [fin, setFin] = useState<FinConfig | null>(null);
  const [source, setSource] = useState<'online' | 'cache'>('online');
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [flat, setFlat] = useState<Record<string, number> | null>(null);

  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);

  const [cart, setCart] = useState<Line[]>([]);
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [custTerm, setCustTerm] = useState('');
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [newCust, setNewCust] = useState<{ name: string; phone: string; document: string } | null>(null);
  const [custBusy, setCustBusy] = useState(false);

  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState('');
  const [shipping, setShipping] = useState('');
  const [method, setMethod] = useState<FinMethodKey | ''>('');
  const [inst, setInst] = useState(1);
  const [given, setGiven] = useState('');
  const [toExp, setToExp] = useState(false);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Receipt | null>(null);
  const [doneInfo, setDoneInfo] = useState<DoneInfo | null>(null);
  const [tick, setTick] = useState(0);
  const idem = useRef(newSaleKey());

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    const useCache = async (): Promise<boolean> => {
      const snap = await loadSnapshot(storeId);
      if (!snap) return false;
      setProducts(snap.products);
      setVariants(snap.variants);
      setStock(snap.stock);
      setCachedAt(snap.savedAt);
      setSource('cache');
      return true;
    };
    try {
      if (!navigator.onLine || (isContingency() && (await loadSnapshot(storeId)))) {
        if (!(await useCache())) showError('Sem conexão e sem catálogo salvo neste aparelho. Conecte-se uma vez para baixar o catálogo.');
        return;
      }
      try {
        const [p, v] = await Promise.all([listProducts(storeId), listVariantsByProduct(storeId)]);
        const active = p.filter((x) => !!x.active);
        let st: StockMap = new Map();
        try { st = await loadStockByWarehouse(storeId); } catch { /* segue sem estoque por depósito */ }
        setProducts(active);
        setVariants(v);
        setStock(st);
        setSource('online');
        setCachedAt(null);
        void saveSnapshot(storeId, active, v, st);
        void companyBriefCached(storeId);
      } catch (e) {
        if (await useCache()) return;
        console.error('[PDV]', e);
        showError('Erro ao carregar os produtos.');
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) void load(); }, [lojaLoading, load]);

  useEffect(() => {
    if (!storeId || !channel) return;
    let on = true;
    finCached(storeId, channel)
      .then((c) => {
        if (!on) return;
        if (c) setFin(c);
        else showError('Sem conexão e sem formas de pagamento salvas para esta loja. Conecte-se uma vez.');
      })
      .catch((e) => { if (on) showError((e as Error).message); });
    return () => { on = false; };
  }, [storeId, channel, source]);

  useEffect(() => {
    const t = custTerm.trim();
    if (!storeId || t.length < 2 || customer) { setHits([]); return; }
    const h = setTimeout(() => {
      searchCustomers(storeId, t).then(setHits).catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(h);
  }, [custTerm, storeId, customer]);

  const stockOf = useCallback((v: VariantRow): number => {
    if (source === 'cache' && flat) return Number(flat[v.id] ?? 0);
    const m = stock.get(v.id);
    if (warehouse && m) return Number(m[warehouse] ?? 0);
    return v.stock;
  }, [stock, warehouse, source, flat]);

  // voltou a conexão: recarrega do servidor
  useEffect(() => {
    const h = () => { if (storeId) void load(); };
    window.addEventListener('online', h);
    window.addEventListener('sll-pdv-synced', h);
    return () => window.removeEventListener('online', h);
      window.removeEventListener('sll-pdv-synced', h);
  }, [storeId, load]);

  // saiu da contingência: recarrega do servidor
  useEffect(() => {
    if (!net.contingency && source === 'cache' && storeId) void load();
  }, [net.contingency, source, storeId, load]);

  // guarda o caixa aberto para liberar a venda offline
  useEffect(() => {
    if (!storeId || !channel || net.contingency) return;
    cashCurrent(storeId, channel)
      .then((s) => saveCache(cacheKeys.cash(storeId), s ? { id: s.id } : null))
      .catch(() => undefined);
  }, [storeId, channel, source, net.contingency]);

  // saldo por variação do depósito escolhido (base das travas offline).
  // Online: grava, mas só sem venda na fila (senão apagaria o que foi vendido offline).
  useEffect(() => {
    if (!storeId) return;
    const key = cacheKeys.stock(storeId, warehouse);
    if (source === 'online') {
      if (variants.size === 0) return;
      setFlat(null);
      const m: Record<string, number> = {};
      variants.forEach((vs) => vs.forEach((v) => {
        const w = stock.get(v.id);
        m[v.id] = warehouse && w ? Number(w[warehouse] ?? 0) : v.stock;
      }));
      void countQueue().then((n) => { if (n === 0) void saveCache(key, m); });
    } else {
      void loadCache<Record<string, number>>(key).then((c) => setFlat(c ? c.value : null));
    }
  }, [storeId, warehouse, source, variants, stock, tick]);

  // ---------- catalogo ----------
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category || '').filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [products],
  );

  const list = useMemo(() => {
    const q = norm(search.trim());
    return products.filter((p) => {
      const vs = variants.get(p.id) ?? [];
      if (vs.length === 0) return false;
      if (cat && p.category !== cat) return false;
      if (!q) return true;
      return norm(p.name).includes(q) || norm(p.category).includes(q) || norm(p.sku).includes(q)
        || vs.some((v) => norm(variantLabel(v)).includes(q) || norm(v.sku).includes(q));
    });
  }, [products, variants, search, cat]);

  useEffect(() => { setLimit(PAGE); }, [search, cat]);

  const toggleOpen = (id: string) =>
    setOpen((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // ---------- carrinho ----------
  const addVariant = (p: CatalogProduct, v: VariantRow) => {
    const avail = stockOf(v);
    if (avail <= 0) { showError('Sem estoque.'); return; }
    const price = v.price ?? p.price ?? 0;
    const name = hasRealVariants(variants.get(p.id)) ? `${p.name} - ${variantLabel(v)}` : p.name;
    setCart((prev) => {
      const cur = prev.find((l) => l.variantId === v.id);
      if (cur) {
        if (cur.qty + 1 > avail) { showError('Estoque insuficiente.'); return prev; }
        return prev.map((l) => (l.variantId === v.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { variantId: v.id, name, sku: v.sku, price: Number(price), qty: 1 }];
    });
  };

  const variantById = useMemo(() => {
    const m = new Map<string, VariantRow>();
    variants.forEach((vs) => vs.forEach((v) => m.set(v.id, v)));
    return m;
  }, [variants]);

  const changeQty = (id: string, delta: number) => {
    const v = variantById.get(id);
    setCart((prev) => prev.flatMap((l) => {
      if (l.variantId !== id) return [l];
      const next = l.qty + delta;
      if (next <= 0) return [];
      if (v && next > stockOf(v)) { showError('Estoque insuficiente.'); return [l]; }
      return [{ ...l, qty: next }];
    }));
  };

  // ---------- valores ----------
  const subtotal = r2(cart.reduce((s, l) => s + l.price * l.qty, 0));
  const disc = parseMoney(discount);
  const ship = parseMoney(shipping);
  const total = r2(subtotal - disc + ship);

  const methods = useMemo<FinMethodKey[]>(
    () => (fin?.methods ?? []).filter((m) => m.enabled && m.scope !== 'ecommerce').map((m) => m.method),
    [fin],
  );

  useEffect(() => {
    if (methods.length && (!method || !methods.includes(method))) setMethod(methods[0]);
  }, [methods, method]);

  const opts = useMemo(() => {
    if (!fin || method !== 'credit') return [];
    return installmentOptions(
      total > 0 ? total : 0, fin.settings.max_installments, fin.settings.max_interest_free,
      fin.settings.min_installment_value, fin.fees.filter((f) => f.method === 'credit'),
    );
  }, [fin, method, total]);

  useEffect(() => {
    if (method !== 'credit') { if (inst !== 1) setInst(1); return; }
    if (opts.length && (inst > opts.length || opts[inst - 1]?.blocked)) setInst(1);
  }, [method, opts, inst]);

  const picked = method === 'credit' ? opts[inst - 1] : undefined;
  const charged = picked ? picked.total : total;
  const interest = r2(charged - total);
  const givenN = parseMoney(given);
  const change = method === 'cash' && givenN > 0 ? r2(Math.max(givenN - total, 0)) : 0;

  const clearSale = () => {
    setCart([]); setCustomer(null); setCustTerm(''); setNewCust(null); setNote('');
    setDiscount(''); setShipping(''); setInst(1); setGiven(''); setToExp(false);
  };

  // ---------- cliente ----------
  const saveNewCustomer = async () => {
    if (!storeId || !newCust) return;
    setCustBusy(true);
    try {
      const c = await quickCustomer(storeId, newCust);
      setCustomer(c); setNewCust(null); setCustTerm(''); setHits([]);
      showSuccess('Cliente cadastrado.');
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setCustBusy(false);
    }
  };

  // ---------- finalizar ----------
  const finalize = async () => {
    if (!storeId || busy) return;
    if (!channel) { showError('Escolha a loja da venda.'); return; }
    if (cart.length === 0) { showError('Venda sem produto.'); return; }
    if (disc > subtotal) { showError('Desconto maior que o subtotal.'); return; }
    if (total <= 0) { showError('O total da venda deve ser maior que zero.'); return; }
    if (!method) { showError('Escolha a forma de pagamento.'); return; }
    if (method === 'cash' && given.trim() && givenN < total) { showError('O valor recebido é menor que o total.'); return; }
    for (const l of cart) {
      const v = variantById.get(l.variantId);
      if (!v) { showError('Produto removido. Refaça a venda.'); return; }
      if (l.qty > stockOf(v)) { showError(`Estoque insuficiente para ${l.name}.`); return; }
    }

    setBusy(true);
    try {
      const res = await createPdvSale({
        storeId,
        customerId: customer?.id ?? null,
        items: cart.map((l) => ({ variant_id: l.variantId, qty: l.qty, unit_price: l.price, discount: 0 })),
        discount: disc,
        shipping: ship,
        payments: [{
          method, amount: total, installments: method === 'credit' ? inst : 1,
          ...(method === 'cash' ? { cash_given: givenN > 0 ? givenN : total } : {}),
        }],
        sendToExpedition: toExp,
        note: note.trim() || null,
        idemKey: idem.current,
            warehouseId: warehouse,
        channel,
        origin,
      });
      const company = await companyBriefCached(storeId);
      setDone({
        number: res.number,
        date: new Date(),
        company,
        customer: customer ? { name: customer.name, phone: customer.phone, document: customer.document } : null,
        items: cart.map((l) => ({ name: l.name, sku: l.sku, qty: l.qty, unit: l.price })),
        subtotal, discount: disc, shipping: ship, total, interest: Number(res.interest_total || 0),
        payment: {
          label: METHOD_LABEL[method], installments: method === 'credit' ? inst : 1,
          charged: total + Number(res.interest_total || 0),
          given: method === 'cash' ? (givenN > 0 ? givenN : total) : null,
          change: Number(res.change_amount || 0),
        },
        note: note.trim(),
      });
      setDoneInfo({ queued: !!res.queued, provisional: res.provisional ?? null });
          if (res.queued) showSuccess(`Venda salva neste aparelho (${res.provisional ?? 'pendente'}). Será enviada quando a conexão voltar.`);
          else showSuccess(`Venda registrada #${String(res.number).padStart(4, '0')}`);
      idem.current = newSaleKey();
      clearSale();
      void load().then(() => setTick((t) => t + 1));
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const printReceipt = () => {
    if (!done) return;
    const w = window.open('', '_blank');
    if (!w) { showError('Libere os pop-ups para imprimir.'); return; }
    w.document.open();
    w.document.write(withPendingBanner(buildReceiptHtml(done), doneInfo));
    w.document.close();
    w.focus();
    w.print();
    setDone(null);
  };

  if (loading || lojaLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>;
  }

  if (!can('pedidos', 'editar')) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
        Seu perfil não tem permissão para registrar vendas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SllPageHeader title="PDV" subtitle="Venda rápida de balcão. A baixa de estoque e o pedido entram no Gestor na hora." className="mb-0" />

      {net.contingency ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
              <span className="flex items-center gap-2">
                <WifiOff size={16} />
                {net.manual
                  ? 'Modo offline manual ligado: as vendas ficam salvas neste aparelho e sobem quando você voltar ao online.'
                  : 'Sem conexão com o servidor: as vendas ficam salvas neste aparelho e sobem sozinhas quando a conexão voltar.'}
              </span>
              {net.manual ? (
                <button type="button" onClick={() => net.setManual(false)} className={sllBtnGhost}><Wifi size={14} /> Voltar ao online</button>
              ) : (
                <button type="button" onClick={() => void net.check()} className={sllBtnGhost}>Testar conexão</button>
              )}
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" onClick={() => net.setManual(true)} className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-[color:var(--sll-b-brand)]">
                Internet instável? Usar modo offline
              </button>
            </div>
          )}

          {source === 'cache' && (
        <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
          Sem conexão: usando o catálogo e o estoque salvos neste aparelho{cachedAt ? ` em ${new Date(cachedAt).toLocaleString('pt-BR')}` : ''}. Os saldos podem estar desatualizados.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-4">
          <Card title="Loja e origem">
            {storeId && (
              <PdvChannelPicker
                storeId={storeId} channel={channel} origin={origin} disabled={busy}
                onChannelChange={(c, w) => { setChannel(c); setWarehouse(w); }}
                onOriginChange={setOrigin}
              />
            )}
          </Card>

          <Card title="Dados do cliente (opcional)">
            {customer ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[color:var(--sll-b-brand-soft)] px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{customer.name}</p>
                  <p className="text-[11px] text-slate-500">{[customer.document, customer.phone].filter(Boolean).join(' · ') || 'Sem documento ou telefone'}</p>
                </div>
                <button type="button" title="Trocar cliente" onClick={() => setCustomer(null)} className={qtyBtn}><X size={14} /></button>
              </div>
            ) : newCust ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <SllField label="Nome *"><input className={sllFieldCls} value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} /></SllField>
                  <SllField label="CPF"><input className={sllFieldCls} inputMode="numeric" value={newCust.document} onChange={(e) => setNewCust({ ...newCust, document: e.target.value })} /></SllField>
                  <SllField label="WhatsApp"><input className={sllFieldCls} inputMode="tel" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} /></SllField>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={custBusy} onClick={() => void saveNewCustomer()} className={sllBtnPrimary}>
                    {custBusy && <Loader2 size={15} className="animate-spin" />}Cadastrar cliente
                  </button>
                  <button type="button" disabled={custBusy} onClick={() => setNewCust(null)} className={sllBtnGhost}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input className={sllFieldCls} placeholder="Buscar cliente por nome, CPF ou WhatsApp..." value={custTerm} onChange={(e) => setCustTerm(e.target.value)} />
                  <button type="button" onClick={() => setNewCust({ name: custTerm.trim(), phone: '', document: '' })} className={sllBtnGhost + ' shrink-0'}>
                    <UserPlus size={15} /> Novo
                  </button>
                </div>
                {hits.length > 0 && (
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                    {hits.map((h) => (
                      <li key={h.id}>
                        <button type="button" onClick={() => { setCustomer(h); setHits([]); setCustTerm(''); }} className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                          <span className="truncate font-semibold">{h.name}</span>
                          <span className="shrink-0 text-[11px] text-slate-400">{[h.document, h.phone].filter(Boolean).join(' · ')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-slate-400">Sem cliente, a venda é registrada como consumidor não identificado.</p>
              </div>
            )}
          </Card>

          <Card title="Produtos">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <SllSearch value={search} onChange={setSearch} placeholder="Produto, categoria, variação ou SKU..." />
              <SllField label="Categoria" className="w-56">
                <select className={sllFieldCls + ' cursor-pointer'} value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">Todas</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </SllField>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                  <tr><th className="px-3 py-2 text-left">Produto</th><th className="px-3 py-2 text-center">Categoria</th><th className="px-3 py-2 text-center">Estoque</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {list.slice(0, limit).map((p) => {
                    const vs = variants.get(p.id) ?? [];
                    const multi = hasRealVariants(vs);
                    const total0 = vs.reduce((s, v) => s + stockOf(v), 0);
                    const isOpen = multi && open.has(p.id);
                    return (
                      <FragmentRow key={p.id}>
                        <tr className={cn('transition-colors', multi && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800')} onClick={multi ? () => toggleOpen(p.id) : undefined}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                                {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <Package size={16} className="text-slate-400" />}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-800 dark:text-white">{p.name}</p>
                                {!multi && vs[0] && <p className="text-[11px] text-slate-400">{vs[0].sku} · {brl(vs[0].price ?? p.price ?? 0)}</p>}
                              </div>
                              {multi && (isOpen ? <ChevronDown size={16} className="shrink-0 text-slate-400" /> : <ChevronRight size={16} className="shrink-0 text-slate-400" />)}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-slate-500">{p.category || '-'}</td>
                          <td className="px-3 py-2 text-center">
                            {multi ? (
                              <span className={cn('font-mono text-xs font-bold', total0 <= 0 && 'text-rose-600')}>{total0}</span>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <span className={cn('font-mono text-xs font-bold', total0 <= 0 && 'text-rose-600')}>{total0}</span>
                                <button type="button" disabled={total0 <= 0} onClick={(e) => { e.stopPropagation(); addVariant(p, vs[0]); }} className={sllBtnPrimary + ' !px-3 !py-1 !text-[11px] uppercase'}>Adicionar</button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {isOpen && vs.map((v) => {
                          const st = stockOf(v);
                          return (
                            <tr key={v.id} className="bg-slate-50/70 dark:bg-slate-800/40">
                              <td className="py-2 pl-16 pr-3">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{variantLabel(v)}</p>
                                <p className="text-[11px] text-slate-400">{v.sku} · {brl(v.price ?? p.price ?? 0)}</p>
                              </td>
                              <td />
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-center gap-2">
                                  <span className={cn('font-mono text-xs font-bold', st <= 0 && 'text-rose-600')}>{st}</span>
                                  <button type="button" disabled={st <= 0} onClick={() => addVariant(p, v)} className={sllBtnPrimary + ' !px-3 !py-1 !text-[11px] uppercase'}>Adicionar</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </FragmentRow>
                    );
                  })}
                  {list.length === 0 && <tr><td colSpan={3} className="px-3 py-10 text-center text-sm text-slate-400">Nenhum produto encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
            {list.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className={sllBtnGhost + ' mt-3'}>Mostrar mais ({list.length - limit})</button>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={`Carrinho (${cart.reduce((s, l) => s + l.qty, 0)})`}>
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nenhum item. Clique em Adicionar nos produtos.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {cart.map((l) => (
                  <li key={l.variantId} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{l.name}</p>
                        <p className="text-[11px] text-slate-400">{l.sku} · {brl(l.price)}</p>
                      </div>
                      <button type="button" title="Remover" onClick={() => setCart((p) => p.filter((x) => x.variantId !== l.variantId))} className="cursor-pointer text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => changeQty(l.variantId, -1)} className={qtyBtn}><Minus size={13} /></button>
                        <span className="w-6 text-center font-mono text-sm font-bold">{l.qty}</span>
                        <button type="button" onClick={() => changeQty(l.variantId, 1)} className={qtyBtn}><Plus size={13} /></button>
                      </div>
                      <span className="font-mono text-sm font-bold">{brl(l.price * l.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 space-y-3">
              <SllField label="Observação">
                <textarea className={sllFieldCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sai no recibo" />
              </SllField>
              <div className="grid grid-cols-2 gap-3">
                <SllField label="Desconto (R$)"><input className={sllFieldCls} inputMode="decimal" placeholder="0,00" value={discount} onChange={(e) => setDiscount(e.target.value)} /></SllField>
                <SllField label="Frete (R$)"><input className={sllFieldCls} inputMode="decimal" placeholder="0,00" value={shipping} onChange={(e) => setShipping(e.target.value)} /></SllField>
              </div>
            </div>
          </Card>

          <Card title="Forma de pagamento">
            {!fin ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
            ) : methods.length === 0 ? (
              <p className="text-sm text-amber-700">Nenhuma forma de pagamento liberada para esta loja. Ative em Configurações › Financeiro.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m} type="button" onClick={() => setMethod(m)}
                      className={cn('cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                        method === m ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]' : 'border-slate-200 hover:border-[color:var(--sll-b-brand)] dark:border-slate-700')}
                    >{METHOD_LABEL[m]}</button>
                  ))}
                </div>

                {method === 'credit' && opts.length > 1 && (
                  <SllField label="Parcelas">
                    <select className={sllFieldCls + ' cursor-pointer'} value={inst} onChange={(e) => setInst(Number(e.target.value))}>
                      {opts.map((o) => (
                        <option key={o.n} value={o.n} disabled={o.blocked}>
                          {o.n}x de {brl(o.per)} {o.withInterest ? 'com juros' : 'sem juros'} · total {brl(o.total)}{o.blocked ? ' (abaixo da parcela mínima)' : ''}
                        </option>
                      ))}
                    </select>
                  </SllField>
                )}

                {method === 'cash' && (
                  <SllField label="Valor recebido (R$)">
                    <input className={sllFieldCls} inputMode="decimal" placeholder={total > 0 ? String(total).replace('.', ',') : '0,00'} value={given} onChange={(e) => setGiven(e.target.value)} />
                  </SllField>
                )}
              </div>
            )}
          </Card>

          <Card title="Resumo">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-mono">{brl(subtotal)}</dd></div>
              {disc > 0 && <div className="flex justify-between"><dt className="text-slate-500">Desconto</dt><dd className="font-mono text-emerald-600">- {brl(disc)}</dd></div>}
              {ship > 0 && <div className="flex justify-between"><dt className="text-slate-500">Frete</dt><dd className="font-mono">{brl(ship)}</dd></div>}
              {interest > 0 && <div className="flex justify-between"><dt className="text-slate-500">Juros do parcelamento</dt><dd className="font-mono">{brl(interest)}</dd></div>}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold dark:border-slate-700"><dt>Total</dt><dd className="font-mono">{brl(charged)}</dd></div>
              {picked && inst > 1 && <p className="text-right text-[11px] text-slate-400">{inst}x de {brl(picked.per)}</p>}
              {change > 0 && <div className="flex justify-between text-emerald-600"><dt>Troco</dt><dd className="font-mono font-bold">{brl(change)}</dd></div>}
            </dl>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" checked={toExp} onChange={(e) => setToExp(e.target.checked)} />
              Enviar para a Expedição (retirada ou entrega depois)
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy} onClick={clearSale} className={sllBtnGhost + ' flex-1'}>Limpar venda</button>
              <button type="button" disabled={busy || cart.length === 0} onClick={() => void finalize()} className={sllBtnPrimary + ' flex-[2]'}>
                {busy && <Loader2 size={15} className="animate-spin" />}Finalizar venda
              </button>
            </div>
          </Card>
        </div>
      </div>

      <SllModal
        open={!!done}
        onOpenChange={(o) => { if (!o) setDone(null); }}
        title={doneInfo?.queued ? 'Venda salva neste aparelho' : 'Venda salva com sucesso'}
        size="md"
        footer={(
          <>
            <button type="button" onClick={() => setDone(null)} className={sllBtnGhost}>Não imprimir</button>
            <button type="button" onClick={printReceipt} className={sllBtnPrimary}>Imprimir recibo</button>
          </>
        )}
      >
        {done && (
          <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
            {doneInfo?.queued ? (
                  <p>Venda <strong>{doneInfo.provisional ?? 'pendente'}</strong> guardada neste aparelho. O pedido e a baixa de estoque são criados quando a conexão voltar.</p>
                ) : (
                  <p>Pedido <strong>#{String(done.number).padStart(4, '0')}</strong> registrado.</p>
                )}
            <p>Total: <strong>{brl(done.total + done.interest)}</strong> · {done.payment.label}{done.payment.installments > 1 ? ` em ${done.payment.installments}x` : ''}</p>
            {done.payment.given != null && done.payment.change > 0 && <p>Troco: <strong>{brl(done.payment.change)}</strong></p>}
          </div>
        )}
      </SllModal>
    </div>
  );
}

function withPendingBanner(html: string, info: DoneInfo | null): string {
  if (!info?.queued) return html;
  const banner = `<p style="text-align:center;font-weight:bold;border:1px dashed #000;padding:4px;margin:4px 0">VENDA PENDENTE DE ENVIO<br/>${info.provisional ?? ''}</p>`;
  return /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + banner) : banner + html;
}

// Agrupa as linhas de um produto e das variacoes dentro do mesmo tbody
function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}