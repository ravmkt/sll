/**
 * ================================================================
 *  SLL — Script Universal de Rastreamento de Conversões e Vendas
 *  Compatível com: Yampi, Shopify, Nuvemshop, WBuy, Bagy, Tray, CartPanda
 * ================================================================
 */
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

  var storeId = getParam(currentScript, "store") || window.SLL_STORE_ID;
  var token = getParam(currentScript, "token") || window.SLL_SECURITY_TOKEN;

  if (!storeId || !token) {
    console.warn("[SLL-Tracking] store ou token ausente no script.");
    return;
  }

  var alreadySent = false;

  function getCookie(n) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }

  function getAttribution() {
    try {
      var vid = getCookie("vly_video_id");
      if (!vid) { try { vid = localStorage.getItem("vly_video_id"); } catch (e) {} }
      if (vid) return { module: "vidlytics", source_id: vid };
      var raw = localStorage.getItem("sll_last_interaction") || localStorage.getItem("vidlytics_last_interaction");
      if (!raw) return { module: "direct", source_id: null };
      var data = JSON.parse(raw);
      return {
        module: data.module || "vidlytics",
        source_id: data.id || data.video_id || null
      };
    } catch (e) {
      return { module: "direct", source_id: null };
    }
  }

  function sendConversion(order) {
    if (alreadySent) return;
    function isTagId(v) { return /^(GTM|G|UA|AW|DC|GT)-[A-Z0-9]+$/i.test(String(v).trim()); }
    if (!order || !order.order_id) return;
    if (isTagId(order.order_id)) return;

    alreadySent = true;
    var attribution = getAttribution();

    fetch(SUPABASE_URL + "/rest/v1/rpc/record_sll_conversion", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_store_id: storeId,
        p_token: token,
        p_order_id: String(order.order_id),
        p_total: order.total != null ? Number(order.total) : null,
        p_module: attribution.module,
        p_source_id: attribution.source_id
      })
    })
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      console.log("[SLL-Tracking] Venda atribuída com sucesso! Pedido:", order.order_id);
    })
    .catch(function(err) {
      console.error("[SLL-Tracking] Falha ao enviar conversão:", err);
    });
  }

  // 1. Objeto manual window.SLL_ORDER ou parâmetros na URL
  if (window.SLL_ORDER && typeof window.SLL_ORDER === "object" && (window.SLL_ORDER.order_id || window.SLL_ORDER.id)) {
    sendConversion({
      order_id: window.SLL_ORDER.order_id || window.SLL_ORDER.id,
      total: window.SLL_ORDER.total
    });
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var urlOrderId = params.get("order_id") || params.get("pedido");
  var urlTotal = params.get("total") || params.get("valor");
  if (urlOrderId) {
    sendConversion({ order_id: urlOrderId, total: urlTotal });
    return;
  }

  // 2. Yampi Checkout
  if (window.yampi && (window.yampi.order || window.yampi.checkout)) {
    var yo = window.yampi.order || window.yampi.checkout;
    sendConversion({ order_id: yo.id || yo.number, total: yo.total || yo.value });
    return;
  }
  if (window._yampi && window._yampi.order) {
    sendConversion({ order_id: window._yampi.order.id || window._yampi.order.number, total: window._yampi.order.total });
    return;
  }

  // 3. Shopify Checkout
  if (window.Shopify && window.Shopify.checkout) {
    var sc = window.Shopify.checkout;
    sendConversion({
      order_id: sc.order_id || sc.token,
      total: sc.total_price ? (Number(sc.total_price) > 1000 ? sc.total_price / 100 : sc.total_price) : null
    });
    return;
  }

  // 4. Nuvemshop
  if (window.LS && window.LS.checkout) {
    sendConversion({ order_id: window.LS.checkout.order_id, total: window.LS.checkout.total });
    return;
  }

  // 5. Escuta de dataLayer (GTM / Eventos assíncronos de compra)
  if (window.dataLayer && Array.isArray(window.dataLayer)) {
    for (var i = 0; i < window.dataLayer.length; i++) {
      var item = window.dataLayer[i];
      if (item && (item.event === "purchase" || item.event === "checkout_finished" || item.event === "yampi:order_created")) {
        var tx = item.transactionId || (item.ecommerce && item.ecommerce.transaction_id) || item.order_id;
        var val = item.value || (item.ecommerce && item.ecommerce.value);
        if (tx) {
          sendConversion({ order_id: tx, total: val });
          return;
        }
      }
    }
  }

  // 6. Fallback via DOM na página de confirmação
  setTimeout(function() {
    if (alreadySent) return;
    var idEl = document.querySelector("[data-order-id], .order-id, .numero-pedido, .order-number, [data-transaction-id]");
    var totalEl = document.querySelector("[data-order-total], .order-total, .checkout-summary__total, [class*='total-pedido']");
    if (idEl) {
      var cleanId = idEl.textContent.replace(/[^a-zA-Z0-9_-]/g, "").trim();
      var cleanTotal = totalEl ? totalEl.textContent.replace(/[^\d,\.]/g, "").replace(",", ".") : null;
      if (cleanId) {
        sendConversion({ order_id: cleanId, total: cleanTotal });
      }
    }
  }, 2500);

})();
