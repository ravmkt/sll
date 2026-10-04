import { supabase } from '@/lib/supabase';
import { ImportItem, parsePrice } from '@/services/productsService';

const sb: any = supabase;
const fieldName = (n: string) => n.replace(/^.*:/, '').trim().toLowerCase();
const stripHtml = (v: string) => v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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

export function parseXmlFeed(rawText: string): ImportItem[] {
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
  const pick = (m: Map<string, string>, aliases: string[]) => {
    for (const a of aliases) { const v = m.get(a); if (v) return v; }
    return '';
  };

  return nodes
    .map(node => {
      const m = collect(node);
      return {
        name: pick(m, ['title', 'name', 'nome', 'product_name']),
        price: parsePrice(pick(m, ['price', 'sale_price', 'valor', 'preco', 'price_with_tax'])),
        product_url: pick(m, ['link', 'url', 'product_url']),
        image_url: pick(m, ['image_link', 'image', 'imagem', 'picture', 'additional_image_link']),
        category: pick(m, ['product_type', 'google_product_category', 'category', 'categoria']),
        sku: pick(m, ['mpn']),
        externalId: pick(m, ['id']),
        description: stripHtml(pick(m, ['description', 'descricao', 'summary', 'content'])),
      };
    })
    .filter(p => p.name);
}