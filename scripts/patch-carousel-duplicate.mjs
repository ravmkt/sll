import fs from 'node:fs';

const P = 'src/modules/pulse/components/widgets/CarouselModal.tsx';
let s = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (s.includes('asNew')) { console.log('Ja aplicado.'); process.exit(0); }
const orig = s;

function edit(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('ancora encontrada ' + n + 'x: ' + a.slice(0, 80)); process.exit(1); }
  s = s.replace(a, () => b);
}

edit(`import { ArrowDown, ArrowUp, ImagePlus, Monitor, Smartphone, Trash2, X } from 'lucide-react';`,
     `import { ArrowDown, ArrowUp, Copy, ImagePlus, Monitor, Smartphone, Trash2, X } from 'lucide-react';`);

edit(`const [err, setErr] = useState('');`,
     `const [err, setErr] = useState('');\n  const [asNew, setAsNew] = useState(false);`);

edit(`const btnSel = (on: boolean) =>`,
     `function duplicate() {
    setAsNew(true);
    setName(name.trim() + ' (cópia)');
    setActive(false);
    setErr('');
  }

  const btnSel = (on: boolean) =>`);

edit(`id: initial?.id ?? null, name: name.trim()`,
     `id: asNew ? null : (initial?.id ?? null), name: name.trim()`);

edit(`{initial ? 'Editar carrossel' : 'Novo carrossel'}`,
     `{asNew ? 'Novo carrossel (cópia)' : initial ? 'Editar carrossel' : 'Novo carrossel'}`);

edit(`<button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>`,
     `{initial && !asNew && (
                  <button type="button" onClick={duplicate} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                    <Copy className="h-4 w-4" /> Duplicar
                  </button>
                )}
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>`);

fs.writeFileSync(P + '.bak', orig);
fs.writeFileSync(P, s);
console.log('OK: ' + P);
