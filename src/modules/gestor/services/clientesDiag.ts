import { showSuccess } from '@/utils/toast';

export interface SkippedCustomer {
  y_id: string | number | null;
  name: string;
  email: string | null;
  doc: string | null;
  g_id: string | null;
  g_name: string | null;
  g_email: string | null;
  g_doc: string | null;
}

const fmt = (s: SkippedCustomer) =>
  `Yampi #${s.y_id ?? '-'} | ${s.name} | ${s.email ?? '-'} | ${s.doc ?? '-'}  ->  Gestor: ${s.g_name ?? '(nao localizado)'} | ${s.g_email ?? '-'} | ${s.g_doc ?? '-'}`;

export function reportCustomerImport(created: number, existing: number, skipped: SkippedCustomer[]) {
  showSuccess(`${created} cliente(s) criado(s), ${existing} já existente(s).`);
  if (!skipped.length) return;

  const groups = new Map<string, SkippedCustomer[]>();
  for (const s of skipped) {
    const k = s.g_id ?? `sem-${s.y_id}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const dups = [...groups.values()].filter((a) => a.length > 1);

  const out: string[] = [
    `DIAG YAMPI CLIENTES PULADOS - ${new Date().toISOString()}`,
    `Criados: ${created} | Ja existentes: ${existing}`,
    '',
    `== DUPLICADOS (varios cadastros da Yampi no mesmo cliente do Gestor): ${dups.length} grupo(s) ==`,
    ...dups.flatMap((a) => [...a.map(fmt), '']),
    `== TODOS OS PULADOS (${skipped.length}) ==`,
    ...skipped.map(fmt),
  ];

  const blob = new Blob(['\uFEFF' + out.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diag-yampi-clientes-pulados.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}