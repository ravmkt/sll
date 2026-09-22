(function() {
  'use strict';

  // Evita execução duplicada em caso de múltiplos disparos de GTM/SPA
  if (window.__SLL_LOADER_INITIALIZED__) {
    return;
  }
  window.__SLL_LOADER_INITIALIZED__ = true;

  var SUPABASE_URL = 'https://flivmllysdhaydhogmhg.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaXZtbGx5c2RoYXlkaG9nbWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODY1MTYsImV4cCI6MjA5ODY2MjUxNn0.ye92mnf-5ws78H8A9fSGkf2xGo5q0FoB2oq91v7HFG0';

  // 1. Identificação do Script Atual e Store ID
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('sll-loader.js') !== -1) {
        return scripts[i];
      }
    }
    return scripts[scripts.length - 1];
  })();

  var storeId = currentScript ? (currentScript.getAttribute('data-store-id') || currentScript.getAttribute('data-store')) : null;
  if (!storeId && window.SLL_STORE_ID) {
    storeId = window.SLL_STORE_ID;
  }
  if (!storeId) {
    var urlParams = new URLSearchParams(window.location.search);
    storeId = urlParams.get('sll_store_id') || urlParams.get('store_id');
  }

  if (!storeId) {
    console.warn('[SLL-Loader] Nenhum store_id identificado. O loader do Sistema Loja Lucrativa não será inicializado.');
    return;
  }

  // Torna global para widgets e integrações filhas
  window.SLL_STORE_ID = storeId;

  // 2. Resolução da URL Base dos Scripts
  var baseUrl = '';
  if (currentScript && currentScript.src) {
    var lastSlash = currentScript.src.lastIndexOf('/');
    if (lastSlash !== -1) {
      baseUrl = currentScript.src.substring(0, lastSlash);
    }
  }

  function injectModule(scriptName) {
    var scriptId = 'sll-script-' + scriptName.replace(/\.js$/, '');
    if (document.getElementById(scriptId)) {
      return; // Já injetado
    }

    var s = document.createElement('script');
    s.id = scriptId;
    s.src = (baseUrl ? baseUrl + '/' : '/') + scriptName;
    s.async = true;
    s.setAttribute('data-store-id', storeId);
    document.head.appendChild(s);
  }

  // 3. Consulta de Assinaturas e Módulos Ativos no Schema public
  var apiUrl = SUPABASE_URL + '/rest/v1/subscriptions?store_id=eq.' + encodeURIComponent(storeId) + '&status=in.(active,trialing)&select=*,plans(*)';

  fetch(apiUrl, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Accept': 'application/json',
      'Accept-Profile': 'public',
      'Content-Profile': 'public'
    }
  })
  .then(function(res) {
    if (!res.ok) {
      throw new Error('Status HTTP ' + res.status + ' ao consultar assinaturas.');
    }
    return res.json();
  })
  .then(function(subscriptions) {
    // Se não houver assinaturas cadastradas ainda ou erro de retorno vazio
    if (!subscriptions || subscriptions.length === 0) {
      console.info('[SLL-Loader] Nenhuma assinatura ativa encontrada para a loja:', storeId);
      return;
    }

    var modulesToLoad = {
      vidlytics: false,
      live_commerce: false
    };

    subscriptions.forEach(function(sub) {
      var plan = sub.plans;
      var moduleSlug = ((plan && plan.module_slug) || sub.module_slug || '').toLowerCase();

      if (['vidlytics', 'videos', 'reels', 'all'].indexOf(moduleSlug) !== -1) {
        modulesToLoad.vidlytics = true;
      }
      if (['live_commerce', 'livecommerce', 'lives', 'all'].indexOf(moduleSlug) !== -1) {
        modulesToLoad.live_commerce = true;
      }
    });

    if (modulesToLoad.vidlytics) {
      console.log('[SLL-Loader] Injetando módulo Vidlytics...');
      injectModule('vidlytics-widget.js');
    }

    if (modulesToLoad.live_commerce) {
      console.log('[SLL-Loader] Injetando módulo Live Commerce...');
      injectModule('livecommerce-widget.js');
    }
  })
  .catch(function(err) {
    console.error('[SLL-Loader] Falha ao verificar subscrições:', err);
  });
})();