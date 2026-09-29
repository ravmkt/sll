(function() {
  "use strict";
  if (window.__SLL_TRACKING_INITIALIZED__) return;
  window.__SLL_TRACKING_INITIALIZED__ = true;

  var SUPABASE_URL = "https://flivmllysdhaydhogmhg.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_fYM4F5uRs_8DbYF7ozy0hA_eA_Z5XUz";

  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("sll-tracking.js") !== -1) return scripts[i];
    }
    return scripts[scripts.length - 1];
  })();

  function getParam(script, name) {
    if (!script || !script.src) return null;
    try {
      var url = new URL(script.src);
      return url.searchParams.get(name);
    } catch (e) { return null; }
  }

  var storeId = getParam(currentScript, "store");
  var token = getParam(currentScript, "token");

  if (!storeId || !token) {
    console.warn("[SLL-Tracking] store ou token ausente. Rastreamento não inicializado.");
    return;
  }

  function getOrderData() {
    if (window.SLL_ORDER && typeof window.SLL_ORDER === "object") {
      return {
        order_id: window.SLL_ORDER.order_id || window.SLL_ORDER.id || null,
        total: window.SLL_ORDER.total != null ? Number(window.SLL_ORDER.total) : null
      };
    }
    var params = new URLSearchParams(window.location.search);
    return {
      order_id: params.get("order_id") || params.get("pedido") || null,
      total: params.get("total") ? Number(params.get("total")) : null
    };
  }

  function getAttribution() {
    try {
      var raw = localStorage.getItem("sll_last_interaction");
      if (!raw) return { module: null, source_id: null };
      var data = JSON.parse(raw);
      return { module: data.module || null, source_id: data.id || data.video_id || null };
    } catch (e) {
      return { module: null, source_id: null };
    }
  }

  var order = getOrderData();
  var attribution = getAttribution();

  if (!order.order_id) {
    console.info("[SLL-Tracking] Nenhum order_id identificado. Configure window.SLL_ORDER antes de carregar o script.");
    return;
  }

  fetch(SUPABASE_URL + "/rest/v1/rpc/record_sll_conversion", {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      "Accept-Profile": "public",
      "Content-Profile": "public"
    },
    body: JSON.stringify({
      p_store_id: storeId,
      p_token: token,
      p_order_id: order.order_id,
      p_total: order.total,
      p_module: attribution.module,
      p_source_id: attribution.source_id
    })
  })
  .then(function(res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    console.log("[SLL-Tracking] Conversão registrada com sucesso.");
  })
  .catch(function(err) {
    console.error("[SLL-Tracking] Falha ao registrar conversão:", err);
  });
})();
