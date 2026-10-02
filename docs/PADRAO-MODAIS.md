# Padrao de modais de confirmacao (SLL)

- Nunca usar `window.confirm`, `confirm()` ou `alert()`.
- Confirmacoes neutras/de aviso: `src/components/common/ConfirmActionModal.tsx`.
- Exclusoes: `src/components/common/ConfirmDeleteModal.tsx`.
- Visual aprovado: circulo ambar com icone de alerta, titulo em caixa alta centralizado,
  texto com destaques em azul `#0094eb`, botoes `rounded-xl` (Cancelar + acao em azul).
- Referencia de uso: modal "Sincronizar com Mobile" em `AparenciaModal.tsx`.