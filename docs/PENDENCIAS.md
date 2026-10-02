# PENDENCIAS SLL

## [2026-10-02] Aparencia ao vivo na loja do cliente (PRIORIDADE)
Objetivo: tudo configurado no Modal de Aparencia deve refletir ao vivo no site do lojista via widget.js.

Checklist:
- [ ] public\vidlytics-widget.js le o estilo salvo em vid_appearances filtrando por store_id
- [ ] Todos os tipos: Flutuante, Carrossel, Carrossel Dinamico, Grade, Player
- [ ] Todos os campos: cores, formato, margens, posicao, borda, textos, padrao da loja
- [ ] Paridade visual entre preview do modal e widget real
- [ ] Atualizacao ao salvar (cache/CDN do vidlytics-widget.js, do sll-loader.js e da config, sem precisar reinstalar)
- [ ] Teste em loja real (Shopify / Nuvemshop) com GTM ou script tag
- [ ] Consultar logica no legado: F:\RODRIGO VICENTE\DYAD\vidlytics

ATENCAO: AparenciaModal.tsx esta BLINDADO. A tarefa deve mexer no widget/servico, nao no modal. Se precisar alterar o modal, perguntar antes.

## Ideia futura
- Assistente de IA lateral (estilo Sidekick): Edge Function + cota por plano + tabela admin_ai_usage

