(function (w) {
  var OK = { svg: 1, path: 1, circle: 1, rect: 1, line: 1, polyline: 1, polygon: 1, ellipse: 1, g: 1 };

  function sanitizeSvg(src) {
    if (!src) return '';
    try {
      var doc = new DOMParser().parseFromString(src, 'image/svg+xml');
      var root = doc.documentElement;
      if (!root || root.nodeName.toLowerCase() !== 'svg') return '';
      var all = root.querySelectorAll('*');
      for (var i = all.length - 1; i >= 0; i--) {
        var el = all[i];
        if (!OK[el.nodeName.toLowerCase()]) { el.parentNode.removeChild(el); continue; }
        for (var j = el.attributes.length - 1; j >= 0; j--) {
          var n = el.attributes[j].name.toLowerCase();
          if (n.indexOf('on') === 0 || n.indexOf('href') !== -1) el.removeAttribute(el.attributes[j].name);
        }
      }
      root.setAttribute('width', '100%');
      root.setAttribute('height', '100%');
      return new XMLSerializer().serializeToString(root);
    } catch (e) { return ''; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  w.SLLBenefits = {
    css: [
      '.sll-bn{display:flex;align-items:center;gap:10px;min-width:0}',
      '.sll-bn[data-pos="top"]{flex-direction:column;text-align:center;justify-content:center}',
      '.sll-bn[data-pos="right"]{flex-direction:row-reverse}',
      '.sll-bn__ic{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;box-sizing:border-box}',
      '.sll-bn__ic[data-bg="circle"]{border-radius:50%}',
      '.sll-bn__ic[data-bg="square"]{border-radius:8px}',
      '.sll-bn__ic svg{display:block}',
      '.sll-bn__t{font-weight:600;line-height:1.2}',
      '.sll-bn__s{font-size:.82em;opacity:.8;line-height:1.2}'
    ].join(''),

    iconHtml: function (it) {
      var svg = sanitizeSvg(it.icon_svg);
      if (!svg || !it.icon_size) return '';
      var size = Number(it.icon_size) || 28;
      var hasBg = it.icon_bg && it.icon_bg !== 'none';
      var box = hasBg ? Math.round(size * 1.9) : size;
      var st = 'width:' + box + 'px;height:' + box + 'px;color:' + esc(it.icon_color || 'currentColor') + ';';
      if (hasBg && it.icon_bg_color) st += 'background:' + esc(it.icon_bg_color) + ';';
      var inner = hasBg ? '<span style="display:block;width:' + size + 'px;height:' + size + 'px">' + svg + '</span>' : svg;
      return '<span class="sll-bn__ic" data-bg="' + esc(it.icon_bg || 'none') + '" style="' + st + '">' + inner + '</span>';
    },

    itemHtml: function (it) {
      var pos = ['top', 'left', 'right'].indexOf(it.icon_position) > -1 ? it.icon_position : 'left';
      var text = '<span class="sll-bn__txt"><span class="sll-bn__t">' + esc(it.title) + '</span>' +
        (it.subtitle ? '<br><span class="sll-bn__s">' + esc(it.subtitle) + '</span>' : '') + '</span>';
      return '<div class="sll-bn" data-pos="' + pos + '">' + this.iconHtml(it) + text + '</div>';
    }
  };
})(window);
