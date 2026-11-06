(function () {
  var cur = document.currentScript;
  if (!cur || !cur.src) return;
  var s = document.createElement('script');
  s.src = cur.src.replace('livecommerce-widget.js', 'streamsell-widgets.js');
  for (var i = 0; i < cur.attributes.length; i++) {
    var a = cur.attributes[i];
    if (a.name.indexOf('data-') === 0) s.setAttribute(a.name, a.value);
  }
  s.async = true;
  document.head.appendChild(s);
})();