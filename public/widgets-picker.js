(function () {
  var m = window.location.search.match(/[?&]sllPickToken=([^&]+)/);
  if (!m || document.getElementById("sll-pk-overlay")) return;
  var token = decodeURIComponent(m[1]);

  var overlay = document.createElement("div");
  overlay.id = "sll-pk-overlay";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999997;background:rgba(0,0,0,.05);cursor:crosshair;";
  var banner = document.createElement("div");
  banner.id = "sll-pk-banner";
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999998;background:#1e293b;color:#fff;padding:12px 20px;font-family:sans-serif;font-size:14px;font-weight:600;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.2);";
  banner.textContent = "Clique no elemento onde o widget será exibido (Esc para cancelar)";
  var hl = document.createElement("div");
  hl.id = "sll-pk-highlight";
  hl.style.cssText = "position:fixed;z-index:9999996;pointer-events:none;border:3px solid #3b82f6;border-radius:4px;background:rgba(59,130,246,.08);display:none;transition:all .1s ease;";
  document.body.appendChild(overlay);
  document.body.appendChild(banner);
  document.body.appendChild(hl);

  var current = null;

  function cleanup() {
    [overlay, banner, hl].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    document.removeEventListener("keydown", onKey, true);
  }
  function onKey(e) { if (e.key === "Escape") cleanup(); }
  document.addEventListener("keydown", onKey, true);

  function buildSelector(el) {
    var path = [];
    var ignore = /(?:^|-)(active|loading|loaded|current|selected|focus|hover|disabled|show|hide|visible|hidden|open|close|transition|anim|js-|svelte-|ng-|v-|css-|jsx-|_temp|swiper-slide|slick-slide)/i;
    while (el && el !== document.body && el !== document.documentElement) {
      var sel = el.tagName ? el.tagName.toLowerCase() : "";
      if (el.id && typeof el.id === "string" && !/^(?:[0-9]+|__next|__nuxt|ember|meteor|react-)/.test(el.id)) {
        path.unshift(sel + "#" + el.id);
        break;
      }
      if (el.className && typeof el.className === "string") {
        var cls = el.className.trim().split(/\s+/).filter(function (c) {
          return c && !c.startsWith("vl-") && !c.startsWith("sll-") && !ignore.test(c) && c.length > 2;
        });
        if (cls.length) sel += "." + cls.slice(0, 2).join(".");
      }
      var parent = el.parentElement;
      if (parent) {
        var sib = Array.from(parent.children).filter(function (s) { return s.tagName === el.tagName; });
        if (sib.length > 1) sel += ":nth-of-type(" + (sib.indexOf(el) + 1) + ")";
      }
      path.unshift(sel);
      el = el.parentElement;
    }
    return path.join(" > ");
  }

  function send(selector) {
    var cfg = window.VIDLYTICS_CONFIG || {};
    var base = (cfg.supabaseUrl || "https://flivmllysdhaydhogmhg.supabase.co").replace(/\/rest\/v1.*/, "").replace(/\/+$/, "");
    var key = cfg.supabaseAnonKey || cfg.anonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaXZtbGx5c2RoYXlkaG9nbWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODY1MTYsImV4cCI6MjA5ODY2MjUxNn0.ye92mnf-5ws78H8A9fSGkf2xGo5q0FoB2oq91v7HFG0";
    fetch(base + "/rest/v1/rpc/widgets_selector_submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: "Bearer " + key },
      body: JSON.stringify({ p_token: token, p_selector: selector })
    }).then(function (res) {
      if (res.ok) {
        alert("Seletor vinculado com sucesso!\n\nVolte para o painel do SLL Hub para continuar.");
        if (window.opener) window.close();
      } else {
        return res.text().then(function (t) { alert("Erro " + res.status + ": " + t); });
      }
    }).catch(function () { alert("Erro de conexão. Tente novamente."); });
  }

  overlay.addEventListener("mousemove", function (e) {
    overlay.style.display = "none";
    var el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.display = "";
    if (!el || el === banner || el === hl || el === overlay) return;
    if (el !== current) {
      current = el;
      var r = el.getBoundingClientRect();
      hl.style.display = "";
      hl.style.top = r.top + "px";
      hl.style.left = r.left + "px";
      hl.style.width = r.width + "px";
      hl.style.height = r.height + "px";
    }
  });

  overlay.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    var el = current;
    if (!el) {
      overlay.style.display = "none";
      el = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.display = "";
    }
    if (!el || el === banner || el === hl || el === overlay) return;
    var selector = buildSelector(el);
    cleanup();
    send(selector);
  });
})();
