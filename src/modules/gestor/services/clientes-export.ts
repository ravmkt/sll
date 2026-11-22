import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { CustomerRow, SortDir, SortKey } from './clientes';

type ExportRow = CustomerRow & { source_platform?: string | null; created_at?: string | null };

const BATCH = 1000;
const MAX_ROWS = 50000;

const d = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('pt-BR') : '');

async function fetchAll(p: { storeId: string; search: string; tag: string; sort: SortKey; dir?: SortDir }) {
  const out: ExportRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += BATCH) {
    let q = supabase.from('customer_stats').select('*').eq('store_id', p.storeId);
    const term = p.search.trim().replace(/[,()%]/g, ' ');
    if (term) {
      q = q.or('name.ilike.%' + term + '%,email.ilike.%' + term + '%,phone.ilike.%' + term + '%,document.ilike.%' + term + '%');
    }
    if (p.tag.trim()) q = q.contains('tags', [p.tag.trim()]);
    q = q.order(p.sort, { ascending: (p.dir ?? (p.sort === 'name' || p.sort === 'city' || p.sort === 'document' ? 'asc' : 'desc')) === 'asc', nullsFirst: false });
    q = q.order('customer_id', { ascending: true });
    const { data, error } = await q.range(from, from + BATCH - 1);
    if (error) throw error;
    const part = (data ?? []) as ExportRow[];
    out.push(...part);
    if (part.length < BATCH) break;
  }
  return out;
}

export async function exportCustomers(p: { storeId: string; search: string; tag: string; sort: SortKey; dir?: SortDir }) {
  const rows = await fetchAll(p);
  if (rows.length === 0) throw new Error('Nenhum cliente para exportar.');
  const header = [
    'Nome', 'E-mail', 'Telefone', 'Documento', 'Cidade', 'UF', 'Origem', 'Tags',
    'Aceita e-mail', 'Aceita WhatsApp', 'Pedidos pagos', 'Total gasto', 'Ticket m\u00e9dio',
    'Primeira compra', '\u00daltima compra', 'Dias sem comprar', 'Cadastro',
  ];
  const body = rows.map((r) => [
    r.name, r.email ?? '', r.phone ?? '', r.document ?? '', r.city ?? '', r.state ?? '',
    r.source_platform ?? '', (r.tags ?? []).join(', '),
    r.accepts_marketing ? 'Sim' : 'N\u00e3o', r.accepts_whatsapp ? 'Sim' : 'N\u00e3o',
    Number(r.orders_count ?? 0), Number(r.total_spent ?? 0), Number(r.avg_ticket ?? 0),
    d(r.first_order_at), d(r.last_order_at), r.days_since_last ?? '', d(r.created_at),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws['!cols'] = [28, 30, 16, 18, 20, 6, 12, 28, 12, 14, 12, 14, 14, 14, 14, 14, 12].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'clientes-' + stamp + '.xlsx');
  return rows.length;
}