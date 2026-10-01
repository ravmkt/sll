(function() {
  "use strict";
  if (window.__SLL_LOADER_INITIALIZED__) return;
  window.__SLL_LOADER_INITIALIZED__ = true;

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

  // Garante a ponte de configuração global para o Vidlytics e outros módulos
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

  function resolveScript(mod) {
    if (typeof mod !== "string" || /[^a-z0-9_-]/i.test(mod)) return null;
    return MODULE_TO_SCRIPT[mod] || (mod + "-widget.js");
  }

  function injectModule(scriptName) {
    var scriptId = "sll-script-" + scriptName.replace(/\.js$/, "");
    if (document.getElementById(scriptId)) return;
    var s = document.createElement("script");
    s.id = scriptId;
    s.src = (baseUrl ? baseUrl + "/" : "/") + scriptName;
    s.async = true;
    s.setAttribute("data-store-id", storeId);
    document.head.appendChild(s);
  }

  // Consulta módulos ativos via RPC segura
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
        console.log("[SLL-Loader] Injetando módulo:", mod);
        injectModule(scriptFile);
      }
    });
  })
  .catch(function(err) {
    console.warn("[SLL-Loader] Fallback para Vidlytics:", err.message);
    injectModule("vidlytics-widget.js");
  });
})();
