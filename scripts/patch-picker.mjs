import fs from 'node:fs';
import vm from 'node:vm';
const p = 'public/widgets-widget.js';
let s = fs.readFileSync(p, 'utf8');
const a = "{ startPicker(token); return; }";
const n = s.split(a).length - 1;
if (n !== 1) { console.error('Ancora encontrada ' + n + 'x. Nada gravado.'); process.exit(1); }
s = s.replace(a, "{ startPicker(token); }");
try { new vm.Script(s); } catch (e) { console.error('Sintaxe invalida:', e.message); process.exit(1); }
fs.copyFileSync(p, p + '.bak2');
fs.writeFileSync(p, s);
console.log('OK: seletor agora convive com os cards da loja');
