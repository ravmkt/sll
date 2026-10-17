(function() {
  "use strict";
  if (window.__SLL_LOADER_INITIALIZED__) return;
  window.__SLL_LOADER_INITIALIZED__ = true;

  var LOADER_VERSION = "1.1.0";
  var SUPABASE_URL = "https://flivmllysdhaydhogmhg.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_fYM4F5uRs_8DbYF7ozy0hA_eA_Z5XUz";

  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("sll-loader.js") !== -1) return scripts[i];
    }
    return scripts[scripts.length - 1];
  })();

  var storeId = currentScript ? (currentScript.getAttribute("data-store-id") || currentScript.getAttribute("data-store")) : null;
  if (!storeId && window.SLL_STORE_ID) storeId = window.SLL_STORE_ID;
  if (!storeId) {
    var urlParams = new URLSearchParams(window.location.search);
    storeId = urlParams.get("sll_store_id") || urlParams.get("store_id");
  }

  if (!storeId) {
    console.warn("[SLL-Loader] Nenhum store_id identificado.");
    return;
  }

  window.SLL_STORE_ID = storeId;

  // Garante a ponte de configuracao global para o Vidlytics e outros modulos
  window.VIDLYTICS_CONFIG = window.VIDLYTICS_CONFIG || {};
  window.VIDLYTICS_CONFIG.storeId = storeId;
  window.VIDLYTICS_CONFIG.supabaseUrl = SUPABASE_URL;
  window.VIDLYTICS_CONFIG.supabaseAnonKey = SUPABASE_ANON_KEY;
  window.VIDLYTICS_CONFIG.anonKey = SUPABASE_ANON_KEY;

  var baseUrl = "";
  if (currentScript && currentScript.src) {
    var lastSlash = currentScript.src.lastIndexOf("/");
    if (lastSlash !== -1) baseUrl = currentScript.src.substring(0, lastSlash);
  }

  var MODULE_TO_SCRIPT = {
    vidlytics: "vidlytics-widget.js",
    live_commerce: "livecommerce-widget.js",
    gamification: "gamification-widget.js",
    reviews: "reviews-widget.js"
  };

  var loadedModules = [];

  // Ping de saude: avisa o painel Master que o loader rodou (e se houve erro)
  function ping(err) {
    try {
      var key = "sll_ping_" + storeId;
      var now = Date.now();
      if (err) {
        if (sessionStorage.getItem(key + "_err")) return;
        sessionStorage.setItem(key + "_err", "1");
      } else {
        if (now - Number(sessionStorage.getItem(key) || 0) < 1800000) return;
        sessionStorage.setItem(key, String(now));
      }
    } catch (e) { /* sessionStorage indisponivel: envia mesmo assim */ }
    try {
      fetch(SUPABASE_URL + "/rest/v1/rpc/sll_widget_ping", {
        method: "POST",
        keepalive: true,
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_store_id: storeId,
          p_version: LOADER_VERSION,
          p_modules: loadedModules,
          p_page: String(window.location.href).slice(0, 300),
          p_error: err ? String(err).slice(0, 300) : null
        })
      }).catch(function() {});
    } catch (e) { /* nunca quebra a loja do cliente */ }
  }

  function resolveScript(mod) {
    if (typeof mod !== "string" || /[^a-z0-9_-]/i.test(mod)) return null;
    return MODULE_TO_SCRIPT[mod] || (mod + "-widget.js");
  }

  function injectModule(scriptName) {
    var scriptId = "sll-script-" + scriptName.replace(/\.js$/, "");
    if (document.getElementById(scriptId)) return;
    var s = document.createElement("script");
    s.id = scriptId;
    s.src = (baseUrl ? baseUrl + "/" : "/") + scriptName + "?v=" + Math.floor(Date.now() / 600000);
    s.async = true;
    s.setAttribute("data-store-id", storeId);
    s.onerror = function() { ping("script_load_failed:" + scriptName); };
    document.head.appendChild(s);
  }

  // Consulta modulos ativos via RPC segura
  var rpcUrl = SUPABASE_URL + "/rest/v1/rpc/get_store_active_modules";

  fetch(rpcUrl, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_store_id: storeId })
  })
  .then(function(res) {
    if (!res.ok) throw new Error("Status " + res.status);
    return res.json();
  })
  .then(function(modules) {
    var list = Array.isArray(modules) ? modules : ["vidlytics"];
    if (list.length === 0) list = ["vidlytics"];

    list.forEach(function(mod) {
      var scriptFile = resolveScript(mod);
      if (scriptFile) {
        console.log("[SLL-Loader] Injetando modulo:", mod);
        loadedModules.push(String(mod));
        injectModule(scriptFile);
      }
    });
    ping(null);
  })
  .catch(function(err) {
    console.warn("[SLL-Loader] Fallback para Vidlytics:", err.message);
    loadedModules = ["vidlytics"];
    injectModule("vidlytics-widget.js");
    ping("modules_rpc_failed:" + err.message);
  });
})();