(function () {
  "use strict";
  if (window.__sllGate) return;
  window.__sllGate = true;

  var API = "https://flivmllysdhaydhogmhg.supabase.co/functions/v1";
  var host = location.hostname.toLowerCase().replace(/^www\./, "");
  var qs = new URLSearchParams(location.search);
  var BOT = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegram|lighthouse|headless|preview/i;
  var CACHE_KEY = "sll_gate_cfg_" + host;
  var TTL_ACTIVE = 5 * 60 * 1000;
  var TTL_INACTIVE = 60 * 1000;

  if (!document.getElementById("sll-gate-hide")) {
    var style = document.createElement("style");
    style.id = "sll-gate-hide";
    style.textContent = "html{background:#141414!important}body{opacity:0!important}";
    (document.head || document.documentElement).appendChild(style);
  }
  function show() { var s = document.getElementById("sll-gate-hide"); if (s) s.remove(); }
  var safety = setTimeout(show, 4000);
  function done() { clearTimeout(safety); show(); }

  window.addEventListener("pageshow", function (e) { if (e.persisted) location.reload(); });

  function pickUtm() {
    var o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(function (k) {
      if (qs.has(k)) o[k] = qs.get(k);
    });
    return o;
  }
  function track(id, type) {
    try {
      var body = JSON.stringify({
        gate_id: id, event_type: type, host: host,
        path: location.pathname, referrer: document.referrer, utm: pickUtm()
      });
      navigator.sendBeacon(API + "/gate-event", new Blob([body], { type: "text/plain" }));
    } catch (e) {}
  }

  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!c || !c.t || !c.g) return null;
      var g = c.g;
      var ttl = g.state === "active" ? TTL_ACTIVE : TTL_INACTIVE;
      if (Date.now() - c.t >= ttl) return null;
      if (g.state === "active" && g.ends_at && Date.now() >= new Date(g.ends_at).getTime()) return null;
      return g;
    } catch (e) {}
    return null;
  }
  function writeCache(g) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), g: g })); } catch (e) {}
  }
  function fetchStatus() {
    return fetch(API + "/gate-status?host=" + encodeURIComponent(host))
      .then(function (r) { return r.json(); })
      .then(function (g) { g = g || { state: "inactive" }; writeCache(g); return g; });
  }

  function decide(g) {
    if (!g || g.state !== "active") return done();
    if (g.starts_at && Date.now() < new Date(g.starts_at).getTime()) return done();
    if (g.ends_at && Date.now() >= new Date(g.ends_at).getTime()) return done();
    if (g.exclude_bots && BOT.test(navigator.userAgent)) return done();

    var bp = g.bypass_param || "sll_bypass";
    if (qs.has(bp)) {
      document.cookie = "sll_gate_bypass=1; path=/; max-age=86400; SameSite=Lax";
      track(g.gate_id, "bypass");
      return done();
    }
    if (/(^|; )sll_gate_bypass=1/.test(document.cookie)) return done();

    var target;
    try { target = new URL(g.gate_url, location.href); } catch (e) { return done(); }
    var sameHost = target.hostname.replace(/^www\./, "") === host;
    if (sameHost && location.pathname.indexOf(target.pathname) === 0) return done();

    if (g.preserve_params) {
      qs.forEach(function (v, k) { if (!target.searchParams.has(k)) target.searchParams.set(k, v); });
    }
    track(g.gate_id, "redirect");
    location.replace(target.toString());
  }

  var cached = readCache() || window.__sllGateCfg || null;
  if (cached) {
    decide(cached);
    fetchStatus().catch(function () {});
  } else {
    fetchStatus().then(decide).catch(done);
  }
})();
