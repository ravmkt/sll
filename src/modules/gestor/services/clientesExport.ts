import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface ExportFilters { search?: string }

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '');
const yn = (v?: boolean | null) => (v ? 'Sim' : 'Não');

async function fetchAll(storeId: string, f: ExportFilters) {
  const rows: any[] = [];
  const q = (f.search || '').trim().replace(/[,()%*]/g, ' ');
  for (let from = 0; ; from += 1000) {
    let query = sb.from('customer_stats').select('*').eq('store_id', storeId).order('name', { ascending: true });
    if (q) {
      const like = `%${q}%`;
      query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like},document.ilike.${like}`);
    }
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function exportCustomersXlsx(storeId: string, filters: ExportFilters = {}): Promise<number> {
  const rows = await fetchAll(storeId, filters);
  if (!rows.length) return 0;

  const head = [
    'Nome', 'E-mail', 'Telefone', 'Documento', 'Cidade', 'UF', 'Origem', 'Tags',
    'Aceita e-mail/marketing', 'Aceita WhatsApp', 'Pedidos', 'Total gasto', 'Ticket médio',
    'Primeiro pedido', 'Último pedido', 'Dias sem comprar', 'Cadastro',
  ];
  const body = rows.map((r) => [
    r.name || '', r.email || '', r.phone || '', r.document || '', r.city || '', r.state || '',
    r.source_platform || '', Array.isArray(r.tags) ? r.tags.join(', ') : '',
    yn(r.accepts_marketing), yn(r.accepts_whatsapp), Number(r.orders_count || 0),
    Number(r.total_spent || 0), Number(r.avg_ticket || 0),
    fmtDate(r.first_order_at), fmtDate(r.last_order_at),
    r.days_since_last ?? '', fmtDate(r.created_at),
  ]);

  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
  ws['!cols'] = head.map((h, i) => ({ wch: i === 0 || i === 1 ? 32 : Math.max(12, h.length + 2) }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: head.length - 1 } }) };
  for (let r = 1; r <= body.length; r++) {
    for (const c of [11, 12]) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell) cell.z = '"R$" #,##0.00';
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, `clientes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  return rows.length;
}