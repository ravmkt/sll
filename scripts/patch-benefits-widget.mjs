import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const widgetPath = path.join(root, 'public', 'widgets-widget.js');
const iconsTs = path.join(root, 'src', 'modules', 'pulse', 'lib', 'benefitIcons.ts');
const partPath = path.join(root, 'scripts', 'benefits-widget.part.js');
const lucideDir = path.join(root, 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const kebabNum = (s) => kebab(s).replace(/([a-z])(\d)/g, '$1-$2');

// ---- ícones
const iconsFile = path.join(root, 'scripts', 'benefit-icons.json');
if (!fs.existsSync(iconsFile)) { console.error('Rode antes: node scripts/extract-benefit-icons.mjs'); process.exit(1); }
const icons = JSON.parse(fs.readFileSync(iconsFile, 'utf8'));
console.log('Icones embutidos:', Object.keys(icons).length);
if (!Object.keys(icons).length) { console.error('Nenhum icone. Abortado.'); process.exit(1); }

// ---- patch
let js = fs.readFileSync(widgetPath, 'utf8');
const original = js;
let part = fs.readFileSync(partPath, 'utf8');
part = part.replace('/*ICONS*/{}/*ICONS_END*/', () => JSON.stringify(icons));

js = js.replace(/\/\* SLL_BENEFITS_START \*\/[\s\S]*?\/\* SLL_BENEFITS_END \*\/\s*/g, '');

function patch(re, fn, label) {
  const hits = js.match(new RegExp(re.source, 'g')) || [];
  if (hits.length !== 1) { console.error('Ancora "' + label + '" encontrada ' + hits.length + 'x (esperado 1). Nada foi gravado.'); process.exit(1); }
  js = js.replace(re, fn);
}
patch(/function\s+buildRuler\(conf\)\s*\{/, (m) => part + '\n  ' + m, 'buildRuler');
if (!/function\s+mount\(conf,\s*builder\)/.test(js)) {
  patch(/function\s+mount\(conf\)\s*\{/, () => 'function mount(conf, builder) {', 'mount');
  patch(/var host = buildRuler\(conf\);/, () => 'var host = (builder || buildRuler)(conf);', 'host');
}
if (!/c\.kind === 'benefits' \? buildBenefits/.test(js)) {
  patch(/list\.forEach\(function \(c\) \{ mount\(\{ ruler: c, style: c\.style \|\| conf\.style \}\); \}\);/,
    () => "list.forEach(function (c) { mount({ ruler: c, style: c.style || conf.style }, c.kind === 'benefits' ? buildBenefits : null); });", 'init');
}

try { new vm.Script(js); } catch (e) { console.error('Erro de sintaxe no resultado. Nada gravado:', e.message); process.exit(1); }
fs.writeFileSync(widgetPath + '.bak', original);
fs.writeFileSync(widgetPath, js);
console.log('OK: public/widgets-widget.js atualizado (backup: widgets-widget.js.bak)');