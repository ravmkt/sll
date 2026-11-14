(function () {
  if (window.__SLL_WIDGETS__) return;
  window.__SLL_WIDGETS__ = true;
  var VERSION = "1.0.0";
  var cur = document.currentScript;
  var cfg = window.VIDLYTICS_CONFIG || {};
  var STORE = window.SLL_STORE_ID || (cur && cur.getAttribute("data-store-id"));
  var API = cfg.supabaseUrl;
  var KEY = cfg.anonKey;
  if (!STORE || !API || !KEY) return;

  var device = window.innerWidth < 768 ? "mobile" : "desktop";
  var sid = sessionStorage.getItem("sll_sid") || (Math.random().toString(36).slice(2) + Date.now().toString(36));
  sessionStorage.setItem("sll_sid", sid);

  function rpc(fn, body) {
    return fetch(API + "/rest/v1/rpc/" + fn, {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", apikey: KEY, Authorization: "Bearer " + KEY },
      body: JSON.stringify(body)
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function track(id, ev) {
    rpc("widgets_track", { p_widget: id, p_event: ev, p_session: sid, p_url: location.href, p_device: device });
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function allowed(w) {
    var t = w.targeting || {}, url = location.href;
    if (t.devices && t.devices.indexOf(device) === -1) return false;
    if (t.url_contains && t.url_contains.length && !t.url_contains.some(function (u) { return url.indexOf(u) > -1; })) return false;
    if (t.url_excludes && t.url_excludes.some(function (u) { return url.indexOf(u) > -1; })) return false;
    var f = t.frequency || { mode: "session" }, k = "sll_w_" + w.id;
    if (f.mode === "session" && sessionStorage.getItem(k)) return false;
    if (f.mode === "days") {
      var last = +localStorage.getItem(k) || 0;
      if (Date.now() - last < (f.days || 1) * 864e5) return false;
    }
    return true;
  }
  function markShown(w) {
    var k = "sll_w_" + w.id;
    sessionStorage.setItem(k, "1"); localStorage.setItem(k, String(Date.now()));
  }

  function mount(w, html, css) {
    var host = document.createElement("div");
    host.setAttribute("data-sll-widget", w.id);
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML = "<style>*{box-sizing:border-box;font-family:system-ui,sans-serif}" + css + "</style>" + html;
    document.body.appendChild(host);
    function close() { host.remove(); track(w.id, "close"); }
    root.querySelectorAll("[data-close]").forEach(function (e) { e.addEventListener("click", close); });
    root.querySelectorAll("[data-cta]").forEach(function (e) { e.addEventListener("click", function () { track(w.id, "click"); }); });
    track(w.id, "impression"); markShown(w);
    return root;
  }

  var R = {
    popup: function (w) {
      var c = w.config;
      mount(w,
        '<div class="ov"><div class="box"><button class="x" data-close>×</button><h2>' + esc(c.title) + '</h2><p>' + esc(c.text) +
        '</p><a data-cta href="' + esc(c.url || "#") + '">' + esc(c.cta) + '</a></div></div>',
        ".ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483646;display:flex;align-items:center;justify-content:center}" +
        ".box{position:relative;background:" + c.bg + ";color:" + c.color + ";padding:32px;border-radius:12px;max-width:380px;width:90%;text-align:center}" +
        ".x{position:absolute;top:8px;right:12px;background:none;border:0;font-size:24px;cursor:pointer;color:inherit}" +
        "a{display:inline-block;margin-top:12px;padding:12px 24px;border-radius:8px;text-decoration:none;background:" + c.btn_bg + ";color:" + c.btn_color + "}");
    },
    top_bar: function (w) {
      var c = w.config;
      mount(w, '<div class="b"><a data-cta href="' + esc(c.url || "#") + '">' + esc(c.text) + '</a><button data-close>×</button></div>',
        ".b{position:fixed;top:0;left:0;right:0;z-index:2147483645;background:" + c.bg + ";color:" + c.color + ";text-align:center;padding:10px 40px;font-size:14px}" +
        "a{color:inherit;text-decoration:none}button{position:absolute;right:12px;top:6px;background:none;border:0;color:inherit;font-size:20px;cursor:pointer}");
    },
    floating_button: function (w) {
      var c = w.config, side = c.position === "left" ? "left" : "right";
      mount(w, '<a data-cta target="_blank" rel="noopener" href="' + esc(c.url) + '">' + esc(c.label) + '</a>',
        "a{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483645;padding:14px 20px;border-radius:999px;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.25);background:" + c.bg + ";color:" + c.color + "}");
    },
    toast: function (w) {
      var c = w.config, side = c.position === "right" ? "right" : "left";
      mount(w, '<div class="t">' + esc(c.text) + '<button data-close>×</button></div>',
        ".t{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483645;padding:12px 32px 12px 16px;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.2);background:" + c.bg + ";color:" + c.color + ";font-size:14px}" +
        "button{position:absolute;right:6px;top:4px;background:none;border:0;cursor:pointer;color:inherit}");
    },
    countdown: function (w) {
      var c = w.config, end = new Date(c.ends_at).getTime();
      if (!end || end < Date.now()) return;
      var root = mount(w, '<div class="b">' + esc(c.text) + ' <b id="t"></b><button data-close>×</button></div>',
        ".b{position:fixed;top:0;left:0;right:0;z-index:2147483645;background:" + c.bg + ";color:" + c.color + ";text-align:center;padding:10px 40px;font-size:14px}" +
        "button{position:absolute;right:12px;top:6px;background:none;border:0;color:inherit;font-size:20px;cursor:pointer}");
      var el = root.getElementById("t");
      (function tick() {
        var s = Math.max(0, Math.floor((end - Date.now()) / 1000));
        el.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(function (n) { return String(n).padStart(2, "0"); }).join(":");
        if (s > 0) setTimeout(tick, 1000);
      })();
    }
  };

  function waitFor(sel, cb, ms) {
    var find = function () { try { return document.querySelector(sel); } catch (e) { return null; } };
    var el = find();
    if (el) return cb(el);
    var mo = new MutationObserver(function () {
      var e = find();
      if (e) { mo.disconnect(); cb(e); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, ms || 10000);
  }

  R.tier_ruler = function (w) {
    var c = w.config || {}, pl = c.placement || {};
    if (!pl.selector || !Array.isArray(c.tiers)) return;
    var col = function (v, d) { return /^#[0-9a-f]{3,8}$/i.test(v || "") ? v : d; };
    var bg = col(c.bg, "#0b0b0b"), card = col(c.card, "#17150f"), border = col(c.border, "#c9a84c"),
        accent = col(c.accent, "#c9a84c"), text = col(c.text, "#ffffff"), muted = col(c.muted, "#9aa3b2");
    var cards = c.tiers.map(function (t) {
      return '<div class="c' + (t.highlight ? ' h' : '') + '"><div class="l">' + esc(t.label) + '</div><div class="v">' +
        esc(t.value) + '</div><div class="n">' + esc(t.note) + '</div></div>';
    }).join("");
    var css = ":host{display:block}.w{background:" + bg + ";padding:24px 12px}" +
      ".g{display:grid;grid-template-columns:repeat(" + Math.min(c.tiers.length, 4) + ",1fr);gap:16px;max-width:1200px;margin:0 auto}" +
      ".c{background:linear-gradient(180deg," + card + ",#0f0e0a);border:1px solid " + border + ";border-radius:12px;padding:22px 12px;text-align:center}" +
      ".c.h{border-color:" + text + ";box-shadow:0 0 24px rgba(201,168,76,.18);transform:scale(1.02)}" +
      ".l{font-size:11px;letter-spacing:.12em;color:#cfd6e4}" +
      ".v{font:900 34px/1.2 'Arial Black',Impact,sans-serif;color:" + accent + ";margin:10px 0}.h .v{color:" + text + "}" +
      ".n{font-size:12px;color:" + muted + "}" +
      ".f{text-align:center;margin-top:14px;font-size:12px;color:#e8c26a}" +
      "@media(max-width:768px){.g{gap:8px}.c{padding:14px 6px}.c.h{transform:none}.v{font-size:20px}.l{font-size:9px}.n{font-size:10px}}";
    waitFor(pl.selector, function (target) {
      if (document.querySelector('[data-sll-widget="' + w.id + '"]')) return;
      var host = document.createElement("div");
      host.setAttribute("data-sll-widget", w.id);
      var root = host.attachShadow({ mode: "open" });
      root.innerHTML = "<style>*{box-sizing:border-box;font-family:system-ui,sans-serif}" + css + "</style>" +
        '<div class="w"><div class="g">' + cards + '</div>' + (c.footer ? '<div class="f">' + esc(c.footer) + '</div>' : '') + '</div>';
      var pos = { before: "beforebegin", after: "afterend", prepend: "afterbegin", append: "beforeend" }[pl.position] || "afterend";
      target.insertAdjacentElement(pos, host);
      var k = "sll_imp_" + w.id;
      if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); track(w.id, "impression"); }
    });
  };
  function schedule(w) {
    var t = w.trigger || { type: "delay", seconds: 0 };
    var fire = function () { if (R[w.type] && allowed(w)) R[w.type](w); };
    if (t.type === "delay") setTimeout(fire, (t.seconds || 0) * 1000);
    else if (t.type === "scroll") {
      var h = function () {
        var p = (window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)) * 100;
        if (p >= (t.percent || 50)) { window.removeEventListener("scroll", h); fire(); }
      };
      window.addEventListener("scroll", h, { passive: true });
    } else if (t.type === "exit_intent") {
      var m = function (e) { if (e.clientY <= 0) { document.removeEventListener("mouseout", m); fire(); } };
      document.addEventListener("mouseout", m);
    } else if (t.type === "click" && t.selector) {
      document.addEventListener("click", function (e) { if (e.target.closest(t.selector)) fire(); });
    }
  }

  rpc("widgets_get_config", { p_store: STORE, p_version: VERSION, p_url: location.href }).then(function (list) {
    if (Array.isArray(list)) list.forEach(schedule);
  });
})();
