import fs from 'node:fs';
const p = 'src/modules/pulse/components/widgets/BenefitsModal.tsx';
let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const orig = s;
function rep(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('Ancora encontrada ' + n + 'x: ' + a.slice(0, 70)); process.exit(1); }
  s = s.replace(a, () => b);
}

// 1) icones
rep("import { Monitor, Plus, Smartphone, Trash2, X } from 'lucide-react';",
    "import { ArrowDown, ArrowUp, Monitor, Plus, Smartphone, Trash2, X } from 'lucide-react';");

// 2) campo de cor padrao (quadradinho + hexadecimal)
const a = s.indexOf('function Color(');
const b = s.indexOf('interface Props');
if (a < 0 || b < 0 || b < a) { console.error('Bloco Color nao encontrado'); process.exit(1); }
s = s.slice(0, a) + s.slice(b);
rep("import BenefitsBarPreview from './BenefitsBarPreview';",
    "import BenefitsBarPreview from './BenefitsBarPreview';\nimport { ColorField as Color } from './RulerConfigControls';");

// 3) templates 1, 2 e 3
rep("BENEFIT_TEMPLATES.map((t) => (", "BENEFIT_TEMPLATES.map((t, ti) => (");
rep('<div className="text-sm font-bold text-slate-800">{t.name}</div>',
    '<div className="text-sm font-bold text-slate-800">Template {ti + 1}</div>');
const descRe = /\n[ \t]*<div className="mt-0\.5 text-xs text-slate-500">\{t\.description\}<\/div>/;
if (!descRe.test(s)) { console.error('Linha da descricao do template nao encontrada'); process.exit(1); }
s = s.replace(descRe, '');

// 4) reordenar
rep("const filled = items.filter(",
`const moveItem = (i: number, dir: -1 | 1) => setItems((l) => {
    const j = i + dir;
    if (j < 0 || j >= l.length) return l;
    const c = [...l];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });
  const filled = items.filter(`);
rep('<button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))}',
`<div className="flex flex-col gap-1">
                            <button type="button" disabled={i === 0} onClick={() => moveItem(i, -1)} aria-label="Mover para cima"
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" disabled={i === items.length - 1} onClick={() => moveItem(i, 1)} aria-label="Mover para baixo"
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                          </div>
                          <button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))}`);

fs.writeFileSync(p + '.bak', orig);
fs.writeFileSync(p, s);
console.log('OK: BenefitsModal atualizado (backup .bak)');
