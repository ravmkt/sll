import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProductRow, ProductTax } from '../types';

const ORIGINS = [
  '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8',
  '1 - Estrangeira (importação direta)',
  '2 - Estrangeira (adquirida no mercado interno)',
  '3 - Nacional, conteúdo de importação superior a 40%',
  '4 - Nacional, processos produtivos básicos',
  '5 - Nacional, conteúdo de importação até 40%',
  '6 - Estrangeira, sem similar nacional (importação direta)',
  '7 - Estrangeira, sem similar nacional (mercado interno)',
  '8 - Nacional, conteúdo de importação superior a 70%',
];
const ITEM_TYPES = ['Mercadoria para revenda', 'Matéria-prima', 'Embalagem', 'Produto em processo', 'Produto acabado', 'Subproduto', 'Material de uso e consumo', 'Outros insumos', 'Outras'];
const num = (v: string) => (v === '' ? null : Number(v));
const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const sel = 'h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700';

interface Props { product: ProductRow; onChange: (patch: Partial<ProductRow>) => void }

export default function TaxTab({ product, onChange }: Props) {
  const t: ProductTax = product.tax || {};
  const set = (patch: Partial<ProductTax>) => onChange({ tax: { ...t, ...patch } });
  const rate = (label: string, key: 'icms_rate' | 'ipi_rate' | 'pis_rate' | 'cofins_rate') => (
    <div>
      <label className={lbl}>{label} (%)</label>
      <Input type="number" step="0.01" min="0" value={t[key] ?? ''} onChange={(e) => set({ [key]: num(e.target.value) } as Partial<ProductTax>)} />
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[color:var(--sll-b-brand-border)] bg-[color:var(--sll-b-brand-soft)] p-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        Preencha somente se for emitir nota fiscal.
      </div>
      <div>
        <label className={lbl}>Origem da mercadoria</label>
        <select className={sel} value={t.origin ?? '0'} onChange={(e) => set({ origin: e.target.value })}>
          {ORIGINS.map((o) => <option key={o} value={o.slice(0, 1)}>{o}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={lbl}>NCM</label>
          <Input maxLength={10} placeholder="0000.00.00" value={t.ncm ?? ''} onChange={(e) => set({ ncm: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>CEST</label>
          <Input maxLength={9} placeholder="00.000.00" value={t.cest ?? ''} onChange={(e) => set({ cest: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Tipo do item</label>
          <select className={sel} value={t.item_type ?? ''} onChange={(e) => set({ item_type: e.target.value })}>
            <option value="">Selecione</option>
            {ITEM_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <summary className="cursor-pointer text-sm font-semibold">Alíquotas (ICMS, IPI, PIS, COFINS)</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          {rate('ICMS', 'icms_rate')}
          {rate('IPI', 'ipi_rate')}
          {rate('PIS', 'pis_rate')}
          {rate('COFINS', 'cofins_rate')}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div><label className={lbl}>CST ICMS</label><Input value={t.icms_cst ?? ''} onChange={(e) => set({ icms_cst: e.target.value })} /></div>
          <div><label className={lbl}>CST IPI</label><Input value={t.ipi_cst ?? ''} onChange={(e) => set({ ipi_cst: e.target.value })} /></div>
          <div><label className={lbl}>CST PIS</label><Input value={t.pis_cst ?? ''} onChange={(e) => set({ pis_cst: e.target.value })} /></div>
          <div><label className={lbl}>CST COFINS</label><Input value={t.cofins_cst ?? ''} onChange={(e) => set({ cofins_cst: e.target.value })} /></div>
        </div>
      </details>
      <div>
        <label className={lbl}>Informações adicionais (saem na nota)</label>
        <Textarea rows={4} value={t.additional_info ?? ''} onChange={(e) => set({ additional_info: e.target.value })} />
      </div>
    </div>
  );
}
