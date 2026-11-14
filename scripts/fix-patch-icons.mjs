import fs from 'node:fs';
const p = 'scripts/patch-benefits-widget.mjs';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('const ts = fs.readFileSync(iconsTs');
const b = s.indexOf('if (!Object.keys(icons).length)');
if (a < 0 || b < 0) { console.error('Marcadores nao encontrados'); process.exit(1); }
const e = s.indexOf('\n', b);
const novo = `const iconsFile = path.join(root, 'scripts', 'benefit-icons.json');
if (!fs.existsSync(iconsFile)) { console.error('Rode antes: node scripts/extract-benefit-icons.mjs'); process.exit(1); }
const icons = JSON.parse(fs.readFileSync(iconsFile, 'utf8'));
console.log('Icones embutidos:', Object.keys(icons).length);
if (!Object.keys(icons).length) { console.error('Nenhum icone. Abortado.'); process.exit(1); }`;
fs.writeFileSync(p, s.slice(0, a) + novo + s.slice(e));
console.log('Patch corrigido');
