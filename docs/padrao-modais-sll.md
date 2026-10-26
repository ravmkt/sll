# Padrão oficial de modais do SLL Hub

Vale para TODOS os módulos (Vidlytics, Stream Sell, Admin, Billing, Produtos etc.).

## 1. Regra
- Proibido usar `confirm()`, `alert()` e `prompt()` nativos do navegador.
- Todo modal novo ou alterado usa o componente padrão `AppModal`
  (`ConfirmDangerModal` para excluir e confirmar, `PromptNameModal` para pedir nome).
- Antes de criar um modal, reaproveite o `AppModal`. Não crie variações próprias.

## 2. Visual (baseado no ConfirmDeleteModal do Vidlytics)
- Fundo: `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm` (escurecido e desfocado)
- Cartão: `bg-white rounded-3xl max-w-md shadow-2xl border border-slate-100`
- Animação de entrada: `animate-in fade-in zoom-in-95 duration-150`
- Cabeçalho: título em caixa alta (`font-extrabold text-sm tracking-wider uppercase`) e botão X redondo à direita
- Corpo: círculo central de ícone (`w-20 h-20 rounded-full`) e caixa de aviso (`rounded-2xl p-4 text-xs`)
- Rodapé: dois botões em pílula (`flex-1 py-2.5 rounded-2xl text-xs font-bold`)
  - Esquerda: Cancelar (borda `slate-200`)
  - Direita: ação principal (`#0088ff` no padrão atual)
- Estado de carregamento: botão desabilitado com texto "Excluindo...", "Salvando..."

## 3. Comportamento
- Modal sobre modal: usar Radix, para não perder foco nem clique.
- Pedir nome: campo com foco e texto selecionado; Enter confirma; erro dentro do modal.
- Cancelar e X nunca executam a ação.
- Ações irreversíveis sempre mostram o nome do item.

## 4. Pendências conhecidas
- `src/components/ui/dialog.tsx` e `alert-dialog.tsx` ainda usam `bg-black/80` sem desfoque.
- Migrar os `confirm()`, `alert()` e `prompt()` restantes (lista em `diag-padrao-modais.txt`).