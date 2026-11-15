import fs from 'node:fs';
import path from 'node:path';

const A = "var PRESETS = [\n";
const B = A + "      ['section[class*=\"product_similars\"]', 'after'],\n";
let done = 0;
for (const f of fs.readdirSync('public')) {
  if (!/widgets.*\.js$/i.test(f)) continue;
  const p = path.join('public', f);
  let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  if (!s.includes('function sllFindAnchor')) continue;
  if (s.includes('product_similars')) { console.log('Ja aplicado: ' + p); done++; continue; }
  const n = s.split(A).length - 1;
  if (n !== 1) { console.error('ancora encontrada ' + n + 'x em ' + p); process.exit(1); }
  s = s.replace(A, () => B);
  try { new Function(s); } catch (e) { console.error('Sintaxe invalida: ' + e.message); process.exit(1); }
  fs.writeFileSync(p + '.bak', fs.readFileSync(p));
  fs.writeFileSync(p, s);
  console.log('OK: ' + p);
  done++;
}
if (!done) { console.error('Loader com sllFindAnchor nao encontrado (rode antes o patch de deteccao generica).'); process.exit(1); }
