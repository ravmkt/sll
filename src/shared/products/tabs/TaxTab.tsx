import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProductRow, ProductTax } from '../types';
import { onlyDigits, formatNcm, formatCest, formatCfop } from '../fiscalFormat';

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
const err = 'mt-1 text-[11px] font-semibold text-red-600';
const hint = 'mt-1 text-[11px] text-slate-400';

interface Props { product: ProductRow; onChange: (patch: Partial<ProductRow>) => void }

export default function TaxTab({ product, onChange }: Props) {
  const t: ProductTax = product.tax || {};
  const set = (patch: Partial<ProductTax>) => onChange({ tax: { ...t, ...patch } });
  const ncmLen = onlyDigits(t.ncm).length;
  const cestLen = onlyDigits(t.cest).length;
  const cfop = onlyDigits(t.cfop);
  const cfopBad = cfop.length > 0 && (cfop.length !== 4 || !/^[123567]/.test(cfop));
  const rate = (label: string, key: 'icms_rate' | 'ipi_rate' | 'pis_rate' | 'cofins_rate') => (
    <div>
      <label className={lbl}>{label} (%)</label>
      <Input type="number" step="0.01" min="0" value={t[key] ?? ''} onChange={(e) => set({ [key]: num(e.target.value) } as Partial<ProductTax>)} />
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[color:var(--sll-b-brand-border)] bg-[color:var(--sll-b-brand-soft)] p-3 text-sm text-[color:var(--sll-b-brand)]">
        Preencha somente se for emitir nota fiscal. O NCM e o CEST da variação (botão Dados) têm prioridade; os daqui valem para as variações que não têm os seus. Produtos vindos da Yampi já trazem o NCM.
      </div>
      <div>
        <label className={lbl}>Origem da mercadoria</label>
        <select className={sel} value={t.origin ?? '0'} onChange={(e) => set({ origin: e.target.value })}>
          {ORIGINS.map((o) => <option key={o} value={o.slice(0, 1)}>{o}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={lbl}>NCM</label>
          <Input inputMode="numeric" maxLength={10} placeholder="0000.00.00" value={formatNcm(t.ncm)} onChange={(e) => set({ ncm: onlyDigits(e.target.value).slice(0, 8) })} />
          {ncmLen > 0 && ncmLen !== 8 && <p className={err}>O NCM precisa ter 8 dígitos.</p>}
        </div>
        <div>
          <label className={lbl}>CEST</label>
          <Input inputMode="numeric" maxLength={9} placeholder="00.000.00" value={formatCest(t.cest)} onChange={(e) => set({ cest: onlyDigits(e.target.value).slice(0, 7) })} />
          {cestLen > 0 && cestLen !== 7 && <p className={err}>O CEST precisa ter 7 dígitos.</p>}
          {cestLen === 0 && <p className={hint}>Opcional. Só para produtos com substituição tributária.</p>}
        </div>
        <div>
          <label className={lbl}>CFOP</label>
          <Input inputMode="numeric" maxLength={4} placeholder="5102" value={formatCfop(t.cfop)} onChange={(e) => set({ cfop: onlyDigits(e.target.value).slice(0, 4) })} />
          {cfopBad && <p className={err}>CFOP com 4 dígitos, começando em 1, 2, 3, 5, 6 ou 7.</p>}
          {!cfopBad && cfop === '' && <p className={hint}>Vazio = usa o CFOP padrão da loja (5102).</p>}
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