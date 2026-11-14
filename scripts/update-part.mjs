import fs from 'node:fs';
const p = 'scripts/benefits-widget.part.js';
let s = fs.readFileSync(p, 'utf8');
function rep(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('Ancora encontrada ' + n + 'x: ' + a); process.exit(1); }
  s = s.split(a).join(b);
}
rep("function bTexts(t) {", `function bCustom(raw, size, color) {
  if (!raw) return '';
  var TAGS = { path: 1, circle: 1, rect: 1, line: 1, polyline: 1, polygon: 1, ellipse: 1, g: 1 };
  var ATTRS = { d: 1, cx: 1, cy: 1, r: 1, rx: 1, ry: 1, x: 1, y: 1, x1: 1, x2: 1, y1: 1, y2: 1, width: 1, height: 1, points: 1, fill: 1, stroke: 1, 'stroke-width': 1, 'stroke-linecap': 1, 'stroke-linejoin': 1, transform: 1, opacity: 1 };
  var doc;
  try { doc = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + String(raw).replace(/<\\/?svg[^>]*>/gi, '') + '</svg>', 'image/svg+xml'); } catch (e) { return ''; }
  var root = doc.documentElement;
  if (!root || root.nodeName !== 'svg' || doc.querySelector('parsererror')) return '';
  function clean(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType !== 1) { node.removeChild(c); return; }
      if (!TAGS[c.nodeName.toLowerCase()]) { node.removeChild(c); return; }
      Array.prototype.slice.call(c.attributes).forEach(function (at) {
        if (!ATTRS[at.name] || /url\\(|javascript/i.test(at.value)) c.removeAttribute(at.name);
      });
      clean(c);
    });
  }
  clean(root);
  var inner = Array.prototype.map.call(root.childNodes, function (c) { return new XMLSerializer().serializeToString(c); }).join('');
  if (!inner) return '';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color +
    '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}
function bTexts(t) {`);
rep("return x.title || x.desc || t.icon || t.icon_name;", "return x.title || x.desc || t.icon || t.icon_name || t.icon_svg;");
rep("var itemBg = bColor(pick(['item_bg_color', 'card_bg_color'], 'transparent'), 'transparent');",
    "var itemBg = bColor(pick(['item_bg_color', 'card_bg_color'], d.item_card ? 'rgba(127,127,127,.08)' : 'transparent'), 'transparent');");
rep("pick(['title_color', 'text_color'], '#0F172A')", "pick(['title_color', 'text', 'text_color'], '#0F172A')");
rep("pick(['desc_color', 'description_color'], '#64748B')", "pick(['desc_color', 'sub', 'description_color'], '#64748B')");
rep("pick(['border_width'], 0)", "pick(['border_width'], d.border ? 1 : 0)");
rep("pick(['border_color'], '#E2E8F0')", "pick(['border_color', 'border'], '#E2E8F0')");
rep("var carousel = n > vis;", "var carousel = n > vis && d.mobile !== 'stack';");
rep("Math.max(1, Math.min(n, Math.ceil(vis)))", "(d.mobile === 'stack' ? 1 : Math.max(1, Math.min(n, Math.ceil(vis))))");
rep("'.sll-b-dots{display:none}' +", "'.sll-b-dots{display:none}' + (d.divider ? '@media (min-width:769px){.sll-b-item + .sll-b-item{border-left:1px solid ' + bc + '}}' : '') +");
rep("var dir = pos === 'top'", "var itemBorder = d.item_card ? 'border:1px solid ' + bc + ';' : '';\n    var dir = pos === 'top'");
rep("';text-decoration:none;' + dir);", "';text-decoration:none;' + itemBorder + dir);");
rep("if (size > 0 && ic) {", "if (size > 0 && (ic || t.icon_svg)) {");
rep("var svg = bIcon(ic, size, bColor(t.icon_color, accent));", "var svg = bCustom(t.icon_svg, size, bColor(t.icon_color, accent)) || bIcon(ic, size, bColor(t.icon_color, accent));");
fs.writeFileSync(p, s);
console.log('part atualizado');
