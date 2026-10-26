# Regra: menus e acordeões sempre fechados

- Toda aba, modal ou painel com acordeão/menu expansível abre com TODOS os itens fechados.
- Ao trocar de aba, de template ou de dispositivo, os itens voltam a ficar fechados.
- Estado inicial de acordeão: `""`, `false` ou `[]`. Nunca `true` nem um id pré-selecionado.
- Em Radix/shadcn Accordion: não usar `defaultValue` com itens abertos.
- O usuário só abre um item por clique (ou ao ativar um subitem com configurações).