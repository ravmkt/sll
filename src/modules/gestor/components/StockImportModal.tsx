import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import { Download, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import { Modal } from '@/components/products/Modal';
import { cn } from '@/lib/utils';

export const IMPORT_MAX_MB = 5;
export const IMPORT_MAX_ROWS = 20000;

async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const rows: (string | number)[][] = [
    ['SKU', 'Produto', 'Variação', 'Saldo atual', 'Novo saldo'],
    ['0012345', '(EXEMPLO) Caneca Branca 300ml', '', 12, 30],
    ['CAM-PRETA-P', '(EXEMPLO) Camiseta Básica Preta', 'P', 5, 20],
    ['CAM-PRETA-M', '(EXEMPLO) Camiseta Básica Preta', 'M', 8, 0],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 36 }, { wch: 12 }, { wch: 13 }, { wch: 13 }];

  const help = XLSX.utils.aoa_to_sheet([
    ['Como preencher'],
    ['1. Apague as 3 linhas de exemplo (marcadas com "EXEMPLO") ou substitua pelos seus produtos.'],
    ['2. SKU: o código exato do produto ou da variação. É ele que identifica o item. Não altere os códigos que vieram da planilha baixada na tela Estoque.'],
    ['3. Produto simples: uma linha, com a coluna Variação vazia (exemplo da Caneca).'],
    ['4. Produto com variações: uma linha por variação, cada uma com o seu SKU (exemplo da Camiseta, tamanhos P e M).'],
    ['5. Novo saldo: apenas números inteiros, de 0 para cima. Escreva 10, não 10,5 nem "10 un.". O zero é válido e zera o estoque.'],
    ['6. Linhas com Novo saldo em branco são ignoradas. Produtos que não estão na planilha não mudam.'],
    ['7. Saldo atual e Produto são só para você se orientar. O sistema lê apenas SKU e Novo saldo.'],
    ['8. Códigos com zero à esquerda (ex.: 0012345): se o programa tirar o zero, formate a coluna SKU como Texto.'],
    ['Os SKUs de exemplo não existem na sua loja e aparecerão como "SKU não encontrado" na prévia, sem gravar nada.'],
    ['Este arquivo funciona no Excel e no Google Sheets.'],
  ]);
  help['!cols'] = [{ wch: 110 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
  XLSX.utils.book_append_sheet(wb, help, 'Instruções');
  XLSX.writeFile(wb, 'modelo-importacao-estoque.xlsx', { compression: true });
}

type Props = { onClose: () => void; onPick: (file: File) => Promise<void> | void };

export default function StockImportModal({ onClose, onPick }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tplBusy, setTplBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setErr('Formato não aceito. Use um arquivo .xlsx, .xls ou .csv.'); return; }
    if (file.size > IMPORT_MAX_MB * 1024 * 1024) { setErr(`Arquivo muito grande. O máximo é ${IMPORT_MAX_MB} MB.`); return; }
    setErr('');
    setBusy(true);
    try { await onPick(file); } finally { setBusy(false); }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (busy) return;
    const files = e.dataTransfer.files;
    if (files.length > 1) { setErr('Envie um arquivo por vez.'); return; }
    void pick(files[0]);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); }
  };

  const template = async () => {
    setTplBusy(true);
    try { await downloadTemplate(); } catch { setErr('Não foi possível gerar a planilha modelo.'); }
    finally { setTplBusy(false); }
  };

  return (
    <Modal title="Importar estoque" onClose={onClose}>
      <div className="space-y-4 p-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={onKey}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
            over ? 'border-[#0094eb] bg-[#0094eb]/10' : 'border-slate-300 bg-slate-50 hover:border-[#0094eb] dark:border-slate-700 dark:bg-[#111524]',
          )}
        >
          {busy ? <Loader2 size={32} className="animate-spin text-[#0094eb]" /> : <UploadCloud size={32} className="text-[#0094eb]" />}
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {busy ? 'Lendo a planilha...' : 'Clique para escolher o arquivo ou arraste e solte aqui'}
          </p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        </div>

        {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600">{err}</p>}

        <ul className="space-y-1 text-[12px] text-slate-500">
          <li>Formatos: <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong> (um arquivo por vez).</li>
          <li>Tamanho máximo: <strong>{IMPORT_MAX_MB} MB</strong> e até <strong>{IMPORT_MAX_ROWS.toLocaleString('pt-BR')} linhas</strong>.</li>
          <li>Colunas obrigatórias: <strong>SKU</strong> e <strong>Novo saldo</strong> (número inteiro, de 0 para cima).</li>
          <li>Linhas sem Novo saldo são ignoradas. Nada é gravado antes de você conferir a prévia e clicar em Salvar tudo.</li>
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            disabled={tplBusy}
            onClick={() => void template()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#0094eb] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            {tplBusy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} className="text-[#0094eb]" />}
            <FileSpreadsheet size={15} className="text-[#0094eb]" /> Baixar planilha modelo
          </button>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}