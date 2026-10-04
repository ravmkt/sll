import { ImportItem, parsePrice } from '@/services/productsService';

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const ALIAS: Record<keyof ImportItem, string[]> = {
  name: ['nome', 'name', 'produto', 'titulo', 'title'],
  price: ['preco', 'price', 'valor'],
  product_url: ['link', 'url', 'product_url', 'link_do_produto'],
  image_url: ['imagem_url', 'imagem', 'image', 'image_url', 'foto'],
  category: ['categoria', 'category'],
  sku: ['sku', 'codigo', 'mpn', 'referencia'],
  description: ['descricao', 'description'],
  externalId: ['id', 'external_id', 'id_externo'],
};

export const SHEET_TEMPLATE_CSV =
  'nome;sku;categoria;preco;link;imagem_url;descricao\n' +
  '"Vestido Floral";VF-001;Vestidos;189,90;https://loja.com/vestido;https://img.com/1.jpg;"Vestido leve"\n' +
  '"Blusa Básica";BB-002;Blusas;79,90;https://loja.com/blusa;https://img.com/2.jpg;"Blusa de algodão"\n';

export async function parseSheet(file: File): Promise<ImportItem[]> {
  const XLSX = await import('xlsx');
  let wb;
  if (/\.csv$/i.test(file.name)) {
    const text = (await file.text()).replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const FS = first.split(';').length > first.split(',').length ? ';' : ',';
    wb = XLSX.read(text, { type: 'string', FS } as any);
  } else {
    wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('A planilha está vazia.');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  const items = rows.map(row => {
    const byKey = new Map<string, unknown>();
    Object.entries(row).forEach(([k, v]) => byKey.set(norm(k), v));
    const get = (f: keyof ImportItem) => {
      for (const a of ALIAS[f]) {
        const v = byKey.get(a);
        if (v !== undefined && String(v).trim() !== '') return v;
      }
      return '';
    };
    const str = (f: keyof ImportItem) => String(get(f)).trim();
    return {
      name: str('name'),
      price: parsePrice(get('price')),
      product_url: str('product_url'),
      image_url: str('image_url'),
      category: str('category'),
      sku: str('sku'),
      externalId: str('externalId'),
      description: str('description'),
    };
  }).filter(i => i.name);

  if (!items.length) throw new Error('Nenhuma linha com nome de produto foi encontrada. Confira o cabeçalho (nome, sku, categoria, preco...).');
  return items;
}