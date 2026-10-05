import { supabase } from '@/lib/supabase';
import { ImportItem, parsePrice, categoryLeaf, normCat } from '@/services/productsService';

const sb: any = supabase;
const fieldName = (n: string) => n.replace(/^.*:/, '').trim().toLowerCase();
const stripHtml = (v: string) => v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const decodeEntities = (v: string): string => {
  if (!v || !v.includes('&')) return v;
  const t = document.createElement('textarea');
  t.innerHTML = v;
  return t.value;
};

export const CATEGORY_FIELDS = ['category', 'categoria', 'categories', 'google_product_category', 'product_type'];

const fieldKey = (storeId: string) => `sll:xml-category-field:${storeId}`;
export function getSavedCategoryField(storeId: string): string | undefined {
  try { return localStorage.getItem(fieldKey(storeId)) || undefined; } catch { return undefined; }
}
export function saveCategoryField(storeId: string, field: string): void {
  try { localStorage.setItem(fieldKey(storeId), field); } catch { /* storage indisponivel */ }
}

export async function fetchFeedText(url: string): Promise<string> {
  const { data } = await sb.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente.');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-xml`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = `Erro HTTP ao baixar o XML (${res.status}).`;
    try { const j = JSON.parse(text); if (j.error) msg = j.error; } catch { /* corpo nao e JSON */ }
    throw new Error(msg);
  }
  return text;
}

function readFeedMaps(rawText: string): Map<string, string>[] {
  const xml = rawText.replace(/^\uFEFF/, '').trimStart();
  if (!xml) throw new Error('A resposta do XML está vazia.');

  const head = xml.slice(0, 500).toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html') || head.includes('<body')) {
    throw new Error('O feed retornou uma página HTML em vez de XML.');
  }
  if (head.startsWith('{') || head.startsWith('[') || !xml.includes('<')) {
    throw new Error('A resposta recebida não parece ser XML.');
  }

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    const detail = err.textContent?.replace(/\s+/g, ' ').trim();
    throw new Error(detail ? `Erro de sintaxe no XML: ${detail.slice(0, 200)}` : 'O XML possui erro de sintaxe.');
  }

  const wanted = ['item', 'product', 'entry', 'produto', 'offer'];
  const matched = Array.from(doc.getElementsByTagName('*')).filter(n => wanted.includes(fieldName(n.nodeName)));
  const set = new Set(matched);
  const nodes = matched.filter(n => !(n.parentElement && set.has(n.parentElement)));

  const collect = (item: Element) => {
    const map = new Map<string, string>();
    const walk = (node: Element, path: string[]) => {
      const name = fieldName(node.nodeName);
      const p = [...path, name];
      if (node.children.length === 0) {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) {
          if (!map.has(name)) map.set(name, text);
          if (!map.has(p.join('.'))) map.set(p.join('.'), text);
        }
      }
      Array.from(node.children).forEach(c => walk(c, p));
    };
    walk(item, []);
    return map;
  };
  return nodes.map(collect);
}

const pick = (m: Map<string, string>, aliases: string[]) => {
  for (const a of aliases) { const v = m.get(a); if (v) return v; }
  return '';
};

export function parseXmlFeed(rawText: string, categoryField?: string): ImportItem[] {
  const fields = categoryField ? [categoryField] : CATEGORY_FIELDS;
  return readFeedMaps(rawText)
    .map(m => ({
      name: decodeEntities(pick(m, ['title', 'name', 'nome', 'product_name'])),
      price: parsePrice(pick(m, ['price', 'sale_price', 'valor', 'preco', 'price_with_tax'])),
      product_url: pick(m, ['link', 'url', 'product_url']),
      image_url: pick(m, ['image_link', 'image', 'imagem', 'picture', 'additional_image_link']),
      category: decodeEntities(pick(m, fields)),
      sku: pick(m, ['mpn']),
      externalId: pick(m, ['id']),
      description: stripHtml(pick(m, ['description', 'descricao', 'summary', 'content'])),
    }))
    .filter(p => p.name);
}

export interface CategoryFieldInfo { field: string; distinct: number; sample: string[] }

export function scanCategoryFields(rawText: string): CategoryFieldInfo[] {
  const maps = readFeedMaps(rawText);
  return CATEGORY_FIELDS.map(field => {
    const vals = new Set<string>();
    maps.forEach(m => { const v = decodeEntities(m.get(field) || ''); if (v) vals.add(v); });
    return { field, distinct: vals.size, sample: Array.from(vals).slice(0, 3) };
  }).filter(f => f.distinct > 0);
}

export function listFeedCategories(items: ImportItem[]): { name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const it of items) {
    const name = categoryLeaf(it.category || '');
    if (!name) continue;
    const k = normCat(name);
    const cur = map.get(k);
    if (cur) cur.count++; else map.set(k, { name, count: 1 });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}