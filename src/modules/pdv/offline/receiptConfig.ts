export type Paper = '58' | '80' | '100' | 'a4';

const KEY = 'sll-pdv-paper';

export function getPaper(): Paper {
  try {
    const v = localStorage.getItem(KEY);
    if (v === '58' || v === '80' || v === '100' || v === 'a4') return v;
  } catch { /* ignora */ }
  return '100';
}

export function setPaper(p: Paper): void {
  try { localStorage.setItem(KEY, p); } catch { /* ignora */ }
}

export function receiptCss(p: Paper): string {
  if (p === 'a4') {
    return '@page{size:A4;margin:15mm}body{margin:0;font:12pt Arial,sans-serif}';
  }
  if (p === '100') {
    return '@page{size:100mm 150mm;margin:4mm}body{margin:0;width:92mm;font:11pt "Courier New",monospace}';
  }
  const mm = p === '58' ? 58 : 80;
  const width = p === '58' ? '48mm' : '72mm';
  const font = p === '58' ? '9pt' : '10pt';
  return `@page{size:${mm}mm auto;margin:2mm}body{margin:0;width:${width};font:${font} "Courier New",monospace}`;
}

/** Imprime o HTML do recibo num iframe oculto, usando a largura de papel escolhida. */
export function printReceipt(bodyHtml: string, paper: Paper = getPaper()): void {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) { frame.remove(); return; }
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${receiptCss(paper)}</style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  const win = frame.contentWindow;
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1500);
  }, 250);
}