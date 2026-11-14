import fs from 'fs';
const src = fs.readFileSync('src/modules/pulse/lib/benefitIcons.ts', 'utf8');
const re = /I\('([a-z0-9-]+)',\s*'([^']*)',\s*'((?:[^'\\]|\\.)*)'\)/g;
const icons = {};
let m;
while ((m = re.exec(src))) icons[m[1]] = m[3];
const n = Object.keys(icons).length;
console.log('Icones extraidos:', n, '(esperado: 31)');
if (n !== 31) { console.error('Quantidade diferente do esperado'); process.exit(1); }
fs.writeFileSync('scripts/benefit-icons.json', JSON.stringify(icons));
console.log('Gravado: scripts/benefit-icons.json');
