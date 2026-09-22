(function() {
  'use strict';

  var SUPABASE_URL = 'https://flivmllysdhaydhogmhg.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaXZtbGx5c2RoYXlkaG9nbWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwMDAwMDAsImV4cCI6MjA1NTU1NTU1NX0.placeholder'; // Substituído em runtime se injetado

  // Localiza a tag atual do script para extrair configurações
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
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
    console.warn('[SLL-Loader] Nenhum store_id fornecido. O loader não será inicializado.');
    return;
  }

  // Descobre a URL base do script para carregar os módulos da mesma origem
  var baseUrl = '';
  if (currentScript && currentScript.src) {
    baseUrl = currentScript.src.substring(0, currentScript.src.lastIndexOf('/'));
  }

  function injectModule(scriptName) {
    var s = document.createElement('script');
    s.src = (baseUrl ? baseUrl + '/' : '/') + scriptName;
    s.async = true;
    s.setAttribute('data-store-id', storeId);
    document.head.appendChild(s);
  }

  // Consulta assinaturas ativas na tabela public.subscriptions
  var apiUrl = SUPABASE_URL + '/rest/v1/subscriptions?store_id=eq.' + encodeURIComponent(storeId) + '&status=eq.active&select=*,plans(*)';

  fetch(apiUrl, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Accept': 'application/json'
    }
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Erro ao consultar assinaturas');
    return res.json();
  })
  .then(function(subscriptions) {
    if (!subscriptions || subscriptions.length === 0) {
      // Fallback permissivo: tenta carregar módulos padrão caso configurado
      injectModule('vidlytics-widget.js');
      return;
    }

    var modulesToLoad = {};
    subscriptions.forEach(function(sub) {
      var plan = sub.plans;
      var moduleSlug = (plan && plan.module_slug) || sub.module_slug || '';
      
      if (moduleSlug === 'vidlytics' || moduleSlug === 'all') {
        modulesToLoad['vidlytics'] = true;
      }
      if (moduleSlug === 'live_commerce' || moduleSlug === 'all') {
        modulesToLoad['live_commerce'] = true;
      }
    });

    if (modulesToLoad['vidlytics']) {
      injectModule('vidlytics-widget.js');
    }
    if (modulesToLoad['live_commerce']) {
      injectModule('livecommerce-widget.js');
    }
  })
  .catch(function(err) {
    console.error('[SLL-Loader] Falha ao verificar subscrições:', err);
    // Em caso de falha de conexão, carrega vidlytics preventivamente se loja ativa
    injectModule('vidlytics-widget.js');
  });
})();