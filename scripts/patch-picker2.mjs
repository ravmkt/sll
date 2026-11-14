import fs from 'node:fs';
import vm from 'node:vm';
const p = 'public/widgets-widget.js';
let s = fs.readFileSync(p, 'utf8');
const orig = s;
function rep(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('Ancora encontrada ' + n + 'x: ' + a.slice(0, 70)); process.exit(1); }
  s = s.replace(a, () => b);
}
rep("function startPicker(token) {",
`function pickTarget(e, host) {
    var list = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [e.target];
    var vw = window.innerWidth, vh = window.innerHeight;
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!el || el === host || host.contains(el)) continue;
      if (el === document.documentElement || el === document.body) continue;
      if (el.closest && el.closest('[id^="sll-pk-"]')) continue;
      var cs = window.getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'absolute') {
        var r = el.getBoundingClientRect();
        if (r.width >= vw * 0.9 && r.height >= vh * 0.9) continue;
      }
      return el;
    }
    return e.target;
  }
  function startPicker(token) {`);
rep("var r = e.target.getBoundingClientRect();", "var r = pickTarget(e, host).getBoundingClientRect();");
rep("chosen = buildSelector(e.target);", "chosen = buildSelector(pickTarget(e, host));");
try { new vm.Script(s); } catch (e) { console.error('Sintaxe invalida:', e.message); process.exit(1); }
fs.writeFileSync(p + '.bak3', orig);
fs.writeFileSync(p, s);
console.log('OK: picker ignora camadas de tela cheia');
