import fs from 'node:fs';
const P = 'src/modules/pulse/components/widgets/ReviewModal.tsx';
let s = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (s.includes('scrub-feminino-confort*')) { console.log('Ja aplicado.'); process.exit(0); }
function edit(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('ancora encontrada ' + n + 'x: ' + a); process.exit(1); }
  s = s.replace(a, () => b);
}
edit('<span className={lbl}>Produto (slug, ID ou SKU)</span>',
     '<span className={lbl}>Produto (slug da URL; use * para várias cores)</span>');
edit('placeholder="camiseta-x"', 'placeholder="scrub-feminino-confort*"');
fs.writeFileSync(P + '.bak', fs.readFileSync(P));
fs.writeFileSync(P, s);
console.log('OK: ' + P);
